# Bear 桌面端设计系统

## 1. 设计定位

本设计系统基于当前项目中的 `Info.plist`、主题文件、字体资源、本地化资源，以及《分析报告》《拆解报告》《策略报告》《可行性分析报告》归纳而成。目标是为 Bear 类 Markdown 笔记产品建立一套可复用、可扩展、适合 macOS 的视觉与交互规范。

### 1.1 产品关键词

- **专注写作**：界面服务于长文本输入、Markdown 编辑、导出与阅读。
- **轻量组织**：以标签、搜索、笔记列表、反向链接、目录、统计信息组织内容。
- **本地优先**：强调数据安全、加密、备份、iCloud 同步和系统级集成。
- **多主题表达**：内置大量浅色、深色、高对比度主题，允许用户按阅读环境切换。
- **macOS 原生感**：遵循 AppKit/SwiftUI 桌面应用习惯，工具栏、侧边栏、菜单、偏好设置均应贴近系统范式。

### 1.2 设计原则

1. **文字优先**：视觉层级围绕标题、正文、代码、标签、链接和注释建立，不用装饰性元素争夺注意力。
2. **安静但清晰**：默认界面低饱和、低对比背景，交互状态和关键动作才使用强调色。
3. **结构不打断写作**：侧边栏和列表承担导航，编辑器区域保持开阔、稳定、少干扰。
4. **主题即 token**：所有颜色、字体、间距和状态都通过语义 token 管理，避免组件直接绑定固定色值。
5. **可访问阅读**：保留 OpenDyslexic、等宽字体、高对比主题、键盘导航和 VoiceOver 标注。

## 2. 信息架构

### 2.1 主界面结构

推荐三栏桌面布局：

| 区域 | 作用 | 典型内容 | 宽度建议 |
| --- | --- | --- | --- |
| 侧边栏 | 全局导航与标签树 | 全部笔记、今日、未归档、废纸篓、标签分组 | 220-280 |
| 笔记列表 | 当前范围内的笔记集合 | 标题、摘要、日期、置顶、附件/加密标记 | 300-380 |
| 编辑器 | 内容创作与阅读 | Markdown 正文、附件、表格、代码块、任务列表 | 自适应，最小 520 |

### 2.2 辅助面板

- **目录面板**：展示当前笔记标题层级，适合长文。
- **统计面板**：字数、字符数、阅读时间、创建/修改时间。
- **反向链接面板**：列出引用当前笔记的其他笔记。
- **导出面板**：PDF、HTML、DOCX、JPG、Markdown、TextBundle、Evernote 等格式。
- **偏好设置**：通用、编辑器、同步、主题、图标、订阅、安全。

## 3. 设计 Token

### 3.1 语义色彩

色彩必须以语义命名，组件不得直接引用主题文件中的具体 hex。

| Token | 用途 | 默认浅色参考 | 深色参考 |
| --- | --- | --- | --- |
| `color.text.primary` | 正文、主要标题 | `#000000` | `#9aa5ce` |
| `color.text.secondary` | 摘要、日期、说明文字 | `#757375` | `#646E9D` |
| `color.text.tertiary` | 占位、弱提示 | `#908d92` | `#414868` |
| `color.bg.primary` | 编辑器主背景 | `#fbfafc` | `#24283b` |
| `color.bg.secondary` | 列表选中、代码块、附件底 | `#F1F2F4` | `#292E47` |
| `color.bg.tertiary` | 分隔、禁用底、弱块面 | `#E4E5E6` | `#3A4062` |
| `color.stroke.default` | 边框、表格线 | `#E0E0E3` | `#1A1C28` |
| `color.accent` | 光标、置顶、主强调 | `#7f7f7f` | `#9ece6a` |
| `color.link` | 链接、WikiLink | `#50708b` | `#bb9af7` |
| `color.selection.active` | 文本选择 | `#D3E6FB` | `#4B538A` |
| `color.highlight` | 高亮文本 | `#feff53` | `#565f89` |
| `color.search` | 搜索命中 | `#d2eecb` | `#e0af68` |
| `color.danger` | 删除、永久移除、同步失败 | `#C33A2C` | `#ff6b6b` |
| `color.success` | 同步完成、任务完成 | `#2F7D32` | `#9ece6a` |
| `color.warning` | 网络、签名、安全提醒 | `#B36B00` | `#e0af68` |

