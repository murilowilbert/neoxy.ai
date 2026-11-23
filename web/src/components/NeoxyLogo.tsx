import React from 'react';

interface NeoxyLogoProps {
  className?: string;
  height?: number;
}

/**
 * Marca geométrica NEO enviada pelo usuário.
 * Usa currentColor para se adaptar automaticamente ao modo claro, escuro e fundos fotográficos.
 */
export const NeoxyLogo: React.FC<NeoxyLogoProps> = ({ className = '', height = 20 }) => {
  const width = Math.round(height * 3.85);
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 154 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="NEO / Neoxy.ai"
    >
      {/* Letra N geométrica (barra vertical esquerda + diagonal) */}
      <path d="M2 38V2H11L36 30.5V38H27L10 18.5V38H2Z" fill="currentColor" />
      {/* Letra E geométrica (três barras horizontais paralelas) */}
      <rect x="52" y="2" width="40" height="8" fill="currentColor" />
      <rect x="52" y="16" width="40" height="8" fill="currentColor" />
      <rect x="52" y="30" width="40" height="8" fill="currentColor" />
      {/* Letra O geométrica (quadrado vazado) */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M108 2H152V38H108V2ZM116 10V30H144V10H116Z"
        fill="currentColor"
      />
    </svg>
  );
};

export default NeoxyLogo;
