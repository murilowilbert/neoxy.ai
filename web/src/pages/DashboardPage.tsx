import React, { useState, useEffect, useRef, useId } from 'react';
import {
  LayoutDashboard,
  Package,
  Scissors,
  Calendar,
  FileText,
  MessageSquare,
  Settings,
  Lock,
  LogOut,
  Plus,
  Trash2,
  Edit3,
  Send,
  RefreshCw,
  PauseCircle,
  PlayCircle,
  Search,
  Filter,
  ArrowUpDown,
  X,
  FileDown,
  Mail,
  QrCode,
  Clock,
  ChevronDown,
  AlertCircle,
  Printer,
  Users,
  Repeat,
  ClipboardList,
  Bell
} from 'lucide-react';
import { apiFetch, setToken } from '../lib/api';
import ThemeToggle from '../components/ThemeToggle';

interface DashboardPageProps {
  user: any;
  tenants: any[];
  onLogout: () => void;
  onRefreshSession: () => Promise<void>;
}

interface InstructionTemplate {
  id: string;
  name: string;
  instruction: string;
}

interface ServiceVariant {
  label: string;
  durationMinutes: number;
  price: number;
}

const DEFAULT_SERVICE_TEMPLATES: InstructionTemplate[] = [
  {
    id: 'tpl-1',
    name: 'Carteira de vacinação',
    instruction: 'Obrigatório apresentar carteira de vacinação atualizada (V8/V10 e Antirrábica) no check-in.'
  },
  {
    id: 'tpl-2',
    name: 'Tolerância 10 min',
    instruction: 'Tolerância máxima de 10 minutos de atraso para não comprometer os próximos horários da agenda.'
  },
  {
    id: 'tpl-3',
    name: 'Sinal 30% PIX',
    instruction: 'Procedimento mediante confirmação de sinal de 30% via PIX ou pagamento integral na recepção.'
  },
  {
    id: 'tpl-4',
    name: 'Jejum prévio 4h',
    instruction: 'Recomendado jejum alimentar de 4 horas e hídrico de 2 horas antes do atendimento.'
  },
  {
    id: 'tpl-5',
    name: 'Avaliação de pelagem',
    instruction: 'Valores sujeitos a confirmação presencial caso haja necessidade de desembolo técnico ou tosa higiênica extra.'
  },
  {
    id: 'tpl-6',
    name: 'Retirada em até 1h',
    instruction: 'Avisaremos pelo WhatsApp assim que o atendimento entrar na etapa Pronto para Retirada.'
  }
];

const DEFAULT_CHECKIN_ITEMS: string[] = [
  'Carteira de vacinação em dia conferida',
  'Pertences entregues na recepção (guia / coleira)',
  'Sem ectoparasitas aparentes na inspeção',
  'Pelagem com nós leves (desembolo autorizado)',
  'Alergia ou pele sensível informada pelo cliente',
  'Autorizado uso de perfume / finalizador'
];

const OS_STAGES = [
  { key: 'CONFIRMED', step: 1, label: 'Agendado', shortLabel: '1. Agendado' },
  { key: 'IN_PROGRESS', step: 2, label: 'Em Execução', shortLabel: '2. Execução' },
  { key: 'READY_FOR_PICKUP', step: 3, label: 'Pronto p/ Retirada', shortLabel: '3. Pronto' },
  { key: 'COMPLETED', step: 4, label: 'Finalizado', shortLabel: '4. Entregue' }
];

const EMAIL_DOMAINS = ['@gmail.com', '@outlook.com', '@hotmail.com', '@clinica.com.br', '@empresa.com.br'];

