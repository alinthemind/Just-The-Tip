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
 * Just the Tip mark: a retro-game style toadstool (bold outline, cel-shaded cap, spots, shaded stem)
 * on Instagram's signature glow. Original artwork; deliberately no face, unlike any game character.
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
      <stop offset="0" stopColor="#fdf497"/><stop offset="0.05" stopColor="#fdf497"/>
      <stop offset="0.45" stopColor="#fd5949"/><stop offset="0.6" stopColor="#d6249f"/><stop offset="0.9" stopColor="#285aeb"/>
      </radialGradient>
      <linearGradient id={`${id}-cap`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#ff5a5f"/><stop offset="0.6" stopColor="#e5306c"/><stop offset="1" stopColor="#b8226a"/>
      </linearGradient>
      <linearGradient id={`${id}-stem`} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor="#fffaf0"/><stop offset="0.55" stopColor="#fbe9cc"/><stop offset="1" stopColor="#e8c79a"/>
      </linearGradient>
      <clipPath id={`${id}-capclip`}>
      <path d="M8 32 C8 17 19 7 32 7 C45 7 56 17 56 32 C56 36 52 38 47 37.5 C40 36.8 24 36.8 17 37.5 C12 38 8 36 8 32 Z"/>
      </clipPath>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${id}-glow)`}/>
      {/* ground shadow */}
      <ellipse cx="32" cy="57.6" rx="14" ry="2.6" fill="#2a0a24" opacity="0.28"/>
      {/* stem */}
      <path d="M23 38.5 C22 45 21.5 51 23 54.5 C24.6 58 39.4 58 41 54.5 C42.5 51 42 45 41 38.5 Z" fill={`url(#${id}-stem)`} stroke="#3b0a2a" strokeWidth="2" strokeLinejoin="round"/>
      {/* shadow the cap casts on the stem */}
      <path d="M23.4 39.4 C28 42.2 36 42.2 40.6 39.4 L40.9 43 C36 45.2 28 45.2 23.1 43 Z" fill="#c9965f" opacity="0.55"/>
      {/* stem highlight */}
      <path d="M26 44 C25.4 48 25.4 51 26.4 53.2" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" opacity="0.8"/>
      {/* gills band under the cap */}
      <path d="M15 36.6 C22 35.4 42 35.4 49 36.6 C47 39.6 41 40.8 32 40.8 C23 40.8 17 39.6 15 36.6 Z" fill="#f4d7ab" stroke="#3b0a2a" strokeWidth="2" strokeLinejoin="round"/>
      {/* cap */}
      <g clipPath={`url(#${id}-capclip)`}>
      <rect x="0" y="0" width="64" height="40" fill={`url(#${id}-cap)`}/>
      {/* shade along the lower right of the dome */}
      <ellipse cx="40" cy="40" rx="24" ry="10" fill="#7d1350" opacity="0.35"/>
      {/* spots */}
      <ellipse cx="32" cy="15.5" rx="7.2" ry="5.2" fill="#ffffff"/>
      <ellipse cx="14.5" cy="27" rx="5" ry="6.4" fill="#ffffff"/>
      <ellipse cx="49.5" cy="27" rx="5" ry="6.4" fill="#ffffff"/>
      <ellipse cx="32" cy="30.5" rx="3.6" ry="3" fill="#ffffff"/>
      {/* spot shading */}
      <path d="M25.4 18 C28 20.6 36 20.6 38.6 18" fill="none" stroke="#f1c9d6" strokeWidth="1.4" strokeLinecap="round"/>
      {/* gloss */}
      <path d="M14 21 C16.5 14 22 10 27.5 9.2" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" opacity="0.55"/>
      </g>
      <path d="M8 32 C8 17 19 7 32 7 C45 7 56 17 56 32 C56 36 52 38 47 37.5 C40 36.8 24 36.8 17 37.5 C12 38 8 36 8 32 Z" fill="none" stroke="#3b0a2a" strokeWidth="2.2" strokeLinejoin="round"/>
    </svg>
  );
};

// Backward compatibility alias
export const TipCameraGlyph = MushroomTipLogo;

