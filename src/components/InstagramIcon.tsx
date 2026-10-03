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
 * Just the Tip mascot: a 2D pop-style toadstool (wide domed cap with large outlined spots, cream stem,
 * pill eyes, rosy cheeks and a smile; thick outlines, flat shading) on Instagram's signature glow.
 * Original character artwork.
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
      <clipPath id={`${id}-capclip`}>
      <path d="M5 32 C5 15 17 5 32 5 C47 5 59 15 59 32 C59 37 55 39.5 49 38.8 C41 37.9 23 37.9 15 38.8 C9 39.5 5 37 5 32 Z"/>
      </clipPath>
      <clipPath id={`${id}-stemclip`}>
      <path d="M19 37 C17.5 44.5 17.5 51.5 19.5 55.6 C21.5 59.2 42.5 59.2 44.5 55.6 C46.5 51.5 46.5 44.5 45 37 Z"/>
      </clipPath>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${id}-glow)`}/>
      {/* flat ground shadow */}
      <ellipse cx="32" cy="58.6" rx="15" ry="2.6" fill="#1a0614" opacity="0.3"/>
      {/* cream stem with flat pop shading */}
      <path d="M19 37 C17.5 44.5 17.5 51.5 19.5 55.6 C21.5 59.2 42.5 59.2 44.5 55.6 C46.5 51.5 46.5 44.5 45 37 Z" fill="#fff3d6"/>
      <g clipPath={`url(#${id}-stemclip)`}>
      <path d="M38.5 36 C42 44 42 52 38 60 L50 60 L50 36 Z" fill="#f2d39a"/>
      <rect x="16" y="36" width="34" height="5.2" fill="#e8c27f"/>
      </g>
      <path d="M19 37 C17.5 44.5 17.5 51.5 19.5 55.6 C21.5 59.2 42.5 59.2 44.5 55.6 C46.5 51.5 46.5 44.5 45 37 Z" fill="none" stroke="#111111" strokeWidth="3" strokeLinejoin="round"/>
      {/* face: vertical pill eyes with a glint, rosy cheeks, small smile */}
      <rect x="25.2" y="42" width="4.6" height="9.4" rx="2.3" fill="#111111"/>
      <rect x="34.2" y="42" width="4.6" height="9.4" rx="2.3" fill="#111111"/>
      <rect x="26.3" y="43.2" width="1.6" height="3" rx="0.8" fill="#ffffff"/>
      <rect x="35.3" y="43.2" width="1.6" height="3" rx="0.8" fill="#ffffff"/>
      <ellipse cx="22.6" cy="52.4" rx="2.3" ry="1.3" fill="#ff7aa5"/>
      <ellipse cx="41.4" cy="52.4" rx="2.3" ry="1.3" fill="#ff7aa5"/>
      <path d="M30.2 53.6 Q32 55.2 33.8 53.6" fill="none" stroke="#111111" strokeWidth="1.5" strokeLinecap="round"/>
      {/* wide domed cap: flat vibrant color, one shade band, one highlight */}
      <g clipPath={`url(#${id}-capclip)`}>
      <rect x="0" y="0" width="64" height="40" fill="#ff2d6f"/>
      <path d="M0 29 C14 35 50 35 64 29 L64 40 L0 40 Z" fill="#d4105c"/>
      <path d="M11 22 C12 14 19 9 27 7.6 C21 11 17 16 15.5 23 Z" fill="#ff8db1"/>
      {/* large white spots with outlines */}
      <circle cx="32" cy="15.5" r="8.2" fill="#ffffff" stroke="#111111" strokeWidth="2.6"/>
      <ellipse cx="9.5" cy="27" rx="6.8" ry="8.6" fill="#ffffff" stroke="#111111" strokeWidth="2.6"/>
      <ellipse cx="54.5" cy="27" rx="6.8" ry="8.6" fill="#ffffff" stroke="#111111" strokeWidth="2.6"/>
      <circle cx="32" cy="31.5" r="3.6" fill="#ffffff" stroke="#111111" strokeWidth="2.2"/>
      {/* flat shade on the spots' lower edge */}
      <path d="M25.2 19.6 C29 22.6 35 22.6 38.8 19.6 C37 23.3 27 23.3 25.2 19.6 Z" fill="#ffd0de"/>
      </g>
      <path d="M5 32 C5 15 17 5 32 5 C47 5 59 15 59 32 C59 37 55 39.5 49 38.8 C41 37.9 23 37.9 15 38.8 C9 39.5 5 37 5 32 Z" fill="none" stroke="#111111" strokeWidth="3" strokeLinejoin="round"/>
    </svg>
  );
};

// Backward compatibility alias
export const TipCameraGlyph = MushroomTipLogo;

