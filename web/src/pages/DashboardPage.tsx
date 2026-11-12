import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  PackageSearch,
  Calendar,
  FileText,
  Clock,
  LogOut,
  Plus,
  Send,
  QrCode,
  UserCheck,
  Building2,
  Trash2,
  Save,
  RefreshCw,
  Sliders,
  Layers,
  Terminal
} from 'lucide-react';
import { apiFetch, setToken } from '../lib/api';

interface DashboardPageProps {
  user: any;
  tenants: any[];
  onLogout: () => void;
  onRefreshSession: () => Promise<void>;
}

const DAY_NAMES: Record<string, string> = {
  '1': 'Segunda-feira',
  '2': 'Terça-feira',
  '3': 'Quarta-feira',
  '4': 'Quinta-feira',
  '5': 'Sexta-feira',
  '6': 'Sábado',
  '0': 'Domingo'
};

export function DashboardPage({ user, tenants, onLogout, onRefreshSession }: DashboardPageProps) {
  const [selectedSlug, setSelectedSlug] = useState<string>(tenants[0]?.slug || '');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [metrics, setMetrics] = useState<any>(null);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [inboxSessions, setInboxSessions] = useState<any[]>([]);
  const [toast, setToast] = useState<string>('');

  // Simulator State
  const [simMessage, setSimMessage] = useState('');
  const [simHistory, setSimHistory] = useState<Array<{ role: string; text: string }>>([]);
  const [simLoading, setSimLoading] = useState(false);

  // Forms State
  const [newProduct, setNewProduct] = useState({ code: '', name: '', price: '', stockQty: '', category: '' });
  const [newService, setNewService] = useState({ name: '', durationMinutes: '45', price: '', description: '' });
  const [newAppointment, setNewAppointment] = useState({ customerName: '', customerPhone: '', scheduledAt: '', notes: '' });
  const [newDoc, setNewDoc] = useState({ title: '', docType: 'BOLETO', customerName: '', customerPhone: '', amount: '', dueDate: '', aiSummary: '' });

  // Settings & Business Hours State
  const currentTenant = tenants.find(t => t.slug === selectedSlug) || tenants[0];
  const enabledModules: string[] = currentTenant?.parsedModules || ['stock'];

  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storeAbout, setStoreAbout] = useState('');
  const [deliveryPolicy, setDeliveryPolicy] = useState('');
  const [paymentMethods, setPaymentMethods] = useState('');
  const [attendantName, setAttendantName] = useState('');
  const [personaTone, setPersonaTone] = useState('');
  const [discountMessage, setDiscountMessage] = useState('');
  const [schedule, setSchedule] = useState<Record<string, Array<{ start: string; end: string }>>>({});

  function showNotification(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  useEffect(() => {
    if (!currentTenant) return;
    const s = currentTenant.parsedSettings || {};
    setStoreName(currentTenant.name || '');
    setStoreAddress(s.storeInfo?.address || '');
    setStoreAbout(s.storeInfo?.about || '');
    setDeliveryPolicy(s.storeInfo?.deliveryPolicy || s.rules?.deliveryPolicy || '');
    setPaymentMethods(s.rules?.paymentMethods || '');
    setAttendantName(s.persona?.attendantName || 'Atendente');
    setPersonaTone(s.persona?.tone || '');
    setDiscountMessage(s.persona?.discountHandoffMessage || '');
    setSchedule(
      s.businessHours?.schedule || {
        '1': [{ start: '08:00', end: '18:00' }],
        '2': [{ start: '08:00', end: '18:00' }],
        '3': [{ start: '08:00', end: '18:00' }],
        '4': [{ start: '08:00', end: '18:00' }],
        '5': [{ start: '08:00', end: '18:00' }],
        '6': [{ start: '08:00', end: '12:00' }],
        '0': []
      }
    );
    setSimHistory([]);
    loadTenantTabContent(currentTenant.slug, activeTab);
  }, [selectedSlug]);

  useEffect(() => {
    if (currentTenant) {
      loadTenantTabContent(currentTenant.slug, activeTab);
    }
  }, [activeTab]);

  async function loadTenantTabContent(slug: string, tab: string) {
    try {
      if (tab === 'overview') {
        const res = await apiFetch(`/api/tenants/${slug}/metrics`);
        setMetrics(res.metrics);
      } else if (tab === 'stock') {
        const res = await apiFetch(`/api/tenants/${slug}/catalog`);
        setCatalog(res.items || []);
      } else if (tab === 'services') {
        const res = await apiFetch(`/api/tenants/${slug}/services`);
        setServices(res.services || []);
      } else if (tab === 'appointments') {
        const res = await apiFetch(`/api/tenants/${slug}/appointments`);
        setAppointments(res.appointments || []);
      } else if (tab === 'documents') {
        const res = await apiFetch(`/api/tenants/${slug}/documents`);
        setDocuments(res.documents || []);
      } else if (tab === 'inbox') {
        const res = await apiFetch(`/api/tenants/${slug}/inbox`);
        setInboxSessions(res.sessions || []);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!currentTenant) return;
    try {
      const updatedSettings = {
        ...currentTenant.parsedSettings,
        persona: {
          ...currentTenant.parsedSettings?.persona,
          attendantName,
          tone: personaTone,
          discountHandoffMessage: discountMessage
        },
        storeInfo: {
          ...currentTenant.parsedSettings?.storeInfo,
          address: storeAddress,
          about: storeAbout,
          deliveryPolicy
        },
        rules: {
          ...currentTenant.parsedSettings?.rules,
          deliveryPolicy,
          paymentMethods
        },
        businessHours: {
          timezone: 'America/Sao_Paulo',
          schedule,
          exceptions: currentTenant.parsedSettings?.businessHours?.exceptions || []
        }
      };

      await apiFetch(`/api/tenants/${currentTenant.slug}/settings`, {
        method: 'PUT',
        body: JSON.stringify({
          name: storeName,
          settings: updatedSettings
        })
      });
      await onRefreshSession();
      showNotification('Configurações, horários e diretrizes salvos.');
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch(`/api/tenants/${currentTenant.slug}/catalog`, {
        method: 'POST',
        body: JSON.stringify(newProduct)
      });
      setNewProduct({ code: '', name: '', price: '', stockQty: '', category: '' });
      loadTenantTabContent(currentTenant.slug, 'stock');
      showNotification('Produto registrado no catálogo.');
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleDeleteProduct(id: string) {
    await apiFetch(`/api/tenants/${currentTenant.slug}/catalog/${id}`, { method: 'DELETE' });
    loadTenantTabContent(currentTenant.slug, 'stock');
  }

  async function handleAddService(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch(`/api/tenants/${currentTenant.slug}/services`, {
        method: 'POST',
        body: JSON.stringify(newService)
      });
      setNewService({ name: '', durationMinutes: '45', price: '', description: '' });
      loadTenantTabContent(currentTenant.slug, 'services');
      showNotification('Serviço adicionado ao catálogo.');
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleAddAppointment(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch(`/api/tenants/${currentTenant.slug}/appointments`, {
        method: 'POST',
        body: JSON.stringify(newAppointment)
      });
      setNewAppointment({ customerName: '', customerPhone: '', scheduledAt: '', notes: '' });
      loadTenantTabContent(currentTenant.slug, 'appointments');
      showNotification('Horário agendado.');
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleAddDocument(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch(`/api/tenants/${currentTenant.slug}/documents`, {
        method: 'POST',
        body: JSON.stringify(newDoc)
      });
      setNewDoc({ title: '', docType: 'BOLETO', customerName: '', customerPhone: '', amount: '', dueDate: '', aiSummary: '' });
      loadTenantTabContent(currentTenant.slug, 'documents');
      showNotification('Documento protocolado.');
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleUpdateDocStatus(doc: any, status: string) {
    await apiFetch(`/api/tenants/${currentTenant.slug}/documents`, {
      method: 'POST',
      body: JSON.stringify({ ...doc, status })
    });
    loadTenantTabContent(currentTenant.slug, 'documents');
    showNotification(`Status alterado para ${status}`);
  }

  async function handleToggleModuleForTenant(targetTenant: any, moduleName: string) {
    const currentMods: string[] = targetTenant.parsedModules || [];
    const updatedMods = currentMods.includes(moduleName)
      ? currentMods.filter(m => m !== moduleName)
      : [...currentMods, moduleName];

    await apiFetch(`/api/admin/tenants/${targetTenant.slug}/modules`, {
      method: 'PATCH',
      body: JSON.stringify({ enabledModules: updatedMods })
    });
    await onRefreshSession();
    showNotification(`Módulo "${moduleName}" atualizado para ${targetTenant.name}.`);
  }

  async function handleSendTestChat(e: React.FormEvent) {
    e.preventDefault();
    if (!simMessage.trim()) return;
    const msg = simMessage;
    setSimMessage('');
    setSimHistory(prev => [...prev, { role: 'user', text: msg }]);
    setSimLoading(true);

    try {
      const res = await apiFetch(`/api/tenants/${currentTenant.slug}/test-chat`, {
        method: 'POST',
        body: JSON.stringify({ message: msg, customerPhone: '5551999990000' })
      });
      const bubbles = res.response?.bubbles || [res.response?.rawText || 'Sem resposta'];
      setSimHistory(prev => [
        ...prev,
        ...bubbles.map((b: string) => ({ role: 'bot', text: b }))
      ]);
    } catch (err: any) {
      setSimHistory(prev => [...prev, { role: 'bot', text: `Erro: ${err.message}` }]);
    } finally {
      setSimLoading(false);
    }
  }

  // Dynamic Sidebar Navigation Items based on tenant's enabledModules
  const navItems = [
    { id: 'overview', label: 'Resumo operacional', icon: LayoutDashboard, visible: true },
    { id: 'inbox', label: 'Conversas & transbordo', icon: MessageSquare, visible: true },
    { id: 'stock', label: 'Produtos & estoque', icon: PackageSearch, visible: enabledModules.includes('stock') },
    { id: 'services', label: 'Catálogo de serviços', icon: Layers, visible: enabledModules.includes('services') },
    { id: 'appointments', label: 'Agenda de horários', icon: Calendar, visible: enabledModules.includes('appointments') },
    { id: 'documents', label: 'Contas & documentos', icon: FileText, visible: enabledModules.includes('documents') },
    { id: 'hours', label: 'Expediente & cadastro', icon: Clock, visible: true },
    { id: 'ai-brain', label: 'Regras & simulador', icon: Terminal, visible: true },
    { id: 'whatsapp', label: 'Conexão WhatsApp', icon: QrCode, visible: true },
    { id: 'super-admin', label: 'Gerenciar módulos (Master)', icon: Sliders, visible: user.role === 'SUPER_ADMIN' }
  ];

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-[#111827] flex flex-col lg:flex-row">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded bg-[#111827] text-white font-medium text-sm border border-[#374151] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
          <span>{toast}</span>
        </div>
      )}

      {/* Left Sidebar — Industrial ERP Rail */}
      <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-[#DCE2EA] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#DCE2EA] flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold tracking-tight text-[#111827]">neoxy</span>
            <span className="text-xs font-semibold text-[#0F4C81] bg-[#0F4C81]/10 px-1.5 py-0.5 rounded">
              .ai
            </span>
          </div>
          <span className="text-[11px] font-medium text-[#4B5563]">
            {user.role === 'SUPER_ADMIN' ? 'Master' : 'Empresa'}
          </span>
        </div>

        {/* Tenant Switcher */}
        <div className="p-4 border-b border-[#DCE2EA] bg-[#F6F8FA]">
          <label className="block text-xs font-medium text-[#4B5563] mb-1.5">
            Estabelecimento selecionado
          </label>
          <select
            value={selectedSlug}
            onChange={e => {
              setSelectedSlug(e.target.value);
              setActiveTab('overview');
            }}
            className="w-full min-h-[38px] px-3 py-1.5 rounded bg-white border border-[#C4CDD8] text-sm font-semibold text-[#111827] focus:outline-none focus:border-[#0F4C81]"
          >
            {tenants.map(t => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>

          <div className="mt-2.5 flex flex-wrap gap-1">
            {enabledModules.map(mod => (
              <span
                key={mod}
                className="text-[11px] px-2 py-0.5 rounded bg-white border border-[#C4CDD8] text-[#4B5563]"
              >
                {mod}
              </span>
            ))}
          </div>
        </div>

        {/* Dynamic Menu */}
        <nav className="p-3 space-y-0.5 flex-1 overflow-y-auto">
          {navItems.filter(item => item.visible).map(item => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full min-h-[40px] px-3 py-2 rounded text-sm flex items-center gap-2.5 transition-colors ${
                  active
                    ? 'bg-[#0F4C81] text-white font-semibold'
                    : 'text-[#4B5563] hover:bg-[#EDF1F5] hover:text-[#111827] font-medium'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-[#DCE2EA] flex items-center justify-between bg-[#F6F8FA]">
          <div className="truncate pr-2">
            <div className="text-xs font-bold text-[#111827] truncate">{user.name}</div>
            <div className="text-[11px] text-[#4B5563] truncate">{user.email}</div>
          </div>
          <button
            onClick={() => {
              setToken(null);
              onLogout();
            }}
            title="Sair da conta"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded border border-[#C4CDD8] bg-white hover:bg-red-50 text-[#4B5563] hover:text-red-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
        {/* Top Bar Info */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-8 border-b border-[#DCE2EA]">
          <div>
            <div className="flex items-center gap-2.5">
              <Building2 className="w-5 h-5 text-[#0F4C81]" />
              <h1 className="text-2xl font-bold text-[#111827]">{currentTenant?.name}</h1>
              <span className="text-xs px-2.5 py-0.5 rounded bg-white border border-[#C4CDD8] text-[#4B5563] font-medium">
                {currentTenant?.businessType}
              </span>
            </div>
            <p className="text-sm text-[#4B5563] mt-1">
              {currentTenant?.parsedSettings?.storeInfo?.about || 'Ambiente operacional isolado.'}
            </p>
          </div>

          <button
            onClick={() => setActiveTab('ai-brain')}
            className="min-h-[40px] px-4 py-2 rounded bg-white hover:bg-[#EDF1F5] border border-[#C4CDD8] text-[#111827] text-sm font-semibold flex items-center gap-2 transition-colors"
          >
            <Terminal className="w-4 h-4 text-[#0F4C81]" />
            <span>Simular conversa</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Joined Metric Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-white border border-[#C4CDD8] rounded divide-y sm:divide-y-0 sm:divide-x divide-[#DCE2EA]">
              <div className="p-5">
                <div className="text-xs font-medium text-[#4B5563]">Clientes em atendimento</div>
                <div className="tabular-data text-3xl font-bold text-[#111827] mt-1">{metrics?.activeSessions ?? 0}</div>
                <div className="text-xs text-[#166534] mt-1 font-medium">Recepção automática ativa</div>
              </div>

              {enabledModules.includes('stock') && (
                <div className="p-5">
                  <div className="text-xs font-medium text-[#4B5563]">Itens cadastrados</div>
                  <div className="tabular-data text-3xl font-bold text-[#111827] mt-1">{metrics?.totalCatalog ?? 0}</div>
                  <div className="text-xs text-[#4B5563] mt-1">
                    {currentTenant?.parsedSettings?.catalogSource?.type === 'google_sheets_csv'
                      ? 'Planilha Google Sheets + Local'
                      : 'Catálogo em banco local'}
                  </div>
                </div>
              )}

              {enabledModules.includes('appointments') && (
                <div className="p-5">
                  <div className="text-xs font-medium text-[#4B5563]">Compromissos na agenda</div>
                  <div className="tabular-data text-3xl font-bold text-[#111827] mt-1">{metrics?.totalAppointments ?? 0}</div>
                  <div className="text-xs text-[#4B5563] mt-1">Horários confirmados</div>
                </div>
              )}

              {enabledModules.includes('documents') && (
                <div className="p-5">
                  <div className="text-xs font-medium text-[#4B5563]">Documentos pendentes</div>
                  <div className="tabular-data text-3xl font-bold text-[#111827] mt-1">{metrics?.pendingDocuments ?? 0}</div>
                  <div className="text-xs text-[#4B5563] mt-1">Boletos e notas recebidos</div>
                </div>
              )}

              <div className="p-5">
                <div className="text-xs font-medium text-[#4B5563]">Aguardando atendente humano</div>
                <div className="tabular-data text-3xl font-bold text-[#0F4C81] mt-1">{metrics?.handoffSessions ?? 0}</div>
                <div className="text-xs text-[#4B5563] mt-1">Em pausa humana (Handoff)</div>
              </div>
            </div>

            {/* Missed Demands for Retail */}
            {enabledModules.includes('stock') && metrics?.missedDemands?.length > 0 && (
              <div className="bg-white border border-[#C4CDD8] rounded overflow-hidden">
                <div className="p-5 border-b border-[#DCE2EA]">
                  <h3 className="text-base font-bold text-[#111827]">
                    Demandas perdidas (produtos procurados no WhatsApp sem saldo)
                  </h3>
                  <p className="text-xs text-[#4B5563] mt-0.5">
                    Itens solicitados pelos clientes que não constavam no catálogo no momento da busca.
                  </p>
                </div>
                <div className="divide-y divide-[#DCE2EA]">
                  {metrics.missedDemands.map((md: any) => (
                    <div key={md.id} className="px-5 py-3.5 flex items-center justify-between text-sm">
                      <span className="font-medium text-[#111827]">{md.productName}</span>
                      <span className="tabular-data text-xs px-2.5 py-1 rounded bg-[#F6F8FA] border border-[#C4CDD8] text-[#111827] font-medium">
                        {md.searchCount} solicitações
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: STOCK & CATALOG (Retail / Hybrid) */}
        {activeTab === 'stock' && (
          <div className="space-y-8">
            <div className="bg-white border border-[#C4CDD8] rounded p-6">
              <h3 className="text-base font-bold text-[#111827] mb-4">Adicionar ou atualizar item no catálogo</h3>
              <form onSubmit={handleAddProduct} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <input
                  type="text"
                  placeholder="Código / EAN"
                  required
                  value={newProduct.code}
                  onChange={e => setNewProduct({ ...newProduct, code: e.target.value })}
                  className="min-h-[40px] px-3 py-2 rounded bg-[#F6F8FA] border border-[#C4CDD8] text-sm text-[#111827]"
                />
                <input
                  type="text"
                  placeholder="Descrição do produto"
                  required
                  value={newProduct.name}
                  onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="sm:col-span-2 min-h-[40px] px-3 py-2 rounded bg-[#F6F8FA] border border-[#C4CDD8] text-sm text-[#111827]"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Preço (R$)"
                  required
                  value={newProduct.price}
                  onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                  className="min-h-[40px] px-3 py-2 rounded bg-[#F6F8FA] border border-[#C4CDD8] text-sm text-[#111827]"
                />
                <button
                  type="submit"
                  className="min-h-[40px] px-4 py-2 rounded bg-[#0F4C81] hover:bg-[#0B3961] text-white font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Salvar item</span>
                </button>
              </form>
            </div>

            <div className="bg-white border border-[#C4CDD8] rounded overflow-hidden">
              <div className="p-5 border-b border-[#DCE2EA] flex items-center justify-between bg-[#F6F8FA]">
                <div>
                  <h3 className="font-bold text-sm text-[#111827]">Catálogo de produtos do estabelecimento</h3>
                  {currentTenant?.parsedSettings?.catalogSource?.type === 'google_sheets_csv' && (
                    <p className="text-xs text-[#166534] mt-0.5 font-medium">
                      Sincronização ativa com planilha Google Sheets (8.004 produtos) + itens locais abaixo
                    </p>
                  )}
                </div>
              </div>
              <div className="divide-y divide-[#DCE2EA]">
                {catalog.map(item => (
                  <div key={item.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-[#F6F8FA]">
                    <div>
                      <div className="font-semibold text-[#111827] text-sm">{item.name}</div>
                      <div className="tabular-data text-xs text-[#4B5563] mt-0.5">
                        Cód: {item.code} | Categoria: {item.category || 'Geral'} | Saldo: {item.stockQty} un
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="tabular-data font-semibold text-[#111827] text-sm">
                        R$ {Number(item.price).toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleDeleteProduct(item.id)}
                        className="p-1.5 text-[#6B7280] hover:text-red-700"
                        title="Remover produto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SERVICES (Clinics, Pet Shops, Consultancies) */}
        {activeTab === 'services' && (
          <div className="space-y-8">
            <div className="bg-white border border-[#C4CDD8] rounded p-6">
              <h3 className="text-base font-bold text-[#111827] mb-4">Cadastrar procedimento ou serviço</h3>
              <form onSubmit={handleAddService} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Nome do serviço (ex: Banho e Tosa)"
                  required
                  value={newService.name}
                  onChange={e => setNewService({ ...newService, name: e.target.value })}
                  className="sm:col-span-2 min-h-[40px] px-3 py-2 rounded bg-[#F6F8FA] border border-[#C4CDD8] text-sm text-[#111827]"
                />
                <input
                  type="number"
                  placeholder="Duração (min)"
                  required
                  value={newService.durationMinutes}
                  onChange={e => setNewService({ ...newService, durationMinutes: e.target.value })}
                  className="min-h-[40px] px-3 py-2 rounded bg-[#F6F8FA] border border-[#C4CDD8] text-sm text-[#111827]"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Valor (R$)"
                  required
                  value={newService.price}
                  onChange={e => setNewService({ ...newService, price: e.target.value })}
                  className="min-h-[40px] px-3 py-2 rounded bg-[#F6F8FA] border border-[#C4CDD8] text-sm text-[#111827]"
                />
                <input
                  type="text"
                  placeholder="Explicação detalhada para o atendente informar no WhatsApp"
                  value={newService.description}
                  onChange={e => setNewService({ ...newService, description: e.target.value })}
                  className="sm:col-span-3 min-h-[40px] px-3 py-2 rounded bg-[#F6F8FA] border border-[#C4CDD8] text-sm text-[#111827]"
                />
                <button
                  type="submit"
                  className="min-h-[40px] px-4 py-2 rounded bg-[#0F4C81] hover:bg-[#0B3961] text-white font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar</span>
                </button>
              </form>
            </div>

            <div className="bg-white border border-[#C4CDD8] rounded divide-y divide-[#DCE2EA]">
              {services.map(srv => (
                <div key={srv.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-sm text-[#111827]">{srv.name}</h4>
                    <p className="text-xs text-[#4B5563] mt-1">{srv.description}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="tabular-data text-xs text-[#4B5563] bg-[#EDF1F5] px-2.5 py-1 rounded">
                      {srv.durationMinutes} min
                    </span>
                    <span className="tabular-data font-bold text-sm text-[#111827]">
                      R$ {Number(srv.price).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: APPOINTMENTS (Services & Offices) */}
        {activeTab === 'appointments' && (
          <div className="space-y-8">
            <div className="bg-white border border-[#C4CDD8] rounded p-6">
              <h3 className="text-base font-bold text-[#111816] mb-4">Registrar agendamento manual</h3>
              <form onSubmit={handleAddAppointment} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Nome do cliente"
                  required
                  value={newAppointment.customerName}
                  onChange={e => setNewAppointment({ ...newAppointment, customerName: e.target.value })}
                  className="min-h-[40px] px-3 py-2 rounded bg-[#F6F8FA] border border-[#C4CDD8] text-sm text-[#111827]"
                />
                <input
                  type="text"
                  placeholder="WhatsApp (ex: 5551999999999)"
                  required
                  value={newAppointment.customerPhone}
                  onChange={e => setNewAppointment({ ...newAppointment, customerPhone: e.target.value })}
                  className="min-h-[40px] px-3 py-2 rounded bg-[#F6F8FA] border border-[#C4CDD8] text-sm text-[#111827]"
                />
                <input
                  type="datetime-local"
                  required
                  value={newAppointment.scheduledAt}
                  onChange={e => setNewAppointment({ ...newAppointment, scheduledAt: e.target.value })}
                  className="min-h-[40px] px-3 py-2 rounded bg-[#F6F8FA] border border-[#C4CDD8] text-sm text-[#111827]"
                />
                <button
                  type="submit"
                  className="min-h-[40px] px-4 py-2 rounded bg-[#0F4C81] hover:bg-[#0B3961] text-white font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Confirmar horário</span>
                </button>
              </form>
            </div>

            <div className="bg-white border border-[#C4CDD8] rounded overflow-hidden">
              <div className="p-4 border-b border-[#DCE2EA] bg-[#F6F8FA]">
                <h3 className="font-bold text-sm text-[#111827]">Compromissos agendados</h3>
              </div>
              <div className="divide-y divide-[#DCE2EA]">
                {appointments.map(apt => (
                  <div key={apt.id} className="p-5 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="font-bold text-[#111827] text-sm">{apt.customerName}</div>
                      <div className="tabular-data text-xs text-[#4B5563] mt-0.5">
                        Tel: {apt.customerPhone} | {apt.service?.name || 'Atendimento agendado'}
                      </div>
                      {apt.notes && <div className="text-xs text-[#4B5563] mt-1">Observação: {apt.notes}</div>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tabular-data px-3 py-1 rounded bg-[#EDF1F5] border border-[#C4CDD8] text-xs font-medium text-[#111827]">
                        {new Date(apt.scheduledAt).toLocaleString('pt-BR')}
                      </span>
                      <span className="px-2.5 py-1 rounded text-xs font-semibold bg-[#166534]/10 text-[#166534]">
                        {apt.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: DOCUMENTS & BILLS (Offices / Accounting / Financial) */}
        {activeTab === 'documents' && (
          <div className="space-y-8">
            <div className="bg-white border border-[#C4CDD8] rounded p-6">
              <h3 className="text-base font-bold text-[#111827] mb-1">Protocolar conta, boleto ou documento</h3>
              <p className="text-xs text-[#4B5563] mb-4">
                Arquivos recebidos pelo WhatsApp são listados abaixo com valor e vencimento identificados.
              </p>
              <form onSubmit={handleAddDocument} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Descrição (ex: Boleto Energia)"
                  required
                  value={newDoc.title}
                  onChange={e => setNewDoc({ ...newDoc, title: e.target.value })}
                  className="min-h-[40px] px-3 py-2 rounded bg-[#F6F8FA] border border-[#C4CDD8] text-sm text-[#111827]"
                />
                <select
                  value={newDoc.docType}
                  onChange={e => setNewDoc({ ...newDoc, docType: e.target.value })}
                  className="min-h-[40px] px-3 py-2 rounded bg-[#F6F8FA] border border-[#C4CDD8] text-sm text-[#111827]"
                >
                  <option value="BOLETO">Boleto / Conta a pagar</option>
                  <option value="NOTA_FISCAL">Nota Fiscal (NF-e / NFS-e)</option>
                  <option value="COMPROVANTE">Comprovante de pagamento</option>
                  <option value="CONTRATO">Contrato / Documento</option>
                </select>
                <input
                  type="text"
                  placeholder="Nome do cliente / empresa"
                  required
                  value={newDoc.customerName}
                  onChange={e => setNewDoc({ ...newDoc, customerName: e.target.value })}
                  className="min-h-[40px] px-3 py-2 rounded bg-[#F6F8FA] border border-[#C4CDD8] text-sm text-[#111827]"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Valor R$"
                  value={newDoc.amount}
                  onChange={e => setNewDoc({ ...newDoc, amount: e.target.value })}
                  className="min-h-[40px] px-3 py-2 rounded bg-[#F6F8FA] border border-[#C4CDD8] text-sm text-[#111827]"
                />
                <input
                  type="date"
                  value={newDoc.dueDate}
                  onChange={e => setNewDoc({ ...newDoc, dueDate: e.target.value })}
                  className="min-h-[40px] px-3 py-2 rounded bg-[#F6F8FA] border border-[#C4CDD8] text-sm text-[#111827]"
                />
                <button
                  type="submit"
                  className="min-h-[40px] px-4 py-2 rounded bg-[#0F4C81] hover:bg-[#0B3961] text-white font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Registrar protocolo</span>
                </button>
              </form>
            </div>

            <div className="bg-white border border-[#C4CDD8] rounded divide-y divide-[#DCE2EA]">
              {documents.map(doc => (
                <div key={doc.id} className="p-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-[#EDF1F5] border border-[#C4CDD8] text-[#111827]">
                        {doc.docType}
                      </span>
                      <h4 className="font-bold text-[#111827] text-sm">{doc.title}</h4>
                    </div>
                    <div className="text-xs text-[#4B5563]">
                      Remetente: <strong>{doc.customerName}</strong> ({doc.customerPhone}) | Vencimento: <strong className="tabular-data">{doc.dueDate || 'Não informado'}</strong>
                    </div>
                    {doc.aiSummary && (
                      <div className="text-xs text-[#112A1A] bg-[#EBF5EE] border border-[#BBDAC4] px-3 py-2 rounded mt-2">
                        <strong>Resumo extraído:</strong> {doc.aiSummary}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {doc.amount && (
                      <div className="tabular-data text-base font-bold text-[#111827]">
                        R$ {Number(doc.amount).toFixed(2)}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      {['PENDING', 'REVIEWED', 'PAID'].map(st => (
                        <button
                          key={st}
                          onClick={() => handleUpdateDocStatus(doc, st)}
                          className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                            doc.status === st
                              ? 'bg-[#0F4C81] text-white'
                              : 'bg-[#F6F8FA] text-[#4B5563] hover:text-[#111827] border border-[#C4CDD8]'
                          }`}
                        >
                          {st === 'PENDING' ? 'Pendente' : st === 'REVIEWED' ? 'Conferido' : 'Baixado'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: BUSINESS HOURS & GENERAL INFO */}
        {activeTab === 'hours' && (
          <form onSubmit={handleSaveSettings} className="space-y-8 max-w-4xl">
            <div className="bg-white border border-[#C4CDD8] rounded p-6 space-y-4">
              <h3 className="text-base font-bold text-[#111827]">Dados cadastrais e operacionais</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#111827] mb-1">Nome comercial</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={e => setStoreName(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-2 rounded bg-[#F6F8FA] border border-[#C4CDD8] text-sm text-[#111827]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#111827] mb-1">Endereço físico</label>
                  <input
                    type="text"
                    value={storeAddress}
                    onChange={e => setStoreAddress(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-2 rounded bg-[#F6F8FA] border border-[#C4CDD8] text-sm text-[#111827]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-[#111827] mb-1">Apresentação e ramo de atuação</label>
                  <textarea
                    rows={2}
                    value={storeAbout}
                    onChange={e => setStoreAbout(e.target.value)}
                    className="w-full p-3 rounded bg-[#F6F8FA] border border-[#C4CDD8] text-sm text-[#111827]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#111827] mb-1">Regras de entrega / retirada</label>
                  <input
                    type="text"
                    value={deliveryPolicy}
                    onChange={e => setDeliveryPolicy(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-2 rounded bg-[#F6F8FA] border border-[#C4CDD8] text-sm text-[#111827]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#111827] mb-1">Meios de pagamento aceitos</label>
                  <input
                    type="text"
                    value={paymentMethods}
                    onChange={e => setPaymentMethods(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-2 rounded bg-[#F6F8FA] border border-[#C4CDD8] text-sm text-[#111827]"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#C4CDD8] rounded p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-[#111827]">Quadro de horários de funcionamento</h3>
                <p className="text-xs text-[#4B5563]">
                  O motor verifica automaticamente este quadro antes de responder clientes fora de hora.
                </p>
              </div>

              <div className="divide-y divide-[#DCE2EA] border border-[#DCE2EA] rounded">
                {['1', '2', '3', '4', '5', '6', '0'].map(dayKey => {
                  const ranges = schedule[dayKey] || [];
                  const isOpen = ranges.length > 0;
                  return (
                    <div key={dayKey} className="p-3.5 bg-[#F6F8FA] flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-[160px]">
                        <input
                          type="checkbox"
                          checked={isOpen}
                          onChange={e => {
                            if (e.target.checked) {
                              setSchedule({ ...schedule, [dayKey]: [{ start: '08:00', end: '18:00' }] });
                            } else {
                              setSchedule({ ...schedule, [dayKey]: [] });
                            }
                          }}
                          className="w-4 h-4 accent-[#0F4C81]"
                        />
                        <span className="text-sm font-medium text-[#111827]">{DAY_NAMES[dayKey]}</span>
                      </div>

                      {isOpen ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {ranges.map((r, idx) => (
                            <div key={idx} className="flex items-center gap-1.5">
                              <input
                                type="time"
                                value={r.start}
                                onChange={e => {
                                  const copy = [...ranges];
                                  copy[idx] = { ...copy[idx], start: e.target.value };
                                  setSchedule({ ...schedule, [dayKey]: copy });
                                }}
                                className="tabular-data px-2.5 py-1 rounded bg-white border border-[#C4CDD8] text-xs text-[#111827]"
                              />
                              <span className="text-xs text-[#4B5563]">até</span>
                              <input
                                type="time"
                                value={r.end}
                                onChange={e => {
                                  const copy = [...ranges];
                                  copy[idx] = { ...copy[idx], end: e.target.value };
                                  setSchedule({ ...schedule, [dayKey]: copy });
                                }}
                                className="tabular-data px-2.5 py-1 rounded bg-white border border-[#C4CDD8] text-xs text-[#111827]"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-[#6B7280] font-medium">Fechado</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="min-h-[44px] px-6 py-2.5 rounded bg-[#0F4C81] hover:bg-[#0B3961] text-white font-semibold text-sm flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Salvar expediente e dados</span>
            </button>
          </form>
        )}

        {/* TAB 7: AI BRAIN & SIMULATOR */}
        {activeTab === 'ai-brain' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <form onSubmit={handleSaveSettings} className="lg:col-span-6 bg-white border border-[#C4CDD8] rounded p-6 space-y-4">
              <h3 className="text-base font-bold text-[#111827]">Postura de atendimento e regras de negócio</h3>
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1">Nome do atendente responsável</label>
                <input
                  type="text"
                  value={attendantName}
                  onChange={e => setAttendantName(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 rounded bg-[#F6F8FA] border border-[#C4CDD8] text-sm text-[#111827]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1">Tom de conversa com o cliente</label>
                <textarea
                  rows={3}
                  value={personaTone}
                  onChange={e => setPersonaTone(e.target.value)}
                  className="w-full p-3 rounded bg-[#F6F8FA] border border-[#C4CDD8] text-sm text-[#111827]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1">Orientação quando o cliente pedir desconto (Handoff)</label>
                <textarea
                  rows={2}
                  value={discountMessage}
                  onChange={e => setDiscountMessage(e.target.value)}
                  className="w-full p-3 rounded bg-[#F6F8FA] border border-[#C4CDD8] text-sm text-[#111827]"
                />
              </div>
              <button
                type="submit"
                className="min-h-[42px] px-5 py-2 rounded bg-[#0F4C81] hover:bg-[#0B3961] text-white font-semibold text-sm flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Salvar diretrizes</span>
              </button>
            </form>

            {/* Live AI Simulator */}
            <div className="lg:col-span-6 bg-white border border-[#C4CDD8] rounded p-6 flex flex-col h-[520px]">
              <div className="pb-3 mb-3 border-b border-[#DCE2EA] flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[#111827] text-sm">Bancada de teste de conversação</h3>
                  <p className="text-xs text-[#4B5563]">Contexto carregado: {currentTenant?.name}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] bg-[#EDF1F5] border border-[#C4CDD8] text-[#111827] font-medium">
                  Gemini 2.5 Flash
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 bg-[#F6F8FA] p-4 rounded border border-[#DCE2EA]">
                {simHistory.length === 0 && (
                  <div className="text-center text-xs text-[#4B5563] my-12">
                    Envie uma mensagem abaixo para testar o comportamento de <strong>{currentTenant?.name}</strong>.
                  </div>
                )}
                {simHistory.map((m, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded text-sm border ${
                      m.role === 'user'
                        ? 'bg-white border-[#C4CDD8] text-[#111827] ml-10'
                        : 'bg-[#EBF5EE] border-[#BBDAC4] text-[#112A1A] mr-10'
                    }`}
                  >
                    {m.text}
                  </div>
                ))}
                {simLoading && (
                  <div className="text-xs text-[#0F4C81] font-medium">Processando resposta...</div>
                )}
              </div>

              <form onSubmit={handleSendTestChat} className="mt-4 flex gap-2">
                <input
                  type="text"
                  value={simMessage}
                  onChange={e => setSimMessage(e.target.value)}
                  placeholder="Escreva uma pergunta como cliente..."
                  className="flex-1 min-h-[42px] px-3.5 py-2 rounded bg-[#F6F8FA] border border-[#C4CDD8] text-sm text-[#111827] focus:outline-none focus:border-[#0F4C81]"
                />
                <button
                  type="submit"
                  disabled={simLoading}
                  className="min-h-[42px] px-4 rounded bg-[#0F4C81] hover:bg-[#0B3961] text-white font-semibold flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 8: INBOX & HUMAN HANDOFF */}
        {activeTab === 'inbox' && (
          <div className="bg-white border border-[#C4CDD8] rounded p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#111827]">Conversas ativas e controle de intervenção humana</h3>
                <p className="text-xs text-[#4B5563]">
                  Ao assumir uma conversa, o atendente automático é pausado imediatamente para aquele número.
                </p>
              </div>
              <button
                onClick={() => loadTenantTabContent(currentTenant.slug, 'inbox')}
                className="min-h-[38px] px-3 py-1.5 rounded bg-[#F6F8FA] border border-[#C4CDD8] text-xs font-semibold text-[#111827] flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Atualizar lista</span>
              </button>
            </div>

            {inboxSessions.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#4B5563] bg-[#F6F8FA] rounded border border-[#DCE2EA]">
                Nenhuma conversa registrada no momento. Utilize a aba "Regras & simulador" para iniciar um atendimento.
              </div>
            ) : (
              <div className="divide-y divide-[#DCE2EA] border border-[#DCE2EA] rounded">
                {inboxSessions.map(sess => {
                  const isPaused = sess.state === 'HUMAN_HANDOFF';
                  return (
                    <div key={sess.id} className="p-5 bg-[#F6F8FA] space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="tabular-data font-bold text-[#111827] text-sm">Cliente: {sess.customerPhone}</span>
                          <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded ${
                              isPaused
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-[#166534]/15 text-[#166534]'
                            }`}
                          >
                            {isPaused ? 'Atendimento humano (IA pausada)' : 'Atendimento automático ativo'}
                          </span>
                        </div>
                        <button
                          onClick={async () => {
                            await apiFetch(`/api/tenants/${currentTenant.slug}/inbox/handoff`, {
                              method: 'POST',
                              body: JSON.stringify({ customerPhone: sess.customerPhone, pauseForHuman: !isPaused })
                            });
                            loadTenantTabContent(currentTenant.slug, 'inbox');
                            showNotification(!isPaused ? 'Conversa assumida pela equipe.' : 'Atendimento automático reativado.');
                          }}
                          className={`min-h-[36px] px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 ${
                            isPaused
                              ? 'bg-[#0F4C81] text-white'
                              : 'bg-white border border-[#C4CDD8] text-[#111827] hover:bg-[#EDF1F5]'
                          }`}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{isPaused ? 'Devolver para atendimento automático' : 'Assumir conversa (pausar IA)'}</span>
                        </button>
                      </div>

                      <div className="space-y-1.5 max-h-48 overflow-y-auto pt-2 border-t border-[#DCE2EA]">
                        {sess.messages?.slice(-4).map((m: any) => (
                          <div key={m.id} className="text-xs text-[#111827]">
                            <strong className={m.role === 'user' ? 'text-[#4B5563]' : 'text-[#0F4C81]'}>
                              {m.role === 'user' ? 'Cliente: ' : 'Atendente: '}
                            </strong>
                            {m.content}
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

        {/* TAB 9: WHATSAPP CONNECTION (Evolution API) */}
        {activeTab === 'whatsapp' && (
          <div className="bg-white border border-[#C4CDD8] rounded p-6 max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
              <QrCode className="w-6 h-6 text-[#0F4C81]" />
              <div>
                <h3 className="text-base font-bold text-[#111827]">Instância WhatsApp — Evolution API v2</h3>
                <p className="text-xs text-[#4B5563]">
                  Identificador da sessão: <strong>{currentTenant?.slug}_instance</strong>
                </p>
              </div>
            </div>
            <div className="p-4 rounded bg-[#F6F8FA] border border-[#DCE2EA] text-sm text-[#111827] space-y-2">
              <p className="text-xs text-[#4B5563]">Endpoint de recebimento de eventos (Webhook):</p>
              <div className="p-2.5 rounded bg-white border border-[#C4CDD8] text-xs font-semibold text-[#111827]">
                POST http://localhost:3000/api/webhooks/whatsapp
              </div>
              <p className="text-xs text-[#4B5563] pt-1">
                Para parear um aparelho via QR Code, execute docker compose up -d e conecte a instância na porta 8080.
              </p>
            </div>
          </div>
        )}

        {/* TAB 10: SUPER ADMIN MASTER CONTROL */}
        {activeTab === 'super-admin' && user.role === 'SUPER_ADMIN' && (
          <div className="space-y-6">
            <div className="bg-white border border-[#C4CDD8] rounded p-6">
              <h3 className="text-lg font-bold text-[#111827]">Controle global de empresas e liberação de módulos</h3>
              <p className="text-sm text-[#4B5563] mt-1">
                Habilite ou desabilite funções para qualquer empresa. O menu lateral do cliente é atualizado imediatamente.
              </p>

              <div className="mt-6 divide-y divide-[#DCE2EA] border border-[#DCE2EA] rounded">
                {tenants.map(t => {
                  const mods: string[] = t.parsedModules || [];
                  const allAvailableModules = [
                    { id: 'stock', label: 'Produtos & Estoque' },
                    { id: 'services', label: 'Catálogo de Serviços' },
                    { id: 'appointments', label: 'Agenda de Horários' },
                    { id: 'documents', label: 'Recebimento de Contas/Docs' },
                    { id: 'crm', label: 'Funil CRM' }
                  ];
                  return (
                    <div key={t.id} className="p-5 bg-[#F6F8FA] flex flex-col gap-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-[#111827] text-sm">{t.name}</span>
                          <span className="ml-2 text-xs text-[#4B5563]">({t.slug})</span>
                        </div>
                        <span className="px-2.5 py-0.5 text-xs rounded bg-white border border-[#C4CDD8] text-[#111827] font-medium">
                          Perfil: {t.businessType}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {allAvailableModules.map(m => {
                          const enabled = mods.includes(m.id);
                          return (
                            <button
                              key={m.id}
                              onClick={() => handleToggleModuleForTenant(t, m.id)}
                              className={`min-h-[36px] px-3 py-1.5 rounded text-xs font-semibold border transition-colors flex items-center gap-2 ${
                                enabled
                                  ? 'bg-[#0F4C81] border-[#0F4C81] text-white'
                                  : 'bg-white border-[#C4CDD8] text-[#4B5563] hover:text-[#111827]'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${enabled ? 'bg-white' : 'bg-[#6B7280]'}`} />
                              <span>{m.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
