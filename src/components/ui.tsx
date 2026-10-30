import React from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { MediaItem } from '../types';
import { Illustration, IllustrationName } from './Illustrations';
import { SmartMedia } from './SmartMedia';

/** Title row at the top of the content panel. */
export const PageHeader: React.FC<{
  title: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
  actions?: React.ReactNode;
}> = ({ title, onBack, backLabel, actions }) => (
  <header className="sticky top-0 z-10 bg-panel flex items-center justify-between gap-4 px-4 sm:px-6 h-[72px] border-b border-line flex-shrink-0">
    <div className="flex items-center gap-2 min-w-0">
      {onBack && <IconButton label={backLabel || 'Back'} onClick={onBack}><ArrowLeft className="w-5 h-5" /></IconButton>}
      <h1 className="text-[22px] font-normal text-ink truncate">{title}</h1>
    </div>
    {actions && <div className="flex items-center gap-1 flex-shrink-0">{actions}</div>}
  </header>
);

export const IconButton: React.FC<{
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}> = ({ label, onClick, children, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`w-10 h-10 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-tile-hover transition-colors cursor-pointer ${className}`}
  >
    {children}
  </button>
);

/** Text button with an optional leading icon, used for header actions. */
export const TextButton: React.FC<{
  onClick?: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
  tone?: 'default' | 'danger';
}> = ({ onClick, icon, children, tone = 'default' }) => (
  <button
    type="button"
    onClick={onClick}
    className={`h-10 px-4 rounded-full flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer ${
      tone === 'danger' ? 'text-[#f2a39a] hover:bg-[#f2a39a]/10' : 'text-accent hover:bg-accent/10'
    }`}
  >
    {icon}
    <span>{children}</span>
  </button>
);

export const PillButton: React.FC<{
  onClick?: () => void;
  variant?: 'filled' | 'outlined';
  children: React.ReactNode;
  type?: 'button' | 'submit';
}> = ({ onClick, variant = 'outlined', children, type = 'button' }) => (
  <button
    type={type}
    onClick={onClick}
    className={`h-10 px-6 rounded-full text-sm font-medium transition-colors cursor-pointer ${
      variant === 'filled'
        ? 'bg-accent text-on-accent hover:bg-[#bed2ff]'
        : 'border border-ink-faint text-accent hover:bg-accent/10'
    }`}
  >
    {children}
  </button>
);

export const Chip: React.FC<{ selected?: boolean; onClick?: () => void; children: React.ReactNode }> = ({
  selected,
  onClick,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    className={`h-9 px-4 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer ${
      selected
        ? 'bg-accent-container text-on-accent-container border border-transparent'
        : 'border border-ink-faint text-ink hover:bg-tile-hover'
    }`}
  >
    {selected && <Check className="w-4 h-4" />}
    {children}
  </button>
);

export const EmptyState: React.FC<{
  illustration: IllustrationName;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ illustration, title, description, action }) => (
  <div className="flex flex-col items-center justify-center text-center px-6 py-16 min-h-[420px]">
    <Illustration name={illustration} className="w-64 h-48 mb-6" />
    <h2 className="text-2xl font-normal text-ink">{title}</h2>
    {description && <p className="text-sm text-ink-muted mt-3 max-w-[46ch] leading-relaxed">{description}</p>}
    {action && <div className="mt-6">{action}</div>}
  </div>
);

/** Square tile showing a collection: a cover photo when it has items, its illustration otherwise. */
export const CollectionTile: React.FC<{
  title: string;
  count?: string;
  cover?: MediaItem;
  illustration: IllustrationName;
  onClick: () => void;
  labelInside?: boolean;
}> = ({ title, count, cover, illustration, onClick, labelInside }) => (
  <button type="button" onClick={onClick} className="group text-left cursor-pointer min-w-0">
    <div className="relative aspect-square overflow-hidden bg-tile group-hover:bg-tile-hover transition-colors rounded-xl">
      {cover ? (
        <SmartMedia item={cover} fit="cover" className="w-full h-full transition-transform duration-300 group-hover:scale-[1.03]" />
      ) : (
        <div className={`w-full h-full flex items-center justify-center p-6 ${labelInside ? 'pb-16' : ''}`}>
          <Illustration name={illustration} className="w-full max-w-[200px] h-auto" />
        </div>
      )}
      {labelInside && (
        <div className={`absolute inset-x-0 bottom-0 p-4 ${cover ? 'bg-gradient-to-t from-black/70 to-transparent' : ''}`}>
          <p className="text-[15px] font-medium text-ink truncate text-center">{title}</p>
          {count && <p className="text-xs text-ink-muted text-center mt-0.5">{count}</p>}
        </div>
      )}
    </div>
    {!labelInside && (
      <div className="pt-2.5 px-0.5">
        <p className="text-[15px] font-medium text-ink truncate">{title}</p>
        {count && <p className="text-[13px] text-ink-muted mt-0.5">{count}</p>}
      </div>
    )}
  </button>
);
