import React from 'react';
import neoWordmarkSrc from '../assets/brand/neo_logo.png';
import neoCubeSrc from '../assets/brand/neo_cubo_logo.png';

export type NeoxyLogoVariant = 'wordmark' | 'cube' | 'lockup';
export type NeoxyLogoTone = 'auto' | 'black' | 'white';

interface NeoxyLogoProps {
  className?: string;
  height?: number;
  variant?: NeoxyLogoVariant;
  tone?: NeoxyLogoTone;
  gap?: number;
}

function getToneFilterClass(tone: NeoxyLogoTone): string {
  if (tone === 'white') return 'brightness-0 invert';
  if (tone === 'black') return 'brightness-0';
  return 'brightness-0 dark:invert';
}

/**
 * Identidade visual oficial NEO (Neoxy.ai).
 * Suporta o ícone geométrico em cubo ("neo_cubo_logo"), o logotipo em texto ("neo_logo")
 * ou a assinatura combinada ("lockup"), em preto absoluto, branco absoluto ou adaptativo ao tema.
 */
export const NeoxyLogo: React.FC<NeoxyLogoProps> = ({
  className = '',
  height = 22,
  variant = 'wordmark',
  tone = 'auto',
  gap
}) => {
  const filterClass = getToneFilterClass(tone);

  if (variant === 'cube') {
    return (
      <img
        src={neoCubeSrc}
        alt="NEO"
        draggable={false}
        style={{ height: `${height}px`, width: 'auto' }}
        className={`inline-block object-contain select-none shrink-0 transition-[filter] duration-200 ${filterClass} ${className}`}
      />
    );
  }

  if (variant === 'lockup') {
    const cubeHeight = Math.round(height * 1.32);
    const computedGap = gap ?? Math.max(8, Math.round(height * 0.48));
    return (
      <span
        className={`inline-flex items-center select-none shrink-0 ${className}`}
        style={{ gap: `${computedGap}px` }}
        aria-label="NEO"
      >
        <img
          src={neoCubeSrc}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{ height: `${cubeHeight}px`, width: 'auto' }}
          className={`object-contain shrink-0 transition-[filter] duration-200 ${filterClass}`}
        />
        <img
          src={neoWordmarkSrc}
          alt="NEO"
          draggable={false}
          style={{ height: `${height}px`, width: 'auto' }}
          className={`object-contain shrink-0 transition-[filter] duration-200 ${filterClass}`}
        />
      </span>
    );
  }

  return (
    <img
      src={neoWordmarkSrc}
      alt="NEO"
      draggable={false}
      style={{ height: `${height}px`, width: 'auto' }}
      className={`inline-block object-contain select-none shrink-0 transition-[filter] duration-200 ${filterClass} ${className}`}
    />
  );
};

export const NeoCubeIcon: React.FC<{
  size?: number;
  tone?: NeoxyLogoTone;
  className?: string;
}> = ({ size = 24, tone = 'auto', className = '' }) => (
  <NeoxyLogo variant="cube" height={size} tone={tone} className={className} />
);

export default NeoxyLogo;
