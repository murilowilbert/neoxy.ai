import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Clock,
  Calendar,
  Plus,
  Trash2,
  Download,
  Share2
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { AutoScrollLabel } from '../AutoScrollLabel';
import { CustomSelect } from '../CustomSelect';

interface TimeSlot {
  start: string;
  end: string;
}

interface ScheduleException {
  date: string;
  type: 'closed' | 'horario_especial';
  reason: string;
  returnDate?: string;
  specialHours?: { open: string; close: string };
}

interface CompanyHoursTabProps {
  tenant: any;
  onSaved: () => Promise<void>;
  onNotify: (msg: string) => void;
}

const WEEK_DAYS = [
  { key: '1', label: 'Segunda-feira' },
  { key: '2', label: 'Terça-feira' },
  { key: '3', label: 'Quarta-feira' },
  { key: '4', label: 'Quinta-feira' },
  { key: '5', label: 'Sexta-feira' },
  { key: '6', label: 'Sábado' },
  { key: '0', label: 'Domingo' }
];

export const CompanyHoursTab: React.FC<CompanyHoursTabProps> = ({
  tenant,
  onSaved,
  onNotify
}) => {
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [youtube, setYoutube] = useState('');

  const [schedule, setSchedule] = useState<Record<string, TimeSlot[]>>({});
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);

  // Novo feriado / data especial
  const [newExDate, setNewExDate] = useState('');
  const [newExReason, setNewExReason] = useState('');
  const [newExType, setNewExType] = useState<'closed' | 'horario_especial'>('closed');
  const [newExOpen, setNewExOpen] = useState('09:00');
  const [newExClose, setNewExClose] = useState('13:00');
  const [newExReturn, setNewExReturn] = useState('');

  const [holidayYear, setHolidayYear] = useState(String(new Date().getFullYear()));
  const [importingHolidays, setImportingHolidays] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const s = tenant?.parsedSettings || tenant?.settings || {};
    const info = s.storeInfo || {};
    const social = info.socialLinks || {};
    const bh = s.businessHours || {};

    setAddress(info.address || '');
    setCity(info.city || '');
    setMapsUrl(info.mapsUrl || '');
    setLatitude(info.latitude !== undefined && info.latitude !== null ? String(info.latitude) : '');
    setLongitude(info.longitude !== undefined && info.longitude !== null ? String(info.longitude) : '');
    setGoogleReviewUrl(info.googleReviewUrl || '');
    setPhone(info.phone || '');
    setWebsite(info.website || '');
    setInstagram(social.instagram || '');
    setFacebook(social.facebook || '');
    setTiktok(social.tiktok || '');
    setYoutube(social.youtube || '');

    const initialSchedule: Record<string, TimeSlot[]> = {};
    for (const d of WEEK_DAYS) {
      const slots = bh.schedule?.[d.key];
      initialSchedule[d.key] = Array.isArray(slots) ? slots.map((x: any) => ({ ...x })) : [];
    }
    setSchedule(initialSchedule);
    setExceptions(Array.isArray(bh.exceptions) ? bh.exceptions : []);
  }, [tenant]);

  function handleMapsUrlChange(val: string) {
    setMapsUrl(val);
    const coordMatch = val.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || val.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (coordMatch) {
      setLatitude(coordMatch[1]);
      setLongitude(coordMatch[2]);
    }
  }

  function toggleDayOpen(dayKey: string) {
    setSchedule((prev) => {
      const current = prev[dayKey] || [];
      return {
        ...prev,
        [dayKey]: current.length > 0 ? [] : [{ start: '08:00', end: '18:00' }]
      };
    });
  }

  function updateSlot(dayKey: string, idx: number, field: 'start' | 'end', value: string) {
    setSchedule((prev) => {
      const list = [...(prev[dayKey] || [])];
      list[idx] = { ...list[idx], [field]: value };
      return { ...prev, [dayKey]: list };
    });
  }

  function addSlot(dayKey: string) {
    setSchedule((prev) => {
      const list = [...(prev[dayKey] || [])];
      if (list.length >= 2) return prev;
      list.push({ start: '13:30', end: '18:00' });
      return { ...prev, [dayKey]: list };
    });
  }

  function removeSlot(dayKey: string, idx: number) {
    setSchedule((prev) => {
      const list = [...(prev[dayKey] || [])].filter((_, i) => i !== idx);
      return { ...prev, [dayKey]: list };
    });
  }

  function copyMondayToWeekdays() {
    const monday = schedule['1'] || [{ start: '08:00', end: '18:00' }];
    setSchedule((prev) => ({
      ...prev,
      '2': monday.map((s) => ({ ...s })),
      '3': monday.map((s) => ({ ...s })),
      '4': monday.map((s) => ({ ...s })),
      '5': monday.map((s) => ({ ...s }))
    }));
    onNotify('Horário de segunda-feira copiado para terça a sexta.');
  }

  function handleAddException(e: React.FormEvent) {
    e.preventDefault();
    if (!newExDate || !newExReason.trim()) return;
    const item: ScheduleException = {
      date: newExDate,
      type: newExType,
      reason: newExReason.trim(),
      ...(newExType === 'horario_especial'
        ? { specialHours: { open: newExOpen, close: newExClose } }
        : { returnDate: newExReturn.trim() || undefined })
    };
    setExceptions((prev) => {
      const filtered = prev.filter((ex) => ex.date !== item.date);
      return [...filtered, item].sort((a, b) => a.date.localeCompare(b.date));
    });
    setNewExDate('');
    setNewExReason('');
    setNewExReturn('');
  }

  function removeException(date: string) {
    setExceptions((prev) => prev.filter((ex) => ex.date !== date));
  }

  async function handleImportNationalHolidays() {
    setImportingHolidays(true);
    try {
      const res = await apiFetch(`/api/system/holidays/${holidayYear}`);
      const list = Array.isArray(res.holidays) ? res.holidays : [];
      if (list.length === 0) {
        onNotify('Nenhum feriado retornado para este ano.');
        return;
      }
      setExceptions((prev) => {
        const existingDates = new Set(prev.map((x) => x.date));
        const merged = [...prev];
        let added = 0;
        for (const h of list) {
          if (!existingDates.has(h.date)) {
            merged.push({
              date: h.date,
              type: 'closed',
              reason: h.name
            });
            added += 1;
          }
        }
        onNotify(
          `${added} feriados nacionais de ${holidayYear} importados (clique em Salvar para confirmar).`
        );
        return merged.sort((a, b) => a.date.localeCompare(b.date));
      });
    } catch (err: any) {
      onNotify(err.message || 'Falha ao importar feriados.');
    } finally {
      setImportingHolidays(false);
    }
  }

  async function handleSaveAll(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const currentSettings = tenant?.parsedSettings || tenant?.settings || {};
      const parsedLat = latitude.trim() !== '' && Number.isFinite(Number(latitude.replace(',', '.')))
        ? Number(latitude.replace(',', '.'))
        : null;
      const parsedLng = longitude.trim() !== '' && Number.isFinite(Number(longitude.replace(',', '.')))
        ? Number(longitude.replace(',', '.'))
        : null;

      const updatedStoreInfo = {
        ...(currentSettings.storeInfo || {}),
        address: address.trim(),
        city: city.trim(),
        mapsUrl: mapsUrl.trim(),
        latitude: parsedLat,
        longitude: parsedLng,
        googleReviewUrl: googleReviewUrl.trim(),
        phone: phone.trim(),
        website: website.trim(),
        socialLinks: {
          instagram: instagram.trim(),
          facebook: facebook.trim(),
          tiktok: tiktok.trim(),
          youtube: youtube.trim()
        }
      };

      const updatedBusinessHours = {
        ...(currentSettings.businessHours || {}),
        timezone: currentSettings.businessHours?.timezone || 'America/Sao_Paulo',
        schedule,
        exceptions
      };

      await apiFetch(`/api/tenants/${tenant.slug}/settings`, {
        method: 'PUT',
        body: JSON.stringify({
          settings: {
            storeInfo: updatedStoreInfo,
            businessHours: updatedBusinessHours
          }
        })
      });

      await onSaved();
      onNotify('Endereço, avaliação Google, coordenadas, redes sociais e horários salvos!');
    } catch (err: any) {
      onNotify(err.message || 'Erro ao salvar configurações da empresa.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSaveAll} className="space-y-6 animate-fade-up">
      {/* Barra superior com ação Salvar */}
      <div className="bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-[var(--nx-text)]">
            Localização, Avaliação Google, Redes Sociais, Horários & Feriados
          </h2>
          <p className="text-xs text-[var(--nx-muted)]">
            O bot do WhatsApp usa estes dados para enviar Pin no Mapa, link direto de avaliação no Google Meu Negócio e informar horários em feriados.
          </p>
        </div>

        <button type="submit" disabled={saving} className="nx-btn-primary px-5 py-2.5 text-xs shrink-0">
          {saving ? 'Salvando...' : 'Salvar Empresa & Horários'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda: Localização + Redes Sociais */}
        <div className="lg:col-span-5 space-y-5">
          {/* Endereço e Contato */}
          <div className="bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--nx-text)]">
              <MapPin className="w-4 h-4 text-[var(--nx-primary)]" />
              Endereço, Pin de Mapa & Avaliação Google
            </div>

            <div className="space-y-3">
              <div className="nx-field !mb-0">
                <input
                  type="text"
                  placeholder=" "
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
                <AutoScrollLabel>Endereço completo (Rua, nº, bairro)</AutoScrollLabel>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="nx-field !mb-0">
                  <input
                    type="text"
                    placeholder=" "
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                  <AutoScrollLabel>Cidade / UF</AutoScrollLabel>
                </div>
                <div className="nx-field !mb-0">
                  <input
                    type="text"
                    placeholder=" "
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <AutoScrollLabel>Telefone comercial (vCard)</AutoScrollLabel>
                </div>
              </div>

              <div className="nx-field !mb-0">
                <input
                  type="url"
                  placeholder=" "
                  value={mapsUrl}
                  onChange={(e) => handleMapsUrlChange(e.target.value)}
                />
                <AutoScrollLabel>Link Google Maps (cole URL com @lat,lng para preencher o Pin)</AutoScrollLabel>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="nx-field !mb-0">
                  <input
                    type="text"
                    placeholder=" "
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                  />
                  <AutoScrollLabel>Latitude (ex: -29.574)</AutoScrollLabel>
                </div>
                <div className="nx-field !mb-0">
                  <input
                    type="text"
                    placeholder=" "
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                  />
                  <AutoScrollLabel>Longitude (ex: -50.791)</AutoScrollLabel>
                </div>
              </div>

              <div className="nx-field !mb-0">
                <input
                  type="url"
                  placeholder=" "
                  value={googleReviewUrl}
                  onChange={(e) => setGoogleReviewUrl(e.target.value)}
                />
                <AutoScrollLabel>Link de Avaliação Google Meu Negócio (g.page/r/.../review)</AutoScrollLabel>
              </div>
              <p className="text-[11px] text-[var(--nx-muted)] leading-relaxed">
                Quando configurado, o bot ou atendente pode enviar esse link direto no WhatsApp para o cliente avaliar sua empresa com 5 estrelas no Google.
              </p>

              <div className="nx-field !mb-0">
                <input
                  type="url"
                  placeholder=" "
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
                <AutoScrollLabel>Site oficial (opcional)</AutoScrollLabel>
              </div>
            </div>
          </div>

          {/* Redes Sociais */}
          <div className="bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--nx-text)]">
              <Share2 className="w-4 h-4 text-[var(--nx-primary)]" />
              Links para Redes Sociais
            </div>

            <div className="space-y-3">
              <div className="nx-field nx-field--icon-left !mb-0">
                <span className="nx-field-prefix" aria-hidden="true" style={{ color: '#E1306C' }}>
                  <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder=" "
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                />
                <AutoScrollLabel>Instagram (@perfil ou URL)</AutoScrollLabel>
              </div>

              <div className="nx-field nx-field--icon-left !mb-0">
                <span className="nx-field-prefix" aria-hidden="true" style={{ color: '#1877F2' }}>
                  <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor">
                    <path d="M13.5 21v-8.2h2.75l.42-3.2H13.5V7.55c0-.93.26-1.56 1.58-1.56h1.69V3.13c-.29-.04-1.3-.13-2.47-.13-2.45 0-4.12 1.5-4.12 4.24v2.36H7.4v3.2h2.78V21h3.32Z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder=" "
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                />
                <AutoScrollLabel>Facebook (URL da página)</AutoScrollLabel>
              </div>

              <div className="nx-field nx-field--icon-left !mb-0">
                <span className="nx-field-prefix text-[var(--nx-text)]" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="w-[17px] h-[17px]" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1Z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder=" "
                  value={tiktok}
                  onChange={(e) => setTiktok(e.target.value)}
                />
                <AutoScrollLabel>TikTok (@perfil ou URL)</AutoScrollLabel>
              </div>

              <div className="nx-field nx-field--icon-left !mb-0">
                <span className="nx-field-prefix" aria-hidden="true" style={{ color: '#FF0000' }}>
                  <svg viewBox="0 0 24 24" className="w-[19px] h-[19px]" fill="currentColor">
                    <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder=" "
                  value={youtube}
                  onChange={(e) => setYoutube(e.target.value)}
                />
                <AutoScrollLabel>YouTube (canal ou URL)</AutoScrollLabel>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Grade Semanal + Feriados/Datas Especiais */}
        <div className="lg:col-span-7 space-y-5">
          {/* Horários de Funcionamento */}
          <div className="bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--nx-text)]">
                <Clock className="w-4 h-4 text-[var(--nx-primary)]" />
                Horários de Atendimento Semanal
              </div>
              <button
                type="button"
                onClick={copyMondayToWeekdays}
                className="px-2.5 py-1 rounded border border-[var(--nx-border-strong)] bg-[var(--nx-bg)] hover:border-[var(--nx-primary)] text-[11px] font-medium text-[var(--nx-text)]"
              >
                Copiar Segunda para Seg–Sex
              </button>
            </div>

            <div className="divide-y divide-[var(--nx-border)] border border-[var(--nx-border)] rounded-lg bg-[var(--nx-bg)]">
              {WEEK_DAYS.map((day) => {
                const slots = schedule[day.key] || [];
                const isOpen = slots.length > 0;
                return (
                  <div
                    key={day.key}
                    className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-[160px]">
                      <input
                        type="checkbox"
                        checked={isOpen}
                        onChange={() => toggleDayOpen(day.key)}
                        className="w-4 h-4 accent-[var(--nx-primary)]"
                      />
                      <span
                        className={`text-xs font-semibold ${
                          isOpen ? 'text-[var(--nx-text)]' : 'text-[var(--nx-subtle)]'
                        }`}
                      >
                        {day.label}
                      </span>
                    </div>

                    {!isOpen ? (
                      <span className="text-[11px] text-[var(--nx-subtle)] font-medium">
                        Fechado
                      </span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
                        {slots.map((slot, idx) => (
                          <div key={idx} className="inline-flex items-center gap-1.5">
                            <input
                              type="time"
                              value={slot.start}
                              onChange={(e) => updateSlot(day.key, idx, 'start', e.target.value)}
                              className="px-2 py-1 rounded border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] text-xs tabular-data text-[var(--nx-text)]"
                            />
                            <span className="text-[11px] text-[var(--nx-subtle)]">às</span>
                            <input
                              type="time"
                              value={slot.end}
                              onChange={(e) => updateSlot(day.key, idx, 'end', e.target.value)}
                              className="px-2 py-1 rounded border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] text-xs tabular-data text-[var(--nx-text)]"
                            />
                            {slots.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeSlot(day.key, idx)}
                                className="p-1 text-[var(--nx-muted)] hover:text-[var(--nx-error)]"
                                title="Remover turno"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                        {slots.length < 2 && (
                          <button
                            type="button"
                            onClick={() => addSlot(day.key)}
                            className="px-2 py-1 rounded border border-dashed border-[var(--nx-border-strong)] hover:border-[var(--nx-primary)] text-[11px] text-[var(--nx-muted)] hover:text-[var(--nx-primary)]"
                            title="Adicionar segundo turno (ex: após almoço)"
                          >
                            + 2º turno
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Feriados & Datas Especiais */}
          <div className="bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--nx-text)]">
                <Calendar className="w-4 h-4 text-[var(--nx-primary)]" />
                Feriados & Horários Especiais
              </div>

              <div className="flex items-center gap-2">
                <CustomSelect
                  variant="compact"
                  value={holidayYear}
                  onChange={(val) => setHolidayYear(val)}
                  options={[
                    { value: '2026', label: '2026' },
                    { value: '2027', label: '2027' }
                  ]}
                  buttonClassName="min-w-[82px]"
                />
                <button
                  type="button"
                  onClick={handleImportNationalHolidays}
                  disabled={importingHolidays}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--nx-border-strong)] bg-[var(--nx-bg)] hover:border-[var(--nx-primary)] text-xs font-medium text-[var(--nx-text)]"
                >
                  <Download className="w-3.5 h-3.5 text-[var(--nx-primary)]" />
                  {importingHolidays ? 'Importando...' : 'Importar Feriados BR'}
                </button>
              </div>
            </div>

            {/* Adicionar Data Especial / Feriado */}
            <div className="p-3.5 rounded-lg border border-[var(--nx-border)] bg-[var(--nx-bg)] space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="date"
                  value={newExDate}
                  onChange={(e) => setNewExDate(e.target.value)}
                  className="px-2.5 py-2 rounded-lg border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] text-xs text-[var(--nx-text)]"
                />
                <input
                  type="text"
                  value={newExReason}
                  onChange={(e) => setNewExReason(e.target.value)}
                  placeholder="Motivo (ex: Feriado Municipal, Inventário)"
                  className="px-2.5 py-2 rounded-lg border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] text-xs text-[var(--nx-text)]"
                />
                <CustomSelect
                  variant="compact"
                  value={newExType}
                  onChange={(val) => setNewExType(val as 'closed' | 'horario_especial')}
                  options={[
                    { value: 'closed', label: 'Fechado o dia todo' },
                    { value: 'horario_especial', label: 'Horário especial' }
                  ]}
                  className="w-full"
                  buttonClassName="w-full py-2"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2.5">
                {newExType === 'horario_especial' ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[var(--nx-muted)]">Abre:</span>
                    <input
                      type="time"
                      value={newExOpen}
                      onChange={(e) => setNewExOpen(e.target.value)}
                      className="px-2 py-1 rounded border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] tabular-data text-xs"
                    />
                    <span className="text-[var(--nx-muted)]">Fecha:</span>
                    <input
                      type="time"
                      value={newExClose}
                      onChange={(e) => setNewExClose(e.target.value)}
                      className="px-2 py-1 rounded border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] tabular-data text-xs"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={newExReturn}
                    onChange={(e) => setNewExReturn(e.target.value)}
                    placeholder="Previsão de retorno (opcional, ex: sexta às 08h)"
                    className="flex-1 min-w-[200px] px-2.5 py-1.5 rounded border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] text-xs text-[var(--nx-text)]"
                  />
                )}

                <button
                  type="button"
                  onClick={handleAddException}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[var(--nx-primary)] text-white text-xs font-semibold hover:opacity-90"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar Data
                </button>
              </div>
            </div>

            {/* Lista de Datas Programadas */}
            {exceptions.length === 0 ? (
              <div className="text-xs text-[var(--nx-subtle)] text-center py-4">
                Nenhum feriado ou horário especial programado.
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto divide-y divide-[var(--nx-border)] border border-[var(--nx-border)] rounded-lg bg-[var(--nx-bg)]">
                {exceptions.map((ex) => {
                  const [y, m, d] = String(ex.date).split('-');
                  const brDate = d && m && y ? `${d}/${m}/${y}` : ex.date;
                  return (
                    <div
                      key={ex.date}
                      className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="tabular-data font-bold text-[var(--nx-text)] tabular-data shrink-0">
                          {brDate}
                        </span>
                        <div className="min-w-0">
                          <div className="font-medium text-[var(--nx-text)] truncate">
                            {ex.reason}
                          </div>
                          <div className="text-[11px] text-[var(--nx-muted)]">
                            {ex.type === 'horario_especial' && ex.specialHours
                              ? `Horário especial: ${ex.specialHours.open} às ${ex.specialHours.close}`
                              : `Fechado${ex.returnDate ? ` (Retorno: ${ex.returnDate})` : ''}`}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeException(ex.date)}
                        className="p-1.5 text-[var(--nx-muted)] hover:text-[var(--nx-error)] shrink-0"
                        title="Remover data"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  );
};

export default CompanyHoursTab;
