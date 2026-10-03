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
 * Just the Tip mascot: a glossy 3D-style toadstool (domed cap with soft white spots, specular shine and a
 * rim light; cream stem with oval eyes, rosy cheeks and a smile) on Instagram's signature glow.
 * Original character artwork. public/favicon.svg is the same drawing.
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
      <radialGradient id={`${id}-glow`} cx="0.3" cy="1.07" r="1.5"><stop offset="0" stopColor="#fdf497"/><stop offset="0.05" stopColor="#fdf497"/><stop offset="0.45" stopColor="#fd5949"/><stop offset="0.6" stopColor="#d6249f"/><stop offset="0.9" stopColor="#285aeb"/></radialGradient>
      <radialGradient id={`${id}-cap`} cx="0.36" cy="0.26" r="0.82"><stop offset="0" stopColor="#ff8fb0"/><stop offset="0.3" stopColor="#ff3d78"/><stop offset="0.68" stopColor="#e0115c"/><stop offset="1" stopColor="#8f0839"/></radialGradient>
      <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff9cbc" stopOpacity="0"/><stop offset="0.78" stopColor="#ff9cbc" stopOpacity="0"/><stop offset="1" stopColor="#ffc2d6" stopOpacity="0.85"/></linearGradient>
      <radialGradient id={`${id}-spot`} cx="0.38" cy="0.32" r="0.75"><stop offset="0" stopColor="#ffffff"/><stop offset="0.6" stopColor="#fff4f7"/><stop offset="1" stopColor="#f7c9d8"/></radialGradient>
      <radialGradient id={`${id}-stem`} cx="0.38" cy="0.4" r="0.75"><stop offset="0" stopColor="#fffcf3"/><stop offset="0.55" stopColor="#fbe9c6"/><stop offset="1" stopColor="#dcae6c"/></radialGradient>
      <linearGradient id={`${id}-under`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7a3b16" stopOpacity="0.55"/><stop offset="1" stopColor="#7a3b16" stopOpacity="0"/></linearGradient>
      <radialGradient id={`${id}-shine`} cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#ffffff" stopOpacity="0.95"/><stop offset="1" stopColor="#ffffff" stopOpacity="0"/></radialGradient>
      <filter id={`${id}-soft`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="0.9"/></filter>
      <filter id={`${id}-blur`} x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="1.6"/></filter>
      <clipPath id={`${id}-capclip`}><path d="M5 32 C5 15 17 5 32 5 C47 5 59 15 59 32 C59 37 55 39.5 49 38.8 C41 37.9 23 37.9 15 38.8 C9 39.5 5 37 5 32 Z"/></clipPath>
      <clipPath id={`${id}-stemclip`}><path d="M19 37 C17.5 44.5 17.5 51.5 19.5 55.6 C21.5 59.2 42.5 59.2 44.5 55.6 C46.5 51.5 46.5 44.5 45 37 Z"/></clipPath>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${id}-glow)`}/>
      <ellipse cx="32" cy="58.4" rx="15.5" ry="2.8" fill="#1a0614" opacity="0.38" filter={`url(#${id}-blur)`}/>
      <path d="M19 37 C17.5 44.5 17.5 51.5 19.5 55.6 C21.5 59.2 42.5 59.2 44.5 55.6 C46.5 51.5 46.5 44.5 45 37 Z" fill={`url(#${id}-stem)`}/>
      <g clipPath={`url(#${id}-stemclip)`}>
      <rect x="16" y="36" width="34" height="9" fill={`url(#${id}-under)`}/>
      <path d="M21.5 44 C21 49 22 53 24 55.5" fill="none" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" opacity="0.45"/>
      </g>
      <ellipse cx="27.5" cy="47" rx="2.5" ry="4.9" fill="#1b1220"/>
      <ellipse cx="36.5" cy="47" rx="2.5" ry="4.9" fill="#1b1220"/>
      <ellipse cx="26.9" cy="44.9" rx="0.95" ry="1.6" fill="#ffffff"/>
      <ellipse cx="35.9" cy="44.9" rx="0.95" ry="1.6" fill="#ffffff"/>
      <ellipse cx="22.8" cy="52.2" rx="2.4" ry="1.3" fill="#ff7aa5" opacity="0.75" filter={`url(#${id}-soft)`}/>
      <ellipse cx="41.2" cy="52.2" rx="2.4" ry="1.3" fill="#ff7aa5" opacity="0.75" filter={`url(#${id}-soft)`}/>
      <path d="M30.3 53.4 Q32 54.9 33.7 53.4" fill="none" stroke="#1b1220" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M5 32 C5 15 17 5 32 5 C47 5 59 15 59 32 C59 37 55 39.5 49 38.8 C41 37.9 23 37.9 15 38.8 C9 39.5 5 37 5 32 Z" fill={`url(#${id}-cap)`}/>
      <g clipPath={`url(#${id}-capclip)`}>
      <ellipse cx="32" cy="16.6" rx="8" ry="7.4" fill="#8e0a3c" opacity="0.35" filter={`url(#${id}-soft)`}/><ellipse cx="32" cy="15.5" rx="8" ry="7.4" fill={`url(#${id}-spot)`}/><ellipse cx="29.60" cy="12.69" rx="3.36" ry="1.92" fill="#ffffff" opacity="0.9"/>
      <ellipse cx="9.8" cy="28.1" rx="6.4" ry="8.2" fill="#8e0a3c" opacity="0.35" filter={`url(#${id}-soft)`}/><ellipse cx="9.8" cy="27" rx="6.4" ry="8.2" fill={`url(#${id}-spot)`}/><ellipse cx="7.88" cy="23.88" rx="2.69" ry="2.13" fill="#ffffff" opacity="0.9"/>
      <ellipse cx="54.2" cy="28.1" rx="6.4" ry="8.2" fill="#8e0a3c" opacity="0.35" filter={`url(#${id}-soft)`}/><ellipse cx="54.2" cy="27" rx="6.4" ry="8.2" fill={`url(#${id}-spot)`}/><ellipse cx="52.28" cy="23.88" rx="2.69" ry="2.13" fill="#ffffff" opacity="0.9"/>
      <ellipse cx="32" cy="32.3" rx="3.6" ry="3.2" fill="#8e0a3c" opacity="0.35" filter={`url(#${id}-soft)`}/><ellipse cx="32" cy="31.2" rx="3.6" ry="3.2" fill={`url(#${id}-spot)`}/><ellipse cx="30.92" cy="29.98" rx="1.51" ry="0.83" fill="#ffffff" opacity="0.9"/>
      <path d="M5 32 C5 15 17 5 32 5 C47 5 59 15 59 32 C59 37 55 39.5 49 38.8 C41 37.9 23 37.9 15 38.8 C9 39.5 5 37 5 32 Z" fill={`url(#${id}-rim)`}/>
      <ellipse cx="19" cy="13.5" rx="9" ry="4.2" transform="rotate(-28 19 13.5)" fill={`url(#${id}-shine)`} opacity="0.85"/>
      </g>
    </svg>
  );
};

// Backward compatibility alias
export const TipCameraGlyph = MushroomTipLogo;

