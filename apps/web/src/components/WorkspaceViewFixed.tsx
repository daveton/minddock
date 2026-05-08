import { useState, useEffect } from 'react';
import { WorkspaceLayout } from './layout/WorkspaceLayout';
import { Sidebar } from './Sidebar';
import { NoteList } from './NoteList';
import { EditorContainer } from './EditorContainer';
import { ContextPanel } from './ContextPanel';
import { InlineAI, useInlineAI } from './InlineAI';
import { AICommandBar, useAICommandBar } from './AICommandBar';
import { ViewModeProvider, ViewModeLayout, ViewModeToggle, useViewModeConfig } from './ui/ViewMode';
import { HoverActions, ActionButton } from './ui/HoverActions';
import { Toolbar } from './ui/Toolbar';
import { loadNote, listNotes, createNote } from '../data/repository';
import { getTabSyncManager } from '../data/tabSync';

interface Note {
  id: string;
  title: string;
  content: any;
  tags: string[];
  updatedAt: number;
}

interface NoteSummary {
  id: string;
  updatedAt: number;
}

function WorkspaceViewInner() {
  const [activeNoteId, setActiveNoteId] = useState('note-1');
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);

  // AI hooks
  const { selectedText, showInlineAI, position, handleTextSelection, closeInlineAI } = useInlineAI();
  const { isOpen: isCommandBarOpen, openCommandBar, closeCommandBar, handleCommand } = useAICommandBar();

  // View mode config
  const viewModeConfig = useViewModeConfig();

  // Tab sync
  const tabSync = getTabSyncManager();

  // Load notes on mount
  useEffect(() => {
    const loadNotes = async () => {
      const notesList = await listNotes();
      const notesWithDetails = await Promise.all(
        notesList.map(async (noteSummary: NoteSummary) => {
          const note = await loadNote(noteSummary.id);
          return {
            id: noteSummary.id,
            title: noteSummary.id,
            content: note?.content || { type: 'doc', content: [] },
            tags: [],
            updatedAt: noteSummary.updatedAt,
          };
        })
      );
      setNotes(notesWithDetails);
      
      if (notesWithDetails.length > 0 && !activeNoteId) {
        setActiveNoteId(notesWithDetails[0].id);
        setActiveNote(notesWithDetails[0]);
      }
    };

    loadNotes();

    // Set up tab sync conflict handler
    tabSync.setConflictCallback((conflictData) => {
      console.log('[WORKSPACE] Conflict detected:', conflictData);
    });

    // Set up keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openCommandBar();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeNoteId]);

  // Handle text selection for inline AI
  useEffect(() => {
    document.addEventListener('mouseup', handleTextSelection);
    return () => document.removeEventListener('mouseup', handleTextSelection);
  }, [handleTextSelection]);

  const handleCreateNote = async () => {
    const newNote = await createNote();
    const noteWithDetails = {
      id: newNote.id,
      title: newNote.id,
      content: newNote.content,
      tags: [],
      updatedAt: newNote.updatedAt,
    };
    setNotes(prev => [noteWithDetails, ...prev]);
    setActiveNoteId(newNote.id);
    setActiveNote(noteWithDetails);
  };

  const handleSelectNote = async (noteId: string) => {
    setActiveNoteId(noteId);
    const note = notes.find(n => n.id === noteId) || null;
    setActiveNote(note);
  };

  const handleContentChange = (content: any) => {
    if (activeNote) {
      const updatedNote = { ...activeNote, content, updatedAt: Date.now() };
      setActiveNote(updatedNote);
      setNotes(prev => prev.map(n => n.id === activeNoteId ? updatedNote : n));
      
      // Broadcast to other tabs
      tabSync.broadcastNoteUpdate(activeNoteId, content, updatedNote.updatedAt);
    }
  };

  const handleAIAsk = () => {
    if (activeNote) {
      openCommandBar();
    }
  };

  const handleCommandResult = (command: string, result: string) => {
    console.log('[WORKSPACE] AI Command executed:', command, result);
  };

  const mockRelatedNotes: Note[] = [
    { id: 'note-2', title: '八旗制度与组织控制', content: null, tags: [], updatedAt: Date.now() - 86400000 },
    { id: 'note-3', title: '明末文官系统为何崩溃', content: null, tags: [], updatedAt: Date.now() - 172800000 },
    { id: 'note-4', title: '清朝如何重塑意识形态', content: null, tags: [], updatedAt: Date.now() - 259200000 },
  ];

  const mockTimeline = [
    { id: '1', title: '1644 清军入关', time: '1644' },
    { id: '2', title: '1645 剃发令发布', time: '1645' },
    { id: '3', title: '1646 江南反抗加剧', time: '1646' },
    { id: '4', title: '1650 政策全面推行', time: '1650' },
  ];

  return (
    <div className="h-screen w-full bg-[var(--bg-primary)] text-[var(--text-primary)] flex overflow-hidden font-sans">
      {/* Inline AI */}
      {showInlineAI && (
        <InlineAI
          selectedText={selectedText}
          position={position}
          onClose={closeInlineAI}
        />
      )}

      {/* AI Command Bar */}
      <AICommandBar
        isOpen={isCommandBarOpen}
        onClose={closeCommandBar}
        onExecuteCommand={handleCommandResult}
      />

      {/* Main Layout */}
      <WorkspaceLayout
        sidebar={viewModeConfig.showSidebar ? <Sidebar /> : null}
        noteList={viewModeConfig.showNoteList ? (
          <NoteList
            notes={notes.map(note => ({
              ...note,
              desc: note.content?.type === 'doc' && note.content.content?.length > 0 
                ? (note.content.content[0] as any)?.content?.[0]?.text || 'No content'
                : 'No content',
              updatedAt: new Date(note.updatedAt).toLocaleString(),
            }))}
            onCreateNote={handleCreateNote}
            onSelectNote={handleSelectNote}
          />
        ) : null}
        editor={
          <div className="relative flex-1">
            {/* Toolbar */}
            <Toolbar autoHide={true}>
              <ViewModeToggle />
              <div className="flex-1" />
              <HoverActions
                actions={
                  <>
                    <ActionButton onClick={() => console.log('Format')}>
                      📝
                    </ActionButton>
                    <ActionButton onClick={() => console.log('Insert')}>
                      ➕
                    </ActionButton>
                    <ActionButton onClick={() => console.log('Share')}>
                      🔗
                    </ActionButton>
                  </>
                }
              >
                <div className="w-8 h-8 bg-[var(--accent-primary)] text-white rounded-lg flex items-center justify-center text-sm">
                  ✏️
                </div>
              </HoverActions>
            </Toolbar>

            {/* Editor with View Mode */}
            <ViewModeLayout className="px-[var(--editor-padding-x)] py-[var(--editor-padding-y)]">
              <EditorContainer
                activeNote={activeNote}
                onContentChange={handleContentChange}
              />
            </ViewModeLayout>
          </div>
        }
        contextPanel={viewModeConfig.showContextPanel ? (
          <ContextPanel
            relatedNotes={mockRelatedNotes}
            timeline={mockTimeline}
            onAIAsk={handleAIAsk}
          />
        ) : null}
      />
    </div>
  );
}

export const WorkspaceViewFinal: React.FC = () => {
  return (
    <ViewModeProvider>
      <WorkspaceViewInner />
    </ViewModeProvider>
  );
};
