import { useCallback, useEffect, useMemo, useState } from 'react';

const notes = [
  {
    title: '剃发易服背后的心理统治',
    desc: '满洲统治者如何利用文化与身份重塑进行长期心理控制',
    time: '2h',
    active: true,
  },
  {
    title: '大清兴亡录：296 年帝国周期',
    desc: '从军事扩张到财政失衡的帝国生命周期',
    time: 'Yesterday',
  },
  {
    title: '皇太极的反间计',
    desc: '信息操控如何击溃明朝官僚系统',
    time: 'May 4',
  },
  {
    title: '红夷大炮与宁远之战',
    desc: '火器技术如何改变辽东战略格局',
    time: 'Apr 29',
  },
];

const spaces = ['Today', 'Research', 'Writing', 'History', 'AI', 'Design', 'Psychology'];
const chips = ['历史', 'AI', '设计', '心理学', '写作', '商业'];
const relatedNotes = ['八旗制度与组织控制', '明末文官系统为何崩溃', '满清如何重塑意识形态'];
const timeline = ['1644 清军入关', '1645 剃发令发布', '1646 江南反抗加剧', '1650 政策全面推行'];

const LAYOUT_STORAGE_KEY = 'minddock.workspace.layout.v1';
const SIDEBAR_DEFAULT = 256;
const LIST_DEFAULT = 320;
const SIDEBAR_MIN = 220;
const SIDEBAR_MAX = 320;
const LIST_MIN = 260;
const LIST_MAX = 420;

type WorkspaceLayout = {
  sidebarWidth: number;
  listWidth: number;
  contextOpen: boolean;
  focusMode: boolean;
  theme: 'light';
};

const defaultLayout: WorkspaceLayout = {
  sidebarWidth: SIDEBAR_DEFAULT,
  listWidth: LIST_DEFAULT,
  contextOpen: false,
  focusMode: false,
  theme: 'light',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function loadLayout(): WorkspaceLayout {
  if (typeof window === 'undefined') return defaultLayout;

  try {
    const saved = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!saved) return defaultLayout;
    const parsed = JSON.parse(saved) as Partial<WorkspaceLayout>;

    return {
      sidebarWidth: clamp(parsed.sidebarWidth ?? SIDEBAR_DEFAULT, SIDEBAR_MIN, SIDEBAR_MAX),
      listWidth: clamp(parsed.listWidth ?? LIST_DEFAULT, LIST_MIN, LIST_MAX),
      contextOpen: parsed.contextOpen ?? defaultLayout.contextOpen,
      focusMode: parsed.focusMode ?? defaultLayout.focusMode,
      theme: 'light',
    };
  } catch {
    return defaultLayout;
  }
}

function IconButton({
  label,
  children,
  dark = false,
  active = false,
  onClick,
}: {
  label: string;
  children: string;
  dark?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={`aw-icon-button ${dark ? 'aw-icon-button--dark' : ''} ${active ? 'is-active' : ''}`}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      title={label}
    >
      {children}
    </button>
  );
}

function ResizeHandle({ label, onDrag, onReset }: { label: string; onDrag: (delta: number) => void; onReset: () => void }) {
  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const startX = event.clientX;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        onDrag(moveEvent.clientX - startX);
      };

      const handlePointerUp = () => {
        document.body.classList.remove('aw-is-resizing');
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };

      document.body.classList.add('aw-is-resizing');
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [onDrag],
  );

  return (
    <button
      aria-label={label}
      className="aw-resize-handle"
      onDoubleClick={onReset}
      onPointerDown={handlePointerDown}
      title={`${label}，双击恢复默认宽度`}
    />
  );
}

