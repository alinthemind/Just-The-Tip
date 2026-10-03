import React, { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { SUPPORTED_LANGUAGES, LanguageCode } from '../data/translations';

interface LanguageSelectorProps {
  currentLang: LanguageCode;
  onSelectLang: (lang: LanguageCode) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLang,
  onSelectLang,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeOption =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-full inline-flex items-center justify-center bg-[#767680]/12 dark:bg-[#767680]/24 hover:bg-[#767680]/20 active:scale-90 transition-all cursor-pointer flex-shrink-0 text-[17px] leading-none"
        title={activeOption.nativeName}
        aria-label={activeOption.nativeName}
        aria-expanded={isOpen}
      >
        {activeOption.flag}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 max-h-96 overflow-y-auto bg-white/90 dark:bg-elevated-2/90 backdrop-blur-xl rounded-[14px] shadow-[0_10px_40px_rgba(0,0,0,0.2)] py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
          {SUPPORTED_LANGUAGES.map((option) => {
            const isSelected = option.code === currentLang;
            return (
              <button
                key={option.code}
                type="button"
                onClick={() => {
                  onSelectLang(option.code);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[15px] text-zinc-900 dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer text-left border-b border-black/[0.05] dark:border-white/[0.06] last:border-b-0"
              >
                <Check className={`w-4 h-4 text-accent flex-shrink-0 ${isSelected ? '' : 'invisible'}`} />
                <span className="flex-1">{option.nativeName}</span>
                <span className="text-base leading-none">{option.flag}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
