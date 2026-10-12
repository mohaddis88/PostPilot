import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'accent' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'accent',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'text-xs py-1.5 px-3.5 gap-1.5',
      md: 'text-sm py-2 px-5 gap-2',
      lg: 'text-base py-2.5 px-6 gap-2.5',
    }[size];

    const variantClass = (() => {
      switch (variant) {
        case 'accent':
          return 'btn-accent';
        case 'outline':
          return 'btn-outline';
        case 'ghost':
          return 'bg-transparent text-[var(--text)] hover:bg-[var(--surface)] rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent-text)]';
        case 'danger':
          return 'bg-[var(--status-danger)] text-white hover:opacity-95 rounded-full transition-transform hover:-translate-y-0.5 shadow-sm focus-visible:outline-2 focus-visible:outline-[var(--status-danger)]';
        default:
          return 'btn-accent';
      }
    })();

    return (
      <button
        ref={ref}
        className={`${variantClass} ${sizeClasses} select-none font-medium cursor-pointer inline-flex items-center justify-center ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
