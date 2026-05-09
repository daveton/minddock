export type DocumentRecord = {
  id: string
  title: string
  markdown: string
  content: Record<string, unknown>
  metadata: {
    tags: string[]
    pinned: boolean
    archived: boolean
  }
  tags: string[]
  folderId?: string
  pinned?: boolean
  archived?: boolean
  deleted?: boolean
  createdAt: number
  updatedAt: number
  version: number
  snapshotVersion: number
  localStatus?: 'unsaved'
}

export type Note = DocumentRecord

export type BlockType = 'paragraph' | 'heading' | 'quote' | 'list' | 'code' | 'task' | 'rule'

export type BlockIndexEntry = {
  id: string
  docId: string
  type: BlockType
  content: string
  text: string
  start: number
  end: number
  createdAt: number
  updatedAt: number
}

export type OperationEntry = {
  id: string
  docId: string
  type: 'document.upsert'
  payload: {
    markdown: string
    content: Record<string, unknown>
    version: number
  }
  createdAt: number
}

export type JournalEntry = OperationEntry

export type EditorSelectionSnapshot = {
  from: number
  to: number
}

export type EditorStateRecord = {
  docId: string
  selection: EditorSelectionSnapshot | null
  scrollTop: number
  lastOpenedAt: number
  updatedAt: number
}

export type WorkspaceStateRecord = {
  id: string
  sidebarWidth: number
  listWidth: number
  contextOpen: boolean
  theme: 'light'
  focusMode: boolean
  updatedAt: number
}

export type NoteSnapshot = {
  id: string
  noteId: string
  docId: string
  markdown: string
  content?: Record<string, unknown>
  selection?: EditorSelectionSnapshot | null
  scrollPosition?: number
  createdAt: number
  reason: 'save' | 'recovery' | 'repair'
}

export type NoteSummary = Pick<Note, 'id' | 'updatedAt' | 'localStatus'> & {
  content?: Note['content']
}

export const noteCache = new Map<string, Note>()

export const noteSession = {
  currentNoteId: null as string | null,
}
