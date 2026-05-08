import React from 'react';
import { Card } from './ui/Card';
import { Typography } from './ui/Typography';
import { Button } from './ui/Button';

interface RelatedNote {
  id: string;
  title: string;
}

interface TimelineEvent {
  id: string;
  title: string;
  time: string;
}

interface ContextPanelProps {
  relatedNotes: RelatedNote[];
  timeline: TimelineEvent[];
  onAIAsk: () => void;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({
  relatedNotes,
  timeline,
  onAIAsk,
}) => {
  return (
    <div className="space-y-5">
      {/* Related Notes */}
      <Card>
        <Typography variant="small" weight="semibold" className="mb-4">Related Notes</Typography>

        <div className="space-y-3">
          {relatedNotes.map((note) => (
            <div
              key={note.id}
              className="hover:text-[var(--text-primary)] text-[var(--text-tertiary)] cursor-pointer transition-colors"
            >
              <Typography variant="small">{note.title}</Typography>
            </div>
          ))}
        </div>
      </Card>

      {/* AI Timeline */}
      <Card>
        <Typography variant="small" weight="semibold" className="mb-4">AI Timeline</Typography>

        <div className="space-y-4 relative">
          <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--border-medium)] ml-2">
          </div>
          
          {timeline.map((event, index) => (
            <div key={event.id} className="pl-4 relative text-sm text-[var(--text-tertiary)]">
              <div className="absolute w-2 h-2 rounded-full bg-[var(--text-primary)] left-[-5px] top-2" />
              {event.time}
            </div>
          ))}
        </div>
      </Card>

      {/* AI Chat */}
      <Card className="bg-[var(--accent-ai)] text-white">
        <Typography variant="small" weight="semibold" className="mb-3">
          Ask AI About This Note
        </Typography>
        
        <Typography variant="small" className="text-white/70 leading-6 mb-5">
          Generate summary, identify key arguments, create timeline or compare dynasties.
        </Typography>

        <Button 
          variant="ghost" 
          className="w-full bg-white/10 text-white/50 hover:bg-white/20"
          onClick={onAIAsk}
        >
          Ask anything...
        </Button>
      </Card>
    </div>
  );
};
