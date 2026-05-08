import type { Note, NoteSnapshot } from './memory'

export interface StorageProvider {
  save(note: Note): Promise<void>
  load(id: string): Promise<Note | null>
  delete(id: string): Promise<void>
  list(): Promise<Note[]>
}

export interface SnapshotStorageProvider {
  saveSnapshot(snapshot: NoteSnapshot): Promise<void>
  loadSnapshots(noteId: string): Promise<NoteSnapshot[]>
  deleteSnapshot(id: string): Promise<void>
}

export interface AtomicSnapshotStorageProvider extends StorageProvider, SnapshotStorageProvider {
  saveWithSnapshot(note: Note, snapshot: NoteSnapshot): Promise<void>
}
