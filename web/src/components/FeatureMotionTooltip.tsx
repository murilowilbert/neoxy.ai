import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Play,
  Mic,
  FileText,
  MapPin,
  ShieldCheck,
  PhoneOff,
  AlertTriangle,
  CheckCheck,
  RefreshCw,
  Users,
  Radio,
  Sparkles
} from 'lucide-react';

export type FeatureDemoId =
  | 'audioUnderstanding'
  | 'pdfReading'
  | 'antiBan'
  | 'quotedReplies'
  | 'reactions'
  | 'locationPin'
  | 'sentimentAlert'
  | 'ignoreGroups'
  | 'rejectCalls'
  | 'typingIndicator'
  | 'readReceipts'
  | 'alwaysOnline'
  | 'autoReconnect'
  | 'syncContacts';

interface DemoMeta {
  title: string;
  caption: string;
  badge: string;
}

const DEMO_META: Record<FeatureDemoId, DemoMeta> = {
  audioUnderstanding: {
    title: 'Compreensão de Áudio',
    caption: 'O NEO escuta mensagens de voz do cliente e responde em texto com precisão.',
    badge: 'Voz → IA'
  },
  pdfReading: {
    title: 'Leitura de PDF & PIX',
    caption: 'Extrai valor, vencimento e pagador de boletos/PIX e salva em Documentos.',
    badge: 'OCR Inteligente'
  },
  antiBan: {
    title: 'Ritmo Humano Anti-Ban',
    caption: 'Calcula pausas naturais e velocidade de digitação para proteger o chip.',
    badge: 'Proteção Ativa'
  },
  quotedReplies: {
    title: 'Citação de Mensagens',
    caption: 'Responde marcando a pergunta exata do cliente quando há vários assuntos.',
    badge: 'Contexto Claro'
  },
  reactions: {
    title: 'Reações com Emoji',
    caption: 'Reage automaticamente com 👍 ou ❤️ ao receber comprovantes e confirmações.',
    badge: 'Toque Humano'
  },
  locationPin: {
    title: 'Pin no Mapa & vCard',
    caption: 'Dispara a localização clicável no WhatsApp assim que perguntam onde fica.',
    badge: 'Localização'
  },
  sentimentAlert: {
    title: 'Alerta Vermelho de Sentimento',
    caption: 'Detecta frustração ou urgência, pausa o bot e avisa sua equipe na hora.',
    badge: 'Handoff Seguro'
  },
  ignoreGroups: {
    title: 'Ignorar Grupos',
    caption: 'Filtra mensagens de grupos (@g.us) para o bot atender apenas chats privados.',
    badge: 'Filtro Privado'
  },
  rejectCalls: {
    title: 'Rejeitar Chamadas',
    caption: 'Recusa ligações de voz/vídeo e mantém o atendimento organizado por texto.',
    badge: 'Anti-Interrupção'
  },
  typingIndicator: {
    title: 'Indicador "digitando..."',
    caption: 'Mostra o status digitando antes de enviar a resposta, como um humano real.',
    badge: 'Presença Natural'
  },
  readReceipts: {
    title: 'Confirmação de Leitura',
    caption: 'Aguarda um tempo natural de leitura antes de ativar os dois riscos azuis.',
    badge: 'Dois Riscos'
  },
  alwaysOnline: {
    title: 'Status Sempre Online',
    caption: 'Mantém o perfil comercial exibindo disponibilidade contínua no WhatsApp.',
    badge: 'Presença 24h'
  },
  autoReconnect: {
    title: 'Reconexão Automática',
    caption: 'Restaura a sessão em segundo plano se a internet oscilar ou reiniciar.',
    badge: 'Alta Disponibilidade'
  },
  syncContacts: {
    title: 'Sincronizar Contatos',
    caption: 'Puxa automaticamente nomes e avatares para o Filtro de Bloqueio de IA.',
    badge: 'CRM Integrado'
  }
};

