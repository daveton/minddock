import type {
  BlockIndexEntry,
  EditorStateRecord,
  Note,
  NoteSnapshot,
  ConflictRecord,
  OperationEntry,
  SyncQueueEntry,
  SyncQueueStatus,
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
  enqueueSyncOperation(entry: SyncQueueEntry): Promise<void>
  loadSyncQueue(statuses?: SyncQueueStatus[]): Promise<SyncQueueEntry[]>
  loadSyncQueueEntry(id: string): Promise<SyncQueueEntry | null>
  updateSyncQueueEntry(entry: SyncQueueEntry): Promise<void>
  saveConflictRecord(record: ConflictRecord): Promise<void>
  loadConflictRecords(status?: ConflictRecord['status']): Promise<ConflictRecord[]>
  updateConflictRecord(record: ConflictRecord): Promise<void>
  loadBlocks(noteId: string): Promise<BlockIndexEntry[]>
  listBlocks(): Promise<BlockIndexEntry[]>
  saveEditorState(state: EditorStateRecord): Promise<void>
  loadEditorState(docId: string): Promise<EditorStateRecord | null>
  saveWorkspaceState(state: WorkspaceStateRecord): Promise<void>
  loadWorkspaceState(id: string): Promise<WorkspaceStateRecord | null>
}
