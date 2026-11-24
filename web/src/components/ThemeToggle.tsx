import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`h-9 w-9 rounded-full border border-[var(--nx-border-strong)] bg-[var(--nx-surface)]/80 text-[var(--nx-text)] hover:border-[var(--nx-volt)] hover:shadow-[0_0_0_3px_var(--nx-primary-ring)] transition-all flex items-center justify-center ${className}`}
      aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
      title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
    >
      {theme === 'dark' ? <Sun className="w-4 h-4 text-[#D4FF00]" /> : <Moon className="w-4 h-4" />}
    </button>
  );
};

export default ThemeToggle;