function renderMotionStage(feature: FeatureDemoId) {
  switch (feature) {
    case 'audioUnderstanding':
      return (
        <div className="nx-motion-stage">
          <div className="flex items-center gap-2 self-start bg-white/10 border border-white/10 rounded-xl rounded-tl-sm px-2.5 py-2 max-w-[85%] nx-m-slide-in-1">
            <div className="w-6 h-6 rounded-full bg-[#D4FF00] text-black flex items-center justify-center shrink-0">
              <Mic className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-[3px] h-4">
              {[0.4, 0.95, 0.65, 1, 0.5, 0.85, 0.45, 0.9, 0.6, 0.75].map((h, i) => (
                <span
                  key={i}
                  className="w-[3px] rounded-full bg-[#D4FF00] nx-m-wave-bar"
                  style={{ height: `${Math.round(h * 16)}px`, animationDelay: `${i * 0.08}s` }}
                />
              ))}
            </div>
            <span className="text-[9px] text-white/60 font-mono ml-1">0:08</span>
          </div>
          <div className="self-end bg-[#D4FF00]/15 border border-[#D4FF00]/40 text-white rounded-xl rounded-tr-sm px-2.5 py-1.5 text-[10px] leading-snug max-w-[88%] nx-m-slide-in-2">
            Entendi seu áudio! Temos a <strong className="text-[#D4FF00]">Furadeira 18V</strong> por R$ 789,00.
          </div>
        </div>
      );

    case 'pdfReading':
      return (
        <div className="nx-motion-stage">
          <div className="relative overflow-hidden flex items-center gap-2 self-start bg-white/10 border border-white/15 rounded-xl px-2.5 py-2 w-[78%]">
            <FileText className="w-4 h-4 text-[#D4FF00] shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] font-semibold text-white truncate">comprovante_pix.pdf</div>
              <div className="text-[9px] text-white/50">PDF · 142 KB</div>
            </div>
            <span className="nx-m-scan-line" />
          </div>
          <div className="self-end flex items-center gap-2 bg-emerald-500/15 border border-emerald-400/40 rounded-xl px-2.5 py-1.5 text-[10px] text-emerald-200 nx-m-slide-in-2">
            <Sparkles className="w-3.5 h-3.5 text-[#D4FF00] shrink-0" />
            <span>PIX confirmado · <strong>R$ 349,90</strong> salvo</span>
          </div>
        </div>
      );

    case 'antiBan':
      return (
        <div className="nx-motion-stage">
          <div className="flex items-center justify-between w-full text-[9.5px] text-white/65 px-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Ritmo humano calibrado
            </span>
            <span className="font-mono text-[#D4FF00]">2.4s</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#D4FF00] to-emerald-400 nx-m-progress-loop" />
          </div>
          <div className="self-end inline-flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full px-3 py-1.5 text-[10px] text-white/85">
            <span>digitando</span>
            <span className="inline-flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-[#D4FF00] nx-m-dot-1" />
              <span className="w-1 h-1 rounded-full bg-[#D4FF00] nx-m-dot-2" />
              <span className="w-1 h-1 rounded-full bg-[#D4FF00] nx-m-dot-3" />
            </span>
          </div>
        </div>
      );

    case 'quotedReplies':
      return (
        <div className="nx-motion-stage">
          <div className="self-start bg-white/10 rounded-xl rounded-tl-sm px-2.5 py-1.5 text-[10px] text-white/80">
            Qual o valor da entrega hoje?
          </div>
          <div className="self-end bg-[#D4FF00]/12 border border-[#D4FF00]/35 rounded-xl rounded-tr-sm p-2 max-w-[90%] space-y-1 nx-m-slide-in-2">
            <div className="border-l-2 border-[#D4FF00] pl-2 text-[9px] text-white/60 truncate">
              Cliente: Qual o valor da entrega hoje?
            </div>
            <div className="text-[10px] text-white">
              Entregamos grátis na cidade acima de R$ 150!
            </div>
          </div>
        </div>
      );

    case 'reactions':
      return (
        <div className="nx-motion-stage justify-center">
          <div className="relative self-start bg-white/10 border border-white/15 rounded-xl rounded-tl-sm px-3 py-2 text-[10px] text-white">
            Acabei de enviar o comprovante!
            <span className="absolute -bottom-3 right-2 px-1.5 py-0.5 rounded-full bg-[#18181D] border border-[#D4FF00]/60 text-xs shadow-lg nx-m-pop-badge">
              👍
            </span>
          </div>
        </div>
      );

    case 'locationPin':
      return (
        <div className="nx-motion-stage">
          <div className="self-start bg-white/10 rounded-xl px-2.5 py-1 text-[10px] text-white/80">
            Onde vocês ficam?
          </div>
          <div className="self-end flex items-center gap-2.5 bg-white/10 border border-[#D4FF00]/40 rounded-xl p-2 w-[88%] nx-m-slide-in-2">
            <div className="relative w-8 h-8 rounded-lg bg-[#D4FF00]/15 flex items-center justify-center shrink-0">
              <span className="absolute inset-0 rounded-lg border border-[#D4FF00]/50 animate-ping opacity-40" />
              <MapPin className="w-4 h-4 text-[#D4FF00] nx-m-pin-drop" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-white truncate">Pin no Google Maps</div>
              <div className="text-[9px] text-[#D4FF00] truncate">Toque para traçar rota →</div>
            </div>
          </div>
        </div>
      );

    case 'sentimentAlert':
      return (
        <div className="nx-motion-stage">
          <div className="self-start bg-white/10 rounded-xl px-2.5 py-1.5 text-[10px] text-white/85">
            Meu pedido atrasou, preciso urgente!
          </div>
          <div className="w-full flex items-center gap-2 bg-rose-500/20 border border-rose-500/50 rounded-xl px-2.5 py-2 text-[10px] text-rose-200 nx-m-slide-in-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
            <span className="truncate">
              <strong>Alerta Urgente:</strong> IA pausada · Equipe avisada
            </span>
          </div>
        </div>
      );

    case 'ignoreGroups':
      return (
        <div className="nx-motion-stage">
          <div className="flex items-center justify-between w-full bg-white/10 border border-white/10 rounded-xl px-2.5 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <Users className="w-4 h-4 text-white/60 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-white truncate">Grupo Família & Equipe</div>
                <div className="text-[9px] text-white/50 truncate">12 novas mensagens...</div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#D4FF00]/15 border border-[#D4FF00]/40 text-[9px] font-bold text-[#D4FF00] inline-flex items-center gap-1 shrink-0">
              <ShieldCheck className="w-3 h-3" /> Ignorado
            </span>
          </div>
        </div>
      );

    case 'rejectCalls':
      return (
        <div className="nx-motion-stage">
          <div className="flex items-center justify-between w-full bg-rose-500/15 border border-rose-500/35 rounded-xl px-2.5 py-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center nx-m-shake">
                <PhoneOff className="w-3.5 h-3.5" />
              </div>
              <div className="text-[10px] text-white font-medium">Chamada recusada</div>
            </div>
            <span className="text-[9px] text-[#D4FF00] font-semibold">Auto → Texto</span>
          </div>
        </div>
      );

    case 'typingIndicator':
      return (
        <div className="nx-motion-stage justify-center">
          <div className="w-full flex items-center gap-2.5 bg-white/10 border border-white/15 rounded-xl px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-[#D4FF00] text-black font-bold text-[10px] flex items-center justify-center shrink-0">
              NEO
            </div>
            <div>
              <div className="text-[10px] font-bold text-white">Atendente Oficial</div>
              <div className="text-[9.5px] text-[#D4FF00] inline-flex items-center gap-1">
                <span>digitando</span>
                <span className="w-1 h-1 rounded-full bg-[#D4FF00] nx-m-dot-1" />
                <span className="w-1 h-1 rounded-full bg-[#D4FF00] nx-m-dot-2" />
                <span className="w-1 h-1 rounded-full bg-[#D4FF00] nx-m-dot-3" />
              </div>
            </div>
          </div>
        </div>
      );

    case 'readReceipts':
      return (
        <div className="nx-motion-stage justify-center">
          <div className="self-start bg-white/10 border border-white/15 rounded-xl px-3 py-2 flex items-center gap-2.5">
            <span className="text-[10px] text-white">Vocês abrem sábado?</span>
            <CheckCheck className="w-4 h-4 nx-m-blue-ticks" />
          </div>
        </div>
      );

    case 'alwaysOnline':
      return (
        <div className="nx-motion-stage justify-center">
          <div className="flex items-center gap-2.5 bg-white/10 border border-emerald-400/35 rounded-xl px-3 py-2">
            <div className="relative w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Radio className="w-4 h-4" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0B0B0E] animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-white">WhatsApp Comercial</div>
              <div className="text-[9.5px] text-emerald-400 font-semibold">online agora</div>
            </div>
          </div>
        </div>
      );

    case 'autoReconnect':
      return (
        <div className="nx-motion-stage justify-center">
          <div className="flex items-center gap-2.5 bg-white/10 border border-[#D4FF00]/35 rounded-xl px-3 py-2">
            <RefreshCw className="w-4 h-4 text-[#D4FF00] animate-spin" style={{ animationDuration: '2.6s' }} />
            <div className="text-[10px] text-white">
              Sessão monitorada · <strong className="text-emerald-400">Online 24h</strong>
            </div>
          </div>
        </div>
      );

    case 'syncContacts':
      return (
        <div className="nx-motion-stage">
          <div className="flex items-center justify-between w-full bg-white/10 rounded-xl px-2.5 py-1.5 text-[10px] text-white nx-m-slide-in-1">
            <span>Ana Paula · (51) 99812-...</span>
            <span className="text-[9px] text-emerald-400 font-semibold">IA Ativa</span>
          </div>
          <div className="flex items-center justify-between w-full bg-white/10 rounded-xl px-2.5 py-1.5 text-[10px] text-white nx-m-slide-in-2">
            <span>Fornecedor João</span>
            <span className="text-[9px] text-amber-300 font-semibold">Bloqueado</span>
          </div>
        </div>
      );
  }
}

