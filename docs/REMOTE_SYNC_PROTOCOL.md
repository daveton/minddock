# Remote Sync Protocol

MindDock Web uses a REST adapter for cloud, NAS, Supabase Edge Function, or self-hosted sync. The browser remains local-first: IndexedDB writes happen first, then queued operations are pushed to the remote endpoint.

## Configuration

The endpoint can be configured in either place:

- Environment: `VITE_SYNC_ENDPOINT` and optional `VITE_SYNC_TOKEN`.
- App preferences: Sync tab, REST sync endpoint and token fields.

The adapter posts to:

```text
POST <endpoint>/operations
```

If a token is configured, MindDock sends:

```text
Authorization: Bearer <token>
```

## Request

```json
{
  "operation": {
    "id": "op-note-abc-1710000000000-1234abcd",
    "docId": "note-abc",
    "type": "document.upsert",
    "payload": {
      "markdown": "# Title\n\nBody\n",
      "content": {},
      "version": 12
    },
    "createdAt": 1710000000000
  }
}
```

Remote services should treat `operation.id` as idempotent. Repeating the same operation should return success rather than creating duplicate state.

## Success Response

Return `2xx` when the operation is accepted:

```json
{
  "status": "accepted",
  "remoteVersion": 12
}
```

`remoteVersion` is optional. If omitted, the client uses `operation.payload.version`.

## Conflict Response

Return `409` when the remote has a newer divergent operation:

```json
{
  "status": "conflict",
  "remoteVersion": 13,
  "remoteOperation": {
    "id": "op-note-abc-1710000005000-remote",
    "docId": "note-abc",
    "type": "document.upsert",
    "payload": {
      "markdown": "# Remote Title\n\nRemote body\n",
      "content": {},
      "version": 13
    },
    "createdAt": 1710000005000
  }
}
```

The client stores this as an open conflict record. It does not silently overwrite local IndexedDB or editor state.

## Error Response

Return non-2xx for transient or authorization failures:

```json
{
  "error": "Unauthorized"
}
```

The client marks the queue entry as `failed` and retries with exponential backoff.
