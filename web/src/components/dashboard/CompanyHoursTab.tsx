import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Clock,
  Calendar,
  Plus,
  Trash2,
  Download,
  Share2,
  Check,
  Building2,
  Sparkles,
  ArrowUpRight,
  Search,
  Star,
  CheckSquare,
  Save
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { CustomSelect } from '../CustomSelect';
import { CustomTimePicker } from '../CustomTimePicker';
import { CustomDatePicker } from '../CustomDatePicker';
import JellyRadio from '../reactbits/JellyRadio';

export interface StoreLocationItem {
  id: string;
  name: string;
  isPrimary?: boolean;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  referencePoint: string;
  phone: string;
  mapsUrl: string;
  googleReviewUrl: string;
  latitude?: number | null;
  longitude?: number | null;
}

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

const BRAZIL_UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const AMENITY_OPTIONS: Array<{ key: string; label: string; desc: string }> = [
  { key: 'ownParking', label: 'Estacionamento próprio', desc: 'Vagas exclusivas no local' },
  { key: 'freeParking', label: 'Estacionamento gratuito', desc: 'Sem custo para clientes' },
  { key: 'wheelchairAccess', label: 'Acessibilidade / PCD', desc: 'Entrada adaptada para cadeirantes' },
  { key: 'delivery', label: 'Tele-entrega / Delivery', desc: 'Entrega em domicílio ou obra' },
  { key: 'counterPickup', label: 'Retirada no balcão', desc: 'Pedido pronto para retirar na loja' },
  { key: 'petFriendly', label: 'Espaço Pet Friendly', desc: 'Animais são bem-vindos' },
  { key: 'wifi', label: 'Wi-Fi para clientes', desc: 'Internet gratuita na recepção' },
  { key: 'airConditioning', label: 'Ambiente climatizado', desc: 'Ar-condicionado no local' },
  { key: 'pixAndCards', label: 'Aceita PIX e cartões', desc: 'Débito, crédito e PIX' },
  { key: 'byAppointment', label: 'Hora marcada', desc: 'Atendimento sob agendamento' }
];

