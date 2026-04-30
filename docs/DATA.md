# Data Layer Design (MindDock)

数据层设计文档，定义运行时数据源、持久化策略与 Repository 语义。

---

## 1. Source of Truth（数据真相）

在“用户体验第一 + 本地存储优先”策略下，数据层采用双层真相：

- **Memory Cache**：运行时主数据源（快）
- **IndexedDB**：持久化主数据源（稳）

结论：

- 输入与切换流程优先读写内存层
- 后台异步持久化到 IndexedDB
- 未来同步层只消费本地持久化结果

---

## 2. Note Model（MVP）

```ts
type Note = {
  id: string
  content: any           // TipTap JSON
  createdAt: number
  updatedAt: number
  title?: string         // 可选，便于列表展示
}
```

说明：

- `id`：note 唯一标识
- `content`：编辑器内容（TipTap JSON）
- `createdAt`：创建时间
- `updatedAt`：更新时间，用于排序与冲突策略
- `title`：可选标题（MVP 可由首行提取或独立维护）

---

## 3. Memory Layer（新增）

```ts
// apps/web/src/data/memory.ts
const noteCache = new Map<string, Note>()
let currentNoteId: string | null = null
```

职责：

- 提供低延迟读取
- 管理当前编辑 Note
- 减少频繁 IndexedDB 访问

约束：

- Memory 是运行时缓存，不替代持久化
- 页面生命周期结束后，仍以 IndexedDB 恢复

---

## 4. IndexedDB Storage

数据库名：`minddock`  
版本：`1`  
Store：`notes`

```ts
import { openDB } from 'idb'

const db = await openDB('minddock', 1, {
  upgrade(db) {
    db.createObjectStore('notes')
  },
})
```

基础操作：

```ts
await db.put('notes', note, note.id)
const note = await db.get('notes', noteId)
const notes = await db.getAll('notes')
await db.delete('notes', noteId)
```

---

## 5. Repository Interface

Repository 是统一数据入口，编辑器不直接操作存储。

```ts
interface Repository {
  saveNote(note: Note): Promise<void>
  getNote(id: string): Promise<Note | null>
  listNotes(): Promise<Note[]>
  deleteNote(id: string): Promise<void>
}
```

### 5.1 语义约定（必须明确）

- `saveNote(note)`：**全量覆盖保存（MVP）**，不做 diff/patch。
- `getNote(id)`：优先读 Memory，未命中回退 IndexedDB。
- `listNotes()`：从 IndexedDB 获取，再回填 Memory。
- `deleteNote(id)`：同时删除 Memory 与 IndexedDB。

---

## 6. LocalRepository（Phase 1）

```ts
class LocalRepository implements Repository {
  async saveNote(note: Note): Promise<void> {
    noteCache.set(note.id, note)
    await db.put('notes', note, note.id)
  }

  async getNote(id: string): Promise<Note | null> {
    const cached = noteCache.get(id)
    if (cached) return cached
    const note = await db.get('notes', id)
    if (note) noteCache.set(id, note)
    return note ?? null
  }

  async listNotes(): Promise<Note[]> {
    const notes = await db.getAll('notes')
    for (const n of notes) noteCache.set(n.id, n)
    return notes
  }

  async deleteNote(id: string): Promise<void> {
    noteCache.delete(id)
    await db.delete('notes', id)
  }
}
```

---

## 7. Initialization（新增）

页面初始化流程：

```text
load last note from IndexedDB
  → warmup Memory Cache
  → set currentNoteId
  → render editor content
```

目的：

- 避免空白编辑器闪烁
- 首次打开即恢复最近上下文

---

## 8. Data Flow（更新）

```text
Editor
 ↓ (realtime)
Memory Cache
 ↓ (debounced 300ms)
Repository.saveNote
 ↓
IndexedDB
 ↓ (phase 3)
Sync Queue
```

原则：

- 输入阶段不触发 IndexedDB 读写
- 持久化在后台节流执行
- 同步失败不影响本地读写

---

## 9. Phase 1 约束

- 只使用 LocalRepository
- 不接后端 API
- 不引入同步冲突逻辑
- 必须支持崩溃恢复与离线可用

---

## 10. Phase 3 扩展字段（预留）

```ts
type NoteMeta = {
  id: string
  updatedAt: number
  lastSyncedAt?: number
  syncStatus?: 'local_only' | 'queued' | 'synced' | 'failed'
}
```

说明：`syncStatus` 仅用于同步可观测性，不进入输入关键路径。


## 11. Memory Cache 策略（新增）

为避免内存层无限增长，MVP 约束：

- Cache 上限：最近 200 条 note
- 淘汰策略：按最近访问时间 LRU
- 预热策略：启动时预热最近 20 条

说明：超出上限只淘汰内存副本，不影响 IndexedDB 持久化。
