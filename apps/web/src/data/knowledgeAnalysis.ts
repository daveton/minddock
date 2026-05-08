import type { Note } from './memory'

export type KnowledgeTimelineItem = {
  id: string
  year: string
  text: string
}

export type RelatedNote = {
  id: string
  title: string
  score: number
}

type ProseMirrorNode = {
  type?: string
  attrs?: Record<string, unknown> | null
  content?: ProseMirrorNode[]
  text?: string
}

export type NoteAnalysis = {
  title: string
  text: string
  tags: string[]
  keywords: string[]
  headings: string[]
  timeline: KnowledgeTimelineItem[]
  summary: string
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'that',
  'this',
  'with',
  'from',
  'about',
  'into',
  'your',
  'notes',
  '一个',
  '通过',
  '如何',
  '进行',
  '这种',
  '成为',
  '以及',
  '因为',
  '所以',
])

export function analyzeNoteContent(content: Record<string, unknown> | null | undefined): NoteAnalysis {
  const root = content as ProseMirrorNode | null | undefined
  const textNodes = collectTextNodes(root)
  const text = textNodes.join(' ').replace(/\s+/g, ' ').trim()
  const headings = collectHeadings(root)
  const tags = collectTags(textNodes)
  const keywords = collectKeywords(text, tags)
  const title = headings[0] ?? textNodes.find((item) => item.trim())?.trim().slice(0, 64) ?? 'Untitled'
  const timeline = collectTimeline(text)

  return {
    title,
    text,
    tags,
    keywords,
    headings,
    timeline,
    summary: buildSummary({ headings, keywords, tags, timeline, text }),
  }
}

export function findRelatedNotes(activeNote: Note | null, notes: Note[], limit = 5): RelatedNote[] {
  if (!activeNote) return []

  const active = analyzeNoteContent(activeNote.content)
  const activeTerms = new Set([...active.tags, ...active.keywords])

  return notes
    .filter((note) => note.id !== activeNote.id)
    .map((note) => {
      const analysis = analyzeNoteContent(note.content)
      const noteTerms = new Set([...analysis.tags, ...analysis.keywords])
      let score = 0

      for (const term of noteTerms) {
        if (activeTerms.has(term)) {
          score += active.tags.includes(term) ? 4 : 1
        }
      }

      if (active.text && analysis.text) {
        score += lexicalOverlap(active.text, analysis.text)
      }

      return {
        id: note.id,
        title: analysis.title,
        score,
      }
    })
    .filter((note) => note.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'zh-CN'))
    .slice(0, limit)
}

function collectTextNodes(node: ProseMirrorNode | null | undefined, texts: string[] = []) {
  if (!node) return texts

  if (typeof node.text === 'string' && node.text.trim()) {
    texts.push(node.text.trim())
  }

  node.content?.forEach((child) => collectTextNodes(child, texts))
  return texts
}

function collectHeadings(node: ProseMirrorNode | null | undefined, headings: string[] = []) {
  if (!node) return headings

  if (node.type === 'heading') {
    const text = collectTextNodes(node, []).join(' ').trim()
    if (text) headings.push(text)
  }

  node.content?.forEach((child) => collectHeadings(child, headings))
  return headings
}

function collectTags(textNodes: string[]) {
  const tags = new Set<string>()
  const tagPattern = /(?:^|\s)#([\p{L}\p{N}_/-]+)/gu

  for (const text of textNodes) {
    for (const match of text.matchAll(tagPattern)) {
      const tag = match[1]?.trim()
      if (tag) tags.add(tag)
    }
  }

  return Array.from(tags).sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

function collectKeywords(text: string, tags: string[]) {
  const words = new Map<string, number>()
  const candidates = text.match(/[\p{Script=Han}]{2,8}|[A-Za-z][A-Za-z0-9-]{2,}/gu) ?? []

  for (const raw of candidates) {
    const word = raw.toLowerCase()
    if (STOP_WORDS.has(word) || tags.includes(raw)) continue
    words.set(raw, (words.get(raw) ?? 0) + 1)
  }

  return Array.from(words.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'))
    .slice(0, 10)
    .map(([word]) => word)
}

function collectTimeline(text: string): KnowledgeTimelineItem[] {
  const items = new Map<string, KnowledgeTimelineItem>()
  const pattern = /(?:^|[^\d])((?:1[5-9]|20)\d{2})\s*年?\s*([^。！？\n]{0,36})/gu

  for (const match of text.matchAll(pattern)) {
    const year = match[1]
    const event = match[2]?.trim()
    if (!year || items.has(year)) continue

    items.set(year, {
      id: year,
      year,
      text: event ? `${year} ${event}` : year,
    })
  }

  return Array.from(items.values()).sort((a, b) => Number(a.year) - Number(b.year)).slice(0, 8)
}

function buildSummary({
  headings,
  keywords,
  tags,
  timeline,
  text,
}: Pick<NoteAnalysis, 'headings' | 'keywords' | 'tags' | 'timeline' | 'text'>) {
  if (!text) return '当前笔记还没有足够内容生成上下文摘要。'

  const focus = headings[0] ?? keywords.slice(0, 3).join('、') ?? '当前主题'
  const tagPart = tags.length > 0 ? `关联标签：${tags.slice(0, 3).join('、')}。` : ''
  const timePart = timeline.length > 0 ? `识别到 ${timeline.length} 个时间节点。` : ''
  const keywordPart = keywords.length > 0 ? `关键词集中在 ${keywords.slice(0, 5).join('、')}。` : ''

  return [focus, keywordPart, tagPart, timePart].filter(Boolean).join(' ')
}

function lexicalOverlap(left: string, right: string) {
  const leftTerms = new Set(collectKeywords(left, []))
  const rightTerms = new Set(collectKeywords(right, []))
  let overlap = 0

  for (const term of rightTerms) {
    if (leftTerms.has(term)) overlap += 1
  }

  return overlap
}
