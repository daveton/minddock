# Minddock 设计文档

## 1. 产品目标

> 打造一个"无感写作"的笔记系统，接近 Bear 的输入体验。

---

## 2. 核心体验指标（必须达标）

| 指标 | 目标 |
|------|------|
| 输入延迟 | < 16ms |
| 打开笔记 | < 100ms |
| 滚动 | 60fps |
| 保存 | 无感 |

---

## 3. 编辑器设计

### 3.1 输入模型

```text
Input → TipTap Transaction → DOM Patch
```

原则：

* 不触发 React re-render
* 不做同步计算
* 不访问后端

编辑器是"实时系统"，其他都是"后台系统"。

---

### 3.2 Markdown 显示策略

状态驱动：

```text
Focused Line → Show Markdown
Blurred Line → Fade Markdown
```

---

### 3.3 行状态系统

```ts
type LineState = {
  id: string
  isActive: boolean
}
```

---

### 3.4 输入阶段硬约束（不可违反）

在用户输入（keydown → transaction）期间，禁止：

- ❌ 访问 IndexedDB
- ❌ 调用 Repository
- ❌ setState（React / Zustand）
- ❌ 触发任何异步操作
- ❌ 执行 Markdown 解析

允许：

- ✅ TipTap 内部 transaction
- ✅ 最小 DOM patch

违反以上任意一条 = 直接破坏输入体验

---

## 4. 数据流设计

```text
Editor
 ↓
Repository（统一数据入口）
 ↓
Local DB (IndexedDB)
 ↓
Sync Queue (阶段 3)
 ↓
FastAPI (阶段 3)
 ↓
PostgreSQL (阶段 3)
```

---

## 5. 本地优先策略

参考 Obsidian：

* 所有写操作先落本地
* 后端是"同步层"，不是"主数据源"

**系统必须在引入任何同步功能之前完全离线可用。**

---

## 6. 数据层设计（关键）

### 6.1 Repository 模式

```ts
// apps/web/src/data/repository.ts
interface Repository {
  saveNote(note: Note): Promise<void>
  getNote(id: string): Promise<Note>
  listNotes(): Promise<Note[]>
  deleteNote(id: string): Promise<void>
}
```

好处：

* 前端不关心存哪里
* 可以随时换存储策略
* 同步逻辑不会污染编辑器

---

### 6.2 本地存储

```ts
// apps/web/src/data/local.ts
class LocalRepository implements Repository {
  // IndexedDB implementation
}
```

---

### 6.3 同步存储（阶段 3）

```ts
// apps/web/src/data/sync.ts
class SyncRepository implements Repository {
  // API sync implementation
}
```

---

## 6.4 Note 数据结构（MVP）

```ts
type Note = {
  id: string
  content: any // TipTap JSON (内部), Markdown 用于导出/导入
  createdAt: number
  updatedAt: number
}
```

---

## 7. 保存策略

- 输入后 300ms（debounce）触发保存
- 保存内容为完整 note（不做 diff，MVP）
- 每次保存更新 updatedAt
- 保存失败不影响 UI（乐观更新）

未来优化：
- 增量保存
- 版本历史

---

## 8. 编辑器与数据层边界

- 输入过程中：不触发数据层
- 输入结束（debounce 300ms）：调用 Repository.saveNote
- 切换笔记：从 Repository.getNote 加载
- 编辑器不直接操作 IndexedDB 或 API

---

## 9. 崩溃恢复策略

- 每次输入后保存到 IndexedDB
- 页面刷新后自动恢复最后编辑内容
- 不依赖后端恢复

目标：
即使浏览器崩溃，用户输入不丢失

---

## 10. 笔记切换策略

- 切换前触发一次立即保存（非 debounce）
- 切换后立即加载目标 note（优先本地）
- 不显示 loading（使用缓存）

---

## 11. 同步机制（阶段 3，简化版）

```text
change → local save → enqueue sync → async push
```

冲突策略：

* last-write-wins（MVP）
* 后续可升级版本控制

---

## 12. 标签系统设计

结构：

```text
#work/project
```

实现：

* 树结构
* 字符串路径解析
* 不依赖复杂关系表

---

## 13. 性能策略

### 必须遵守：

* 不全量 render
* 不深层 state
* 不频繁 setState

---

### 技术手段：

* requestIdleCallback（后台任务）
* debounce（300ms）
* 虚拟滚动（长文）

