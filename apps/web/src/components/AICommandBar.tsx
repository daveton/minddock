import React, { useState, useRef, useEffect } from 'react';
import { Card } from './ui/Card';
import { Typography } from './ui/Typography';
import { Button } from './ui/Button';
import { getAIService, AIResponse } from '../services/ai';

interface AICommandBarProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteCommand: (command: string, result: string) => void;
}

export const AICommandBar: React.FC<AICommandBarProps> = ({
  isOpen,
  onClose,
  onExecuteCommand,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const aiService = getAIService();

  const commandSuggestions = [
    '总结当前笔记',
    '生成时间线',
    '提取关键观点',
    '翻译为英文',
    '扩展内容',
    '创建关联笔记',
    '分析主题',
    '生成大纲',
  ];

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const filteredSuggestions = commandSuggestions.filter(suggestion =>
      suggestion.toLowerCase().includes(query.toLowerCase())
    );
    setSuggestions(filteredSuggestions);
  }, [query]);

  const handleExecute = async () => {
    if (!query.trim()) return;

    setLoading(true);
    
    // Simple command parsing
    let response: AIResponse;
    
    if (query.includes('总结') || query.includes('摘要')) {
      response = await aiService.generateSummary('当前笔记内容');
    } else if (query.includes('时间线') || query.includes('timeline')) {
      response = await aiService.generateTimeline('当前笔记内容');
    } else if (query.includes('翻译') || query.includes('translate')) {
      response = await aiService.translate('当前笔记内容', '英文');
    } else if (query.includes('扩展') || query.includes('expand')) {
      response = await aiService.expand('当前笔记内容');
    } else {
      // Default: ask about the note
      response = await aiService.askAboutNote(query, '当前笔记内容');
    }

    setLoading(false);

    if (response.success && response.data) {
      onExecuteCommand(query, response.data);
      setQuery('');
      onClose();
    } else {
      console.error('[AI_COMMAND_BAR] Command failed:', response.error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleExecute();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    inputRef.current?.focus();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-[20vh] z-50">
      <Card className="w-full max-w-2xl mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Typography variant="h3">AI 命令栏</Typography>
            <Button variant="ghost" onClick={onClose}>
              ✕
            </Button>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入 AI 命令..."
                className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl focus:outline-none focus:border-[var(--accent-primary)]"
                disabled={loading}
              />
              
              {loading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin w-4 h-4 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>

            {suggestions.length > 0 && query && (
              <div className="space-y-1">
                <Typography variant="meta" className="text-[var(--text-tertiary)]">
                  建议命令：
                </Typography>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-3 py-1 bg-[var(--border-subtle)] rounded-full text-sm hover:bg-[var(--border-medium)] transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Typography variant="meta" className="text-[var(--text-tertiary)]">
                按 Enter 执行，Esc 取消
              </Typography>
              <Button
                onClick={handleExecute}
                disabled={!query.trim() || loading}
                className="min-w-[80px]"
              >
                {loading ? '执行中...' : '执行'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

// Hook for managing AI command bar
export function useAICommandBar() {
  const [isOpen, setIsOpen] = useState(false);

  const openCommandBar = () => setIsOpen(true);
  const closeCommandBar = () => setIsOpen(false);

  const handleCommand = (command: string, result: string) => {
    console.log('[AI_COMMAND_BAR] Command executed:', command);
    console.log('[AI_COMMAND_BAR] Result:', result);
    // Here you would handle the command result, e.g., insert into editor
  };

  return {
    isOpen,
    openCommandBar,
    closeCommandBar,
    handleCommand,
  };
}
