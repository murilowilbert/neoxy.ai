import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface TooltipState {
  text: string;
  x: number;
  y: number;
  placement: 'top' | 'bottom';
  arrowOffset: number;
  visible: boolean;
}

const FIND_SELECTOR = '[title], [data-nx-title], [data-tooltip]';

function extractText(el: HTMLElement): string {
  const custom = el.getAttribute('data-tooltip');
  if (custom && custom.trim()) return custom.trim();

  const nativeTitle = el.getAttribute('title');
  if (nativeTitle && nativeTitle.trim()) {
    el.setAttribute('data-nx-title', nativeTitle);
    el.removeAttribute('title');
    return nativeTitle.trim();
  }

  const cached = el.getAttribute('data-nx-title');
  return cached ? cached.trim() : '';
}

function restoreTitle(el: HTMLElement | null) {
  if (!el || !el.isConnected) return;
  const cached = el.getAttribute('data-nx-title');
  if (cached !== null) {
    if (!el.hasAttribute('title')) {
      el.setAttribute('title', cached);
    }
    el.removeAttribute('data-nx-title');
  }
}

export const NeoTooltipLayer: React.FC = () => {
  const [tip, setTip] = useState<TooltipState | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const activeElRef = useRef<HTMLElement | null>(null);
  const showTimerRef = useRef<number | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    const clearTimer = () => {
      if (showTimerRef.current !== null) {
        window.clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
    };

    const disconnectObserver = () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };

    const hide = () => {
      clearTimer();
      disconnectObserver();
      restoreTitle(activeElRef.current);
      activeElRef.current = null;
      setTip((prev) => (prev ? { ...prev, visible: false } : null));
    };

    const positionFor = (el: HTMLElement, text: string, visible: boolean) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      const margin = 10;
      const estimatedW = Math.min(280, Math.max(64, text.length * 7.2 + 24));
      const tipW = tipRef.current?.offsetWidth || estimatedW;
      const halfW = tipW / 2;

      const rawX = rect.left + rect.width / 2;
      const clampedX = Math.min(
        window.innerWidth - 12 - halfW,
        Math.max(12 + halfW, rawX)
      );
      const arrowOffset = Math.max(-halfW + 14, Math.min(halfW - 14, rawX - clampedX));

      const preferBottom = rect.top < 64;
      const placement: 'top' | 'bottom' = preferBottom ? 'bottom' : 'top';
      const y = placement === 'bottom' ? rect.bottom + margin : rect.top - margin;

      setTip({ text, x: clampedX, y, placement, arrowOffset, visible });
    };

    const activate = (el: HTMLElement, immediate = false) => {
      if (activeElRef.current && activeElRef.current !== el) {
        restoreTitle(activeElRef.current);
        disconnectObserver();
      }

      const text = extractText(el);
      if (!text) {
        hide();
        return;
      }

      activeElRef.current = el;
      clearTimer();

      // Watch dynamic title updates (e.g. ThemeToggle switching "Modo escuro" <-> "Modo claro")
      disconnectObserver();
      const obs = new MutationObserver(() => {
        if (!activeElRef.current) return;
        const updated = extractText(activeElRef.current);
        if (!updated) {
          hide();
        } else {
          positionFor(activeElRef.current, updated, true);
        }
      });
      obs.observe(el, { attributes: true, attributeFilter: ['title', 'data-tooltip'] });
      observerRef.current = obs;

      if (immediate) {
        positionFor(el, text, true);
      } else {
        showTimerRef.current = window.setTimeout(() => {
          if (activeElRef.current === el && el.isConnected) {
            positionFor(el, extractText(el) || text, true);
          }
        }, 160);
      }
    };

    const findTarget = (node: EventTarget | null): HTMLElement | null => {
      if (!(node instanceof Element)) return null;
      return node.closest(FIND_SELECTOR) as HTMLElement | null;
    };

    const onPointerOver = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const target = findTarget(e.target);
      if (!target) {
        if (activeElRef.current) hide();
        return;
      }
      if (target === activeElRef.current) return;
      activate(target, false);
    };

    const onPointerOut = (e: PointerEvent) => {
      const active = activeElRef.current;
      if (!active) return;
      const related = e.relatedTarget as Node | null;
      if (related && active.contains(related)) return;
      const next = findTarget(related);
      if (next && next !== active) {
        activate(next, false);
      } else {
        hide();
      }
    };

    const onFocusIn = (e: FocusEvent) => {
      const target = findTarget(e.target);
      if (!target) return;
      if (target.matches(':focus-visible')) {
        activate(target, true);
      }
    };

    const onFocusOut = () => {
      if (activeElRef.current) hide();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };

    const onScrollOrResize = () => {
      if (activeElRef.current) hide();
    };

    document.addEventListener('pointerover', onPointerOver, true);
    document.addEventListener('pointerout', onPointerOut, true);
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);

    return () => {
      clearTimer();
      disconnectObserver();
      restoreTitle(activeElRef.current);
      document.removeEventListener('pointerover', onPointerOver, true);
      document.removeEventListener('pointerout', onPointerOut, true);
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('focusout', onFocusOut, true);
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, []);

  if (!tip || !tip.text || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={tipRef}
      role="tooltip"
      className={`nx-tooltip nx-tooltip--${tip.placement}${tip.visible ? ' is-visible' : ''}`}
      style={{
        left: `${tip.x}px`,
        top: `${tip.y}px`,
        ['--nx-tip-arrow-x' as string]: `${tip.arrowOffset}px`
      }}
    >
      <span className="nx-tooltip__text">{tip.text}</span>
      <span className="nx-tooltip__arrow" aria-hidden="true" />
    </div>,
    document.body
  );
};

export default NeoTooltipLayer;
