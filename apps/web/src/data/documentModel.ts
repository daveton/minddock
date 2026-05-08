export type ProseMirrorNode = {
  type?: string
  attrs?: Record<string, unknown> | null
  content?: ProseMirrorNode[]
  text?: string
  [key: string]: unknown
}

export type DocumentValidationResult = {
  repaired: boolean
  issues: string[]
  document: Record<string, unknown>
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

function isNode(value: unknown): value is ProseMirrorNode {
  return isRecord(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
