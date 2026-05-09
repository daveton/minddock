import { Extension } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'

type ProseMirrorNode = {
  type: string
  attrs?: Record<string, unknown>
  content?: ProseMirrorNode[]
  text?: string
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
}

const HEADING_PATTERN = /^(#{1,6})\s+(.+)$/
const TASK_PATTERN = /^[-*]\s+\[( |x|X)\]\s*(.*)$/
const BULLET_PATTERN = /^[-*]\s+(?!\[[ xX]\]\s*)(.*)$/
const TABLE_SEPARATOR_PATTERN = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/

export const MarkdownPaste = Extension.create({
  name: 'markdownPaste',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste: (_view, event) => {
            const text = event.clipboardData?.getData('text/plain') ?? ''

            if (!looksLikeMarkdown(text)) {
              return false
            }

            const content = parseMarkdownBlocks(text)
            if (content.length === 0) {
              return false
            }

            event.preventDefault()
            this.editor.chain().focus().insertContent(content).run()
            return true
          },
        },
      }),
    ]
  },
})

function looksLikeMarkdown(text: string) {
  if (!text.trim()) {
    return false
  }

  return /(^|\n)(#{1,6}\s+|[-*]\s+\[[ xX]\]\s+|\|.*\|)|\*\*[^*]+\*\*|#[\p{L}\p{N}_/-]+/u.test(text)
}

function parseMarkdownBlocks(markdown: string): ProseMirrorNode[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  const blocks: ProseMirrorNode[] = []
  let paragraph: string[] = []

  const flushParagraph = () => {
    const text = paragraph.join('\n').trim()
    paragraph = []

    if (!text) {
      return
    }

    blocks.push({
      type: 'paragraph',
      content: parseInline(text),
    })
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    const trimmed = line.trim()

    if (!trimmed || trimmed === '⠀') {
      flushParagraph()
      continue
    }

    const table = tryParseTable(lines, index)
    if (table) {
      flushParagraph()
      blocks.push(table.node)
      index = table.nextIndex - 1
      continue
    }

    const headingMatch = trimmed.match(HEADING_PATTERN)
    if (headingMatch) {
      flushParagraph()
      blocks.push({
        type: 'heading',
        attrs: { level: headingMatch[1]?.length ?? 1 },
        content: parseInline(headingMatch[2] ?? ''),
      })
      continue
    }

    const taskMatch = trimmed.match(TASK_PATTERN)
    if (taskMatch) {
      flushParagraph()
      blocks.push({
        type: 'taskItem',
        attrs: { checked: taskMatch[1]?.toLowerCase() === 'x' },
        content: parseInline(taskMatch[2] ?? ''),
      })
      continue
    }

    const bulletMatch = trimmed.match(BULLET_PATTERN)
    if (bulletMatch) {
      flushParagraph()
      blocks.push({
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: parseInline(bulletMatch[1] ?? ''),
              },
            ],
          },
        ],
      })
      continue
    }

    paragraph.push(trimmed)
  }

  flushParagraph()
  return blocks
}

function tryParseTable(lines: string[], startIndex: number): { node: ProseMirrorNode; nextIndex: number } | null {
  const firstLine = lines[startIndex]?.trim() ?? ''
  const secondLine = lines[startIndex + 1]?.trim() ?? ''

  if (!isTableRow(firstLine) || !TABLE_SEPARATOR_PATTERN.test(secondLine)) {
    return null
  }

  const rows: string[][] = [parseTableCells(firstLine)]
  let index = startIndex + 2

  while (index < lines.length && isTableRow(lines[index] ?? '')) {
    rows.push(parseTableCells(lines[index] ?? ''))
    index += 1
  }

  return {
    nextIndex: index,
    node: {
      type: 'table',
      content: rows.map((cells, rowIndex) => ({
        type: 'tableRow',
        content: cells.map((cell) => ({
          type: rowIndex === 0 ? 'tableHeader' : 'tableCell',
          content: [
            {
              type: 'paragraph',
              content: parseInline(cell.trim()),
            },
          ],
        })),
      })),
    },
  }
}

function isTableRow(line: string) {
  const trimmed = line.trim()
  return trimmed.includes('|') && /^\|?.+\|.+\|?$/.test(trimmed)
}

function parseTableCells(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
}

function parseInline(text: string): ProseMirrorNode[] {
  const nodes: ProseMirrorNode[] = []
  let index = 0

  while (index < text.length) {
    const boldStart = text.indexOf('**', index)
    if (boldStart === -1) {
      appendText(nodes, text.slice(index))
      break
    }

    appendText(nodes, text.slice(index, boldStart))
    const boldEnd = text.indexOf('**', boldStart + 2)
    if (boldEnd === -1) {
      appendText(nodes, text.slice(boldStart))
      break
    }

    appendText(nodes, text.slice(boldStart + 2, boldEnd), [{ type: 'bold' }])
    index = boldEnd + 2
  }

  return nodes.length > 0 ? nodes : [{ type: 'text', text }]
}

function appendText(
  nodes: ProseMirrorNode[],
  value: string,
  marks: Array<{ type: string; attrs?: Record<string, unknown> }> = [],
) {
  if (!value) {
    return
  }

  const tagPattern = /#[\p{L}\p{N}_/-]+/gu
  let cursor = 0

  for (const match of value.matchAll(tagPattern)) {
    const start = match.index ?? 0
    const tag = match[0] ?? ''

    if (start > cursor) {
      nodes.push(createTextNode(value.slice(cursor, start), marks))
    }

    nodes.push(createTextNode(tag, [...marks, { type: 'tag', attrs: { path: tag.slice(1) } }]))
    cursor = start + tag.length
  }

  if (cursor < value.length) {
    nodes.push(createTextNode(value.slice(cursor), marks))
  }
}

function createTextNode(
  text: string,
  marks: Array<{ type: string; attrs?: Record<string, unknown> }>,
): ProseMirrorNode {
  return marks.length > 0 ? { type: 'text', text, marks } : { type: 'text', text }
}
