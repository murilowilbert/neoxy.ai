import { useEffect } from 'react';

const CARD_SELECTOR = '.nx-card-interactive, .nx-kpi-tile, .nx-spotlight-card';
const PROXIMITY_PX = 240;

/**
 * Listener global leve (60fps via rAF, zero re-renders React) que atualiza
 * --nx-mx, --nx-my e --nx-spot-active nos cards próximos ao cursor,
 * criando o efeito de brilho radial e borda iluminada por proximidade (estilo Linear / Vercel).
 */
export function useCardSpotlight() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let rafId = 0;
    let lastX = -9999;
    let lastY = -9999;

    const updateCards = () => {
      rafId = 0;
      const cards = document.querySelectorAll<HTMLElement>(CARD_SELECTOR);
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const rect = card.getBoundingClientRect();

        // Ignora cards fora da viewport + margem de proximidade
        if (
          rect.bottom < -PROXIMITY_PX ||
          rect.top > window.innerHeight + PROXIMITY_PX
        ) {
          continue;
        }

        const withinProximity =
          lastX >= rect.left - PROXIMITY_PX &&
          lastX <= rect.right + PROXIMITY_PX &&
          lastY >= rect.top - PROXIMITY_PX &&
          lastY <= rect.bottom + PROXIMITY_PX;

        if (withinProximity) {
          card.style.setProperty('--nx-mx', `${lastX - rect.left}px`);
          card.style.setProperty('--nx-my', `${lastY - rect.top}px`);
          card.style.setProperty('--nx-spot-active', '1');
        } else if (card.style.getPropertyValue('--nx-spot-active') !== '0') {
          card.style.setProperty('--nx-spot-active', '0');
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      lastX = e.clientX;
      lastY = e.clientY;
      if (!rafId) {
        rafId = window.requestAnimationFrame(updateCards);
      }
    };

    const handlePointerLeave = () => {
      lastX = -9999;
      lastY = -9999;
      if (!rafId) {
        rafId = window.requestAnimationFrame(updateCards);
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('mouseleave', handlePointerLeave);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('mouseleave', handlePointerLeave);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);
}
