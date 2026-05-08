import React from 'react';
import { Button } from './ui/Button';
import { Typography } from './ui/Typography';

interface Note {
  id: string;
  title: string;
  desc: string;
  updatedAt: string;
  active?: boolean;
}

interface NoteListProps {
  notes: Note[];
  onCreateNote: () => void;
  onSelectNote: (id: string) => void;
}

export const NoteList: React.FC<NoteListProps> = ({
  notes,
  onCreateNote,
  onSelectNote,
}) => {
  return (
    <>
      {/* Header */}
      <div className="h-14 px-5 flex items-center justify-between border-b border-[var(--border-subtle)]">
        <div>
          <Typography variant="small" weight="semibold">History</Typography>
          <Typography variant="meta" className="text-[var(--text-tertiary)]">{notes.length} Notes</Typography>
        </div>

        <Button size="sm" onClick={onCreateNote}>
          +
        </Button>
      </div>

      {/* Notes */}
      <div className="p-3 space-y-2 overflow-auto">
        {notes.map((note) => (
          <div
            key={note.id}
            className={`rounded-[var(--radius-2xl)] p-4 transition-all duration-[var(--duration-normal)] cursor-pointer ${
              note.active
                ? 'bg-[var(--surface-cream)]'
                : 'hover:bg-[var(--border-subtle)]'
            }`}
            onClick={() => onSelectNote(note.id)}
          >
            <Typography variant="small" weight="medium" className="mb-1 leading-6">
              {note.title}
            </Typography>
            <Typography variant="meta" className="text-[var(--text-quaternary)] leading-5 line-clamp-2">
              {note.desc}
            </Typography>
            <Typography variant="caption" className="mt-3 text-[var(--text-disabled)]">
              {note.updatedAt}
            </Typography>
          </div>
        ))}
      </div>
    </>
  );
};
