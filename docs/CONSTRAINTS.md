# MindDock 项目约束（硬性）

本文是项目执行的“硬约束基线”。如与其他文档冲突，以本文为准。

---

## 1. 总则

1. **用户体验第一**：输入流畅性优先于一切新功能。
2. **本地存储优先**：本地数据可用性优先于同步一致性。
3. **分阶段交付**：未通过 Gate 不得进入下一阶段。
4. **不自研编辑器内核**：编辑器核心基于 TipTap / ProseMirror 等成熟内核。
5. **系统边界优先**：任何新能力必须先说明它属于编辑器、数据、同步、AI、搜索还是 UI 工作区，禁止跨边界自然膨胀。

---

## 1.1 系统边界定义

MindDock 是 **AI Native Local Knowledge Workspace**，不是多人协作文档平台，也不是完全 Notion 化的 block database。

核心边界：

- **编辑器边界**：负责输入、选择、undo/redo、block transaction、Markdown 视觉编辑，不负责存储、同步、AI 请求。
- **文档模型边界**：采用 Hybrid Block Document，即 Markdown 文档语义 + block 元信息。Markdown 仍然是可导出、可理解的主语义层；block id、类型、元信息用于 AI、引用、恢复和局部更新。
- **存储边界**：Repository 是唯一持久化入口。IndexedDB、snapshot、journal、sync queue 都不可被 UI 或 Editor 直接调用。
- **AI 边界**：AI 增强选区、段落、heading、timeline、block 和相关笔记，不接管编辑器，不成为默认聊天产品。
- **同步边界**：同步以 local journal -> sync queue -> remote merge 为路线，不做远程实时覆盖。
- **搜索边界**：Search First。搜索、标签、双链优先于图谱；知识图谱不是 Phase 1/2 的核心交付。

明确非目标：

- 不做完全 Notion 化的任意嵌套 block database。
- 不做 Firebase 风格远程实时覆盖。
- 不做多人实时协作。
- 不把知识图谱作为早期主导航。
- 不把聊天框作为 AI 的默认工作流入口。

---

## 2. 输入路径约束（实时系统）

在 `keydown → transaction` 输入关键路径中，禁止：

- 访问 IndexedDB
- 调用 Repository
- React/Zustand `setState`
- 任意网络请求
- Markdown 同步解析或其他重计算
- 全文 Markdown parse -> 全文 rerender
- 中文输入 composition 期间触发 Markdown 自动转换

允许：

- TipTap transaction
- 最小 DOM patch
- composition 结束后的延迟转换
- 当前 block 的增量解析与延迟 normalization

性能红线：

- 输入延迟 p95 < 16ms
- 连续输入 10 分钟无明显卡顿

---

## 3. 数据路径约束（后台系统）

- 所有写入先落本地（IndexedDB）。
- 读取默认本地优先，远程仅异步回填。
- 同步失败不影响本地 CRUD。
- 离线下核心功能必须完整可用。
- 主数据不得以 HTML 为唯一格式。
- 数据必须能导出为 Markdown，或保留足够结构用于可靠转换。

---

## 4. 架构边界约束

状态必须分层隔离：

- **Editor State**：编辑器内部实时状态
- **UI State**：侧栏/选择状态等界面状态
- **Persistence State**：Repository、IndexedDB、snapshot、journal
- **Sync State**：sync queue、remote merge、冲突记录
- **AI State**：选区上下文、block analysis、AI job 状态

禁止跨层直接调用：

- Editor 不直接操作 IndexedDB/API
- UI 不直接操作存储
- AI 不直接改写主文档，必须通过明确 transaction 或用户确认路径

---

## 4.1 文档不变量

每个 block 必须：

- 有稳定 id。
- 有明确类型。
- 可序列化。
- 可恢复。
- 不以空壳无类型状态长期存在。

每个 document 必须：

- 可序列化。
- 可恢复。
- 可导出 Markdown。
- 可从损坏 snapshot 中尽量修复。
- 保留 block 顺序与必要元信息。

---

## 5. 阶段 Gate 约束

每个阶段结束需同时通过：

- **Gate A（输入体验）**
- **Gate B（本地可靠性）**
- **Gate C（架构纪律）**

未通过 Gate：

- 禁止进入下一阶段
- 禁止新增非修复型功能

---

## 6. 变更管理约束

任何 PR 若涉及编辑器、存储、同步逻辑，必须说明：

1. 是否触碰输入关键路径；
2. 是否破坏本地优先；
3. 对 Gate A/B/C 的影响；
4. 回滚策略（若影响性能或数据可靠性）。


---

## 7. 用户信任约束（新增）

系统需提供最小可见状态反馈：

- 已保存
- 离线编辑中
- 同步失败（仅 Phase 3）

禁止“静默失败”：

- 保存失败不可无提示
- 同步冲突不可无记录

---

## 8. AI Native 体验约束

- AI 不能打断用户输入和阅读。
- AI 入口优先基于选区、段落或 block 的 Inline AI。
- AI 输出应尽量回写为结构化 block，而不是只追加纯文本。
- 默认阅读态必须安静，工具栏和命令入口按上下文出现。
- 移动端不得使用复杂常驻工具栏，优先 Bottom Action Bar。
