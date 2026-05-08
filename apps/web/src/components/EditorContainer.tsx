import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Typography } from './ui/Typography';
import { Button } from './ui/Button';

interface Note {
  id: string;
  title: string;
  content: any;
  tags: string[];
  updatedAt: number;
}

interface EditorContainerProps {
  activeNote: Note | null;
  onContentChange: (content: any) => void;
}

export const EditorContainer: React.FC<EditorContainerProps> = ({
  activeNote,
  onContentChange,
}) => {
  const [aiSummary] = useState('');

  return (
    <div className="space-y-8 text-[var(--font-body)] leading-[var(--line-height-loose)] text-[var(--text-secondary)]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-8">
        <Typography variant="small" className="text-[var(--text-quaternary)]">History</Typography>
        <span className="text-[var(--text-quaternary)]">/</span>
        <Typography variant="small" className="text-[var(--text-quaternary)]">Qing Dynasty</Typography>
      </div>

      {/* Title */}
      <Typography variant="h1" className="mb-8">
        {activeNote?.title || 'Untitled Note'}
      </Typography>

      {/* Tags */}
      <div className="flex items-center gap-3 mb-14">
        {activeNote?.tags?.map((tag: string) => (
          <div key={tag} className="px-3 h-8 rounded-full bg-[var(--border-medium)] flex items-center">
            <Typography variant="meta" className="text-[var(--text-tertiary)]">{tag}</Typography>
          </div>
        ))}
      </div>

      {/* AI Summary */}
      {aiSummary && (
        <Card className="mb-8">
          <Typography variant="meta" className="text-[var(--text-tertiary)] mb-4">AI SUMMARY</Typography>
          <Typography variant="body" className="text-[var(--text-secondary)] leading-8">
            {aiSummary}
          </Typography>
        </Card>
      )}

      {/* Editor */}
      <Card>
        <div className="min-h-[400px] p-6">
          <div className="text-[var(--text-tertiary)] text-sm mb-4">
            Editor will be integrated here...
          </div>
        </div>
      </Card>
    </div>
  );
};
