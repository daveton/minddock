# 架构说明

## 当前产品表面

当前 UI 刻意保持扁平：

```text
main.tsx
  -> WorkspaceViewFixed.tsx
  -> styles.css
```

这样做的目的，是让原型容易理解、容易修改，并避免未使用的组件抽象继续拖慢产品迭代。

## 保留的本地优先基础

本地优先编辑器基础仍然保留，供下一轮接入真实功能：

```text
ui/EditorView.tsx
  -> editor/setup.ts
  -> editor/events.ts
  -> data/repository.ts
  -> data/db.ts
```

重新接入时必须遵守：

- 不在 `keydown -> transaction` 输入关键路径中访问存储。
- 保存动作放在 debounce 后，或发生在明确的笔记切换动作中。
- Repository 是唯一持久化边界。
- UI 状态和 Editor 状态保持隔离。

## 当前取舍

当前应用优先保留一个干净、可运行、可展示的产品界面，而不是保留多个半集成的旧版本。下一步应谨慎把真实编辑和数据能力接回来，而不是重新堆出新的实验分支。
