# 架构说明

## 产品技术方向

MindDock 的核心不是普通 textarea，也不是完全 Notion 化的 block database，而是「Hybrid Block Document」。

产品工作流目标：

```text
结构化输入
  -> 安静阅读
  -> AI 理解
  -> 跨端一致
```

目标形态：

```text
Markdown semantics + Block metadata
  -> ProseMirror Document
  -> 富文本视觉渲染
  -> AI 语义分析
```

用户应该既能保留 Markdown 的结构感，又能获得接近 Bear、Craft、Notion 的排版体验。

系统边界：

```text
Workspace UI
  -> Editor Shell
    -> ProseMirror / TipTap
      -> Hybrid Block Document
  -> Repository
    -> IndexedDB + Snapshot / Journal
  -> Search / AI / Sync
    -> 只通过明确边界读取或提交变更
```

## 编辑器内核原则

不从零自研编辑器内核。

原因很简单：编辑器会涉及光标、Selection、Undo/Redo、Copy/Paste、IME 输入法、Composition Event、移动端键盘、拖拽、表格等复杂问题。MindDock 应该把工程能量放在自己的 UI/UX、块模型、AI 语义能力和本地优先体验上。

推荐内核：

```text
TipTap
  -> ProseMirror
  -> Markdown Parser / Serializer
```

Markdown 解析和序列化可以接入 `remark` 或 `markdown-it`，但不能把同步 Markdown 解析放进输入关键路径。

## 编辑模式

目标编辑体验是 Hybrid Markdown：

- 支持 Markdown input rules，例如 `# + space` 变标题、`- + space` 变列表。
- 支持 Typography First 的阅读/编辑视觉。
- 支持 Token Rendering：光标进入块时可显示 Markdown token，失焦后弱化或隐藏 token。
- 支持块级结构，方便后续做 AI 总结、时间线、关联笔记和知识图谱。

## 文档模型边界

文档模型采用 Hybrid Block Document：

```text
Document
  -> Block(id, type, markdown range/content, metadata)
    -> paragraph
    -> heading
    -> quote
    -> code
    -> list
    -> timeline
    -> ai_summary
    -> references
```

原则：

- Markdown 仍是用户可理解、可导出、可迁移的语义层。
- block id 是内部稳定身份，用于 AI 引用、局部更新、双链、恢复和同步。
- block metadata 只存必要信息，例如 id、type、createdAt、updatedAt、refs、source，不把普通 Markdown 内容拆成重型数据库。
- 不做完全 Notion 化的任意嵌套 block 系统，避免性能恶化、Markdown 语义崩坏和 AI 复杂度暴涨。

每个 block 必须有稳定 id、明确类型、可序列化、可恢复。每个 document 必须可序列化、可恢复、可导出 Markdown。

## Bear 风格知识组织模型

MindDock 当前采用 Bear 风格的核心组织原则：

```text
标签即目录
文档即数据库
树结构是派生视图
```

系统没有真实 folder source of truth。禁止新增 `folderId`、`parentFolderId` 作为主组织模型。

真正的 source of truth 是：

```text
ProseMirror JSON / Markdown semantics
  -> heading
  -> inline tag token
  -> block attrs
```

标题不是独立可编辑字段。标题来自正文中的第一个 heading，`Document.title` 只是派生缓存，用于列表、搜索和导出。

标签不是外部管理表单。标签是正文中的 inline semantic token：

```markdown
#study/历史/清朝
```

编辑器中 tag 由 TipTap mark 渲染为胶囊视觉，但它仍然是正文语义。用户可以把光标移入 tag 内部编辑，系统会根据当前文本同步 tag `path`。如果 tag 不再以 `#` 开头，则退回普通文本，并从文档标签索引中移除。

Sidebar tree 只能由 tag index 派生：

```text
documents
  -> tags
  -> tag index
  -> sidebar tree
```

当前目录下新建文档时，Repository 会把当前选中的 tag path 写入新文档正文，例如：

```markdown
#study/历史/清朝
```

新文档仍然没有 folder 字段。它之所以出现在当前目录，是因为正文里包含该 tag。

## 主数据格式

不要把 HTML 作为主数据。

推荐顺序：

1. Markdown：轻、易同步、AI 友好、搜索友好、导入导出友好。
2. JSON AST / ProseMirror JSON：结构表达更强，适合复杂块级能力。

短期可以先保留 TipTap JSON，后续补 Markdown serializer，确保数据能稳定导出为 Markdown。

## 解析策略

禁止在输入关键路径中实时全文解析 Markdown。

错误路径：

```text
onChange -> parse full markdown -> rerender full document
```

正确路径：

```text
transaction -> update current block
  -> debounce persistence
  -> background validation / serialization
```

Markdown input rules 必须遵守 IME 边界：composition 期间不做 aggressive transform，compositionend 后再处理可延迟转换。

## AI Native 块模型

长期能力围绕 block，而不是全文字符串：

```text
Document
  -> Blocks
    -> Paragraph
    -> Heading
    -> Quote
    -> Timeline
    -> AI Summary
    -> References
```

AI 功能应优先基于 AST / Blocks 做 Inline AI，例如总结、扩写、时间线、建卡片、建关联、改写和翻译。聊天框可以存在，但不能成为唯一 AI 入口。

AI 不接管编辑器。默认入口应来自用户选中的句子、段落、heading、timeline 或 block。AI 输出应尽量成为结构化 block，或通过明确 transaction 写回文档。

## 编辑器状态架构

状态分层：

```text
UI State
  sidebar width, context open, focus mode, selection affordance

Editor State
  ProseMirror doc, selection, transaction, undo/redo, composition

Persistence State
  Repository, IndexedDB, local snapshot, append-only journal

Sync State
  sync queue, remote merge, conflict records

AI State
  selected block context, pending jobs, generated suggestions
```

