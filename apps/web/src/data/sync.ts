import { IndexedDBProvider } from './indexedDBProvider'
import type { ConflictRecord, OperationEntry, SyncQueueEntry } from './memory'

export type RemotePushResult =
  | { status: 'accepted'; remoteVersion: number }
  | { status: 'conflict'; remoteOperation: OperationEntry; remoteVersion: number }

export interface RemoteAdapter {
  pushOperation(operation: OperationEntry): Promise<RemotePushResult>
}

export type RestRemoteAdapterOptions = {
  endpoint: string
  token?: string
  fetchImpl?: typeof fetch
}

export type SyncRunResult = {
  synced: number
  conflicts: number
  failed: number
}

export type SyncStatusSummary = {
  pending: number
  syncing: number
  synced: number
  conflicts: number
  failed: number
  openConflicts: number
}

const RETRY_BASE_MS = 5000
const RETRY_MAX_MS = 5 * 60 * 1000
const SYNC_ENDPOINT_STORAGE_KEY = 'minddock.sync.rest.endpoint'
const SYNC_TOKEN_STORAGE_KEY = 'minddock.sync.rest.token'
const storageProvider = new IndexedDBProvider()
let defaultRemoteAdapter: RemoteAdapter | null = null

export function processDefaultSyncQueue(limit = 20) {
  defaultRemoteAdapter ??= createDefaultRemoteAdapter()
  return processSyncQueue(defaultRemoteAdapter, limit)
}

export function getRestSyncConfig() {
  const endpoint = readConfigValue(SYNC_ENDPOINT_STORAGE_KEY, import.meta.env.VITE_SYNC_ENDPOINT)
  const token = readConfigValue(SYNC_TOKEN_STORAGE_KEY, import.meta.env.VITE_SYNC_TOKEN)

  return {
    endpoint: endpoint?.trim() ?? '',
    token: token?.trim() || undefined,
    configured: Boolean(endpoint?.trim()),
  }
}

export function setRestSyncConfig(endpoint: string, token?: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(SYNC_ENDPOINT_STORAGE_KEY, endpoint.trim())

  if (token?.trim()) {
    window.localStorage.setItem(SYNC_TOKEN_STORAGE_KEY, token.trim())
  } else {
    window.localStorage.removeItem(SYNC_TOKEN_STORAGE_KEY)
  }

  defaultRemoteAdapter = null
}

export async function getSyncStatusSummary(): Promise<SyncStatusSummary> {
  const [queue, conflicts] = await Promise.all([
    storageProvider.loadSyncQueue([]),
    storageProvider.loadConflictRecords('open'),
  ])

  return {
    pending: queue.filter((entry) => entry.status === 'pending').length,
    syncing: queue.filter((entry) => entry.status === 'syncing').length,
    synced: queue.filter((entry) => entry.status === 'synced').length,
    conflicts: queue.filter((entry) => entry.status === 'conflict').length,
    failed: queue.filter((entry) => entry.status === 'failed').length,
    openConflicts: conflicts.length,
  }
}

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

export class RestRemoteAdapter implements RemoteAdapter {
  private endpoint: string
  private token?: string
  private fetchImpl: typeof fetch

  constructor(options: RestRemoteAdapterOptions) {
    this.endpoint = options.endpoint.replace(/\/+$/, '')
    this.token = options.token
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async pushOperation(operation: OperationEntry): Promise<RemotePushResult> {
    const response = await this.fetchImpl(`${this.endpoint}/operations`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify({ operation }),
    })

    const payload = await readJsonResponse(response)

    if (response.status === 409) {
      return parseConflictResponse(payload)
    }

    if (!response.ok) {
      throw new Error(getRemoteError(payload, `Remote sync failed with HTTP ${response.status}`))
    }

    return parseAcceptedResponse(payload, operation)
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

function createDefaultRemoteAdapter(): RemoteAdapter {
  const config = getRestSyncConfig()

  if (!config.configured) {
    throw new Error('Sync endpoint is not configured')
  }

  return new RestRemoteAdapter({
    endpoint: config.endpoint,
    token: config.token,
  })
}

function readConfigValue(storageKey: string, envValue: string | undefined) {
  if (typeof window !== 'undefined') {
    const localValue = window.localStorage.getItem(storageKey)
    if (localValue !== null) {
      return localValue
    }
  }

  return envValue
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error('Remote sync returned invalid JSON')
  }
}

function parseAcceptedResponse(payload: unknown, operation: OperationEntry): RemotePushResult {
  if (!isRecord(payload)) {
    return {
      status: 'accepted',
      remoteVersion: operation.payload.version,
    }
  }

  return {
    status: 'accepted',
    remoteVersion: typeof payload.remoteVersion === 'number' ? payload.remoteVersion : operation.payload.version,
  }
}

function parseConflictResponse(payload: unknown): RemotePushResult {
  if (!isRecord(payload) || !isOperationEntry(payload.remoteOperation)) {
    throw new Error('Remote conflict response is missing remoteOperation')
  }

  return {
    status: 'conflict',
    remoteOperation: payload.remoteOperation,
    remoteVersion:
      typeof payload.remoteVersion === 'number'
        ? payload.remoteVersion
        : payload.remoteOperation.payload.version,
  }
}

function getRemoteError(payload: unknown, fallback: string) {
  if (isRecord(payload) && typeof payload.error === 'string') {
    return payload.error
  }

  return fallback
}

function isOperationEntry(value: unknown): value is OperationEntry {
  if (!isRecord(value) || !isRecord(value.payload)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    typeof value.docId === 'string' &&
    value.type === 'document.upsert' &&
    typeof value.payload.markdown === 'string' &&
    isRecord(value.payload.content) &&
    typeof value.payload.version === 'number' &&
    typeof value.createdAt === 'number'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
