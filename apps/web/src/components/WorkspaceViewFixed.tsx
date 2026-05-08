import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
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
import { serializeMarkdown } from '../import-export/markdown';

const bearSections = [
  {
    id: 'notes',
    label: '笔记',
    icon: '▾',
    items: [
      { label: '无标签', icon: '▤' },
      { label: '待办事项', icon: '☑' },
      { label: '今天', icon: '□' },
      { label: '已加密', icon: '▢' },
      { label: '废纸篓', icon: '⌫' },
    ],
  },
  {
    id: 'personal',
    label: 'personal',
    icon: '▾',
    items: [
      { label: 'coder', icon: '</>' },
      { label: 'design', icon: '◢' },
    ],
  },
  {
    id: 'study',
    label: 'study',
    icon: '▾',
    items: [
      { label: '高项', icon: '▦' },
      { label: '工作流', icon: '▤' },
      { label: '历史', icon: '▾' },
      { label: '历史故事', icon: '◉', child: true },
      { label: '清朝', icon: 't', child: true, active: true },
      { label: '宋朝', icon: '▰', child: true },
      { label: '唐朝', icon: '▸', child: true },
      { label: '影视', icon: '◒' },
      { label: 'aigc', icon: '◇' },
      { label: 'music', icon: '♪' },
      { label: 'shorts', icon: '▸' },
    ],
  },
  {
    id: 'todo',
    label: 'todo',
    icon: '▾',
    items: [
      { label: '读书', icon: '☍' },
      { label: '经济学', icon: '$' },
      { label: '骷髅人', icon: '◌' },
      { label: '心理学', icon: '◎' },
    ],
  },
];
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
const LANGUAGE_STORAGE_KEY = 'minddock.workspace.language.v1';
const MARKDOWN_SYNTAX_STORAGE_KEY = 'minddock.workspace.markdown-syntax.v1';
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
  labelKey: I18nKey;
  tone: SaveTone;
  detailKey: I18nKey | null;
};

type Language = 'en' | 'zh';
type InspectorTab = 'stats' | 'outline' | 'ai';
type TagNode = {
  id: string;
  label: string;
  path: string;
  count: number;
  children: TagNode[];
};