### 3.2 侧边栏色彩

| Token | 用途 | 默认浅色参考 |
| --- | --- | --- |
| `color.sidebar.bg` | 侧边栏背景 | `#e7e8ea` |
| `color.sidebar.text` | 标签和导航文字 | `#68686B` |
| `color.sidebar.icon` | 默认图标 | `#687f9c` |
| `color.sidebar.selected.bg` | 选中项背景 | `#8F959F` |
| `color.sidebar.selected.text` | 选中项文字/图标 | `#ffffff` |
| `color.sidebar.stroke` | 侧边栏边界 | `#CBCCCE` |

### 3.3 Markdown 语义色

| Token | 用途 | 默认参考 |
| --- | --- | --- |
| `color.markdown.heading` | H1-H6 | `color.text.primary` |
| `color.markdown.marker` | `#`、`*`、列表符号 | `#c7c7c7` |
| `color.markdown.task.border` | 未完成任务框 | `#c7c7c7` |
| `color.markdown.tag.bg` | 标签胶囊背景 | `#949394` |
| `color.markdown.tag.text` | 标签文字 | `#ffffff` |
| `color.markdown.code.bg` | 行内代码/代码块背景 | `color.bg.secondary` |
| `color.markdown.code.border` | 代码块边框 | `color.text.tertiary` |
| `color.markdown.table.border` | 表格边框 | `color.stroke.default` |

### 3.4 间距

使用 4pt 基础网格，桌面界面优先紧凑、可扫读。

| Token | 值 | 用途 |
| --- | --- | --- |
| `space.1` | 4 | 图标与文本间距、细小内边距 |
| `space.2` | 8 | 列表项内部、按钮水平内边距 |
| `space.3` | 12 | 表单行距、菜单分组 |
| `space.4` | 16 | 面板内边距、编辑器左右基础留白 |
| `space.6` | 24 | 设置区块、空状态内容间距 |
| `space.8` | 32 | 编辑器宽屏左右留白 |

### 3.5 圆角与描边

| Token | 值 | 用途 |
| --- | --- | --- |
| `radius.xs` | 3 | 代码、标签、搜索命中 |
| `radius.sm` | 5 | 列表选中项、输入框 |
| `radius.md` | 8 | 附件、弹出面板、卡片 |
| `stroke.hairline` | 1 | 分隔线、表格线、工具栏底线 |

卡片圆角不超过 8pt。主界面不使用嵌套卡片，避免把写作工具做成营销页式界面。

## 4. 字体与排版

### 4.1 字体家族

项目内置字体显示产品非常重视排版：

| 用途 | 字体 |
| --- | --- |
| UI 与正文默认 | `BearSansUI-Regular` |
| UI 中等权重 | `BearSansUI-Medium` |
| UI 加粗 | `BearSansUI-Bold` |
| 标题 | `BearSansUIHeading-Regular` / `BearSansUIHeading-Bold` |
| 代码 | `RobotoMono-Regular` |
| 阅读障碍友好模式 | `OpenDyslexic` / `OpenDyslexicMono` |
| 系统回退 | `-apple-system`, `BlinkMacSystemFont`, `PingFang SC`, `Helvetica Neue`, `Arial` |

### 4.2 字号

| Token | 大小 | 行高 | 用途 |
| --- | --- | --- | --- |
| `font.caption` | 11 | 16 | 次级标签、状态提示 |
| `font.meta` | 12 | 18 | 日期、计数、侧栏辅助信息 |
| `font.ui` | 13 | 20 | 菜单、按钮、列表摘要 |
| `font.body` | 15 | 22.5 | 编辑器正文默认 |
| `font.body.large` | 17 | 26 | 阅读模式正文 |
| `font.h6` | 16 | 22 | 六级标题 |
| `font.h5` | 18 | 24 | 五级标题 |
| `font.h4` | 20 | 28 | 四级标题 |
| `font.h3` | 23 | 31 | 三级标题 |
| `font.h2` | 26 | 34 | 二级标题 |
| `font.h1` | 29 | 38 | 一级标题 |

