import React from 'react';

interface CompanyLogoProps {
  size?: number;
  className?: string;
  useCompanyAccent?: boolean;
  variant?: string;
  showChip?: boolean;
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  size = 28,
  className = '',
  useCompanyAccent = false,
}) => {
  // Thin 2px ring/border that uses var(--accent) and changes with active profile
  const borderStyle = useCompanyAccent
    ? { borderColor: '#7CC4F5' }
    : { borderColor: 'var(--accent, #7CC4F5)' };

  return (
    <div
      className={`relative shrink-0 rounded-lg overflow-hidden border-2 bg-[#0A0E1A] flex items-center justify-center p-0 transition-colors duration-300 ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        ...borderStyle,
      }}
    >
      <img
        src="/postpilot-logo.svg"
        alt="PostPilot Logo"
        className="w-full h-full object-cover block select-none p-0 m-0"
      />
    </div>
  );
};
