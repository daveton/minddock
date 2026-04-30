# Roadmap (MindDock)

MindDock 开发路线图，分为三个阶段。

---

## Phase 1：本地编辑器

**目标**：做出一个像 Bear 一样不卡的本地编辑器

### 完成标准（必须全部满足）

- ✅ 能创建一条 note
- ✅ 能连续输入（不卡）
- ✅ 自动保存（IndexedDB）
- ✅ 刷新页面内容不丢
- ✅ 不依赖后端

### 功能

- TipTap 编辑器
- 本地存储（IndexedDB）
- 自动保存（debounce 300ms）
- 崩溃恢复
- 切换 note

### 工程结构

```
apps/web/src/
├── editor/          # 实时系统
│   ├── setup.ts
│   ├── events.ts
│   └── markdown.ts
├── data/            # 后台系统
│   ├── db.ts
│   ├── repository.ts
│   └── note.ts
└── ui/              # 薄壳
    ├── EditorView.tsx
    └── App.tsx
```

### 约束

- 不接 Zustand
- 不接后端
- 不加标签、搜索、同步

---

## Phase 2：标签 + 搜索

**目标**：增强组织能力

### 功能

- 标签系统（#work/project）
- 标签树结构
- 全文搜索
- 快捷键

### 工程结构

```
apps/web/src/
├── editor/          # 保持不变
├── data/            # 添加 tag、search
│   ├── db.ts
│   ├── repository.ts
│   ├── note.ts
│   ├── tag.ts
│   └── search.ts
├── ui/              # 添加侧边栏
    ├── EditorView.tsx
    ├── App.tsx
    ├── Sidebar.tsx
    └── TagTree.tsx
└── store/           # 引入 Zustand
    └── ui.ts
```

---

## Phase 3：同步 + 部署

**目标**：支持多设备同步和 NAS 部署

### 功能

- 本地优先同步
- 冲突解决（last-write-wins）
- FastAPI 后端
- PostgreSQL 存储
- NAS 部署方案

### 工程结构

```
minddock/
├── apps/
│   ├── web/         # 前端
│   └── api/         # FastAPI 后端
├── packages/
│   └── shared/      # 共享类型
└── docker/
    └── compose.yml
```

### 数据流

```text
Editor
 ↓
Repository
 ↓
Local DB (IndexedDB)
 ↓
Sync Queue
 ↓
FastAPI
 ↓
PostgreSQL
```

---

## 非目标（所有阶段）

- ❌ 不复刻 Bear 数据库
- ❌ 不做多人协作
- ❌ 不过早拆包（editor-core 等待稳定后再考虑）
- ❌ 不做复杂权限系统

---

## 执行纪律

每个阶段必须完全可用才能进入下一阶段。

- Phase 1 完成后 → 进入 Phase 2
- Phase 2 完成后 → 进入 Phase 3

不跳阶段，不并行开发。


## 里程碑验收 Gate（新增）

在“用户体验第一、本地优先”硬性要求下，每阶段结束必须通过以下 Gate：

### Gate A：输入体验 Gate
- 输入延迟 p95 < 16ms
- 连续输入 10 分钟无明显卡顿
- 光标无跳动、无异常滚动

### Gate B：本地可靠性 Gate
- 自动保存稳定（debounce 300ms）
- 页面刷新可恢复最近编辑内容
- 离线可完整使用核心能力（创建/编辑/删除/读取）

### Gate C：架构纪律 Gate
- 输入路径不包含 Repository/IndexedDB/网络调用
- Editor State、UI State、Data State 边界清晰
- 非关键计算移到后台调度（debounce/idle）

未通过 Gate，不得进入下一阶段。


## 约束联动（新增）

- 任何阶段新增需求，必须先校验是否违反 `docs/CONSTRAINTS.md`。
- 若需求会影响输入路径，必须先完成性能验证方案，再进入开发。
- 若需求会影响数据路径，必须证明离线可用性不下降。


## Definition of Done（新增）

每阶段“完成”必须同时满足：

1. 功能清单通过手动验收；
2. Gate A/B/C 全部通过；
3. 有可复现的性能测量记录（含 p95）；
4. 关键回归项（输入、切换、恢复）无阻塞缺陷。


## 用户价值验收（新增）

每阶段除工程 Gate 外，还需满足用户价值验收：

- 场景 A（30 秒速记）可稳定完成
- 场景 B（连续输入）无可感知卡顿
- 场景 C（中断恢复）成功率达到可用标准

若用户价值验收失败，即使工程指标通过，也不得判定阶段完成。


## UI/UX 验收清单（新增）

每阶段发布前必须完成：

- 状态反馈完整（已保存/离线/失败）
- 输入过程无明显布局抖动
- 核心操作可键盘完成
- 错误提示不遮挡正文编辑
