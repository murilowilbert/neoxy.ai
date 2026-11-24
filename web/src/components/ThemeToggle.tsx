import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useLanguage } from './LanguageProvider';

const LABELS = {
  pt: { light: 'Modo claro', dark: 'Modo escuro', toLight: 'Ativar modo claro', toDark: 'Ativar modo escuro' },
  en: { light: 'Light mode', dark: 'Dark mode', toLight: 'Switch to light mode', toDark: 'Switch to dark mode' },
  es: { light: 'Modo claro', dark: 'Modo oscuro', toLight: 'Activar modo claro', toDark: 'Activar modo oscuro' }
} as const;

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const { lang } = useLanguage();
  const t = LABELS[lang];

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`h-9 w-9 rounded-full border border-[var(--nx-border-strong)] bg-[var(--nx-surface)]/80 text-[var(--nx-text)] hover:border-[var(--nx-volt)] hover:shadow-[0_0_0_3px_var(--nx-primary-ring)] transition-all flex items-center justify-center shrink-0 ${className}`}
      aria-label={theme === 'dark' ? t.toLight : t.toDark}
      title={theme === 'dark' ? t.light : t.dark}
    >
      {theme === 'dark' ? <Sun className="w-4 h-4 text-[#D4FF00]" /> : <Moon className="w-4 h-4" />}
    </button>
  );
};

export default ThemeToggle;
