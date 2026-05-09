# 项目状态

## 当前状态

MindDock 现在是一个本地优先的 Bear 风格 Web 工作台，并且只保留一个当前生效的 UI 表面。

当前应用路径：

- `apps/web/src/main.tsx`
- `apps/web/src/components/WorkspaceViewFixed.tsx`
- `apps/web/src/styles.css`

保留的基础能力：

- `apps/web/src/data`：IndexedDB、Repository、多标签页同步辅助。
- `apps/web/src/editor`：TipTap 初始化、编辑器事件绑定、task item、inline tag。
- `apps/web/src/ui/EditorView.tsx`：旧编辑器壳，作为后续接回真实编辑能力的参考实现。

当前已接入：

- TipTap / ProseMirror 编辑器运行在当前工作台。
- 300ms debounce 本地保存。
- IndexedDB documents、snapshots、operations、block index。
- 标题来自正文第一个 heading，`title` 是派生缓存。
- 标签来自正文 inline tag token 或普通 `#tag/path` 文本。
- Sidebar tree 由 tag index 动态派生，不存在真实 folder。
- 在当前 tag 目录中新建文档时，会自动把该 tag 写入新文档正文。
- 鼠标进入 tag 内部后可直接编辑 tag 文本，左侧树会根据保存后的标签路径同步变化。
- 删除 tag 后，文档会从对应目录移出；没有 tag 的文档归为无目录语义。
- 侧栏、笔记列表、编辑主区域和右侧上下文栏共享 viewport 约束；拖拽栏宽只按鼠标增量更新，并保留各栏最小可用宽度。
- 顶部 `BIU` 按钮控制底部编辑功能区显示/隐藏；导出、资料包和数据检查收敛到右上角更多菜单。
- 设置面板按系统设置模型组织为通用、格式、主题、图标、同步。

已经移除：

- 未使用的 `WorkspaceView*` 实验版本。
- 依赖 Tailwind 风格类名、但当前项目未实际使用的旧组件库。
- Vite 和 TypeScript 生成文件。
- 重复规划文档、临时测试文档和报告文件。

## 验证结果

`npm run build` 已通过。

最近一次生产构建输出（以本机 `apps/web` 构建为准）：

- HTML：0.40 kB
- CSS：约 27 kB，gzip 约 6 kB
- JS：约 500 kB，gzip 约 156 kB

## 当前工程健康

- 当前产品界面仍集中在一个主组件中，便于快速迭代，但已经接近需要拆分的边界。
- 下一轮重构优先级：`PreferencesPanel`、`EditorToolbar`、`MoreMenu`、`SidebarTree`、`NoteList`。
- 拆分必须保持输入关键路径不变：TipTap transaction 不经过 React 状态，不在 keydown 路径访问 Repository。
- UI 像素约束：桌面端任一栏拖拽后不得把其他栏挤出窗口；固定格式工具条不能遮挡正文主要输入区域；弹层必须有明确锚点和可预期关闭路径。

## 下一步

1. 补充中文 IME、tag 编辑、删除、粘贴、undo/redo 的聚焦测试。
2. 完善无标签文档入口和当前目录新建文档的视觉反馈。
3. 把当前巨型主组件拆成稳定小组件，先拆 UI 面板，不触碰编辑器保存路径。
4. 将 tag index 从内存派生升级为持久化/可查询索引，同时保持 Markdown 为真源。
5. 加强 crash recovery、selection/scroll 恢复、多标签页行为验证。
6. 在本地编辑闭环稳定后，再把占位 AI 操作替换为基于 Markdown / AST 的真实命令行为。
