import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';

export interface CalendarHoliday {
  date: string; // YYYY-MM-DD
  name: string;
  isCustom?: boolean;
}

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (val: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  customHolidays?: CalendarHoliday[];
  onHolidayDetected?: (holidayName: string) => void;
  className?: string;
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
];

const WEEKDAY_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toIso(y: number, mZero: number, d: number): string {
  return `${y}-${pad2(mZero + 1)}-${pad2(d)}`;
}

function addDays(date: Date, days: number): Date {
  const out = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  return out;
}

/**
 * Calcula a data da Páscoa (algoritmo gregoriano de Meeus/Jones/Butcher)
 * e retorna todos os feriados nacionais brasileiros (fixos + móveis) do ano.
 */
export function getBrazilianHolidaysForYear(year: number): CalendarHoliday[] {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  const easter = new Date(year, month, day);
  const carnavalMon = addDays(easter, -48);
  const carnavalTue = addDays(easter, -47);
  const goodFriday = addDays(easter, -2);
  const corpusChristi = addDays(easter, 60);

  const fmt = (dt: Date) => toIso(dt.getFullYear(), dt.getMonth(), dt.getDate());

  return [
    { date: `${year}-01-01`, name: 'Confraternização Universal' },
    { date: fmt(carnavalMon), name: 'Carnaval (Ponto Facultativo)' },
    { date: fmt(carnavalTue), name: 'Carnaval' },
    { date: fmt(goodFriday), name: 'Sexta-feira Santa' },
    { date: fmt(easter), name: 'Páscoa' },
    { date: `${year}-04-21`, name: 'Tiradentes' },
    { date: `${year}-05-01`, name: 'Dia do Trabalho' },
    { date: fmt(corpusChristi), name: 'Corpus Christi' },
    { date: `${year}-09-07`, name: 'Independência do Brasil' },
    { date: `${year}-10-12`, name: 'Nossa Sra. Aparecida' },
    { date: `${year}-11-02`, name: 'Finados' },
    { date: `${year}-11-15`, name: 'Proclamação da República' },
    { date: `${year}-11-20`, name: 'Dia da Consciência Negra' },
    { date: `${year}-12-25`, name: 'Natal' }
  ];
}

