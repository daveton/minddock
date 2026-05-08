import { createContext, useContext, useState, ReactNode } from 'react';
import { cn } from '../../utils/cn';

type ViewMode = 'focus' | 'explore' | 'research';

interface ViewModeContextType {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
  toggleMode: () => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode must be used within ViewModeProvider');
  }
  return context;
}

interface ViewModeProviderProps {
  children: ReactNode;
  defaultMode?: ViewMode;
}

export function ViewModeProvider({ children, defaultMode = 'focus' }: ViewModeProviderProps) {
  const [mode, setMode] = useState<ViewMode>(defaultMode);

  const toggleMode = () => {
    setMode((prev) => {
      switch (prev) {
        case 'focus':
          return 'explore';
        case 'explore':
          return 'research';
        case 'research':
          return 'focus';
        default:
          return 'focus';
      }
    });
  };

  return (
    <ViewModeContext.Provider value={{ mode, setMode, toggleMode }}>
      {children}
    </ViewModeContext.Provider>
  );
}

interface ViewModeLayoutProps {
  children: ReactNode;
  className?: string;
}

export function ViewModeLayout({ children, className }: ViewModeLayoutProps) {
  const { mode } = useViewMode();

  const modeClasses = {
    focus: 'max-w-[680px] mx-auto',
    explore: 'max-w-[960px] mx-auto',
    research: 'max-w-[1200px] mx-auto',
  };

  return (
    <div className={cn('transition-all duration-[var(--duration-slow)]', modeClasses[mode], className)}>
      {children}
    </div>
  );
}

interface ViewModeToggleProps {
  className?: string;
}

export function ViewModeToggle({ className }: ViewModeToggleProps) {
  const { mode, toggleMode } = useViewMode();

  const modeLabels = {
    focus: '专注',
    explore: '探索',
    research: '研究',
  };

  const modeIcons = {
    focus: '🎯',
    explore: '🔍',
    research: '📊',
  };

  return (
    <button
      onClick={toggleMode}
      className={cn(
        'flex items-center gap-2 px-3 py-1 rounded-lg text-sm bg-[var(--surface-white)] border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-colors duration-[var(--duration-normal)]',
        className
      )}
    >
      <span>{modeIcons[mode]}</span>
      <span>{modeLabels[mode]}</span>
    </button>
  );
}

interface ConditionalRenderProps {
  children: ReactNode;
  mode: ViewMode | ViewMode[];
  fallback?: ReactNode;
}

export function ConditionalRender({ children, mode, fallback = null }: ConditionalRenderProps) {
  const { mode: currentMode } = useViewMode();
  
  const shouldRender = Array.isArray(mode) 
    ? mode.includes(currentMode)
    : currentMode === mode;

  return shouldRender ? <>{children}</> : <>{fallback}</>;
}

// Hook for view mode specific configurations
export function useViewModeConfig() {
  const { mode } = useViewMode();

  const configs = {
    focus: {
      showSidebar: false,
      showContextPanel: false,
      showNoteList: false,
      editorMaxWidth: '680px',
      density: 'minimal',
    },
    explore: {
      showSidebar: true,
      showContextPanel: false,
      showNoteList: true,
      editorMaxWidth: '960px',
      density: 'comfortable',
    },
    research: {
      showSidebar: true,
      showContextPanel: true,
      showNoteList: true,
      editorMaxWidth: '1200px',
      density: 'compact',
    },
  };

  return configs[mode];
}

// Component for adaptive layout based on view mode
interface AdaptiveLayoutProps {
  children: ReactNode;
  className?: string;
}

export function AdaptiveLayout({ children, className }: AdaptiveLayoutProps) {
  const config = useViewModeConfig();

  return (
    <div 
      className={cn(
        'transition-all duration-[var(--duration-slow)]',
        config.showSidebar ? 'grid grid-cols-[240px_1fr]' : 'block',
        config.showContextPanel ? 'grid grid-cols-[1fr_320px]' : 'block',
        className
      )}
      style={{
        maxWidth: config.editorMaxWidth,
      }}
    >
      {children}
    </div>
  );
}