约束：

- Editor State 不直接访问 IndexedDB、网络或 AI API。
- UI State 不直接写 Repository。
- Persistence State 通过 debounce / batch 接收 editor transaction 后的保存请求。
- Sync State 只能基于 local journal / repository 输出工作，不覆盖实时输入状态。
- AI State 必须通过选区或 block context 工作，不监听每个输入字符做重计算。

## Crash-safe Persistence

保存采用双层策略：

```text
Layer 1: realtime in-memory editor state
Layer 2: append-only local snapshot / journal
```

目标：

- tab crash、refresh、extension 崩溃后尽量恢复最近编辑。
- IndexedDB commit 失败时保留可恢复线索。
- 保存失败必须有状态反馈，不静默丢内容。

写入策略：

- IndexedDB 写入 debounce / batch，默认 300-800ms。
- 明确动作如切换笔记、关闭页面、进入后台时可触发 flush。
- snapshot 写入前后校验 document invariants。

## Local + Markdown + Cloud Storage Strategy

MindDock 采用 local-first 保存策略。IndexedDB 是浏览器端 source of truth，本地 Markdown 文件夹和云端都只能作为同步/备份目标，不能在编辑输入关键路径中反向覆盖编辑器状态。

当前目标架构：

```text
User edits note
        |
        v
TipTap / ProseMirror transaction
        |
        v
Repository debounce / flush
        |
        v
IndexedDB source of truth
  notes + snapshots + operations + blocks
        |
        +--------------------+
        |                    |
        v                    v
Local Markdown Folder     Cloud / NAS Sync
File System Access API    operation queue + remote merge
backup / migration        cross-device backup
```

### Save Targets

用户可以选择三种保存策略：

- 仅保存到 IndexedDB。
- 保存到 IndexedDB，并同步到本地 Markdown 文件夹。
- 仅保存到本地 Markdown 文件夹。

默认策略应保持为 IndexedDB 优先。即使启用了本地 Markdown 文件夹，编辑器保存也先走 Repository / IndexedDB，再由节流同步写入文件夹。这样可以保证刷新恢复、snapshot、operation journal 和 block index 不被绕过。

当前 Web 端已经实现：

- `data/repository.ts`：IndexedDB 主写入边界，生成 snapshot、operation、block index。
- `import-export/fileSystem.ts`：File System Access API 目录选择与 Markdown 写入。
- `components/WorkspaceViewFixed.tsx`：保存偏好 UI，支持数据库、本地文件夹、标签目录树三种开关。

### Markdown Folder Projection

本地 Markdown 文件夹是从当前笔记派生出来的 projection，不是主数据库。

路径规则：

```text
first tag path: #study/历史/清朝
file path:      study/历史/清朝/<safe-title>.md
```

约束：

- 标题来自正文中的第一个 heading。
- 文件名使用派生标题，非法路径字符替换为安全字符。
- 目录层级只来自第一个 tag path。
- 浏览器不能持久暴露绝对路径，UI 只能展示用户选择的目录名和相对预览路径。
- Safari 等不支持 File System Access API 的浏览器走手动导出/下载路径。

注意：如果用户编辑标签导致首个 tag path 改变，后续同步会写入新路径。旧路径清理需要单独的文件迁移记录，不能在没有明确用户确认时自动删除磁盘文件。

### Cloud / NAS Sync Boundary

云端同步必须基于本地 operation journal，而不是监听每次按键直接请求网络。

推荐后续接口：

```text
IndexedDB operations
        |
        v
sync_queue
  operationId
  docId
  localVersion
  remoteVersion?
  status: pending | syncing | synced | conflict | failed
  retryAt
        |
        v
Remote adapter
  REST / Supabase / S3 / NAS API
        |
        v
Conflict records
```

云端数据最小单位：

- `operation.id`
- `operation.docId`
- `operation.createdAt`
- `operation.payload.version`
- `operation.payload.markdown`
- `operation.payload.content`

冲突策略：

- 单设备编辑时，本地 IndexedDB 版本是 master。
- 多设备编辑时，按 `docId + version + operation.createdAt` 检测分叉。
- 不做静默远端覆盖。远端更高版本进入 conflict record，由用户选择保留本地、接受远端或另存副本。
- remote merge 只能通过 Repository 写回，不能直接改 editor state、note cache 或 IndexedDB object store。

## 当前产品表面

当前 UI 仍然刻意保持扁平：

```text
main.tsx
  -> WorkspaceViewFixed.tsx
  -> styles.css
```

这样做的目的，是让原型容易理解、容易修改，并避免未使用的组件抽象继续拖慢产品迭代。

## 当前本地优先编辑闭环

当前工作台已经接入真实 TipTap 编辑器和本地 Repository：

```text
WorkspaceViewFixed.tsx
  -> editor/setup.ts
    -> StarterKit
    -> TaskItem
    -> Tag
  -> editor/events.ts
  -> data/repository.ts
  -> data/db.ts
```

继续迭代时必须遵守：

- 不在 `keydown -> transaction` 输入关键路径中访问存储。
- 不在中文输入 composition 过程中触发 Markdown 自动转换。
- 保存动作放在 debounce 后，或发生在明确的笔记切换动作中。
- Repository 是唯一持久化边界。
- UI State、Editor State、Persistence State、Sync State、AI State 保持隔离。
- local journal -> sync queue -> remote merge，不做远程实时覆盖。

## 当前取舍

当前应用优先保留一个干净、可运行、可编辑、可本地保存的产品界面，而不是保留多个半集成的旧版本。下一步应围绕现有 TipTap / Repository / tag index 闭环继续加可靠性和交互细节，不重新堆出新的实验分支。
