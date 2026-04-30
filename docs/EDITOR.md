# Editor Design (MindDock)

编辑器是系统的核心。它是一个**实时系统（Real-time System）**，所有设计必须围绕输入流畅性展开。

本文同时描述：

- 规划层：编辑器必须守住的边界
- 实现层：当前最小骨架已经落地的行为

---

## 1. 核心目标

- 输入延迟 < 16ms（目标）
- 光标稳定
- 连续输入无卡顿
- 自动保存不打断写作

当前状态：

- 架构方向已落地
- 性能指标尚未正式实测

---

## 2. 输入模型

规划目标：

```text
Keyboard Input
 → TipTap Transaction
 → Minimal DOM Patch
```

当前实现对应 [setup.ts](/Users/daveton/Desktop/minddock/apps/web/src/editor/setup.ts:1) 和 [events.ts](/Users/daveton/Desktop/minddock/apps/web/src/editor/events.ts:1)：

- TipTap 独立挂载到 DOM 容器
- React 不控制编辑器内容
- `update` 事件只做 debounce 后保存

---

## 3. 输入阶段硬约束

在 `keydown → transaction` 期间，仍然禁止：

- 调用 Repository 持久化
- 访问 IndexedDB
- React / Zustand `setState`
- 网络请求
- Markdown 同步解析
- 搜索、标签等重计算

允许：

- TipTap transaction
- 最小 DOM patch

说明：

- 当前实现中的保存是挂在 `editor.on('update', debounce(..., 300))`
- 因为持久化动作被推迟到 debounce 后，所以不属于输入热路径本身

---

## 4. 当前最小编辑器架构

当前代码里的实际链路：

```text
Editor (TipTap)
 ↓
editor.on('update')
 ↓
debounce(300ms)
 ↓
saveCurrentNote(editor.getJSON())
```

对应实现：

- 编辑器创建：[setup.ts](/Users/daveton/Desktop/minddock/apps/web/src/editor/setup.ts:1)
- 事件绑定：[events.ts](/Users/daveton/Desktop/minddock/apps/web/src/editor/events.ts:1)
- 页面承载：[EditorView.tsx](/Users/daveton/Desktop/minddock/apps/web/src/ui/EditorView.tsx:1)

---

## 5. 当前已实现行为

截至当前最小骨架，编辑器层已经具备：

- TipTap 初始化
- 零 React 受控内容
- 300ms debounce 自动保存
- 初始内容恢复
- 最近活动 note 恢复
- note 切换前 flush
- note 切换后 `setContent`
- 保存状态反馈
- 在线 / 离线状态反馈

这意味着当前可以验证的不是“完整产品”，而是：

- 编辑器是否能保持独立运行
- 自动保存是否会污染输入体验
- 多 note 切换是否会破坏编辑流程

---

## 6. React 边界

当前页面使用了两种状态：

- `useRef`：保存 `Editor` 实例、状态 DOM 引用、活动 note id
- `useState`：驱动 note 列表和当前选中行的 UI 更新

这里的关键边界是：

- 输入内容本身不经过 React state
- React 只负责外围壳层 UI
- `editor.commands.setContent()` 由切换逻辑显式调用

现状判断：

- 这仍符合“编辑器是实时系统，React 是薄壳”的规划方向
- 但 `onSaved` 后刷新列表会触发外围 React 更新，后续需确认不会间接影响输入流畅性

---

## 7. 保存策略

当前实现：

- 输入后 300ms 触发保存
- 保存内容为完整 note JSON
- 保存目标为当前活动 note
- 保存成功后更新状态文案和 note 列表时间

切换场景下：

- 切换前先 `flushActiveNote()`
- flush 成功后再 `loadNote()`
- 切换失败则显示 `Save failed`

这部分已落地行为与 [EditorView.tsx](/Users/daveton/Desktop/minddock/apps/web/src/ui/EditorView.tsx:1) 保持一致。

---

## 8. 当前状态反馈

当前页面已实现两类轻量状态：

- 保存状态：`Saved` / `Saving locally` / `Save failed`
- 网络状态：`Offline-first / online` / `Offline editing`

另外已实现一条内联错误提示：

- 最近一次本地保存失败时，编辑区上方显示失败原因摘要

意义：

- 这是对 `docs/FAILURE_MODES.md` 和 `docs/UIUX.md` 的最小实现映射
- 仍是演示级别，不代表完整可靠性已验证

当前还没做的事：

- 保存失败后的重试入口
- 恢复完成后的明确提示
- 切换失败后的可操作选择

---

## 9. 切换策略

当前切换策略已经从规划进入实现：

```text
click note
 ↓
save current note immediately
 ↓
load target note
 ↓
editor.commands.setContent(next.content)
```

当前原则：

- 优先正确性，而不是绝对无感
- 切换前 flush 是必要步骤
- 失败时宁可显示错误，也不静默切换

这是 Phase 1 非常关键的行为，因为它直接决定“多 note 能否可靠工作”。

---

## 10. 当前未实现的编辑器能力

以下能力仍停留在规划层：

- Markdown 渐隐策略
- selection / active line 系统
- 光标滚动微调策略
- 大文档优化
- IME 场景验证
- 粘贴大文本性能验证
- 崩溃恢复专项验证

这些内容保留为后续阶段或后续细化项，不应先于输入稳定性验证。

---

## 11. 当前已知风险

1. `onSaved` 后刷新 note 列表会触发 React state 更新，需要确认不会影响长时间输入。
2. 切换 note 使用 `editor.commands.setContent()`，需后续确认在频繁切换时不会引入光标或历史问题。
3. 当前没有“正在切换”与“切换失败后保留上下文”的更细语义。
4. 当前无多 tab 协调，编辑器实例只在单窗口假设下工作。

---

## 12. 下一步建议

优先顺序建议：

1. 实测输入性能
2. 验证切换前 flush 是否稳定
3. 验证刷新恢复
4. 验证保存失败路径
5. 再考虑 Markdown 渐隐或复杂交互增强

结论：

当前最重要的不是增加编辑器功能，而是证明这套骨架在真实输入、切换、恢复场景下依然稳定。
