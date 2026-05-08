# 项目状态

## 当前状态

MindDock 现在是一个轻量 Web 原型，并且只保留一个当前生效的 UI 表面。

当前应用路径：

- `apps/web/src/main.tsx`
- `apps/web/src/components/WorkspaceViewFixed.tsx`
- `apps/web/src/styles.css`

保留的基础能力：

- `apps/web/src/data`：IndexedDB、Repository、多标签页同步辅助。
- `apps/web/src/editor`：TipTap 初始化和编辑器事件绑定。
- `apps/web/src/ui/EditorView.tsx`：旧编辑器壳，作为后续接回真实编辑能力的参考实现。

已经移除：

- 未使用的 `WorkspaceView*` 实验版本。
- 依赖 Tailwind 风格类名、但当前项目未实际使用的旧组件库。
- Vite 和 TypeScript 生成文件。
- 重复规划文档、临时测试文档和报告文件。

## 验证结果

`npm run build` 已通过。

最近一次生产构建输出：

- HTML：0.40 kB
- CSS：8.45 kB，gzip 2.16 kB
- JS：147.97 kB，gzip 48.59 kB

## 下一步

1. 把当前精修后的工作台接回 Hybrid Markdown 编辑器，而不是继续扩展静态 UI。
2. 基于 TipTap / ProseMirror 实现基础 Markdown input rules 和块级渲染。
3. 通过 `repository.ts` 接入本地数据，不把 React 状态更新放进输入 transaction 路径。
4. 补充中文 IME、保存、恢复、多标签页行为的聚焦测试。
5. 在本地编辑闭环稳定后，再把占位 AI 操作替换为基于 Markdown / AST 的真实命令行为。
