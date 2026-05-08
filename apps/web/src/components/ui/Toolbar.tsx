import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../utils/cn';
import { ActionButton } from './HoverActions';

interface ToolbarProps {
  children: React.ReactNode;
  className?: string;
  position?: 'top' | 'bottom';
  autoHide?: boolean;
  hideDelay?: number;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  children,
  className = '',
  position = 'top',
  autoHide = true,
  hideDelay = 2000,
}) => {
  const [isVisible, setIsVisible] = useState(!autoHide);
  const [isHovering, setIsHovering] = useState(false);
  const timeoutRef = useRef<number>();

  const showToolbar = () => {
    setIsVisible(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const hideToolbar = () => {
    if (autoHide && !isHovering) {
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, hideDelay);
    }
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
    showToolbar();
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    hideToolbar();
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const positionClasses = {
    top: 'top-0 left-0 right-0',
    bottom: 'bottom-0 left-0 right-0',
  };

  const visibilityClasses = position === 'bottom' 
    ? (isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full')
    : (isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full');

  return (
    <div 
      className={cn(
        'absolute z-10 transition-all duration-[var(--duration-normal)]',
        positionClasses[position],
        visibilityClasses,
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="bg-[var(--surface-white)] border-b border-[var(--border-subtle)] px-4 py-2 flex items-center gap-2">
        {children}
      </div>
    </div>
  );
};

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  isActive?: boolean;
  className?: string;
}

export const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  icon,
  label,
  onClick,
  isActive = false,
  className = '',
}) => {
  const activeClass = isActive ? 'bg-[var(--border-subtle)] text-[var(--text-primary)]' : '';
  
  return (
    <ActionButton
      onClick={onClick}
      className={cn(
        'p-2 rounded-md',
        activeClass,
        className
      )}
    >
      {icon}
    </ActionButton>
  );
};

interface FloatingToolbarProps {
  children: React.ReactNode;
  trigger: React.ReactNode;
  className?: string;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  children,
  trigger,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={cn('relative', className)} ref={toolbarRef}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-[var(--surface-white)] border border-[var(--border-subtle)] rounded-lg shadow-sm p-1 z-50">
          {children}
        </div>
      )}
    </div>
  );
};
