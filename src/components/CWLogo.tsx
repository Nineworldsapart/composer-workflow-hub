import React from 'react';

interface CWLogoProps {
  className?: string;
  size?: number;
}

export function CWLogo({ className = 'w-6 h-6', size }: CWLogoProps): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      <defs>
        {/* High-Reflective Brushed Chrome Plate */}
        <linearGradient id="chromePlate" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="20%" stopColor="#94a3b8" />
          <stop offset="40%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="65%" stopColor="#334155" />
          <stop offset="80%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>

        {/* Specular Edge Rim */}
        <linearGradient id="chromeRim" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>

        {/* Glowing Emerald Accent */}
        <linearGradient id="emeraldNeon" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>

        <filter id="chromeShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.8" />
        </filter>
      </defs>

      {/* 3D Chrome Bezel Base */}
      <rect x="6" y="6" width="88" height="88" rx="22" fill="url(#chromePlate)" stroke="url(#chromeRim)" strokeWidth="3" />

      {/* Embedded Inner Groove */}
      <rect x="11" y="11" width="78" height="78" rx="17" fill="#0b0d13" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

      {/* Interlinked C Path in Anodized Emerald */}
      <path
        d="M 46 32 C 40 32 30 36 26 44 C 21 54 22 62 28 68 C 34 74 44 74 48 70"
        stroke="url(#emeraldNeon)"
        strokeWidth="7.5"
        strokeLinecap="round"
        filter="url(#chromeShadow)"
      />

      {/* Interlinked W in Polished Silver Chrome */}
      <path
        d="M 42 38 L 52 70 L 62 44 L 72 70 L 82 38"
        stroke="url(#chromePlate)"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#chromeShadow)"
      />

      {/* LED Power Dot */}
      <circle cx="48" cy="32" r="3.5" fill="#34d399" />
      <circle cx="48" cy="32" r="1.5" fill="#ffffff" />
    </svg>
  );
}
