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
 * Just the Tip mascot: a glossy, rounded 3D-style toadstool (puffy cap with domed spots, soft sheen and
 * rim light, chubby stem) with a friendly face, on Instagram's signature glow. Original character artwork.
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
      <radialGradient id={`${id}-cap`} cx="0.36" cy="0.22" r="0.85">
      <stop offset="0" stopColor="#ff8e8a"/><stop offset="0.35" stopColor="#f2416b"/><stop offset="0.75" stopColor="#c8236a"/><stop offset="1" stopColor="#8f1658"/>
      </radialGradient>
      <radialGradient id={`${id}-spot`} cx="0.38" cy="0.32" r="0.75">
      <stop offset="0" stopColor="#ffffff"/><stop offset="0.7" stopColor="#fff4f7"/><stop offset="1" stopColor="#f1c6d8"/>
      </radialGradient>
      <radialGradient id={`${id}-stem`} cx="0.35" cy="0.45" r="0.8">
      <stop offset="0" stopColor="#fffdf8"/><stop offset="0.55" stopColor="#f8e6c8"/><stop offset="1" stopColor="#d9b07c"/>
      </radialGradient>
      <linearGradient id={`${id}-gills`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#e9c590"/><stop offset="1" stopColor="#f7e2bf"/>
      </linearGradient>
      <radialGradient id={`${id}-eye`} cx="0.4" cy="0.35" r="0.8">
      <stop offset="0" stopColor="#4a1640"/><stop offset="1" stopColor="#14030f"/>
      </radialGradient>
      <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.1"/></filter>
      <filter id={`${id}-softer`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2"/></filter>
      <clipPath id={`${id}-capclip`}>
      <path d="M6 31 C6 15.5 17.5 5.5 32 5.5 C46.5 5.5 58 15.5 58 31 C58 36.5 53.5 39 47.5 38.2 C40 37.2 24 37.2 16.5 38.2 C10.5 39 6 36.5 6 31 Z"/>
      </clipPath>
      <clipPath id={`${id}-stemclip`}>
      <path d="M20 38.5 C18.5 45.5 18.2 52 20 55.8 C22 59.6 42 59.6 44 55.8 C45.8 52 45.5 45.5 44 38.5 Z"/>
      </clipPath>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${id}-glow)`}/>
      {/* soft ground shadow */}
      <ellipse cx="32" cy="58.4" rx="15" ry="2.8" fill="#2a0a24" opacity="0.35" filter={`url(#${id}-softer)`}/>
      {/* chubby stem with ambient shadow under the cap */}
      <path d="M20 38.5 C18.5 45.5 18.2 52 20 55.8 C22 59.6 42 59.6 44 55.8 C45.8 52 45.5 45.5 44 38.5 Z" fill={`url(#${id}-stem)`} stroke="#a8794a" strokeWidth="1.4" strokeLinejoin="round"/>
      <g clipPath={`url(#${id}-stemclip)`}>
      <ellipse cx="32" cy="39.5" rx="15" ry="4.5" fill="#8a5a2c" opacity="0.45" filter={`url(#${id}-soft)`}/>
      <path d="M22.6 45 C22 48.6 22.2 52 23.4 54.4" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.85" filter={`url(#${id}-soft)`}/>
      </g>
      {/* face */}
      <ellipse cx="24.4" cy="51.4" rx="2.4" ry="1.4" fill="#ff5c8d" opacity="0.6" filter={`url(#${id}-soft)`}/>
      <ellipse cx="39.6" cy="51.4" rx="2.4" ry="1.4" fill="#ff5c8d" opacity="0.6" filter={`url(#${id}-soft)`}/>
      <ellipse cx="28" cy="47.2" rx="2.6" ry="3.9" fill={`url(#${id}-eye)`}/>
      <ellipse cx="36" cy="47.2" rx="2.6" ry="3.9" fill={`url(#${id}-eye)`}/>
      <ellipse cx="28.8" cy="45.6" rx="1.15" ry="1.35" fill="#ffffff"/>
      <ellipse cx="36.8" cy="45.6" rx="1.15" ry="1.35" fill="#ffffff"/>
      <circle cx="27.3" cy="49.2" r="0.55" fill="#ffffff" opacity="0.85"/>
      <circle cx="35.3" cy="49.2" r="0.55" fill="#ffffff" opacity="0.85"/>
      <path d="M30.1 52.4 Q32 54.3 33.9 52.4" fill="none" stroke="#2a0a24" strokeWidth="1.3" strokeLinecap="round"/>
      {/* gills */}
      <path d="M14.5 37.4 C22 36 42 36 49.5 37.4 C47.5 40.4 41 41.6 32 41.6 C23 41.6 16.5 40.4 14.5 37.4 Z" fill={`url(#${id}-gills)`} stroke="#a8794a" strokeWidth="1.2" strokeLinejoin="round"/>
      {/* puffy cap */}
      <g clipPath={`url(#${id}-capclip)`}>
      <rect x="0" y="0" width="64" height="40" fill={`url(#${id}-cap)`}/>
      {/* domed spots */}
      <ellipse cx="32" cy="14.6" rx="7.8" ry="5.6" fill={`url(#${id}-spot)`}/>
      <ellipse cx="13" cy="26.5" rx="5.2" ry="7" fill={`url(#${id}-spot)`}/>
      <ellipse cx="51" cy="26.5" rx="5.2" ry="7" fill={`url(#${id}-spot)`}/>
      <ellipse cx="32" cy="30.2" rx="4" ry="3.2" fill={`url(#${id}-spot)`}/>
      <ellipse cx="21.5" cy="18.8" rx="2.2" ry="1.8" fill={`url(#${id}-spot)`}/>
      <ellipse cx="42.5" cy="18.8" rx="2.2" ry="1.8" fill={`url(#${id}-spot)`}/>
      {/* underside shade and rim light */}
      <ellipse cx="32" cy="40" rx="27" ry="6.5" fill="#6d0f45" opacity="0.4" filter={`url(#${id}-soft)`}/>
      <path d="M9.5 34.6 C14 36.6 18 36.3 24 35.8" fill="none" stroke="#ffb3c4" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
      {/* soft specular sheen and a crisp glint */}
      <ellipse cx="22" cy="13.5" rx="9" ry="4.2" fill="#ffffff" opacity="0.45" transform="rotate(-28 22 13.5)" filter={`url(#${id}-soft)`}/>
      <ellipse cx="18.6" cy="15" rx="2.6" ry="1.2" fill="#ffffff" opacity="0.9" transform="rotate(-35 18.6 15)"/>
      </g>
      <path d="M6 31 C6 15.5 17.5 5.5 32 5.5 C46.5 5.5 58 15.5 58 31 C58 36.5 53.5 39 47.5 38.2 C40 37.2 24 37.2 16.5 38.2 C10.5 39 6 36.5 6 31 Z" fill="none" stroke="#6a0d42" strokeWidth="1.6" strokeLinejoin="round"/>
    </svg>
  );
};

// Backward compatibility alias
export const TipCameraGlyph = MushroomTipLogo;

