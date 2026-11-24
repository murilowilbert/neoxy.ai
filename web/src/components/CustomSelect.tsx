import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { AutoScrollLabel } from './AutoScrollLabel';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (nextVal: string) => void;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  variant?: 'field' | 'compact';
  className?: string;
  buttonClassName?: string;
}

/**
 * Seletor customizado no estilo oficial Neoxy (mesma caixa flutuante do autocomplete de e-mail),
 * renderizado via Portal para nunca ser cortado por modais ou áreas com scroll.
 */
export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  label,
  placeholder = 'Selecionar...',
  variant = 'field',
  className = '',
  buttonClassName = ''
}) => {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [menuPos, setMenuPos] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
  }>({ left: 0, width: 180 });

  const selectedOption = options.find((o) => o.value === value);
  const displayText = selectedOption?.label || placeholder;

  function updatePosition() {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedHeight = Math.min(260, options.length * 38 + 14);
    const openUp = spaceBelow < estimatedHeight && rect.top > spaceBelow;
    const width = Math.max(rect.width, 165);
    const maxLeft = window.innerWidth - width - 10;
    const left = Math.max(10, Math.min(rect.left, maxLeft));

    if (openUp) {
      setMenuPos({
        bottom: window.innerHeight - rect.top + 5,
        left,
        width
      });
    } else {
      setMenuPos({
        top: rect.bottom + 5,
        left,
        width
      });
    }
  }

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const idx = options.findIndex((o) => o.value === value);
    setActiveIdx(idx >= 0 ? idx : 0);
  }, [open, options.length, value]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((prev) => (prev + 1) % Math.max(1, options.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((prev) => (prev - 1 + options.length) % Math.max(1, options.length));
      } else if (e.key === 'Enter' && activeIdx >= 0 && options[activeIdx]) {
        e.preventDefault();
        onChange(options[activeIdx].value);
        setOpen(false);
      }
    };
    const handleRelayout = (e: Event) => {
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) {
        return;
      }
      updatePosition();
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('resize', handleRelayout);
    window.addEventListener('scroll', handleRelayout, true);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', handleRelayout);
      window.removeEventListener('scroll', handleRelayout, true);
    };
  }, [open, activeIdx, options]);

  const menuPortal =
    open &&
    createPortal(
      <ul
        ref={menuRef}
        role="listbox"
        className="nx-custom-select-menu animate-slide-down"
        style={{
          position: 'fixed',
          top: menuPos.top !== undefined ? `${menuPos.top}px` : undefined,
          bottom: menuPos.bottom !== undefined ? `${menuPos.bottom}px` : undefined,
          left: `${menuPos.left}px`,
          width: `${menuPos.width}px`,
          zIndex: 220
        }}
      >
        {options.map((opt, idx) => {
          const isSelected = opt.value === value;
          const isHighlighted = idx === activeIdx;
          return (
            <li key={`${opt.value}-${idx}`} role="option" aria-selected={isSelected}>
              <button
                type="button"
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`nx-custom-select-option ${
                  isSelected
                    ? 'nx-custom-select-option--selected'
                    : isHighlighted
                    ? 'nx-custom-select-option--hover'
                    : ''
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--nx-primary)] shrink-0" />
                )}
              </button>
            </li>
          );
        })}
      </ul>,
      document.body
    );

  if (variant === 'compact') {
    return (
      <div className={`relative inline-block ${className}`.trim()}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`inline-flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] hover:border-[var(--nx-primary)] text-xs font-medium text-[var(--nx-text)] transition-colors ${
            open ? 'border-[var(--nx-primary)] ring-2 ring-[var(--nx-primary-ring)]' : ''
          } ${buttonClassName}`.trim()}
        >
          <span className="truncate">{displayText}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-[var(--nx-muted)] shrink-0 transition-transform duration-150 ${
              open ? 'rotate-180 text-[var(--nx-primary)]' : ''
            }`}
          />
        </button>
        {menuPortal}
      </div>
    );
  }

  return (
    <div className={`nx-field nx-field--custom-select ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`nx-select-trigger ${open ? 'is-open' : ''} ${buttonClassName}`.trim()}
      >
        <span className={`truncate ${selectedOption ? 'text-[var(--nx-text)]' : 'text-[var(--nx-subtle)]'}`}>
          {displayText}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[var(--nx-muted)] shrink-0 transition-transform duration-150 ${
            open ? 'rotate-180 text-[var(--nx-primary)]' : ''
          }`}
        />
      </button>
      {label && <AutoScrollLabel className="nx-label-floated">{label}</AutoScrollLabel>}
      {menuPortal}
    </div>
  );
};

export default CustomSelect;
