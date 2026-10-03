import React from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Apple-style building blocks: grouped cards, segmented controls, settings-style icon tiles.
 * Kept deliberately small so every screen shares one visual language.
 */

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <section className={`bg-white dark:bg-elevated rounded-[22px] transition-colors ${className}`}>{children}</section>
);

/** Small uppercase-free section caption that sits above a card, like iOS grouped lists */
export const SectionCaption: React.FC<{ children: React.ReactNode; action?: React.ReactNode }> = ({ children, action }) => (
  <div className="flex items-center justify-between px-4 mb-1.5">
    <h3 className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400">{children}</h3>
    {action}
  </div>
);

const TILE_COLORS = {
  pink: 'bg-accent',
  blue: 'bg-[#007aff]',
  green: 'bg-[#34c759]',
  orange: 'bg-[#ff9500]',
  purple: 'bg-[#af52de]',
  teal: 'bg-[#30b0c7]',
  indigo: 'bg-[#5856d6]',
  gray: 'bg-[#8e8e93]',
  red: 'bg-[#ff3b30]',
  yellow: 'bg-[#ffcc00]',
} as const;
export type TileColor = keyof typeof TILE_COLORS;

/** Rounded-square glyph tile, as used in iOS Settings rows */
export const IconTile: React.FC<{ icon: LucideIcon; color?: TileColor; size?: 'sm' | 'md' | 'lg' }> = ({
  icon: Icon,
  color = 'pink',
  size = 'md',
}) => {
  const box = size === 'sm' ? 'w-6 h-6 rounded-[7px]' : size === 'lg' ? 'w-11 h-11 rounded-[12px]' : 'w-[30px] h-[30px] rounded-[8px]';
  const glyph = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-6 h-6' : 'w-[18px] h-[18px]';
  return (
    <span className={`${box} ${TILE_COLORS[color]} inline-flex items-center justify-center text-white flex-shrink-0`}>
      <Icon className={glyph} strokeWidth={2.2} />
    </span>
  );
};

export interface SegmentOption<T extends string> {
  value: T;
  label?: string;
  icon?: LucideIcon;
  title?: string;
}

/** iOS segmented control */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={`flex p-0.5 rounded-[10px] bg-[#767680]/12 dark:bg-[#767680]/24 ${className}`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            title={opt.title || opt.label}
            aria-label={opt.title || opt.label}
            onClick={() => onChange(opt.value)}
            className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[13px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
              active
                ? 'bg-white dark:bg-[#636366] text-zinc-900 dark:text-white shadow-[0_3px_8px_rgba(0,0,0,0.12),0_3px_1px_rgba(0,0,0,0.04)]'
                : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
            {opt.label && <span className="truncate">{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Round icon-only button used in headers and toolbars */
export const IconButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string; spin?: boolean; tone?: 'plain' | 'filled' }
> = ({ icon: Icon, label, spin, tone = 'filled', className = '', ...rest }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    className={`w-9 h-9 rounded-full inline-flex items-center justify-center flex-shrink-0 transition-all active:scale-90 cursor-pointer disabled:opacity-40 ${
      tone === 'filled'
        ? 'bg-[#767680]/12 dark:bg-[#767680]/24 text-zinc-700 dark:text-zinc-200 hover:bg-[#767680]/20'
        : 'text-accent hover:bg-accent/10'
    } ${className}`}
    {...rest}
  >
    <Icon className={`w-[18px] h-[18px] ${spin ? 'animate-spin' : ''}`} />
  </button>
);

/** Compact status chip: an icon plus a couple of words */
export const Chip: React.FC<{
  icon: LucideIcon;
  children: React.ReactNode;
  tone?: 'green' | 'amber' | 'blue' | 'pink' | 'gray';
  title?: string;
}> = ({ icon: Icon, children, tone = 'gray', title }) => {
  const tones = {
    green: 'bg-[#34c759]/12 text-[#248a3d] dark:text-[#30d158]',
    amber: 'bg-[#ff9500]/12 text-[#c93400] dark:text-[#ff9f0a]',
    blue: 'bg-[#007aff]/12 text-[#0062cc] dark:text-[#409cff]',
    pink: 'bg-accent/12 text-accent dark:text-accent-dark',
    gray: 'bg-[#767680]/12 text-zinc-600 dark:text-zinc-300',
  };
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold ${tones[tone]}`}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="truncate">{children}</span>
    </span>
  );
};

/** iOS toggle switch */
export const Switch: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({
  checked,
  onChange,
  label,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    title={label}
    onClick={() => onChange(!checked)}
    className={`relative w-[51px] h-[31px] rounded-full transition-colors flex-shrink-0 cursor-pointer ${
      checked ? 'bg-[#34c759]' : 'bg-[#787880]/20 dark:bg-[#787880]/36'
    }`}
  >
    <span
      className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_3px_1px_rgba(0,0,0,0.06)] transition-transform ${
        checked ? 'translate-x-[20px]' : ''
      }`}
    />
  </button>
);

/** Row inside a grouped list card */
export const ListRow: React.FC<{
  icon?: LucideIcon;
  color?: TileColor;
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}> = ({ icon, color, leading, title, subtitle, trailing, onClick, className = '' }) => {
  const Tag: any = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`w-full flex items-center gap-3 pl-4 text-left ${onClick ? 'cursor-pointer active:bg-zinc-100 dark:active:bg-elevated-2 transition-colors' : ''} ${className}`}
    >
      {leading ?? (icon && <IconTile icon={icon} color={color} />)}
      <div className="flex-1 min-w-0 flex items-center gap-3 py-2.5 pr-4 min-h-[48px] border-b border-black/[0.06] dark:border-white/[0.08] group-last/list:border-b-0">
        <div className="flex-1 min-w-0">
          <div className="text-[15px] text-zinc-900 dark:text-white truncate">{title}</div>
          {subtitle && <div className="text-[13px] text-zinc-500 dark:text-zinc-400 truncate">{subtitle}</div>}
        </div>
        {trailing}
      </div>
    </Tag>
  );
};

/** Wraps ListRows so the last row drops its separator */
export const List: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <Card className={`overflow-hidden ${className}`}>
    {React.Children.toArray(children)
      .filter(Boolean)
      .map((child, i) => (
        <div key={i} className="group/list">
          {child}
        </div>
      ))}
  </Card>
);
