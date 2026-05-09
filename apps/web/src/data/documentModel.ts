export type ProseMirrorNode = {
  type?: string
  attrs?: Record<string, unknown> | null
  content?: ProseMirrorNode[]
  text?: string
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> | null }>
  [key: string]: unknown
}

export type DocumentValidationResult = {
  repaired: boolean
  issues: string[]
  document: Record<string, unknown>
}

export type DocumentMetadata = {
  title: string
  tags: string[]
}

const BLOCK_TYPES = new Set([
  'paragraph',
  'heading',
  'blockquote',
  'codeBlock',
  'bulletList',
  'orderedList',
  'listItem',
  'taskItem',
  'horizontalRule',
  'table',
  'tableRow',
  'tableCell',
  'tableHeader',
])

export function normalizeDocument(input: Record<string, unknown> | null | undefined): DocumentValidationResult {
  const issues: string[] = []
  let repaired = false

  const root = isNode(input) ? cloneNode(input) : createEmptyDoc()

  if (root.type !== 'doc') {
    issues.push('document root type was repaired')
    root.type = 'doc'
    repaired = true
  }

  if (!Array.isArray(root.content)) {
    issues.push('document content was repaired')
    root.content = [createParagraph()]
    repaired = true
  }

  if (root.content.length === 0) {
    issues.push('empty document received a paragraph block')
    root.content = [createParagraph()]
    repaired = true
  }

  const usedIds = new Set<string>()
  root.content = root.content.map((child, index) => {
    const normalized = normalizeNode(child, usedIds, `block-${index}`, issues)
    repaired = repaired || normalized.repaired
    return normalized.node
  })

  return {
    repaired,
    issues,
    document: root as Record<string, unknown>,
  }
}

export function extractDocumentMetadata(document: Record<string, unknown>): DocumentMetadata {
  const root = document as ProseMirrorNode
  const textNodes = collectTextNodes(root)
  const heading = findFirstHeading(root)
  const title = heading || textNodes.find((text) => text.trim())?.trim().slice(0, 80) || 'Untitled'
  const tags = collectTags(root, textNodes)

  return { title, tags }
}

function normalizeNode(
  node: ProseMirrorNode,
  usedIds: Set<string>,
  fallbackSeed: string,
  issues: string[],
): { node: ProseMirrorNode; repaired: boolean } {
  const next = isNode(node) ? cloneNode(node) : createParagraph()
  let repaired = !isNode(node)

  if (!next.type) {
    next.type = 'paragraph'
    issues.push(`${fallbackSeed} missing type was repaired`)
    repaired = true
  }

  if (BLOCK_TYPES.has(next.type)) {
    const attrs = isRecord(next.attrs) ? { ...next.attrs } : {}
    const existingId = typeof attrs.blockId === 'string' ? attrs.blockId : null
    const blockId = existingId && !usedIds.has(existingId) ? existingId : createBlockId()

    if (blockId !== existingId) {
      issues.push(`${fallbackSeed} block id was repaired`)
      repaired = true
    }

    usedIds.add(blockId)
    next.attrs = {
      ...attrs,
      blockId,
    }
  }

  if (next.content !== undefined) {
    if (!Array.isArray(next.content)) {
      next.content = []
      issues.push(`${fallbackSeed} content was repaired`)
      repaired = true
    } else {
      next.content = next.content.map((child, index) => {
        const normalized = normalizeNode(child, usedIds, `${fallbackSeed}-${index}`, issues)
        repaired = repaired || normalized.repaired
        return normalized.node
      })
    }
  }

  return { node: next, repaired }
}

function createEmptyDoc(): ProseMirrorNode {
  return {
    type: 'doc',
    content: [createParagraph()],
  }
}

function createParagraph(): ProseMirrorNode {
  return {
    type: 'paragraph',
    attrs: {
      blockId: createBlockId(),
    },
  }
}

function createBlockId() {
  return `blk_${crypto.randomUUID().slice(0, 12)}`
}

function cloneNode(node: ProseMirrorNode): ProseMirrorNode {
  return JSON.parse(JSON.stringify(node)) as ProseMirrorNode
}

function collectTextNodes(node: ProseMirrorNode | null | undefined, texts: string[] = []) {
  if (!node) {
    return texts
  }

  if (typeof node.text === 'string' && node.text.trim()) {
    texts.push(node.text.trim())
  }

  node.content?.forEach((child) => collectTextNodes(child, texts))
  return texts
}

function findFirstHeading(node: ProseMirrorNode | null | undefined): string {
  if (!node) {
    return ''
  }

  if (node.type === 'heading') {
    return collectTextNodes(node, []).join(' ').trim()
  }

  for (const child of node.content ?? []) {
    const heading = findFirstHeading(child)
    if (heading) {
      return heading
    }
  }

  return ''
}

function collectTags(root: ProseMirrorNode, textNodes: string[]) {
  const tags = new Set<string>()
  collectTagMarks(root, tags)

  const tagPattern = /(?:^|\s)#([\p{L}\p{N}_/-]+)/gu
  for (const text of textNodes) {
    for (const match of text.matchAll(tagPattern)) {
      const tag = normalizeTagPath(match[1] ?? '')
      if (tag) {
        tags.add(tag)
      }
    }
  }

  return Array.from(tags).sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

function collectTagMarks(node: ProseMirrorNode | null | undefined, tags: Set<string>) {
  if (!node) {
    return
  }

  for (const mark of node.marks ?? []) {
    if (mark.type !== 'tag') {
      continue
    }

    const textPath = typeof node.text === 'string' ? parseRenderedTag(node.text) : ''
    const path = textPath || (typeof mark.attrs?.path === 'string' ? normalizeTagPath(mark.attrs.path) : '')
    if (path) {
      tags.add(path)
    }
  }

  node.content?.forEach((child) => collectTagMarks(child, tags))
}

function normalizeTagPath(value: string) {
  return value
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join('/')
}

function parseRenderedTag(value: string) {
  const text = value.trim()
  if (!text.startsWith('#')) {
    return ''
  }

  return normalizeTagPath(text.slice(1))
}

function isNode(value: unknown): value is ProseMirrorNode {
  return isRecord(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
