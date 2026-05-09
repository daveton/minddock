import { IndexedDBProvider } from '../data/indexedDBProvider'

export type MarkdownBundle = {
  format: 'minddock.markdown-bundle'
  version: 1
  exportedAt: number
  notes: Array<{
    path: string
    markdown: string
    metadata: {
      id: string
      title: string
      tags: string[]
      createdAt: number
      updatedAt: number
      version: number
    }
  }>
  blocks: Awaited<ReturnType<IndexedDBProvider['listBlocks']>>
  operations: Awaited<ReturnType<IndexedDBProvider['listOperations']>>
}

const storageProvider = new IndexedDBProvider()

export async function createMarkdownBundle(): Promise<MarkdownBundle> {
  const [documents, blocks, operations] = await Promise.all([
    storageProvider.list(),
    storageProvider.listBlocks(),
    storageProvider.listOperations(),
  ])

  return {
    format: 'minddock.markdown-bundle',
    version: 1,
    exportedAt: Date.now(),
    notes: documents.map((document) => ({
      path: `notes/${safeFilename(document.title || document.id)}-${document.id}.md`,
      markdown: document.markdown,
      metadata: {
        id: document.id,
        title: document.title,
        tags: document.metadata?.tags ?? document.tags,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        version: document.version,
      },
    })),
    blocks,
    operations,
  }
}

export async function downloadMarkdownBundle() {
  const bundle = await createMarkdownBundle()
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `minddock-bundle-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function safeFilename(value: string) {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'untitled'
}
