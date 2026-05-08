import React from 'react';
import { cn } from '../../utils/cn';

interface ColorSchemeProps {
  children: React.ReactNode;
  className?: string;
}

export const ColorScheme: React.FC<ColorSchemeProps> = ({ children, className }) => {
  return (
    <div className={cn('text-[var(--text-primary)] bg-[var(--bg-primary)]', className)}>
      {children}
    </div>
  );
};

// Semantic color utilities
export const semanticColors = {
  text: {
    primary: 'text-[var(--text-primary)]',
    secondary: 'text-[var(--text-secondary)]',
    tertiary: 'text-[var(--text-tertiary)]',
    quaternary: 'text-[var(--text-quaternary)]',
    disabled: 'text-[var(--text-disabled)]',
    link: 'text-[var(--text-link)]',
    success: 'text-[var(--success)]',
    warning: 'text-[var(--warning)]',
    error: 'text-[var(--error)]',
    info: 'text-[var(--info)]',
  },
  background: {
    primary: 'bg-[var(--bg-primary)]',
    secondary: 'bg-[var(--bg-secondary)]',
    tertiary: 'bg-[var(--bg-tertiary)]',
    hover: 'bg-[var(--bg-hover)]',
    active: 'bg-[var(--bg-active)]',
    white: 'bg-[var(--surface-white)]',
    cream: 'bg-[var(--surface-cream)]',
    elevated: 'bg-[var(--surface-elevated)]',
    success: 'bg-[var(--success)]',
    warning: 'bg-[var(--warning)]',
    error: 'bg-[var(--error)]',
    info: 'bg-[var(--info)]',
  },
  border: {
    subtle: 'border-[var(--border-subtle)]',
    medium: 'border-[var(--border-medium)]',
    strong: 'border-[var(--border-strong)]',
    accent: 'border-[var(--accent-primary)]',
    success: 'border-[var(--success)]',
    warning: 'border-[var(--warning)]',
    error: 'border-[var(--error)]',
    info: 'border-[var(--info)]',
  },
  accent: {
    primary: 'text-[var(--accent-primary)]',
    secondary: 'text-[var(--accent-secondary)]',
    ai: 'text-[var(--accent-ai)]',
    aiHover: 'text-[var(--accent-ai-hover)]',
    primaryBg: 'bg-[var(--accent-primary)]',
    secondaryBg: 'bg-[var(--accent-secondary)]',
    aiBg: 'bg-[var(--accent-ai)]',
    aiHoverBg: 'bg-[var(--accent-ai-hover)]',
  },
} as const;

// Hook for accessing color scheme
export function useColorScheme() {
  return {
    colors: semanticColors,
    isDark: false, // Could be extended for dark mode
    toggleTheme: () => {}, // Could be extended for theme switching
  };
}

// Component for semantic color classes
interface SemanticColorProps {
  variant?: keyof typeof semanticColors.text;
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export const SemanticText: React.FC<SemanticColorProps> = ({
  variant = 'primary',
  children,
  className,
  as: Component = 'span',
}) => {
  const colorClass = semanticColors.text[variant];
  
  return (
    <Component className={cn(colorClass, className)}>
      {children}
    </Component>
  );
};

interface SemanticBackgroundProps {
  variant?: keyof typeof semanticColors.background;
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export const SemanticBackground: React.FC<SemanticBackgroundProps> = ({
  variant = 'primary',
  children,
  className,
  as: Component = 'div',
}) => {
  const colorClass = semanticColors.background[variant];
  
  return (
    <Component className={cn(colorClass, className)}>
      {children}
    </Component>
  );
};

interface SemanticBorderProps {
  variant?: keyof typeof semanticColors.border;
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export const SemanticBorder: React.FC<SemanticBorderProps> = ({
  variant = 'subtle',
  children,
  className,
  as: Component = 'div',
}) => {
  const colorClass = semanticColors.border[variant];
  
  return (
    <Component className={cn('border', colorClass, className)}>
      {children}
    </Component>
  );
};
