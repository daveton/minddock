type ProseMirrorNode = {
  type?: string
  attrs?: Record<string, unknown> | null
  content?: ProseMirrorNode[]
  text?: string
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> | null }>
}

export function serializeMarkdown(document: Record<string, unknown>) {
  return serializeBlock(document as ProseMirrorNode).trimEnd() + '\n'
}

function serializeBlock(node: ProseMirrorNode, context: { listDepth?: number; orderedIndex?: number } = {}): string {
  switch (node.type) {
    case 'doc':
      return (node.content ?? []).map((child) => serializeBlock(child)).filter(Boolean).join('\n\n')
    case 'paragraph':
      return serializeInlineChildren(node)
    case 'heading': {
      const level = typeof node.attrs?.level === 'number' ? clampHeadingLevel(node.attrs.level) : 1
      return `${'#'.repeat(level)} ${serializeInlineChildren(node)}`
    }
    case 'blockquote':
      return serializeChildren(node)
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n')
    case 'bulletList':
      return serializeList(node, '-')
    case 'orderedList':
      return serializeList(node, '1.', context.orderedIndex)
    case 'listItem':
      return serializeChildren(node)
    case 'codeBlock':
      return `\`\`\`\n${serializeTextChildren(node)}\n\`\`\``
    case 'horizontalRule':
      return '---'
    case 'hardBreak':
      return '  \n'
    case 'text':
      return applyMarks(escapeMarkdown(node.text ?? ''), node.marks ?? [])
    default:
      return serializeChildren(node)
  }
}

function serializeChildren(node: ProseMirrorNode) {
  return (node.content ?? []).map((child) => serializeBlock(child)).filter(Boolean).join('\n')
}

function serializeInlineChildren(node: ProseMirrorNode) {
  return (node.content ?? []).map((child) => serializeBlock(child)).join('')
}

function serializeTextChildren(node: ProseMirrorNode): string {
  return (node.content ?? []).map((child) => child.text ?? serializeTextChildren(child)).join('')
}

function serializeList(node: ProseMirrorNode, marker: '-' | '1.', startIndex = 1) {
  return (node.content ?? [])
    .map((child, index) => {
      const itemMarker = marker === '1.' ? `${startIndex + index}.` : marker
      const content = serializeBlock(child)
      const [firstLine, ...rest] = content.split('\n')
      const continuation = rest.map((line) => `   ${line}`).join('\n')
      return [`${itemMarker} ${firstLine}`, continuation].filter(Boolean).join('\n')
    })
    .join('\n')
}

function applyMarks(text: string, marks: NonNullable<ProseMirrorNode['marks']>) {
  return marks.reduce((current, mark) => {
    switch (mark.type) {
      case 'bold':
        return `**${current}**`
      case 'italic':
        return `*${current}*`
      case 'strike':
        return `~~${current}~~`
      case 'code':
        return `\`${current.replace(/`/g, '\\`')}\``
      case 'link': {
        const href = typeof mark.attrs?.href === 'string' ? mark.attrs.href : ''
        return href ? `[${current}](${href})` : current
      }
      default:
        return current
    }
  }, text)
}

function escapeMarkdown(text: string) {
  return text.replace(/([\\*_[\]`])/g, '\\$1')
}

function clampHeadingLevel(level: number) {
  return Math.min(Math.max(Math.round(level), 1), 6)
}
