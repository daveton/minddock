# 路线图

## Phase 0：原型收敛

状态：已完成。

- 只保留一个当前生效的 UI 入口。
- 删除未使用的实验 UI 版本。
- 构建通过。
- 文档收敛为少量权威入口。

## Phase 1：本地优先编辑器

目标：在不损伤输入性能的前提下，把精修后的工作台接回本地 Hybrid Markdown 编辑器和数据层。

状态：进行中，核心闭环已接入。

完成标准：

- 笔记创建、编辑、切换、恢复都在本地可用。
- TipTap / ProseMirror 作为编辑器内核接入当前工作台。已完成。
- 文档模型确定为 Hybrid Block Document：普通 Markdown 语义 + 稳定 block id / type / metadata。
- 支持基础 Markdown input rules：标题、列表、引用、代码块、加粗。
- 支持 Bear 风格 inline tag token：`#tag/path` 可编辑、可删除、可派生 sidebar tree。已完成最小版本。
- 支持当前 tag 目录中新建文档时自动写入当前 tag。已完成。
- 中文 IME 输入稳定，composition 期间不误触发转换。
- 不做实时全文 Markdown 解析；只允许当前 block 增量解析和延迟 normalization。
- IndexedDB 仍然是本地主数据源。
- IndexedDB 写入必须 debounce / batch，默认 300-800ms，不进入输入关键路径。
- 主数据可导出为 Markdown，或保留稳定的结构化 JSON 转换路径。
- 本地 Markdown 文件夹同步：用户可选择目录，并按首个 tag path 生成目录树。已完成最小版本。
- 输入延迟 p95 小于 16ms。
- 页面刷新和崩溃恢复经过验证，最小 crash-safe persistence 可用。
- 多标签页行为有明确策略，并完成最小处理。
- 默认阅读态、点击编辑、上下文工具栏等安静编辑体验完成最小版本。

## Phase 1.5：Editor Reliability

目标：在扩展知识组织和 AI 前，先建立用户对编辑器和本地数据的信任。

范围：

- Crash recovery：刷新、tab crash、浏览器异常关闭后可恢复最近编辑。
- 双层保存：实时内存 editor state + append-only local snapshot / journal。
- Undo consistency：保存、恢复、切换笔记不破坏 undo/redo 语义。
- Snapshot validation：保存前后校验 document / block 不变量。
- Corrupted doc repair：损坏 JSON、缺失 block id、异常 block 顺序可尽量修复。
- Editor fuzz testing：随机输入、删除、粘贴、切换、undo/redo 的最小压力测试。
- Editor Benchmark：10 万字文档、3000 blocks、中文 IME、快速切换、大量 undo 的性能基准。

完成标准：

- 输入延迟 p95 仍小于 16ms。
- 大文档打开、输入、切换有可重复 benchmark 记录。
- 主数据损坏时有恢复路径，不静默吞掉用户内容。
- 可靠性 Gate 通过前，不进入 Phase 2 的重功能建设。

## Phase 2：知识组织

目标：增强组织能力，但不让核心编辑器变重。

范围：

- 块级 Markdown 结构识别。
- 标签即目录：tag path parser、tag index、sidebar tree projection。
- 无标签文档入口。
- 搜索优先：标题、正文、标签、block 内容先可用。
- 键盘优先导航。
- 基于真实本地数据的相关笔记区域。
- `[[双链]]` 和 block references 的最小能力。
- 暂不做图谱作为主体验；图谱只能在搜索和引用数据稳定后评估。

## Phase 3：AI 与同步

目标：在本地产品闭环可信之后，再加入 AI 和多设备同步。

范围：

- 基于 Markdown / AST 的 AI 命令动作。
- 标题、列表、引用、代码、时间线等语义块分析。
- Inline AI：选中句子、段落或 block 后进行总结、扩写、改写、翻译、建关联。
- AI 输出优先回写为结构化 block，且必须经过用户确认或明确 transaction。
- 本地优先同步队列：local journal -> sync queue -> remote adapter -> conflict records。
- 云/NAS adapter：REST、Supabase、S3 或自托管 NAS API 选型并实现一种最小闭环。
- 增量上传：按 operation id、doc id、version、timestamp 上传。
- 增量下载：远端 operation 只能经 Repository 合并，禁止直接覆盖 editor state。
- 冲突处理和冲突记录：保留本地、接受远端、另存副本。
- 同步状态 UI：pending、syncing、synced、conflict、failed。
- 本地 Markdown 文件夹继续作为 backup / migration projection，不作为多设备 merge source of truth。

## Phase 4：跨端一致

目标：在 Web 端编辑体验稳定后，再推进移动端和小程序形态。

范围：

- React / Taro 路线评估。
- Bottom Action Bar。
- 移动端中文输入法专项验证。
- SQLite / Supabase 等跨端持久化和同步方案评估。

## 非目标

- 不做多人实时协作。
- 不过早拆包。
- 不采用远程优先数据模型。
- 不做完全 Notion 化 block database。
- 不在早期做视觉优先的知识图谱主界面。
- 不让 AI 默认接管编辑器。
- 不做任何拖慢编辑输入路径的功能。