function MobileWorkspace() {
  return (
    <div className="aw-mobile">
      <header className="aw-mobile-topbar">
        <div>
          <div className="aw-brand">Atlas</div>
          <div className="aw-muted">AI Knowledge</div>
        </div>
        <div className="aw-actions">
          <IconButton label="搜索">⌕</IconButton>
          <IconButton label="新建笔记" dark>+</IconButton>
        </div>
      </header>

      <main className="aw-mobile-scroll">
        <section className="aw-mobile-hero">
          <p className="aw-kicker">Personal research OS</p>
          <h1>AI 驱动的知识工作台</h1>
          <p>为阅读、研究、写作和 AI 协作准备的移动端知识空间。</p>
        </section>

        <section className="aw-command aw-command--mobile">
          <div>
            <span>AI Command</span>
            <strong>Ask AI anything about your notes</strong>
          </div>
          <button>搜索笔记、生成总结、建立关联...</button>
        </section>

        <nav className="aw-chip-row" aria-label="分类">
          {chips.map((chip, index) => (
            <button className={index === 0 ? 'is-active' : ''} key={chip}>{chip}</button>
          ))}
        </nav>

        <section className="aw-feed">
          {notes.slice(0, 3).map((note) => (
            <article className="aw-note-card" key={note.title}>
              <div className="aw-note-card__top">
                <h2>{note.title}</h2>
                <IconButton label="打开笔记">↗</IconButton>
              </div>
              <p>{note.desc}</p>
              <div className="aw-ai-summary">
                <span>AI Summary</span>
                <p>通过身份符号控制与文化重塑，逐渐完成对社会心理结构的长期塑造。</p>
              </div>
              <footer>
                <span>{note.time} ago</span>
                <div>
                  <span>History</span>
                  <span>AI</span>
                </div>
              </footer>
            </article>
          ))}
        </section>
      </main>

      <nav className="aw-mobile-tabs" aria-label="主导航">
        {['首页', '搜索', 'AI', '笔记', '我的'].map((item, index) => (
          <button className={index === 0 ? 'is-active' : ''} key={item}>
            <span>{index === 0 ? '●' : '○'}</span>
            {item}
          </button>
        ))}
      </nav>
    </div>
  );
}

