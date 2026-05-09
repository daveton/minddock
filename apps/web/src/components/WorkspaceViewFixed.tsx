import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Editor } from '@tiptap/core';
import { bindEditorEvents } from '../editor/events';
import { createEditor } from '../editor/setup';
import {
  createNote,
  ensureDefaultNote,
  flushPendingNoteSave,
  listNotes,
  loadEditorState,
  loadWorkspaceState,
  loadNote,
  saveEditorState,
  saveWorkspaceState,
  saveNoteById,
  setCurrentNote,
  sortNotes,
} from '../data/repository';
import type { Note, NoteSummary } from '../data/memory';
import {
  buildTagIndex,
  buildTagTreeFromIndex,
  noteMatchesTagPath,
} from '../data/tagIndex';
import type { TagNode } from '../data/tagIndex';
import { analyzeNoteContent, findRelatedNotes } from '../data/knowledgeAnalysis';
import { checkDataIntegrity } from '../data/integrity';
import {
  getRestSyncConfig,
  getSyncStatusSummary,
  processDefaultSyncQueue,
  setRestSyncConfig,
  type SyncStatusSummary,
} from '../data/sync';
import { downloadMarkdownBundle } from '../import-export/bundle';
import {
  chooseMarkdownDirectory,
  clearMarkdownDirectory,
  getMarkdownDirectoryPath,
  getMarkdownDirectoryName,
  getMarkdownFileName,
  saveMarkdownFile,
  saveMarkdownToSelectedDirectory,
  supportsDirectoryPicker,
} from '../import-export/fileSystem';
import { serializeMarkdown } from '../import-export/markdown';
import { debounce } from '../utils/debounce';

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
const LAYOUT_STORAGE_KEY = 'minddock.workspace.layout.v1';
const WORKSPACE_STATE_ID = 'default';
const LANGUAGE_STORAGE_KEY = 'minddock.workspace.language.v1';
const MARKDOWN_SYNTAX_STORAGE_KEY = 'minddock.workspace.markdown-syntax.v1';
const SAVE_PREFERENCES_STORAGE_KEY = 'minddock.workspace.save-preferences.v1';
const SIDEBAR_DEFAULT = 260;
const LIST_DEFAULT = 320;
const SIDEBAR_MIN = 220;
const SIDEBAR_MAX = 1200;
const LIST_MIN = 260;
const LIST_MAX = 1600;
const MAIN_MIN = 520;
const EDITOR_WIDTH_DEFAULT = 720;
const EDITOR_WIDTH_MIN = 580;
const EDITOR_WIDTH_MAX = 1800;
const FONT_SIZE_DEFAULT = 17;
const FONT_SIZE_MIN = 15;
const FONT_SIZE_MAX = 20;
const LINE_HEIGHT_DEFAULT = 1.92;
const LINE_HEIGHT_MIN = 1.6;
const LINE_HEIGHT_MAX = 2.15;
const DIRECTORY_SYNC_INTERVAL_MS = 2000;
const CLOUD_SYNC_INTERVAL_MS = 15000;

type WorkspaceLayout = {
  sidebarWidth: number;
  listWidth: number;
  editorWidth: number;
  fontSize: number;
  lineHeight: number;
  contextOpen: boolean;
  focusMode: boolean;
  compactMode: boolean;
  theme: 'light';
};

type SaveTone = 'idle' | 'live' | 'error';

type SaveState = {
  labelKey: I18nKey;
  tone: SaveTone;
  detailKey: I18nKey | null;
};

type SavePreferences = {
  database: boolean;
  directory: boolean;
  directoryTree: boolean;
};

type CloudSyncState = {
  running: boolean;
  lastRunAt: number | null;
  summary: SyncStatusSummary;
};

type RestSyncForm = {
  endpoint: string;
  token: string;
};

