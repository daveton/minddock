import { IndexedDBProvider } from './indexedDBProvider'
import { normalizeDocument } from './documentModel'

export type IntegrityCheckResult = {
  ok: boolean
  issues: string[]
}

const storageProvider = new IndexedDBProvider()

export async function checkDataIntegrity(): Promise<IntegrityCheckResult> {
  const issues: string[] = []
  const [documents, blocks, operations] = await Promise.all([
    storageProvider.list(),
    storageProvider.listBlocks(),
    storageProvider.listOperations(),
  ])
  const documentIds = new Set(documents.map((document) => document.id))

  for (const document of documents) {
    const normalized = normalizeDocument(document.content)
    if (normalized.repaired) {
      issues.push(`document:${document.id}:content_requires_repair`)
    }

    if (!document.markdown.trim()) {
      issues.push(`document:${document.id}:empty_markdown`)
    }

    if (document.version < document.snapshotVersion) {
      issues.push(`document:${document.id}:snapshot_version_ahead`)
    }
  }

  for (const block of blocks) {
    if (!documentIds.has(block.docId)) {
      issues.push(`block:${block.id}:missing_document:${block.docId}`)
    }
  }

  for (const operation of operations) {
    if (!documentIds.has(operation.docId)) {
      issues.push(`operation:${operation.id}:missing_document:${operation.docId}`)
    }

    const normalized = normalizeDocument(operation.payload.content)
    if (normalized.repaired) {
      issues.push(`operation:${operation.id}:payload_requires_repair`)
    }
  }

  return {
    ok: issues.length === 0,
    issues,
  }
}
