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
