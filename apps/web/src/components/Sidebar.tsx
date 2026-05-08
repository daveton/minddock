import React from 'react';
import { Button } from './ui/Button';
import { Typography } from './ui/Typography';

export const Sidebar: React.FC = () => {
  return (
    <>
      {/* Header */}
      <div className="h-14 px-5 flex items-center justify-between border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[var(--radius-xl)] bg-[var(--text-primary)] text-white flex items-center justify-center text-sm font-semibold">
            M
          </div>
          <div>
            <Typography variant="small" weight="semibold">MindDock</Typography>
            <Typography variant="meta" className="text-[var(--text-tertiary)]">AI Knowledge OS</Typography>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="px-3 py-4 space-y-1">
        {['Today', 'Research', 'Writing', 'History', 'AI', 'Design'].map((item, i) => (
          <div
            key={item}
            className={`h-10 rounded-[var(--radius-xl)] px-3 flex items-center transition-all duration-[var(--duration-normal)] cursor-pointer ${
              i === 4 ? 'bg-[var(--border-medium)] text-[var(--text-primary)] font-medium' : 'hover:bg-[var(--border-subtle)] text-[var(--text-tertiary)]'
            }`}
          >
            <Typography variant="small">{item}</Typography>
          </div>
        ))}
      </div>

      {/* AI Assistant */}
      <div className="mt-auto p-4 border-t border-[var(--border-subtle)]">
        <div className="rounded-[var(--radius-2xl)] bg-[var(--surface-white)] border border-[var(--border-subtle)] p-4">
          <Typography variant="meta" className="text-[var(--text-tertiary)] mb-2">AI Assistant</Typography>
          <Typography variant="small" className="text-[var(--text-secondary)] leading-6">
            Ask anything about your notes, build timelines, summarize ideas.
          </Typography>
          <Button size="sm" className="mt-4 w-full">
            Open Command Bar
          </Button>
        </div>
      </div>
    </>
  );
};