interface FeatureMotionTooltipProps {
  feature: FeatureDemoId;
  delayMs?: number;
  children: React.ReactNode;
  className?: string;
}

export const FeatureMotionTooltip: React.FC<FeatureMotionTooltipProps> = ({
  feature,
  delayMs = 650,
  children,
  className = ''
}) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => clearTimer(), []);

  function computePosition() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const cardW = 296;
    const cardH = 192;
    const margin = 14;

    let left = rect.right + margin;
    let top = rect.top + rect.height / 2 - cardH / 2;

    // Se não couber à direita, coloca acima ou à esquerda
    if (left + cardW > window.innerWidth - 12) {
      left = Math.max(12, Math.min(rect.left + rect.width / 2 - cardW / 2, window.innerWidth - cardW - 12));
      top = rect.top - cardH - 10;
      if (top < 12) {
        top = Math.min(window.innerHeight - cardH - 12, rect.bottom + 10);
      }
    } else {
      top = Math.max(12, Math.min(top, window.innerHeight - cardH - 12));
    }

    setCoords({ top, left });
  }

  function handleMouseEnter() {
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      computePosition();
      setVisible(true);
    }, delayMs);
  }

  function handleMouseLeave() {
    clearTimer();
    setVisible(false);
  }

  const meta = DEMO_META[feature];

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseLeave}
      className={className}
    >
      {children}

      {visible &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              pointerEvents: 'none',
              backgroundColor: 'rgba(11, 11, 14, 0.96)',
              borderColor: 'rgba(255, 255, 255, 0.16)'
            }}
            data-testid={`motion-tutorial-${feature}`}
            className="z-[9998] w-[296px] rounded-2xl border text-white shadow-[0_24px_56px_-12px_rgba(0,0,0,0.65)] backdrop-blur-xl p-3.5 animate-fade-up"
          >
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-5 h-5 rounded-md bg-[#D4FF00]/15 border border-[#D4FF00]/40 flex items-center justify-center text-[#D4FF00] shrink-0">
                  <Play className="w-2.5 h-2.5 fill-current" />
                </span>
                <span className="text-[11.5px] font-bold text-white truncate">{meta.title}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9.5px] font-semibold bg-[#D4FF00]/15 text-[#D4FF00] border border-[#D4FF00]/30 shrink-0">
                {meta.badge}
              </span>
            </div>

            {/* Palco animado em loop (mini-vídeo motion) */}
            {renderMotionStage(feature)}

            <p className="text-[10.5px] text-white/70 leading-relaxed mt-2.5">
              {meta.caption}
            </p>
          </div>,
          document.body
        )}
    </div>
  );
};
