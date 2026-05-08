# 架构说明

## 产品技术方向

MindDock 的核心不是普通 textarea，而是「块级 Hybrid Markdown 编辑器」。

产品工作流目标：

```text
结构化输入
  -> 安静阅读
  -> AI 理解
  -> 跨端一致
```

目标形态：

```text
Markdown / JSON AST
  -> ProseMirror Document
  -> 富文本视觉渲染
  -> AI 语义分析
```

用户应该既能保留 Markdown 的结构感，又能获得接近 Bear、Craft、Notion 的排版体验。

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

## 主数据格式

不要把 HTML 作为主数据。

推荐顺序：

1. Markdown：轻、易同步、AI 友好、搜索友好、导入导出友好。
2. JSON AST / ProseMirror JSON：结构表达更强，适合复杂块级能力。

短期可以先保留 TipTap JSON，后续补 Markdown serializer，确保数据能稳定导出为 Markdown。

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
- UI 状态和 Editor 状态保持隔离。

## 当前取舍

当前应用优先保留一个干净、可运行、可展示的产品界面，而不是保留多个半集成的旧版本。下一步应谨慎把真实编辑和数据能力接回来，而不是重新堆出新的实验分支。
