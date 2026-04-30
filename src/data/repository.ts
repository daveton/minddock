import { dbPromise } from './db'
import { noteCache, noteSession, type Note } from './memory'

const DEFAULT_NOTE_ID = 'note-1'

export async function saveCurrentNote(content: Record<string, unknown>) {
  const noteId = ensureCurrentNoteId()
  const note: Note = {
    id: noteId,
    content,
    updatedAt: Date.now(),
  }

  noteCache.set(noteId, note)

  const db = await dbPromise
  await db.put('notes', note, noteId)
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
  setCurrentNote(DEFAULT_NOTE_ID)

  const existing = await loadNote(DEFAULT_NOTE_ID)
  if (existing) {
    return existing
  }

  const emptyNote: Note = {
    id: DEFAULT_NOTE_ID,
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

  noteCache.set(DEFAULT_NOTE_ID, emptyNote)
  const db = await dbPromise
  await db.put('notes', emptyNote, DEFAULT_NOTE_ID)

  return emptyNote
}

export function setCurrentNote(id: string) {
  noteSession.currentNoteId = id
}

function ensureCurrentNoteId() {
  if (!noteSession.currentNoteId) {
    noteSession.currentNoteId = DEFAULT_NOTE_ID
  }

  return noteSession.currentNoteId
}
