# Data Layer Design (MindDock)

数据层设计文档，定义运行时数据源、持久化策略、当前最小实现与后续演进边界。

本文分两层：

- 规划层：说明 Phase 1 应守住的核心数据原则
- 实现层：说明当前仓库里已落地的数据流和接口

如与 `docs/CONSTRAINTS.md` 冲突，以约束文档为准。

---

## 1. Source of Truth（数据真相）

在“用户体验第一 + 本地存储优先”策略下，数据层采用双层真相：

- **Memory Cache**：运行时主数据源（快）
- **IndexedDB**：持久化主数据源（稳）

当前结论：

- 输入结束后优先把内容整理为完整 note
- Memory 负责降低切换和重复读取成本
- IndexedDB 负责刷新后恢复与离线可靠性
- 未来同步层只消费本地持久化结果

---

## 2. 当前 Note Model

当前实现对应 [memory.ts](/Users/daveton/Desktop/minddock/apps/web/src/data/memory.ts:1)：

```ts
type Note = {
  id: string
  content: Record<string, unknown>
  updatedAt: number
}

type NoteSummary = Pick<Note, 'id' | 'updatedAt'>
```

说明：

- `id`：note 唯一标识
- `content`：TipTap JSON
- `updatedAt`：最后一次本地可靠写入时间
- `NoteSummary`：列表展示最小字段集

当前未实现但规划中仍可能补充：

- `createdAt`
- `title`
- `revision`
- `syncStatus`

---

## 3. Memory Layer

当前实现：

```ts
export const noteCache = new Map<string, Note>()

export const noteSession = {
  currentNoteId: null as string | null,
}
```

职责：

- 缓存已加载或已保存的 note
- 记录当前编辑 note 的 `id`
- 避免每次切换都重复命中 IndexedDB

约束：

- Memory 只是运行时缓存，不替代持久化
- 当前实现没有 LRU，也没有容量上限
- 当前实现未处理多 tab 共享状态

现状判断：

- 这套简单结构足够支撑 Phase 1 最小骨架
- 继续扩功能前，应补 `revision` 或多 tab 协调策略

---

## 4. IndexedDB Storage

当前实现对应 [db.ts](/Users/daveton/Desktop/minddock/apps/web/src/data/db.ts:1)。

数据库名：`minddock`  
版本：`1`  
Store：`notes`

```ts
export const dbPromise = openDB('minddock', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('notes')) {
      db.createObjectStore('notes')
    }
  },
})
```

当前特征：

- 单 store：`notes`
- key 使用 note `id`
- value 存完整 `Note`

现阶段没做的事：

- schema migration
- 独立 metadata store
- 搜索索引 store
- sync queue store

---

## 5. Repository 语义

当前实现对应 [repository.ts](/Users/daveton/Desktop/minddock/apps/web/src/data/repository.ts:1)。

当前不是 class 形式的 `Repository`，而是一组最小函数接口：

```ts
saveCurrentNote(content)
saveNoteById(noteId, content)
loadNote(id)
listNotes()
createNote()
ensureDefaultNote()
setCurrentNote(id)
```

语义约定：

- `saveCurrentNote(content)`：保存当前活动 note
- `saveNoteById(noteId, content)`：按 id 全量覆盖保存
- `loadNote(id)`：优先读 Memory，未命中回退 IndexedDB
- `listNotes()`：从 IndexedDB 拉全量，再按 `updatedAt` 倒序输出 summary
- `createNote()`：创建空白 note 并立即写入本地
- `ensureDefaultNote()`：保证系统首次启动至少有一条默认 note
- `setCurrentNote(id)`：更新当前活动 note 标识

---

## 6. 当前最小数据流

当前代码里的实际链路是：

```text
TipTap update
 ↓
debounce(300ms)
 ↓
saveCurrentNote(editor.getJSON())
 ↓
noteCache.set(noteId, note)
 ↓
IndexedDB.put('notes', note, noteId)
```

切换 note 时的链路：

```text
click target note
 ↓
flush current note
 ↓
load target note
 ↓
editor.commands.setContent(note.content)
 ↓
update currentNoteId
```

初始化链路：

```text
ensureDefaultNote()
 ↓
load existing default note or create it
 ↓
set currentNoteId
 ↓
render note content
 ↓
listNotes() for sidebar
```

---

## 7. 当前已实现能力

截至当前最小骨架，数据层已具备：

- 默认 note 初始化
- 本地 note 创建
- 300ms 自动保存
- Memory + IndexedDB 双层读写
- note 列表恢复
- note 切换前 flush
- 列表按最近更新时间排序

这些能力已经足以验证：

- 本地优先方向是否成立
- 多 note 流程是否会污染输入链路
- 刷新后数据是否能恢复

---

## 8. 当前未完成项

以下内容仍未进入实现：

- `createdAt`
- 标题提取或独立标题字段
- note 删除
- schema migration
- LRU cache
- 崩溃快照
- 多 tab 冲突检测
- 同步 metadata

这些缺口目前不会阻止 Phase 1 骨架验证，但会影响后续可靠性和可扩展性。

---

## 9. 设计边界

当前实现仍然遵守以下边界：

- Editor 不直接访问 IndexedDB
- UI 不直接操作 IndexedDB
- 所有持久化都经 `repository.ts`

但有一个现实差异需要明确：

- `saveCurrentNote` 是在 debounce 后执行的异步持久化
- 它不在 `keydown → transaction` 热路径里
- 因此当前实现仍符合“输入热路径不打数据库”的规划目标

---

## 10. 已知风险

当前数据层最值得关注的风险：

1. `listNotes()` 目前每次刷新列表都读全量 IndexedDB，数据量大时可能退化。
2. `currentNoteId` 只保存在运行时内存，没有单独持久化最近会话状态。
3. 当前没有 `revision`，多窗口同时编辑可能静默覆盖。
4. `saveNoteById` 为全量覆盖，未来若 note 很大会增加写入成本。

这些风险在 Phase 1 可接受，但应在进入 Phase 2 前重新评估。

---

## 11. 下一步建议

按优先级建议补充：

1. `createdAt`
2. note 删除接口
3. 最近活动 note 持久化
4. 保存失败后的可恢复缓存策略
5. `revision` 字段

若准备推进搜索或标签，再考虑：

6. 独立 metadata store
7. 索引构建策略
8. schema migration 文档
