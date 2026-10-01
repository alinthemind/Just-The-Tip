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

export const TipCameraGlyph: React.FC<{ size?: number; className?: string }> = ({ size = 28, className = '' }) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center p-[2.5px] rounded-[14px] ig-gradient shadow-md shadow-pink-500/25 ${className}`}
      style={{ width: size + 8, height: size + 8 }}
    >
      <div className="w-full h-full bg-white rounded-[12px] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-white via-white/80 to-transparent pointer-events-none" />
        <svg
          width={size - 4}
          height={size - 4}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10"
        >
          {/* Instagram-style camera outline with a percent/tip sign inside */}
          <rect
            x="2.5"
            y="2.5"
            width="19"
            height="19"
            rx="5.5"
            stroke="url(#ig-stroke)"
            strokeWidth="2.2"
          />
          <circle cx="12" cy="12" r="4.2" stroke="url(#ig-stroke)" strokeWidth="2" />
          <circle cx="17.5" cy="6.5" r="1.3" fill="url(#ig-stroke)" />
          {/* Subtle percentage symbol in center */}
          <path
            d="M10 14L14 10"
            stroke="url(#ig-stroke)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="ig-stroke" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f09433" />
              <stop offset="0.25" stopColor="#e6683c" />
              <stop offset="0.5" stopColor="#dc2743" />
              <stop offset="0.75" stopColor="#cc2366" />
              <stop offset="1" stopColor="#bc1888" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};
