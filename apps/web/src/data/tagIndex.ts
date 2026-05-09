import type { Note, NoteSummary } from './memory'

export type TagPath = {
  full: string
  segments: string[]
}

export type TagIndexEntry = {
  tag: string
  docIds: string[]
  count: number
  updatedAt: number
}

export type TagNode = {
  id: string
  name: string
  path: string
  children: TagNode[]
  noteCount: number
}

export function parseTagPath(value: string): TagPath | null {
  const segments = value
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)

  if (segments.length === 0) {
    return null
  }

  return {
    full: segments.join('/'),
    segments,
  }
}

export function normalizeTags(tags: readonly string[] | null | undefined) {
  const normalized = new Set<string>()

  for (const tag of tags ?? []) {
    const parsed = parseTagPath(tag)
    if (parsed) {
      normalized.add(parsed.full)
    }
  }

  return Array.from(normalized).sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

export function getNoteTagPaths(note: Note | NoteSummary | null) {
  if (!note) {
    return []
  }

  return normalizeTags(note.tags)
}

export function buildTagIndex(notes: Array<Note | NoteSummary>): TagIndexEntry[] {
  const index = new Map<string, { docIds: Set<string>; updatedAt: number }>()

  for (const note of notes) {
    for (const tag of getNoteTagPaths(note)) {
      const entry = index.get(tag) ?? { docIds: new Set<string>(), updatedAt: 0 }
      entry.docIds.add(note.id)
      entry.updatedAt = Math.max(entry.updatedAt, note.updatedAt)
      index.set(tag, entry)
    }
  }

  return Array.from(index.entries())
    .map(([tag, entry]) => {
      const docIds = Array.from(entry.docIds).sort()
      return {
        tag,
        docIds,
        count: docIds.length,
        updatedAt: entry.updatedAt,
      }
    })
    .sort((a, b) => a.tag.localeCompare(b.tag, 'zh-CN'))
}

export function buildTagTreeFromIndex(index: TagIndexEntry[]): TagNode[] {
  const roots: TagNode[] = []
  const byPath = new Map<string, TagNode>()
  const docIdsByPath = new Map<string, Set<string>>()

  for (const entry of index) {
    const tagPath = parseTagPath(entry.tag)
    if (!tagPath) {
      continue
    }

    let parent: TagNode | null = null
    let path = ''

    for (const segment of tagPath.segments) {
      path = path ? `${path}/${segment}` : segment
      let node = byPath.get(path)

      if (!node) {
        node = {
          id: path,
          name: segment,
          path,
          children: [],
          noteCount: 0,
        }
        byPath.set(path, node)

        if (parent) {
          parent.children.push(node)
        } else {
          roots.push(node)
        }
      }

      const docIds = docIdsByPath.get(path) ?? new Set<string>()
      entry.docIds.forEach((docId) => docIds.add(docId))
      docIdsByPath.set(path, docIds)
      node.noteCount = docIds.size
      parent = node
    }
  }

  const sortTree = (nodes: TagNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
    nodes.forEach((node) => sortTree(node.children))
  }

  sortTree(roots)
  return roots
}

export function noteMatchesTagPath(note: Note | NoteSummary, tagPath: string | null) {
  if (!tagPath) {
    return true
  }

  return getNoteTagPaths(note).some((tag) => tag === tagPath || tag.startsWith(`${tagPath}/`))
}
