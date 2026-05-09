import type {
  BlockIndexEntry,
  EditorStateRecord,
  Note,
  NoteSnapshot,
  OperationEntry,
  WorkspaceStateRecord,
} from './memory'

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
  saveWithSnapshot(
    note: Note,
    snapshot: NoteSnapshot,
    blocks?: BlockIndexEntry[],
    operation?: OperationEntry,
  ): Promise<void>
  saveOperation(entry: OperationEntry): Promise<void>
  loadOperations(noteId: string): Promise<OperationEntry[]>
  listOperations(): Promise<OperationEntry[]>
  deleteOperation(id: string): Promise<void>
  loadBlocks(noteId: string): Promise<BlockIndexEntry[]>
  listBlocks(): Promise<BlockIndexEntry[]>
  saveEditorState(state: EditorStateRecord): Promise<void>
  loadEditorState(docId: string): Promise<EditorStateRecord | null>
  saveWorkspaceState(state: WorkspaceStateRecord): Promise<void>
  loadWorkspaceState(id: string): Promise<WorkspaceStateRecord | null>
}
