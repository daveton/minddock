import { noteCache } from './memory'
import { IndexedDBProvider } from './indexedDBProvider'
import type {
  EditorStateRecord,
  Note,
  NoteSnapshot,
  NoteSummary,
  OperationEntry,
  WorkspaceStateRecord,
} from './memory'
import type { AtomicSnapshotStorageProvider } from './storageProvider'
import { handleStorageError, StorageError } from './errorHandler'
import { noteSession } from './memory'
import { extractDocumentMetadata, normalizeDocument } from './documentModel'
import { serializeMarkdown } from '../import-export/markdown'
import { buildBlockIndex } from './blockIndex'

const DEFAULT_NOTE_ID = 'note-1'
const LAST_ACTIVE_NOTE_KEY = 'minddock:last-active-note-id'
const UNSAVED_DRAFTS_KEY = 'minddock:unsaved-note-drafts:v1'
const MAX_SNAPSHOTS_PER_NOTE = 20
const storageProvider: AtomicSnapshotStorageProvider = new IndexedDBProvider()
const pendingSaves = new Map<
  string,
  {
    content: Record<string, unknown>
    resolvers: Array<(result: SaveResult) => void>
  }
>()
const idleFlushTimers = new Map<string, number>()

type UnsavedDraft = {
  id: string
  content: Record<string, unknown>
  updatedAt: number
}

type SaveResult = { success: boolean; error?: StorageError }

export async function saveCurrentNote(content: Record<string, unknown>) {
  const noteId = ensureCurrentNoteId()
  return queueNoteSave(noteId, content)
}

export async function saveNoteById(
  noteId: string,
  content: Record<string, unknown>,
): Promise<SaveResult> {
  return persistNote(noteId, content)
}

export function queueNoteSave(noteId: string, content: Record<string, unknown>): Promise<SaveResult> {
  const normalized = normalizeDocument(content)
  const existingNote = noteCache.get(noteId)
  const note = buildNoteRecord(noteId, normalized.document, existingNote)

  noteCache.set(noteId, note)
  cacheUnsavedDraft(noteId, normalized.document)

  const pending = pendingSaves.get(noteId)
  if (pending) {
    pending.content = normalized.document
    return new Promise<SaveResult>((resolve) => {
      pending.resolvers.push(resolve)
      scheduleIdleFlush(noteId)
    })
  }

  const nextPending = {
    content: normalized.document,
    resolvers: [] as Array<(result: SaveResult) => void>,
  }
  const promise = new Promise<SaveResult>((resolve) => {
    nextPending.resolvers.push(resolve)
    pendingSaves.set(noteId, nextPending)
    scheduleIdleFlush(noteId, async () => {
      const latestPending = pendingSaves.get(noteId)
      if (!latestPending) {
        return
      }

      pendingSaves.delete(noteId)
      const result = await persistNote(noteId, latestPending.content)
      latestPending.resolvers.forEach((resolver) => resolver(result))
    })
  })

  return promise
}

export async function flushPendingNoteSave(noteId: string): Promise<SaveResult> {
  const pending = pendingSaves.get(noteId)
  if (!pending) {
    return { success: true }
  }

  if (typeof window !== 'undefined') {
    window.clearTimeout(idleFlushTimers.get(noteId))
  }
  idleFlushTimers.delete(noteId)
  pendingSaves.delete(noteId)
  const result = await persistNote(noteId, pending.content)
  pending.resolvers.forEach((resolver) => resolver(result))
  return result
}

