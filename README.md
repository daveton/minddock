# MindDock

MindDock 是一个本地优先的 AI 知识工作台原型，核心方向是「块级 Hybrid Markdown 编辑器」。

它不是 textarea 笔记应用，而是基于编辑器内核处理 Markdown 结构、富文本渲染和语义块分析。当前项目刻意保持很小：一个清晰的 React 工作台界面、一份主样式文件，以及保留下来的本地优先数据层和 TipTap 编辑器基础，方便下一步继续接回真实笔记能力。

产品目标不是“最强编辑器”，而是「最懂用户思维结构的编辑器」：结构化输入、安静阅读、AI 理解、跨端一致。

## 当前结构

- `apps/web/src/main.tsx`：应用入口。
- `apps/web/src/components/WorkspaceViewFixed.tsx`：当前桌面端和移动端工作台界面。
- `apps/web/src/styles.css`：当前生效的产品样式。
- `apps/web/src/data`：IndexedDB、Repository 和多标签页同步基础。
- `apps/web/src/editor`、`apps/web/src/ui/EditorView.tsx`：TipTap 编辑器基础，后续用于重新接入真实编辑能力。
- `apps/desktop`：Tauri 桌面壳，负责 macOS `.app` / `.dmg`、原生能力和发布流程。

## 核心原则

- 输入路径必须快。
- 本地优先，不提前把同步复杂度引入核心体验。
- 不自研编辑器内核，基于 TipTap / ProseMirror 做自己的 UI/UX。
- 面向 Hybrid Markdown：用户能感知 Markdown 结构，但视觉上接近排版结果。
- 数据优先保存 Markdown 或结构化 JSON，不保存 HTML 作为主数据。
- 保留一个明确的产品表面，删除无用实验分支。
- 新功能必须强化写作、阅读、研究这条主循环。

## 快速开始

```bash
cd apps/web
npm install
npm run dev
```

构建：

```bash
cd apps/web
npm run build
```

桌面开发：

```bash
cd apps/desktop
npm install
npm run dev
```

桌面打包：

```bash
cd apps/desktop
npm run build
```

## 文档

- `docs/CONSTRAINTS.md`：硬性工程约束。
- `docs/AI_NATIVE_EDITOR.md`：AI Native Markdown 编辑器最佳实践。
- `docs/PROJECT_STATUS.md`：当前状态和下一步工作。
- `docs/ROADMAP.md`：阶段路线图。
- `docs/ARCHITECTURE.md`：实现边界和架构取舍。
- `docs/DESKTOP_APP.md`：Tauri、SQLite、Markdown Folder 和 Release 路线。

根据 Bear 的设计逻辑和你现有的应用方向（Web + Desktop + Local-First 编辑器），可以梳理出一套 **核心快捷键体系**，分为几大类：编辑器操作、笔记管理、导航、UI 控制、辅助功能。这里参考 Bear macOS 版行为，并结合 Web/Desktop 可实现性。

---

# 一、编辑器操作

