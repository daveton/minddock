import { noteCache } from './memory'
import { dbPromise } from './db'
import type { Note, NoteSummary } from './memory'
import { handleStorageError, StorageError } from './errorHandler'
import { noteSession } from './memory'

const DEFAULT_NOTE_ID = 'note-1'
const LAST_ACTIVE_NOTE_KEY = 'minddock:last-active-note-id'

export async function saveCurrentNote(content: Record<string, unknown>) {
  const noteId = ensureCurrentNoteId()
  return saveNoteById(noteId, content)
}

export async function saveNoteById(
  noteId: string,
  content: Record<string, unknown>,
): Promise<{ success: boolean; error?: StorageError }> {
  try {
    const note: Note = {
      id: noteId,
      content,
      updatedAt: Date.now(),
    }

    noteCache.set(noteId, note)

    const db = await dbPromise
    await db.put('notes', note, noteId)

    return { success: true }
  } catch (error) {
    const storageError = handleStorageError(error as Error)
    console.error('Save failed:', storageError)
    return { success: false, error: storageError }
  }
}

export async function loadNote(id: string) {
  const cached = noteCache.get(id)
  if (cached) {
    return cached
  }

  const db = await dbPromise
  const note = await db.get('notes', id)

  if (note) {
    noteCache.set(id, note)
  }

  return note ?? null
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
    content: {
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
    },
    updatedAt: Date.now(),
  }

  noteCache.set(startupNoteId, emptyNote)
  const db = await dbPromise
  await db.put('notes', emptyNote, startupNoteId)

  const recoveryTime = performance.now() - recoveryStart
  console.log(`[CRASH_RECOVERY] Created new note in ${recoveryTime.toFixed(2)}ms`)
  
  return emptyNote
}

export async function listNotes(): Promise<NoteSummary[]> {
  const db = await dbPromise
  return db.getAll('notes')
}

export function sortNotes(notes: NoteSummary[]): NoteSummary[] {
  return notes.sort((a: NoteSummary, b: NoteSummary) => b.updatedAt - a.updatedAt)
}

export async function createNote() {
  const noteId = `note-${crypto.randomUUID().slice(0, 8)}`
  const note: Note = {
    id: noteId,
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
        },
      ],
    },
    updatedAt: Date.now(),
  }

  noteCache.set(noteId, note)
  const db = await dbPromise
  await db.put('notes', note, noteId)

  return note
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