async function persistNote(noteId: string, content: Record<string, unknown>): Promise<SaveResult> {
  try {
    const normalized = normalizeDocument(content)
    const existingNote = noteCache.get(noteId) ?? (await storageProvider.load(noteId))
    const note = buildNoteRecord(noteId, normalized.document, existingNote)
    const operation = createOperation(note)
    const blocks = buildBlockIndex(note.id, note.content, note.markdown)

    noteCache.set(noteId, note)

    await storageProvider.saveWithSnapshot(
      note,
      createSnapshot(note, normalized.repaired ? 'repair' : 'save'),
      blocks,
      operation,
    )
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
    const draftFields = buildDocumentFields(draft.id, draft.content, null)
    const repairedDraft = await repairLoadedNote({
      id: draft.id,
      ...draftFields,
      createdAt: draft.updatedAt,
      updatedAt: draft.updatedAt,
      version: 1,
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
    ...buildDocumentFields(startupNoteId, normalizeDocument({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [
            {
              type: 'text',
              text: 'Start typing',
            },
          ],
        },
      ],
    }).document, null),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
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
  const byId = new Map<string, NoteSummary>(notes.map((note) => [note.id, toNoteSummary(note)]))

  for (const draft of drafts) {
    const draftFields = buildDocumentFields(draft.id, draft.content, null)
    byId.set(draft.id, {
      id: draft.id,
      title: draftFields.title,
      markdown: draftFields.markdown,
      tags: draftFields.tags,
      metadata: draftFields.metadata,
      content: draft.content,
      updatedAt: draft.updatedAt,
      localStatus: 'unsaved',
    })
  }

  return Array.from(byId.values())
}

export function sortNotes(notes: NoteSummary[]): NoteSummary[] {
  return notes.sort((a: NoteSummary, b: NoteSummary) => b.updatedAt - a.updatedAt)
}

export async function createNote(tagPath?: string | null) {
  const noteId = `note-${crypto.randomUUID().slice(0, 8)}`
  const normalizedTagPath = normalizeTagPath(tagPath)
  const note: Note = {
    id: noteId,
    ...buildDocumentFields(noteId, normalizeDocument({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
        },
        ...(normalizedTagPath
          ? [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: `#${normalizedTagPath}`,
                    marks: [{ type: 'tag', attrs: { path: normalizedTagPath } }],
                  },
                ],
              },
            ]
          : []),
      ],
    }).document, null),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
  }

  noteCache.set(noteId, note)
  await storageProvider.saveWithSnapshot(note, createSnapshot(note, 'recovery'))

  return note
}

function normalizeTagPath(value: string | null | undefined) {
  return (value ?? '')
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join('/')
}

async function repairLoadedNote(note: Note) {
  const normalized = normalizeDocument(note.content)
  const needsDocumentFields =
    !note.markdown || !note.title || !Array.isArray(note.tags) || typeof note.version !== 'number'

  if (!normalized.repaired && !needsDocumentFields) {
    return note
  }

  const repairedNote: Note = {
    ...note,
    ...buildDocumentFields(note.id, normalized.document, note),
    createdAt: note.createdAt ?? note.updatedAt,
    updatedAt: Date.now(),
    version: (note.version ?? 0) + 1,
  }

  noteCache.set(repairedNote.id, repairedNote)

  await storageProvider.saveWithSnapshot(repairedNote, createSnapshot(repairedNote, 'repair'))
  await pruneSnapshots(repairedNote.id)

  console.info('[DOCUMENT_REPAIR]', normalized.issues)
  return repairedNote
}

async function recoverNoteFromSnapshot(noteId: string) {
  const snapshot = await loadLatestSnapshot(noteId)
  const operations = await storageProvider.loadOperations(noteId)
  const replayed = replayOperationsFromSnapshot(noteId, snapshot, operations)

  if (!replayed) {
    return null
  }

  noteCache.set(noteId, replayed)
  await storageProvider.saveWithSnapshot(
    replayed,
    createSnapshot(replayed, 'recovery'),
    buildBlockIndex(replayed.id, replayed.content, replayed.markdown),
  )
  console.info(`[CRASH_RECOVERY] Restored ${noteId} from local snapshot and operations`)

  return replayed
}

function replayOperationsFromSnapshot(
  noteId: string,
  snapshot: NoteSnapshot | null,
  operations: OperationEntry[],
): Note | null {
  const orderedOperations = operations.sort((a, b) => a.createdAt - b.createdAt)
  const baseContent = snapshot?.content ? normalizeDocument(snapshot.content).document : null
  const baseMarkdown = snapshot?.markdown
  const baseCreatedAt = snapshot?.createdAt ?? orderedOperations[0]?.createdAt

  let replayedContent = baseContent
  let replayedMarkdown = baseMarkdown
  let replayedVersion = snapshot?.version ?? 0
  let updatedAt = snapshot?.createdAt ?? Date.now()

  for (const operation of orderedOperations) {
    if (snapshot && operation.createdAt < snapshot.createdAt) {
      continue
    }

    if (operation.type !== 'document.upsert') {
      continue
    }

    replayedContent = normalizeDocument(operation.payload.content).document
    replayedMarkdown = operation.payload.markdown
    replayedVersion = Math.max(replayedVersion, operation.payload.version)
    updatedAt = operation.createdAt
  }

  if (!replayedContent) {
    return null
  }

  return {
    id: noteId,
    ...buildDocumentFields(noteId, replayedContent, null, replayedMarkdown, replayedVersion || 1),
    createdAt: baseCreatedAt ?? Date.now(),
    updatedAt,
    version: replayedVersion || 1,
    snapshotVersion: replayedVersion || 1,
  }
}

