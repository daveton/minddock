# Minddock（本地优先笔记系统）

受 Bear 启发的高性能、本地优先笔记系统。

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
- Zustand
- TailwindCSS

存储：
- IndexedDB（本地缓存）
- Repository 模式（数据层）

同步层（阶段 3）：
- FastAPI
- PostgreSQL

---

## 🚀 快速开始

### 1. 启动前端

```bash
cd apps/web
npm install
npm run dev
```

### 2. 启动后端（阶段 3）

```bash
cd apps/api
docker build -t minddock-api .
docker run -p 8000:8000 minddock-api
```

---

## 📦 功能（MVP）

* [x] 快速编辑器（无延迟）
* [x] 自动保存
* [x] 本地缓存
* [ ] 标签系统
* [ ] 搜索
* [ ] 同步

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

## 🧭 理念

我们不是在重建 Bear。
我们是在重建无摩擦写作的感觉。

编辑器是实时系统。其他一切都是后台系统。

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