export const DashboardPage: React.FC<DashboardPageProps> = ({
  user,
  tenants,
  onLogout,
  onRefreshSession
}) => {
  const initialTenant =
    tenants.find((t) => t.businessType === 'SERVICES') || tenants[0] || null;

  const [selectedTenant, setSelectedTenant] = useState<any>(initialTenant);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Dados dos módulos
  const [metrics, setMetrics] = useState<any>(null);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [inboxSessions, setInboxSessions] = useState<any[]>([]);

  // Busca, Filtro e Ordenação (Padrão MedPet)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const [filterBy, setFilterBy] = useState<string>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterWrapRef = useRef<HTMLDivElement>(null);

  const [sortBy, setSortBy] = useState<'recent' | 'alpha-asc' | 'alpha-desc' | 'price-desc'>('recent');
  const [sortOpen, setSortOpen] = useState(false);
  const sortWrapRef = useRef<HTMLDivElement>(null);

  // Templates de Instruções (Smart Chips + Gaveta Lateral do MedPet)
  const [templates, setTemplates] = useState<InstructionTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('neoxy_service_templates');
      return saved ? JSON.parse(saved) : DEFAULT_SERVICE_TEMPLATES;
    } catch {
      return DEFAULT_SERVICE_TEMPLATES;
    }
  });

  // Modal de Serviço (Criar / Editar + Variações por Porte + Ciclo de Retorno + Gaveta Lateral)
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [srvForm, setSrvForm] = useState<{
    name: string;
    category: string;
    durationMinutes: string;
    price: string;
    returnCycleDays: string;
    description: string;
    variants: ServiceVariant[];
  }>({
    name: '',
    category: 'Estética & Banho',
    durationMinutes: '60',
    price: '',
    returnCycleDays: '15',
    description: '',
    variants: []
  });
  const [srvSidePanelOpen, setSrvSidePanelOpen] = useState(false);

  // Modal de Profissional / Recurso e Comissões
  const [profModalOpen, setProfModalOpen] = useState(false);
  const [editingProf, setEditingProf] = useState<any | null>(null);
  const [profForm, setProfForm] = useState({
    name: '',
    role: 'Especialista / Profissional',
    specialty: '',
    commissionPct: '25',
    phone: ''
  });

  // Modal de Agendamento / Ordem de Serviço (Criar / Editar + Porte + Profissional + Checklist + Gaveta Lateral)
  const [apptModalOpen, setApptModalOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState<any | null>(null);
  const [apptForm, setApptForm] = useState<{
    customerName: string;
    customerPhone: string;
    serviceId: string;
    professionalId: string;
    variantLabel: string;
    agreedPrice: string;
    agreedDuration: string;
    scheduledAt: string;
    status: string;
    notes: string;
    checkinChecklist: string[];
  }>({
    customerName: '',
    customerPhone: '',
    serviceId: '',
    professionalId: '',
    variantLabel: '',
    agreedPrice: '',
    agreedDuration: '',
    scheduledAt: '',
    status: 'CONFIRMED',
    notes: '',
    checkinChecklist: []
  });
  const [customChecklistInput, setCustomChecklistInput] = useState('');
  const [apptSidePanelOpen, setApptSidePanelOpen] = useState(false);

  // Estado compartilhado da Gaveta Lateral de Templates
  const [templateSearch, setTemplateSearch] = useState('');
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateText, setNewTemplateText] = useState('');

  // Modal de Voucher / Ordem de Serviço PDF e Validador QR
  const [voucherAppt, setVoucherAppt] = useState<any | null>(null);
  const [validatorInput, setValidatorInput] = useState('');
  const [validatorError, setValidatorError] = useState<string | null>(null);

  // Modal de Disparo por E-mail / WhatsApp com Autocomplete
  const [notifyAppt, setNotifyAppt] = useState<any | null>(null);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [showNotifySuggestions, setShowNotifySuggestions] = useState(false);
  const [notifySent, setNotifySent] = useState(false);

  // Modal de Confirmação de Exclusão
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'service' | 'appointment' | 'professional' | 'catalog' | 'document';
    item: any;
  } | null>(null);

  // Formulários de Catálogo e Documentos
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCatalog, setNewCatalog] = useState({
    code: '',
    name: '',
    price: '',
    stockQty: '',
    category: 'Insumos & Produtos'
  });

  const [docModalOpen, setDocModalOpen] = useState(false);
  const [newDoc, setNewDoc] = useState({
    title: '',
    docType: 'BOLETO',
    customerName: '',
    customerPhone: '',
    amount: '',
    dueDate: ''
  });

  // Configurações do Estabelecimento & IA
  const [attendantName, setAttendantName] = useState('');
  const [tone, setTone] = useState('');
  const [deliveryPolicy, setDeliveryPolicy] = useState('');
  const [paymentMethods, setPaymentMethods] = useState('');
  const [simMessage, setSimMessage] = useState('');
  const [simResult, setSimResult] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);

  const notifyEmailId = useId();

  useEffect(() => {
    if (tenants.length > 0 && !selectedTenant) {
      setSelectedTenant(tenants.find((t) => t.businessType === 'SERVICES') || tenants[0]);
    } else if (selectedTenant) {
      const updated = tenants.find((t) => t.slug === selectedTenant.slug);
      if (updated) setSelectedTenant(updated);
    }
  }, [tenants]);

  useEffect(() => {
    if (selectedTenant) {
      loadTenantData(selectedTenant.slug);
      const s = selectedTenant.settings || {};
      setAttendantName(s.persona?.attendantName || 'Atendente');
      setTone(s.persona?.tone || 'humanizado, prestativo e objetivo');
      setDeliveryPolicy(s.rules?.deliveryPolicy || '');
      setPaymentMethods(s.rules?.paymentMethods || '');
    }
  }, [selectedTenant?.slug]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setSearchExpanded(false);
      }
      if (filterWrapRef.current && !filterWrapRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
      if (sortWrapRef.current && !sortWrapRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setSearchQuery('');
    setFilterBy('all');
    setSortBy('recent');
  }, [activeTab]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3800);
  }

  function saveTemplatesToStorage(updated: InstructionTemplate[]) {
    setTemplates(updated);
    try {
      localStorage.setItem('neoxy_service_templates', JSON.stringify(updated));
    } catch {}
  }

  async function loadTenantData(slug: string) {
    setLoading(true);
    try {
      const mods: string[] = selectedTenant?.enabledModules || [];
      const [mRes, inboxRes] = await Promise.all([
        apiFetch(`/api/tenants/${slug}/metrics`),
        apiFetch(`/api/tenants/${slug}/inbox`)
      ]);
      setMetrics(mRes.metrics);
      setInboxSessions(inboxRes.sessions || []);

      if (mods.includes('stock')) {
        const cRes = await apiFetch(`/api/tenants/${slug}/catalog`);
        setCatalog(cRes.items || []);
      } else {
        setCatalog([]);
      }

      if (mods.includes('services')) {
        const [sRes, pRes] = await Promise.all([
          apiFetch(`/api/tenants/${slug}/services`),
          apiFetch(`/api/tenants/${slug}/professionals`)
        ]);
        setServices(sRes.services || []);
        setProfessionals(pRes.professionals || []);
      } else {
        setServices([]);
        setProfessionals([]);
      }

      if (mods.includes('appointments')) {
        const aRes = await apiFetch(`/api/tenants/${slug}/appointments`);
        setAppointments(aRes.appointments || []);
      } else {
        setAppointments([]);
      }

      if (mods.includes('documents')) {
        const dRes = await apiFetch(`/api/tenants/${slug}/documents`);
        setDocuments(dRes.documents || []);
      } else {
        setDocuments([]);
      }
    } catch (err: any) {
      showToast(`Erro ao carregar dados: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const enabledModules: string[] = selectedTenant?.enabledModules || [];

  function toggleSmartChipText(currentText: string, snippet: string): string {
    let next = currentText || '';
    if (next.includes(snippet)) {
      next = next.replace(snippet, '').trim().replace(/\n{3,}/g, '\n\n');
    } else {
      next = next ? `${next}\n${snippet}` : snippet;
    }
    return next;
  }

  function handleSaveTemplate() {
    if (!newTemplateTitle.trim() || !newTemplateText.trim()) return;
    if (editingTemplateId) {
      const updated = templates.map((t) =>
        t.id === editingTemplateId
          ? { ...t, name: newTemplateTitle.trim(), instruction: newTemplateText.trim() }
          : t
      );
      saveTemplatesToStorage(updated);
      showToast('Modelo de instrução atualizado.');
    } else {
      const created: InstructionTemplate = {
        id: `tpl-${Date.now()}`,
        name: newTemplateTitle.trim(),
        instruction: newTemplateText.trim()
      };
      saveTemplatesToStorage([created, ...templates]);
      showToast('Novo modelo de instrução salvo.');
    }
    setCreatingTemplate(false);
    setEditingTemplateId(null);
    setNewTemplateTitle('');
    setNewTemplateText('');
  }

  // =========================================================================
  // CRUD DE PROFISSIONAIS / RECURSOS E COMISSÕES (FEATURE 1)
  // =========================================================================
  function openCreateProf() {
    setEditingProf(null);
    setProfForm({
      name: '',
      role: 'Especialista / Recurso',
      specialty: '',
      commissionPct: '25',
      phone: ''
    });
    setProfModalOpen(true);
  }

  function openEditProf(prof: any) {
    setEditingProf(prof);
    setProfForm({
      name: prof.name || '',
      role: prof.role || 'Especialista',
      specialty: prof.specialty || '',
      commissionPct: String(prof.commissionPct ?? 20),
      phone: prof.phone || ''
    });
    setProfModalOpen(true);
  }

  async function handleSaveProfessional(e: React.FormEvent) {
    e.preventDefault();
    if (!profForm.name.trim()) return;
    try {
      await apiFetch(`/api/tenants/${selectedTenant.slug}/professionals`, {
        method: 'POST',
        body: JSON.stringify({
          id: editingProf?.id,
          name: profForm.name,
          role: profForm.role,
          specialty: profForm.specialty,
          commissionPct: Number(profForm.commissionPct || 0),
          phone: profForm.phone
        })
      });
      setProfModalOpen(false);
      showToast(editingProf ? 'Profissional atualizado.' : 'Profissional cadastrado na equipe.');
      loadTenantData(selectedTenant.slug);
    } catch (err: any) {
      showToast(err.message);
    }
  }

  // =========================================================================
  // CRUD DE SERVIÇOS + VARIAÇÕES POR PORTE + CICLO DE RETORNO (FEATURES 2 & 4)
  // =========================================================================
  function openCreateService() {
    setEditingService(null);
    setSrvForm({
      name: '',
      category: 'Estética & Banho',
      durationMinutes: '60',
      price: '',
      returnCycleDays: '15',
      description: '',
      variants: [
        { label: 'Porte P (até 8kg)', durationMinutes: 45, price: 55 },
        { label: 'Porte M (8 a 20kg)', durationMinutes: 60, price: 75 },
        { label: 'Porte G (acima de 20kg)', durationMinutes: 90, price: 110 }
      ]
    });
    setSrvSidePanelOpen(false);
    setServiceModalOpen(true);
  }

  function openEditService(srv: any) {
    setEditingService(srv);
    setSrvForm({
      name: srv.name || '',
      category: srv.category || 'Serviços',
      durationMinutes: String(srv.durationMinutes || 45),
      price: String(srv.price || ''),
      returnCycleDays: srv.returnCycleDays ? String(srv.returnCycleDays) : '',
      description: srv.description || '',
      variants: Array.isArray(srv.variants) ? srv.variants : []
    });
    setSrvSidePanelOpen(false);
    setServiceModalOpen(true);
  }

  async function handleSaveService(e: React.FormEvent) {
    e.preventDefault();
    if (!srvForm.name.trim()) return;
    try {
      const cleanVariants = srvForm.variants
        .filter((v) => v.label.trim() !== '')
        .map((v) => ({
          label: v.label.trim(),
          durationMinutes: Number(v.durationMinutes || 30),
          price: Number(v.price || 0)
        }));

      await apiFetch(`/api/tenants/${selectedTenant.slug}/services`, {
        method: 'POST',
        body: JSON.stringify({
          id: editingService?.id,
          name: srvForm.name,
          category: srvForm.category,
          durationMinutes: Number(srvForm.durationMinutes || 30),
          price: Number(srvForm.price || 0),
          returnCycleDays: srvForm.returnCycleDays ? Number(srvForm.returnCycleDays) : null,
          variants: cleanVariants,
          description: srvForm.description
        })
      });
      setServiceModalOpen(false);
      showToast(editingService ? 'Serviço atualizado com sucesso.' : 'Novo serviço cadastrado.');
      loadTenantData(selectedTenant.slug);
    } catch (err: any) {
      showToast(err.message);
    }
  }

  // =========================================================================
  // CRUD DE AGENDAMENTOS / ORDENS DE SERVIÇO (FEATURES 1, 2, 3, 4, 5)
  // =========================================================================
  function openCreateAppt(options?: {
    serviceId?: string;
    professionalId?: string;
    variant?: ServiceVariant;
    customerName?: string;
    customerPhone?: string;
  }) {
    setEditingAppt(null);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setHours(10, 0, 0, 0);
    const localIso = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    const targetService =
      services.find((s) => s.id === options?.serviceId) || services[0] || null;
    const defaultVariant =
      options?.variant ||
      (Array.isArray(targetService?.variants) && targetService.variants.length > 0
        ? targetService.variants[0]
        : null);

    setApptForm({
      customerName: options?.customerName || '',
      customerPhone: options?.customerPhone || '',
      serviceId: targetService?.id || '',
      professionalId: options?.professionalId || professionals[0]?.id || '',
      variantLabel: defaultVariant ? defaultVariant.label : '',
      agreedPrice: defaultVariant
        ? String(defaultVariant.price)
        : targetService
        ? String(targetService.price)
        : '',
      agreedDuration: defaultVariant
        ? String(defaultVariant.durationMinutes)
        : targetService
        ? String(targetService.durationMinutes)
        : '60',
      scheduledAt: localIso,
      status: 'CONFIRMED',
      notes: '',
      checkinChecklist: ['Carteira de vacinação em dia conferida']
    });
    setCustomChecklistInput('');
    setApptSidePanelOpen(false);
    setApptModalOpen(true);
  }

  function openEditAppt(appt: any) {
    setEditingAppt(appt);
    const dt = appt.scheduledAt ? new Date(appt.scheduledAt) : new Date();
    const localIso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    setApptForm({
      customerName: appt.customerName || '',
      customerPhone: appt.customerPhone || '',
      serviceId: appt.serviceId || '',
      professionalId: appt.professionalId || '',
      variantLabel: appt.variantLabel || '',
      agreedPrice:
        appt.agreedPrice !== null && appt.agreedPrice !== undefined
          ? String(appt.agreedPrice)
          : appt.service?.price !== undefined
          ? String(appt.service.price)
          : '',
      agreedDuration:
        appt.agreedDuration !== null && appt.agreedDuration !== undefined
          ? String(appt.agreedDuration)
          : appt.service?.durationMinutes !== undefined
          ? String(appt.service.durationMinutes)
          : '60',
      scheduledAt: localIso,
      status: appt.status || 'CONFIRMED',
      notes: appt.notes || '',
      checkinChecklist: Array.isArray(appt.checkinChecklist) ? appt.checkinChecklist : []
    });
    setCustomChecklistInput('');
    setApptSidePanelOpen(false);
    setApptModalOpen(true);
  }

  function handleSelectServiceInAppt(serviceId: string) {
    const srv = services.find((s) => s.id === serviceId);
    const firstVar =
      Array.isArray(srv?.variants) && srv.variants.length > 0 ? srv.variants[0] : null;

    setApptForm((prev) => ({
      ...prev,
      serviceId,
      variantLabel: firstVar ? firstVar.label : '',
      agreedPrice: firstVar ? String(firstVar.price) : srv ? String(srv.price) : prev.agreedPrice,
      agreedDuration: firstVar
        ? String(firstVar.durationMinutes)
        : srv
        ? String(srv.durationMinutes)
        : prev.agreedDuration
    }));
  }

  function handleSelectVariantInAppt(v: ServiceVariant) {
    setApptForm((prev) => ({
      ...prev,
      variantLabel: v.label,
      agreedPrice: String(v.price),
      agreedDuration: String(v.durationMinutes)
    }));
  }

  function toggleChecklistItemInForm(itemLabel: string) {
    setApptForm((prev) => {
      const exists = prev.checkinChecklist.includes(itemLabel);
      return {
        ...prev,
        checkinChecklist: exists
          ? prev.checkinChecklist.filter((i) => i !== itemLabel)
          : [...prev.checkinChecklist, itemLabel]
      };
    });
  }

  async function handleSaveAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!apptForm.customerName.trim() || !apptForm.scheduledAt) return;
    try {
      await apiFetch(`/api/tenants/${selectedTenant.slug}/appointments`, {
        method: 'POST',
        body: JSON.stringify({
          id: editingAppt?.id,
          customerName: apptForm.customerName,
          customerPhone: apptForm.customerPhone,
          serviceId: apptForm.serviceId || null,
          professionalId: apptForm.professionalId || null,
          variantLabel: apptForm.variantLabel || null,
          agreedPrice: apptForm.agreedPrice !== '' ? Number(apptForm.agreedPrice) : null,
          agreedDuration: apptForm.agreedDuration !== '' ? Number(apptForm.agreedDuration) : null,
          scheduledAt: apptForm.scheduledAt,
          status: apptForm.status,
          notes: apptForm.notes,
          checkinChecklist: apptForm.checkinChecklist
        })
      });
      setApptModalOpen(false);
      showToast(editingAppt ? 'Ordem de serviço atualizada.' : 'Agendamento registrado na grade.');
      loadTenantData(selectedTenant.slug);
    } catch (err: any) {
      showToast(err.message);
    }
  }

  // Avança ou define diretamente uma das 4 etapas do Rastreio de OS + dispara WhatsApp quando Pronto p/ Retirada
  async function handleSetApptStage(appt: any, targetStatus?: string) {
    const nextStatus =
      targetStatus ||
      (appt.status === 'CONFIRMED'
        ? 'IN_PROGRESS'
        : appt.status === 'IN_PROGRESS'
        ? 'READY_FOR_PICKUP'
        : appt.status === 'READY_FOR_PICKUP'
        ? 'COMPLETED'
        : 'CONFIRMED');

    const protocolCode = `OS-${appt.id.slice(-4).toUpperCase()}`;
    const serviceLabel = appt.service?.name || 'Atendimento';
    const notifyWhatsAppMessage =
      nextStatus === 'READY_FOR_PICKUP'
        ? `Olá, ${appt.customerName}! O atendimento (${serviceLabel}${
            appt.variantLabel ? ` - ${appt.variantLabel}` : ''
          }) já está PRONTO PARA RETIRADA em ${selectedTenant?.name}. Protocolo #${protocolCode}.`
        : nextStatus === 'IN_PROGRESS'
        ? `Olá, ${appt.customerName}! Check-in confirmado em ${selectedTenant?.name}. Seu atendimento (${serviceLabel}) acaba de iniciar. Protocolo #${protocolCode}.`
        : undefined;

    try {
      await apiFetch(`/api/tenants/${selectedTenant.slug}/appointments`, {
        method: 'POST',
        body: JSON.stringify({
          id: appt.id,
          customerName: appt.customerName,
          customerPhone: appt.customerPhone,
          serviceId: appt.serviceId,
          professionalId: appt.professionalId,
          variantLabel: appt.variantLabel,
          agreedPrice: appt.agreedPrice,
          agreedDuration: appt.agreedDuration,
          scheduledAt: appt.scheduledAt,
          status: nextStatus,
          notes: appt.notes,
          checkinChecklist: appt.checkinChecklist,
          returnDueAt: appt.returnDueAt,
          returnNotified: appt.returnNotified,
          notifyWhatsAppMessage
        })
      });

      const toastByStage: Record<string, string> = {
        CONFIRMED: 'Status retornado para Etapa 1: Agendado.',
        IN_PROGRESS: 'Etapa 2: Em Execução (Check-in registrado e cliente avisado).',
        READY_FOR_PICKUP: `Etapa 3: Pronto para Retirada! Aviso enviado ao WhatsApp (${appt.customerPhone}).`,
        COMPLETED: 'Etapa 4: Ordem de Serviço concluída e ciclo de retorno programado.'
      };

      showToast(toastByStage[nextStatus] || 'Status atualizado.');
      loadTenantData(selectedTenant.slug);
      if (voucherAppt?.id === appt.id) {
        setVoucherAppt({ ...appt, status: nextStatus });
      }
    } catch (err: any) {
      showToast(err.message);
    }
  }

  // Alterna item de checklist diretamente de dentro do Voucher / Check-in Rápido
  async function handleToggleVoucherChecklist(appt: any, itemLabel: string) {
    const current: string[] = Array.isArray(appt.checkinChecklist) ? appt.checkinChecklist : [];
    const updated = current.includes(itemLabel)
      ? current.filter((i) => i !== itemLabel)
      : [...current, itemLabel];

    try {
      await apiFetch(`/api/tenants/${selectedTenant.slug}/appointments`, {
        method: 'POST',
        body: JSON.stringify({
          id: appt.id,
          customerName: appt.customerName,
          customerPhone: appt.customerPhone,
          serviceId: appt.serviceId,
          professionalId: appt.professionalId,
          variantLabel: appt.variantLabel,
          agreedPrice: appt.agreedPrice,
          agreedDuration: appt.agreedDuration,
          scheduledAt: appt.scheduledAt,
          status: appt.status,
          notes: appt.notes,
          checkinChecklist: updated,
          returnDueAt: appt.returnDueAt,
          returnNotified: appt.returnNotified
        })
      });
      setVoucherAppt({ ...appt, checkinChecklist: updated });
      loadTenantData(selectedTenant.slug);
    } catch (err: any) {
      showToast(err.message);
    }
  }

  // Dispara lembrete de Ciclo de Retorno no WhatsApp (Feature 4)
  async function handleSendReturnReminder(appt: any) {
    const serviceLabel = appt.service?.name || 'procedimento';
    const cycleDays = appt.service?.returnCycleDays || 15;
    const msg = `Olá, ${appt.customerName}! Aqui é da equipe ${selectedTenant?.name}. Completou o ciclo recomendado de ${cycleDays} dias desde o último ${serviceLabel}. Vamos garantir o próximo horário na agenda desta semana?`;

    try {
      await apiFetch(`/api/tenants/${selectedTenant.slug}/appointments`, {
        method: 'POST',
        body: JSON.stringify({
          id: appt.id,
          customerName: appt.customerName,
          customerPhone: appt.customerPhone,
          serviceId: appt.serviceId,
          professionalId: appt.professionalId,
          variantLabel: appt.variantLabel,
          agreedPrice: appt.agreedPrice,
          agreedDuration: appt.agreedDuration,
          scheduledAt: appt.scheduledAt,
          status: appt.status,
          notes: appt.notes,
          checkinChecklist: appt.checkinChecklist,
          returnDueAt: appt.returnDueAt,
          returnNotified: true,
          notifyWhatsAppMessage: msg
        })
      });
      showToast(`Lembrete de retorno enviado para ${appt.customerName} no WhatsApp!`);
      loadTenantData(selectedTenant.slug);
    } catch (err: any) {
      showToast(err.message);
    }
  }

  function handleValidateProtocol() {
    const q = validatorInput.trim().toLowerCase();
    if (!q) {
      setValidatorError('Informe o código do protocolo, nome do cliente ou telefone.');
      return;
    }
    const found = appointments.find(
      (a) =>
        a.id.toLowerCase().includes(q) ||
        `os-${a.id.slice(-4)}`.toLowerCase() === q ||
        a.customerName.toLowerCase().includes(q) ||
        a.customerPhone.toLowerCase().includes(q)
    );
    if (!found) {
      setValidatorError('Nenhum agendamento encontrado para este código ou cliente.');
      return;
    }
    setValidatorError(null);
    setVoucherAppt(found);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    const { type, item } = deleteTarget;
    try {
      if (type === 'service') {
        await apiFetch(`/api/tenants/${selectedTenant.slug}/services/${item.id}`, { method: 'DELETE' });
        showToast('Serviço excluído.');
      } else if (type === 'professional') {
        await apiFetch(`/api/tenants/${selectedTenant.slug}/professionals/${item.id}`, { method: 'DELETE' });
        showToast('Profissional removido da equipe.');
      } else if (type === 'appointment') {
        await apiFetch(`/api/tenants/${selectedTenant.slug}/appointments/${item.id}`, { method: 'DELETE' });
        showToast('Agendamento excluído.');
      } else if (type === 'catalog') {
        await apiFetch(`/api/tenants/${selectedTenant.slug}/catalog/${item.id}`, { method: 'DELETE' });
        showToast('Item removido do catálogo.');
      } else if (type === 'document') {
        await apiFetch(`/api/tenants/${selectedTenant.slug}/documents/${item.id}`, { method: 'DELETE' });
        showToast('Documento removido.');
      }
      setDeleteTarget(null);
      loadTenantData(selectedTenant.slug);
    } catch (err: any) {
      showToast(err.message);
    }
  }

  async function handleAddCatalog(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch(`/api/tenants/${selectedTenant.slug}/catalog`, {
        method: 'POST',
        body: JSON.stringify(newCatalog)
      });
      setNewCatalog({ code: '', name: '', price: '', stockQty: '', category: 'Insumos & Produtos' });
      setCatModalOpen(false);
      showToast('Item salvo no estoque.');
      loadTenantData(selectedTenant.slug);
    } catch (err: any) {
      showToast(err.message);
    }
  }

  async function handleAddDocument(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch(`/api/tenants/${selectedTenant.slug}/documents`, {
        method: 'POST',
        body: JSON.stringify(newDoc)
      });
      setNewDoc({ title: '', docType: 'BOLETO', customerName: '', customerPhone: '', amount: '', dueDate: '' });
      setDocModalOpen(false);
      showToast('Documento protocolado com sucesso.');
      loadTenantData(selectedTenant.slug);
    } catch (err: any) {
      showToast(err.message);
    }
  }

  async function handleToggleDocStatus(doc: any) {
    const nextStatus = doc.status === 'PENDING' ? 'PAID_OR_PROCESSED' : 'PENDING';
    try {
      await apiFetch(`/api/tenants/${selectedTenant.slug}/documents`, {
        method: 'POST',
        body: JSON.stringify({ ...doc, status: nextStatus })
      });
      showToast(`Status alterado para ${nextStatus === 'PENDING' ? 'Pendente' : 'Processado'}.`);
      loadTenantData(selectedTenant.slug);
    } catch (err: any) {
      showToast(err.message);
    }
  }

  async function handleToggleHandoff(customerPhone: string, pauseForHuman: boolean) {
    try {
      await apiFetch(`/api/tenants/${selectedTenant.slug}/inbox/handoff`, {
        method: 'POST',
        body: JSON.stringify({ customerPhone, pauseForHuman })
      });
      showToast(
        pauseForHuman
          ? `Conversa com ${customerPhone} assumida por atendente humano.`
          : `Atendimento automático reativado para ${customerPhone}.`
      );
      loadTenantData(selectedTenant.slug);
    } catch (err: any) {
      showToast(err.message);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    try {
      const currentSettings = selectedTenant.settings || {};
      const updatedSettings = {
        ...currentSettings,
        persona: {
          ...(currentSettings.persona || {}),
          attendantName,
          tone
        },
        rules: {
          ...(currentSettings.rules || {}),
          deliveryPolicy,
          paymentMethods
        }
      };

      await apiFetch(`/api/tenants/${selectedTenant.slug}/settings`, {
        method: 'PUT',
        body: JSON.stringify({ settings: updatedSettings })
      });
      await onRefreshSession();
      showToast('Configurações operacionais salvas.');
    } catch (err: any) {
      showToast(err.message);
    }
  }

  async function handleToggleModuleAdmin(tenant: any, moduleKey: string) {
    const current: string[] = tenant.enabledModules || [];
    const updated = current.includes(moduleKey)
      ? current.filter((m) => m !== moduleKey)
      : [...current, moduleKey];

    try {
      await apiFetch(`/api/admin/tenants/${tenant.slug}/modules`, {
        method: 'PATCH',
        body: JSON.stringify({
          businessType: tenant.businessType,
          enabledModules: updated
        })
      });
      await onRefreshSession();
      showToast(`Módulo "${moduleKey}" atualizado para ${tenant.name}.`);
    } catch (err: any) {
      showToast(err.message);
    }
  }

  async function handleSimulateChat(e: React.FormEvent) {
    e.preventDefault();
    if (!simMessage.trim()) return;
    setSimLoading(true);
    try {
      const res = await apiFetch(`/api/tenants/${selectedTenant.slug}/test-chat`, {
        method: 'POST',
        body: JSON.stringify({
          message: simMessage,
          customerPhone: '5551988887777'
        })
      });
      setSimResult(res.response);
      loadTenantData(selectedTenant.slug);
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setSimLoading(false);
    }
  }

  // Filtros e Ordenações inteligentes
  const filteredServices = [...services]
    .filter((srv) => {
      if (filterBy !== 'all' && srv.category !== filterBy) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          srv.name?.toLowerCase().includes(q) ||
          srv.category?.toLowerCase().includes(q) ||
          srv.description?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'alpha-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'alpha-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'price-desc') return Number(b.price) - Number(a.price);
      return 0;
    });

  const filteredAppointments = [...appointments]
    .filter((appt) => {
      if (filterBy !== 'all' && appt.status !== filterBy) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          appt.customerName?.toLowerCase().includes(q) ||
          appt.customerPhone?.toLowerCase().includes(q) ||
          appt.service?.name?.toLowerCase().includes(q) ||
          appt.professional?.name?.toLowerCase().includes(q) ||
          appt.variantLabel?.toLowerCase().includes(q) ||
          appt.notes?.toLowerCase().includes(q) ||
          appt.id?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'alpha-asc') return a.customerName.localeCompare(b.customerName);
      if (sortBy === 'alpha-desc') return b.customerName.localeCompare(a.customerName);
      if (sortBy === 'price-desc') {
        const pB = Number(b.agreedPrice ?? b.service?.price ?? 0);
        const pA = Number(a.agreedPrice ?? a.service?.price ?? 0);
        return pB - pA;
      }
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    });

  // Lista de Ciclos de Retorno / Recorrência (Feature 4)
  const returnAppointments = [...appointments]
    .filter((appt) => Boolean(appt.returnDueAt || appt.service?.returnCycleDays))
    .sort((a, b) => {
      const dA = a.returnDueAt ? new Date(a.returnDueAt).getTime() : Infinity;
      const dB = b.returnDueAt ? new Date(b.returnDueAt).getTime() : Infinity;
      return dA - dB;
    });

  const dueReturnsCount = returnAppointments.filter((appt) => {
    if (!appt.returnDueAt || appt.returnNotified) return false;
    const limit = Date.now() + 7 * 24 * 60 * 60 * 1000;
    return new Date(appt.returnDueAt).getTime() <= limit;
  }).length;

  const filteredCatalog = [...catalog]
    .filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.name?.toLowerCase().includes(q) ||
          item.code?.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'alpha-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'alpha-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'price-desc') return Number(b.price) - Number(a.price);
      return 0;
    });

  const serviceCategories = Array.from(new Set(services.map((s) => s.category || 'Serviços')));

  // Totais da Equipe & Comissões
  const totalTeamRevenue = professionals.reduce((acc, p) => acc + Number(p.totalRevenue || 0), 0);
  const totalTeamCommission = professionals.reduce((acc, p) => acc + Number(p.totalCommission || 0), 0);

  // Serviço atualmente selecionado no formulário de agendamento
  const selectedServiceInAppt = services.find((s) => s.id === apptForm.serviceId) || null;
  const selectedServiceVariants: ServiceVariant[] = Array.isArray(selectedServiceInAppt?.variants)
    ? selectedServiceInAppt.variants
    : [];

  function renderMedPetToolbar(options: {
    searchPlaceholder: string;
    filterOptions?: { key: string; label: string }[];
    primaryButtonLabel: string;
    onPrimaryClick: () => void;
  }) {
    const activeFilterLabel =
      options.filterOptions?.find((f) => f.key === filterBy)?.label || 'Filtrar';

    const sortLabels: Record<string, string> = {
      recent: 'Data / Horário',
      'alpha-asc': 'Nome (A-Z)',
      'alpha-desc': 'Nome (Z-A)',
      'price-desc': 'Maior valor'
    };

    return (
      <div className="flex flex-wrap items-center gap-2">
        <div className="nx-sort-wrapper" ref={searchWrapRef}>
          <button
            type="button"
            className={`nx-btn-sort ${searchQuery ? 'nx-btn-sort--active' : ''}`}
            onClick={() => {
              setSearchExpanded((o) => !o);
              if (!searchExpanded) setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
            aria-label="Pesquisar"
          >
            <Search className="w-4 h-4" />
            {searchQuery ? <span className="max-w-[110px] truncate">{searchQuery}</span> : null}
          </button>

          {searchExpanded && (
            <div className="nx-sort-dropdown" style={{ minWidth: '290px', padding: '8px' }}>
              <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-[var(--nx-border-strong)] bg-[var(--nx-bg)]">
                <Search className="w-3.5 h-3.5 text-[var(--nx-subtle)] shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={options.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs text-[var(--nx-text)] outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="text-[var(--nx-subtle)] hover:text-[var(--nx-text)]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {options.filterOptions && options.filterOptions.length > 0 && (
          <div className="nx-sort-wrapper" ref={filterWrapRef}>
            {filterBy === 'all' ? (
              <button
                type="button"
                className="nx-btn-sort"
                onClick={() => setFilterOpen((o) => !o)}
              >
                <Filter className="w-3.5 h-3.5" />
                Filtrar
              </button>
            ) : (
              <div className="nx-filter-active-group">
                <button
                  type="button"
                  className="nx-btn-sort nx-btn-sort--active"
                  onClick={() => setFilterOpen((o) => !o)}
                >
                  <Filter className="w-3.5 h-3.5" />
                  {activeFilterLabel}
                </button>
                <button
                  type="button"
                  className="nx-btn-filter-clear"
                  onClick={() => setFilterBy('all')}
                  aria-label="Limpar filtro"
                  title="Limpar filtro"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {filterOpen && (
              <ul className="nx-sort-dropdown">
                <li>
                  <button
                    type="button"
                    className={`nx-sort-option ${filterBy === 'all' ? 'nx-sort-option--active' : ''}`}
                    onClick={() => {
                      setFilterBy('all');
                      setFilterOpen(false);
                    }}
                  >
                    Todos os registros
                  </button>
                </li>
                {options.filterOptions.map((f) => (
                  <li key={f.key}>
                    <button
                      type="button"
                      className={`nx-sort-option ${filterBy === f.key ? 'nx-sort-option--active' : ''}`}
                      onClick={() => {
                        setFilterBy(f.key);
                        setFilterOpen(false);
                      }}
                    >
                      {f.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="nx-sort-wrapper" ref={sortWrapRef}>
          <button
            type="button"
            className="nx-btn-sort"
            onClick={() => setSortOpen((o) => !o)}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortLabels[sortBy]}
          </button>

          {sortOpen && (
            <ul className="nx-sort-dropdown">
              {[
                { key: 'recent', label: 'Data / Horário' },
                { key: 'alpha-asc', label: 'Nome (A-Z)' },
                { key: 'alpha-desc', label: 'Nome (Z-A)' },
                { key: 'price-desc', label: 'Maior valor (R$)' }
              ].map((opt) => (
                <li key={opt.key}>
                  <button
                    type="button"
                    className={`nx-sort-option ${sortBy === opt.key ? 'nx-sort-option--active' : ''}`}
                    onClick={() => {
                      setSortBy(opt.key as any);
                      setSortOpen(false);
                    }}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={options.onPrimaryClick}
          className="nx-btn-primary h-[38px] px-4 text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          {options.primaryButtonLabel}
        </button>
      </div>
    );
  }

  function renderCoupledTemplatesSidePanel(
    isOpen: boolean,
    onClose: () => void,
    currentText: string,
    onToggleInstruction: (snippet: string) => void
  ) {
    const matchingTemplates = templates.filter(
      (t) =>
        t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
        t.instruction.toLowerCase().includes(templateSearch.toLowerCase())
    );

    return (
      <div className={`nx-modal-side-panel ${isOpen ? 'open' : ''}`}>
        <div className="p-4 border-b border-[var(--nx-border)] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--nx-text)]">Instruções Salvas</h3>
            <p className="text-[11px] text-[var(--nx-subtle)]">Clique para inserir ou remover</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[var(--nx-subtle)] hover:text-[var(--nx-text)] hover:bg-[var(--nx-surface-alt)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {creatingTemplate ? (
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--nx-muted)] mb-1">
                  Título curto do chip (ex: Jejum 4h)
                </label>
                <input
                  type="text"
                  value={newTemplateTitle}
                  onChange={(e) => setNewTemplateTitle(e.target.value)}
                  placeholder="Ex: Carteira de vacinação"
                  className="w-full px-3 py-2 rounded-md border border-[var(--nx-border-strong)] bg-[var(--nx-bg)] text-xs text-[var(--nx-text)] outline-none focus:border-[var(--nx-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--nx-muted)] mb-1">
                  Texto completo da recomendação
                </label>
                <textarea
                  rows={5}
                  value={newTemplateText}
                  onChange={(e) => setNewTemplateText(e.target.value)}
                  placeholder="Digite a orientação que será inserida no serviço ou agendamento..."
                  className="w-full px-3 py-2 rounded-md border border-[var(--nx-border-strong)] bg-[var(--nx-bg)] text-xs text-[var(--nx-text)] outline-none focus:border-[var(--nx-primary)]"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="p-3 border-b border-[var(--nx-border)]">
                <div className="flex items-center gap-2 h-8 px-2.5 rounded-md border border-[var(--nx-border-strong)] bg-[var(--nx-bg)]">
                  <Search className="w-3.5 h-3.5 text-[var(--nx-subtle)]" />
                  <input
                    type="text"
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    placeholder="Buscar instrução..."
                    className="w-full bg-transparent text-xs text-[var(--nx-text)] outline-none"
                  />
                </div>
              </div>

              <ul className="divide-y divide-[var(--nx-border)]">
                {matchingTemplates.map((tpl) => {
                  const isActive = currentText.includes(tpl.instruction);
                  return (
                    <li
                      key={tpl.id}
                      className={`group relative transition-colors ${
                        isActive ? 'bg-[var(--nx-primary-soft)]' : 'hover:bg-[var(--nx-surface-alt)]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onToggleInstruction(tpl.instruction)}
                        className="w-full text-left p-3.5 pr-10"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isActive ? 'bg-[var(--nx-primary)]' : 'bg-[var(--nx-border-strong)]'
                            }`}
                          />
                          <strong className="text-xs font-semibold text-[var(--nx-text)]">
                            {tpl.name}
                          </strong>
                        </div>
                        <p className="text-[11px] text-[var(--nx-muted)] line-clamp-2 mt-1">
                          {tpl.instruction}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTemplateId(tpl.id);
                          setNewTemplateTitle(tpl.name);
                          setNewTemplateText(tpl.instruction);
                          setCreatingTemplate(true);
                        }}
                        className="opacity-0 group-hover:opacity-100 absolute right-2.5 top-3 p-1.5 rounded border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] text-[var(--nx-muted)] hover:text-[var(--nx-primary)] transition-opacity"
                        title="Editar modelo"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </li>
                  );
                })}
                {matchingTemplates.length === 0 && (
                  <li className="p-6 text-center text-xs text-[var(--nx-subtle)]">
                    Nenhuma instrução encontrada.
                  </li>
                )}
              </ul>
            </>
          )}
        </div>

        <div className="p-3 border-t border-[var(--nx-border)] bg-[var(--nx-surface)] flex items-center justify-end gap-2">
          {creatingTemplate ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setCreatingTemplate(false);
                  setEditingTemplateId(null);
                  setNewTemplateTitle('');
                  setNewTemplateText('');
                }}
                className="px-3 py-1.5 text-xs font-medium text-[var(--nx-muted)] border border-[var(--nx-border-strong)] rounded-md"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveTemplate}
                className="nx-btn-primary px-3 py-1.5 text-xs"
              >
                Salvar modelo
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setCreatingTemplate(true)}
              className="w-full py-2 text-xs font-medium text-[var(--nx-primary)] border border-dashed border-[var(--nx-primary)] rounded-md hover:bg-[var(--nx-primary-soft)] transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Nova Instrução Padrão
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--nx-bg)] text-[var(--nx-text)] flex flex-col md:flex-row transition-colors">
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg bg-[var(--nx-text)] text-[var(--nx-bg)] text-xs font-medium shadow-lg border border-[var(--nx-border-strong)] animate-fade-up">
          {toast}
        </div>
      )}

      {/* SIDEBAR ERP */}
      <aside className="w-full md:w-64 bg-[var(--nx-surface)] border-b md:border-b-0 md:border-r border-[var(--nx-border)] flex flex-col justify-between shrink-0">
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--nx-border)]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-[var(--nx-primary)] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                NX
              </div>
              <div>
                <div className="font-bold text-sm text-[var(--nx-text)] leading-none">Neoxy.ai</div>
                <div className="text-[11px] text-[var(--nx-subtle)] mt-0.5">Gestão & WhatsApp</div>
              </div>
            </div>
            <ThemeToggle />
          </div>

          {tenants.length > 0 && (
            <div className="mb-6">
              <label className="block text-xs font-medium text-[var(--nx-muted)] mb-1.5">
                Estabelecimento ativo
              </label>
              <select
                value={selectedTenant?.slug || ''}
                onChange={(e) => {
                  const found = tenants.find((t) => t.slug === e.target.value);
                  if (found) {
                    setSelectedTenant(found);
                    setActiveTab('overview');
                  }
                }}
                className="w-full px-3 py-2 rounded-md bg-[var(--nx-bg)] border border-[var(--nx-border-strong)] text-xs font-medium text-[var(--nx-text)] focus:outline-none focus:border-[var(--nx-primary)]"
              >
                {tenants.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.name} ({t.businessType})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Navegação Adaptativa com os 5 Recursos de Serviços */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-[var(--nx-primary)] text-white'
                  : 'text-[var(--nx-muted)] hover:bg-[var(--nx-surface-alt)] hover:text-[var(--nx-text)]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Resumo Operacional
            </button>

            {enabledModules.includes('appointments') && (
              <button
                onClick={() => setActiveTab('appointments')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  activeTab === 'appointments'
                    ? 'bg-[var(--nx-primary)] text-white'
                    : 'text-[var(--nx-muted)] hover:bg-[var(--nx-surface-alt)] hover:text-[var(--nx-text)]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4" />
                  Agenda & Rastreio OS
                </span>
                <span className="text-[11px] opacity-80 tabular-data">{appointments.length}</span>
              </button>
            )}

            {enabledModules.includes('services') && (
              <button
                onClick={() => setActiveTab('services')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  activeTab === 'services'
                    ? 'bg-[var(--nx-primary)] text-white'
                    : 'text-[var(--nx-muted)] hover:bg-[var(--nx-surface-alt)] hover:text-[var(--nx-text)]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Scissors className="w-4 h-4" />
                  Serviços & Portes
                </span>
                <span className="text-[11px] opacity-80 tabular-data">{services.length}</span>
              </button>
            )}

            {enabledModules.includes('services') && (
              <button
                onClick={() => setActiveTab('professionals')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  activeTab === 'professionals'
                    ? 'bg-[var(--nx-primary)] text-white'
                    : 'text-[var(--nx-muted)] hover:bg-[var(--nx-surface-alt)] hover:text-[var(--nx-text)]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Users className="w-4 h-4" />
                  Equipe & Comissões
                </span>
                <span className="text-[11px] opacity-80 tabular-data">{professionals.length}</span>
              </button>
            )}

            {enabledModules.includes('appointments') && (
              <button
                onClick={() => setActiveTab('returns')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  activeTab === 'returns'
                    ? 'bg-[var(--nx-primary)] text-white'
                    : 'text-[var(--nx-muted)] hover:bg-[var(--nx-surface-alt)] hover:text-[var(--nx-text)]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Repeat className="w-4 h-4" />
                  Retornos & Recorrência
                </span>
                {dueReturnsCount > 0 ? (
                  <span className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--nx-amber-bg)] text-[var(--nx-amber)] font-semibold tabular-data">
                    {dueReturnsCount}
                  </span>
                ) : (
                  <span className="text-[11px] opacity-80 tabular-data">{returnAppointments.length}</span>
                )}
              </button>
            )}

            <button
              onClick={() => setActiveTab('inbox')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'inbox'
                  ? 'bg-[var(--nx-primary)] text-white'
                  : 'text-[var(--nx-muted)] hover:bg-[var(--nx-surface-alt)] hover:text-[var(--nx-text)]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4" />
                Atendimento WhatsApp
              </span>
              {metrics?.handoffSessions > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--nx-error)] text-white font-semibold tabular-data">
                  {metrics.handoffSessions}
                </span>
              )}
            </button>

            {enabledModules.includes('stock') && (
              <button
                onClick={() => setActiveTab('catalog')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  activeTab === 'catalog'
                    ? 'bg-[var(--nx-primary)] text-white'
                    : 'text-[var(--nx-muted)] hover:bg-[var(--nx-surface-alt)] hover:text-[var(--nx-text)]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Package className="w-4 h-4" />
                  Catálogo & Insumos
                </span>
                <span className="text-[11px] opacity-80 tabular-data">{catalog.length}</span>
              </button>
            )}

            {enabledModules.includes('documents') && (
              <button
                onClick={() => setActiveTab('documents')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  activeTab === 'documents'
                    ? 'bg-[var(--nx-primary)] text-white'
                    : 'text-[var(--nx-muted)] hover:bg-[var(--nx-surface-alt)] hover:text-[var(--nx-text)]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4" />
                  Contas & Documentos
                </span>
                <span className="text-[11px] opacity-80 tabular-data">{documents.length}</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'bg-[var(--nx-primary)] text-white'
                  : 'text-[var(--nx-muted)] hover:bg-[var(--nx-surface-alt)] hover:text-[var(--nx-text)]'
              }`}
            >
              <Settings className="w-4 h-4" />
              Expediente & Regras IA
            </button>

            {user.role === 'SUPER_ADMIN' && (
              <button
                onClick={() => setActiveTab('superadmin')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors mt-3 border-t border-[var(--nx-border)] pt-3 ${
                  activeTab === 'superadmin'
                    ? 'bg-[var(--nx-primary)] text-white'
                    : 'text-[var(--nx-primary)] hover:bg-[var(--nx-surface-alt)]'
                }`}
              >
                <Lock className="w-4 h-4" />
                Console Super Admin
              </button>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-[var(--nx-border)] bg-[var(--nx-bg)]">
          <div className="mb-3">
            <div className="text-xs font-semibold text-[var(--nx-text)] truncate">{user.name}</div>
            <div className="text-[11px] text-[var(--nx-subtle)] truncate tabular-data">{user.email}</div>
          </div>
          <button
            onClick={() => {
              setToken(null);
              onLogout();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] hover:bg-[var(--nx-surface-alt)] text-xs font-medium text-[var(--nx-text)] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Encerrar sessão
          </button>
        </div>
      </aside>

      {/* ÁREA DE TRABALHO PRINCIPAL */}
      <main className="flex-1 p-5 sm:p-8 overflow-y-auto max-w-6xl">
        {selectedTenant && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-[var(--nx-border)]">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--nx-text)]">
                  {selectedTenant.name}
                </h1>
                <span className="px-2 py-0.5 text-[11px] font-medium bg-[var(--nx-accent-bg)] text-[var(--nx-accent)] border border-[var(--nx-accent-border)] rounded">
                  {selectedTenant.businessType === 'SERVICES'
                    ? 'Prestador de Serviços'
                    : selectedTenant.businessType === 'RETAIL'
                    ? 'Comércio & Varejo'
                    : 'Escritório & Consultoria'}
                </span>
              </div>
              <p className="text-xs text-[var(--nx-muted)] mt-1 tabular-data">
                Identificador: {selectedTenant.slug} / Módulos habilitados: {enabledModules.join(', ')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {enabledModules.includes('appointments') && (
                <button
                  onClick={() => openCreateAppt()}
                  className="nx-btn-primary px-3.5 py-1.5 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Novo Agendamento
                </button>
              )}
              <button
                onClick={() => loadTenantData(selectedTenant.slug)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] hover:bg-[var(--nx-surface-alt)] text-xs font-medium text-[var(--nx-text)] transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>
          </div>
        )}

        {/* ABA 1: RESUMO OPERACIONAL */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-up">
            <div className="grid grid-cols-2 lg:grid-cols-4 bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-[var(--nx-border)]">
              <div className="p-4">
                <div className="text-xs text-[var(--nx-subtle)] mb-1">Conversas no WhatsApp</div>
                <div className="text-2xl font-bold text-[var(--nx-text)] tabular-data">
                  {metrics?.activeSessions ?? 0}
                </div>
                <div className="text-[11px] text-[var(--nx-muted)] mt-1 tabular-data">
                  {metrics?.handoffSessions ?? 0} aguardando atendente humano
                </div>
              </div>

              {enabledModules.includes('appointments') && (
                <div className="p-4">
                  <div className="text-xs text-[var(--nx-subtle)] mb-1">Ordens de Serviço (OS)</div>
                  <div className="text-2xl font-bold text-[var(--nx-text)] tabular-data">
                    {metrics?.totalAppointments ?? appointments.length}
                  </div>
                  <div className="text-[11px] text-[var(--nx-accent)] mt-1 font-medium tabular-data">
                    {metrics?.readyForPickupCount ?? 0} prontas p/ retirada agora
                  </div>
                </div>
              )}

              {enabledModules.includes('services') && (
                <div className="p-4">
                  <div className="text-xs text-[var(--nx-subtle)] mb-1">Equipe & Comissões</div>
                  <div className="text-2xl font-bold text-[var(--nx-text)] tabular-data">
                    {professionals.length}
                  </div>
                  <div className="text-[11px] text-[var(--nx-muted)] mt-1 tabular-data">
                    R$ {totalTeamCommission.toFixed(2)} em comissões geradas
                  </div>
                </div>
              )}

              {enabledModules.includes('appointments') ? (
                <div className="p-4">
                  <div className="text-xs text-[var(--nx-subtle)] mb-1">Retornos pendentes</div>
                  <div className="text-2xl font-bold text-[var(--nx-text)] tabular-data">
                    {dueReturnsCount}
                  </div>
                  <div className="text-[11px] text-[var(--nx-muted)] mt-1">
                    Clientes no ciclo de recorrência
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <div className="text-xs text-[var(--nx-subtle)] mb-1">Itens em catálogo</div>
                  <div className="text-2xl font-bold text-[var(--nx-text)] tabular-data">
                    {metrics?.totalCatalog ?? catalog.length}
                  </div>
                  <div className="text-[11px] text-[var(--nx-muted)] mt-1">
                    Consulta automática pelo bot
                  </div>
                </div>
              )}
            </div>

            {enabledModules.includes('appointments') && (
              <div className="bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-lg p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--nx-primary-soft)] text-[var(--nx-primary)] flex items-center justify-center shrink-0">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-[var(--nx-text)]">
                        Check-in Rápido, Vistoria de Entrada & Validador de OS
                      </h2>
                      <p className="text-xs text-[var(--nx-muted)]">
                        Informe o protocolo (#OS-XXXX), nome do cliente ou telefone para abrir o checklist de recepção e atualizar o rastreio.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-[var(--nx-border-strong)] bg-[var(--nx-bg)] flex-1 md:w-72">
                      <Search className="w-3.5 h-3.5 text-[var(--nx-subtle)]" />
                      <input
                        type="text"
                        value={validatorInput}
                        onChange={(e) => {
                          setValidatorInput(e.target.value);
                          setValidatorError(null);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleValidateProtocol()}
                        placeholder="Nome do cliente, telefone ou protocolo..."
                        className="w-full bg-transparent text-xs text-[var(--nx-text)] outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleValidateProtocol}
                      className="nx-btn-primary px-4 py-2 text-xs whitespace-nowrap"
                    >
                      Validar Check-in
                    </button>
                  </div>
                </div>
                {validatorError && (
                  <p className="nx-field-error mt-2">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {validatorError}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-lg p-5">
                <h2 className="text-sm font-bold text-[var(--nx-text)] mb-1">
                  Simulador de Atendimento WhatsApp ({selectedTenant?.name})
                </h2>
                <p className="text-xs text-[var(--nx-muted)] mb-4">
                  Envie uma mensagem para testar como o assistente consulta seus serviços, variações de porte, horários ou produtos.
                </p>

                <form onSubmit={handleSimulateChat} className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={simMessage}
                    onChange={(e) => setSimMessage(e.target.value)}
                    placeholder={
                      selectedTenant?.businessType === 'SERVICES'
                        ? 'Ex: Quero agendar um banho e tosa para amanhã às 14h'
                        : 'Ex: Vocês têm cimento CP-II 50kg em estoque?'
                    }
                    className="flex-1 px-3 py-2 rounded-md bg-[var(--nx-bg)] border border-[var(--nx-border-strong)] text-xs text-[var(--nx-text)] focus:outline-none focus:border-[var(--nx-primary)]"
                  />
                  <button
                    type="submit"
                    disabled={simLoading}
                    className="nx-btn-primary px-4 py-2 text-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {simLoading ? 'Processando...' : 'Testar'}
                  </button>
                </form>

                {simResult && (
                  <div className="p-3.5 rounded-md bg-[var(--nx-bg)] border border-[var(--nx-border)] text-xs space-y-2 animate-fade-up">
                    <div className="font-semibold text-[var(--nx-text)]">Resposta gerada:</div>
                    <p className="text-[var(--nx-muted)] leading-relaxed">
                      {simResult.replyText || JSON.stringify(simResult)}
                    </p>
                  </div>
                )}
              </div>

              <div className="lg:col-span-5 bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-lg p-5">
                <h2 className="text-sm font-bold text-[var(--nx-text)] mb-1">
                  Serviços / Itens procurados sem cadastro
                </h2>
                <p className="text-xs text-[var(--nx-muted)] mb-4">
                  Solicitações feitas por clientes no WhatsApp que ainda não constam na sua grade.
                </p>

                {metrics?.missedDemands?.length > 0 ? (
                  <div className="divide-y divide-[var(--nx-border)] border-t border-[var(--nx-border)]">
                    {metrics.missedDemands.map((md: any) => (
                      <div key={md.id} className="py-2.5 flex items-center justify-between text-xs">
                        <span className="font-medium text-[var(--nx-text)]">{md.term}</span>
                        <span className="px-2 py-0.5 rounded bg-[var(--nx-surface-alt)] text-[var(--nx-muted)] tabular-data">
                          {md.searchCount}x procurado
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-[var(--nx-subtle)] border border-dashed border-[var(--nx-border)] rounded">
                    Nenhuma demanda reprimida registrada.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: AGENDA & RASTREIO DE ORDEM DE SERVIÇO EM 4 ETAPAS (FEATURES 1, 2, 3, 5) */}
        {activeTab === 'appointments' && (
          <div className="space-y-6 animate-fade-up">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--nx-text)]">
                  Agenda, Check-in de Recepção & Rastreio de OS (4 Etapas)
                </h2>
                <p className="text-xs text-[var(--nx-muted)]">
                  Acompanhe cada atendimento desde o check-in até o aviso automático de "Pronto para Retirada" no WhatsApp.
                </p>
              </div>

              {renderMedPetToolbar({
                searchPlaceholder: 'Buscar cliente, profissional, serviço, protocolo...',
                filterOptions: [
                  { key: 'CONFIRMED', label: '1. Agendados' },
                  { key: 'IN_PROGRESS', label: '2. Em Execução (Check-in)' },
                  { key: 'READY_FOR_PICKUP', label: '3. Prontos p/ Retirada' },
                  { key: 'COMPLETED', label: '4. Finalizados' }
                ],
                primaryButtonLabel: 'Novo Agendamento',
                onPrimaryClick: () => openCreateAppt()
              })}
            </div>

            {filteredAppointments.length === 0 ? (
              <div className="bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-xl p-12 text-center space-y-3">
                <Calendar className="w-8 h-8 text-[var(--nx-subtle)] mx-auto opacity-50" />
                <div className="text-sm font-semibold text-[var(--nx-text)]">
                  Nenhum agendamento encontrado
                </div>
                <p className="text-xs text-[var(--nx-muted)]">
                  Crie um novo agendamento ou limpe os filtros ativos.
                </p>
                <button
                  type="button"
                  onClick={() => openCreateAppt()}
                  className="nx-btn-primary px-4 py-2 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Criar Agendamento
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAppointments.map((appt) => {
                  const protocolCode = `OS-${appt.id.slice(-4).toUpperCase()}`;
                  const currentStageObj =
                    OS_STAGES.find((s) => s.key === appt.status) || OS_STAGES[0];
                  const checklist: string[] = Array.isArray(appt.checkinChecklist)
                    ? appt.checkinChecklist
                    : [];
                  const effectivePrice = Number(appt.agreedPrice ?? appt.service?.price ?? 0);
                  const effectiveDuration = Number(
                    appt.agreedDuration ?? appt.service?.durationMinutes ?? 60
                  );

                  return (
                    <div
                      key={appt.id}
                      className="nx-card-interactive flex flex-col justify-between overflow-hidden animate-fade-up"
                    >
                      <div className="p-5">
                        {/* Topo do Card com Status + Protocolo + Botões-Pílula Elásticos */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                appt.status === 'COMPLETED'
                                  ? 'bg-[var(--nx-surface-alt)] text-[var(--nx-muted)]'
                                  : appt.status === 'READY_FOR_PICKUP'
                                  ? 'bg-[var(--nx-accent-bg)] text-[var(--nx-accent)] border border-[var(--nx-accent-border)]'
                                  : appt.status === 'IN_PROGRESS'
                                  ? 'bg-[var(--nx-amber-bg)] text-[var(--nx-amber)]'
                                  : 'bg-[var(--nx-primary-soft)] text-[var(--nx-primary)]'
                              }`}
                            >
                              ● {currentStageObj.label}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[var(--nx-surface-alt)] text-[11px] font-semibold text-[var(--nx-primary)] tabular-data">
                              #{protocolCode}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setVoucherAppt(appt)}
                              className="nx-icon-btn-pill nx-icon-btn-pill--pdf"
                              aria-label="Comprovante PDF e Vistoria"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                              <span className="nx-icon-btn-pill-text">Voucher / Check-in</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setNotifyAppt(appt);
                                setNotifyEmail('');
                                setNotifySent(false);
                              }}
                              className="nx-icon-btn-pill nx-icon-btn-pill--whatsapp"
                              aria-label="Notificar Cliente"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span className="nx-icon-btn-pill-text">Enviar Aviso</span>
                            </button>
                          </div>
                        </div>

                        {/* Cliente e Horário */}
                        <h3 className="text-base font-bold text-[var(--nx-text)] mb-1">
                          {appt.customerName}
                        </h3>
                        <div className="flex items-center justify-between text-xs text-[var(--nx-muted)] mb-3 tabular-data">
                          <span>WhatsApp: {appt.customerPhone}</span>
                          <span className="font-semibold text-[var(--nx-text)]">
                            {new Date(appt.scheduledAt).toLocaleString('pt-BR', {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            })}
                          </span>
                        </div>

                        {/* Barra Visual de Rastreio em 4 Etapas (Feature 5) */}
                        <div className="mb-3 p-2.5 rounded-lg bg-[var(--nx-bg)] border border-[var(--nx-border)]">
                          <div className="flex items-center justify-between text-[10px] font-semibold text-[var(--nx-subtle)] mb-1.5">
                            <span>RASTREIO DA ORDEM DE SERVIÇO</span>
                            <span className="tabular-data">Etapa {currentStageObj.step} de 4</span>
                          </div>
                          <div className="grid grid-cols-4 gap-1">
                            {OS_STAGES.map((st) => {
                              const isCurrent = appt.status === st.key;
                              const isPassed = currentStageObj.step >= st.step;
                              return (
                                <button
                                  key={st.key}
                                  type="button"
                                  onClick={() => handleSetApptStage(appt, st.key)}
                                  title={`Mudar para ${st.label}`}
                                  className={`py-1 px-1 rounded text-[10px] font-semibold transition-all text-center truncate ${
                                    isCurrent
                                      ? 'bg-[var(--nx-primary)] text-white shadow-sm'
                                      : isPassed
                                      ? 'bg-[var(--nx-primary-soft)] text-[var(--nx-primary)]'
                                      : 'bg-[var(--nx-surface)] text-[var(--nx-subtle)] hover:text-[var(--nx-text)]'
                                  }`}
                                >
                                  {st.shortLabel}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Serviço + Porte/Complexidade + Profissional Alocado (Features 1 & 2) */}
                        <div className="px-3 py-2.5 rounded-md bg-[var(--nx-bg)] border border-[var(--nx-border)] text-xs mb-3 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-[var(--nx-text)]">
                              {appt.service?.name || 'Atendimento Geral'}
                            </span>
                            <span className="font-bold text-[var(--nx-primary)] tabular-data">
                              R$ {effectivePrice.toFixed(2)} / {effectiveDuration} min
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] text-[var(--nx-muted)]">
                            {appt.variantLabel && (
                              <span className="px-2 py-0.5 rounded bg-[var(--nx-primary-soft)] text-[var(--nx-primary)] font-medium">
                                Porte / Opção: {appt.variantLabel}
                              </span>
                            )}
                            {appt.professional && (
                              <span className="inline-flex items-center gap-1 font-medium text-[var(--nx-text)]">
                                <Users className="w-3 h-3 text-[var(--nx-primary)]" />
                                {appt.professional.name} ({appt.professional.commissionPct}%)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Resumo do Checklist de Entrada / Anamnese (Feature 3) */}
                        <div className="mb-2.5">
                          <div className="flex items-center justify-between text-[11px] font-medium text-[var(--nx-muted)] mb-1">
                            <span className="inline-flex items-center gap-1">
                              <ClipboardList className="w-3.5 h-3.5 text-[var(--nx-primary)]" />
                              Checklist de Entrada (Vistoria):
                            </span>
                            <span className="tabular-data font-semibold text-[var(--nx-text)]">
                              {checklist.length} {checklist.length === 1 ? 'item conferido' : 'itens conferidos'}
                            </span>
                          </div>
                          {checklist.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {checklist.slice(0, 3).map((item, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded text-[10px] bg-[var(--nx-accent-bg)] text-[var(--nx-accent)] border border-[var(--nx-accent-border)]"
                                >
                                  {item}
                                </span>
                              ))}
                              {checklist.length > 3 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--nx-surface-alt)] text-[var(--nx-muted)]">
                                  +{checklist.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="text-[11px] text-[var(--nx-subtle)]">
                              Nenhum item marcado no check-in ainda.
                            </p>
                          )}
                        </div>

                        <p className="text-xs text-[var(--nx-muted)] leading-relaxed border-t border-[var(--nx-border)] pt-2 line-clamp-2">
                          {appt.notes || 'Sem observações adicionais.'}
                        </p>
                      </div>

                      {/* Ações Inferiores do Card (Avançar Etapa / Editar / Excluir) */}
                      <div className="grid grid-cols-3 divide-x divide-[var(--nx-border)] border-t border-[var(--nx-border)] bg-[var(--nx-bg)] text-xs font-medium">
                        <button
                          type="button"
                          onClick={() => handleSetApptStage(appt)}
                          className="py-2.5 px-2 flex items-center justify-center gap-1.5 text-[var(--nx-primary)] hover:bg-[var(--nx-primary-soft)] transition-colors font-semibold"
                        >
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">
                            {appt.status === 'CONFIRMED'
                              ? 'Iniciar Check-in'
                              : appt.status === 'IN_PROGRESS'
                              ? 'Pronto p/ Retirada'
                              : appt.status === 'READY_FOR_PICKUP'
                              ? 'Confirmar Entrega'
                              : 'Reabrir OS'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditAppt(appt)}
                          className="py-2.5 px-2 flex items-center justify-center gap-1.5 text-[var(--nx-muted)] hover:text-[var(--nx-text)] hover:bg-[var(--nx-surface-alt)] transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Editar / Vistoria
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ type: 'appointment', item: appt })}
                          className="py-2.5 px-2 flex items-center justify-center gap-1.5 text-[var(--nx-error)] hover:bg-[var(--nx-error-bg)] transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ABA 3: SERVIÇOS, VARIAÇÕES POR PORTE & CICLO DE RETORNO (FEATURES 2 & 4) */}
        {activeTab === 'services' && (
          <div className="space-y-6 animate-fade-up">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--nx-text)]">
                  Grade de Serviços, Tabela por Porte & Ciclo de Retorno
                </h2>
                <p className="text-xs text-[var(--nx-muted)]">
                  Configure preços e tempos por porte/complexidade, instruções de preparo e o ciclo de recorrência automática.
                </p>
              </div>

              {renderMedPetToolbar({
                searchPlaceholder: 'Buscar serviço, categoria, preparo...',
                filterOptions: serviceCategories.map((c) => ({ key: c, label: c })),
                primaryButtonLabel: 'Novo Serviço',
                onPrimaryClick: openCreateService
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredServices.map((srv) => {
                const srvVariants: ServiceVariant[] = Array.isArray(srv.variants)
                  ? srv.variants
                  : [];

                return (
                  <div
                    key={srv.id}
                    className="nx-card-interactive flex flex-col justify-between overflow-hidden animate-fade-up"
                  >
                    <div className="p-5">
                      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--nx-accent-bg)] text-[var(--nx-accent)]">
                            ● Ativo
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--nx-primary-soft)] text-[var(--nx-primary)]">
                            {srv.category || 'Serviços'}
                          </span>
                          {srv.returnCycleDays && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--nx-amber-bg)] text-[var(--nx-amber)] tabular-data">
                              Retorno: {srv.returnCycleDays} dias
                            </span>
                          )}
                        </div>

                        {enabledModules.includes('appointments') && (
                          <button
                            type="button"
                            onClick={() => openCreateAppt({ serviceId: srv.id })}
                            className="nx-icon-btn-pill nx-icon-btn-pill--blue"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="nx-icon-btn-pill-text">Agendar este</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-baseline justify-between gap-4 mb-3">
                        <h3 className="text-base font-bold text-[var(--nx-text)]">{srv.name}</h3>
                        <div className="text-right shrink-0">
                          <span className="text-base font-bold text-[var(--nx-primary)] tabular-data">
                            R$ {Number(srv.price).toFixed(2)}
                          </span>
                          <span className="block text-[10px] text-[var(--nx-subtle)] tabular-data">
                            Base: {srv.durationMinutes} min
                          </span>
                        </div>
                      </div>

                      {/* Tabela de Preço e Tempo por Porte / Complexidade (Feature 2) */}
                      {srvVariants.length > 0 && (
                        <div className="mb-3 p-2.5 rounded-lg bg-[var(--nx-bg)] border border-[var(--nx-border)]">
                          <div className="text-[10px] font-semibold uppercase text-[var(--nx-subtle)] mb-1.5">
                            Variações de Porte / Complexidade (Clique para agendar)
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                            {srvVariants.map((v, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() =>
                                  openCreateAppt({ serviceId: srv.id, variant: v })
                                }
                                className="p-2 rounded border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] hover:border-[var(--nx-primary)] hover:bg-[var(--nx-primary-soft)] text-left transition-colors"
                              >
                                <div className="text-[11px] font-semibold text-[var(--nx-text)] truncate">
                                  {v.label}
                                </div>
                                <div className="text-[11px] font-bold text-[var(--nx-primary)] tabular-data mt-0.5">
                                  R$ {Number(v.price).toFixed(2)}
                                </div>
                                <div className="text-[10px] text-[var(--nx-subtle)] tabular-data">
                                  {v.durationMinutes} min
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-[var(--nx-muted)] leading-relaxed border-t border-[var(--nx-border)] pt-2.5">
                        {srv.description || 'Nenhuma recomendação pré-atendimento cadastrada.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 divide-x divide-[var(--nx-border)] border-t border-[var(--nx-border)] bg-[var(--nx-bg)] text-xs font-medium">
                      <button
                        type="button"
                        onClick={() => openEditService(srv)}
                        className="py-2.5 flex items-center justify-center gap-1.5 text-[var(--nx-muted)] hover:text-[var(--nx-text)] hover:bg-[var(--nx-surface-alt)] transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Editar Portes & Preparo
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget({ type: 'service', item: srv })}
                        className="py-2.5 flex items-center justify-center gap-1.5 text-[var(--nx-error)] hover:bg-[var(--nx-error-bg)] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Excluir
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ABA 4: GRADE DE PROFISSIONAIS / RECURSOS E COMISSÕES (FEATURE 1) */}
        {activeTab === 'professionals' && (
          <div className="space-y-6 animate-fade-up">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--nx-text)]">
                  Grade de Profissionais, Boxes & Cálculo de Comissões
                </h2>
                <p className="text-xs text-[var(--nx-muted)]">
                  Vincule atendimentos a cada profissional ou recurso físico e acompanhe o repasse automático de comissão.
                </p>
              </div>

              <button
                type="button"
                onClick={openCreateProf}
                className="nx-btn-primary h-[38px] px-4 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Profissional / Recurso
              </button>
            </div>

            {/* Faixa de Resumo Financeiro de Comissões */}
            <div className="grid grid-cols-1 sm:grid-cols-3 bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-[var(--nx-border)]">
              <div className="p-4">
                <div className="text-xs text-[var(--nx-subtle)] mb-1">Profissionais / Boxes ativos</div>
                <div className="text-2xl font-bold text-[var(--nx-text)] tabular-data">
                  {professionals.length}
                </div>
              </div>
              <div className="p-4">
                <div className="text-xs text-[var(--nx-subtle)] mb-1">Receita vinculada à equipe</div>
                <div className="text-2xl font-bold text-[var(--nx-text)] tabular-data">
                  R$ {totalTeamRevenue.toFixed(2)}
                </div>
              </div>
              <div className="p-4">
                <div className="text-xs text-[var(--nx-subtle)] mb-1">Total de comissões apuradas</div>
                <div className="text-2xl font-bold text-[var(--nx-accent)] tabular-data">
                  R$ {totalTeamCommission.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {professionals.map((prof) => (
                <div
                  key={prof.id}
                  className="nx-card-interactive flex flex-col justify-between overflow-hidden animate-fade-up"
                >
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--nx-primary-soft)] text-[var(--nx-primary)]">
                        {prof.role}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--nx-accent-bg)] text-[var(--nx-accent)] tabular-data">
                        Comissão: {Number(prof.commissionPct).toFixed(0)}%
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[var(--nx-text)] mb-0.5">
                      {prof.name}
                    </h3>
                    <p className="text-xs text-[var(--nx-muted)] mb-3">
                      {prof.specialty || 'Atendimento geral'}
                    </p>

                    <div className="p-3 rounded-lg bg-[var(--nx-bg)] border border-[var(--nx-border)] space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--nx-muted)]">Ordens atribuídas:</span>
                        <strong className="text-[var(--nx-text)] tabular-data">
                          {prof.appointmentsCount ?? 0} atendimentos
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--nx-muted)]">Produção bruta:</span>
                        <strong className="text-[var(--nx-text)] tabular-data">
                          R$ {Number(prof.totalRevenue || 0).toFixed(2)}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between border-t border-[var(--nx-border)] pt-1.5">
                        <span className="font-semibold text-[var(--nx-text)]">Comissão a pagar:</span>
                        <strong className="text-sm font-bold text-[var(--nx-accent)] tabular-data">
                          R$ {Number(prof.totalCommission || 0).toFixed(2)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 divide-x divide-[var(--nx-border)] border-t border-[var(--nx-border)] bg-[var(--nx-bg)] text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => openCreateAppt({ professionalId: prof.id })}
                      className="py-2.5 flex items-center justify-center gap-1 text-[var(--nx-primary)] hover:bg-[var(--nx-primary-soft)] transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Agendar
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditProf(prof)}
                      className="py-2.5 flex items-center justify-center gap-1 text-[var(--nx-muted)] hover:text-[var(--nx-text)] hover:bg-[var(--nx-surface-alt)] transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ type: 'professional', item: prof })}
                      className="py-2.5 flex items-center justify-center gap-1 text-[var(--nx-error)] hover:bg-[var(--nx-error-bg)] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA 5: CICLO DE RETORNO & RECORRÊNCIA AUTOMÁTICA (FEATURE 4) */}
        {activeTab === 'returns' && (
          <div className="space-y-6 animate-fade-up">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--nx-text)]">
                  Ciclo de Retorno & Recorrência Ativa via WhatsApp
                </h2>
                <p className="text-xs text-[var(--nx-muted)]">
                  Clientes cujo ciclo de retorno (15, 21 ou 30 dias) está vencido ou próximo do vencimento para reativação em 1 clique.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openCreateAppt()}
                className="nx-btn-primary h-[38px] px-4 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Agendamento
              </button>
            </div>

            {returnAppointments.length === 0 ? (
              <div className="bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-xl p-10 text-center text-xs text-[var(--nx-subtle)]">
                Nenhum ciclo de retorno programado até o momento.
              </div>
            ) : (
              <div className="bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--nx-surface-alt)] border-b border-[var(--nx-border)] text-xs font-semibold text-[var(--nx-muted)]">
                      <th className="py-3 px-4">Cliente / WhatsApp</th>
                      <th className="py-3 px-4">Último Procedimento</th>
                      <th className="py-3 px-4">Ciclo</th>
                      <th className="py-3 px-4">Data Prevista de Retorno</th>
                      <th className="py-3 px-4">Status do Lembrete</th>
                      <th className="py-3 px-4 text-right">Ações de Recorrência</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--nx-border)] text-xs">
                    {returnAppointments.map((appt) => {
                      const dueTime = appt.returnDueAt
                        ? new Date(appt.returnDueAt).getTime()
                        : Date.now();
                      const isOverdue = dueTime <= Date.now();
                      const isSoon =
                        !isOverdue && dueTime <= Date.now() + 7 * 24 * 60 * 60 * 1000;

                      return (
                        <tr key={appt.id} className="hover:bg-[var(--nx-bg)]">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[var(--nx-text)]">{appt.customerName}</div>
                            <div className="text-[11px] text-[var(--nx-muted)] tabular-data">
                              {appt.customerPhone}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[var(--nx-text)]">
                              {appt.service?.name || 'Serviço'}
                            </div>
                            {appt.variantLabel && (
                              <div className="text-[11px] text-[var(--nx-primary)]">
                                {appt.variantLabel}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 tabular-data text-[var(--nx-muted)]">
                            Cada {appt.service?.returnCycleDays || 15} dias
                          </td>
                          <td className="py-3.5 px-4 tabular-data">
                            <span
                              className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                                isOverdue
                                  ? 'bg-[var(--nx-error-bg)] text-[var(--nx-error)]'
                                  : isSoon
                                  ? 'bg-[var(--nx-amber-bg)] text-[var(--nx-amber)]'
                                  : 'bg-[var(--nx-surface-alt)] text-[var(--nx-text)]'
                              }`}
                            >
                              {appt.returnDueAt
                                ? new Date(appt.returnDueAt).toLocaleDateString('pt-BR')
                                : 'Programado'}{' '}
                              {isOverdue ? '(Vencido)' : isSoon ? '(Próximo)' : ''}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {appt.returnNotified ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--nx-accent-bg)] text-[var(--nx-accent)]">
                                ● Lembrete enviado no WhatsApp
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--nx-amber-bg)] text-[var(--nx-amber)]">
                                ● Aguardando disparo
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleSendReturnReminder(appt)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--nx-border-strong)] bg-[var(--nx-bg)] hover:bg-[var(--nx-primary-soft)] hover:text-[var(--nx-primary)] text-[11px] font-semibold text-[var(--nx-text)] transition-colors"
                            >
                              <Bell className="w-3.5 h-3.5" />
                              {appt.returnNotified ? 'Reenviar WhatsApp' : 'Disparar WhatsApp'}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                openCreateAppt({
                                  serviceId: appt.serviceId,
                                  professionalId: appt.professionalId,
                                  customerName: appt.customerName,
                                  customerPhone: appt.customerPhone
                                })
                              }
                              className="nx-btn-primary px-3 py-1.5 text-[11px]"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              Reagendar Retorno
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ABA 6: CATÁLOGO DE PRODUTOS & INSUMOS */}
        {activeTab === 'catalog' && (
          <div className="space-y-6 animate-fade-up">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--nx-text)]">
                  Catálogo de Produtos, Peças & Insumos
                </h2>
                <p className="text-xs text-[var(--nx-muted)]">
                  Itens consultados em tempo real para resposta de orçamento e disponibilidade no WhatsApp.
                </p>
              </div>

              {renderMedPetToolbar({
                searchPlaceholder: 'Buscar por código SKU, produto, categoria...',
                primaryButtonLabel: 'Novo Produto',
                onPrimaryClick: () => setCatModalOpen(true)
              })}
            </div>

            <div className="bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--nx-surface-alt)] border-b border-[var(--nx-border)] text-xs font-semibold text-[var(--nx-muted)]">
                    <th className="py-3 px-4">Código SKU</th>
                    <th className="py-3 px-4">Descrição do Item</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4">Preço Unit.</th>
                    <th className="py-3 px-4">Estoque</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--nx-border)] text-xs">
                  {filteredCatalog.map((item) => (
                    <tr key={item.id} className="hover:bg-[var(--nx-bg)]">
                      <td className="py-3 px-4 text-[var(--nx-muted)] tabular-data font-medium">
                        {item.code}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[var(--nx-text)]">{item.name}</td>
                      <td className="py-3 px-4 text-[var(--nx-muted)]">{item.category}</td>
                      <td className="py-3 px-4 font-semibold text-[var(--nx-text)] tabular-data">
                        R$ {Number(item.price).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 tabular-data">{item.stockQty} un.</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setDeleteTarget({ type: 'catalog', item })}
                          className="text-[var(--nx-subtle)] hover:text-[var(--nx-error)] transition-colors"
                          title="Remover item"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA 7: RECEBIMENTO DE CONTAS & DOCUMENTOS */}
        {activeTab === 'documents' && (
          <div className="space-y-6 animate-fade-up">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--nx-text)]">
                  Recebimento de Contas, Boletos & Guias
                </h2>
                <p className="text-xs text-[var(--nx-muted)]">
                  Triagem de documentos financeiros enviados pelos clientes via WhatsApp.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDocModalOpen(true)}
                className="nx-btn-primary px-4 py-2 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Protocolar Documento
              </button>
            </div>

            <div className="bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--nx-surface-alt)] border-b border-[var(--nx-border)] text-xs font-semibold text-[var(--nx-muted)]">
                    <th className="py-3 px-4">Documento</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Valor</th>
                    <th className="py-3 px-4">Vencimento</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--nx-border)] text-xs">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-[var(--nx-bg)]">
                      <td className="py-3 px-4 font-semibold text-[var(--nx-text)]">{doc.title}</td>
                      <td className="py-3 px-4 text-[var(--nx-muted)]">{doc.docType}</td>
                      <td className="py-3 px-4 text-[var(--nx-muted)]">{doc.customerName}</td>
                      <td className="py-3 px-4 font-semibold text-[var(--nx-text)] tabular-data">
                        {doc.amount ? `R$ ${Number(doc.amount).toFixed(2)}` : '-'}
                      </td>
                      <td className="py-3 px-4 tabular-data">{doc.dueDate || '-'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                            doc.status === 'PENDING'
                              ? 'bg-[var(--nx-amber-bg)] text-[var(--nx-amber)]'
                              : 'bg-[var(--nx-accent-bg)] text-[var(--nx-accent)]'
                          }`}
                        >
                          {doc.status === 'PENDING' ? 'Pendente' : 'Processado'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleToggleDocStatus(doc)}
                          className="px-2.5 py-1 rounded border border-[var(--nx-border-strong)] bg-[var(--nx-bg)] hover:bg-[var(--nx-surface-alt)] text-[11px] font-medium text-[var(--nx-text)]"
                        >
                          Alternar status
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ type: 'document', item: doc })}
                          className="text-[var(--nx-subtle)] hover:text-[var(--nx-error)]"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA 8: INBOX AO VIVO & PAUSA PARA HUMANO */}
        {activeTab === 'inbox' && (
          <div className="space-y-4 animate-fade-up">
            <div>
              <h2 className="text-base font-bold text-[var(--nx-text)]">
                Conversas Ativas no WhatsApp & Histórico de Avisos Automáticos
              </h2>
              <p className="text-xs text-[var(--nx-muted)]">
                Veja os disparos automáticos de "Pronto para Retirada" e lembretes de retorno ou assuma a conversa manualmente.
              </p>
            </div>

            {inboxSessions.length === 0 ? (
              <div className="bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-lg p-8 text-center text-xs text-[var(--nx-subtle)]">
                Nenhuma sessão registrada para este estabelecimento. Use o simulador na aba Resumo para iniciar uma conversa.
              </div>
            ) : (
              <div className="space-y-4">
                {inboxSessions.map((session) => {
                  const isPaused = session.state === 'HUMAN_HANDOFF';
                  return (
                    <div
                      key={session.id}
                      className="bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-lg overflow-hidden"
                    >
                      <div className="px-4 py-3 bg-[var(--nx-surface-alt)] border-b border-[var(--nx-border)] flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-[var(--nx-text)] tabular-data">
                            Cliente: {session.customerPhone}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                              isPaused
                                ? 'bg-[var(--nx-error-bg)] text-[var(--nx-error)]'
                                : 'bg-[var(--nx-accent-bg)] text-[var(--nx-accent)]'
                            }`}
                          >
                            {isPaused ? 'Pausado (Atendimento Humano)' : 'IA Respondendo Automaticamente'}
                          </span>
                        </div>

                        <button
                          onClick={() => handleToggleHandoff(session.customerPhone, !isPaused)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                            isPaused
                              ? 'bg-[var(--nx-accent)] text-white'
                              : 'bg-[var(--nx-primary)] text-white'
                          }`}
                        >
                          {isPaused ? (
                            <>
                              <PlayCircle className="w-3.5 h-3.5" />
                              Devolver para IA
                            </>
                          ) : (
                            <>
                              <PauseCircle className="w-3.5 h-3.5" />
                              Assumir conversa (Pausar IA)
                            </>
                          )}
                        </button>
                      </div>

                      <div className="p-4 space-y-2 max-h-60 overflow-y-auto bg-[var(--nx-bg)]">
                        {session.messages?.map((m: any) => (
                          <div
                            key={m.id}
                            className={`p-2.5 rounded text-xs max-w-[85%] ${
                              m.role === 'user'
                                ? 'bg-[var(--nx-surface)] border border-[var(--nx-border)] text-[var(--nx-text)]'
                                : 'bg-[var(--nx-primary)] text-white ml-auto'
                            }`}
                          >
                            <div className="text-[10px] opacity-70 mb-0.5">
                              {m.role === 'user' ? 'Cliente' : 'Atendente / Notificação Neoxy'}
                            </div>
                            <div>{m.content}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ABA 9: CONFIGURAÇÕES DE EXPEDIENTE & PERSONA */}
        {activeTab === 'settings' && (
          <form
            onSubmit={handleSaveSettings}
            className="bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-lg p-6 space-y-5 max-w-2xl animate-fade-up"
          >
            <div>
              <h2 className="text-base font-bold text-[var(--nx-text)]">
                Parâmetros de Atendimento, Regras & Expediente
              </h2>
              <p className="text-xs text-[var(--nx-muted)]">
                Defina como o assistente se apresenta e quais políticas comerciais ele deve aplicar.
              </p>
            </div>

            <div className="nx-field">
              <input
                type="text"
                placeholder=" "
                value={attendantName}
                onChange={(e) => setAttendantName(e.target.value)}
              />
              <label>Nome do atendente virtual</label>
            </div>

            <div className="nx-field">
              <input
                type="text"
                placeholder=" "
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              />
              <label>Tom de voz e postura na conversa</label>
            </div>

            <div className="nx-field">
              <textarea
                rows={3}
                placeholder=" "
                value={deliveryPolicy}
                onChange={(e) => setDeliveryPolicy(e.target.value)}
              />
              <label>Política de agendamento, preparo ou entregas</label>
            </div>

            <div className="nx-field">
              <input
                type="text"
                placeholder=" "
                value={paymentMethods}
                onChange={(e) => setPaymentMethods(e.target.value)}
              />
              <label>Meios de pagamento aceitos</label>
            </div>

            <button type="submit" className="nx-btn-primary px-5 py-2.5 text-xs">
              Salvar configurações operacionais
            </button>
          </form>
        )}

        {/* ABA 10: CONSOLE SUPER ADMIN */}
        {activeTab === 'superadmin' && user.role === 'SUPER_ADMIN' && (
          <div className="space-y-4 animate-fade-up">
            <div>
              <h2 className="text-base font-bold text-[var(--nx-text)]">
                Console Super Admin / Controle de Módulos (Feature Flags)
              </h2>
              <p className="text-xs text-[var(--nx-muted)]">
                Habilite ou desabilite módulos em tempo real para qualquer estabelecimento.
              </p>
            </div>

            <div className="bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--nx-surface-alt)] border-b border-[var(--nx-border)] text-xs font-semibold text-[var(--nx-muted)]">
                    <th className="py-3 px-4">Estabelecimento</th>
                    <th className="py-3 px-4">Perfil</th>
                    <th className="py-3 px-4">Catálogo (stock)</th>
                    <th className="py-3 px-4">Serviços (services)</th>
                    <th className="py-3 px-4">Agenda (appointments)</th>
                    <th className="py-3 px-4">Contas (documents)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--nx-border)] text-xs">
                  {tenants.map((t) => {
                    const mods: string[] = t.enabledModules || [];
                    return (
                      <tr key={t.id}>
                        <td className="py-3 px-4 font-semibold text-[var(--nx-text)]">{t.name}</td>
                        <td className="py-3 px-4 text-[var(--nx-muted)]">{t.businessType}</td>
                        {['stock', 'services', 'appointments', 'documents'].map((modKey) => {
                          const active = mods.includes(modKey);
                          return (
                            <td key={modKey} className="py-3 px-4">
                              <button
                                onClick={() => handleToggleModuleAdmin(t, modKey)}
                                className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                                  active
                                    ? 'bg-[var(--nx-accent-bg)] text-[var(--nx-accent)] border-[var(--nx-accent-border)]'
                                    : 'bg-[var(--nx-bg)] text-[var(--nx-subtle)] border-[var(--nx-border)]'
                                }`}
                              >
                                {active ? 'Habilitado' : 'Desativado'}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Gerenciador de Banners do Carrossel da Tela de Login / Cadastro */}
            <div className="pt-4 space-y-4">
              <div>
                <h3 className="text-base font-bold text-[var(--nx-text)]">
                  Banners da Tela de Login & Cadastro (Carrossel)
                </h3>
                <p className="text-xs text-[var(--nx-muted)]">
                  Adicione imagens promocionais, avisos ou fotos do sistema que ficam passando automaticamente na coluna esquerda do login.
                </p>
              </div>

              <form
                onSubmit={handleSaveAuthSlide}
                className="bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-lg p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
              >
                <div className="md:col-span-3">
                  <label className="block text-[11px] font-medium text-[var(--nx-muted)] mb-1">
                    Título do banner
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Promoção Plano Anual"
                    value={newSlide.title}
                    onChange={(e) => setNewSlide({ ...newSlide, title: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-[var(--nx-border-strong)] bg-[var(--nx-bg)] text-xs text-[var(--nx-text)] outline-none"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-[11px] font-medium text-[var(--nx-muted)] mb-1">
                    Subtítulo curto
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 30% OFF para novas clínicas"
                    value={newSlide.subtitle}
                    onChange={(e) => setNewSlide({ ...newSlide, subtitle: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-[var(--nx-border-strong)] bg-[var(--nx-bg)] text-xs text-[var(--nx-text)] outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-medium text-[var(--nx-muted)] mb-1">
                    Selo (Badge)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Novidade"
                    value={newSlide.badge}
                    onChange={(e) => setNewSlide({ ...newSlide, badge: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-[var(--nx-border-strong)] bg-[var(--nx-bg)] text-xs text-[var(--nx-text)] outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-medium text-[var(--nx-muted)] mb-1">
                    URL da imagem
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://..."
                    value={newSlide.imageUrl}
                    onChange={(e) => setNewSlide({ ...newSlide, imageUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-[var(--nx-border-strong)] bg-[var(--nx-bg)] text-xs text-[var(--nx-text)] outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <button type="submit" className="nx-btn-primary w-full py-2 text-xs">
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Banner
                  </button>
                </div>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {authSlides.map((slide) => (
                  <div
                    key={slide.id}
                    className="bg-[var(--nx-surface)] border border-[var(--nx-border)] rounded-lg overflow-hidden flex flex-col justify-between"
                  >
                    <div className="relative h-32 bg-[var(--nx-bg)]">
                      <img
                        src={slide.imageUrl}
                        alt={slide.title}
                        className="w-full h-full object-cover"
                      />
                      {slide.badge && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--nx-primary)] text-white">
                          {slide.badge}
                        </span>
                      )}
                    </div>
                    <div className="p-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[var(--nx-text)] truncate">
                          {slide.title}
                        </div>
                        <div className="text-[11px] text-[var(--nx-muted)] line-clamp-2 mt-0.5">
                          {slide.subtitle || 'Sem subtítulo'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAuthSlide(slide.id)}
                        className="p-1.5 rounded text-[var(--nx-subtle)] hover:text-[var(--nx-error)] shrink-0"
                        title="Remover banner"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* =================================================================== */}
      {/* MODAL 1: CRIAR / EDITAR SERVIÇO + VARIAÇÕES DE PORTE + RETORNO      */}
      {/* =================================================================== */}
      {serviceModalOpen && (
        <div
          className="nx-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setServiceModalOpen(false);
          }}
        >
          <div className="nx-modal-box" role="dialog" aria-modal="true">
            <div className="nx-modal-main p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-[var(--nx-text)]">
                  {editingService ? 'Editar Serviço & Variações' : 'Novo Serviço / Procedimento'}
                </h2>
                <button
                  type="button"
                  onClick={() => setServiceModalOpen(false)}
                  className="p-1.5 rounded-md text-[var(--nx-subtle)] hover:text-[var(--nx-text)] hover:bg-[var(--nx-surface-alt)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveService} className="space-y-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="nx-field">
                    <input
                      type="text"
                      placeholder=" "
                      required
                      value={srvForm.name}
                      onChange={(e) => setSrvForm({ ...srvForm, name: e.target.value })}
                    />
                    <label>Nome do serviço (ex: Banho & Tosa)</label>
                  </div>

                  <div className="nx-field">
                    <input
                      type="text"
                      placeholder=" "
                      required
                      value={srvForm.category}
                      onChange={(e) => setSrvForm({ ...srvForm, category: e.target.value })}
                    />
                    <label>Categoria (ex: Estética, Clínica)</label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="nx-field">
                    <input
                      type="number"
                      min="5"
                      step="5"
                      placeholder=" "
                      required
                      value={srvForm.durationMinutes}
                      onChange={(e) => setSrvForm({ ...srvForm, durationMinutes: e.target.value })}
                    />
                    <label>Duração base (min)</label>
                  </div>

                  <div className="nx-field">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder=" "
                      required
                      value={srvForm.price}
                      onChange={(e) => setSrvForm({ ...srvForm, price: e.target.value })}
                    />
                    <label>Valor base (R$)</label>
                  </div>

                  <div className="nx-field">
                    <input
                      type="number"
                      min="0"
                      placeholder=" "
                      value={srvForm.returnCycleDays}
                      onChange={(e) => setSrvForm({ ...srvForm, returnCycleDays: e.target.value })}
                    />
                    <label>Ciclo retorno (dias)</label>
                  </div>
                </div>

                {/* Construtor de Tabela de Preço e Tempo por Porte / Complexidade (Feature 2) */}
                <div className="p-3.5 rounded-lg bg-[var(--nx-bg)] border border-[var(--nx-border)] mb-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <div className="text-xs font-bold text-[var(--nx-text)]">
                        Tabela de Preço e Tempo por Porte / Complexidade
                      </div>
                      <p className="text-[11px] text-[var(--nx-muted)]">
                        Defina durações e valores diferenciados (ex: Porte P, M, G ou Nível de Complexidade).
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setSrvForm((prev) => ({
                            ...prev,
                            variants: [
                              { label: 'Porte P (até 8kg)', durationMinutes: 45, price: 55 },
                              { label: 'Porte M (8 a 20kg)', durationMinutes: 60, price: 75 },
                              { label: 'Porte G (acima de 20kg)', durationMinutes: 90, price: 110 }
                            ]
                          }))
                        }
                        className="px-2.5 py-1 rounded text-[11px] font-medium border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] hover:bg-[var(--nx-surface-alt)] text-[var(--nx-text)]"
                      >
                        Padrão P / M / G
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSrvForm((prev) => ({
                            ...prev,
                            variants: [
                              ...prev.variants,
                              { label: '', durationMinutes: 60, price: Number(prev.price || 0) }
                            ]
                          }))
                        }
                        className="px-2.5 py-1 rounded text-[11px] font-semibold bg-[var(--nx-primary-soft)] text-[var(--nx-primary)]"
                      >
                        + Variação
                      </button>
                    </div>
                  </div>

                  {srvForm.variants.length > 0 && (
                    <div className="space-y-2">
                      {srvForm.variants.map((v, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                          <input
                            type="text"
                            placeholder="Ex: Porte G (acima de 20kg)"
                            value={v.label}
                            onChange={(e) => {
                              const next = [...srvForm.variants];
                              next[idx] = { ...next[idx], label: e.target.value };
                              setSrvForm({ ...srvForm, variants: next });
                            }}
                            className="col-span-6 px-2.5 py-1.5 rounded border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] text-xs text-[var(--nx-text)]"
                          />
                          <input
                            type="number"
                            placeholder="Min"
                            value={v.durationMinutes}
                            onChange={(e) => {
                              const next = [...srvForm.variants];
                              next[idx] = { ...next[idx], durationMinutes: Number(e.target.value) };
                              setSrvForm({ ...srvForm, variants: next });
                            }}
                            className="col-span-2 px-2 py-1.5 rounded border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] text-xs text-[var(--nx-text)] tabular-data"
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="R$"
                            value={v.price}
                            onChange={(e) => {
                              const next = [...srvForm.variants];
                              next[idx] = { ...next[idx], price: Number(e.target.value) };
                              setSrvForm({ ...srvForm, variants: next });
                            }}
                            className="col-span-3 px-2 py-1.5 rounded border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] text-xs text-[var(--nx-text)] tabular-data"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setSrvForm({
                                ...srvForm,
                                variants: srvForm.variants.filter((_, i) => i !== idx)
                              })
                            }
                            className="col-span-1 flex justify-center text-[var(--nx-subtle)] hover:text-[var(--nx-error)]"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="nx-field">
                  <textarea
                    rows={3}
                    placeholder=" "
                    value={srvForm.description}
                    onChange={(e) => setSrvForm({ ...srvForm, description: e.target.value })}
                  />
                  <label>Recomendações de preparo e regras do serviço</label>

                  <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {templates.slice(0, 4).map((tpl) => {
                        const isActive = srvForm.description.includes(tpl.instruction);
                        return (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() =>
                              setSrvForm((prev) => ({
                                ...prev,
                                description: toggleSmartChipText(prev.description, tpl.instruction)
                              }))
                            }
                            className={`nx-smart-chip ${isActive ? 'active' : ''}`}
                          >
                            {tpl.name}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setSrvSidePanelOpen((o) => !o)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[var(--nx-primary)] hover:underline"
                    >
                      Mais instruções
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${
                          srvSidePanelOpen ? '-rotate-90' : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--nx-border)]">
                  <button
                    type="button"
                    onClick={() => setServiceModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-[var(--nx-muted)] border border-[var(--nx-border-strong)] rounded-md"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="nx-btn-primary px-5 py-2 text-xs">
                    {editingService ? 'Salvar alterações' : 'Cadastrar serviço'}
                  </button>
                </div>
              </form>
            </div>

            {renderCoupledTemplatesSidePanel(
              srvSidePanelOpen,
              () => setSrvSidePanelOpen(false),
              srvForm.description,
              (snippet) =>
                setSrvForm((prev) => ({
                  ...prev,
                  description: toggleSmartChipText(prev.description, snippet)
                }))
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: CRIAR / EDITAR AGENDAMENTO + PORTE + PROFISSIONAL + CHECKLIST */}
      {/* =================================================================== */}
      {apptModalOpen && (
        <div
          className="nx-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setApptModalOpen(false);
          }}
        >
          <div className="nx-modal-box" role="dialog" aria-modal="true">
            <div className="nx-modal-main p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-[var(--nx-text)]">
                  {editingAppt ? 'Editar Ordem de Serviço & Vistoria' : 'Novo Agendamento / Ordem de Serviço'}
                </h2>
                <button
                  type="button"
                  onClick={() => setApptModalOpen(false)}
                  className="p-1.5 rounded-md text-[var(--nx-subtle)] hover:text-[var(--nx-text)] hover:bg-[var(--nx-surface-alt)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveAppointment} className="space-y-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="nx-field">
                    <input
                      type="text"
                      placeholder=" "
                      required
                      value={apptForm.customerName}
                      onChange={(e) => setApptForm({ ...apptForm, customerName: e.target.value })}
                    />
                    <label>Nome do cliente / responsável</label>
                  </div>

                  <div className="nx-field">
                    <input
                      type="text"
                      placeholder=" "
                      required
                      value={apptForm.customerPhone}
                      onChange={(e) => setApptForm({ ...apptForm, customerPhone: e.target.value })}
                    />
                    <label>Telefone WhatsApp (DDD + Número)</label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="nx-field">
                    <select
                      value={apptForm.serviceId}
                      onChange={(e) => handleSelectServiceInAppt(e.target.value)}
                    >
                      <option value="">Atendimento Geral</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (Base R$ {Number(s.price).toFixed(2)} / {s.durationMinutes}m)
                        </option>
                      ))}
                    </select>
                    <label>Serviço / Procedimento</label>
                  </div>

                  <div className="nx-field">
                    <select
                      value={apptForm.professionalId}
                      onChange={(e) => setApptForm({ ...apptForm, professionalId: e.target.value })}
                    >
                      <option value="">Sem profissional específico</option>
                      {professionals.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.role} / Comissão {p.commissionPct}%)
                        </option>
                      ))}
                    </select>
                    <label>Profissional / Box Responsável</label>
                  </div>
                </div>

                {/* Seleção Rápida de Variação de Porte / Complexidade (Feature 2) */}
                {selectedServiceVariants.length > 0 && (
                  <div className="p-3 rounded-lg bg-[var(--nx-bg)] border border-[var(--nx-border)] mb-3">
                    <div className="text-[11px] font-semibold text-[var(--nx-muted)] mb-2">
                      Selecione o Porte / Complexidade para ajustar valor e tempo automaticamente:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedServiceVariants.map((v, i) => {
                        const isSelected = apptForm.variantLabel === v.label;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleSelectVariantInAppt(v)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                              isSelected
                                ? 'bg-[var(--nx-primary)] text-white border-[var(--nx-primary)]'
                                : 'bg-[var(--nx-surface)] text-[var(--nx-text)] border-[var(--nx-border-strong)] hover:border-[var(--nx-primary)]'
                            }`}
                          >
                            {v.label} / R$ {Number(v.price).toFixed(2)} ({v.durationMinutes}m)
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="nx-field">
                    <input
                      type="datetime-local"
                      placeholder=" "
                      required
                      value={apptForm.scheduledAt}
                      onChange={(e) => setApptForm({ ...apptForm, scheduledAt: e.target.value })}
                    />
                    <label>Data e horário</label>
                  </div>

                  <div className="nx-field">
                    <input
                      type="number"
                      step="0.01"
                      placeholder=" "
                      value={apptForm.agreedPrice}
                      onChange={(e) => setApptForm({ ...apptForm, agreedPrice: e.target.value })}
                    />
                    <label>Valor acordado (R$)</label>
                  </div>

                  <div className="nx-field">
                    <input
                      type="number"
                      placeholder=" "
                      value={apptForm.agreedDuration}
                      onChange={(e) => setApptForm({ ...apptForm, agreedDuration: e.target.value })}
                    />
                    <label>Tempo alocado (min)</label>
                  </div>
                </div>

                {/* Checklist de Entrada / Anamnese de Recepção (Feature 3) */}
                <div className="p-3.5 rounded-lg bg-[var(--nx-bg)] border border-[var(--nx-border)] mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[var(--nx-text)]">
                      Checklist de Entrada (Anamnese / Vistoria de Recepção)
                    </span>
                    <span className="text-[11px] text-[var(--nx-primary)] font-semibold tabular-data">
                      {apptForm.checkinChecklist.length} marcados
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {Array.from(new Set([...DEFAULT_CHECKIN_ITEMS, ...apptForm.checkinChecklist])).map(
                      (item) => {
                        const checked = apptForm.checkinChecklist.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleChecklistItemInForm(item)}
                            className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                              checked
                                ? 'bg-[var(--nx-accent-bg)] text-[var(--nx-accent)] border-[var(--nx-accent-border)]'
                                : 'bg-[var(--nx-surface)] text-[var(--nx-muted)] border-[var(--nx-border-strong)] hover:text-[var(--nx-text)]'
                            }`}
                          >
                            {checked ? '● ' : '+ '}
                            {item}
                          </button>
                        );
                      }
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customChecklistInput}
                      onChange={(e) => setCustomChecklistInput(e.target.value)}
                      placeholder="Adicionar item avulso na vistoria (ex: Guia azul entregue)..."
                      className="flex-1 px-2.5 py-1.5 rounded border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] text-xs text-[var(--nx-text)] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!customChecklistInput.trim()) return;
                        toggleChecklistItemInForm(customChecklistInput.trim());
                        setCustomChecklistInput('');
                      }}
                      className="px-3 py-1.5 rounded bg-[var(--nx-primary-soft)] text-[var(--nx-primary)] text-xs font-semibold"
                    >
                      Incluir
                    </button>
                  </div>
                </div>

                <div className="nx-field">
                  <textarea
                    rows={3}
                    placeholder=" "
                    value={apptForm.notes}
                    onChange={(e) => setApptForm({ ...apptForm, notes: e.target.value })}
                  />
                  <label>Observações clínicas / técnicas e orientações ao cliente</label>

                  <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {templates.slice(0, 4).map((tpl) => {
                        const isActive = apptForm.notes.includes(tpl.instruction);
                        return (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() =>
                              setApptForm((prev) => ({
                                ...prev,
                                notes: toggleSmartChipText(prev.notes, tpl.instruction)
                              }))
                            }
                            className={`nx-smart-chip ${isActive ? 'active' : ''}`}
                          >
                            {tpl.name}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setApptSidePanelOpen((o) => !o)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[var(--nx-primary)] hover:underline"
                    >
                      Abrir gaveta de modelos
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${
                          apptSidePanelOpen ? '-rotate-90' : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--nx-border)]">
                  <button
                    type="button"
                    onClick={() => setApptModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-[var(--nx-muted)] border border-[var(--nx-border-strong)] rounded-md"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="nx-btn-primary px-5 py-2 text-xs">
                    {editingAppt ? 'Salvar alterações' : 'Confirmar agendamento'}
                  </button>
                </div>
              </form>
            </div>

            {renderCoupledTemplatesSidePanel(
              apptSidePanelOpen,
              () => setApptSidePanelOpen(false),
              apptForm.notes,
              (snippet) =>
                setApptForm((prev) => ({
                  ...prev,
                  notes: toggleSmartChipText(prev.notes, snippet)
                }))
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2B: CRIAR / EDITAR PROFISSIONAL E COMISSÃO (FEATURE 1)        */}
      {/* =================================================================== */}
      {profModalOpen && (
        <div
          className="nx-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setProfModalOpen(false);
          }}
        >
          <div className="nx-modal-main p-6 max-w-md" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[var(--nx-text)]">
                {editingProf ? 'Editar Profissional / Recurso' : 'Novo Profissional / Recurso'}
              </h2>
              <button
                type="button"
                onClick={() => setProfModalOpen(false)}
                className="p-1.5 rounded-md text-[var(--nx-subtle)] hover:text-[var(--nx-text)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfessional} className="space-y-1">
              <div className="nx-field">
                <input
                  type="text"
                  placeholder=" "
                  required
                  value={profForm.name}
                  onChange={(e) => setProfForm({ ...profForm, name: e.target.value })}
                />
                <label>Nome do profissional ou recurso (ex: Dra. Camila / Box 01)</label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="nx-field">
                  <input
                    type="text"
                    placeholder=" "
                    required
                    value={profForm.role}
                    onChange={(e) => setProfForm({ ...profForm, role: e.target.value })}
                  />
                  <label>Cargo / Função</label>
                </div>

                <div className="nx-field">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    placeholder=" "
                    required
                    value={profForm.commissionPct}
                    onChange={(e) => setProfForm({ ...profForm, commissionPct: e.target.value })}
                  />
                  <label>Comissão (%)</label>
                </div>
              </div>

              <div className="nx-field">
                <input
                  type="text"
                  placeholder=" "
                  value={profForm.specialty}
                  onChange={(e) => setProfForm({ ...profForm, specialty: e.target.value })}
                />
                <label>Especialidade (ex: Dermatologia, Tosa na Tesoura)</label>
              </div>

              <div className="nx-field">
                <input
                  type="text"
                  placeholder=" "
                  value={profForm.phone}
                  onChange={(e) => setProfForm({ ...profForm, phone: e.target.value })}
                />
                <label>Telefone / WhatsApp do profissional</label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setProfModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[var(--nx-muted)] border border-[var(--nx-border-strong)] rounded-md"
                >
                  Cancelar
                </button>
                <button type="submit" className="nx-btn-primary px-4 py-2 text-xs">
                  {editingProf ? 'Salvar alterações' : 'Cadastrar profissional'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 3: VOUCHER / ORDEM DE SERVIÇO PDF & VISTORIA INTERATIVA       */}
      {/* =================================================================== */}
      {voucherAppt && (
        <div
          className="nx-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setVoucherAppt(null);
          }}
        >
          <div className="nx-modal-main p-6 max-w-lg max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--nx-border)]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[var(--nx-primary-soft)] text-[var(--nx-primary)] flex items-center justify-center">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--nx-text)]">
                    Ordem de Serviço #OS-{voucherAppt.id.slice(-4).toUpperCase()}
                  </h2>
                  <p className="text-[11px] text-[var(--nx-subtle)]">{selectedTenant?.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVoucherAppt(null)}
                className="p-1.5 rounded-md text-[var(--nx-subtle)] hover:text-[var(--nx-text)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-[var(--nx-bg)] border border-[var(--nx-border)] text-xs mb-4">
              <div>
                <span className="text-[10px] uppercase text-[var(--nx-subtle)] block">Cliente</span>
                <strong className="text-[var(--nx-text)]">{voucherAppt.customerName}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase text-[var(--nx-subtle)] block">WhatsApp</span>
                <strong className="text-[var(--nx-text)] tabular-data">{voucherAppt.customerPhone}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase text-[var(--nx-subtle)] block">Data e Hora</span>
                <strong className="text-[var(--nx-text)] tabular-data">
                  {new Date(voucherAppt.scheduledAt).toLocaleString('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short'
                  })}
                </strong>
              </div>
              <div>
                <span className="text-[10px] uppercase text-[var(--nx-subtle)] block">Profissional / Recurso</span>
                <strong className="text-[var(--nx-text)]">
                  {voucherAppt.professional?.name || 'Equipe Técnica'}
                </strong>
              </div>
            </div>

            {/* Rastreio de 4 Etapas dentro do Voucher */}
            <div className="mb-4 p-3 rounded-lg bg-[var(--nx-bg)] border border-[var(--nx-border)]">
              <div className="text-[10px] font-semibold uppercase text-[var(--nx-subtle)] mb-2">
                Etapa Atual da Ordem de Serviço (Clique para alterar e avisar cliente)
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {OS_STAGES.map((st) => {
                  const isCurrent = voucherAppt.status === st.key;
                  return (
                    <button
                      key={st.key}
                      type="button"
                      onClick={() => handleSetApptStage(voucherAppt, st.key)}
                      className={`py-1.5 px-1.5 rounded text-[10px] font-semibold transition-colors ${
                        isCurrent
                          ? 'bg-[var(--nx-primary)] text-white'
                          : 'bg-[var(--nx-surface)] text-[var(--nx-muted)] border border-[var(--nx-border)] hover:text-[var(--nx-text)]'
                      }`}
                    >
                      {st.shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[var(--nx-surface-alt)] border border-[var(--nx-border)] text-xs mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-[var(--nx-text)]">
                  {voucherAppt.service?.name || 'Atendimento Geral'}
                  {voucherAppt.variantLabel ? ` (${voucherAppt.variantLabel})` : ''}
                </span>
                <span className="font-bold text-[var(--nx-primary)] tabular-data">
                  R$ {Number(voucherAppt.agreedPrice ?? voucherAppt.service?.price ?? 0).toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-[var(--nx-muted)] leading-relaxed mt-1">
                {voucherAppt.notes || 'Apresente este comprovante na recepção no horário agendado.'}
              </p>
            </div>

            {/* Checklist de Entrada Interativo dentro do Voucher */}
            <div className="p-3.5 rounded-lg bg-[var(--nx-bg)] border border-[var(--nx-border)] text-xs mb-4">
              <div className="font-semibold text-[var(--nx-text)] mb-2">
                Checklist de Recepção / Anamnese de Entrada:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(
                  new Set([
                    ...DEFAULT_CHECKIN_ITEMS,
                    ...(Array.isArray(voucherAppt.checkinChecklist)
                      ? voucherAppt.checkinChecklist
                      : [])
                  ])
                ).map((item) => {
                  const isChecked =
                    Array.isArray(voucherAppt.checkinChecklist) &&
                    voucherAppt.checkinChecklist.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleToggleVoucherChecklist(voucherAppt, item)}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                        isChecked
                          ? 'bg-[var(--nx-accent-bg)] text-[var(--nx-accent)] border-[var(--nx-accent-border)]'
                          : 'bg-[var(--nx-surface)] text-[var(--nx-muted)] border-[var(--nx-border)]'
                      }`}
                    >
                      {isChecked ? '● ' : '○ '}
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-[var(--nx-border)]">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-md border border-[var(--nx-border-strong)] bg-[var(--nx-bg)] hover:bg-[var(--nx-surface-alt)] text-xs font-medium text-[var(--nx-text)] inline-flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir / PDF
              </button>

              <button
                type="button"
                onClick={() => handleSetApptStage(voucherAppt)}
                className="nx-btn-primary px-4 py-2 text-xs"
              >
                {voucherAppt.status === 'CONFIRMED'
                  ? '1. Validar Check-in Agora'
                  : voucherAppt.status === 'IN_PROGRESS'
                  ? '2. Marcar Pronto p/ Retirada (WhatsApp)'
                  : voucherAppt.status === 'READY_FOR_PICKUP'
                  ? '3. Confirmar Entrega Final'
                  : 'Reabrir Ordem de Serviço'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 4: NOTIFICAR CLIENTE COM AUTOCOMPLETE DE E-MAIL (MEDPET)      */}
      {/* =================================================================== */}
      {notifyAppt && (
        <div
          className="nx-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setNotifyAppt(null);
          }}
        >
          <div className="nx-modal-main p-6 max-w-md" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[var(--nx-text)]">
                Enviar Comprovante & Lembrete
              </h2>
              <button
                type="button"
                onClick={() => setNotifyAppt(null)}
                className="p-1.5 rounded-md text-[var(--nx-subtle)] hover:text-[var(--nx-text)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {notifySent ? (
              <div className="py-6 text-center space-y-2 animate-fade-up">
                <div className="w-10 h-10 rounded-full bg-[var(--nx-accent-bg)] text-[var(--nx-accent)] flex items-center justify-center mx-auto font-bold">
                  OK
                </div>
                <p className="text-sm font-semibold text-[var(--nx-text)]">
                  Aviso enviado para {notifyAppt.customerName}!
                </p>
                <p className="text-xs text-[var(--nx-muted)]">
                  O comprovante foi disparado para o WhatsApp ({notifyAppt.customerPhone}) e e-mail informado.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-[var(--nx-muted)] mb-4">
                  Envie os detalhes do agendamento de <strong>{notifyAppt.customerName}</strong> por WhatsApp e e-mail.
                </p>

                <div className="nx-field">
                  <input
                    id={notifyEmailId}
                    type="email"
                    placeholder=" "
                    value={notifyEmail}
                    onChange={(e) => {
                      setNotifyEmail(e.target.value);
                      setShowNotifySuggestions(true);
                    }}
                    onFocus={() => setShowNotifySuggestions(true)}
                    onBlur={() => setTimeout(() => setShowNotifySuggestions(false), 150)}
                  />
                  <label htmlFor={notifyEmailId}>E-mail do cliente (opcional)</label>

                  {showNotifySuggestions &&
                    notifyEmail.length > 1 &&
                    !EMAIL_DOMAINS.some((d) => notifyEmail.endsWith(d)) && (
                      <ul className="nx-email-suggestions">
                        {EMAIL_DOMAINS.map((domain) => {
                          const prefix = notifyEmail.includes('@')
                            ? notifyEmail.slice(0, notifyEmail.indexOf('@'))
                            : notifyEmail;
                          const full = prefix + domain;
                          return (
                            <li key={full}>
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setNotifyEmail(full);
                                  setShowNotifySuggestions(false);
                                }}
                              >
                                <span className="font-semibold text-[var(--nx-text)]">{prefix}</span>
                                <span className="text-[var(--nx-muted)]">{domain}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                </div>

                <div className="p-3 rounded-md bg-[var(--nx-bg)] border border-[var(--nx-border)] text-xs text-[var(--nx-muted)] mb-4">
                  <strong className="text-[var(--nx-text)] block mb-1">
                    Prévia da mensagem automática ({notifyAppt.customerPhone}):
                  </strong>
                  Olá, {notifyAppt.customerName}! Confirmamos seu agendamento de{' '}
                  {notifyAppt.service?.name || 'Atendimento'} em {selectedTenant?.name} para{' '}
                  {new Date(notifyAppt.scheduledAt).toLocaleString('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short'
                  })}
                  . Protocolo #OS-{notifyAppt.id.slice(-4).toUpperCase()}.
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setNotifyAppt(null)}
                    className="px-4 py-2 text-xs font-medium text-[var(--nx-muted)] border border-[var(--nx-border-strong)] rounded-md"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNotifySent(true);
                      setTimeout(() => setNotifyAppt(null), 1800);
                    }}
                    className="nx-btn-primary px-4 py-2 text-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Disparar confirmação
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 5: NOVO ITEM DE CATÁLOGO / INSUMO                             */}
      {/* =================================================================== */}
      {catModalOpen && (
        <div
          className="nx-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCatModalOpen(false);
          }}
        >
          <div className="nx-modal-main p-6 max-w-md" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[var(--nx-text)]">Novo Produto / Insumo</h2>
              <button
                type="button"
                onClick={() => setCatModalOpen(false)}
                className="p-1.5 rounded-md text-[var(--nx-subtle)] hover:text-[var(--nx-text)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddCatalog} className="space-y-1">
              <div className="nx-field">
                <input
                  type="text"
                  placeholder=" "
                  required
                  value={newCatalog.code}
                  onChange={(e) => setNewCatalog({ ...newCatalog, code: e.target.value })}
                />
                <label>Código SKU (ex: INS-009)</label>
              </div>
              <div className="nx-field">
                <input
                  type="text"
                  placeholder=" "
                  required
                  value={newCatalog.name}
                  onChange={(e) => setNewCatalog({ ...newCatalog, name: e.target.value })}
                />
                <label>Descrição do produto</label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="nx-field">
                  <input
                    type="number"
                    step="0.01"
                    placeholder=" "
                    required
                    value={newCatalog.price}
                    onChange={(e) => setNewCatalog({ ...newCatalog, price: e.target.value })}
                  />
                  <label>Preço (R$)</label>
                </div>
                <div className="nx-field">
                  <input
                    type="number"
                    placeholder=" "
                    required
                    value={newCatalog.stockQty}
                    onChange={(e) => setNewCatalog({ ...newCatalog, stockQty: e.target.value })}
                  />
                  <label>Qtd. em estoque</label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setCatModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[var(--nx-muted)] border border-[var(--nx-border-strong)] rounded-md"
                >
                  Cancelar
                </button>
                <button type="submit" className="nx-btn-primary px-4 py-2 text-xs">
                  Salvar produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 6: NOVO DOCUMENTO / BOLETO                                    */}
      {/* =================================================================== */}
      {docModalOpen && (
        <div
          className="nx-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDocModalOpen(false);
          }}
        >
          <div className="nx-modal-main p-6 max-w-md" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[var(--nx-text)]">Protocolar Conta / Guia</h2>
              <button
                type="button"
                onClick={() => setDocModalOpen(false)}
                className="p-1.5 rounded-md text-[var(--nx-subtle)] hover:text-[var(--nx-text)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddDocument} className="space-y-1">
              <div className="nx-field">
                <input
                  type="text"
                  placeholder=" "
                  required
                  value={newDoc.title}
                  onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                />
                <label>Título do documento</label>
              </div>
              <div className="nx-field">
                <input
                  type="text"
                  placeholder=" "
                  required
                  value={newDoc.customerName}
                  onChange={(e) => setNewDoc({ ...newDoc, customerName: e.target.value })}
                />
                <label>Nome do cliente</label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="nx-field">
                  <input
                    type="number"
                    step="0.01"
                    placeholder=" "
                    value={newDoc.amount}
                    onChange={(e) => setNewDoc({ ...newDoc, amount: e.target.value })}
                  />
                  <label>Valor (R$)</label>
                </div>
                <div className="nx-field">
                  <input
                    type="text"
                    placeholder=" "
                    value={newDoc.dueDate}
                    onChange={(e) => setNewDoc({ ...newDoc, dueDate: e.target.value })}
                  />
                  <label>Vencimento (DD/MM/AAAA)</label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setDocModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[var(--nx-muted)] border border-[var(--nx-border-strong)] rounded-md"
                >
                  Cancelar
                </button>
                <button type="submit" className="nx-btn-primary px-4 py-2 text-xs">
                  Registrar documento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 7: CONFIRMAÇÃO DE EXCLUSÃO (PADRÃO MEDPET DELETE DIALOG)      */}
      {/* =================================================================== */}
      {deleteTarget && (
        <div
          className="nx-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteTarget(null);
          }}
        >
          <div className="nx-modal-main p-6 max-w-sm" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-[var(--nx-text)]">Confirmar exclusão</h2>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="p-1 rounded-md text-[var(--nx-subtle)] hover:text-[var(--nx-text)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[var(--nx-muted)] leading-relaxed mb-5">
              Tem certeza que deseja excluir{' '}
              <strong className="text-[var(--nx-text)]">
                "{deleteTarget.item.name || deleteTarget.item.customerName || deleteTarget.item.title}"
              </strong>
              ? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-medium text-[var(--nx-muted)] border border-[var(--nx-border-strong)] rounded-md"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-medium bg-[var(--nx-error)] text-white rounded-md hover:opacity-90 transition-opacity"
              >
                Excluir definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