---

## 14. UI 原则

* 留白优先
* 中心排版（max-width: 720px）
* 微动画（150ms）

---

## 15. 状态管理（Zustand）

Zustand 只用于 UI 状态，不用于编辑器状态。

```ts
// apps/web/src/store/ui.ts
interface UIStore {
  selectedNoteId: string | null
  sidebarOpen: boolean
  // ... UI state only
}
```

编辑器状态由 TipTap 内部管理，不通过 Zustand。

---

## 16. 非目标（防止过度设计）

* ❌ 不复刻 Bear 数据库
* ❌ 不 reverse app
* ❌ 不做复杂权限系统
* ❌ 不做多人协作（初期）
* ❌ 不过早拆包（editor-core 等待稳定后再考虑）

---

## 17. 架构原则

### 编辑器优先级最高

* editor 单独目录
* 不依赖 store
* 不依赖 API
* 作为实时系统独立运行

### 数据层解耦

* Repository 作为统一入口
* 编辑器不关心存储实现
* 本地存储和同步逻辑分离

### 延迟复杂度

* 先单机 → 再同步 → 再部署
* 每个阶段必须完全可用

---

## 18. 成败判断标准

不是代码结构，而是：

* 打开页面 → 1 秒内开始写
* 连续打字 → 不掉帧
* 切笔记 → 无 loading
* 断网 → 继续写

如果不能，架构再好都是假的。

---

## 19. 最大风险

你现在最大风险不是架构，而是：

> **你可能在写"系统"，而不是"编辑器"**

而 Bear 的本质是：

> 一个"极致优化的输入系统"

---

## 20. Phase 1 完成标准（必须全部满足）

Phase 1 的目标是做出一个"像 Bear 一样不卡的本地编辑器"。

必须全部满足以下条件才能进入 Phase 2：

- ✅ 能创建一条 note
- ✅ 能连续输入（不卡）
- ✅ 自动保存（IndexedDB）
- ✅ 刷新页面内容不丢
- ✅ 不依赖后端

未满足以上任意一条 → 不进入 Phase 2

---

## 21. 数据真相（Source of Truth）

在本地模式下：

- IndexedDB 是唯一数据源
- Editor 内容必须与 IndexedDB 同步
- 任何冲突以 IndexedDB 为准

在同步模式下（Phase 3）：

- 本地优先（local-first）
- 远端为备份与同步层
- 冲突时本地优先

---

## 22. 初始化流程

用户打开页面时的执行顺序：

1. 加载最近 note（IndexedDB）
2. 初始化 Editor（空内容）
3. setContent(note.content)
4. 开始监听 onUpdate

原则：

- Editor 只初始化一次
- 不在初始化期间触发保存
- 避免闪屏

---

## 23. 长文档策略（MVP）

为了避免过早优化，Phase 1 采用以下策略：

- 单文档限制：< 5000 行
- 不做复杂语法高亮
- Markdown 渐隐为轻量实现（CSS）

未来优化（Phase 2+）：

- 虚拟滚动
- 增量渲染
- 按需加载

---

## 24. 编辑器生命周期

Editor 实例的生命周期管理：

- **init**：创建 Editor 实例（仅一次）
- **mount**：绑定 DOM
- **update**：处理输入（debounced）
- **destroy**：页面卸载时清理

禁止：

- 重新创建 Editor（除非页面刷新）
- 在组件 re-render 时重新初始化

---

## 25. 错误容忍策略

真实产品必须具备的错误处理：

- **saveNote 失败** → 重试（不影响 UI）
- **getNote 失败** → fallback 空内容
- **sync 失败**（Phase 3）→ 不影响本地使用

原则：

- 错误不阻塞输入
- 本地可用性优先
- 后台重试机制

---

## 26. 调试原则

性能问题优先排查顺序：

1. 是否触发 React render
2. 是否访问数据库
3. 是否执行同步计算

而不是优化算法。

常见性能问题排查：

- 使用 React DevTools 检查 render 次数
- 使用 Performance 面板检查主线程阻塞
- 检查是否有同步 IndexedDB 操作


## 15. 性能与一致性可观测性（新增）

必须补充最小可观测性：

- 输入延迟：记录 p50/p95
- 打开笔记耗时：记录 p95
- 保存失败率：按会话统计
- 同步冲突计数（Phase 3）：按天统计

没有可观测性，不允许宣称 Gate 通过。
