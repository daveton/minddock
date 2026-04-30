# MindDock 文档结构规划

## 1. 阅读顺序（建议）

1. `README.md`：项目概览与快速入口
2. `docs/CONSTRAINTS.md`：硬性约束（最高优先级）
3. `docs/ROADMAP.md`：阶段规划与 Gate
4. `docs/ISSUES_AND_MILESTONES.md`：里程碑与问题跟踪（合并文档）
5. `docs/PRODUCT.md`：用户价值与场景定义
6. `docs/UIUX.md`：界面与交互规范
7. `docs/DESIGN.md`：系统设计
8. `docs/EDITOR.md`：编辑器实时系统细节
9. `docs/DATA.md`：数据层与存储策略
10. `docs/FAILURE_MODES.md`：失败路径、降级策略与恢复语义
11. `docs/PERF_PLAN.md`：性能口径、测试场景与验收方案
12. `docs/FEASIBILITY.md`：可行性与风险评估

---

## 2. 文档职责分层

- **README**：面向新读者，说明“做什么”。
- **CONSTRAINTS**：面向全体开发，说明“哪些不能做”。
- **ROADMAP**：面向执行管理，说明“先做什么，何时算完成”。
- **ISSUES_AND_MILESTONES**：面向里程碑管理与任务执行，说明“阶段验收标准、依赖关系、具体问题、优先级与完成状态”。
- **PRODUCT**：面向产品决策，说明“用户为什么会持续使用”。
- **UIUX**：面向体验落地，说明“用户如何感知系统质量”。
- **DESIGN/EDITOR/DATA**：面向实现，说明“怎么做”。
- **FAILURE_MODES**：面向可靠性设计，说明“失败时如何表现与恢复”。
- **PERF_PLAN**：面向验证，说明“如何证明系统真的达标”。
- **FEASIBILITY**：面向决策，说明“为什么这样做可行”。

---

## 3. 维护规则

- 后续所有任务默认必须对齐项目目标、核心原则与 `docs/CONSTRAINTS.md` 的硬约束。
- 若实现便利性与项目目标冲突，以目标、原则、约束为准。
- 若新增功能影响核心体验，需同步更新 `CONSTRAINTS.md` 与 `ROADMAP.md`。
- 若新增阶段目标，需先补 Gate，再写实现方案。
- 若实现状态发生明显变化，需同步更新 `README.md` 的“快速开始 / 当前代码结构 / 当前验证重点”。
- 若文档冲突，优先级：`CONSTRAINTS` > `ROADMAP` > `PRODUCT` > `UIUX` > `DESIGN/EDITOR/DATA` > `README`。
- **禁止删除项目的目标、原则和约束，只能补充或优化表述。**
