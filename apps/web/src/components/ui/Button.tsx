import React from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  className = '',
  disabled = false,
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-xl transition-all duration-[var(--duration-normal)] cursor-pointer font-medium';
  
  const variantClasses = {
    primary: 'bg-[var(--accent-primary)] text-white hover:bg-opacity-90',
    secondary: 'bg-[var(--surface-white)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]',
    ghost: 'text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]',
  };

  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  };

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]';

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
