# Data Layer Design (MindDock)

数据层设计文档，定义 Note 模型、存储策略和 Repository 接口。

---

## Note Model

```ts
type Note = {
  id: string
  content: any  // TipTap JSON
  updatedAt: number
}
```

说明：

- `id`：note 唯一标识
- `content`：TipTap JSON 格式（非纯 Markdown）
- `updatedAt`：时间戳，用于排序和冲突解决

---

## Storage

### IndexedDB

数据库名：`minddock`
版本：1
Store：`notes`

```ts
import { openDB } from 'idb'

const db = await openDB('minddock', 1, {
  upgrade(db) {
    db.createObjectStore('notes')
  },
})
```

操作：

```ts
// 保存
await db.put('notes', content, noteId)

// 读取
const content = await db.get('notes', noteId)

// 列出所有
const allNotes = await db.getAll('notes')

// 删除
await db.delete('notes', noteId)
```

---

## Repository

Repository 是统一数据入口，编辑器不直接操作存储。

```ts
interface Repository {
  saveNote(note: Note): Promise<void>
  getNote(id: string): Promise<Note | null>
  listNotes(): Promise<Note[]>
  deleteNote(id: string): Promise<void>
}
```

### LocalRepository（Phase 1）

```ts
class LocalRepository implements Repository {
  constructor(private db: IDBPDatabase) {}

  async saveNote(note: Note): Promise<void> {
    await this.db.put('notes', note, note.id)
  }

  async getNote(id: string): Promise<Note | null> {
    return await this.db.get('notes', id) || null
  }

  async listNotes(): Promise<Note[]> {
    return await this.db.getAll('notes')
  }

  async deleteNote(id: string): Promise<void> {
    await this.db.delete('notes', id)
  }
}
```

---

## 数据流

```text
Editor
 ↓ (debounced 300ms)
Repository.saveNote
 ↓
IndexedDB
```

原则：

- 输入时不触发数据层
- 输入结束后才保存
- 保存失败不影响输入

---

## Phase 1 约束

- 只使用 IndexedDB
- 不涉及同步
- 不涉及后端 API
- Repository 只有一个实现（LocalRepository）