| 功能               | Windows / Linux             | macOS                     | 说明                                |
| ---------------- | --------------------------- | ------------------------- | --------------------------------- |
| **新建笔记**         | Ctrl + N                    | Cmd + N                   | 新建一篇笔记，焦点自动在标题                    |
| **删除笔记**         | Ctrl + Backspace            | Cmd + Backspace           | 删除当前笔记，弹出确认                       |
| **切换笔记**         | Ctrl + ↑ / ↓                | Cmd + ↑ / ↓               | 上下切换 Note List 的笔记                |
| **保存**           | Ctrl + S                    | Cmd + S                   | 手动保存（IndexedDB + snapshot + 本地文件） |
| **撤销 / 重做**      | Ctrl + Z / Ctrl + Shift + Z | Cmd + Z / Cmd + Shift + Z | 编辑器内 Undo / Redo                  |
| **加粗 / 斜体 / 代码** | Ctrl + B / I / `            | Cmd + B / I / `           | Markdown 快捷输入                     |
| **标题**           | Ctrl + 1~6                  | Cmd + 1~6                 | Markdown heading (# ~ ######)     |
| **引用 / 列表**      | Ctrl + Shift + > / Ctrl + L | Cmd + Shift + > / Cmd + L | Markdown blockquote / list        |
| **查找**           | Ctrl + F                    | Cmd + F                   | 编辑器内搜索                            |
| **跳转行**          | Ctrl + G                    | Cmd + G                   | 跳转到某行                             |

---

# 二、笔记管理 / 导航

| 功能                   | Windows / Linux  | macOS            | 说明                      |
| -------------------- | ---------------- | ---------------- | ----------------------- |
| **搜索笔记**             | Ctrl + P         | Cmd + P          | 打开全局搜索框                 |
| **打开 Tag / 目录树**     | Ctrl + T         | Cmd + T          | 快速过滤笔记                  |
| **收藏 / 取消收藏**        | Ctrl + D         | Cmd + D          | 设置笔记为 Favorite          |
| **归档 / 恢复**          | Ctrl + Shift + A | Cmd + Shift + A  | Archive / Restore       |
| **切换 Sidebar 显示**    | Ctrl + \         | Cmd + \          | 显示/隐藏 Sidebar           |
| **切换 Context Panel** | Ctrl + Shift + C | Cmd + Shift + C  | 显示/隐藏 Context Panel     |
| **切换 Focus Mode**    | Ctrl + Alt + F   | Cmd + Option + F | 专注模式，隐藏 Sidebar/Context |

---

# 三、布局与窗口控制（Desktop 特有）

| 功能                  | Windows / Linux | macOS          | 说明                                   |
| ------------------- | --------------- | -------------- | ------------------------------------ |
| **全屏 / 离焦模式**       | F11 / Ctrl + M  | Cmd + Ctrl + F | 全屏模式，隐藏浏览器栏                          |
| **调整 Sidebar 宽度**   | Alt + 鼠标拖       | Option + 鼠标拖   | 支持拖拽调整宽度                             |
| **调整 Note List 宽度** | Alt + 鼠标拖       | Option + 鼠标拖   | 同上                                   |
| **打开设置面板**          | Ctrl + ,        | Cmd + ,        | 打开 Editor / Appearance / Behavior 设置 |

---

# 四、块级操作（Block-level）

| 功能           | Windows / Linux      | macOS               | 说明                                    |
| ------------ | -------------------- | ------------------- | ------------------------------------- |
| **移动块**      | Ctrl + Shift + ↑ / ↓ | Cmd + Shift + ↑ / ↓ | 上下移动选中块                               |
| **折叠 / 展开块** | Ctrl + - / +         | Cmd + - / +         | Block collapse / expand               |
| **复制 / 剪切块** | Ctrl + C / X         | Cmd + C / X         | 复制或剪切选中块                              |
| **粘贴块**      | Ctrl + V             | Cmd + V             | 粘贴到光标处                                |
| **AI 操作块**   | Ctrl + Enter         | Cmd + Enter         | 调出 AI 功能弹窗（Summarize / Expand / Link） |

---

# 五、文件 / 导出快捷键

| 功能              | Windows / Linux  | macOS            | 说明                                                |
| --------------- | ---------------- | ---------------- | ------------------------------------------------- |
| **导出 Markdown** | Ctrl + Shift + E | Cmd + Shift + E  | 单篇笔记导出 Markdown                                   |
| **导出 Bundle**   | Ctrl + Alt + E   | Cmd + Option + E | 导出 Markdown + attachments + metadata + operations |
| **导入 Bundle**   | Ctrl + Shift + I | Cmd + Shift + I  | 从导入的 Bundle 重建数据库和 block                          |

---

# 六、设计原则

1. **一致性**：所有快捷键遵循 macOS / Windows 原生习惯。
2. **可组合**：块操作可在编辑器内嵌套组合。
3. **实时生效**：Focus Mode / Sidebar / Context 切换实时更新，无需刷新。
4. **可扩展**：未来可加 AI inline 操作快捷键、标签快速创建快捷键。
5. **辅助提示**：所有快捷键在菜单或悬浮提示显示（Tooltip / Shortcut Helper）。

---

如果你需要，我可以帮你生成一份**“MindDock Bear 风格快捷键全表”**，可以直接放在设置面板里供用户查阅，同时支持自定义快捷键映射。

你希望我帮你生成吗？
