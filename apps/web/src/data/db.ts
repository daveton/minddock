import { openDB } from 'idb'
import type { DBSchema } from 'idb'
import type { Note, NoteSnapshot } from './memory'

interface MindDockDB extends DBSchema {
  notes: {
    key: string
    value: Note
  }
  noteSnapshots: {
    key: string
    value: NoteSnapshot
    indexes: {
      'by-note': string
    }
  }
}

export const dbPromise = openDB<MindDockDB>('minddock', 2, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('notes')) {
      db.createObjectStore('notes')
    }

    if (!db.objectStoreNames.contains('noteSnapshots')) {
      const snapshots = db.createObjectStore('noteSnapshots')
      snapshots.createIndex('by-note', 'noteId')
    }
  },
})
