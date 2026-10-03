import React from 'react';

interface InstagramIconProps {
  className?: string;
  size?: number;
}

export const InstagramIcon: React.FC<InstagramIconProps> = ({ className = 'w-6 h-6', size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="6"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="6" r="1.25" fill="currentColor" />
    </svg>
  );
};

/**
 * Just the Tip mark: a sleek white mushroom on Instagram's signature glow, with a sparkle at the tip.
 * Cheeky by shape alone; no detail beyond the silhouette, a gloss line and the sparkle.
 */
export const MushroomTipLogo: React.FC<{ size?: number; className?: string }> = ({ size = 36, className = '' }) => {
  const id = React.useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={`flex-shrink-0 drop-shadow-[0_4px_10px_rgba(214,36,159,0.35)] ${className}`}
      role="img"
      aria-label="Just the Tip"
    >
      <defs>
        <radialGradient id={`${id}-glow`} cx="0.3" cy="1.07" r="1.5">
          <stop offset="0" stopColor="#fdf497" />
          <stop offset="0.05" stopColor="#fdf497" />
          <stop offset="0.45" stopColor="#fd5949" />
          <stop offset="0.6" stopColor="#d6249f" />
          <stop offset="0.9" stopColor="#285aeb" />
        </radialGradient>
        <linearGradient id={`${id}-stem`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.82" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.96" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${id}-glow)`} />
      {/* stem */}
      <path d="M25 36 C24.4 43 23.8 49.5 25.2 53.6 C26.6 57.4 37.4 57.4 38.8 53.6 C40.2 49.5 39.6 43 39 36 Z" fill={`url(#${id}-stem)`} />
      {/* cap */}
      <path d="M10.5 33.5 C10.5 19.5 20 10.5 32 10.5 C44 10.5 53.5 19.5 53.5 33.5 C53.5 36.6 50.6 38 46.8 37.4 C39.5 36.3 24.5 36.3 17.2 37.4 C13.4 38 10.5 36.6 10.5 33.5 Z" fill="#ffffff" />
      {/* soft shadow where cap meets stem */}
      <path d="M18 37.2 C25 36.2 39 36.2 46 37.2" fill="none" stroke="#d6249f" strokeOpacity="0.22" strokeWidth="1.4" strokeLinecap="round" />
      {/* gloss */}
      <path d="M17.5 26 C19.5 19.5 24.5 15.6 30.5 15" fill="none" stroke="#fd5949" strokeOpacity="0.28" strokeWidth="2.6" strokeLinecap="round" />
      {/* sparkle at the tip */}
      <path d="M46.5 4.5 L47.9 8.6 L52 10 L47.9 11.4 L46.5 15.5 L45.1 11.4 L41 10 L45.1 8.6 Z" fill="#ffffff" />
    </svg>
  );
};

// Backward compatibility alias
export const TipCameraGlyph = MushroomTipLogo;

