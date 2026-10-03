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
 * Mushroom with Tip Logo
 * A stylish, modern mushroom icon featuring a distinct gradient cap,
 * classic mushroom spots, sturdy stem, and an illuminated crown tip.
 */
export const MushroomTipLogo: React.FC<{ size?: number; className?: string }> = ({
  size = 32,
  className = '',
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center p-[2px] rounded-[14px] ig-gradient shadow-md shadow-pink-500/25 active:scale-95 transition-transform ${className}`}
      style={{ width: size + 8, height: size + 8 }}
      title="Just the Tip"
    >
      <div className="w-full h-full bg-white rounded-[12px] flex items-center justify-center relative overflow-hidden">
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 drop-shadow-xs"
        >
          <defs>
            <linearGradient id="mushroom-cap-grad" x1="2" y1="2" x2="30" y2="28" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f09433" />
              <stop offset="0.25" stopColor="#e6683c" />
              <stop offset="0.5" stopColor="#dc2743" />
              <stop offset="0.75" stopColor="#cc2366" />
              <stop offset="1" stopColor="#bc1888" />
            </linearGradient>
            <linearGradient id="mushroom-stem-grad" x1="12" y1="18" x2="20" y2="29" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffffff" />
              <stop offset="1" stopColor="#f4f4f5" />
            </linearGradient>
            <linearGradient id="tip-sparkle-grad" x1="14" y1="0" x2="18" y2="6" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fef08a" />
              <stop offset="1" stopColor="#f59e0b" />
            </linearGradient>
          </defs>

          {/* Mushroom Stem */}
          <path
            d="M 12 17.5 C 11.5 22, 12 28.5, 16 28.5 C 20 28.5, 20.5 22, 20 17.5 Z"
            fill="url(#mushroom-stem-grad)"
            stroke="#e4e4e7"
            strokeWidth="1.2"
          />

          {/* Stem inner detail curve */}
          <path
            d="M 14.5 20 C 14.2 23, 14.5 26, 16 26.5 C 17.5 26, 17.8 23, 17.5 20"
            stroke="#d4d4d8"
            strokeWidth="0.8"
            strokeLinecap="round"
          />

          {/* Mushroom Cap with distinct elevated tip at crown (x=16, y=2.5) */}
          <path
            d="M 4.5 17.5 C 4.5 9.5, 10 3.2, 16 2.2 C 22 3.2, 27.5 9.5, 27.5 17.5 C 27.5 19.2, 25 19.8, 22.5 19.2 C 19 18.3, 13 18.3, 9.5 19.2 C 7 19.8, 4.5 19.2, 4.5 17.5 Z"
            fill="url(#mushroom-cap-grad)"
            stroke="rgba(0,0,0,0.06)"
            strokeWidth="0.8"
          />

          {/* Mushroom Cap Polka Dots */}
          <circle cx="16" cy="11.5" r="2.2" fill="#ffffff" fillOpacity="0.95" />
          <circle cx="10" cy="14" r="1.6" fill="#ffffff" fillOpacity="0.9" />
          <circle cx="22" cy="14" r="1.6" fill="#ffffff" fillOpacity="0.9" />
          <circle cx="16" cy="6" r="1.1" fill="#ffffff" fillOpacity="0.85" />

          {/* Prominent Tip Glint / Sparkle at the apex of the mushroom */}
          <path
            d="M 16 0.2 L 16.9 2.2 L 19 3.1 L 16.9 4 L 16 6 L 15.1 4 L 13 3.1 L 15.1 2.2 Z"
            fill="url(#tip-sparkle-grad)"
          />
        </svg>
      </div>
    </div>
  );
};

// Backward compatibility alias
export const TipCameraGlyph = MushroomTipLogo;