主题文件中编辑器正文默认 `15`，行高倍率 `1.5`，标题 modular scale `1.125`。实现时允许用户在设置中调整正文大小、行宽和段落间距。

### 4.3 编辑器排版

- 正文行宽默认控制在 `68-76ch`，宽屏居中。
- 段落间距默认 `0.6em-0.9em`，不使用过大的文章页留白。
- 标题上方留白大于下方留白，保持文档结构清楚。
- Markdown 符号可显示/隐藏；隐藏时仍保留可编辑锚点和键盘行为。
- 代码块使用等宽字体，背景弱于正文但边界清晰。

## 5. 核心组件

### 5.1 侧边栏导航项

结构：

- 图标：16x16，左对齐。
- 文本：`font.ui`，单行截断。
- 计数：右侧，`font.caption`，弱化。
- 选中态：整行背景填充 `color.sidebar.selected.bg`，文字和图标切换为 `color.sidebar.selected.text`。
- Hover：使用比背景深/浅一级的弱底色，不改变布局尺寸。

适用对象：全部笔记、未归档、今日、归档、废纸篓、标签组、智能筛选。

### 5.2 标签树

- 支持层级缩进，每级增加 `16pt`。
- 展开/收起使用系统 disclosure 图标。
- 标签可带颜色点或图标，但默认保持克制。
- 删除标签属于高风险操作，必须二次确认，并提示子标签影响。

### 5.3 笔记列表项

内容结构：

| 元素 | 样式 |
| --- | --- |
| 标题 | `font.ui` 或 `font.body`，主文本色，最多 2 行 |
| 摘要 | `font.meta`，次级文本色，最多 2 行 |
| 日期 | `font.caption`，次级文本色 |
| 状态图标 | 置顶、附件、加密、同步失败，16x16 |

状态：

- 默认：透明背景。
- Hover：`color.bg.secondary`。
- 选中：`color.bg.secondary` 或主题选中色。
- 多选：显示选中数量，并保持批量操作工具栏可见。

### 5.4 编辑器

编辑器是核心组件，必须优先保证输入稳定性。

- 光标颜色使用 `color.accent`。
- 当前文本选择使用 `color.selection.active`。
- 非活动窗口选择使用 `color.selection.inactive`。
- 链接使用 `color.link`，Hover 时出现编辑、复制、打开菜单。
- 图片、PDF、地图、文件附件使用独立附件块，背景 `color.bg.secondary`，圆角 `radius.md`。
- 表格提供行列增删、复制、删除等单元格操作。
- 任务列表使用可点击 checkbox，完成态文字弱化，可选删除线。

### 5.5 Markdown 元素

| 元素 | 规范 |
| --- | --- |
| 标题 | 使用 Heading 字体，保留结构间距，不能像正文一样密集 |
| 引用 | 左侧 3pt 强调线，背景不强制上色 |
| 行内代码 | 等宽字体，浅底，圆角 3pt |
| 代码块 | 等宽字体，弱底，支持复制代码按钮 |
| 高亮 | 使用 `color.highlight`，深色主题下避免刺眼黄 |
| 标签 | 胶囊形，但圆角克制；可点击进入标签筛选 |
| 分割线 | 1pt 中性线，左右不贴边 |
| 表格 | 表头弱强调，隔行底色可选 |

### 5.6 工具栏

- 工具栏图标优先使用系统或 SF Symbols 风格，尺寸 16-20。
- 常用动作：新建、搜索、同步状态、导出、信息、更多。
- 编辑工具条可包含：标题级别、粗体、斜体、链接、代码、任务、表格、附件。
- 按钮使用图标按钮；复杂命令可用图标加短文本。
- Hover/Pressed/Disabled 必须有明确状态，但不改变按钮尺寸。

### 5.7 搜索

