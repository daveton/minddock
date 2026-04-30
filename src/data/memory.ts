export type Note = {
  id: string
  content: Record<string, unknown>
  updatedAt: number
}

export const noteCache = new Map<string, Note>()

export const noteSession = {
  currentNoteId: null as string | null,
}
