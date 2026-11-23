const axios = require('axios');

/**
 * Calcula a data da Páscoa (Algoritmo de Meeus/Jones/Butcher) para cálculo
 * local de feriados móveis brasileiros (Carnaval, Sexta-Feira Santa, Corpus Christi).
 * Inspirado no projeto open-source BrasilAPI (https://github.com/brasilapi/brasilapi).
 */
function calculateEasterDate(year) {
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
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function addDaysIso(baseDate, offsetDays) {
  const dt = new Date(baseDate.getTime() + offsetDays * 86400000);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildLocalBrazilHolidays(year) {
  const y = Number(year) || new Date().getFullYear();
  const easter = calculateEasterDate(y);

  const list = [
    { date: `${y}-01-01`, name: 'Confraternização Universal', type: 'national' },
    { date: addDaysIso(easter, -47), name: 'Carnaval', type: 'national' },
    { date: addDaysIso(easter, -2), name: 'Sexta-feira Santa', type: 'national' },
    { date: addDaysIso(easter, 0), name: 'Páscoa', type: 'national' },
    { date: `${y}-04-21`, name: 'Tiradentes', type: 'national' },
    { date: `${y}-05-01`, name: 'Dia do Trabalho', type: 'national' },
    { date: addDaysIso(easter, 60), name: 'Corpus Christi', type: 'national' },
    { date: `${y}-09-07`, name: 'Independência do Brasil', type: 'national' },
    { date: `${y}-10-12`, name: 'Nossa Senhora Aparecida', type: 'national' },
    { date: `${y}-11-02`, name: 'Finados', type: 'national' },
    { date: `${y}-11-15`, name: 'Proclamação da República', type: 'national' },
    { date: `${y}-11-20`, name: 'Dia Nacional de Zumbi e da Consciência Negra', type: 'national' },
    { date: `${y}-12-25`, name: 'Natal', type: 'national' }
  ];

  return list.sort((a, b) => a.date.localeCompare(b.date));
}

async function getBrazilHolidays(year) {
  const safeYear = Math.min(2099, Math.max(2020, Number(year) || new Date().getFullYear()));
  try {
    const response = await axios.get(`https://brasilapi.com.br/api/feriados/v1/${safeYear}`, {
      timeout: 3500
    });
    if (Array.isArray(response.data) && response.data.length > 0) {
      return {
        source: 'brasilapi',
        year: safeYear,
        holidays: response.data.map((h) => ({
          date: h.date,
          name: h.name,
          type: h.type || 'national'
        }))
      };
    }
  } catch {
    // Fallback matemático local quando offline ou bloqueado
  }

  return {
    source: 'local_calculator',
    year: safeYear,
    holidays: buildLocalBrazilHolidays(safeYear)
  };
}

module.exports = {
  getBrazilHolidays,
  buildLocalBrazilHolidays
};