- 搜索框位于侧边栏或笔记列表顶部。
- 输入后即时过滤笔记列表，编辑器中命中项用 `color.search`。
- 支持搜索范围：全部、当前标签、当前笔记。
- 空结果显示简短文案和可执行下一步，不使用大面积插画。

### 5.8 设置窗口

设置遵循 macOS 偏好设置形态：

- 顶部 Tab：通用、编辑器、同步、主题、图标、订阅、安全。
- 表单标签右对齐，控件左对齐。
- 二元设置使用 checkbox/toggle。
- 数值设置使用 stepper、slider 或输入框。
- 字体、主题、导出格式使用 pop-up menu。
- 危险操作独立分区，使用明确警示文案。

## 6. 状态系统

### 6.1 通用状态

| 状态 | 表现 |
| --- | --- |
| Default | 中性背景与主文本 |
| Hover | 弱背景或图标强调 |
| Pressed | 背景加深，图标/文字保持清晰 |
| Focus | 使用系统焦点环或 `color.accent` 外描边 |
| Selected | 填充选中背景，保证文字对比度 |
| Disabled | 透明度降低，不只依赖颜色区分 |
| Loading | 小型 progress indicator，保留布局 |
| Error | `color.danger` + 说明文本 + 恢复动作 |

### 6.2 同步状态

| 状态 | 文案示例 | 表现 |
| --- | --- | --- |
| 已同步 | 已同步 | 绿色或中性完成图标 |
| 同步中 | 正在同步... | 旋转/进度图标 |
| 离线 | 离线，稍后同步 | 警示色弱提示 |
| 冲突 | 发现同步冲突 | 警示色 + 查看详情 |
| 失败 | 同步失败，重试 | 危险色 + 重试按钮 |

### 6.3 安全状态

- 加密笔记：列表项显示锁图标，正文解锁前显示安全占位。
- 启动锁定：登录后进入模糊或遮罩状态，必须输入密码/系统认证。
- 删除/清空废纸篓：必须显示不可撤销风险。
- 签名/网络安全提醒：使用警示色，避免恐吓式文案。

## 7. 主题系统

### 7.1 主题策略

项目内置 30+ 主题，包括 `D.Boring`、`Tokyo Night`、`Nord`、`Dracula`、`Solarized`、`High Contrast`、`Charcoal`、`Notes`、`Print` 等。主题系统应遵循：

- 每个主题必须提供 base、sidebar、notes、editor 四类 token。
- 深色主题不能只反转颜色，需要重新定义搜索、高亮、选择、代码语法色。
- 高对比主题必须满足正文对比度 WCAG AA，关键 UI 尽量达到 AAA。
- 打印主题以白底黑字为主，隐藏非必要 UI。
- 图标可随主题切换，例如默认图标与 Charcoal 图标。

### 7.2 主题文件结构建议

```json
{
  "base": {},
  "sidebar": {},
  "notes": {},
  "editor": {
    "headers": {},
    "code": {
      "syntaxHighlight": {}
    },
    "task": {},
    "tag": {},
    "table": {}
  }
}
```

### 7.3 主题验收

- 正文、标题、链接、代码、标签、搜索命中都可读。
- 选中态与 hover 态在浅色/深色下都可分辨。
- 当前笔记、当前标签、当前搜索范围不能只靠颜色表达。
- 导出/打印模式不继承过深背景。

## 8. 图标与视觉资产

### 8.1 图标

- 使用 16、20、24 三档尺寸。
- 线性图标为主，粗细与 SF Symbols Regular 接近。
- 图标必须提供无障碍标签。
- 常用图标：新建、搜索、标签、归档、废纸篓、锁、附件、置顶、导出、同步、信息、更多。

### 8.2 应用图标与文档图标

现有包声明了主图标 `AppIcon`、替代图标 `AppIcon Charcoal`、文档图标 `Bear Document`。设计延展时：

- 主图标用于品牌识别，不在界面中过度重复。
- 文档图标用于 `.bear`、备份、Spotlight 结果和 Quick Look。
- 深色主题可匹配 Charcoal 图标，但不能影响文件识别度。

