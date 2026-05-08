# AI Native Markdown 编辑器最佳实践

MindDock 要做的不是“一个 Markdown 编辑器”，而是「AI Native 知识工作流」。

核心公式：

```text
结构化输入
+ 安静阅读
+ AI 理解
+ 跨端一致
```

## 技术路线

推荐主线：

```text
TipTap
+ ProseMirror
+ Markdown Storage
+ React / Taro
+ SQLite / Supabase
```

当前 Web 端优先使用 React；未来如果做小程序或跨端壳，再评估 Taro。远程层和多设备同步进入后期阶段再引入，不能提前污染本地编辑闭环。

不优先选择：

- Quill：过旧。
- Draft.js：维护状态不适合长期产品。
- Slate：自由度高，但复杂知识系统维护成本过大。
- Lexical：适合轻量输入和聊天场景，不是当前重知识系统的首选。

## 数据结构

不要只存 HTML。

推荐分层：

```text
编辑态：ProseMirror JSON
持久化：Markdown
AI 分析：AST / Blocks
```

原因：

- ProseMirror JSON 适合稳定编辑。
- Markdown 适合同步、搜索、导入导出和 AI 处理。
- AST / Blocks 适合 AI 理解标题、引用、列表、代码、时间线、关联等语义结构。

长期数据模型应面向块：

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

AI 理解的是 block，不只是全文字符串。

## 编辑体验

目标体验是 Hybrid Markdown，不是传统富文本。

基础行为：

| 输入 | 显示 |
| --- | --- |
| `# ` | 自动 heading |
| `- ` | 自动 list |
| `**xx**` | 自动 bold |
| `[[xx]]` | 自动双链 |
| `/` | command menu |

关键原则：

- 默认阅读态，点击后进入编辑。
- 工具栏默认隐藏，只在选区或上下文出现。
- Markdown token 半隐藏：输入和光标进入时可见，阅读时弱化或隐藏。
- 不做 Word 式常驻 toolbar。
- 不做让 AI 打断思考的聊天框优先体验。

## 移动端原则

移动端优先保证输入法稳定。

必须处理：

```text
compositionstart
compositionend
beforeinput
```

要求：

- 中文输入期间不触发 Markdown 自动转换。
- 不实时全量 rerender。
- 只增量更新当前 block。
- 不放复杂工具栏。
- 使用 Bottom Action Bar 承载加粗、标题、列表、引用、AI 等高频动作。

## AI Native UX

不要把 AI 只做成聊天框。

优先做 Inline AI：

- 选中一句话、一段或一个 block。
- AI 提供总结、扩写、时间线、建卡片、建关联、改写、翻译。
- AI 输出要能回写为结构化 block，而不是只返回一段纯文本。

AI 能力应基于 AST / Blocks：

- 标题识别。
- 列表提取。
- 引用分析。
- 代码块处理。
- 时间线生成。
- 参考关系和双链关系生成。

## 产品气质

真正高级的知识产品不是功能最多，而是长时间使用不累。

因此必须坚持：

- 减少视觉噪音。
- 提高输入流畅性。
- 降低状态切换。
- AI 不打断思考。
- 一切围绕沉浸式思考。

最终目标不是“最强编辑器”，而是「最懂用户思维结构的编辑器」。
