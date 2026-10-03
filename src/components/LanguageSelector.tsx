import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
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
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-pink-300 dark:hover:border-pink-500/50 hover:shadow-xs active:scale-95 transition-all text-xs font-bold text-zinc-800 dark:text-zinc-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] cursor-pointer flex-shrink-0"
        title="Change Language"
        aria-label="Toggle language"
      >
        <span className="text-sm leading-none">{activeOption.flag}</span>
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 hidden xs:inline">
          {activeOption.code.split('-')[0]}
        </span>
        <ChevronDown className={`w-3 h-3 text-zinc-400 dark:text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-48 max-h-80 overflow-y-auto bg-white dark:bg-zinc-900 rounded-2xl shadow-xl shadow-black/20 border border-zinc-200/90 dark:border-zinc-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Language / Langue / Idioma
          </div>
          <div className="py-1">
            {SUPPORTED_LANGUAGES.map((option) => {
              const isSelected = option.code === currentLang;
              return (
                <button
                  key={option.code}
                  onClick={() => {
                    onSelectLang(option.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-pink-50/80 dark:bg-pink-950/40 text-[#E1306C] dark:text-pink-400 font-bold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{option.flag}</span>
                    <span>{option.nativeName}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#E1306C] dark:text-pink-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
