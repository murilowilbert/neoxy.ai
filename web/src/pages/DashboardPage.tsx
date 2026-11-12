import React, { useState, useEffect } from 'react';
import {
  Bot,
  LayoutDashboard,
  MessageSquare,
  PackageSearch,
  Calendar,
  FileText,
  Clock,
  Sparkles,
  ShieldAlert,
  LogOut,
  Plus,
  Send,
  CheckCircle2,
  QrCode,
  UserCheck,
  Building2,
  Trash2,
  Save,
  RefreshCw,
  Sliders
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
  const [loadingData, setLoadingData] = useState(false);
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
    setLoadingData(true);
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
    } finally {
      setLoadingData(false);
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
      showNotification('✅ Configurações, horários e diretrizes da IA salvos com sucesso!');
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
      showNotification('📦 Produto cadastrado/atualizado no catálogo!');
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
      showNotification('✨ Serviço adicionado com sucesso!');
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
      showNotification('📅 Horário agendado com sucesso!');
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
      showNotification('📄 Conta/Documento protocolado com sucesso!');
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
    showNotification(`Status atualizado para ${status}`);
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
    showNotification(`🔧 Módulo "${moduleName}" atualizado para ${targetTenant.name}!`);
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
    { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard, visible: true },
    { id: 'inbox', label: 'Conversas & Handoff', icon: MessageSquare, visible: true },
    { id: 'stock', label: 'Produtos & Estoque', icon: PackageSearch, visible: enabledModules.includes('stock') },
    { id: 'services', label: 'Catálogo de Serviços', icon: Sparkles, visible: enabledModules.includes('services') },
    { id: 'appointments', label: 'Agenda & Horários', icon: Calendar, visible: enabledModules.includes('appointments') },
    { id: 'documents', label: 'Contas & Documentos', icon: FileText, visible: enabledModules.includes('documents') },
    { id: 'hours', label: 'Horários & Dados da Empresa', icon: Clock, visible: true },
    { id: 'ai-brain', label: 'Personalidade & Simulador IA', icon: Bot, visible: true },
    { id: 'whatsapp', label: 'Conexão WhatsApp (QR)', icon: QrCode, visible: true },
    { id: 'super-admin', label: 'Painel Master (Liberar Funções)', icon: Sliders, visible: user.role === 'SUPER_ADMIN' }
  ];

  return (
    <div className="min-h-screen bg-[#0D1117] text-slate-100 flex flex-col lg:flex-row">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-5 py-3.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          {toast}
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-full lg:w-72 bg-[#161B22] border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="font-extrabold text-white leading-none">neoxy<span className="text-emerald-400">.ai</span></div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {user.role === 'SUPER_ADMIN' ? 'Modo Super Admin' : 'Painel Empresarial'}
              </div>
            </div>
          </div>
        </div>

        {/* Tenant Switcher */}
        <div className="p-4 border-b border-slate-800 bg-[#0D1117]/50">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Estabelecimento Ativo:
          </label>
          <select
            value={selectedSlug}
            onChange={e => {
              setSelectedSlug(e.target.value);
              setActiveTab('overview');
            }}
            className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-[#161B22] border border-slate-700 text-sm font-semibold text-white focus:outline-none focus:border-emerald-500"
          >
            {tenants.map(t => (
              <option key={t.slug} value={t.slug}>
                {t.name} ({t.businessType})
              </option>
            ))}
          </select>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {enabledModules.map(mod => (
              <span
                key={mod}
                className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
              >
                +{mod}
              </span>
            ))}
          </div>
        </div>

        {/* Dynamic Menu */}
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {navItems.filter(item => item.visible).map(item => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 transition-all ${
                  active
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/15'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-[#0D1117]/40">
          <div className="truncate pr-2">
            <div className="text-xs font-bold text-white truncate">{user.name}</div>
            <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
          </div>
          <button
            onClick={() => {
              setToken(null);
              onLogout();
            }}
            title="Sair do Sistema"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
        {/* Top Bar Info */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-8 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <Building2 className="w-5 h-5 text-emerald-400" />
              <h1 className="text-2xl font-extrabold text-white">{currentTenant?.name}</h1>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Perfil: {currentTenant?.businessType}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              {currentTenant?.parsedSettings?.storeInfo?.about || 'Ambiente configurado e isolado para este estabelecimento.'}
            </p>
          </div>

          <button
            onClick={() => setActiveTab('ai-brain')}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-sm font-semibold flex items-center gap-2 transition-all"
          >
            <Bot className="w-4 h-4" />
            Testar Bot desta Empresa
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-[#161B22] border border-slate-800 p-5 rounded-2xl">
                <div className="text-xs font-semibold uppercase text-slate-400">Clientes Atendidos</div>
                <div className="text-3xl font-extrabold text-white mt-2">{metrics?.activeSessions ?? 0}</div>
                <div className="text-xs text-emerald-400 mt-1">Atendimento 24h Ativo</div>
              </div>

              {enabledModules.includes('stock') && (
                <div className="bg-[#161B22] border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs font-semibold uppercase text-slate-400">Itens no Catálogo</div>
                  <div className="text-3xl font-extrabold text-white mt-2">{metrics?.totalCatalog ?? 0}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Fonte: {currentTenant?.parsedSettings?.catalogSource?.type === 'google_sheets_csv' ? 'Google Sheets + Banco' : 'Banco Dedicado'}
                  </div>
                </div>
              )}

              {enabledModules.includes('appointments') && (
                <div className="bg-[#161B22] border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs font-semibold uppercase text-slate-400">Horários Agendados</div>
                  <div className="text-3xl font-extrabold text-cyan-400 mt-2">{metrics?.totalAppointments ?? 0}</div>
                  <div className="text-xs text-slate-400 mt-1">Confirmados na agenda</div>
                </div>
              )}

              {enabledModules.includes('documents') && (
                <div className="bg-[#161B22] border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs font-semibold uppercase text-slate-400">Contas / Boletos Pendentes</div>
                  <div className="text-3xl font-extrabold text-purple-400 mt-2">{metrics?.pendingDocuments ?? 0}</div>
                  <div className="text-xs text-slate-400 mt-1">Extraídos pelo Gemini Vision</div>
                </div>
              )}

              <div className="bg-[#161B22] border border-slate-800 p-5 rounded-2xl">
                <div className="text-xs font-semibold uppercase text-slate-400">Aguardando Humano (Handoff)</div>
                <div className="text-3xl font-extrabold text-amber-400 mt-2">{metrics?.handoffSessions ?? 0}</div>
                <div className="text-xs text-slate-400 mt-1">Conversas transferidas ao balcão</div>
              </div>
            </div>

            {/* Missed Demands for Retail */}
            {enabledModules.includes('stock') && metrics?.missedDemands?.length > 0 && (
              <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-1">
                  📊 Demandas Perdidas (Produtos procurados no WhatsApp sem estoque)
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  A IA registra automaticamente quando clientes pedem itens que sua loja ainda não cadastrou:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {metrics.missedDemands.map((md: any) => (
                    <div key={md.id} className="flex items-center justify-between p-3.5 rounded-xl bg-[#0D1117] border border-slate-800">
                      <span className="font-medium text-sm text-slate-200">{md.productName}</span>
                      <span className="px-2.5 py-1 text-xs font-bold rounded bg-amber-500/20 text-amber-300">
                        {md.searchCount} pedidos
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
            <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Cadastrar / Atualizar Produto Específico</h3>
              <form onSubmit={handleAddProduct} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <input
                  type="text"
                  placeholder="Código / EAN"
                  required
                  value={newProduct.code}
                  onChange={e => setNewProduct({ ...newProduct, code: e.target.value })}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white"
                />
                <input
                  type="text"
                  placeholder="Nome do Produto"
                  required
                  value={newProduct.name}
                  onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="sm:col-span-2 min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Preço (R$)"
                  required
                  value={newProduct.price}
                  onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white"
                />
                <button
                  type="submit"
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Salvar Item
                </button>
              </form>
            </div>

            <div className="bg-[#161B22] border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white">Itens Cadastrados neste Estabelecimento</h3>
                  {currentTenant?.parsedSettings?.catalogSource?.type === 'google_sheets_csv' && (
                    <p className="text-xs text-emerald-400 mt-0.5">
                      🔗 Sincronização Híbrida Ativa: Planilha Google Sheets (8.004 produtos) + Itens Locais abaixo
                    </p>
                  )}
                </div>
              </div>
              <div className="divide-y divide-slate-800">
                {catalog.map(item => (
                  <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30">
                    <div>
                      <div className="font-semibold text-white text-sm">{item.name}</div>
                      <div className="text-xs text-slate-400">
                        Cód: {item.code} • Categoria: {item.category || 'Geral'} • Estoque: {item.stockQty} un
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-emerald-400 text-sm">
                        R$ {Number(item.price).toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleDeleteProduct(item.id)}
                        className="p-2 text-slate-400 hover:text-red-400"
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
            <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Adicionar Serviço ou Procedimento</h3>
              <form onSubmit={handleAddService} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Nome do Serviço (ex: Banho e Tosa)"
                  required
                  value={newService.name}
                  onChange={e => setNewService({ ...newService, name: e.target.value })}
                  className="sm:col-span-2 min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white"
                />
                <input
                  type="number"
                  placeholder="Duração (min)"
                  required
                  value={newService.durationMinutes}
                  onChange={e => setNewService({ ...newService, durationMinutes: e.target.value })}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Valor (R$)"
                  required
                  value={newService.price}
                  onChange={e => setNewService({ ...newService, price: e.target.value })}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white"
                />
                <input
                  type="text"
                  placeholder="Descrição detalhada para a IA explicar ao cliente no WhatsApp"
                  value={newService.description}
                  onChange={e => setNewService({ ...newService, description: e.target.value })}
                  className="sm:col-span-3 min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white"
                />
                <button
                  type="submit"
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Adicionar Serviço
                </button>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map(srv => (
                <div key={srv.id} className="bg-[#161B22] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white">{srv.name}</h4>
                      <span className="text-sm font-extrabold text-emerald-400">R$ {Number(srv.price).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">{srv.description}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span>⏱️ Duração estimada: {srv.durationMinutes} min</span>
                    <span className="text-emerald-400 font-semibold">Ativo no WhatsApp</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: APPOINTMENTS (Services & Offices) */}
        {activeTab === 'appointments' && (
          <div className="space-y-8">
            <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Agendar Novo Horário Manualmente</h3>
              <form onSubmit={handleAddAppointment} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Nome do Cliente / Paciente"
                  required
                  value={newAppointment.customerName}
                  onChange={e => setNewAppointment({ ...newAppointment, customerName: e.target.value })}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white"
                />
                <input
                  type="text"
                  placeholder="WhatsApp (ex: 5551999999999)"
                  required
                  value={newAppointment.customerPhone}
                  onChange={e => setNewAppointment({ ...newAppointment, customerPhone: e.target.value })}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white"
                />
                <input
                  type="datetime-local"
                  required
                  value={newAppointment.scheduledAt}
                  onChange={e => setNewAppointment({ ...newAppointment, scheduledAt: e.target.value })}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white"
                />
                <button
                  type="submit"
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4" /> Confirmar Horário
                </button>
              </form>
            </div>

            <div className="bg-[#161B22] border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-800">
                <h3 className="font-bold text-white">Agenda de Compromissos e Atendimentos</h3>
              </div>
              <div className="divide-y divide-slate-800">
                {appointments.map(apt => (
                  <div key={apt.id} className="p-5 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="font-bold text-white text-sm">{apt.customerName}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        📱 {apt.customerPhone} • {apt.service?.name || 'Horário Marcado'}
                      </div>
                      {apt.notes && <div className="text-xs text-slate-300 mt-1">📝 Obs: {apt.notes}</div>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1.5 rounded-lg bg-[#0D1117] border border-slate-700 text-xs font-semibold text-cyan-300">
                        {new Date(apt.scheduledAt).toLocaleString('pt-BR')}
                      </span>
                      <span className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-500/20 text-emerald-300">
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
            <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-1">Protocolar Conta / Boleto / Documento</h3>
              <p className="text-xs text-slate-400 mb-4">
                Documentos enviados pelos clientes no WhatsApp aparecem aqui com leitura automática de valor e vencimento:
              </p>
              <form onSubmit={handleAddDocument} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Título (ex: Boleto Aluguel)"
                  required
                  value={newDoc.title}
                  onChange={e => setNewDoc({ ...newDoc, title: e.target.value })}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white"
                />
                <select
                  value={newDoc.docType}
                  onChange={e => setNewDoc({ ...newDoc, docType: e.target.value })}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white"
                >
                  <option value="BOLETO">Boleto / Conta a Pagar</option>
                  <option value="NOTA_FISCAL">Nota Fiscal (NF-e / NFS-e)</option>
                  <option value="COMPROVANTE">Comprovante de Pagamento</option>
                  <option value="CONTRATO">Contrato / Documento</option>
                </select>
                <input
                  type="text"
                  placeholder="Cliente / Empresa"
                  required
                  value={newDoc.customerName}
                  onChange={e => setNewDoc({ ...newDoc, customerName: e.target.value })}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Valor R$"
                  value={newDoc.amount}
                  onChange={e => setNewDoc({ ...newDoc, amount: e.target.value })}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white"
                />
                <input
                  type="date"
                  value={newDoc.dueDate}
                  onChange={e => setNewDoc({ ...newDoc, dueDate: e.target.value })}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white"
                />
                <button
                  type="submit"
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Registrar Conta
                </button>
              </form>
            </div>

            <div className="space-y-4">
              {documents.map(doc => (
                <div key={doc.id} className="bg-[#161B22] border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-0.5 text-[11px] font-bold rounded bg-purple-500/20 text-purple-300">
                        {doc.docType}
                      </span>
                      <h4 className="font-bold text-white text-base">{doc.title}</h4>
                    </div>
                    <div className="text-xs text-slate-400">
                      Enviado por: <strong>{doc.customerName}</strong> ({doc.customerPhone}) • Vencimento: <strong>{doc.dueDate || 'Não informado'}</strong>
                    </div>
                    {doc.aiSummary && (
                      <div className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-500/20 px-3 py-2 rounded-lg mt-2">
                        🤖 <strong>Leitura da IA:</strong> {doc.aiSummary}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {doc.amount && (
                      <div className="text-lg font-extrabold text-white">
                        R$ {Number(doc.amount).toFixed(2)}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {['PENDING', 'REVIEWED', 'PAID'].map(st => (
                        <button
                          key={st}
                          onClick={() => handleUpdateDocStatus(doc, st)}
                          className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                            doc.status === st
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-[#0D1117] text-slate-400 hover:text-white border border-slate-700'
                          }`}
                        >
                          {st === 'PENDING' ? 'Pendente' : st === 'REVIEWED' ? 'Conferido' : 'Pago/Baixado'}
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
            <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-white">Informações Padrão do Estabelecimento</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nome Comercial</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={e => setStoreName(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Endereço Físico / Localização</label>
                  <input
                    type="text"
                    value={storeAddress}
                    onChange={e => setStoreAddress(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Sobre a Empresa (Contexto Geral para a IA)</label>
                  <textarea
                    rows={2}
                    value={storeAbout}
                    onChange={e => setStoreAbout(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Política de Entregas / Atendimento</label>
                  <input
                    type="text"
                    value={deliveryPolicy}
                    onChange={e => setDeliveryPolicy(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Formas de Pagamento Aceitas</label>
                  <input
                    type="text"
                    value={paymentMethods}
                    onChange={e => setPaymentMethods(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white">Horários de Funcionamento Semanal</h3>
                <p className="text-xs text-slate-400">
                  A IA verifica estes horários em tempo real antes de responder cada cliente no WhatsApp:
                </p>
              </div>

              <div className="space-y-3">
                {['1', '2', '3', '4', '5', '6', '0'].map(dayKey => {
                  const ranges = schedule[dayKey] || [];
                  const isOpen = ranges.length > 0;
                  return (
                    <div key={dayKey} className="p-3.5 rounded-xl bg-[#0D1117] border border-slate-800 flex flex-wrap items-center justify-between gap-4">
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
                          className="w-4 h-4 accent-emerald-500"
                        />
                        <span className="text-sm font-semibold text-white">{DAY_NAMES[dayKey]}</span>
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
                                className="px-2.5 py-1.5 rounded-lg bg-[#161B22] border border-slate-700 text-xs text-white"
                              />
                              <span className="text-xs text-slate-400">às</span>
                              <input
                                type="time"
                                value={r.end}
                                onChange={e => {
                                  const copy = [...ranges];
                                  copy[idx] = { ...copy[idx], end: e.target.value };
                                  setSchedule({ ...schedule, [dayKey]: copy });
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-[#161B22] border border-slate-700 text-xs text-white"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-red-400">Fechado</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="min-h-[48px] px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Save className="w-4 h-4" /> Salvar Horários e Informações
            </button>
          </form>
        )}

        {/* TAB 7: AI BRAIN & SIMULATOR */}
        {activeTab === 'ai-brain' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <form onSubmit={handleSaveSettings} className="lg:col-span-6 bg-[#161B22] border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-white">Diretrizes & Personalidade ("Zero-Robô")</h3>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Atendente Virtual</label>
                <input
                  type="text"
                  value={attendantName}
                  onChange={e => setAttendantName(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tom de Voz e Comportamento</label>
                <textarea
                  rows={3}
                  value={personaTone}
                  onChange={e => setPersonaTone(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Resposta Padrão ao Pedirem Desconto (Handoff)</label>
                <textarea
                  rows={2}
                  value={discountMessage}
                  onChange={e => setDiscountMessage(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white"
                />
              </div>
              <button
                type="submit"
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Atualizar Cérebro da IA
              </button>
            </form>

            {/* Live AI Simulator */}
            <div className="lg:col-span-6 bg-[#161B22] border border-slate-800 rounded-2xl p-6 flex flex-col h-[520px]">
              <div className="pb-3 mb-3 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">Simulador WhatsApp em Tempo Real</h3>
                  <p className="text-xs text-slate-400">Testando com as regras e catálogo de: {currentTenant?.name}</p>
                </div>
                <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300">
                  Gemini 2.5 Flash
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {simHistory.length === 0 && (
                  <div className="text-center text-xs text-slate-500 my-12">
                    Envie uma mensagem abaixo para testar como o bot responde para os clientes de <strong>{currentTenant?.name}</strong>.
                  </div>
                )}
                {simHistory.map((m, i) => (
                  <div
                    key={i}
                    className={`p-3.5 rounded-xl text-sm ${
                      m.role === 'user'
                        ? 'bg-slate-800 text-white ml-10 rounded-tr-none'
                        : 'bg-emerald-950/90 border border-emerald-500/30 text-emerald-100 mr-10 rounded-tl-none'
                    }`}
                  >
                    {m.text}
                  </div>
                ))}
                {simLoading && (
                  <div className="text-xs text-emerald-400 animate-pulse">Digitando resposta humanizada...</div>
                )}
              </div>

              <form onSubmit={handleSendTestChat} className="mt-4 pt-3 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={simMessage}
                  onChange={e => setSimMessage(e.target.value)}
                  placeholder="Digite como se fosse um cliente no WhatsApp..."
                  className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-[#0D1117] border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={simLoading}
                  className="min-h-[44px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 8: INBOX & HUMAN HANDOFF */}
        {activeTab === 'inbox' && (
          <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Caixa de Entrada & Controle de Transbordo (Handoff)</h3>
                <p className="text-xs text-slate-400">
                  Assuma o atendimento humano a qualquer momento. Enquanto estiver pausado, a IA fica em silêncio para esse cliente.
                </p>
              </div>
              <button
                onClick={() => loadTenantTabContent(currentTenant.slug, 'inbox')}
                className="min-h-[40px] px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Atualizar
              </button>
            </div>

            {inboxSessions.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400 bg-[#0D1117] rounded-xl border border-slate-800">
                Nenhuma sessão iniciada ainda. Use a aba "Personalidade & Simulador IA" para gerar uma conversa de teste!
              </div>
            ) : (
              <div className="space-y-4">
                {inboxSessions.map(sess => {
                  const isPaused = sess.state === 'HUMAN_HANDOFF';
                  return (
                    <div key={sess.id} className="p-5 rounded-xl bg-[#0D1117] border border-slate-800 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-white text-sm">📱 Cliente: {sess.customerPhone}</span>
                          <span
                            className={`px-2.5 py-0.5 text-xs font-bold rounded ${
                              isPaused ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {isPaused ? '👩‍💼 Em Atendimento Humano (IA Pausada)' : '🤖 IA Atendendo Automaticamente'}
                          </span>
                        </div>
                        <button
                          onClick={async () => {
                            await apiFetch(`/api/tenants/${currentTenant.slug}/inbox/handoff`, {
                              method: 'POST',
                              body: JSON.stringify({ customerPhone: sess.customerPhone, pauseForHuman: !isPaused })
                            });
                            loadTenantTabContent(currentTenant.slug, 'inbox');
                            showNotification(!isPaused ? 'Conversa assumida por humano!' : 'IA reativada para este cliente!');
                          }}
                          className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                            isPaused
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                          }`}
                        >
                          <UserCheck className="w-4 h-4" />
                          {isPaused ? 'Devolver para a IA' : 'Assumir Conversa (Pausar IA)'}
                        </button>
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto pt-2 border-t border-slate-800/80">
                        {sess.messages?.slice(-4).map((m: any) => (
                          <div key={m.id} className="text-xs text-slate-300">
                            <strong className={m.role === 'user' ? 'text-cyan-400' : 'text-emerald-400'}>
                              {m.role === 'user' ? 'Cliente: ' : 'Atendente IA: '}
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
          <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-8 max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
              <QrCode className="w-8 h-8 text-emerald-400" />
              <div>
                <h3 className="text-lg font-bold text-white">Gateway WhatsApp — Evolution API v2</h3>
                <p className="text-xs text-slate-400">
                  Instância dedicada para <strong>{currentTenant?.name}</strong>: <code>{currentTenant?.slug}_instance</code>
                </p>
              </div>
            </div>
            <div className="p-6 rounded-xl bg-[#0D1117] border border-slate-800 text-sm text-slate-300 space-y-3">
              <p>
                O webhook Multi-Tenant já está pronto em:
                <code className="block mt-1 p-2.5 rounded bg-slate-900 text-emerald-400 text-xs">
                  POST http://localhost:3000/api/webhooks/whatsapp
                </code>
              </p>
              <p className="text-xs text-slate-400">
                Para conectar um celular real via QR Code, inicie o contêiner com <code>docker compose up -d</code> e acesse o gerenciador da Evolution API na porta <code>8080</code>.
              </p>
            </div>
          </div>
        )}

        {/* TAB 10: SUPER ADMIN MASTER CONTROL */}
        {activeTab === 'super-admin' && user.role === 'SUPER_ADMIN' && (
          <div className="space-y-6">
            <div className="bg-[#161B22] border border-emerald-500/40 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white">👑 Controle Global de Empresas & Módulos (Feature Flags)</h3>
              <p className="text-sm text-slate-400 mt-1">
                Ligue ou desligue funções específicas para cada cliente em tempo real. A barra lateral do cliente se adapta instantaneamente:
              </p>

              <div className="mt-6 space-y-4">
                {tenants.map(t => {
                  const mods: string[] = t.parsedModules || [];
                  const allAvailableModules = [
                    { id: 'stock', label: '📦 Produtos & Estoque' },
                    { id: 'services', label: '✨ Catálogo de Serviços' },
                    { id: 'appointments', label: '📅 Agenda & Horários' },
                    { id: 'documents', label: '📄 Recebimento de Contas/Docs' },
                    { id: 'crm', label: '📊 Funil CRM' }
                  ];
                  return (
                    <div key={t.id} className="p-5 rounded-xl bg-[#0D1117] border border-slate-800 flex flex-col gap-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-white text-base">{t.name}</span>
                          <span className="ml-2 text-xs text-slate-400">({t.slug})</span>
                        </div>
                        <span className="px-2.5 py-1 text-xs font-bold rounded bg-slate-800 text-emerald-400">
                          Perfil Base: {t.businessType}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {allAvailableModules.map(m => {
                          const enabled = mods.includes(m.id);
                          return (
                            <button
                              key={m.id}
                              onClick={() => handleToggleModuleForTenant(t, m.id)}
                              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 ${
                                enabled
                                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200'
                                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                              {m.label}
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
