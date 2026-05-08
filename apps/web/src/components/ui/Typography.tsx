import React from 'react';
import { cn } from '../../utils/cn';

interface TypographyProps {
  variant?: 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'caption' | 'meta';
  children: React.ReactNode;
  className?: string;
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
}

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  children,
  className = '',
  weight = 'normal',
}) => {
  const variantClasses = {
    display: 'text-[var(--font-display)] leading-[var(--line-height-tight)] font-bold tracking-[-0.03em] font-family-[var(--font-family-base)]',
    h1: 'text-[var(--font-h1)] leading-[var(--line-height-tight)] font-bold tracking-[-0.02em] font-family-[var(--font-family-base)]',
    h2: 'text-[var(--font-h2)] leading-[var(--line-height-normal)] font-semibold tracking-[-0.02em] font-family-[var(--font-family-base)]',
    h3: 'text-[var(--font-h3)] leading-[var(--line-height-normal)] font-semibold font-family-[var(--font-family-base)]',
    body: 'text-[var(--font-body)] leading-[var(--line-height-loose)] font-normal font-family-[var(--font-family-base)]',
    small: 'text-[var(--font-small)] leading-[var(--line-height-normal)] font-normal font-family-[var(--font-family-base)]',
    caption: 'text-[var(--font-caption)] leading-[var(--line-height-normal)] font-normal font-family-[var(--font-family-base)]',
    meta: 'text-[var(--font-meta)] leading-[var(--line-height-normal)] font-normal font-family-[var(--font-family-base)]',
  };

  const weightClasses = {
    normal: 'font-[var(--font-weight-normal)]',
    medium: 'font-[var(--font-weight-medium)]',
    semibold: 'font-[var(--font-weight-semibold)]',
    bold: 'font-[var(--font-weight-bold)]',
  };

  return (
    <div className={cn(variantClasses[variant], weightClasses[weight], className)}>
      {children}
    </div>
  );
};
