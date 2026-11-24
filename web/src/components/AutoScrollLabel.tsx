import React, { useEffect, useRef, useState } from 'react';

interface AutoScrollLabelProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Label flutuante inteligente: detecta se o texto ultrapassa a largura do input.
 * Quando ultrapassa, aplica fade suave na borda (branco no claro / surface no escuro)
 * e desliza o texto suavemente para leitura completa sem nunca encostar na borda.
 */
export const AutoScrollLabel: React.FC<AutoScrollLabelProps> = ({ children, className = '' }) => {
  const labelRef = useRef<HTMLLabelElement>(null);
  const trackRef = useRef<HTMLSpanElement>(null);
  const [overflowPx, setOverflowPx] = useState(0);

  useEffect(() => {
    const measure = () => {
      const lbl = labelRef.current;
      const trk = trackRef.current;
      if (!lbl || !trk) return;
      const diff = trk.scrollWidth - lbl.clientWidth;
      setOverflowPx(diff > 4 ? Math.ceil(diff + 14) : 0);
    };

    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro && labelRef.current) ro.observe(labelRef.current);
    window.addEventListener('resize', measure);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [children]);

  return (
    <label
      ref={labelRef}
      className={`${overflowPx > 0 ? 'nx-label-overflowing' : ''} ${className}`.trim()}
      style={
        overflowPx > 0
          ? ({ '--nx-slide-x': `-${overflowPx}px` } as React.CSSProperties)
          : undefined
      }
    >
      <span ref={trackRef} className="nx-label-track">
        {children}
      </span>
    </label>
  );
};

export default AutoScrollLabel;
