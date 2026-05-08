import React, { useState, useEffect } from 'react';
import { WorkspaceLayout } from './layout/WorkspaceLayout';
import { Sidebar } from './Sidebar';
import { NoteList } from './NoteList';
import { EditorContainer } from './EditorContainer';
import { ContextPanel } from './ContextPanel';
import { loadNote, listNotes, createNote } from '../data/repository';

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

export const WorkspaceViewNew: React.FC = () => {
  const [activeNoteId, setActiveNoteId] = useState('note-1');
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);

  // Load notes on mount
  useEffect(() => {
    const loadNotes = async () => {
      const notesList = await listNotes();
      const notesWithDetails = await Promise.all(
        notesList.map(async (noteSummary: NoteSummary) => {
          const note = await loadNote(noteSummary.id);
          return {
            id: noteSummary.id,
            title: noteSummary.id, // For now, use ID as title
            content: note?.content || { type: 'doc', content: [] },
            tags: [],
            updatedAt: noteSummary.updatedAt,
          };
        })
      );
      setNotes(notesWithDetails);
      
      // Load first note by default
      if (notesWithDetails.length > 0 && !activeNoteId) {
        setActiveNoteId(notesWithDetails[0].id);
        setActiveNote(notesWithDetails[0]);
      }
    };

    loadNotes();
  }, [activeNoteId]);

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

  const handleAIAsk = () => {
    console.log('AI Assistant opened');
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
    <WorkspaceLayout
      sidebar={<Sidebar />}
      noteList={
        <NoteList
          notes={notes.map(note => ({
            ...note,
            desc: note.content?.type === 'doc' && note.content.content?.length > 0 
              ? (note.content.content[0] as any)?.content?.[0]?.text || 'No content'
              : 'No content'
          }))}
          onCreateNote={handleCreateNote}
          onSelectNote={handleSelectNote}
        />
      }
      editor={
        <EditorContainer
          activeNote={activeNote}
          onContentChange={(content) => {
            // Update note content
            if (activeNote) {
              const updatedNote = { ...activeNote, content, updatedAt: Date.now() };
              setActiveNote(updatedNote);
              setNotes(prev => prev.map(n => n.id === activeNoteId ? updatedNote : n));
            }
          }}
        />
      }
      contextPanel={
        <ContextPanel
          relatedNotes={mockRelatedNotes}
          timeline={mockTimeline}
          onAIAsk={handleAIAsk}
        />
      }
    />
  );
};
