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

## 当前产品表面

当前 UI 刻意保持扁平：

```text
main.tsx
  -> WorkspaceViewFixed.tsx
  -> styles.css
```

这样做的目的，是让原型容易理解、容易修改，并避免未使用的组件抽象继续拖慢产品迭代。

## 保留的本地优先基础

本地优先编辑器基础仍然保留，供下一轮接入真实功能：

```text
ui/EditorView.tsx
  -> editor/setup.ts
  -> editor/events.ts
  -> data/repository.ts
  -> data/db.ts
```

重新接入时必须遵守：

- 不在 `keydown -> transaction` 输入关键路径中访问存储。
- 不在中文输入 composition 过程中触发 Markdown 自动转换。
- 保存动作放在 debounce 后，或发生在明确的笔记切换动作中。
- Repository 是唯一持久化边界。
- UI State、Editor State、Persistence State、Sync State、AI State 保持隔离。
- local journal -> sync queue -> remote merge，不做远程实时覆盖。

## 当前取舍

当前应用优先保留一个干净、可运行、可展示的产品界面，而不是保留多个半集成的旧版本。下一步应谨慎把真实编辑和数据能力接回来，而不是重新堆出新的实验分支。
