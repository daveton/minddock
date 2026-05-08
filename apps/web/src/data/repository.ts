import { noteCache } from './memory'
import { IndexedDBProvider } from './indexedDBProvider'
import type { Note, NoteSnapshot, NoteSummary } from './memory'
import type { AtomicSnapshotStorageProvider } from './storageProvider'
import { handleStorageError, StorageError } from './errorHandler'
import { noteSession } from './memory'
import { normalizeDocument } from './documentModel'

const DEFAULT_NOTE_ID = 'note-1'
const LAST_ACTIVE_NOTE_KEY = 'minddock:last-active-note-id'
const UNSAVED_DRAFTS_KEY = 'minddock:unsaved-note-drafts:v1'
const MAX_SNAPSHOTS_PER_NOTE = 20
const storageProvider: AtomicSnapshotStorageProvider = new IndexedDBProvider()

type UnsavedDraft = {
  id: string
  content: Record<string, unknown>
  updatedAt: number
}

export async function saveCurrentNote(content: Record<string, unknown>) {
  const noteId = ensureCurrentNoteId()
  return saveNoteById(noteId, content)
}

export async function saveNoteById(
  noteId: string,
  content: Record<string, unknown>,
): Promise<{ success: boolean; error?: StorageError }> {
  try {
    const normalized = normalizeDocument(content)
    const existingNote = noteCache.get(noteId) ?? (await storageProvider.load(noteId))
    const note: Note = {
      id: noteId,
      content: normalized.document,
      createdAt: existingNote?.createdAt ?? existingNote?.updatedAt ?? Date.now(),
      updatedAt: Date.now(),
    }

    noteCache.set(noteId, note)

    await storageProvider.saveWithSnapshot(note, createSnapshot(note, normalized.repaired ? 'repair' : 'save'))
    await pruneSnapshots(noteId)
    clearUnsavedDraft(noteId)

    if (normalized.issues.length > 0) {
      console.info('[DOCUMENT_REPAIR]', normalized.issues)
    }

    return { success: true }
  } catch (error) {
    const storageError = handleStorageError(error as Error)
    cacheUnsavedDraft(noteId, content)
    console.error('Save failed:', storageError)
    return { success: false, error: storageError }
  }
}

export async function loadNote(id: string) {
  const draft = getUnsavedDraft(id)
  if (draft) {
    const repairedDraft = await repairLoadedNote({
      id: draft.id,
      content: draft.content,
      updatedAt: draft.updatedAt,
      localStatus: 'unsaved',
    })
    return { ...repairedDraft, localStatus: 'unsaved' as const }
  }

  const cached = noteCache.get(id)
  if (cached) {
    return repairLoadedNote(cached)
  }

  const note = await storageProvider.load(id)

  if (note) {
    const repaired = await repairLoadedNote(note)
    noteCache.set(id, repaired)
    return repaired
  }

  return recoverNoteFromSnapshot(id)
}

export async function ensureDefaultNote() {
  const recoveryStart = performance.now()
  
  const startupNoteId = getStartupNoteId()
  setCurrentNote(startupNoteId)

  const existing = await loadNote(startupNoteId)
  if (existing) {
    const recoveryTime = performance.now() - recoveryStart
    console.log(`[CRASH_RECOVERY] Recovered existing note in ${recoveryTime.toFixed(2)}ms`)
    return existing
  }

  const emptyNote: Note = {
    id: startupNoteId,
    content: normalizeDocument({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Start typing. The editor saves to IndexedDB after 300ms.',
            },
          ],
        },
      ],
    }).document,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  noteCache.set(startupNoteId, emptyNote)
  await storageProvider.saveWithSnapshot(emptyNote, createSnapshot(emptyNote, 'recovery'))

  const recoveryTime = performance.now() - recoveryStart
  console.log(`[CRASH_RECOVERY] Created new note in ${recoveryTime.toFixed(2)}ms`)
  
  return emptyNote
}

export async function listNotes(): Promise<NoteSummary[]> {
  const notes = await storageProvider.list()
  const drafts = getUnsavedDrafts()
  const byId = new Map<string, NoteSummary>(notes.map((note) => [note.id, note]))

  for (const draft of drafts) {
    byId.set(draft.id, {
      id: draft.id,
      updatedAt: draft.updatedAt,
      localStatus: 'unsaved',
    })
  }

  return Array.from(byId.values())
}

export function sortNotes(notes: NoteSummary[]): NoteSummary[] {
  return notes.sort((a: NoteSummary, b: NoteSummary) => b.updatedAt - a.updatedAt)
}