function DesktopWorkspace() {
  const [layout, setLayout] = useState<WorkspaceLayout>(loadLayout);

  useEffect(() => {
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  }, [layout]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey) return;

      if (event.key === '.') {
        event.preventDefault();
        setLayout((current) => ({ ...current, contextOpen: !current.contextOpen, focusMode: false }));
      }

      if (event.key === '\\') {
        event.preventDefault();
        setLayout((current) => ({ ...current, focusMode: !current.focusMode }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const resizeSidebar = useCallback((delta: number) => {
    setLayout((current) => ({
      ...current,
      sidebarWidth: clamp(current.sidebarWidth + delta, SIDEBAR_MIN, SIDEBAR_MAX),
    }));
  }, []);

  const resizeList = useCallback((delta: number) => {
    setLayout((current) => ({
      ...current,
      listWidth: clamp(current.listWidth + delta, LIST_MIN, LIST_MAX),
    }));
  }, []);

  const workspaceStyle = useMemo(
    () =>
      ({
        '--sidebar-width': layout.focusMode ? '0px' : `${layout.sidebarWidth}px`,
        '--list-width': layout.focusMode ? '0px' : `${layout.listWidth}px`,
        '--context-width': layout.contextOpen && !layout.focusMode ? '320px' : '0px',
      }) as React.CSSProperties,
    [layout],
  );

  return (
    <div className={`aw-desktop ${layout.contextOpen ? 'has-context' : ''} ${layout.focusMode ? 'is-focus-mode' : ''}`} style={workspaceStyle}>
      <aside className="aw-sidebar">
        <div className="aw-sidebar__brand">
          <div className="aw-logo">A</div>
          <div>
            <div className="aw-brand">Atlas</div>
            <div className="aw-muted">AI Knowledge OS</div>
          </div>
        </div>

        <nav className="aw-space-list" aria-label="工作区">
          {spaces.map((space) => (
            <button className={space === 'History' ? 'is-active' : ''} key={space}>{space}</button>
          ))}
        </nav>

        <section className="aw-sidebar-ai">
          <span>AI Assistant</span>
          <p>Ask about notes, build timelines, summarize ideas.</p>
          <button>Open Command Bar</button>
        </section>
      </aside>
      <ResizeHandle
        label="调整 Sidebar 宽度"
        onDrag={resizeSidebar}
        onReset={() => setLayout((current) => ({ ...current, sidebarWidth: SIDEBAR_DEFAULT }))}
      />

      <section className="aw-note-list">
        <header>
          <div>
            <strong>History</strong>
            <span>128 notes</span>
          </div>
          <IconButton label="新建笔记">+</IconButton>
        </header>
        <div className="aw-note-list__items">
          {notes.map((note) => (
            <button className={note.active ? 'is-active' : ''} key={note.title}>
              <strong>{note.title}</strong>
              <span>{note.desc}</span>
              <small>{note.time}</small>
            </button>
          ))}
        </div>
      </section>
      <ResizeHandle
        label="调整 Note List 宽度"
        onDrag={resizeList}
        onReset={() => setLayout((current) => ({ ...current, listWidth: LIST_DEFAULT }))}
      />

      <main className="aw-editor-shell">
        <div className="aw-editor-toolbar">
          <IconButton
            active={layout.focusMode}
            label="专注模式 Cmd + \\"
            onClick={() => setLayout((current) => ({ ...current, focusMode: !current.focusMode }))}
          >
            ⛶
          </IconButton>
          <IconButton
            active={layout.contextOpen}
            label="打开 Context Cmd + ."
            onClick={() => setLayout((current) => ({ ...current, contextOpen: !current.contextOpen, focusMode: false }))}
          >
            ◫
          </IconButton>
        </div>
        <article className="aw-editor">
          <div className="aw-breadcrumb">History / Qing Dynasty</div>
          <h1>剃发易服背后的心理统治：满洲如何重塑汉人的身份认同</h1>

          <div className="aw-tag-row">
            <span>Qing History</span>
            <span>Psychological Warfare</span>
          </div>

          <p>
            清初推行的“留发不留头”政策，本质上并不仅仅是服饰与发型的变化，而是一场系统性的身份控制实验。
            它的真正目标，是通过对身体外观的强制干预，逐渐瓦解传统士大夫的文化认同。
          </p>

          <aside className="aw-inline-summary">
            <span>AI Summary</span>
            <p>满洲统治者通过外在身份符号改造、文化羞辱与历史记忆切断，完成了长期心理统治。</p>
          </aside>

          <p>
            当所有人都被迫以相同的方式呈现自身时，个体会逐渐失去对传统身份的坚持。
            这种“视觉统一”会进一步塑造社会认知，并最终影响集体记忆。
          </p>

          <h2>三层心理控制机制</h2>
          <div className="aw-mechanisms">
            {[
              ['身体改造', '通过外观控制建立服从性测试'],
              ['文化羞辱', '摧毁传统士大夫的道德优越感'],
              ['历史重构', '重塑社会叙事与集体记忆'],
            ].map(([title, desc]) => (
              <section key={title}>
                <strong>{title}</strong>
                <span>{desc}</span>
              </section>
            ))}
          </div>

          <p>
            从 UX 的角度看，这其实是一种极其强力的“默认状态设计”。
            当用户长期暴露于同一种系统规则下，人会逐渐停止反抗，并将其视为理所当然。
          </p>
        </article>
      </main>

      <aside className="aw-context">
        <p className="aw-kicker">Context</p>
        <section>
          <h2>Related Notes</h2>
          {relatedNotes.map((item) => (
            <button key={item}>{item}</button>
          ))}
        </section>

        <section>
          <h2>AI Timeline</h2>
          <ol className="aw-timeline">
            {timeline.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>

        <section className="aw-context-command">
          <h2>AI Summary</h2>
          <p>身份符号、强制默认与集体记忆重写构成了这篇笔记的主要论证路径。</p>
        </section>
      </aside>
    </div>
  );
}

export function WorkspaceViewFinal() {
  return (
    <div className="aw-root">
      <MobileWorkspace />
      <DesktopWorkspace />
    </div>
  );
}
