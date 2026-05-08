import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Typography } from './ui/Typography';
import { Button } from './ui/Button';
import { getAIService, AIResponse } from '../services/ai';

interface InlineAIProps {
  selectedText: string;
  position: { x: number; y: number };
  onClose: () => void;
}

export const InlineAI: React.FC<InlineAIProps> = ({
  selectedText,
  position,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [showResult, setShowResult] = useState(false);
  const aiService = getAIService();

  const handleAction = async (action: 'summarize' | 'expand' | 'translate') => {
    setLoading(true);
    setResult('');
    setShowResult(false);

    let response: AIResponse;

    switch (action) {
      case 'summarize':
        response = await aiService.summarize(selectedText);
        break;
      case 'expand':
        response = await aiService.expand(selectedText);
        break;
      case 'translate':
        response = await aiService.translate(selectedText);
        break;
      default:
        response = { success: false, error: 'Unknown action' };
    }

    setLoading(false);

    if (response.success && response.data) {
      setResult(response.data);
      setShowResult(true);
    } else {
      console.error('[INLINE_AI] Action failed:', response.error);
      onClose();
    }
  };

  const handleReplace = () => {
    if (result) {
      // This would replace the selected text with the AI result
      // Implementation depends on the editor integration
      console.log('[INLINE_AI] Replace selected text with:', result);
      onClose();
    }
  };

  const handleInsert = () => {
    if (result) {
      // This would insert the AI result after the selected text
      console.log('[INLINE_AI] Insert after selected text:', result);
      onClose();
    }
  };

  return (
    <div 
      className="fixed z-50"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)'
      }}
    >
      {!showResult ? (
        <Card className="shadow-lg border-[var(--border-medium)]">
          <div className="p-2 space-y-1">
            <button
              onClick={() => handleAction('summarize')}
              disabled={loading}
              className="block w-full text-left px-3 py-2 hover:bg-[var(--border-subtle)] rounded text-sm disabled:opacity-50"
            >
              {loading ? '处理中...' : '总结'}
            </button>
            <button
              onClick={() => handleAction('expand')}
              disabled={loading}
              className="block w-full text-left px-3 py-2 hover:bg-[var(--border-subtle)] rounded text-sm disabled:opacity-50"
            >
              {loading ? '处理中...' : '扩写'}
            </button>
            <button
              onClick={() => handleAction('translate')}
              disabled={loading}
              className="block w-full text-left px-3 py-2 hover:bg-[var(--border-subtle)] rounded text-sm disabled:opacity-50"
            >
              {loading ? '处理中...' : '翻译'}
            </button>
          </div>
        </Card>
      ) : (
        <Card className="shadow-lg border-[var(--border-medium)] max-w-sm">
          <div className="p-4">
            <Typography variant="small" weight="semibold" className="mb-2">
              AI 结果
            </Typography>
            <Typography variant="small" className="text-[var(--text-secondary)] mb-4">
              {result}
            </Typography>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={onClose}>
                取消
              </Button>
              <Button size="sm" onClick={handleInsert}>
                插入
              </Button>
              <Button size="sm" onClick={handleReplace}>
                替换
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

// Hook for managing inline AI
export function useInlineAI() {
  const [selectedText, setSelectedText] = useState('');
  const [showInlineAI, setShowInlineAI] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    
    if (text && text.length > 0) {
      setSelectedText(text);
      
      // Get selection position
      const range = selection?.getRangeAt(0);
      if (range) {
        const rect = range.getBoundingClientRect();
        setPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 10,
        });
      }
      
      setShowInlineAI(true);
    } else {
      setShowInlineAI(false);
    }
  };

  const closeInlineAI = () => {
    setShowInlineAI(false);
    setSelectedText('');
  };

  return {
    selectedText,
    showInlineAI,
    position,
    handleTextSelection,
    closeInlineAI,
  };
}
