import { openDB } from 'idb'
import type { DBSchema } from 'idb'
import type { Note } from './memory'

interface MindDockDB extends DBSchema {
  notes: {
    key: string
    value: Note
  }
}

export const dbPromise = openDB<MindDockDB>('minddock', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('notes')) {
      db.createObjectStore('notes')
    }
  },
})
