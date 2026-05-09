import { dbPromise } from './db'
import type {
  BlockIndexEntry,
  EditorStateRecord,
  Note,
  NoteSnapshot,
  OperationEntry,
  WorkspaceStateRecord,
} from './memory'
import type { AtomicSnapshotStorageProvider } from './storageProvider'

export class IndexedDBProvider implements AtomicSnapshotStorageProvider {
  async save(note: Note) {
    const db = await dbPromise
    await db.put('notes', note)
  }

  async load(id: string) {
    const db = await dbPromise
    return (await db.get('notes', id)) ?? null
  }

  async delete(id: string) {
    const db = await dbPromise
    await db.delete('notes', id)
  }

  async list() {
    const db = await dbPromise
    return db.getAll('notes')
  }

  async saveSnapshot(snapshot: NoteSnapshot) {
    const db = await dbPromise
    await db.put('noteSnapshots', snapshot)
  }

  async loadSnapshots(noteId: string) {
    const db = await dbPromise
    return db.getAllFromIndex('noteSnapshots', 'by-note', noteId)
  }

  async deleteSnapshot(id: string) {
    const db = await dbPromise
    await db.delete('noteSnapshots', id)
  }

  async saveWithSnapshot(
    note: Note,
    snapshot: NoteSnapshot,
    blocks: BlockIndexEntry[] = [],
    operation?: OperationEntry,
  ) {
    const db = await dbPromise
    const tx = db.transaction(['notes', 'noteSnapshots', 'blocks', 'operations'], 'readwrite')
    await tx.objectStore('notes').put(note)
    await tx.objectStore('noteSnapshots').put(snapshot)

    const blockStore = tx.objectStore('blocks')
    const existingBlocks = await blockStore.index('by-doc').getAllKeys(note.id)
    await Promise.all(existingBlocks.map((key) => blockStore.delete(key)))
    await Promise.all(blocks.map((block) => blockStore.put(block)))

    if (operation) {
      await tx.objectStore('operations').put(operation)
    }

    await tx.done
  }

  async saveOperation(entry: OperationEntry) {
    const db = await dbPromise
    await db.put('operations', entry)
  }

  async loadOperations(noteId: string) {
    const db = await dbPromise
    return db.getAllFromIndex('operations', 'by-doc', noteId)
  }

  async listOperations() {
    const db = await dbPromise
    return db.getAll('operations')
  }

  async deleteOperation(id: string) {
    const db = await dbPromise
    await db.delete('operations', id)
  }

  async loadBlocks(noteId: string) {
    const db = await dbPromise
    return db.getAllFromIndex('blocks', 'by-doc', noteId)
  }

  async listBlocks() {
    const db = await dbPromise
    return db.getAll('blocks')
  }

  async saveEditorState(state: EditorStateRecord) {
    const db = await dbPromise
    await db.put('editor_state', state)
  }

  async loadEditorState(docId: string) {
    const db = await dbPromise
    return (await db.get('editor_state', docId)) ?? null
  }

  async saveWorkspaceState(state: WorkspaceStateRecord) {
    const db = await dbPromise
    await db.put('workspace_state', state)
  }

  async loadWorkspaceState(id: string) {
    const db = await dbPromise
    return (await db.get('workspace_state', id)) ?? null
  }
}
