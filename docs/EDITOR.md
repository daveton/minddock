# Editor Design (MindDock)

编辑器是系统的核心。它是一个**实时系统（Real-time System）**，所有设计必须围绕输入流畅性展开。

目标：接近 Bear 的输入体验（无延迟、无干扰）。

---

## 🎯 核心目标

- 输入延迟 < 16ms（1 帧）
- 光标稳定（不跳动）
- 连续输入无卡顿
- 无感保存

---

## ⚡ 输入模型

```text
Keyboard Input
 → TipTap Transaction
 → Minimal DOM Patch
```

原则：

* 不触发 React re-render
* 不访问数据层（Repository / IndexedDB）
* 不做同步计算
* 不调用网络

---

## 🚫 输入阶段硬约束（不可违反）

在 `keydown → transaction` 期间，禁止：

* ❌ 调用 Repository（save / fetch）
* ❌ 访问 IndexedDB
* ❌ setState（React / Zustand）
* ❌ 发起任何网络请求
* ❌ 执行 Markdown 解析
* ❌ 执行复杂计算（如 tag 解析）

允许：

* ✅ TipTap transaction
* ✅ 局部 DOM 更新

违反任意一条 = 输入卡顿

---

## 🧩 编辑器架构

```text
Editor (TipTap)
 ↓
onUpdate (debounced)
 ↓
Repository.saveNote
```

说明：

* 输入时：只更新编辑器内部状态
* 输入结束后：再触发保存

---

## 🕒 保存策略

* debounce：300ms
* 保存内容：完整 note（MVP 不做 diff）
* 保存方式：乐观更新（UI 不等待）

```ts
editor.on('update', debounce(() => {
  repository.saveNote(getCurrentNote())
}, 300))
```

---

## 🧠 TipTap 配置（最小可用）

```ts
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'

const editor = new Editor({
  element: document.querySelector('#editor'),
  extensions: [
    StarterKit.configure({
      history: true,
    }),
  ],
  content: '',
  autofocus: true,
})
```

---

## 🔧 TipTap 优化（必须）

### 1. 禁止 React 控制 content

```tsx
// ❌ 错误
<Editor content={state} />

// ✅ 正确
const editor = useRef(new Editor(...))
```

---

### 2. 避免频繁 setState

```ts
// ❌ 错误
onUpdate: () => setState(...)

// ✅ 正确
onUpdate: debounce(handleUpdate, 300)
```

---

### 3. 使用 ref 而不是 state

```ts
const noteRef = useRef(currentNote)
```

---

## ✍️ Markdown 渐隐策略

规则：

```text
当前行 → 显示 Markdown
其他行 → 渐隐
```

实现思路：

* 给当前行添加 class：`active-line` 
* Markdown token 用 span 包裹

```css
.markdown-token {
  opacity: 0;
  transition: opacity 0.15s ease;
}

.active-line .markdown-token {
  opacity: 1;
}
```

---

## 📍 行状态系统

```ts
type LineState = {
  id: string
  isActive: boolean
}
```

来源：

* selection change
* cursor position

---

## 🧭 光标与滚动

目标：

* 光标不跳动
* 滚动自然

规则：

* 不使用 `scrollIntoView` 
* 使用最小滚动调整
* 不在 render 中控制 scroll

---

## 🔄 编辑器与数据层边界

* 输入过程中：不触发数据层
* 输入结束（debounce）：调用 Repository.saveNote
* 切换笔记：通过 Repository.getNote 加载

```ts
// 切换笔记
const note = await repository.getNote(id)
editor.commands.setContent(note.content)
```

---

## 📦 切换笔记策略

* 切换前：立即保存当前 note（非 debounce）
* 切换后：立即加载（优先本地）
* 不显示 loading

---

## 💥 崩溃恢复

* 每次输入后保存到 IndexedDB
* 页面刷新自动恢复

目标：

即使浏览器崩溃，也不丢内容

---

## ⚡ 性能优化策略

### 必须：

* 不全量 render
* 不深层 state
* 不频繁 setState

---

### 技术手段：

* debounce（300ms）
* requestIdleCallback（后台任务）
* 虚拟滚动（长文）

---

## 🧪 验收标准（必须满足）

* 打字 10 分钟无卡顿
* 光标稳定
* 无明显 reflow
* 切笔记无 loading

---

## ❗ 常见错误（必须避免）

* ❌ 在 onUpdate 中 setState
* ❌ 输入时访问数据库
* ❌ 使用 React 控制编辑器内容
* ❌ 全量 Markdown 解析
* ❌ 频繁创建 Editor 实例

---

## 🧭 设计哲学

编辑器不是"组件"，而是：

> 一个高优先级的实时系统

如果输入体验被破坏：

👉 其他所有功能都没有意义

---

## 🏗️ Phase 1 工程结构约束

Phase 1 专用工程结构，必须严格遵守：

```
apps/web/src/
├── editor/          # ⭐ 实时系统（不能被污染）
│   ├── setup.ts     # TipTap 初始化
│   ├── events.ts    # onUpdate / debounce
│   └── markdown.ts  # 渐隐逻辑
├── data/            # 后台系统（IndexedDB + Repository）
│   ├── db.ts
│   ├── repository.ts
│   └── note.ts
└── ui/              # 薄壳（渲染 + 挂载）
    ├── EditorView.tsx
    └── App.tsx
```

### 核心原则

**editor 是独立系统**

- 不依赖 store
- 不依赖 API
- 作为实时系统独立运行
- 输入期间不被任何操作污染

**data 是后台系统**

- IndexedDB + Repository
- 允许慢（debounce 300ms）
- 不阻塞输入

**ui 是壳**

- 只负责渲染和挂载
- 不参与逻辑
- 保持最小化

### 禁止在 Phase 1 创建

```
packages/ ❌
apps/api/ ❌
sync/ ❌
tag/ ❌
search/ ❌
store/ ❌
```

### 文档映射

```
docs/EDITOR.md  ↔ src/editor/
docs/DATA.md    ↔ src/data/
```

确保文档不会变废纸。
