import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

export interface RotatingTextProps {
  texts: string[];
  rotationInterval?: number;
  staggerDuration?: number;
  className?: string;
}

export const RotatingText: React.FC<RotatingTextProps> = ({
  texts,
  rotationInterval = 2600,
  staggerDuration = 0.028,
  className = ''
}) => {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || texts.length <= 1) return undefined;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % texts.length);
    }, rotationInterval);
    return () => window.clearInterval(id);
  }, [texts.length, rotationInterval, reduced]);

  const current = texts[index] ?? texts[0] ?? '';
  const chars = Array.from(current);

  return (
    <motion.span
      layout
      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
      className={`inline-flex items-center justify-center relative overflow-hidden align-baseline ${className}`}
      aria-live="polite"
    >
      <span className="sr-only">{current}</span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={`${current}-${index}`}
          className="inline-flex whitespace-pre"
          aria-hidden="true"
        >
          {chars.map((char, i) => (
            <span key={i} className="inline-flex overflow-hidden">
              <motion.span
                initial={reduced ? { opacity: 0 } : { y: '105%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                exit={reduced ? { opacity: 0 } : { y: '-115%', opacity: 0 }}
                transition={{
                  type: 'spring',
                  damping: 26,
                  stiffness: 340,
                  delay: reduced ? 0 : i * staggerDuration
                }}
                className="inline-block will-change-transform"
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            </span>
          ))}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
};

export default RotatingText;