export async function createNote() {
  const noteId = `note-${crypto.randomUUID().slice(0, 8)}`
  const note: Note = {
    id: noteId,
    content: normalizeDocument({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
        },
      ],
    }).document,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  noteCache.set(noteId, note)
  await storageProvider.saveWithSnapshot(note, createSnapshot(note, 'recovery'))

  return note
}

async function repairLoadedNote(note: Note) {
  const normalized = normalizeDocument(note.content)
  if (!normalized.repaired) {
    return note
  }

  const repairedNote: Note = {
    ...note,
    content: normalized.document,
    createdAt: note.createdAt ?? note.updatedAt,
    updatedAt: Date.now(),
  }

  noteCache.set(repairedNote.id, repairedNote)

  await storageProvider.saveWithSnapshot(repairedNote, createSnapshot(repairedNote, 'repair'))
  await pruneSnapshots(repairedNote.id)

  console.info('[DOCUMENT_REPAIR]', normalized.issues)
  return repairedNote
}

async function recoverNoteFromSnapshot(noteId: string) {
  const snapshot = await loadLatestSnapshot(noteId)
  if (!snapshot) {
    return null
  }

  const recoveredNote: Note = {
    id: noteId,
    content: normalizeDocument(snapshot.content).document,
    createdAt: snapshot.createdAt,
    updatedAt: Date.now(),
  }

  noteCache.set(noteId, recoveredNote)
  await storageProvider.save(recoveredNote)
  console.info(`[CRASH_RECOVERY] Restored ${noteId} from local snapshot`)

  return recoveredNote
}

async function loadLatestSnapshot(noteId: string) {
  const snapshots = await storageProvider.loadSnapshots(noteId)

  return snapshots.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null
}

async function pruneSnapshots(noteId: string) {
  const snapshots = await storageProvider.loadSnapshots(noteId)
  const staleSnapshots = snapshots
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(MAX_SNAPSHOTS_PER_NOTE)

  if (staleSnapshots.length === 0) {
    return
  }

  await Promise.all(staleSnapshots.map((snapshot) => storageProvider.deleteSnapshot(snapshot.id)))
}

function createSnapshot(note: Note, reason: NoteSnapshot['reason']): NoteSnapshot {
  return {
    id: `snapshot-${note.id}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    noteId: note.id,
    content: note.content,
    createdAt: Date.now(),
    reason,
  }
}

export function setCurrentNote(id: string) {
  noteSession.currentNoteId = id
  persistLastActiveNoteId(id)
}

function ensureCurrentNoteId() {
  if (!noteSession.currentNoteId) {
    noteSession.currentNoteId = getStartupNoteId()
  }

  return noteSession.currentNoteId
}

function getStartupNoteId() {
  if (typeof window === 'undefined') {
    return DEFAULT_NOTE_ID
  }

  return window.localStorage.getItem(LAST_ACTIVE_NOTE_KEY) ?? DEFAULT_NOTE_ID
}

function persistLastActiveNoteId(id: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(LAST_ACTIVE_NOTE_KEY, id)
}

function cacheUnsavedDraft(noteId: string, content: Record<string, unknown>) {
  if (typeof window === 'undefined') {
    return
  }

  const normalized = normalizeDocument(content)
  const drafts = getUnsavedDrafts().filter((draft) => draft.id !== noteId)
  drafts.push({
    id: noteId,
    content: normalized.document,
    updatedAt: Date.now(),
  })
  window.localStorage.setItem(UNSAVED_DRAFTS_KEY, JSON.stringify(drafts))
}

function clearUnsavedDraft(noteId: string) {
  if (typeof window === 'undefined') {
    return
  }

  const nextDrafts = getUnsavedDrafts().filter((draft) => draft.id !== noteId)
  if (nextDrafts.length === 0) {
    window.localStorage.removeItem(UNSAVED_DRAFTS_KEY)
    return
  }

  window.localStorage.setItem(UNSAVED_DRAFTS_KEY, JSON.stringify(nextDrafts))
}

function getUnsavedDraft(noteId: string) {
  return getUnsavedDrafts().find((draft) => draft.id === noteId) ?? null
}

function getUnsavedDrafts(): UnsavedDraft[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const saved = window.localStorage.getItem(UNSAVED_DRAFTS_KEY)
    if (!saved) return []

    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed)) return []

    return parsed.filter(isUnsavedDraft)
  } catch {
    return []
  }
}

function isUnsavedDraft(value: unknown): value is UnsavedDraft {
  if (!value || typeof value !== 'object') {
    return false
  }

  const draft = value as Partial<UnsavedDraft>
  return typeof draft.id === 'string' && typeof draft.updatedAt === 'number' && Boolean(draft.content)
}
