import React from 'react';

interface DevDockLogoProps {
  size?: number;
  className?: string;
  withGlow?: boolean;
}

export const DevDockLogo: React.FC<DevDockLogoProps> = ({
  size = 24,
  className = '',
  withGlow = true,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width={size}
      height={size}
      className={`flex-shrink-0 select-none ${className}`}
      fill="none"
    >
      <defs>
        <linearGradient id="ddBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="50%" stopColor="#090E17" />
          <stop offset="100%" stopColor="#04070B" />
        </linearGradient>

        <linearGradient id="ddPrimaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="50%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>

        <linearGradient id="ddAccentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>

        <linearGradient id="ddStrokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#10B981" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.9" />
        </linearGradient>

        {withGlow && (
          <filter id="ddGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        )}
      </defs>

      {/* Container Squircle with cyber stroke */}
      <rect
        x="18"
        y="18"
        width="220"
        height="220"
        rx="52"
        fill="url(#ddBgGrad)"
        stroke="url(#ddStrokeGrad)"
        strokeWidth="5"
      />

      {/* Inner ambient circular radar */}
      <circle
        cx="128"
        cy="128"
        r="82"
        stroke="#10B981"
        strokeWidth="1.5"
        strokeOpacity="0.18"
        strokeDasharray="6 6"
      />

      {/* Terminal Prompt '>' on the left */}
      <path
        d="M 68 86 L 116 128 L 68 170"
        stroke="url(#ddPrimaryGrad)"
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={withGlow ? 'url(#ddGlow)' : undefined}
      />

      {/* Command Terminal Line '_' at bottom right */}
      <path
        d="M 124 170 L 188 170"
        stroke="url(#ddAccentGrad)"
        strokeWidth="16"
        strokeLinecap="round"
        filter={withGlow ? 'url(#ddGlow)' : undefined}
      />

      {/* Lightning Energy Bolt '⚡' at top right */}
      <path
        d="M 148 76 L 176 76 L 158 106 L 190 106 L 138 154 L 150 118 L 126 118 Z"
        fill="url(#ddPrimaryGrad)"
        filter={withGlow ? 'url(#ddGlow)' : undefined}
      />
    </svg>
  );
};
