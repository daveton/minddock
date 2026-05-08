import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'subtle' | 'borderless';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = true,
  padding = 'md',
  variant = 'default',
}) => {
  const baseClasses = 'rounded-xl transition-all duration-[var(--duration-normal)]';
  
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const variantClasses = {
    default: 'bg-[var(--surface-white)] border border-[var(--border-subtle)]',
    subtle: 'bg-[var(--bg-secondary)] border-0',
    borderless: 'bg-transparent border-0',
  };

  const hoverClasses = hover ? 'hover:bg-[var(--border-subtle)]' : '';

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${hoverClasses} ${className}`}>
      {children}
    </div>
  );
};
