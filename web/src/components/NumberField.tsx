import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { AutoScrollLabel } from './AutoScrollLabel';

interface NumberFieldProps {
  label: string;
  value: string | number;
  onChange: (nextVal: string) => void;
  step?: number;
  min?: number;
  max?: number;
  required?: boolean;
  className?: string;
}

/**
 * Campo numérico com setas customizadas elegantes (substitui as setas nativas feias do navegador).
 */
export const NumberField: React.FC<NumberFieldProps> = ({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max,
  required = false,
  className = ''
}) => {
  const decimals = String(step).includes('.') ? String(step).split('.')[1].length : 0;

  function adjust(direction: 1 | -1) {
    const parsed = Number(String(value ?? '').replace(',', '.'));
    const current = Number.isFinite(parsed) ? parsed : 0;
    let next = current + direction * step;
    if (min !== undefined && next < min) next = min;
    if (max !== undefined && next > max) next = max;
    const formatted = decimals > 0 ? Number(next.toFixed(decimals)).toString() : String(Math.round(next));
    onChange(formatted);
  }

  return (
    <div className={`nx-field nx-field--stepper ${className}`.trim()}>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        placeholder=" "
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
      <AutoScrollLabel>{label}</AutoScrollLabel>
      <div className="nx-num-stepper">
        <button
          type="button"
          tabIndex={-1}
          onClick={() => adjust(1)}
          aria-label={`Aumentar ${label}`}
          title="Aumentar"
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button
          type="button"
          tabIndex={-1}
          onClick={() => adjust(-1)}
          aria-label={`Diminuir ${label}`}
          title="Diminuir"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default NumberField;
