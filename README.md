# MindDock

MindDock 是一个本地优先的 AI 知识工作台原型。

当前项目刻意保持很小：一个清晰的 React 工作台界面、一份主样式文件，以及保留下来的本地优先数据层和编辑器基础，方便下一步继续接回真实笔记能力。

## 当前结构

- `apps/web/src/main.tsx`：应用入口。
- `apps/web/src/components/WorkspaceViewFixed.tsx`：当前桌面端和移动端工作台界面。
- `apps/web/src/styles.css`：当前生效的产品样式。
- `apps/web/src/data`：IndexedDB、Repository 和多标签页同步基础。
- `apps/web/src/editor`、`apps/web/src/ui/EditorView.tsx`：TipTap 编辑器基础，后续用于重新接入真实编辑能力。

## 核心原则

- 输入路径必须快。
- 本地优先，不提前把同步复杂度引入核心体验。
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

## 文档

- `docs/CONSTRAINTS.md`：硬性工程约束。
- `docs/PROJECT_STATUS.md`：当前状态和下一步工作。
- `docs/ROADMAP.md`：阶段路线图。
- `docs/ARCHITECTURE.md`：实现边界和架构取舍。
