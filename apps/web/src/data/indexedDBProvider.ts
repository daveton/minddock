import { dbPromise } from './db'
import type { Note, NoteSnapshot } from './memory'
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

  async saveWithSnapshot(note: Note, snapshot: NoteSnapshot) {
    const db = await dbPromise
    const tx = db.transaction(['notes', 'noteSnapshots'], 'readwrite')
    await tx.objectStore('notes').put(note)
    await tx.objectStore('noteSnapshots').put(snapshot)
    await tx.done
  }
}
