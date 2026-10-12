import React from 'react';

interface PostPilotLogoProps {
  size?: number;
  className?: string;
  useCompanyAccent?: boolean;
}

export const PostPilotLogo: React.FC<PostPilotLogoProps> = ({
  size = 28,
  className = '',
  useCompanyAccent = false,
}) => {
  // Thin 2px ring/border that uses var(--accent) and follows active profile
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
