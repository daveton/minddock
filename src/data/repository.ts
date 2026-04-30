import { dbPromise } from './db'
import {
  noteCache,
  noteSession,
  type Note,
  type NoteSummary,
} from './memory'

const DEFAULT_NOTE_ID = 'note-1'

export async function saveCurrentNote(content: Record<string, unknown>) {
  const noteId = ensureCurrentNoteId()
  return saveNoteById(noteId, content)
}

export async function saveNoteById(
  noteId: string,
  content: Record<string, unknown>,
) {
  const note: Note = {
    id: noteId,
    content,
    updatedAt: Date.now(),
  }

  noteCache.set(noteId, note)

  const db = await dbPromise
  await db.put('notes', note, noteId)

  return note
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

export async function listNotes(): Promise<NoteSummary[]> {
  const db = await dbPromise
  const notes = await db.getAll('notes')

  for (const note of notes) {
    noteCache.set(note.id, note)
  }

  return notes
    .map((note) => ({
      id: note.id,
      updatedAt: note.updatedAt,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
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
}

function ensureCurrentNoteId() {
  if (!noteSession.currentNoteId) {
    noteSession.currentNoteId = DEFAULT_NOTE_ID
  }

  return noteSession.currentNoteId
}