function createEmptyLocation(index: number, isPrimary = false): StoreLocationItem {
  return {
    id: `loc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: isPrimary ? 'Matriz' : `Filial ${index}`,
    isPrimary,
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: 'RS',
    referencePoint: '',
    phone: '',
    mapsUrl: '',
    googleReviewUrl: '',
    latitude: null,
    longitude: null
  };
}

function parseLegacyAddress(rawAddress = '', rawCity = ''): Partial<StoreLocationItem> {
  const result: Partial<StoreLocationItem> = {
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: ''
  };
  if (rawAddress) {
    const parts = rawAddress.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts[0]) result.street = parts[0];
    if (parts[1] && /\d|s\/n/i.test(parts[1])) {
      result.number = parts[1];
      if (parts[2]) result.neighborhood = parts[2];
      if (parts[3]) {
        const cityUf = parts[3].split('-').map((s) => s.trim());
        result.city = cityUf[0] || '';
        result.state = (cityUf[1] || '').toUpperCase().slice(0, 2);
      }
    } else if (parts[1]) {
      result.neighborhood = parts[1];
    }
  }
  if (rawCity && !result.city) {
    const cityUf = rawCity.split(/[-/]/).map((s) => s.trim());
    result.city = cityUf[0] || '';
    if (cityUf[1]) result.state = cityUf[1].toUpperCase().slice(0, 2);
  }
  return result;
}

function composeFullAddress(loc: StoreLocationItem): string {
  const streetPart = [loc.street, loc.number].filter(Boolean).join(', ');
  const cityUf = [loc.city, loc.state].filter(Boolean).join(' - ');
  return [streetPart, loc.neighborhood, cityUf].filter(Boolean).join(', ');
}

function buildSmartMapsUrl(companyName: string, loc: StoreLocationItem): string {
  const addr = composeFullAddress(loc);
  if (!addr) return '';
  const query = companyName ? `${companyName}, ${addr}` : addr;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function buildSmartReviewUrl(companyName: string, loc: StoreLocationItem): string {
  const base = [companyName, loc.city, loc.state].filter(Boolean).join(' ').trim();
  if (!base) return '';
  return `https://www.google.com/search?q=${encodeURIComponent(`${base} avaliar google`)}`;
}

export const CompanyHoursTab: React.FC<CompanyHoursTabProps> = ({
  tenant,
  onSaved,
  onNotify
}) => {
  // Múltiplas unidades / locais da empresa
  const [locations, setLocations] = useState<StoreLocationItem[]>([]);
  const [selectedLocId, setSelectedLocId] = useState<string>('');
  const [geocoding, setGeocoding] = useState(false);

  // Redes sociais & site
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [youtube, setYoutube] = useState('');

  // Comodidades do local (para o bot responder sem intervenção humana)
  const [amenities, setAmenities] = useState<Record<string, boolean>>({});
  const [amenitiesNotes, setAmenitiesNotes] = useState('');

  // Horários e feriados
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

    let loadedLocations: StoreLocationItem[] = [];
    if (Array.isArray(info.locations) && info.locations.length > 0) {
      loadedLocations = info.locations.map((loc: any, idx: number) => ({
        id: loc.id || `loc-${idx + 1}`,
        name: loc.name || (idx === 0 ? 'Matriz' : `Filial ${idx + 1}`),
        isPrimary: idx === 0 ? loc.isPrimary !== false : Boolean(loc.isPrimary),
        street: loc.street || '',
        number: loc.number || '',
        neighborhood: loc.neighborhood || '',
        city: loc.city || '',
        state: loc.state || '',
        referencePoint: loc.referencePoint || '',
        phone: loc.phone || '',
        mapsUrl: loc.mapsUrl || '',
        googleReviewUrl: loc.googleReviewUrl || '',
        latitude: loc.latitude ?? null,
        longitude: loc.longitude ?? null
      }));
    } else {
      const parsed = parseLegacyAddress(info.address || '', info.city || '');
      loadedLocations = [
        {
          id: 'loc-principal',
          name: 'Matriz',
          isPrimary: true,
          street: parsed.street || '',
          number: parsed.number || '',
          neighborhood: parsed.neighborhood || '',
          city: parsed.city || '',
          state: parsed.state || 'RS',
          referencePoint: info.referencePoint || '',
          phone: info.phone || '',
          mapsUrl: info.mapsUrl || '',
          googleReviewUrl: info.googleReviewUrl || '',
          latitude: info.latitude ?? null,
          longitude: info.longitude ?? null
        }
      ];
    }

    setLocations(loadedLocations);
    setSelectedLocId(loadedLocations[0]?.id || '');

    setWebsite(info.website || '');
    setInstagram(social.instagram || '');
    setFacebook(social.facebook || '');
    setTiktok(social.tiktok || '');
    setYoutube(social.youtube || '');

    setAmenities(info.amenities && typeof info.amenities === 'object' ? { ...info.amenities } : {});
    setAmenitiesNotes(info.amenitiesNotes || '');

    const initialSchedule: Record<string, TimeSlot[]> = {};
    for (const d of WEEK_DAYS) {
      const slots = bh.schedule?.[d.key];
      initialSchedule[d.key] = Array.isArray(slots) ? slots.map((x: any) => ({ ...x })) : [];
    }
    setSchedule(initialSchedule);
    setExceptions(Array.isArray(bh.exceptions) ? bh.exceptions : []);
  }, [tenant]);

  const activeLocation = useMemo(
    () => locations.find((l) => l.id === selectedLocId) || locations[0] || null,
    [locations, selectedLocId]
  );

  function updateActiveLocation(patch: Partial<StoreLocationItem>) {
    if (!activeLocation) return;
    setLocations((prev) =>
      prev.map((loc) => {
        if (loc.id !== activeLocation.id) return loc;
        const next = { ...loc, ...patch };
        // Se alterou qualquer campo de endereço e o link do Maps estava vazio ou auto-gerado, atualiza automaticamente
        const addressChanged =
          'street' in patch ||
          'number' in patch ||
          'neighborhood' in patch ||
          'city' in patch ||
          'state' in patch;
        if (addressChanged) {
          const isAutoMaps = !loc.mapsUrl || loc.mapsUrl.includes('google.com/maps/search/?api=1');
          if (isAutoMaps) {
            next.mapsUrl = buildSmartMapsUrl(tenant?.name || '', next);
          }
          const isAutoReview = !loc.googleReviewUrl || loc.googleReviewUrl.includes('google.com/search?q=');
          if (isAutoReview && (next.city || tenant?.name)) {
            next.googleReviewUrl = buildSmartReviewUrl(tenant?.name || '', next);
          }
        }
        return next;
      })
    );
  }

  function handleAddLocation() {
    const newLoc = createEmptyLocation(locations.length + 1, locations.length === 0);
    setLocations((prev) => [...prev, newLoc]);
    setSelectedLocId(newLoc.id);
    onNotify(`Nova unidade "${newLoc.name}" adicionada. Preencha o endereço e clique em Salvar.`);
  }

  function handleRemoveLocation(id: string) {
    if (locations.length <= 1) {
      onNotify('Mantenha pelo menos uma unidade principal cadastrada.');
      return;
    }
    const remaining = locations.filter((l) => l.id !== id);
    if (!remaining.some((l) => l.isPrimary) && remaining[0]) {
      remaining[0] = { ...remaining[0], isPrimary: true };
    }
    setLocations(remaining);
    setSelectedLocId(remaining[0]?.id || '');
  }

  function handleSetPrimaryLocation(id: string) {
    setLocations((prev) => prev.map((l) => ({ ...l, isPrimary: l.id === id })));
    onNotify('Unidade principal atualizada.');
  }

  async function handleAutoGeocode() {
    if (!activeLocation) return;
    const addr = composeFullAddress(activeLocation);
    if (!addr || addr.length < 4) {
      onNotify('Preencha pelo menos Rua e Cidade para localizar automaticamente no Google Maps.');
      return;
    }
    setGeocoding(true);
    try {
      const params = new URLSearchParams({
        q: addr,
        companyName: tenant?.name || ''
      });
      const res = await apiFetch(`/api/utils/geocode?${params.toString()}`);
      if (res.result) {
        updateActiveLocation({
          mapsUrl: res.result.mapsUrl,
          latitude: res.result.latitude,
          longitude: res.result.longitude,
          ...(activeLocation.googleReviewUrl ? {} : { googleReviewUrl: res.result.reviewSearchUrl })
        });
        onNotify(
          res.result.latitude
            ? 'Link do Google Maps e Pin de localização preenchidos automaticamente!'
            : 'Link do Google Maps gerado a partir do seu endereço!'
        );
      }
    } catch (err: any) {
      const fallbackMaps = buildSmartMapsUrl(tenant?.name || '', activeLocation);
      updateActiveLocation({ mapsUrl: fallbackMaps });
      onNotify(`Link do Google Maps montado pelo endereço (${err.message}).`);
    } finally {
      setGeocoding(false);
    }
  }

  function toggleAmenity(key: string) {
    setAmenities((prev) => ({ ...prev, [key]: !prev[key] }));
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
      const slots = [...(prev[dayKey] || [])];
      slots[idx] = { ...slots[idx], [field]: value };
      return { ...prev, [dayKey]: slots };
    });
  }

  function addSecondSlot(dayKey: string) {
    setSchedule((prev) => {
      const slots = [...(prev[dayKey] || [])];
      if (slots.length === 1) {
        slots[0] = { start: slots[0].start || '08:00', end: '12:00' };
        slots.push({ start: '13:30', end: '18:00' });
      }
      return { ...prev, [dayKey]: slots };
    });
  }

  function removeSecondSlot(dayKey: string) {
    setSchedule((prev) => {
      const slots = [...(prev[dayKey] || [])];
      if (slots.length > 1) {
        return { ...prev, [dayKey]: [{ start: slots[0].start, end: slots[slots.length - 1].end }] };
      }
      return prev;
    });
  }

  function handleAddException(e: React.FormEvent) {
    e.preventDefault();
    if (!newExDate || !newExReason.trim()) {
      onNotify('Escolha a data no calendário e o motivo do feriado / data especial.');
      return;
    }
    const item: ScheduleException = {
      date: newExDate,
      type: newExType,
      reason: newExReason.trim(),
      returnDate: newExReturn || undefined,
      specialHours:
        newExType === 'horario_especial' ? { open: newExOpen, close: newExClose } : undefined
    };

    setExceptions((prev) => {
      const filtered = prev.filter((ex) => ex.date !== newExDate);
      return [...filtered, item].sort((a, b) => a.date.localeCompare(b.date));
    });
    setNewExDate('');
    setNewExReason('');
    setNewExReturn('');
  }

  function handleRemoveException(date: string) {
    setExceptions((prev) => prev.filter((ex) => ex.date !== date));
  }

  async function handleImportNationalHolidays() {
    setImportingHolidays(true);
    try {
      const res = await apiFetch(`/api/holidays/br/${holidayYear}`);
      const list: Array<{ date: string; name: string }> = res.holidays || [];
      let added = 0;
      setExceptions((prev) => {
        const existingDates = new Set(prev.map((x) => x.date));
        const merged = [...prev];
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
        return merged.sort((a, b) => a.date.localeCompare(b.date));
      });
      onNotify(`${added} feriados nacionais de ${holidayYear} importados! Clique em "Salvar Dados Comerciais".`);
    } catch (err: any) {
      onNotify(`Erro ao importar feriados: ${err.message}`);
    } finally {
      setImportingHolidays(false);
    }
  }

  async function handleSaveAll() {
    if (!tenant?.slug) return;
    setSaving(true);
    try {
      const primaryLoc = locations.find((l) => l.isPrimary) || locations[0];
      const normalizedLocations = locations.map((loc, idx) => {
        const autoMaps = loc.mapsUrl.trim() || buildSmartMapsUrl(tenant.name || '', loc);
        return {
          ...loc,
          name: loc.name.trim() || (idx === 0 ? 'Matriz' : `Filial ${idx + 1}`),
          mapsUrl: autoMaps,
          address: composeFullAddress(loc)
        };
      });

      const primaryFullAddress = primaryLoc ? composeFullAddress(primaryLoc) : '';
      const primaryCityUf = primaryLoc
        ? [primaryLoc.city, primaryLoc.state].filter(Boolean).join(' - ')
        : '';

      const currentSettings = tenant.parsedSettings || tenant.settings || {};
      const updatedSettings = {
        ...currentSettings,
        storeInfo: {
          ...(currentSettings.storeInfo || {}),
          address: primaryFullAddress,
          city: primaryCityUf,
          referencePoint: primaryLoc?.referencePoint || '',
          mapsUrl: primaryLoc?.mapsUrl || buildSmartMapsUrl(tenant.name || '', primaryLoc),
          latitude: primaryLoc?.latitude ?? null,
          longitude: primaryLoc?.longitude ?? null,
          googleReviewUrl: primaryLoc?.googleReviewUrl || '',
          phone: primaryLoc?.phone || '',
          website: website.trim(),
          locations: normalizedLocations,
          amenities,
          amenitiesNotes: amenitiesNotes.trim(),
          socialLinks: {
            instagram: instagram.trim(),
            facebook: facebook.trim(),
            tiktok: tiktok.trim(),
            youtube: youtube.trim()
          }
        },
        businessHours: {
          ...(currentSettings.businessHours || {}),
          timezone: 'America/Sao_Paulo',
          schedule,
          exceptions
        }
      };

      await apiFetch(`/api/tenants/${tenant.slug}/settings`, {
        method: 'PUT',
        body: JSON.stringify({ settings: updatedSettings })
      });
      await onSaved();
      onNotify('Dados comerciais, unidades, comodidades, horários e feriados salvos com sucesso!');
    } catch (err: any) {
      onNotify(err.message);
    } finally {
      setSaving(false);
    }
  }

  const calendarCustomHolidays = useMemo(
    () => exceptions.map((ex) => ({ date: ex.date, name: ex.reason, isCustom: true })),
    [exceptions]
  );

  return (
    <div className="space-y-6 animate-fade-up" data-testid="dados-comerciais-tab">
      {/* ================================================================= */}
      {/* BLOCO 1: UNIDADES, ENDEREÇO ESTRUTURADO & GOOGLE MAPS / AVALIAÇÃO */}
      {/* ================================================================= */}
      <div className="nx-spotlight-card p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="nx-icon-tile nx-icon-tile--sm">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[var(--nx-text)]">
                Unidades & Localização Comercial
              </h3>
              <p className="text-xs text-[var(--nx-muted)]">
                Cadastre um ou mais endereços da empresa. O bot gera o Pin do mapa, informa pontos de referência e sabe onde cada produto/serviço está disponível.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddLocation}
            data-testid="btn-add-location"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] hover:border-[var(--nx-primary)] text-xs font-semibold text-[var(--nx-text)] transition-colors shrink-0 self-start sm:self-center"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar unidade
          </button>
        </div>

        {/* Seletor de unidades com animação JellyRadio */}
        <div className="flex items-center gap-2 flex-wrap pb-3 border-b border-[var(--nx-border)]">
          <JellyRadio
            ariaLabel="Selecionar unidade comercial"
            size="sm"
            radius={10}
            gap={6}
            swell={0.08}
            barge={3}
            shrink={0.02}
            value={activeLocation?.id || locations[0]?.id}
            onChange={(val) => setSelectedLocId(val)}
            items={locations.map((loc, idx) => ({
              value: loc.id,
              icon: <MapPin className="w-3.5 h-3.5 shrink-0" />,
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <span>{loc.name || (idx === 0 ? 'Matriz' : `Filial ${idx + 1}`)}</span>
                  {loc.isPrimary && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-black/15 dark:bg-black/25">
                      Principal
                    </span>
                  )}
                </span>
              )
            }))}
          />
        </div>

        {activeLocation && (
          <div className="space-y-4">
            {/* Linha 1: Nome da Unidade + Ações da Unidade */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-semibold text-[var(--nx-text)] mb-1">
                  Nome da unidade / filial
                </label>
                <input
                  type="text"
                  value={activeLocation.name}
                  onChange={(e) => updateActiveLocation({ name: e.target.value })}
                  placeholder="Ex: Matriz - Centro ou Filial Shopping"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--nx-bg)] border border-[var(--nx-border-strong)] text-xs text-[var(--nx-text)] focus:outline-none focus:border-[var(--nx-primary)]"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[11px] font-semibold text-[var(--nx-text)] mb-1">
                  Telefone comercial (vCard)
                </label>
                <input
                  type="text"
                  value={activeLocation.phone}
                  onChange={(e) => updateActiveLocation({ phone: e.target.value })}
                  placeholder="(51) 99999-9999"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--nx-bg)] border border-[var(--nx-border-strong)] text-xs text-[var(--nx-text)] focus:outline-none focus:border-[var(--nx-primary)] tabular-data"
                />
              </div>

              <div className="sm:col-span-3 flex items-center justify-end gap-2">
                {!activeLocation.isPrimary && (
                  <button
                    type="button"
                    onClick={() => handleSetPrimaryLocation(activeLocation.id)}
                    className="px-3 py-2 rounded-xl border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] hover:border-[var(--nx-primary)] text-[11px] font-semibold text-[var(--nx-text)] transition-colors"
                  >
                    Definir principal
                  </button>
                )}
                {locations.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveLocation(activeLocation.id)}
                    className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors"
                    title="Remover unidade"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Linha 2: Endereço separado em caixas (Rua, Número, Bairro, Cidade, UF) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-6">
                <label className="block text-[11px] font-semibold text-[var(--nx-text)] mb-1">
                  Rua / Logradouro
                </label>
                <input
                  type="text"
                  value={activeLocation.street}
                  onChange={(e) => updateActiveLocation({ street: e.target.value })}
                  placeholder="Ex: Rua Osvaldo Cruz"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--nx-bg)] border border-[var(--nx-border-strong)] text-xs text-[var(--nx-text)] focus:outline-none focus:border-[var(--nx-primary)]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-[var(--nx-text)] mb-1">
                  Número
                </label>
                <input
                  type="text"
                  value={activeLocation.number}
                  onChange={(e) => updateActiveLocation({ number: e.target.value })}
                  placeholder="417"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--nx-bg)] border border-[var(--nx-border-strong)] text-xs text-[var(--nx-text)] focus:outline-none focus:border-[var(--nx-primary)] tabular-data"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-semibold text-[var(--nx-text)] mb-1">
                  Bairro
                </label>
                <input
                  type="text"
                  value={activeLocation.neighborhood}
                  onChange={(e) => updateActiveLocation({ neighborhood: e.target.value })}
                  placeholder="Ex: Centro"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--nx-bg)] border border-[var(--nx-border-strong)] text-xs text-[var(--nx-text)] focus:outline-none focus:border-[var(--nx-primary)]"
                />
              </div>
            </div>

            {/* Linha 3: Cidade, UF e Ponto de Referência */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-semibold text-[var(--nx-text)] mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={activeLocation.city}
                  onChange={(e) => updateActiveLocation({ city: e.target.value })}
                  placeholder="Ex: Igrejinha"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--nx-bg)] border border-[var(--nx-border-strong)] text-xs text-[var(--nx-text)] focus:outline-none focus:border-[var(--nx-primary)]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-[var(--nx-text)] mb-1">
                  UF
                </label>
                <CustomSelect
                  variant="compact"
                  value={activeLocation.state || 'RS'}
                  onChange={(val) => updateActiveLocation({ state: val })}
                  options={BRAZIL_UFS.map((uf) => ({ value: uf, label: uf }))}
                  buttonClassName="py-2.5 bg-[var(--nx-bg)] rounded-xl"
                />
              </div>
              <div className="sm:col-span-6">
                <label className="block text-[11px] font-semibold text-[var(--nx-text)] mb-1">
                  Ponto de referência
                </label>
                <input
                  type="text"
                  value={activeLocation.referencePoint}
                  onChange={(e) => updateActiveLocation({ referencePoint: e.target.value })}
                  placeholder="Ex: Ao lado da farmácia central / em frente à praça"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--nx-bg)] border border-[var(--nx-border-strong)] text-xs text-[var(--nx-text)] focus:outline-none focus:border-[var(--nx-primary)]"
                />
              </div>
            </div>

            {/* Linha 4: Google Maps automático + Link de Avaliação Google (seta ArrowUpRight inline + fade) */}
            <div className="p-4 rounded-2xl bg-[var(--nx-bg)] border border-[var(--nx-border)] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--nx-text)]">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--nx-volt-ink)]" />
                  <span>Google Maps & Avaliação Google (preenchimento automático)</span>
                </div>
                <button
                  type="button"
                  onClick={handleAutoGeocode}
                  disabled={geocoding}
                  data-testid="btn-auto-geocode"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--nx-volt-surface)] text-[var(--nx-volt-ink)] border border-[var(--nx-volt-border)] text-[11px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 self-start sm:self-auto"
                >
                  <Search className="w-3 h-3" />
                  {geocoding ? 'Localizando...' : 'Buscar no Google Maps'}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--nx-muted)] mb-1">
                    Link do Google Maps
                  </label>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-[var(--nx-surface)] border border-[var(--nx-border-strong)] focus-within:border-[var(--nx-primary)] transition-colors">
                    <input
                      type="url"
                      value={activeLocation.mapsUrl}
                      onChange={(e) => updateActiveLocation({ mapsUrl: e.target.value })}
                      placeholder="Preenchido automaticamente ao digitar o endereço"
                      className={`flex-1 min-w-0 px-1.5 py-1.5 bg-transparent text-xs text-[var(--nx-text)] focus:outline-none ${
                        activeLocation.mapsUrl ? 'nx-link-input-fade' : ''
                      }`}
                    />
                    {activeLocation.mapsUrl && (
                      <a
                        href={activeLocation.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir no Google Maps"
                        aria-label="Abrir no Google Maps"
                        data-testid="btn-open-maps-inline"
                        className="nx-inline-arrow-btn inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--nx-surface-alt)] border border-[var(--nx-border)] text-[var(--nx-text)] hover:border-[var(--nx-volt-border)] hover:bg-[var(--nx-volt-surface)] hover:text-[var(--nx-volt-ink)] transition-colors shrink-0"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[var(--nx-muted)] flex items-center gap-1 mb-1">
                    <Star className="w-3 h-3 text-amber-500" />
                    Link de Avaliação Google Meu Negócio
                  </label>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-[var(--nx-surface)] border border-[var(--nx-border-strong)] focus-within:border-[var(--nx-primary)] transition-colors">
                    <input
                      type="url"
                      value={activeLocation.googleReviewUrl}
                      onChange={(e) => updateActiveLocation({ googleReviewUrl: e.target.value })}
                      placeholder="Preenchido automaticamente ou cole seu g.page/r/.../review"
                      className={`flex-1 min-w-0 px-1.5 py-1.5 bg-transparent text-xs text-[var(--nx-text)] focus:outline-none ${
                        activeLocation.googleReviewUrl ? 'nx-link-input-fade' : ''
                      }`}
                    />
                    {activeLocation.googleReviewUrl && (
                      <a
                        href={activeLocation.googleReviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir link de avaliação"
                        aria-label="Abrir link de avaliação"
                        className="nx-inline-arrow-btn inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--nx-surface-alt)] border border-[var(--nx-border)] text-[var(--nx-text)] hover:border-[var(--nx-volt-border)] hover:bg-[var(--nx-volt-surface)] hover:text-[var(--nx-volt-ink)] transition-colors shrink-0"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-[var(--nx-subtle)]">
                Coordenadas do Pin do WhatsApp são capturadas automaticamente em segundo plano — você não precisa digitar latitude nem longitude.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* BLOCO 2: COMODIDADES & FACILIDADES (LADO A LADO COM REDES SOCIAIS) */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Comodidades para o Bot responder sem intervenção humana (7 cols) */}
        <div className="xl:col-span-7 nx-spotlight-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="nx-icon-tile nx-icon-tile--sm">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--nx-text)]">
                Comodidades & Facilidades do Local
              </h3>
              <p className="text-xs text-[var(--nx-muted)]">
                Marque o que sua empresa oferece — o atendente NEO responde dúvidas sobre estacionamento, acessibilidade e tele-entrega automaticamente.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {AMENITY_OPTIONS.map((item) => {
              const checked = Boolean(amenities[item.key]);
              return (
                <div
                  key={item.key}
                  onClick={() => toggleAmenity(item.key)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleAmenity(item.key);
                    }
                  }}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    checked
                      ? 'border-[var(--nx-volt-border)] bg-[var(--nx-volt-surface)]/45'
                      : 'border-[var(--nx-border)] bg-[var(--nx-bg)] hover:border-[var(--nx-border-strong)]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[var(--nx-text)] truncate">
                      {item.label}
                    </div>
                    <div className="text-[10.5px] text-[var(--nx-muted)] truncate">
                      {item.desc}
                    </div>
                  </div>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    aria-label={item.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAmenity(item.key);
                    }}
                    className="nx-checkbox shrink-0"
                  >
                    {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>
                </div>
              );
            })}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--nx-text)] mb-1">
              Outras informações rápidas do local (opcional)
            </label>
            <input
              type="text"
              value={amenitiesNotes}
              onChange={(e) => setAmenitiesNotes(e.target.value)}
              placeholder="Ex: Entregamos grátis acima de R$ 150 na cidade; rampa lateral na rua dos fundos."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--nx-bg)] border border-[var(--nx-border-strong)] text-xs text-[var(--nx-text)] focus:outline-none focus:border-[var(--nx-primary)]"
            />
          </div>
        </div>

        {/* Redes Sociais & Site Oficial (5 cols) */}
        <div className="xl:col-span-5 nx-spotlight-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="nx-icon-tile nx-icon-tile--sm">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--nx-text)]">
                Site & Redes Sociais
              </h3>
              <p className="text-xs text-[var(--nx-muted)]">
                O bot envia os links oficiais sempre que o cliente pedir Instagram, catálogo online ou site.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--nx-muted)] mb-1">
                Site oficial (opcional)
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://suaempresa.com.br"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--nx-bg)] border border-[var(--nx-border-strong)] text-xs text-[var(--nx-text)] focus:outline-none focus:border-[var(--nx-primary)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--nx-muted)] mb-1">
                Instagram
              </label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@suaempresa ou https://instagram.com/..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--nx-bg)] border border-[var(--nx-border-strong)] text-xs text-[var(--nx-text)] focus:outline-none focus:border-[var(--nx-primary)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--nx-muted)] mb-1">
                Facebook
              </label>
              <input
                type="text"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="https://facebook.com/suaempresa"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--nx-bg)] border border-[var(--nx-border-strong)] text-xs text-[var(--nx-text)] focus:outline-none focus:border-[var(--nx-primary)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--nx-muted)] mb-1">
                  TikTok
                </label>
                <input
                  type="text"
                  value={tiktok}
                  onChange={(e) => setTiktok(e.target.value)}
                  placeholder="@suaempresa"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--nx-bg)] border border-[var(--nx-border-strong)] text-xs text-[var(--nx-text)] focus:outline-none focus:border-[var(--nx-primary)]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[var(--nx-muted)] mb-1">
                  YouTube
                </label>
                <input
                  type="text"
                  value={youtube}
                  onChange={(e) => setYoutube(e.target.value)}
                  placeholder="https://youtube.com/@..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--nx-bg)] border border-[var(--nx-border-strong)] text-xs text-[var(--nx-text)] focus:outline-none focus:border-[var(--nx-primary)]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* BLOCO 3: HORÁRIOS DE FUNCIONAMENTO & FERIADOS LADO A LADO         */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Card Esquerdo: Horários de Funcionamento */}
        <div className="nx-spotlight-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="nx-icon-tile nx-icon-tile--sm">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--nx-text)]">
                Horários de Funcionamento
              </h3>
              <p className="text-xs text-[var(--nx-muted)]">
                Defina abertura, fechamento e intervalo de almoço de cada dia da semana.
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {WEEK_DAYS.map((day) => {
              const slots = schedule[day.key] || [];
              const isOpen = slots.length > 0;
              return (
                <div
                  key={day.key}
                  className="p-3 rounded-xl bg-[var(--nx-bg)] border border-[var(--nx-border)] flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isOpen}
                        aria-label={`Abrir em ${day.label}`}
                        onClick={() => toggleDayOpen(day.key)}
                        className="nx-checkbox"
                      >
                        {isOpen && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                      <span className="text-xs font-semibold text-[var(--nx-text)]">
                        {day.label}
                      </span>
                    </div>

                    {isOpen ? (
                      slots.length === 1 ? (
                        <button
                          type="button"
                          onClick={() => addSecondSlot(day.key)}
                          className="text-[10.5px] font-semibold text-[var(--nx-volt-ink)] hover:underline"
                        >
                          + Intervalo almoço
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeSecondSlot(day.key)}
                          className="text-[10.5px] font-medium text-[var(--nx-muted)] hover:text-[var(--nx-text)]"
                        >
                          Turno único
                        </button>
                      )
                    ) : (
                      <span className="text-[11px] font-medium text-[var(--nx-subtle)]">
                        Fechado
                      </span>
                    )}
                  </div>

                  {isOpen && (
                    <div className="flex flex-wrap items-center gap-2 pl-7">
                      {slots.map((slot, idx) => (
                        <div key={idx} className="inline-flex items-center gap-1.5">
                          <CustomTimePicker
                            value={slot.start}
                            onChange={(val) => updateSlot(day.key, idx, 'start', val)}
                          />
                          <span className="text-[11px] text-[var(--nx-subtle)]">às</span>
                          <CustomTimePicker
                            value={slot.end}
                            onChange={(val) => updateSlot(day.key, idx, 'end', val)}
                          />
                          {idx === 0 && slots.length > 1 && (
                            <span className="text-[11px] text-[var(--nx-subtle)] mx-1">e</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Card Direito: Feriados & Datas Especiais com Calendário NEO */}
        <div className="nx-spotlight-card p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="nx-icon-tile nx-icon-tile--sm">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--nx-text)]">
                  Feriados & Datas Especiais
                </h3>
                <p className="text-xs text-[var(--nx-muted)]">
                  O calendário já destaca os feriados nacionais para facilitar o planejamento.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <CustomSelect
                variant="compact"
                value={holidayYear}
                onChange={(val) => setHolidayYear(val)}
                options={[
                  { value: String(new Date().getFullYear()), label: String(new Date().getFullYear()) },
                  { value: String(new Date().getFullYear() + 1), label: String(new Date().getFullYear() + 1) }
                ]}
                buttonClassName="py-1.5 bg-[var(--nx-bg)] min-w-[78px]"
              />
              <button
                type="button"
                onClick={handleImportNationalHolidays}
                disabled={importingHolidays}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] hover:bg-[var(--nx-surface-alt)] text-[11px] font-semibold text-[var(--nx-text)] transition-colors disabled:opacity-50"
              >
                <Download className="w-3 h-3" />
                {importingHolidays ? 'Importando...' : 'Importar BR'}
              </button>
            </div>
          </div>

          {/* Formulário com Calendário Personalizado NEO */}
          <form
            onSubmit={handleAddException}
            className="p-3.5 rounded-2xl bg-[var(--nx-bg)] border border-[var(--nx-border)] space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10.5px] font-semibold text-[var(--nx-muted)] mb-1">
                  Data do feriado / folga
                </label>
                <CustomDatePicker
                  value={newExDate}
                  onChange={setNewExDate}
                  placeholder="Escolher data"
                  ariaLabel="Data do feriado"
                  customHolidays={calendarCustomHolidays}
                  onHolidayDetected={(holName) => {
                    if (!newExReason.trim()) setNewExReason(holName);
                  }}
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-semibold text-[var(--nx-muted)] mb-1">
                  Situação
                </label>
                <CustomSelect
                  variant="compact"
                  value={newExType}
                  onChange={(val) => setNewExType(val as 'closed' | 'horario_especial')}
                  options={[
                    { value: 'closed', label: 'Fechado o dia todo' },
                    { value: 'horario_especial', label: 'Horário especial' }
                  ]}
                  buttonClassName="py-2 bg-[var(--nx-surface)] rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10.5px] font-semibold text-[var(--nx-muted)] mb-1">
                  Motivo / Nome da data
                </label>
                <input
                  type="text"
                  value={newExReason}
                  onChange={(e) => setNewExReason(e.target.value)}
                  placeholder="Ex: Feriado Municipal, Natal..."
                  className="w-full px-3 py-2 rounded-xl bg-[var(--nx-surface)] border border-[var(--nx-border-strong)] text-xs text-[var(--nx-text)] focus:outline-none focus:border-[var(--nx-primary)]"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-semibold text-[var(--nx-muted)] mb-1">
                  Data de retorno (opcional)
                </label>
                <CustomDatePicker
                  value={newExReturn}
                  onChange={setNewExReturn}
                  placeholder="Opcional"
                  ariaLabel="Data de retorno"
                  customHolidays={calendarCustomHolidays}
                />
              </div>
            </div>

            {newExType === 'horario_especial' && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] font-medium text-[var(--nx-muted)]">Expediente especial:</span>
                <CustomTimePicker value={newExOpen} onChange={setNewExOpen} />
                <span className="text-[11px] text-[var(--nx-subtle)]">às</span>
                <CustomTimePicker value={newExClose} onChange={setNewExClose} />
              </div>
            )}

            <div className="flex justify-end">
              <button type="submit" className="nx-btn-primary px-4 py-2 text-xs">
                <Plus className="w-3.5 h-3.5" />
                Adicionar data
              </button>
            </div>
          </form>

          {/* Lista de feriados cadastrados */}
          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {exceptions.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--nx-muted)] rounded-xl border border-dashed border-[var(--nx-border)]">
                Nenhum feriado ou folga cadastrada ainda. Clique no calendário acima ou importe os feriados nacionais.
              </div>
            ) : (
              exceptions.map((ex) => {
                const [y, m, d] = (ex.date || '').split('-');
                const brDate = d && m && y ? `${d}/${m}/${y}` : ex.date;
                return (
                  <div
                    key={ex.date}
                    className="p-3 rounded-xl bg-[var(--nx-bg)] border border-[var(--nx-border)] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[var(--nx-text)] tabular-data">
                          {brDate}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            ex.type === 'closed'
                              ? 'bg-rose-500/12 text-rose-600 dark:text-rose-300 border border-rose-500/25'
                              : 'bg-amber-500/12 text-amber-700 dark:text-amber-300 border border-amber-500/25'
                          }`}
                        >
                          {ex.type === 'closed'
                            ? 'Fechado'
                            : `Especial ${ex.specialHours?.open || ''}–${ex.specialHours?.close || ''}`}
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--nx-muted)] truncate mt-0.5">
                        {ex.reason}
                        {ex.returnDate ? ` · Retorno: ${ex.returnDate.split('-').reverse().join('/')}` : ''}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveException(ex.date)}
                      className="p-1.5 rounded-lg text-[var(--nx-subtle)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0"
                      title="Remover data"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Barra inferior limpa de salvamento */}
      <div className="flex items-center justify-end pt-2">
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saving}
          data-testid="btn-save-dados-comerciais"
          className="nx-btn-primary px-6 py-2.5 text-xs shadow-lg"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Salvando dados comerciais...' : 'Salvar Dados Comerciais'}
        </button>
      </div>
    </div>
  );
};
