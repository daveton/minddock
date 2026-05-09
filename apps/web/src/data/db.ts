import { openDB } from 'idb'
import type { DBSchema } from 'idb'
import type {
  BlockIndexEntry,
  EditorStateRecord,
  Note,
  NoteSnapshot,
  OperationEntry,
  WorkspaceStateRecord,
} from './memory'

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
  blocks: {
    key: string
    value: BlockIndexEntry
    indexes: {
      'by-doc': string
      'by-doc-type': [string, string]
    }
  }
  operations: {
    key: string
    value: OperationEntry
    indexes: {
      'by-doc': string
      'by-created': number
    }
  }
  editor_state: {
    key: string
    value: EditorStateRecord
    indexes: {
      'by-last-opened': number
    }
  }
  workspace_state: {
    key: string
    value: WorkspaceStateRecord
  }
}

export const dbPromise = openDB<MindDockDB>('minddock', 5, {
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

    if (!db.objectStoreNames.contains('blocks')) {
      const blocks = db.createObjectStore('blocks', { keyPath: 'id' })
      blocks.createIndex('by-doc', 'docId')
      blocks.createIndex('by-doc-type', ['docId', 'type'])
    }

    if (!db.objectStoreNames.contains('operations')) {
      const operations = db.createObjectStore('operations', { keyPath: 'id' })
      operations.createIndex('by-doc', 'docId')
      operations.createIndex('by-created', 'createdAt')
    }

    if (!db.objectStoreNames.contains('editor_state')) {
      const editorState = db.createObjectStore('editor_state', { keyPath: 'docId' })
      editorState.createIndex('by-last-opened', 'lastOpenedAt')
    }

    if (!db.objectStoreNames.contains('workspace_state')) {
      db.createObjectStore('workspace_state', { keyPath: 'id' })
    }

    const notes = transaction.objectStore('notes')
    if (!notes.indexNames.contains('by-updated')) {
      notes.createIndex('by-updated', 'updatedAt')
    }

    const snapshots = transaction.objectStore('noteSnapshots')
    if (!snapshots.indexNames.contains('by-note')) {
      snapshots.createIndex('by-note', 'noteId')
    }

    const blocks = transaction.objectStore('blocks')
    if (!blocks.indexNames.contains('by-doc')) {
      blocks.createIndex('by-doc', 'docId')
    }
    if (!blocks.indexNames.contains('by-doc-type')) {
      blocks.createIndex('by-doc-type', ['docId', 'type'])
    }

    const operations = transaction.objectStore('operations')
    if (!operations.indexNames.contains('by-doc')) {
      operations.createIndex('by-doc', 'docId')
    }
    if (!operations.indexNames.contains('by-created')) {
      operations.createIndex('by-created', 'createdAt')
    }

    const editorState = transaction.objectStore('editor_state')
    if (!editorState.indexNames.contains('by-last-opened')) {
      editorState.createIndex('by-last-opened', 'lastOpenedAt')
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