const translations = {
  en: {
    aiCommand: 'AI Command',
    aiKnowledge: 'AI Knowledge',
    aiKnowledgeOS: 'AI Knowledge OS',
    aiSummary: 'AI Summary',
    askAiAnything: 'Ask AI anything about your notes',
    brand: 'Atlas',
    category: 'Category',
    commandPlaceholder: 'Search notes, summarize, connect ideas...',
    context: 'Context',
    contextSummary: 'Identity symbols, forced defaults, and rewritten collective memory form the main argument path of this note.',
    emptyLocalNote: 'Empty local note',
    focusMode: 'Focus mode Cmd + \\',
    history: 'History',
    language: 'Switch language',
    loadFailed: 'Load failed',
    loadFailedDetail: 'The selected note could not be loaded from local storage.',
    loading: 'Loading',
    localFirst: 'Local-first',
    localNote: 'Local note',
    localNotes: 'local notes',
    mobileHeroBody: 'A mobile knowledge space for reading, research, writing, and AI collaboration.',
    mobileHeroTitle: 'AI-powered knowledge workspace',
    mobileTabsAi: 'AI',
    mobileTabsHome: 'Home',
    mobileTabsMe: 'Me',
    mobileTabsNotes: 'Notes',
    mobileTabsSearch: 'Search',
    newNote: 'New note',
    noteOpened: 'Open note',
    openContext: 'Open Context Cmd + .',
    openCommandBar: 'Open Command Bar',
    relatedNotes: 'Related Notes',
    resizeList: 'Resize Note List',
    resizeReset: 'Double-click to restore default width',
    resizeSidebar: 'Resize Sidebar',
    saveFailed: 'Save failed',
    saveFailedCreateDetail: 'The current note could not be written locally before creating a new note.',
    saveFailedDetail: 'Latest changes are cached in this browser. This note is marked unsaved in the list.',
    saveFailedSwitchDetail: 'Latest changes were cached in this browser, so switching can continue.',
    saved: 'Saved',
    savingBeforeNewNote: 'Saving before new note',
    savingBeforeSwitch: 'Saving before switch',
    savingLocally: 'Saving locally',
    sidebarAiBody: 'Ask about notes, build timelines, summarize ideas.',
    sidebarAiTitle: 'AI Assistant',
    timeline: 'AI Timeline',
    untitled: 'Untitled',
    workspace: 'Workspace',
    copiedMarkdown: 'Markdown copied',
    exportMarkdown: 'Export Markdown',
    inspectorAi: 'AI',
    inspectorOutline: 'Outline',
    inspectorStats: 'Stats',
    noHeadings: 'No headings yet',
    markdownSyntax: 'Markdown syntax',
    allNotes: 'All Notes',
    untagged: 'Untagged',
  },
  zh: {
    aiCommand: 'AI 命令',
    aiKnowledge: 'AI 知识',
    aiKnowledgeOS: 'AI 知识系统',
    aiSummary: 'AI 摘要',
    askAiAnything: '询问 AI 关于笔记的任何问题',
    brand: 'Atlas',
    category: '分类',
    commandPlaceholder: '搜索笔记、生成总结、建立关联...',
    context: '上下文',
    contextSummary: '身份符号、强制默认与集体记忆重写构成了这篇笔记的主要论证路径。',
    emptyLocalNote: '空白本地笔记',
    focusMode: '专注模式 Cmd + \\',
    history: '历史',
    language: '切换语言',
    loadFailed: '加载失败',
    loadFailedDetail: '无法从本地存储加载所选笔记。',
    loading: '加载中',
    localFirst: '本地优先',
    localNote: '本地笔记',
    localNotes: '条本地笔记',
    mobileHeroBody: '为阅读、研究、写作和 AI 协作准备的移动端知识空间。',
    mobileHeroTitle: 'AI 驱动的知识工作台',
    mobileTabsAi: 'AI',
    mobileTabsHome: '首页',
    mobileTabsMe: '我的',
    mobileTabsNotes: '笔记',
    mobileTabsSearch: '搜索',
    newNote: '新建笔记',
    noteOpened: '打开笔记',
    openContext: '打开上下文 Cmd + .',
    openCommandBar: '打开命令栏',
    relatedNotes: '相关笔记',
    resizeList: '调整笔记列表宽度',
    resizeReset: '双击恢复默认宽度',
    resizeSidebar: '调整侧边栏宽度',
    saveFailed: '保存失败',
    saveFailedCreateDetail: '创建新笔记前，当前笔记未能写入本地。',
    saveFailedDetail: '最新更改已缓存在本浏览器中，并会在列表里标记为未保存。',
    saveFailedSwitchDetail: '最新更改已缓存在本浏览器中，可以继续切换笔记。',
    saved: '已保存',
    savingBeforeNewNote: '新建前保存中',
    savingBeforeSwitch: '切换前保存中',
    savingLocally: '本地保存中',
    sidebarAiBody: '询问笔记、生成时间线、总结想法。',
    sidebarAiTitle: 'AI 助手',
    timeline: 'AI 时间线',
    untitled: '未命名',
    workspace: '工作区',
    copiedMarkdown: 'Markdown 已复制',
    exportMarkdown: '导出 Markdown',
    inspectorAi: 'AI',
    inspectorOutline: '大纲',
    inspectorStats: '统计',
    noHeadings: '暂无标题',
    markdownSyntax: 'Markdown 语法',
    allNotes: '全部笔记',
    untagged: '无标签',
  },
} as const;

type I18nKey = keyof typeof translations.en;

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

function loadLanguage(): Language {
  if (typeof window === 'undefined') return 'en';

  return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'zh' ? 'zh' : 'en';
}

function loadMarkdownSyntaxPreference() {
  if (typeof window === 'undefined') return false;

  return window.localStorage.getItem(MARKDOWN_SYNTAX_STORAGE_KEY) === 'true';
}

