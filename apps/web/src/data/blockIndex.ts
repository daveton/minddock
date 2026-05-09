import type { BlockIndexEntry, BlockType } from './memory'

type ProseMirrorNode = {
  type?: string
  attrs?: Record<string, unknown> | null
  content?: ProseMirrorNode[]
  text?: string
}

export function buildBlockIndex(docId: string, document: Record<string, unknown>, markdown: string) {
  const blocks: BlockIndexEntry[] = []
  let cursor = 0

  collectBlocks(document as ProseMirrorNode, docId, markdown, blocks, cursor)

  return blocks
}

function collectBlocks(
  node: ProseMirrorNode,
  docId: string,
  markdown: string,
  blocks: BlockIndexEntry[],
  cursor: number,
) {
  if (isIndexedBlock(node)) {
    const text = collectText(node).trim()
    const start = text ? Math.max(markdown.indexOf(text, cursor), 0) : cursor
    const end = text ? start + text.length : start

    blocks.push({
      id: getBlockId(node),
      docId,
      type: mapBlockType(node.type),
      content: text,
      text,
      start,
      end,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    cursor = end
  }

  for (const child of node.content ?? []) {
    cursor = collectBlocks(child, docId, markdown, blocks, cursor)
  }

  return cursor
}

function isIndexedBlock(node: ProseMirrorNode) {
  return ['paragraph', 'heading', 'blockquote', 'bulletList', 'orderedList', 'codeBlock', 'taskItem', 'horizontalRule'].includes(
    node.type ?? '',
  )
}

function mapBlockType(type: string | undefined): BlockType {
  switch (type) {
    case 'heading':
      return 'heading'
    case 'blockquote':
      return 'quote'
    case 'bulletList':
    case 'orderedList':
      return 'list'
    case 'codeBlock':
      return 'code'
    case 'taskItem':
      return 'task'
    case 'horizontalRule':
      return 'rule'
    default:
      return 'paragraph'
  }
}

function getBlockId(node: ProseMirrorNode) {
  return typeof node.attrs?.blockId === 'string' ? node.attrs.blockId : `blk_${crypto.randomUUID().slice(0, 12)}`
}

function collectText(node: ProseMirrorNode): string {
  const ownText = typeof node.text === 'string' ? node.text : ''
  const childText = (node.content ?? []).map(collectText).filter(Boolean).join(' ')
  return [ownText, childText].filter(Boolean).join(' ')
}
