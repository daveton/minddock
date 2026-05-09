import { IndexedDBProvider } from './indexedDBProvider'
import type { ConflictRecord, OperationEntry, SyncQueueEntry } from './memory'

export type RemotePushResult =
  | { status: 'accepted'; remoteVersion: number }
  | { status: 'conflict'; remoteOperation: OperationEntry; remoteVersion: number }

export interface RemoteAdapter {
  pushOperation(operation: OperationEntry): Promise<RemotePushResult>
}

export type SyncRunResult = {
  synced: number
  conflicts: number
  failed: number
}

const RETRY_BASE_MS = 5000
const RETRY_MAX_MS = 5 * 60 * 1000
const storageProvider = new IndexedDBProvider()

export async function processSyncQueue(adapter: RemoteAdapter, limit = 20): Promise<SyncRunResult> {
  const now = Date.now()
  const queue = (await storageProvider.loadSyncQueue(['pending', 'failed']))
    .filter((entry) => (entry.retryAt ?? 0) <= now)
    .slice(0, limit)

  const result: SyncRunResult = {
    synced: 0,
    conflicts: 0,
    failed: 0,
  }

  for (const entry of queue) {
    const next = await processSyncQueueEntry(entry, adapter)
    result.synced += next.synced
    result.conflicts += next.conflicts
    result.failed += next.failed
  }

  return result
}

export class LocalMemoryRemoteAdapter implements RemoteAdapter {
  private operationsByDoc = new Map<string, OperationEntry>()

  async pushOperation(operation: OperationEntry): Promise<RemotePushResult> {
    const existing = this.operationsByDoc.get(operation.docId)

    if (existing && existing.payload.version > operation.payload.version) {
      return {
        status: 'conflict',
        remoteOperation: existing,
        remoteVersion: existing.payload.version,
      }
    }

    this.operationsByDoc.set(operation.docId, operation)
    return {
      status: 'accepted',
      remoteVersion: operation.payload.version,
    }
  }
}

async function processSyncQueueEntry(
  entry: SyncQueueEntry,
  adapter: RemoteAdapter,
): Promise<SyncRunResult> {
  const syncingEntry: SyncQueueEntry = {
    ...entry,
    status: 'syncing',
    updatedAt: Date.now(),
  }

  await storageProvider.updateSyncQueueEntry(syncingEntry)

  const operation = await findOperation(entry.operationId)

  if (!operation) {
    await storageProvider.updateSyncQueueEntry(markFailed(syncingEntry, 'Missing local operation'))
    return { synced: 0, conflicts: 0, failed: 1 }
  }

  try {
    const result = await adapter.pushOperation(operation)

    if (result.status === 'conflict') {
      await storageProvider.saveConflictRecord(createConflictRecord(operation, result.remoteOperation))
      await storageProvider.updateSyncQueueEntry({
        ...syncingEntry,
        status: 'conflict',
        remoteVersion: result.remoteVersion,
        updatedAt: Date.now(),
      })
      return { synced: 0, conflicts: 1, failed: 0 }
    }

    await storageProvider.updateSyncQueueEntry({
      ...syncingEntry,
      status: 'synced',
      remoteVersion: result.remoteVersion,
      syncedAt: Date.now(),
      updatedAt: Date.now(),
      lastError: undefined,
    })
    return { synced: 1, conflicts: 0, failed: 0 }
  } catch (error) {
    await storageProvider.updateSyncQueueEntry(markFailed(syncingEntry, errorMessage(error)))
    return { synced: 0, conflicts: 0, failed: 1 }
  }
}

async function findOperation(operationId: string) {
  const operations = await storageProvider.listOperations()
  return operations.find((operation) => operation.id === operationId) ?? null
}

function createConflictRecord(localOperation: OperationEntry, remoteOperation: OperationEntry): ConflictRecord {
  return {
    id: `conflict-${localOperation.id}-${Date.now()}`,
    operationId: localOperation.id,
    docId: localOperation.docId,
    localVersion: localOperation.payload.version,
    remoteVersion: remoteOperation.payload.version,
    localOperation,
    remoteOperation,
    status: 'open',
    createdAt: Date.now(),
  }
}

function markFailed(entry: SyncQueueEntry, message: string): SyncQueueEntry {
  const attempts = entry.attempts + 1
  const retryDelay = Math.min(RETRY_BASE_MS * 2 ** Math.max(0, attempts - 1), RETRY_MAX_MS)

  return {
    ...entry,
    status: 'failed',
    attempts,
    lastError: message,
    retryAt: Date.now() + retryDelay,
    updatedAt: Date.now(),
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown sync error'
}