function getNoteTitle(note: Note | NoteSummary | null, t: (key: I18nKey) => string) {
  if (!note) return t('untitled');

  const firstText = hasNoteContent(note) ? findFirstText(note.content) : '';
  return firstText || note.id;
}

function getNoteExcerpt(note: Note | NoteSummary | null, t: (key: I18nKey) => string) {
  if (!note || !hasNoteContent(note)) return t('localNote');

  return findFirstText(note.content, 120) || t('emptyLocalNote');
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

function collectText(value: unknown): string {
  if (!value || typeof value !== 'object') return '';

  const node = value as { text?: unknown; content?: unknown };
  const ownText = typeof node.text === 'string' ? node.text : '';
  const childText = Array.isArray(node.content) ? node.content.map(collectText).join(' ') : '';

  return [ownText, childText].filter(Boolean).join(' ');
}

function collectTextNodes(value: unknown, texts: string[] = []) {
  if (!value || typeof value !== 'object') return texts;

  const node = value as { text?: unknown; content?: unknown };
  if (typeof node.text === 'string') {
    texts.push(node.text);
  }

  if (Array.isArray(node.content)) {
    node.content.forEach((child) => collectTextNodes(child, texts));
  }

  return texts;
}

function getNoteTags(note: Note | NoteSummary | null) {
  if (!note || !hasNoteContent(note)) return [];

  const tags = new Set<string>();
  const tagPattern = /(?:^|\s)#([\p{L}\p{N}_/-]+)/gu;

  for (const text of collectTextNodes(note.content)) {
    for (const match of text.matchAll(tagPattern)) {
      const tag = match[1]
        ?.split('/')
        .map((part) => part.trim())
        .filter(Boolean)
        .join('/');

      if (tag) {
        tags.add(tag);
      }
    }
  }

  return Array.from(tags).sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

function buildTagTree(notes: Note[]) {
  const roots: TagNode[] = [];
  const byPath = new Map<string, TagNode>();

  for (const note of notes) {
    for (const tag of getNoteTags(note)) {
      const parts = tag.split('/').filter(Boolean);
      let parent: TagNode | null = null;
      let path = '';

      for (const part of parts) {
        path = path ? `${path}/${part}` : part;
        let node = byPath.get(path);

        if (!node) {
          node = {
            id: path,
            label: part,
            path,
            count: 0,
            children: [],
          };
          byPath.set(path, node);

          if (parent) {
            parent.children.push(node);
          } else {
            roots.push(node);
          }
        }

        node.count += 1;
        parent = node;
      }
    }
  }

  const sortTree = (nodes: TagNode[]) => {
    nodes.sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
    nodes.forEach((node) => sortTree(node.children));
  };

  sortTree(roots);
  return roots;
}

function noteMatchesTag(note: Note, tagPath: string | null) {
  if (!tagPath) return true;
  return getNoteTags(note).some((tag) => tag === tagPath || tag.startsWith(`${tagPath}/`));
}

function formatNoteTime(updatedAt: number) {
  return new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatNoteDate(updatedAt: number) {
  return new Date(updatedAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
}

function countBlocks(value: unknown, type: string): number {
  if (!value || typeof value !== 'object') return 0;

  const node = value as { type?: unknown; content?: unknown };
  const own = node.type === type ? 1 : 0;
  const children = Array.isArray(node.content)
    ? node.content.reduce((total, child) => total + countBlocks(child, type), 0)
    : 0;

  return own + children;
}

function getNoteStats(note: Note | null) {
  const text = note ? collectText(note.content).trim() : '';
  const compact = text.replace(/\s+/g, '');
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const chineseChars = compact.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  const wordCount = Math.max(words, chineseChars);
  const paragraphs = note ? Math.max(1, countBlocks(note.content, 'paragraph')) : 0;

  return {
    words: wordCount,
    characters: compact.length,
    paragraphs,
    readingMinutes: Math.max(1, Math.ceil(wordCount / 350)),
  };
}

function getNoteOutline(note: Note | null) {
  if (!note) return [];

  const outline: Array<{ id: string; level: number; text: string }> = [];
  collectHeadings(note.content, outline);
  return outline;
}

function collectHeadings(value: unknown, outline: Array<{ id: string; level: number; text: string }>) {
  if (!value || typeof value !== 'object') return;

  const node = value as { type?: unknown; attrs?: Record<string, unknown> | null; content?: unknown };
  if (node.type === 'heading') {
    const level = typeof node.attrs?.level === 'number' ? node.attrs.level : 1;
    const text = collectText(node).trim();
    if (text) {
      outline.push({
        id: typeof node.attrs?.blockId === 'string' ? node.attrs.blockId : `${outline.length}`,
        level,
        text,
      });
    }
  }

  if (Array.isArray(node.content)) {
    node.content.forEach((child) => collectHeadings(child, outline));
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

function ResizeHandle({ label, resetLabel, onDrag, onReset }: { label: string; resetLabel: string; onDrag: (delta: number) => void; onReset: () => void }) {
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
      title={`${label}. ${resetLabel}`}
    />
  );
}

function TagTree({
  nodes,
  activeTagPath,
  onSelect,
  depth = 0,
}: {
  nodes: TagNode[];
  activeTagPath: string | null;
  onSelect: (path: string) => void;
  depth?: number;
}) {
  return (
    <>
      {nodes.map((node) => (
        <div className="aw-tag-tree-node" key={node.path}>
          <button
            className={activeTagPath === node.path ? 'is-active' : ''}
            onClick={() => onSelect(node.path)}
            style={{ '--tag-depth': depth } as React.CSSProperties}
          >
            <span className="aw-tree-icon">{node.children.length > 0 ? '▾' : '#'}</span>
            <span>{node.label}</span>
            <small>{node.count}</small>
          </button>
          {node.children.length > 0 ? (
            <TagTree
              nodes={node.children}
              activeTagPath={activeTagPath}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ) : null}
        </div>
      ))}
    </>
  );
}

function MobileWorkspace({ language, setLanguage, t }: { language: Language; setLanguage: Dispatch<SetStateAction<Language>>; t: (key: I18nKey) => string }) {
  return (
    <div className="aw-mobile">
      <header className="aw-mobile-topbar">
        <div>
          <div className="aw-brand">{t('brand')}</div>
          <div className="aw-muted">{t('aiKnowledge')}</div>
        </div>
        <div className="aw-actions">
          <IconButton label={t('language')} onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}>{language === 'en' ? '中' : 'En'}</IconButton>
          <IconButton label={t('mobileTabsSearch')}>⌕</IconButton>
          <IconButton label={t('newNote')} dark>+</IconButton>
        </div>
      </header>

      <main className="aw-mobile-scroll">
        <section className="aw-mobile-hero">
          <p className="aw-kicker">Personal research OS</p>
          <h1>{t('mobileHeroTitle')}</h1>
          <p>{t('mobileHeroBody')}</p>
        </section>

        <section className="aw-command aw-command--mobile">
          <div>
            <span>{t('aiCommand')}</span>
            <strong>{t('askAiAnything')}</strong>
          </div>
          <button>{t('commandPlaceholder')}</button>
        </section>

        <nav className="aw-chip-row" aria-label={t('category')}>
          {chips.map((chip, index) => (
            <button className={index === 0 ? 'is-active' : ''} key={chip}>{chip}</button>
          ))}
        </nav>

        <section className="aw-feed">
          {mobileNotes.map((note) => (
            <article className="aw-note-card" key={note.title}>
              <div className="aw-note-card__top">
                <h2>{note.title}</h2>
                <IconButton label={t('noteOpened')}>↗</IconButton>
              </div>
              <p>{note.desc}</p>
              <div className="aw-ai-summary">
                <span>{t('aiSummary')}</span>
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
        {[t('mobileTabsHome'), t('mobileTabsSearch'), t('mobileTabsAi'), t('mobileTabsNotes'), t('mobileTabsMe')].map((item, index) => (
          <button className={index === 0 ? 'is-active' : ''} key={item}>
            <span>{index === 0 ? '●' : '○'}</span>
            {item}
          </button>
        ))}
      </nav>
    </div>
  );
}

function DesktopWorkspace({ language, setLanguage, t }: { language: Language; setLanguage: Dispatch<SetStateAction<Language>>; t: (key: I18nKey) => string }) {
  const [layout, setLayout] = useState<WorkspaceLayout>(loadLayout);
  const [showMarkdownSyntax, setShowMarkdownSyntax] = useState(loadMarkdownSyntaxPreference);
  const [activeTagPath, setActiveTagPath] = useState<string | null>('study/历史/清朝');
  const editorHostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const activeNoteIdRef = useRef<string | null>(null);
  const applyingRemoteContentRef = useRef(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('stats');
  const [saveState, setSaveState] = useState<SaveState>({
    labelKey: 'loading',
    tone: 'live',
    detailKey: null,
  });

  useEffect(() => {
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  }, [layout]);

  useEffect(() => {
    window.localStorage.setItem(MARKDOWN_SYNTAX_STORAGE_KEY, String(showMarkdownSyntax));
  }, [showMarkdownSyntax]);

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

  const refreshNotes = useCallback(async (nextActiveId?: string, options: { promoteId?: string } = {}) => {
    const allNotes = sortNotes(await listNotes()) as Note[];
    setNotes((currentNotes) => {
      if (currentNotes.length === 0) {
        return allNotes;
      }

      const freshNotesById = new Map(allNotes.map((note) => [note.id, note]));
      const orderedNotes = currentNotes
        .map((note) => freshNotesById.get(note.id))
        .filter((note): note is Note => Boolean(note));
      const knownIds = new Set(orderedNotes.map((note) => note.id));
      const newNotes = allNotes.filter((note) => !knownIds.has(note.id));
      const refreshedNotes = [...newNotes, ...orderedNotes];

      if (options.promoteId) {
        const promotedNote = refreshedNotes.find((note) => note.id === options.promoteId);
        if (promotedNote) {
          return [
            promotedNote,
            ...refreshedNotes.filter((note) => note.id !== options.promoteId),
          ];
        }
      }

      return refreshedNotes;
    });

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
      onSaving: () => setSaveState({ labelKey: 'savingLocally', tone: 'live', detailKey: null }),
      onSaved: async () => {
        setSaveState({ labelKey: 'saved', tone: 'idle', detailKey: null });
        await refreshNotes(activeNoteIdRef.current ?? undefined, { promoteId: activeNoteIdRef.current ?? undefined });
      },
      onError: () =>
        setSaveState({
          labelKey: 'saveFailed',
          tone: 'error',
          detailKey: 'saveFailedDetail',
        }),
    });

    const init = async () => {
      const note = await ensureDefaultNote();
      if (disposed) return;

      setCurrentNote(note.id);
      activeNoteIdRef.current = note.id;
      setActiveNote(note);
      setEditorContent(editor, note);
      setSaveState({ labelKey: 'saved', tone: 'idle', detailKey: null });
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
    let previousSaveFailed = false;

    try {
      setSaveState({ labelKey: 'savingBeforeNewNote', tone: 'live', detailKey: null });
      try {
        await flushActiveNote();
      } catch {
        previousSaveFailed = true;
        setSaveState({
          labelKey: 'saveFailed',
          tone: 'error',
          detailKey: 'saveFailedCreateDetail',
        });
      }

      const note = await createNote();
      setCurrentNote(note.id);
      activeNoteIdRef.current = note.id;
      setActiveNote(note);

      if (editorRef.current) {
        setEditorContent(editorRef.current, note);
      }

      setSaveState(
        previousSaveFailed
          ? { labelKey: 'saveFailed', tone: 'error', detailKey: 'saveFailedCreateDetail' }
          : { labelKey: 'saved', tone: 'idle', detailKey: null },
      );
      await refreshNotes(note.id);
    } catch {
      setSaveState({
        labelKey: 'saveFailed',
        tone: 'error',
        detailKey: 'saveFailedCreateDetail',
      });
    }
  };

  const handleSwitchNote = async (noteId: string) => {
    if (noteId === activeNoteIdRef.current) return;
    let previousSaveFailed = false;

    try {
      setSaveState({ labelKey: 'savingBeforeSwitch', tone: 'live', detailKey: null });
      try {
        await flushActiveNote();
      } catch {
        previousSaveFailed = true;
        setSaveState({
          labelKey: 'saveFailed',
          tone: 'error',
          detailKey: 'saveFailedSwitchDetail',
        });
      }

      const nextNote = await loadNote(noteId);
      if (!nextNote) {
        setSaveState({
          labelKey: 'loadFailed',
          tone: 'error',
          detailKey: 'loadFailedDetail',
        });
        return;
      }

      setCurrentNote(noteId);
      activeNoteIdRef.current = noteId;
      setActiveNote(nextNote);

      if (editorRef.current) {
        setEditorContent(editorRef.current, nextNote);
      }

      setSaveState(
        previousSaveFailed
          ? { labelKey: 'saveFailed', tone: 'error', detailKey: 'saveFailedSwitchDetail' }
          : { labelKey: 'saved', tone: 'idle', detailKey: null },
      );
      await refreshNotes(noteId);
    } catch {
      setSaveState({
        labelKey: 'saveFailed',
        tone: 'error',
        detailKey: 'saveFailedSwitchDetail',
      });
    }
  };

  const handleExportMarkdown = async () => {
    const editor = editorRef.current;
    if (!editor) return;

    const markdown = serializeMarkdown(editor.getJSON());
    await navigator.clipboard.writeText(markdown);
    setSaveState({ labelKey: 'copiedMarkdown', tone: 'idle', detailKey: null });
  };

  const activeTitle = getNoteTitle(activeNote, t);
  const activeStats = getNoteStats(activeNote);
  const activeOutline = getNoteOutline(activeNote);
  const tagTree = useMemo(() => buildTagTree(notes), [notes]);
  const hasActiveTag = useMemo(() => {
    if (!activeTagPath) return true;
    return notes.some((note) => noteMatchesTag(note, activeTagPath));
  }, [activeTagPath, notes]);
  const effectiveActiveTagPath = hasActiveTag ? activeTagPath : null;
  const filteredNotes = useMemo(
    () => notes.filter((note) => noteMatchesTag(note, effectiveActiveTagPath)),
    [effectiveActiveTagPath, notes],
  );
  const activeTags = getNoteTags(activeNote);
  const listTitle = effectiveActiveTagPath ?? t('allNotes');

  return (
    <div className={`aw-desktop ${layout.contextOpen ? 'has-context' : ''} ${layout.focusMode ? 'is-focus-mode' : ''} ${showMarkdownSyntax ? 'show-markdown-syntax' : ''}`} style={workspaceStyle}>
      <aside className="aw-sidebar">
        <div className="aw-sidebar__brand">
          <div className="aw-window-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <button className="aw-sidebar-tune" aria-label="Sidebar settings">☷</button>
        </div>

        <nav className="aw-space-list" aria-label={t('workspace')}>
          <section className="aw-tree-section">
            <button
              className={`aw-tree-heading ${activeTagPath === null ? 'is-active' : ''}`}
              onClick={() => setActiveTagPath(null)}
            >
              <span>#</span>
              {t('allNotes')}
              <small>{notes.length}</small>
            </button>
            {tagTree.length > 0 ? (
              <TagTree
                nodes={tagTree}
                activeTagPath={effectiveActiveTagPath}
                onSelect={setActiveTagPath}
              />
            ) : (
              <button className={activeTagPath === null ? 'is-active' : ''} onClick={() => setActiveTagPath(null)}>
                <span className="aw-tree-icon">#</span>
                {t('untagged')}
              </button>
            )}
          </section>
          {bearSections.map((section) => (
            <section className="aw-tree-section" key={section.id}>
              <button className="aw-tree-heading">
                <span>{section.icon}</span>
                {section.label}
              </button>
              {section.items.map((item) => (
                <button
                  className={`${item.active ? 'is-active' : ''} ${item.child ? 'is-child' : ''}`}
                  key={`${section.id}-${item.label}`}
                >
                  <span className="aw-tree-icon">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </section>
          ))}
        </nav>
      </aside>
      <ResizeHandle
        label={t('resizeSidebar')}
        resetLabel={t('resizeReset')}
        onDrag={resizeSidebar}
        onReset={() => setLayout((current) => ({ ...current, sidebarWidth: SIDEBAR_DEFAULT }))}
      />

      <section className="aw-note-list">
        <header className="aw-note-list__header">
          <div>
            <strong>{listTitle}</strong>
            <span>{language === 'zh' ? `${filteredNotes.length} ${t('localNotes')}` : `${filteredNotes.length} ${t('localNotes')}`}</span>
          </div>
          <IconButton label={t('newNote')} onClick={() => { void handleCreateNote(); }}>+</IconButton>
        </header>
        <div className="aw-note-list__items">
          {filteredNotes.map((note) => (
            <button
              className={note.id === activeNote?.id ? 'is-active' : ''}
              key={note.id}
              onClick={() => { void handleSwitchNote(note.id); }}
            >
              <div className="aw-note-list__title-row">
                <strong>{getNoteTitle(note, t)}</strong>
                {note.localStatus === 'unsaved' ? <em>{t('saveFailed')}</em> : null}
              </div>
              <span>{getNoteExcerpt(note, t)}</span>
              <small>{formatNoteDate(note.updatedAt)}</small>
            </button>
          ))}
        </div>
      </section>
      <ResizeHandle
        label={t('resizeList')}
        resetLabel={t('resizeReset')}
        onDrag={resizeList}
        onReset={() => setLayout((current) => ({ ...current, listWidth: LIST_DEFAULT }))}
      />

      <main className="aw-editor-shell">
        <div className="aw-editor-toolbar">
          <div className="aw-editor-titleline">
            <button aria-label="Back">‹</button>
            <button aria-label="Forward">›</button>
            <strong>{activeTitle}</strong>
          </div>
          <div className="aw-editor-tools">
            <button aria-label="Bold">B</button>
            <button aria-label="Italic"><em>I</em></button>
            <button aria-label="Underline"><u>U</u></button>
            <button
              aria-label={t('markdownSyntax')}
              aria-pressed={showMarkdownSyntax}
              className={showMarkdownSyntax ? 'is-active' : ''}
              onClick={() => setShowMarkdownSyntax((current) => !current)}
            >
              #
            </button>
            <button
              aria-label="Note statistics"
              aria-expanded={inspectorOpen}
              className={inspectorOpen ? 'is-active' : ''}
              onClick={() => setInspectorOpen((current) => !current)}
            >
              ⓘ
            </button>
            <button
              aria-label={t('language')}
              onClick={() => setLanguage((current) => (current === 'en' ? 'zh' : 'en'))}
            >
              {language === 'en' ? '中' : 'En'}
            </button>
            <button
              aria-label={t('focusMode')}
              className={layout.focusMode ? 'is-active' : ''}
              onClick={() => setLayout((current) => ({ ...current, focusMode: !current.focusMode }))}
            >
              ⛶
            </button>
            <button aria-label={t('exportMarkdown')} onClick={() => { void handleExportMarkdown(); }}>⇩</button>
            <button aria-label="More">⋮</button>
          </div>
        </div>
        {inspectorOpen ? (
          <aside className="aw-stat-popover">
            <h2>统计</h2>
            <div className="aw-stat-tabs">
              <button
                aria-label={t('inspectorStats')}
                className={inspectorTab === 'stats' ? 'is-active' : ''}
                onClick={() => setInspectorTab('stats')}
              >
                ▥
              </button>
              <button
                aria-label={t('inspectorOutline')}
                className={inspectorTab === 'outline' ? 'is-active' : ''}
                onClick={() => setInspectorTab('outline')}
              >
                ☷
              </button>
              <button
                aria-label={t('inspectorAi')}
                className={inspectorTab === 'ai' ? 'is-active' : ''}
                onClick={() => setInspectorTab('ai')}
              >
                ✦
              </button>
            </div>
            {inspectorTab === 'stats' ? (
              <>
                <div className="aw-stat-grid">
                  <section>
                    <strong>{activeStats.words.toLocaleString()}</strong>
                    <span>字数</span>
                  </section>
                  <section>
                    <strong>{activeStats.characters.toLocaleString()}</strong>
                    <span>字符</span>
                  </section>
                  <section>
                    <strong>{activeStats.paragraphs}</strong>
                    <span>段落</span>
                  </section>
                  <section>
                    <strong>{activeStats.readingMinutes}分钟</strong>
                    <span>阅读时间</span>
                  </section>
                </div>
                <div className="aw-stat-dates">
                  <div>
                    <strong>{activeNote ? new Date(activeNote.updatedAt).toLocaleString('zh-CN') : '-'}</strong>
                    <span>编辑日期</span>
                  </div>
                  <div>
                    <strong>{activeNote ? new Date(activeNote.updatedAt).toLocaleString('zh-CN') : '-'}</strong>
                    <span>创建日期</span>
                  </div>
                </div>
              </>
            ) : null}
            {inspectorTab === 'outline' ? (
              <div className="aw-outline-list">
                {activeOutline.length > 0 ? activeOutline.map((item) => (
                  <button style={{ paddingLeft: `${(item.level - 1) * 14}px` }} key={item.id}>
                    {item.text}
                  </button>
                )) : <p>{t('noHeadings')}</p>}
              </div>
            ) : null}
            {inspectorTab === 'ai' ? (
              <div className="aw-ai-panel">
                <button>{t('aiSummary')}</button>
                <button>{t('timeline')}</button>
                <button>{t('relatedNotes')}</button>
              </div>
            ) : null}
          </aside>
        ) : null}
        <article className="aw-editor">
          <div className="aw-editor-meta">
            <div>
              <h1>{activeTitle}</h1>
              <div className="aw-tag-row">
                {(activeTags.length > 0 ? activeTags : ['study/历史/清朝']).map((tag) => (
                  <button key={tag} onClick={() => setActiveTagPath(tag)}>
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
            <div className="aw-save-stack">
              <span className="aw-status-pill" data-tone={saveState.tone}>{t(saveState.labelKey)}</span>
              {activeNote ? <small>{formatNoteTime(activeNote.updatedAt)}</small> : null}
            </div>
          </div>

          {saveState.detailKey ? (
            <div className="aw-inline-alert" role="status" aria-live="polite">
              {t(saveState.detailKey)}
            </div>
          ) : null}

          <div ref={editorHostRef} className="aw-editor-host" />
          <div className="aw-floating-toolbar" aria-hidden="true">
            <span>H⌄</span>
            <span>☑</span>
            <span>≡⌄</span>
            <strong>B</strong>
            <em>I</em>
            <span>⌫</span>
            <span>@</span>
            <span>▦</span>
            <span>⋮</span>
          </div>
        </article>
      </main>

      <aside className="aw-context">
        <p className="aw-kicker">{t('context')}</p>
        <section>
          <h2>{t('relatedNotes')}</h2>
          {relatedNotes.map((item) => (
            <button key={item}>{item}</button>
          ))}
        </section>

        <section>
          <h2>{t('timeline')}</h2>
          <ol className="aw-timeline">
            {timeline.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>

        <section className="aw-context-command">
          <h2>{t('aiSummary')}</h2>
          <p>{t('contextSummary')}</p>
        </section>
      </aside>
    </div>
  );
}

export function WorkspaceViewFinal() {
  const [language, setLanguage] = useState<Language>(loadLanguage);
  const t = useCallback((key: I18nKey) => translations[language][key], [language]);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  return (
    <div className="aw-root">
      <MobileWorkspace language={language} setLanguage={setLanguage} t={t} />
      <DesktopWorkspace language={language} setLanguage={setLanguage} t={t} />
    </div>
  );
}
