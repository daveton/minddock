export type Note = {
  id: string
  content: Record<string, unknown>
  updatedAt: number
  localStatus?: 'unsaved'
}

export type NoteSnapshot = {
  id: string
  noteId: string
  content: Record<string, unknown>
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
