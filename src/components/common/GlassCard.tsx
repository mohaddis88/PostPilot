import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  hoverEffect = false,
  ...props
}) => {
  return (
    <div
      className={`glass-card relative overflow-hidden transition-all duration-300 ${
        hoverEffect
          ? 'hover:-translate-y-0.5 hover:shadow-lg'
          : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
