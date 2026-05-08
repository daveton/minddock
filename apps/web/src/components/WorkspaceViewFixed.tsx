import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { bindEditorEvents } from '../editor/events';
import { createEditor } from '../editor/setup';
import {
  createNote,
  ensureDefaultNote,
  listNotes,
  loadNote,
  saveNoteById,
  setCurrentNote,
  sortNotes,
} from '../data/repository';
import type { Note, NoteSummary } from '../data/memory';

const spaces = ['Today', 'Research', 'Writing', 'History', 'AI', 'Design', 'Psychology'];
const mobileNotes = [
  {
    title: '剃发易服背后的心理统治',
    desc: '满洲统治者如何利用文化与身份重塑进行长期心理控制',
    time: '2h',
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
];
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

type SaveTone = 'idle' | 'live' | 'error';

type SaveState = {
  label: string;
  tone: SaveTone;
  detail: string | null;
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

function getNoteTitle(note: Note | NoteSummary | null) {
  if (!note) return 'Untitled';

  const firstText = hasNoteContent(note) ? findFirstText(note.content) : '';
  return firstText || note.id;
}

function getNoteExcerpt(note: Note | NoteSummary | null) {
  if (!note || !hasNoteContent(note)) return 'Local note';

  return findFirstText(note.content, 120) || 'Empty local note';
}

function hasNoteContent(note: Note | NoteSummary): note is Note {
  return 'content' in note;
}

function findFirstText(value: unknown, limit = 56): string {
  if (!value || typeof value !== 'object') return '';

  const node = value as { text?: unknown; content?: unknown };
  if (typeof node.text === 'string' && node.text.trim()) {
    return node.text.trim().slice(0, limit);
  }

  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      const text = findFirstText(child, limit);
      if (text) return text;
    }
  }

  return '';
}

function formatNoteTime(updatedAt: number) {
  return new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
          {mobileNotes.map((note) => (
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
  const editorHostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const activeNoteIdRef = useRef<string | null>(null);
  const applyingRemoteContentRef = useRef(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({
    label: 'Loading',
    tone: 'live',
    detail: null,
  });

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

  const refreshNotes = useCallback(async (nextActiveId?: string) => {
    const allNotes = sortNotes(await listNotes()) as Note[];
    setNotes(allNotes);

    if (nextActiveId) {
      const nextActive = allNotes.find((note) => note.id === nextActiveId) ?? null;
      setActiveNote(nextActive);
    }
  }, []);

  const setEditorContent = useCallback((editor: Editor, note: Note) => {
    applyingRemoteContentRef.current = true;
    editor.commands.setContent(note.content);
    queueMicrotask(() => {
      applyingRemoteContentRef.current = false;
    });
  }, []);

  const flushActiveNote = useCallback(async () => {
    const editor = editorRef.current;
    const noteId = activeNoteIdRef.current;
    if (!editor || !noteId) return;

    const result = await saveNoteById(noteId, editor.getJSON());
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Save failed');
    }

    await refreshNotes(noteId);
  }, [refreshNotes]);

  useEffect(() => {
    if (!editorHostRef.current) return;

    let disposed = false;
    const editor = createEditor(editorHostRef.current);
    editorRef.current = editor;

    const unbind = bindEditorEvents(editor, {
      shouldSave: () => !applyingRemoteContentRef.current,
      onSaving: () => setSaveState({ label: 'Saving locally', tone: 'live', detail: null }),
      onSaved: async () => {
        setSaveState({ label: 'Saved', tone: 'idle', detail: null });
        await refreshNotes(activeNoteIdRef.current ?? undefined);
      },
      onError: () =>
        setSaveState({
          label: 'Save failed',
          tone: 'error',
          detail: 'Latest changes are still in memory, but the last local write did not complete.',
        }),
    });

    const init = async () => {
      const note = await ensureDefaultNote();
      if (disposed) return;

      setCurrentNote(note.id);
      activeNoteIdRef.current = note.id;
      setActiveNote(note);
      setEditorContent(editor, note);
      setSaveState({ label: 'Saved', tone: 'idle', detail: null });
      await refreshNotes(note.id);
    };

    void init();

    return () => {
      disposed = true;
      unbind();
      editor.destroy();
      editorRef.current = null;
    };
  }, [refreshNotes, setEditorContent]);

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

  const handleCreateNote = async () => {
    try {
      setSaveState({ label: 'Saving before new note', tone: 'live', detail: null });
      await flushActiveNote();

      const note = await createNote();
      setCurrentNote(note.id);
      activeNoteIdRef.current = note.id;
      setActiveNote(note);

      if (editorRef.current) {
        setEditorContent(editorRef.current, note);
      }

      setSaveState({ label: 'Saved', tone: 'idle', detail: null });
      await refreshNotes(note.id);
    } catch {
      setSaveState({
        label: 'Save failed',
        tone: 'error',
        detail: 'The current note could not be written locally before creating a new note.',
      });
    }
  };

  const handleSwitchNote = async (noteId: string) => {
    if (noteId === activeNoteIdRef.current) return;

    try {
      setSaveState({ label: 'Saving before switch', tone: 'live', detail: null });
      await flushActiveNote();

      const nextNote = await loadNote(noteId);
      if (!nextNote) {
        setSaveState({
          label: 'Load failed',
          tone: 'error',
          detail: 'The selected note could not be loaded from local storage.',
        });
        return;
      }

      setCurrentNote(noteId);
      activeNoteIdRef.current = noteId;
      setActiveNote(nextNote);

      if (editorRef.current) {
        setEditorContent(editorRef.current, nextNote);
      }

      setSaveState({ label: 'Saved', tone: 'idle', detail: null });
      await refreshNotes(noteId);
    } catch {
      setSaveState({
        label: 'Save failed',
        tone: 'error',
        detail: 'Switch was stopped because the current note could not be written locally.',
      });
    }
  };

  const activeTitle = getNoteTitle(activeNote);
  const activeExcerpt = getNoteExcerpt(activeNote);

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
            <span>{notes.length} local notes</span>
          </div>
          <IconButton label="新建笔记" onClick={() => { void handleCreateNote(); }}>+</IconButton>
        </header>
        <div className="aw-note-list__items">
          {notes.map((note) => (
            <button
              className={note.id === activeNote?.id ? 'is-active' : ''}
              key={note.id}
              onClick={() => { void handleSwitchNote(note.id); }}
            >
              <strong>{getNoteTitle(note)}</strong>
              <span>{getNoteExcerpt(note)}</span>
              <small>{formatNoteTime(note.updatedAt)}</small>
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
          <div className="aw-editor-meta">
            <div>
              <div className="aw-breadcrumb">History / Local-first</div>
              <h1>{activeTitle}</h1>
              <p>{activeExcerpt}</p>
            </div>
            <div className="aw-save-stack">
              <span className="aw-status-pill" data-tone={saveState.tone}>{saveState.label}</span>
              {activeNote ? <small>{formatNoteTime(activeNote.updatedAt)}</small> : null}
            </div>
          </div>

          {saveState.detail ? (
            <div className="aw-inline-alert" role="status" aria-live="polite">
              {saveState.detail}
            </div>
          ) : null}

          <div ref={editorHostRef} className="aw-editor-host" />
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
