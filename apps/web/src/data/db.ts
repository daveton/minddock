import { openDB } from 'idb'
import type { DBSchema } from 'idb'
import type { Note, NoteSnapshot } from './memory'

interface MindDockDB extends DBSchema {
  notes: {
    key: string
    value: Note
    indexes: {
      'by-updated': number
    }
  }
  noteSnapshots: {
    key: string
    value: NoteSnapshot
    indexes: {
      'by-note': string
    }
  }
}

export const dbPromise = openDB<MindDockDB>('minddock', 3, {
  async upgrade(db, oldVersion, _newVersion, transaction) {
    if (oldVersion > 0 && oldVersion < 3) {
      const migrationDb = db as unknown as MigrationDatabase
      const migrationTransaction = transaction as unknown as MigrationTransaction
      await migrateStoreToKeyPath(migrationDb, migrationTransaction, 'notes', 'id')
      await migrateStoreToKeyPath(migrationDb, migrationTransaction, 'noteSnapshots', 'id')
    }

    if (!db.objectStoreNames.contains('notes')) {
      db.createObjectStore('notes', { keyPath: 'id' })
    }

    if (!db.objectStoreNames.contains('noteSnapshots')) {
      const snapshots = db.createObjectStore('noteSnapshots', { keyPath: 'id' })
      snapshots.createIndex('by-note', 'noteId')
    }

    const notes = transaction.objectStore('notes')
    if (!notes.indexNames.contains('by-updated')) {
      notes.createIndex('by-updated', 'updatedAt')
    }

    const snapshots = transaction.objectStore('noteSnapshots')
    if (!snapshots.indexNames.contains('by-note')) {
      snapshots.createIndex('by-note', 'noteId')
    }
  },
})

type MigrationDatabase = {
  objectStoreNames: DOMStringList
  createObjectStore: (name: string, options: IDBObjectStoreParameters) => {
    createIndex: (name: string, keyPath: string | string[], options?: IDBIndexParameters) => unknown
    put: (value: unknown) => Promise<unknown>
  }
  deleteObjectStore: (name: string) => void
}

type MigrationTransaction = {
  objectStore: (name: string) => {
    keyPath: string | string[] | null
    indexNames: DOMStringList
    getAll: () => Promise<unknown[]>
    index: (name: string) => {
      keyPath: string | string[]
      multiEntry: boolean
      unique: boolean
    }
  }
}

async function migrateStoreToKeyPath(
  db: MigrationDatabase,
  transaction: MigrationTransaction,
  storeName: string,
  keyPath: string,
) {
  if (!db.objectStoreNames.contains(storeName)) {
    return
  }

  const source = transaction.objectStore(storeName)

  if (source.keyPath === keyPath) {
    return
  }

  const records = await source.getAll()
  const indexes = Array.from(source.indexNames).map((name) => {
    const index = source.index(name)
    return {
      name,
      keyPath: index.keyPath,
      options: {
        multiEntry: index.multiEntry,
        unique: index.unique,
      },
    }
  })

  db.deleteObjectStore(storeName)
  const nextStore = db.createObjectStore(storeName, { keyPath })

  for (const index of indexes) {
    nextStore.createIndex(index.name, index.keyPath, index.options)
  }

  for (const record of records) {
    await nextStore.put(record)
  }
}