function buildNoteRecord(noteId: string, content: Record<string, unknown>, existingNote: Note | null | undefined): Note {
  const version = (existingNote?.version ?? 0) + 1

  return {
    id: noteId,
    ...buildDocumentFields(noteId, content, existingNote, undefined, version),
    createdAt: existingNote?.createdAt ?? existingNote?.updatedAt ?? Date.now(),
    updatedAt: Date.now(),
    version,
    snapshotVersion: version,
  }
}

function buildDocumentFields(
  _noteId: string,
  content: Record<string, unknown>,
  existingNote: Note | null | undefined,
  recoveredMarkdown?: string,
  version = existingNote?.version ?? 1,
) {
  const metadata = extractDocumentMetadata(content)
  const pinned = existingNote?.metadata?.pinned ?? existingNote?.pinned ?? false
  const archived = existingNote?.metadata?.archived ?? existingNote?.archived ?? false

  return {
    title: metadata.title,
    markdown: recoveredMarkdown ?? serializeMarkdown(content),
    content,
    metadata: {
      tags: metadata.tags,
      pinned,
      archived,
    },
    tags: metadata.tags,
    pinned,
    archived,
    deleted: existingNote?.deleted,
    snapshotVersion: existingNote?.snapshotVersion ?? version,
  }
}

function toNoteSummary(note: Note): NoteSummary {
  return {
    id: note.id,
    title: note.title,
    markdown: note.markdown,
    tags: note.tags,
    metadata: note.metadata,
    content: note.content,
    updatedAt: note.updatedAt,
    localStatus: note.localStatus,
  }
}

function createOperation(note: Note): OperationEntry {
  return {
    id: `op-${note.id}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    docId: note.id,
    type: 'document.upsert',
    payload: {
      markdown: note.markdown,
      content: note.content,
      version: note.version,
    },
    createdAt: Date.now(),
  }
}

export async function saveEditorState(
  docId: string,
  state: Pick<EditorStateRecord, 'selection' | 'scrollTop'>,
) {
  const now = Date.now()
  await storageProvider.saveEditorState({
    docId,
    selection: state.selection,
    scrollTop: state.scrollTop,
    lastOpenedAt: now,
    updatedAt: now,
  })
}

export function loadEditorState(docId: string) {
  return storageProvider.loadEditorState(docId)
}

export async function saveWorkspaceState(state: Omit<WorkspaceStateRecord, 'updatedAt'>) {
  await storageProvider.saveWorkspaceState({
    ...state,
    updatedAt: Date.now(),
  })
}

export function loadWorkspaceState(id: string) {
  return storageProvider.loadWorkspaceState(id)
}

function scheduleIdleFlush(noteId: string, flush?: () => Promise<void>) {
  if (typeof window === 'undefined') {
    if (flush) {
      void flush()
    }
    return
  }

  window.clearTimeout(idleFlushTimers.get(noteId))

  const run = () => {
    idleFlushTimers.delete(noteId)
    const pending = pendingSaves.get(noteId)
    if (!pending) {
      return
    }

    if (flush) {
      void flush()
      return
    }

    pendingSaves.delete(noteId)
    void persistNote(noteId, pending.content).then((result) => {
      pending.resolvers.forEach((resolver) => resolver(result))
    })
  }

  const idleCallback = window.requestIdleCallback
  if (idleCallback) {
    const timeout = window.setTimeout(run, 600)
    idleFlushTimers.set(noteId, timeout)
    idleCallback(run, { timeout: 800 })
    return
  }

  idleFlushTimers.set(noteId, window.setTimeout(run, 300))
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
    docId: note.id,
    markdown: note.markdown,
    content: note.content,
    version: note.version,
    selection: null,
    scrollPosition: 0,
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