type Language = 'en' | 'zh';
type InspectorTab = 'stats' | 'outline' | 'ai';
type PreferenceTab = 'general' | 'format' | 'theme' | 'icons' | 'sync';
const preferenceTabs: Array<{ id: PreferenceTab; icon: 'general' | 'format' | 'theme' | 'icons' | 'sync'; label: string }> = [
  { id: 'general', icon: 'general', label: '通用' },
  { id: 'format', icon: 'format', label: '格式' },
  { id: 'theme', icon: 'theme', label: '主题' },
  { id: 'icons', icon: 'icons', label: '图标' },
  { id: 'sync', icon: 'sync', label: '同步' },
];
const themeOptions = ['石墨红', '石墨黑', '石墨蓝', '木炭灰', '光天化日', '月黑风高'];
const translations = {
  en: {
    aiCommand: 'AI Command',
    aiKnowledge: 'AI Knowledge',
    aiKnowledgeOS: 'AI Knowledge OS',
    aiSummary: 'AI Summary',
    askAiAnything: 'Ask AI anything about your notes',
    brand: 'MindDock',
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
    noRelatedNotes: 'Related notes appear as your local notes share tags and keywords.',
    resizeList: 'Resize Note List',
    resizeReset: 'Double-click to restore default width',
    resizeSidebar: 'Resize Sidebar',
    saveFailed: 'Save failed',
    saveFailedCreateDetail: 'The current note could not be written locally before creating a new note.',
    saveFailedDetail: 'Latest changes are cached in this browser. This note is marked unsaved in the list.',
    saveFailedSwitchDetail: 'Latest changes were cached in this browser, so switching can continue.',
    saved: 'Saved',
    saveLocationSelected: 'Save location selected',
    saveLocationCleared: 'Save location cleared',
    savedMarkdownDisk: 'Saved to disk',
    savedMarkdownDownload: 'Markdown downloaded',
    savedBundleDownload: 'Bundle downloaded',
    syncConfigSaved: 'Sync config saved',
    syncNow: 'Sync now',
    syncRunning: 'Syncing',
    syncComplete: 'Sync complete',
    syncFailed: 'Sync failed',
    savingBeforeNewNote: 'Saving before new note',
    savingBeforeSwitch: 'Saving before switch',
    savingLocally: 'Saving locally',
    sidebarAiBody: 'Ask about notes, build timelines, summarize ideas.',
    sidebarAiTitle: 'AI Assistant',
    timeline: 'AI Timeline',
    noTimeline: 'Years found in this note will appear here.',
    untitled: 'Untitled',
    workspace: 'Workspace',
    copiedMarkdown: 'Markdown copied',
    exportMarkdown: 'Export Markdown',
    exportBundle: 'Export Bundle',
    integrityOk: 'Data healthy',
    integrityFailed: 'Data check found issues',
    checkIntegrity: 'Check Data',
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
    brand: 'MindDock',
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
    noRelatedNotes: '当本地笔记拥有相同标签或关键词时，会自动出现在这里。',
    resizeList: '调整笔记列表宽度',
    resizeReset: '双击恢复默认宽度',
    resizeSidebar: '调整侧边栏宽度',
    saveFailed: '保存失败',
    saveFailedCreateDetail: '创建新笔记前，当前笔记未能写入本地。',
    saveFailedDetail: '最新更改已缓存在本浏览器中，并会在列表里标记为未保存。',
    saveFailedSwitchDetail: '最新更改已缓存在本浏览器中，可以继续切换笔记。',
    saved: '已保存',
    saveLocationSelected: '已选择保存位置',
    saveLocationCleared: '已清除保存位置',
    savedMarkdownDisk: '已保存到磁盘',
    savedMarkdownDownload: 'Markdown 已下载',
    savedBundleDownload: 'Bundle 已下载',
    syncConfigSaved: '同步配置已保存',
    syncNow: '立即同步',
    syncRunning: '同步中',
    syncComplete: '同步完成',
    syncFailed: '同步失败',
    savingBeforeNewNote: '新建前保存中',
    savingBeforeSwitch: '切换前保存中',
    savingLocally: '本地保存中',
    sidebarAiBody: '询问笔记、生成时间线、总结想法。',
    sidebarAiTitle: 'AI 助手',
    timeline: 'AI 时间线',
    noTimeline: '当前笔记里识别到的年份会显示在这里。',
    untitled: '未命名',
    workspace: '工作区',
    copiedMarkdown: 'Markdown 已复制',
    exportMarkdown: '导出 Markdown',
    exportBundle: '导出 Bundle',
    integrityOk: '数据健康',
    integrityFailed: '数据检查发现问题',
    checkIntegrity: '检查数据',
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
  editorWidth: EDITOR_WIDTH_DEFAULT,
  fontSize: FONT_SIZE_DEFAULT,
  lineHeight: LINE_HEIGHT_DEFAULT,
  contextOpen: true,
  focusMode: false,
  compactMode: false,
  theme: 'light',
};

const defaultSavePreferences: SavePreferences = {
  database: true,
  directory: false,
  directoryTree: false,
};

const emptySyncSummary: SyncStatusSummary = {
  pending: 0,
  syncing: 0,
  synced: 0,
  conflicts: 0,
  failed: 0,
  openConflicts: 0,
};

function loadRestSyncForm(): RestSyncForm {
  const config = getRestSyncConfig();
  return {
    endpoint: config.endpoint,
    token: config.token ?? '',
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getAvailableDesktopWidth() {
  return typeof window === 'undefined' ? 1440 : window.innerWidth;
}

function getContextWidth(layout: Pick<WorkspaceLayout, 'contextOpen' | 'focusMode'>) {
  void layout;
  return 0;
}

function getSidebarMax(layout: Pick<WorkspaceLayout, 'listWidth' | 'contextOpen' | 'focusMode'>) {
  return Math.max(
    SIDEBAR_MIN,
    Math.min(
      SIDEBAR_MAX,
      getAvailableDesktopWidth() - layout.listWidth - getContextWidth(layout) - MAIN_MIN - 2,
    ),
  );
}

function getListMax(layout: Pick<WorkspaceLayout, 'sidebarWidth' | 'contextOpen' | 'focusMode'>) {
  return Math.max(
    LIST_MIN,
    Math.min(
      LIST_MAX,
      getAvailableDesktopWidth() - layout.sidebarWidth - getContextWidth(layout) - MAIN_MIN - 2,
    ),
  );
}

function updateLayout(
  setLayout: Dispatch<SetStateAction<WorkspaceLayout>>,
  nextLayout: (current: WorkspaceLayout) => WorkspaceLayout,
) {
  setLayout((current) => fitLayoutToViewport(nextLayout(current)));
}

function fitLayoutToViewport(layout: WorkspaceLayout): WorkspaceLayout {
  let sidebarWidth = clamp(layout.sidebarWidth, SIDEBAR_MIN, SIDEBAR_MAX);
  let listWidth = clamp(layout.listWidth, LIST_MIN, LIST_MAX);
  const contextWidth = getContextWidth(layout);
  const availableForSidebarAndList = getAvailableDesktopWidth() - contextWidth - MAIN_MIN - 2;

  if (!layout.focusMode && availableForSidebarAndList < sidebarWidth + listWidth) {
    const overflow = sidebarWidth + listWidth - availableForSidebarAndList;
    const listShrink = Math.min(overflow, Math.max(0, listWidth - LIST_MIN));
    listWidth -= listShrink;
    sidebarWidth -= Math.min(overflow - listShrink, Math.max(0, sidebarWidth - SIDEBAR_MIN));
  }

  return {
    ...layout,
    sidebarWidth: clamp(sidebarWidth, SIDEBAR_MIN, SIDEBAR_MAX),
    listWidth: clamp(listWidth, LIST_MIN, LIST_MAX),
  };
}

function loadLayout(): WorkspaceLayout {
  if (typeof window === 'undefined') return defaultLayout;

  try {
    const saved = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!saved) return defaultLayout;
    const parsed = JSON.parse(saved) as Partial<WorkspaceLayout>;

    return fitLayoutToViewport({
      sidebarWidth: clamp(parsed.sidebarWidth ?? SIDEBAR_DEFAULT, SIDEBAR_MIN, SIDEBAR_MAX),
      listWidth: clamp(parsed.listWidth ?? LIST_DEFAULT, LIST_MIN, LIST_MAX),
      editorWidth: clamp(parsed.editorWidth ?? EDITOR_WIDTH_DEFAULT, EDITOR_WIDTH_MIN, EDITOR_WIDTH_MAX),
      fontSize: clamp(parsed.fontSize ?? FONT_SIZE_DEFAULT, FONT_SIZE_MIN, FONT_SIZE_MAX),
      lineHeight: clamp(parsed.lineHeight ?? LINE_HEIGHT_DEFAULT, LINE_HEIGHT_MIN, LINE_HEIGHT_MAX),
      contextOpen: parsed.contextOpen ?? defaultLayout.contextOpen,
      focusMode: parsed.focusMode ?? defaultLayout.focusMode,
      compactMode: parsed.compactMode ?? defaultLayout.compactMode,
      theme: 'light',
    });
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

function loadSavePreferences(): SavePreferences {
  if (typeof window === 'undefined') return defaultSavePreferences;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(SAVE_PREFERENCES_STORAGE_KEY) ?? '{}') as Partial<SavePreferences>;

    return {
      database: parsed.database ?? defaultSavePreferences.database,
      directory: parsed.directory ?? defaultSavePreferences.directory,
      directoryTree: parsed.directoryTree ?? defaultSavePreferences.directoryTree,
    };
  } catch {
    return defaultSavePreferences;
  }
}

function getNoteTitle(note: Note | NoteSummary | null, t: (key: I18nKey) => string) {
  if (!note) return t('untitled');
  if (note.title) return note.title;

  const firstText = hasNoteContent(note) ? findFirstText(note.content) : '';
  return firstText || note.id;
}

function getNoteExcerpt(note: Note | NoteSummary | null, t: (key: I18nKey) => string) {
  if (!note || !hasNoteContent(note)) return t('localNote');

  return findFirstBodyParagraph(note.content, 120) || findFirstText(note.content, 120) || t('emptyLocalNote');
}

function getPrimaryTagDirectories(note: Note | NoteSummary | null) {
  const tags = note?.metadata?.tags ?? note?.tags ?? [];
  const primaryTag = tags[0] ?? '';

  return primaryTag.split('/').map((segment) => segment.trim()).filter(Boolean);
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

function findFirstBodyParagraph(value: unknown, limit = 120): string {
  if (!value || typeof value !== 'object') return '';

  const node = value as { type?: unknown; content?: unknown };
  const rootChildren = Array.isArray(node.content) ? node.content : [];

  for (const child of rootChildren) {
    if (!child || typeof child !== 'object') continue;

    const childNode = child as { type?: unknown };
    if (childNode.type !== 'paragraph') continue;

    const text = collectText(child).trim().replace(/\s+/g, ' ');
    if (text) return text.slice(0, limit);
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

function getNoteStats(content: unknown) {
  const text = collectText(content).trim();
  const compact = text.replace(/\s+/g, '');
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const chineseChars = compact.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  const wordCount = Math.max(words, chineseChars);
  const paragraphs = content ? countBlocks(content, 'paragraph') : 0;

  return {
    words: wordCount,
    characters: compact.length,
    paragraphs,
    readingMinutes: Math.max(1, Math.ceil(wordCount / 350)),
  };
}

function getNoteOutline(content: unknown) {
  if (!content) return [];

  const outline: Array<{ id: string; level: number; text: string }> = [];
  collectHeadings(content, outline);
  return outline;
}

function getEditorScrollParent(element: HTMLElement | null): HTMLElement | null {
  let current = element?.parentElement ?? null;

  while (current) {
    const style = window.getComputedStyle(current);
    if (/(auto|scroll)/.test(`${style.overflow}${style.overflowY}`)) {
      return current;
    }

    current = current.parentElement;
  }

  return document.scrollingElement as HTMLElement | null;
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

function PrefIcon({ name }: { name: 'general' | 'format' | 'theme' | 'icons' | 'sync' }) {
  const className = 'aw-inline-icon';
  if (name === 'general') return <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2v3M10 15v3M3 10h3M14 10h3M5 5l2.2 2.2M12.8 12.8L15 15M15 5l-2.2 2.2M7.2 12.8L5 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="10" cy="10" r="3.25" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>;
  if (name === 'format') return <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5h12M7.5 5l2.7 10M12.5 5L9.8 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  if (name === 'theme') return <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5a7.5 7.5 0 1 0 0 15V2.5Z" fill="currentColor" opacity="0.25"/><circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>;
  if (name === 'icons') return <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><path d="m10 3 1.8 3.8L16 8l-3 2.9.7 4.1-3.7-2-3.7 2 .7-4.1L4 8l4.2-1.2L10 3Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>;
  return <svg className={className} viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10a6 6 0 0 1 10.2-4.2M16 10a6 6 0 0 1-10.2 4.2M14.8 4.8v2.8H12M5.2 15.2v-2.8H8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function ResizeHandle({ label, resetLabel, onDrag, onReset }: { label: string; resetLabel: string; onDrag: (delta: number) => void; onReset: () => void }) {
  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      let previousX = event.clientX;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const delta = moveEvent.clientX - previousX;
        previousX = moveEvent.clientX;
        onDrag(delta);
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
            <span>{node.name}</span>
            <small>{node.noteCount}</small>
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
        <div className="aw-mobile-brand">
          <img src="/logo.JPG" alt="" />
          <div>
            <div className="aw-brand">{t('brand')}</div>
            <div className="aw-muted">{t('aiKnowledge')}</div>
          </div>
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

function DesktopWorkspace({ language, t }: { language: Language; t: (key: I18nKey) => string }) {
  const [layout, setLayout] = useState<WorkspaceLayout>(loadLayout);
  const [showMarkdownSyntax, setShowMarkdownSyntax] = useState(loadMarkdownSyntaxPreference);
  const [formatToolbarOpen, setFormatToolbarOpen] = useState(true);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [activeTagPath, setActiveTagPath] = useState<string | null>('study/历史/清朝');
  const editorHostRef = useRef<HTMLDivElement>(null);
  const editorShellRef = useRef<HTMLElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const activeNoteIdRef = useRef<string | null>(null);
  const activeNoteRef = useRef<Note | null>(null);
  const savePreferencesRef = useRef<SavePreferences>(loadSavePreferences());
  const applyingRemoteContentRef = useRef(false);
  const directorySyncTimerRef = useRef<number | null>(null);
  const directorySyncInFlightRef = useRef(false);
  const lastDirectorySyncAtRef = useRef(0);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [activeContent, setActiveContent] = useState<Record<string, unknown> | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('stats');
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [preferenceTab, setPreferenceTab] = useState<PreferenceTab>('general');
  const [markdownDirectoryName, setMarkdownDirectoryName] = useState(getMarkdownDirectoryName);
  const [lastMarkdownPath, setLastMarkdownPath] = useState<string | null>(null);
  const [savePreferences, setSavePreferences] = useState<SavePreferences>(() => savePreferencesRef.current);
  const [cloudSyncState, setCloudSyncState] = useState<CloudSyncState>({
    running: false,
    lastRunAt: null,
    summary: emptySyncSummary,
  });
  const [restSyncForm, setRestSyncForm] = useState<RestSyncForm>(loadRestSyncForm);
  const [editorNavbarVisible, setEditorNavbarVisible] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>({
    labelKey: 'loading',
    tone: 'live',
    detailKey: null,
  });

  useEffect(() => {
    activeNoteRef.current = activeNote;
  }, [activeNote]);

  useEffect(() => {
    savePreferencesRef.current = savePreferences;
    window.localStorage.setItem(SAVE_PREFERENCES_STORAGE_KEY, JSON.stringify(savePreferences));
  }, [savePreferences]);

  useEffect(() => {
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    void saveWorkspaceState({
      id: WORKSPACE_STATE_ID,
      sidebarWidth: layout.sidebarWidth,
      listWidth: layout.listWidth,
      editorWidth: layout.editorWidth,
      fontSize: layout.fontSize,
      lineHeight: layout.lineHeight,
      compactMode: layout.compactMode,
      contextOpen: layout.contextOpen,
      theme: layout.theme,
      focusMode: layout.focusMode,
    });
  }, [layout]);

  useEffect(() => {
    let disposed = false;

    void loadWorkspaceState(WORKSPACE_STATE_ID).then((saved) => {
      if (!saved || disposed) return;

      setLayout(fitLayoutToViewport({
        sidebarWidth: clamp(saved.sidebarWidth, SIDEBAR_MIN, SIDEBAR_MAX),
        listWidth: clamp(saved.listWidth, LIST_MIN, LIST_MAX),
        editorWidth: clamp(saved.editorWidth ?? EDITOR_WIDTH_DEFAULT, EDITOR_WIDTH_MIN, EDITOR_WIDTH_MAX),
        fontSize: clamp(saved.fontSize ?? FONT_SIZE_DEFAULT, FONT_SIZE_MIN, FONT_SIZE_MAX),
        lineHeight: clamp(saved.lineHeight ?? LINE_HEIGHT_DEFAULT, LINE_HEIGHT_MIN, LINE_HEIGHT_MAX),
        contextOpen: saved.contextOpen,
        theme: 'light',
        focusMode: saved.focusMode,
        compactMode: saved.compactMode ?? false,
      }));
    });

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setLayout((current) => fitLayoutToViewport(current));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const shell = editorShellRef.current;
    if (!shell) return;

    let lastScrollTop = shell.scrollTop;
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;

      ticking = true;
      window.requestAnimationFrame(() => {
        const nextScrollTop = shell.scrollTop;
        const delta = nextScrollTop - lastScrollTop;

        if (nextScrollTop < 12 || delta < -4) {
          setEditorNavbarVisible(true);
        } else if (delta > 4) {
          setEditorNavbarVisible(false);
          setMoreMenuOpen(false);
          setInspectorOpen(false);
        }

        lastScrollTop = nextScrollTop;
        ticking = false;
      });
    };

    shell.addEventListener('scroll', handleScroll, { passive: true });
    return () => shell.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(MARKDOWN_SYNTAX_STORAGE_KEY, String(showMarkdownSyntax));
  }, [showMarkdownSyntax]);

  const refreshSyncSummary = useCallback(async () => {
    const summary = await getSyncStatusSummary();
    setCloudSyncState((current) => ({ ...current, summary }));
    return summary;
  }, []);

  const runCloudSync = useCallback(async () => {
    setCloudSyncState((current) => ({ ...current, running: true }));

    try {
      await processDefaultSyncQueue();
      const summary = await getSyncStatusSummary();
      setCloudSyncState({
        running: false,
        lastRunAt: Date.now(),
        summary,
      });
      return summary;
    } catch {
      setCloudSyncState((current) => ({
        ...current,
        running: false,
        lastRunAt: Date.now(),
      }));
      throw new Error('Cloud sync failed');
    }
  }, []);

  useEffect(() => {
    void refreshSyncSummary();

    const interval = window.setInterval(() => {
      if (navigator.onLine) {
        void runCloudSync().catch(() => {
          setSaveState({ labelKey: 'syncFailed', tone: 'error', detailKey: null });
        });
      }
    }, CLOUD_SYNC_INTERVAL_MS);

    const handleOnline = () => {
      void runCloudSync().catch(() => {
        setSaveState({ labelKey: 'syncFailed', tone: 'error', detailKey: null });
      });
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', handleOnline);
    };
  }, [refreshSyncSummary, runCloudSync]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey) return;

      if (event.key === '.') {
        event.preventDefault();
        setInspectorOpen((current) => !current);
        setInspectorTab('ai');
      }

      if (event.key === '\\') {
        event.preventDefault();
        updateLayout(setLayout, (current) => ({ ...current, focusMode: !current.focusMode }));
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
    setActiveContent(editor.getJSON());
    void loadEditorState(note.id).then((state) => {
      if (state?.selection) {
        editor.commands.setTextSelection(state.selection);
      }

      const scrollParent = getEditorScrollParent(editorHostRef.current);
      if (scrollParent && state) {
        scrollParent.scrollTop = state.scrollTop;
      }
    }).finally(() => {
      applyingRemoteContentRef.current = false;
    });
  }, []);

  const focusTitleStart = useCallback((editor: Editor) => {
    requestAnimationFrame(() => {
      editor.chain().focus().setTextSelection(1).run();
    });
  }, []);

  const flushActiveNote = useCallback(async () => {
    const editor = editorRef.current;
    const noteId = activeNoteIdRef.current;
    if (!editor || !noteId) return;
    if (!savePreferences.database) return;

    const result = await saveNoteById(noteId, editor.getJSON());
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Save failed');
    }
    await flushPendingNoteSave(noteId);

    await refreshNotes(noteId);
  }, [refreshNotes, savePreferences.database]);

  const syncActiveNoteToDirectory = useCallback(async (mode: 'immediate' | 'throttled' = 'throttled') => {
    const editor = editorRef.current;
    const noteId = activeNoteIdRef.current;
    const preferences = savePreferencesRef.current;
    if (!editor || !noteId || !preferences.directory || !getMarkdownDirectoryName()) return null;

    const runSync = async () => {
      if (directorySyncInFlightRef.current) return null;

      directorySyncInFlightRef.current = true;
      try {
        const title = getNoteTitle(activeNoteRef.current, t);
        const fileName = getMarkdownFileName(noteId, title);
        const directories = savePreferencesRef.current.directoryTree ? getPrimaryTagDirectories(activeNoteRef.current) : [];
        const result = await saveMarkdownToSelectedDirectory(serializeMarkdown(editor.getJSON()), fileName, noteId, directories);

        if (result.path) {
          setLastMarkdownPath(result.path);
        }

        lastDirectorySyncAtRef.current = Date.now();
        return result.path ?? null;
      } finally {
        directorySyncInFlightRef.current = false;
      }
    };

    if (mode === 'immediate') {
      if (directorySyncTimerRef.current !== null) {
        window.clearTimeout(directorySyncTimerRef.current);
        directorySyncTimerRef.current = null;
      }
      return runSync();
    }

    const elapsed = Date.now() - lastDirectorySyncAtRef.current;
    const delay = Math.max(0, DIRECTORY_SYNC_INTERVAL_MS - elapsed);

    if (directorySyncTimerRef.current === null) {
      directorySyncTimerRef.current = window.setTimeout(() => {
        directorySyncTimerRef.current = null;
        void runSync();
      }, delay);
    }

    return null;
  }, [t]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') {
        return;
      }

      event.preventDefault();
      setSaveState({ labelKey: 'savingLocally', tone: 'live', detailKey: null });
      void flushActiveNote()
        .then(() => syncActiveNoteToDirectory('immediate'))
        .then(() => {
          setSaveState({ labelKey: 'saved', tone: 'idle', detailKey: null });
        })
        .catch(() => {
          setSaveState({ labelKey: 'saveFailed', tone: 'error', detailKey: 'saveFailedDetail' });
        });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flushActiveNote, syncActiveNoteToDirectory]);

  useEffect(() => {
    if (!editorHostRef.current) return;

    let disposed = false;
    const editor = createEditor(editorHostRef.current);
    editorRef.current = editor;
    const saveEditorStateDebounced = debounce((noteId: string, selection: { from: number; to: number }, scrollTop: number) => {
      void saveEditorState(noteId, { selection, scrollTop });
    }, 500);

    const unbind = bindEditorEvents(editor, {
      getNoteId: () => activeNoteIdRef.current ?? '',
      shouldSave: () => !applyingRemoteContentRef.current && savePreferencesRef.current.database,
      onSaving: () => setSaveState({ labelKey: 'savingLocally', tone: 'live', detailKey: null }),
      onSaved: async () => {
        void syncActiveNoteToDirectory('throttled');
        void refreshSyncSummary();
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
    const syncActiveContent = () => {
      setActiveContent(editor.getJSON());
      const noteId = activeNoteIdRef.current;
      if (!noteId || applyingRemoteContentRef.current) return;

      const selection = editor.state.selection;
      const scrollTop = getEditorScrollParent(editorHostRef.current)?.scrollTop ?? 0;
      saveEditorStateDebounced(noteId, { from: selection.from, to: selection.to }, scrollTop);
      void syncActiveNoteToDirectory('throttled');
    };
    editor.on('update', syncActiveContent);

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
      editor.off('update', syncActiveContent);
      editor.destroy();
      editorRef.current = null;
      if (directorySyncTimerRef.current !== null) {
        window.clearTimeout(directorySyncTimerRef.current);
        directorySyncTimerRef.current = null;
      }
    };
  }, [refreshNotes, refreshSyncSummary, setEditorContent, syncActiveNoteToDirectory]);

  const resizeSidebar = useCallback((delta: number) => {
    setLayout((current) =>
      fitLayoutToViewport({
        ...current,
        sidebarWidth: clamp(current.sidebarWidth + delta, SIDEBAR_MIN, getSidebarMax(current)),
      }),
    );
  }, []);

  const resizeList = useCallback((delta: number) => {
    setLayout((current) =>
      fitLayoutToViewport({
        ...current,
        listWidth: clamp(current.listWidth + delta, LIST_MIN, getListMax(current)),
      }),
    );
  }, []);

  const workspaceStyle = useMemo(
    () =>
      ({
        '--sidebar-width': layout.focusMode ? '0px' : `${layout.sidebarWidth}px`,
        '--list-width': layout.focusMode ? '0px' : `${layout.listWidth}px`,
        '--context-width': `${getContextWidth(layout)}px`,
        '--editor-width': `${layout.editorWidth}px`,
        '--editor-font-size': `${layout.fontSize}px`,
        '--editor-line-height': layout.lineHeight,
      }) as React.CSSProperties,
    [layout],
  );

  const handleCreateNote = async () => {
    let previousSaveFailed = false;

    try {
      setSaveState({ labelKey: 'savingBeforeNewNote', tone: 'live', detailKey: null });
      try {
        await flushActiveNote();
        await syncActiveNoteToDirectory('immediate');
      } catch {
        previousSaveFailed = true;
        setSaveState({
          labelKey: 'saveFailed',
          tone: 'error',
          detailKey: 'saveFailedCreateDetail',
        });
      }

      const note = await createNote(effectiveActiveTagPath);
      setCurrentNote(note.id);
      activeNoteIdRef.current = note.id;
      setActiveNote(note);

      if (editorRef.current) {
        setEditorContent(editorRef.current, note);
        focusTitleStart(editorRef.current);
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
        await syncActiveNoteToDirectory('immediate');
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
    const noteId = activeNoteIdRef.current;
    if (!editor || !noteId) return;

    try {
      await flushActiveNote();
      await syncActiveNoteToDirectory('immediate');
      const markdown = serializeMarkdown(editor.getJSON());
      const result = await saveMarkdownFile(noteId, markdown, activeTitle);

      if (result.mode === 'cancelled') {
        return;
      }

      if (result.path) {
        setLastMarkdownPath(result.path);
      }

      setSaveState({
        labelKey: result.mode === 'directory' || result.mode === 'file-system' ? 'savedMarkdownDisk' : 'savedMarkdownDownload',
        tone: 'idle',
        detailKey: null,
      });
    } catch {
      try {
        const markdown = serializeMarkdown(editor.getJSON());
        await navigator.clipboard.writeText(markdown);
        setSaveState({ labelKey: 'copiedMarkdown', tone: 'idle', detailKey: null });
      } catch {
        setSaveState({ labelKey: 'saveFailed', tone: 'error', detailKey: 'saveFailedDetail' });
      }
    }
  };

  const handleExportBundle = async () => {
    try {
      if (activeNoteIdRef.current) {
        await flushActiveNote();
        await syncActiveNoteToDirectory('immediate');
      }

      await downloadMarkdownBundle();
      setSaveState({ labelKey: 'savedBundleDownload', tone: 'idle', detailKey: null });
    } catch {
      setSaveState({ labelKey: 'saveFailed', tone: 'error', detailKey: 'saveFailedDetail' });
    }
  };

  const handleChooseSaveLocation = async () => {
    try {
      const result = await chooseMarkdownDirectory();

      if (result.mode === 'selected') {
        setMarkdownDirectoryName(result.name);
        const noteId = activeNoteIdRef.current;
        const directories = savePreferences.directoryTree ? getPrimaryTagDirectories(activeNoteRef.current) : [];
        const fileName = noteId ? getMarkdownFileName(noteId, activeTitle) : undefined;
        setLastMarkdownPath(getMarkdownDirectoryPath(fileName, directories));
        setSavePreferences((current) => ({ ...current, directory: true }));
        await flushActiveNote();
        await syncActiveNoteToDirectory('immediate');
        setSaveState({ labelKey: 'saveLocationSelected', tone: 'idle', detailKey: null });
        return;
      }

      if (result.mode === 'unsupported' || result.mode === 'denied') {
        setSaveState({ labelKey: 'saveFailed', tone: 'error', detailKey: 'saveFailedDetail' });
      }
    } catch {
      setSaveState({ labelKey: 'saveFailed', tone: 'error', detailKey: 'saveFailedDetail' });
    }
  };

  const handleClearSaveLocation = () => {
    clearMarkdownDirectory();
    setMarkdownDirectoryName(null);
    setLastMarkdownPath(null);
    setSaveState({ labelKey: 'saveLocationCleared', tone: 'idle', detailKey: null });
  };

  const updateSavePreference = (key: keyof SavePreferences, value: boolean) => {
    if (key === 'directory' && value && !getMarkdownDirectoryName()) {
      setSaveState({ labelKey: 'saveFailed', tone: 'error', detailKey: 'saveFailedDetail' });
      return;
    }

    if (key === 'database' && !value && !savePreferences.directory) {
      setSaveState({ labelKey: 'saveFailed', tone: 'error', detailKey: 'saveFailedDetail' });
      return;
    }

    if (key === 'directory' && !value && !savePreferences.database) {
      setSaveState({ labelKey: 'saveFailed', tone: 'error', detailKey: 'saveFailedDetail' });
      return;
    }

    setSavePreferences((current) => ({ ...current, [key]: value }));

    if (key === 'directory' || key === 'directoryTree') {
      window.setTimeout(() => {
        void syncActiveNoteToDirectory('immediate');
      });
    }
  };

  const handleCheckIntegrity = async () => {
    try {
      const result = await checkDataIntegrity();
      if (result.ok) {
        setSaveState({ labelKey: 'integrityOk', tone: 'idle', detailKey: null });
        return;
      }

      console.warn('[DATA_INTEGRITY]', result.issues);
      setSaveState({ labelKey: 'integrityFailed', tone: 'error', detailKey: null });
    } catch {
      setSaveState({ labelKey: 'integrityFailed', tone: 'error', detailKey: null });
    }
  };

  const handleManualCloudSync = async () => {
    try {
      setSaveState({ labelKey: 'syncRunning', tone: 'live', detailKey: null });
      await flushActiveNote();
      const summary = await runCloudSync();
      setSaveState(
        summary.failed > 0 || summary.openConflicts > 0
          ? { labelKey: 'syncFailed', tone: 'error', detailKey: null }
          : { labelKey: 'syncComplete', tone: 'idle', detailKey: null },
      );
    } catch {
      setSaveState({ labelKey: 'syncFailed', tone: 'error', detailKey: null });
    }
  };

  const handleSaveRestSyncConfig = () => {
    setRestSyncConfig(restSyncForm.endpoint, restSyncForm.token);
    setRestSyncForm(loadRestSyncForm());
    setSaveState({ labelKey: 'syncConfigSaved', tone: 'idle', detailKey: null });
  };

  const focusEditor = () => editorRef.current?.chain().focus();

  const toggleHeading = () => {
    focusEditor()?.toggleHeading({ level: 2 }).run();
  };

  const insertTaskItem = () => {
    focusEditor()?.insertContent({ type: 'taskItem', attrs: { checked: false } }).run();
  };

  const toggleBulletList = () => {
    focusEditor()?.toggleBulletList().run();
  };

  const toggleBold = () => {
    focusEditor()?.toggleBold().run();
  };

  const toggleItalic = () => {
    focusEditor()?.toggleItalic().run();
  };

  const insertTag = () => {
    focusEditor()
      ?.insertContent({
        type: 'text',
        text: '#标签',
        marks: [{ type: 'tag', attrs: { path: '标签' } }],
      })
      .insertContent(' ')
      .run();
  };

  const insertMention = () => {
    focusEditor()?.insertContent('@关联笔记 ').run();
  };

  const insertGrid = () => {
    focusEditor()
      ?.insertTable({ rows: 2, cols: 2, withHeaderRow: true })
      .run();
  };

  const activeTitle = getNoteTitle(activeNote, t);
  const activeStats = getNoteStats(activeContent ?? activeNote?.content ?? null);
  const activeOutline = getNoteOutline(activeContent ?? activeNote?.content ?? null);
  const activeAnalysis = useMemo(
    () => analyzeNoteContent((activeContent as Record<string, unknown> | null) ?? activeNote?.content ?? null),
    [activeContent, activeNote],
  );
  const relatedLocalNotes = useMemo(
    () => findRelatedNotes(activeNote, notes),
    [activeNote, notes],
  );
  const tagIndex = useMemo(() => buildTagIndex(notes), [notes]);
  const tagTree = useMemo(() => buildTagTreeFromIndex(tagIndex), [tagIndex]);
  const hasActiveTag = useMemo(() => {
    if (!activeTagPath) return true;
    return notes.some((note) => noteMatchesTagPath(note, activeTagPath));
  }, [activeTagPath, notes]);
  const effectiveActiveTagPath = hasActiveTag ? activeTagPath : null;
  const filteredNotes = useMemo(
    () => notes.filter((note) => noteMatchesTagPath(note, effectiveActiveTagPath)),
    [effectiveActiveTagPath, notes],
  );
  const listTitle = effectiveActiveTagPath ?? t('allNotes');
  const markdownPathPreview = useMemo(() => {
    const noteId = activeNoteIdRef.current;
    const fileName = noteId ? getMarkdownFileName(noteId, activeTitle) : undefined;
    const directories = savePreferences.directoryTree ? getPrimaryTagDirectories(activeNote) : [];

    return lastMarkdownPath ?? getMarkdownDirectoryPath(fileName, directories) ?? markdownDirectoryName ?? '未选择';
  }, [activeNote, activeTitle, lastMarkdownPath, markdownDirectoryName, savePreferences.directoryTree]);

  return (
    <div className={`aw-desktop ${layout.contextOpen ? 'has-context' : ''} ${layout.focusMode ? 'is-focus-mode' : ''} ${showMarkdownSyntax ? 'show-markdown-syntax' : ''}`} style={workspaceStyle}>
      <aside className="aw-sidebar">
        <div className="aw-sidebar__brand">
          <img className="aw-sidebar-logo" src="/logo.JPG" alt={t('brand')} />
          <button
            className="aw-settings-button"
            onClick={() => setPreferencesOpen((current) => !current)}
            type="button"
            aria-label="打开设置"
            title="设置"
          >
            ⚙
          </button>
        </div>
        {preferencesOpen ? (
          <aside className="aw-preferences" aria-label="Preferences">
            <button
              className="aw-preferences__close"
              onClick={() => setPreferencesOpen(false)}
              type="button"
              aria-label="关闭设置"
              title="关闭"
            >
              ×
            </button>
            <nav>
              {preferenceTabs.map(({ id, icon, label }) => (
                <button
                  className={preferenceTab === id ? 'is-active' : ''}
                  key={id}
                  onClick={() => setPreferenceTab(id)}
                >
                  <span><PrefIcon name={icon} /></span>
                  {label}
                </button>
              ))}
            </nav>
            <div className="aw-preferences__body">
              {preferenceTab === 'general' ? (
                <section>
                  <h2>通用</h2>
                  <label className="aw-check-row">
                    <input checked={!showMarkdownSyntax} onChange={() => setShowMarkdownSyntax(false)} type="checkbox" />
                    <span>隐藏 Markdown 符号</span>
                  </label>
                  <label className="aw-check-row">
                    <input defaultChecked type="checkbox" />
                    <span>粘贴网址时自动填写标题</span>
                  </label>
                  <label className="aw-check-row">
                    <input defaultChecked type="checkbox" />
                    <span>自动完成标签、维基链接、表情符号</span>
                  </label>
                  <label className="aw-select-row">
                    <span>新笔记开头使用</span>
                    <select defaultValue="h1">
                      <option value="h1">一级标题</option>
                      <option value="h2">二级标题</option>
                      <option value="p">正文</option>
                    </select>
                  </label>
                  <button onClick={() => updateLayout(setLayout, (current) => ({ ...current, focusMode: !current.focusMode }))}>
                    打开主窗口 <strong>{layout.focusMode ? '专注中' : '普通'}</strong>
                  </button>
                  <button onClick={() => { void handleCreateNote(); }}>
                    创建新笔记 <strong>立即</strong>
                  </button>
                </section>
              ) : null}
              {preferenceTab === 'format' ? (
                <section>
                  <h2>格式</h2>
                  <div className="aw-font-row"><button>Aa</button><span>BearSansUI-Regular</span></div>
                  <div className="aw-font-row"><button>Aa</button><strong>BearSansUIHeading-Regular</strong></div>
                  <div className="aw-font-row"><button>Aa</button><code>RobotoMono-Regular</code></div>
                  <label>
                    <span>字体大小</span>
                    <input min={FONT_SIZE_MIN} max={FONT_SIZE_MAX} type="range" value={layout.fontSize} onChange={(event) => setLayout((current) => ({ ...current, fontSize: Number(event.target.value) }))} />
                    <strong>{layout.fontSize} pt</strong>
                  </label>
                  <label>
                    <span>行高</span>
                    <input max={LINE_HEIGHT_MAX} min={LINE_HEIGHT_MIN} step="0.05" type="range" value={layout.lineHeight} onChange={(event) => setLayout((current) => ({ ...current, lineHeight: Number(event.target.value) }))} />
                    <strong>{layout.lineHeight.toFixed(2)} em</strong>
                  </label>
                  <label>
                    <span>行宽</span>
                    <input max={EDITOR_WIDTH_MAX} min={EDITOR_WIDTH_MIN} step="20" type="range" value={layout.editorWidth} onChange={(event) => setLayout((current) => ({ ...current, editorWidth: Number(event.target.value) }))} />
                    <strong>{layout.editorWidth}px</strong>
                  </label>
                  <button onClick={() => setLayout((current) => ({ ...current, editorWidth: EDITOR_WIDTH_DEFAULT, fontSize: FONT_SIZE_DEFAULT, lineHeight: LINE_HEIGHT_DEFAULT }))}>
                    恢复编辑器默认值
                  </button>
                </section>
              ) : null}
              {preferenceTab === 'theme' ? (
                <section>
                  <h2>主题</h2>
                  <div className="aw-theme-grid">
                    {themeOptions.map((theme, index) => (
                      <button className={index === 0 ? 'is-active' : ''} key={theme}>
                        <strong>{theme}</strong>
                        <span>Lorem ipsum dolor sit amet, semper pharetra.</span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
              {preferenceTab === 'icons' ? (
                <section>
                  <h2>图标</h2>
                  <button>笔记分类图标 <strong>默认</strong></button>
                  <button>标签图标 <strong>自动</strong></button>
                  <button>恢复图标默认值</button>
                </section>
              ) : null}
              {preferenceTab === 'sync' ? (
                <section className="aw-sync-panel">
                  <h2>保存与同步</h2>
                  <div className="aw-save-targets">
                    <label className="aw-check-row">
                      <input
                        checked={savePreferences.database}
                        onChange={(event) => updateSavePreference('database', event.target.checked)}
                        type="checkbox"
                      />
                      <span>保存到数据库 IndexedDB</span>
                    </label>
                    <label className="aw-check-row">
                      <input
                        checked={savePreferences.directory}
                        disabled={!markdownDirectoryName}
                        onChange={(event) => updateSavePreference('directory', event.target.checked)}
                        type="checkbox"
                      />
                      <span>保存到本地 Markdown 文件夹</span>
                    </label>
                    <label className="aw-check-row">
                      <input
                        checked={savePreferences.directoryTree}
                        disabled={!savePreferences.directory}
                        onChange={(event) => updateSavePreference('directoryTree', event.target.checked)}
                        type="checkbox"
                      />
                      <span>按照标签目录树创建文件夹层级</span>
                    </label>
                  </div>
                  <div className="aw-save-location">
                    <span>Markdown 保存位置</span>
                    <strong title={markdownPathPreview}>
                      {markdownPathPreview}
                    </strong>
                    <div>
                      <button disabled={!supportsDirectoryPicker()} onClick={() => { void handleChooseSaveLocation(); }}>
                        选择文件夹
                      </button>
                      <button disabled={!markdownDirectoryName} onClick={handleClearSaveLocation}>
                        清除
                      </button>
                    </div>
                  </div>
                  <p>
                    {supportsDirectoryPicker()
                      ? '可以单独保存到数据库、单独保存到本地文件夹，或两者同时保存。启用目录树后，会按笔记第一个标签路径创建子文件夹。浏览器不会向网页暴露磁盘绝对路径。'
                      : '当前浏览器不支持选择文件夹，导出时会使用下载或文件保存对话框。'}
                  </p>
                  <p><strong>当前策略：</strong> {savePreferences.database ? '数据库' : ''}{savePreferences.database && savePreferences.directory ? ' + ' : ''}{savePreferences.directory ? '本地文件夹' : ''}</p>
                  <div className="aw-rest-sync-config">
                    <label>
                      <span>REST 同步地址</span>
                      <input
                        onChange={(event) => setRestSyncForm((current) => ({ ...current, endpoint: event.target.value }))}
                        placeholder="https://nas.example.com/minddock-sync"
                        type="url"
                        value={restSyncForm.endpoint}
                      />
                    </label>
                    <label>
                      <span>访问令牌</span>
                      <input
                        onChange={(event) => setRestSyncForm((current) => ({ ...current, token: event.target.value }))}
                        placeholder="Bearer token"
                        type="password"
                        value={restSyncForm.token}
                      />
                    </label>
                    <button onClick={handleSaveRestSyncConfig}>
                      保存同步配置
                    </button>
                  </div>
                  <div className="aw-cloud-sync-status">
                    <div>
                      <span>云端队列</span>
                      <strong>
                        {cloudSyncState.summary.pending + cloudSyncState.summary.failed} 待处理
                      </strong>
                    </div>
                    <div>
                      <span>冲突</span>
                      <strong>{cloudSyncState.summary.openConflicts}</strong>
                    </div>
                    <div>
                      <span>失败</span>
                      <strong>{cloudSyncState.summary.failed}</strong>
                    </div>
                    <button disabled={cloudSyncState.running} onClick={() => { void handleManualCloudSync(); }}>
                      {cloudSyncState.running ? t('syncRunning') : t('syncNow')}
                    </button>
                  </div>
                </section>
              ) : null}
            </div>
          </aside>
        ) : null}

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
              <div className="aw-note-list__footer">
                {note.id === activeNote?.id ? (
                  <div className="aw-save-stack">
                    <span className="aw-status-pill" data-tone={saveState.tone}>{t(saveState.labelKey)}</span>
                    <small>{formatNoteTime(note.updatedAt)}</small>
                  </div>
                ) : null}
                <small>{formatNoteDate(note.updatedAt)}</small>
              </div>
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

      <main className="aw-editor-shell" ref={editorShellRef}>
        <div className={`aw-editor-toolbar ${editorNavbarVisible || moreMenuOpen || inspectorOpen ? 'is-visible' : 'is-hidden'}`}>
          <div className="aw-editor-titleline">
            <button aria-label="Back">‹</button>
            <button aria-label="Forward">›</button>
            <strong>{activeTitle}</strong>
          </div>
          <div className="aw-editor-tools">
            <button
              aria-label={formatToolbarOpen ? '隐藏功能区' : '显示功能区'}
              aria-expanded={formatToolbarOpen}
              className={formatToolbarOpen ? 'is-active aw-biu-toggle' : 'aw-biu-toggle'}
              onClick={() => setFormatToolbarOpen((current) => !current)}
            >
              B<em>I</em><u>U</u>
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
              aria-label="More"
              aria-expanded={moreMenuOpen}
              className={moreMenuOpen ? 'is-active' : ''}
              onClick={() => setMoreMenuOpen((current) => !current)}
            >
              ⋮
            </button>
          </div>
        </div>
        {moreMenuOpen ? (
          <div className="aw-more-menu" role="menu">
            <button role="menuitem">拷贝笔记链接</button>
            <button role="menuitem">复制笔记的标识符</button>
            <button role="menuitem" onClick={() => { void handleExportMarkdown(); setMoreMenuOpen(false); }}>导出笔记...</button>
            <button role="menuitem" onClick={() => { void handleExportBundle(); setMoreMenuOpen(false); }}>导出资料包...</button>
            <button role="menuitem" onClick={() => { void handleCheckIntegrity(); setMoreMenuOpen(false); }}>切换数据</button>
            <button role="menuitem">删除</button>
            <button role="menuitem">归档</button>
            <button role="menuitem">加密与锁定</button>
          </div>
        ) : null}
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
                    <strong>{activeNote ? new Date(activeNote.createdAt ?? activeNote.updatedAt).toLocaleString('zh-CN') : '-'}</strong>
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
              <div className="aw-popover-context">
                <section className="aw-context-command">
                  <h2>{t('aiSummary')}</h2>
                  <p>{activeAnalysis.summary || t('contextSummary')}</p>
                </section>

                <section>
                  <h2>{t('timeline')}</h2>
                  {activeAnalysis.timeline.length > 0 ? (
                    <ol className="aw-timeline">
                      {activeAnalysis.timeline.map((item) => (
                        <li key={item.id}>{item.text}</li>
                      ))}
                    </ol>
                  ) : <p className="aw-context-empty">{t('noTimeline')}</p>}
                </section>

                <section>
                  <h2>{t('relatedNotes')}</h2>
                  {relatedLocalNotes.length > 0 ? relatedLocalNotes.map((item) => (
                    <button key={item.id} onClick={() => { void handleSwitchNote(item.id); }}>
                      {item.title}
                    </button>
                  )) : <p className="aw-context-empty">{t('noRelatedNotes')}</p>}
                </section>
              </div>
            ) : null}
          </aside>
        ) : null}
        <article className="aw-editor">
          {saveState.detailKey ? (
            <div className="aw-inline-alert" role="status" aria-live="polite">
              {t(saveState.detailKey)}
            </div>
          ) : null}

          <div ref={editorHostRef} className="aw-editor-host" />
          <div className={`aw-format-dock ${formatToolbarOpen ? 'is-open' : 'is-closed'}`}>
            {formatToolbarOpen ? (
              <div className="aw-floating-toolbar" role="toolbar" aria-label="编辑功能区">
                <button type="button" aria-label="标题" onClick={toggleHeading}>H⌄</button>
                <button type="button" aria-label="待办事项" onClick={insertTaskItem}>☑</button>
                <button type="button" aria-label="项目列表" onClick={toggleBulletList}>≡⌄</button>
                <button type="button" aria-label="加粗" onClick={toggleBold}><strong>B</strong></button>
                <button type="button" aria-label="斜体" onClick={toggleItalic}><em>I</em></button>
                <button type="button" aria-label="插入标签" onClick={insertTag}>⌫</button>
                <button type="button" aria-label="插入关联" onClick={insertMention}>@</button>
                <button type="button" aria-label="插入 2x2 表格" onClick={insertGrid}>▦</button>
                <button type="button" aria-label="更多">⋮</button>
              </div>
            ) : null}
          </div>
        </article>
      </main>

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
      <DesktopWorkspace language={language} t={t} />
    </div>
  );
}
