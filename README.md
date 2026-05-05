# Minddock（本地优先笔记系统）

受 Bear 启发的高性能、本地优先笔记系统。

当前仓库同时包含两层内容：

- 规划文档：定义目标、约束、阶段和验收标准
- 最小实现：一个可运行的 `Vite + React + TipTap + IndexedDB` 骨架，用于验证 Phase 1 架构方向

## 当前状态

项目目前处于 `Phase 1 / 本地编辑器验证` 阶段，已经完成最小可运行骨架，但还没有通过进入 Phase 2 所需的 Gate。

当前代码已验证：

- TipTap 编辑器初始化
- 300ms debounce 自动保存
- IndexedDB 持久化
- 默认 note 恢复
- 多 note 新建与切换
- 保存/离线状态展示

当前仍未完成：

- 输入性能实测与记录
- 崩溃恢复验证
- 保存失败路径验证
- 多 tab 冲突策略

建议先读：

1. `docs/CONSTRAINTS.md`
2. `docs/PROJECT_STATUS.md`
3. `docs/ROADMAP.md`
4. `docs/DOCS_INDEX.md`

## ⚠️ 项目基线

后续所有任务都必须对齐并优先服务于以下三类内容：

- 项目目标
- 核心原则
- 硬性约束

执行规则：

1. 默认先检查是否符合 `docs/CONSTRAINTS.md`
2. 默认先保护输入体验、本地优先和可靠恢复
3. 若局部实现与项目目标冲突，以目标、原则、约束为准，不以实现便利性为准
4. 若新增任务可能影响输入路径、数据路径或阶段边界，必须先更新相关文档再继续实现

## ✨ 目标

- 重现 Bear 般的写作体验（非 UI 复刻）
- 本地优先、快速、无延迟编辑
- 可在 NAS 上自托管
- 可扩展（后续支持 AI、插件）

---

## 🧠 核心原则

1. 输入延迟 < 16ms
2. 本地优先（IndexedDB 为主）
3. 乐观 UI
4. 最小化 UI 干扰
5. 渐进式增强

**系统必须在引入任何同步功能之前完全离线可用。**

---

## 📐 数据模型（MVP）

Note:
- id: string
- content: TipTap JSON（内部） / Markdown（导出）
- createdAt: number
- updatedAt: number

Tag:
- id: string
- name: string
- path: string (e.g. "work/project")

NoteTag:
- note_id
- tag_id

---

## 🔄 数据流

Editor
↓
Repository（统一数据入口）
↓
Local Storage (IndexedDB)
↓
Sync Queue（阶段 3）
↓
Remote API (FastAPI)

---

## ⚡ 输入约束（关键）

- 输入过程中不得触发 React 全量渲染
- 输入过程中不得访问网络
- 输入过程中不得进行同步计算（如 Markdown 解析）
- 所有非输入操作必须延迟执行（debounce ≥ 300ms）

---

## 🧩 状态分层

- Editor State (ProseMirror) → 实时、不可污染
- UI State (Zustand) → 侧边栏、选择状态
- Data State (Repository) → 持久化数据

规则：
- Editor 不依赖 UI State
- UI 不直接操作存储

---

## 🏗 技术栈

前端：
- React
- TipTap (ProseMirror)
- Vite

Phase 1 当前实现：
- 不接 Zustand
- 原生 CSS
- 单页骨架 + 多 note 列表

存储：
- IndexedDB（本地缓存）
- Repository 模式（数据层）

同步层（阶段 3）：
- FastAPI
- PostgreSQL

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cd apps/web
npm install
```

### 2. 启动前端

```bash
cd apps/web
npm run dev
```

### 3. 构建

```bash
cd apps/web
npm run build
```

### 4. 后端说明

`apps/api` 仍未创建。后端属于 `Phase 3` 规划内容，不是当前仓库的已实现部分。

---

## 📦 功能（MVP）

规划目标：

* [x] 快速编辑器（目标已定义）
* [x] 自动保存（目标已定义）
* [x] 本地缓存（目标已定义）
* [ ] 标签系统
* [ ] 搜索
* [ ] 同步

当前已落地骨架：

* [x] TipTap 编辑器初始化
* [x] 300ms debounce 自动保存
* [x] IndexedDB 持久化
* [x] 默认 note 恢复
* [x] 多 note 新建与切换
* [x] 保存/离线状态展示

当前阻塞进入下一阶段的工作：

* [ ] 建立性能测量与记录流程
* [ ] 验证恢复与失败路径
* [ ] 定义多 tab 冲突策略
* [ ] 补齐 Phase 1 Gate 验收记录

---

## 🧪 性能目标

* 编辑器输入延迟 < 16ms
* 打开笔记时间 < 100ms
* 滚动帧率：60fps

---


## 📏 性能测量协议（新增）

- 指标口径：输入延迟使用 p95（单次会话持续输入 10 分钟）
- 采样点：`keydown` 到 transaction 完成
- 回归门槛：超过 16ms 立即阻断进入下一阶段

---

## ⚠️ 非目标

* 像素级复刻 Bear
* 完整数据库兼容
- 过度工程化功能
* 多人协作（初期）

---

## 📌 路线图

阶段 1：
* 编辑器 + 本地存储

阶段 2：
* 标签系统 + 搜索

阶段 3：
* 同步 + NAS 部署（FastAPI + PostgreSQL）

阶段 4：
* AI 功能

---

## 🧭 文档入口

- `docs/DOCS_INDEX.md`：文档地图
- `docs/PROJECT_STATUS.md`：当前状态、风险、下一步
- `docs/ISSUES_AND_MILESTONES.md`：按阶段拆分的任务与验收

我们不是在重建 Bear。
我们是在重建无摩擦写作的感觉。

编辑器是实时系统。其他一切都是后台系统。

---

## 🧱 当前代码结构

```text
apps/web/
├── index.html
├── package.json
├── src/
│   ├── data/
│   │   ├── db.ts
│   │   ├── memory.ts
│   │   └── repository.ts
│   ├── editor/
│   │   ├── events.ts
│   │   └── setup.ts
│   ├── ui/
│   │   └── EditorView.tsx
│   ├── utils/
│   │   └── debounce.ts
│   ├── main.tsx
│   └── styles.css
├── tsconfig.json
└── vite.config.ts
```

说明：

- `editor/`：实时编辑器初始化与输入后保存绑定
- `data/`：Memory + IndexedDB 的最小数据链路
- `ui/`：当前唯一页面，包含 note 列表、状态反馈与编辑区

---

## 🧪 当前验证重点

在继续扩功能前，先验证：

1. 连续输入是否依然顺畅
2. React 是否没有因输入产生不必要 re-render
3. 新建/切换/刷新后内容是否可靠恢复

---

## 📚 文档使用方式（推荐）

1. 先读 [项目约束](./docs/CONSTRAINTS.md)（硬性要求）
2. 再读 [路线图](./docs/ROADMAP.md)（阶段与 Gate）
3. 最后按需阅读设计/编辑器/数据细节

## 📚 文档

- [文档结构规划](./docs/DOCS_INDEX.md)
- [项目约束](./docs/CONSTRAINTS.md)
- [产品定义](./docs/PRODUCT.md)
- [UI/UX 规范](./docs/UIUX.md)
- [设计文档](./docs/DESIGN.md)
- [可行性分析](./docs/FEASIBILITY.md)
- [编辑器文档](./docs/EDITOR.md)
- [数据层文档](./docs/DATA.md)
- [失败路径与恢复策略](./docs/FAILURE_MODES.md)
- [性能验证方案](./docs/PERF_PLAN.md)
- [路线图](./docs/ROADMAP.md)