## 9. 文案规范

### 9.1 语气

- 简洁、具体、可操作。
- 写作与同步场景保持温和，不制造压力。
- 危险操作清楚说明后果。
- 中文使用自然界面语，不直译英文结构。

### 9.2 按钮文案

| 类型 | 推荐 |
| --- | --- |
| 主动作 | 新建笔记、导出、同步、订阅 |
| 次动作 | 取消、稍后、恢复默认值 |
| 危险动作 | 删除、永久删除、清空废纸篓 |
| 状态动作 | 重试、查看详情、管理订阅 |

### 9.3 空状态

空状态结构：

1. 一句说明当前为空。
2. 一个最合适的动作。
3. 可选的轻提示。

示例：

- 当前标签下还没有笔记。
- 新建笔记
- 也可以把已有笔记拖到这个标签。

## 10. 可访问性

- 所有图标按钮必须有 `accessibilityLabel`，必要时添加 `accessibilityHelp`。
- 支持键盘导航：侧边栏、笔记列表、编辑器、搜索、设置窗口。
- 支持 VoiceOver 读出笔记标题、状态、同步结果、加密状态。
- 颜色对比：正文与背景不低于 4.5:1；大标题不低于 3:1。
- 不仅依赖颜色表达状态，需结合图标、文字或位置。
- 提供 OpenDyslexic 字体选项。
- 动画应短、轻，尊重系统“减少动态效果”设置。

## 11. 平台与系统集成

### 11.1 macOS 行为

- 支持系统深色模式，但允许用户覆盖主题。
- 支持菜单栏命令和快捷键。
- 支持 Services：发送文本、RTF、RTFD、文件、URL 到 Bear。
- 支持 Spotlight、Quick Look、Safari Extension、Widget、Siri Shortcuts。
- 支持拖拽导入文件和附件。

### 11.2 文件类型

界面中涉及导入/导出时，应清楚区分：

- Bear Note：`.bear`
- Bear Backup：`.bear2bk`、`.bearbk`
- TextBundle：`.textbundle`
- 标准文本：Markdown、纯文本、RTFD
- 图片和通用文件附件

## 12. 实施建议

### 12.1 Token 命名

建议在代码层建立：

```swift
enum DesignColor {
    static let textPrimary = Color("text.primary")
    static let backgroundPrimary = Color("bg.primary")
    static let accent = Color("accent")
    static let link = Color("link")
}
```

主题切换时只替换 token 映射，不改组件样式。

### 12.2 组件优先级

第一阶段：

- 侧边栏导航项
- 笔记列表项
- 编辑器 Markdown 元素
- 搜索框
- 工具栏图标按钮
- 设置表单行

第二阶段：

- 导出面板
- 统计/目录/反向链接面板
- 加密解锁面板
- 主题选择器
- 小组件配置界面

### 12.3 设计验收清单

- 三栏布局在 1280px 宽度下可用。
- 编辑器正文行宽稳定，输入时无布局跳动。
- 浅色、深色、高对比主题均完成视觉检查。
- 选中、hover、focus、disabled、error 状态完整。
- 搜索命中和文本选择在所有主题中可读。
- 所有图标按钮都有可访问名称。
- 中文、英文、德文等较长文本不会溢出按钮或列表项。
- 导出、删除、同步失败、加密解锁等关键流程有清楚反馈。

## 13. 项目证据

本设计系统主要依据以下项目文件：

- `Info.plist`：应用元数据、文档类型、URL Scheme、Services、Intent、系统要求。
- `Resources/*.otf`、`Resources/*.ttf`：BearSansUI、BearSansUIHeading、OpenDyslexic、RobotoMono。
- `Frameworks/BearCore.framework/Versions/A/Resources/*.theme`：多主题色彩 token。
- `Resources/zh-Hans.lproj/Preferences.strings`：设置项、本地化与无障碍说明。
- `分析报告.md`、`拆解报告.md`、`策略报告.md`、`可行性分析报告.md`：产品定位、技术架构、安全与功能范围。
