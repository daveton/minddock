import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../utils/cn';

interface HoverActionsProps {
  children: React.ReactNode;
  actions: React.ReactNode;
  className?: string;
  position?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;
}

export const HoverActions: React.FC<HoverActionsProps> = ({
  children,
  actions,
  className = '',
  position = 'top',
  delay = 150,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const timeoutRef = useRef<number>();

  const handleMouseEnter = () => {
    setIsHovering(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 100);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
  };

  return (
    <div 
      className={cn('relative inline-block', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isHovering && (
        <div 
          className={cn(
            'absolute z-10 opacity-0 transition-all duration-[var(--duration-normal)]',
            positionClasses[position],
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          )}
        >
          <div className="bg-[var(--surface-white)] border border-[var(--border-subtle)] rounded-lg shadow-sm p-1">
            {actions}
          </div>
        </div>
      )}
    </div>
  );
};

interface ActionButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'danger';
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  children,
  onClick,
  className = '',
  variant = 'default',
}) => {
  const baseClasses = 'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors duration-[var(--duration-fast)]';
  
  const variantClasses = {
    default: 'hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
    danger: 'hover:bg-red-50 text-red-500 hover:text-red-600',
  };

  return (
    <button
      className={cn(baseClasses, variantClasses[variant], className)}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