function formatBrDisplay(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  placeholder = 'dd/mm/aaaa',
  ariaLabel = 'Selecionar data',
  customHolidays = [],
  onHolidayDetected,
  className = ''
}) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const initialDate = useMemo(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  }, [value]);

  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m] = value.split('-').map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      if (!wrapRef.current) return;
      const rect = wrapRef.current.getBoundingClientRect();
      const popWidth = 316;
      const popEstHeight = 390;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top =
        spaceBelow < popEstHeight && rect.top > popEstHeight
          ? Math.max(12, rect.top - popEstHeight - 8)
          : Math.min(window.innerHeight - popEstHeight - 12, rect.bottom + 8);
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - popWidth - 12));
      setCoords({ top, left });
    };

    updatePosition();

    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        wrapRef.current &&
        !wrapRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  const todayIso = useMemo(() => {
    const now = new Date();
    return toIso(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const holidayMap = useMemo(() => {
    const map = new Map<string, CalendarHoliday>();
    for (const h of getBrazilianHolidaysForYear(viewYear)) {
      map.set(h.date, h);
    }
    for (const h of getBrazilianHolidaysForYear(viewYear - 1)) {
      if (!map.has(h.date)) map.set(h.date, h);
    }
    for (const h of getBrazilianHolidaysForYear(viewYear + 1)) {
      if (!map.has(h.date)) map.set(h.date, h);
    }
    for (const ch of customHolidays) {
      if (ch.date) {
        map.set(ch.date, { ...ch, isCustom: true });
      }
    }
    return map;
  }, [viewYear, customHolidays]);

  const monthHolidays = useMemo(() => {
    const prefix = `${viewYear}-${pad2(viewMonth + 1)}-`;
    return Array.from(holidayMap.values())
      .filter((h) => h.date.startsWith(prefix))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [holidayMap, viewYear, viewMonth]);

  const calendarCells = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstOfMonth.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: Array<{
      iso: string;
      day: number;
      inCurrentMonth: boolean;
      holiday?: CalendarHoliday;
    }> = [];

    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const dt = new Date(viewYear, viewMonth - 1, d);
      const iso = toIso(dt.getFullYear(), dt.getMonth(), dt.getDate());
      cells.push({ iso, day: d, inCurrentMonth: false, holiday: holidayMap.get(iso) });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const iso = toIso(viewYear, viewMonth, d);
      cells.push({ iso, day: d, inCurrentMonth: true, holiday: holidayMap.get(iso) });
    }

    let nextDay = 1;
    while (cells.length < 42) {
      const dt = new Date(viewYear, viewMonth + 1, nextDay);
      const iso = toIso(dt.getFullYear(), dt.getMonth(), dt.getDate());
      cells.push({ iso, day: nextDay, inCurrentMonth: false, holiday: holidayMap.get(iso) });
      nextDay++;
    }

    return cells;
  }, [viewYear, viewMonth, holidayMap]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function selectIso(iso: string) {
    onChange(iso);
    const hol = holidayMap.get(iso);
    if (hol && onHolidayDetected) {
      onHolidayDetected(hol.name);
    }
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs transition-all bg-[var(--nx-surface)] text-left ${
          open
            ? 'border-[var(--nx-primary)] ring-2 ring-[var(--nx-primary)]/15'
            : 'border-[var(--nx-border-strong)] hover:border-[var(--nx-primary)]/60'
        }`}
      >
        <span className={`tabular-data truncate ${value ? 'text-[var(--nx-text)] font-medium' : 'text-[var(--nx-subtle)]'}`}>
          {value ? formatBrDisplay(value) : placeholder}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {value && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-0.5 rounded hover:bg-[var(--nx-surface-alt)] text-[var(--nx-subtle)] hover:text-[var(--nx-text)]"
              title="Limpar data"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <CalendarIcon className="w-3.5 h-3.5 text-[var(--nx-muted)]" />
        </span>
      </button>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            style={{ position: 'fixed', top: coords.top, left: coords.left }}
            className="z-[9999] w-[304px] sm:w-[316px] rounded-2xl border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] shadow-2xl p-3.5 animate-fade-up"
            data-testid="neo-date-picker-popover"
          >
          {/* Cabeçalho Mês / Ano */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="w-7 h-7 rounded-lg border border-[var(--nx-border)] bg-[var(--nx-bg)] hover:bg-[var(--nx-surface-alt)] flex items-center justify-center text-[var(--nx-text)] transition-colors"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-xs font-bold text-[var(--nx-text)] tracking-tight">
              {MONTH_NAMES[viewMonth]} de {viewYear}
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="w-7 h-7 rounded-lg border border-[var(--nx-border)] bg-[var(--nx-bg)] hover:bg-[var(--nx-surface-alt)] flex items-center justify-center text-[var(--nx-text)] transition-colors"
              aria-label="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Dias da semana */}
          <div className="grid grid-cols-7 gap-1 mb-1.5 text-center">
            {WEEKDAY_SHORT.map((wd, idx) => (
              <div
                key={idx}
                className="text-[10px] font-bold uppercase tracking-wider text-[var(--nx-subtle)] py-1"
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Grade de dias */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell) => {
              const isSelected = value === cell.iso;
              const isToday = todayIso === cell.iso;
              const hasHoliday = Boolean(cell.holiday);

              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => selectIso(cell.iso)}
                  title={cell.holiday ? `${formatBrDisplay(cell.iso)} — ${cell.holiday.name}` : formatBrDisplay(cell.iso)}
                  className={`relative h-8 rounded-lg text-[11.5px] font-medium tabular-data transition-all flex flex-col items-center justify-center ${
                    isSelected
                      ? 'bg-[var(--nx-primary)] text-[var(--nx-primary-fg)] font-bold shadow-sm'
                      : hasHoliday && cell.inCurrentMonth
                      ? 'bg-amber-500/12 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 font-semibold'
                      : isToday
                      ? 'border border-[var(--nx-primary)] text-[var(--nx-text)] font-bold bg-[var(--nx-surface-alt)]'
                      : cell.inCurrentMonth
                      ? 'text-[var(--nx-text)] hover:bg-[var(--nx-surface-alt)]'
                      : 'text-[var(--nx-subtle)]/50 hover:bg-[var(--nx-surface-alt)]/50'
                  }`}
                >
                  <span>{cell.day}</span>
                  {hasHoliday && (
                    <span
                      className={`w-1 h-1 rounded-full absolute bottom-1 ${
                        isSelected
                          ? 'bg-[var(--nx-primary-fg)]'
                          : cell.holiday?.isCustom
                          ? 'bg-emerald-500'
                          : 'bg-amber-500'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Feriados do mês (visíveis de cara!) */}
          {monthHolidays.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-[var(--nx-border)] space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--nx-subtle)]">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Feriados em {MONTH_NAMES[viewMonth]}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {monthHolidays.map((h) => (
                  <button
                    key={h.date}
                    type="button"
                    onClick={() => selectIso(h.date)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] border transition-colors ${
                      value === h.date
                        ? 'bg-[var(--nx-primary)] text-[var(--nx-primary-fg)] border-transparent font-semibold'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25 hover:bg-amber-500/20'
                    }`}
                  >
                    <span className="font-bold tabular-data">{h.date.slice(8, 10)}/{h.date.slice(5, 7)}</span>
                    <span className="truncate max-w-[165px]">{h.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rodapé Limpar / Hoje */}
          <div className="mt-3 pt-2.5 border-t border-[var(--nx-border)] flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="text-[11px] font-medium text-[var(--nx-muted)] hover:text-[var(--nx-text)] px-2 py-1 rounded-md hover:bg-[var(--nx-surface-alt)] transition-colors"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => selectIso(todayIso)}
              className="text-[11px] font-semibold text-[var(--nx-volt-ink)] bg-[var(--nx-volt-surface)] border border-[var(--nx-volt-border)] px-2.5 py-1 rounded-full hover:opacity-90 transition-opacity"
            >
              Hoje
            </button>
          </div>
        </div>,
          document.body
        )}
    </div>
  );
};
