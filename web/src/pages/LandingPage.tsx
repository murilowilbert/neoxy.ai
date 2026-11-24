import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Calendar,
  Package,
  MessageSquare,
  Plus,
  Minus,
  Check,
  Zap,
  Eye,
  ShieldCheck
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import LanguageToggle from '../components/LanguageToggle';
import NeoxyLogo from '../components/NeoxyLogo';
import { useTheme } from '../components/ThemeProvider';
import { useLanguage } from '../components/LanguageProvider';
import { LANDING_COPY } from '../lib/landingCopy';
import AnimatedContent from '../components/reactbits/AnimatedContent';
import CardNav, { type CardNavItem } from '../components/reactbits/CardNav';
import DriftWall from '../components/reactbits/DriftWall';
import GradientBlinds from '../components/reactbits/GradientBlinds';
import RotatingText from '../components/reactbits/RotatingText';
import StarBorder from '../components/reactbits/StarBorder';

interface LandingPageProps {
  onGoToLogin: (prefillEmail?: string) => void;
  onGoToRegister: () => void;
}

const FEATURE_ICONS = {
  agenda: Calendar,
  catalogo: Package,
  atendimento: MessageSquare
} as const;

const HIGHLIGHT_ICONS = {
  zap: Zap,
  eye: Eye,
  shield: ShieldCheck
} as const;

export const LandingPage: React.FC<LandingPageProps> = ({
  onGoToLogin,
  onGoToRegister
}) => {
  const { theme } = useTheme();
  const { lang } = useLanguage();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const copy = LANDING_COPY[lang];

  const navItems = useMemo<CardNavItem[]>(
    () => [
      {
        label: copy.nav.cards.platformTitle,
        description: copy.nav.cards.platformDesc,
        links: [
          { label: copy.nav.cards.modules, href: '#recursos' },
          { label: copy.nav.cards.agendaOs, href: '#recursos' },
          { label: copy.nav.cards.catalogPdv, href: '#recursos' }
        ]
      },
      {
        label: copy.nav.cards.plansTitle,
        description: copy.nav.cards.plansDesc,
        links: [
          { label: copy.nav.cards.plansLink, href: '#planos' },
          { label: copy.nav.cards.faqLink, href: '#duvidas' }
        ]
      },
      {
        label: copy.nav.cards.accessTitle,
        description: copy.nav.cards.accessDesc,
        links: [
          { label: copy.nav.cards.enterPanel, onClick: () => onGoToLogin() },
          { label: copy.nav.cards.demoServices, onClick: () => onGoToLogin('contato@desentupidoraguri.com.br') },
          { label: copy.nav.cards.demoRetail, onClick: () => onGoToLogin('contato@ferragensmarlene.com.br') }
        ]
      }
    ],
    [copy, onGoToLogin]
  );

  return (
    <div className="min-h-screen bg-[var(--nx-bg)] text-[var(--nx-text)] flex flex-col justify-between transition-colors relative overflow-x-clip">
      {/* Navbar Flutuante Centralizada com Abertura em Cards (CardNav + Liquid Glass NEO) */}
      <div className="fixed top-4 left-4 right-4 z-50 pointer-events-none">
        <CardNav
          theme={theme}
          surface="glass"
          maxWidth={1120}
          cardHeight={156}
          speed={1.45}
          menuOpenText={copy.nav.menu}
          menuCloseText={copy.nav.close}
          logo={<NeoxyLogo variant="lockup" height={17} />}
          logoAlt="NEO"
          logoHref="#"
          items={navItems}
          cta={{
            label: copy.nav.signup,
            onClick: onGoToRegister
          }}
          rightSlot={
            <>
              <LanguageToggle />
              <ThemeToggle />
              <button
                type="button"
                onClick={() => onGoToLogin()}
                className="hidden sm:inline-flex items-center px-3.5 h-10 rounded-full text-[13.5px] font-medium text-[var(--nx-muted)] hover:text-[var(--nx-text)] hover:bg-[var(--nx-surface-alt)]/70 transition-colors"
              >
                {copy.nav.login}
              </button>
            </>
          }
        />
      </div>

      <main className="flex-1">
        {/* Hero Aberto e Arejado com Texto Neon Rotativo + DriftWall 3D Ampliado com Legenda em Profundidade */}
        <section className="relative pt-24 sm:pt-28 pb-16 sm:pb-24">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 right-[-10%] w-[560px] h-[560px] rounded-full blur-3xl opacity-70"
            style={{ background: 'var(--nx-volt-aura)' }}
          />

          <div className="relative max-w-[1260px] mx-auto w-full px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-6 items-center">
            <AnimatedContent
              trigger="mount"
              distance={26}
              duration={0.58}
              stagger={0.06}
              className="lg:col-span-5 space-y-6 pt-6 lg:pt-8 relative z-20"
            >
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full nx-volt-badge text-xs shadow-sm">
                <NeoxyLogo variant="cube" height={15} tone="black" />
                <span>{copy.hero.badge}</span>
              </div>

              <h1 className="text-4xl sm:text-[46px] font-bold tracking-tight text-[var(--nx-text)] leading-[1.1]">
                {copy.hero.headlinePrefix}
                <span className="block mt-1.5 min-h-[1.22em]">
                  <RotatingText
                    texts={copy.hero.rotatingWords}
                    rotationInterval={2500}
                    staggerDuration={0.024}
                    className="font-extrabold tracking-tight leading-[1.12]"
                    charClassName="nx-rotating-neon"
                  />
                </span>
              </h1>

              <p className="text-base text-[var(--nx-muted)] leading-relaxed max-w-md">
                {copy.hero.subtitle}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onGoToRegister}
                  className="nx-btn-primary px-7 py-3.5 text-base"
                >
                  {copy.hero.primaryCta}
                  <ArrowUpRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onGoToLogin()}
                  className="nx-btn-secondary px-7 py-3.5 text-base"
                >
                  {copy.hero.secondaryCta}
                </button>
              </div>
            </AnimatedContent>

            <AnimatedContent
              trigger="mount"
              distance={22}
              delay={0.08}
              duration={0.65}
              className="lg:col-span-7 relative lg:-mt-8 z-10"
            >
              {/* Bleed horizontal generoso (-mx-14 / px-14) para que o mask-image vertical nunca corte sombras nem cantos no hover 3D */}
              <div className="relative h-[400px] sm:h-[500px] lg:h-[600px] w-full lg:-mx-14 lg:w-[calc(100%+7rem)] overflow-clip lg:overflow-x-visible lg:overflow-y-clip">
                <DriftWall
                  items={copy.wallItems}
                  columns={3}
                  tileWidth={204}
                  tileHeight={144}
                  gap={16}
                  radius={16}
                  tilt={9}
                  turn={-6}
                  perspective={1250}
                  depth={46}
                  speed={28}
                  direction="up"
                  variance={0.42}
                  parallax={0.46}
                  lift={92}
                  hoverScale={1.22}
                  fade={0.58}
                  dim={theme === 'dark' ? 0.72 : 0.90}
                  overlayColor={theme === 'dark' ? '#050506' : '#FFFFFF'}
                  style={{ paddingInline: '72px' }}
                />
              </div>
            </AnimatedContent>
          </div>
        </section>

        {/* Seção de 3 Pilares com Cards Estruturados + Animação Fluida no Scroll */}
        <section id="recursos" className="border-t border-[var(--nx-border)] bg-[var(--nx-surface)]/60">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <AnimatedContent distance={26} duration={0.55} className="max-w-2xl mb-12 space-y-2">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--nx-volt-ink)]">
                <span className="w-2 h-2 rounded-full bg-[#D4FF00] ring-2 ring-[#BDFE01]/40" />
                {copy.featuresSection.eyebrow}
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--nx-text)]">
                {copy.featuresSection.heading}
              </h2>
            </AnimatedContent>

            <AnimatedContent
              distance={32}
              duration={0.58}
              stagger={0.07}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {copy.featuresSection.cards.map((card) => {
                const Icon = FEATURE_ICONS[card.id];
                return (
                  <article
                    key={card.id}
                    className="nx-card-interactive group p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative h-44 rounded-xl overflow-hidden bg-[var(--nx-surface-alt)] ring-1 ring-inset ring-black/10 dark:ring-white/10 mb-5">
                        <img
                          src={card.imageUrl}
                          alt={card.headline}
                          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                        />
                        <div className="absolute top-3 left-3 nx-icon-tile nx-icon-tile--sm nx-icon-tile--dark !backdrop-blur-md">
                          <Icon className="w-4 h-4 text-[#D4FF00]" />
                        </div>
                      </div>

                      <h3 className="nx-card-headline">{card.headline}</h3>
                      <p className="nx-card-subhead mt-1">{card.subhead}</p>
                      <p className="nx-card-body mt-3">{card.body}</p>
                    </div>

                    <div className="flex items-center gap-2.5 pt-6">
                      <button
                        type="button"
                        onClick={() =>
                          card.demoEmail
                            ? onGoToLogin(card.demoEmail)
                            : document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' })
                        }
                        className="nx-btn-secondary nx-card-btn-label px-4 py-2.5 flex-1"
                      >
                        {card.secondaryCta}
                      </button>
                      <button
                        type="button"
                        onClick={onGoToRegister}
                        className="nx-btn-primary nx-card-btn-label px-4 py-2.5 flex-1"
                      >
                        {card.primaryCta}
                      </button>
                    </div>
                  </article>
                );
              })}
            </AnimatedContent>

            {/* Faixa de Destaques — Cartões com Luz Superior, Borda Especular & Spotlight no Cursor */}
            <AnimatedContent
              distance={28}
              duration={0.55}
              stagger={0.06}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6"
            >
              {copy.featuresSection.highlights.map((item) => {
                const Icon = HIGHLIGHT_ICONS[item.iconKey];
                return (
                  <div key={item.title} className="nx-card-interactive p-6 flex flex-col gap-5">
                    <div className="nx-icon-tile">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-[20px] leading-snug font-bold tracking-tight text-[var(--nx-text)]">
                        {item.title}
                      </h3>
                      <p className="text-[14px] leading-relaxed text-[var(--nx-muted)]">
                        {item.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </AnimatedContent>
          </div>
        </section>

        {/* Seção de Planos — Preto Real (#050506) + GradientBlinds WebGL2 + StarBorder no Hover */}
        <section id="planos" className="bg-[#050506] text-white border-t border-[#1D1D21] relative overflow-hidden">
          <GradientBlinds
            gradientColors={['#0B0B0E', '#2B3606', '#8DB300', '#D4FF00']}
            lightColor="#F0FF8A"
            angle={18}
            noise={0.2}
            blindCount={18}
            blindMinWidth={56}
            spotlightRadius={0.62}
            spotlightSoftness={1.1}
            spotlightOpacity={0.96}
            shine={0.55}
            relief={0.55}
            glow={0.7}
            sway={0.32}
            speed={0.85}
            hoverTilt={0.65}
            clickEffect="ripple"
            idle="drift"
            mixBlendMode="screen"
            lightMode={false}
            style={{ opacity: 0.78 }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(5,5,6,0.74) 0%, rgba(5,5,6,0.38) 45%, rgba(5,5,6,0.84) 100%)'
            }}
          />

          <div className="relative z-10 max-w-6xl mx-auto px-6 py-24">
            <AnimatedContent
              distance={26}
              duration={0.55}
              className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-14"
            >
              <div className="max-w-xl space-y-2.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-[#D4FF00] backdrop-blur-md">
                  <NeoxyLogo variant="cube" height={14} tone="white" />
                  <span>{copy.plansSection.badge}</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                  {copy.plansSection.heading}
                </h2>
                <p className="text-base text-zinc-300/90">
                  {copy.plansSection.subtitle}
                </p>
              </div>
              <NeoxyLogo variant="wordmark" height={20} tone="white" className="opacity-35 hidden sm:inline-block" />
            </AnimatedContent>

            <AnimatedContent
              distance={32}
              duration={0.58}
              stagger={0.07}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch"
            >
              {copy.plansSection.plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`nx-spotlight-card nx-spotlight-card--dark p-7 flex flex-col justify-between !backdrop-blur-md ${
                    plan.featured
                      ? '!border-[#D4FF00]/60 shadow-[0_0_42px_rgba(212,255,0,0.14)]'
                      : ''
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="text-[24px] leading-tight font-bold text-white">
                          {plan.name}
                        </h3>
                        <p className="text-[16px] font-medium text-zinc-400 mt-0.5">
                          {plan.subhead}
                        </p>
                      </div>
                      {plan.badge && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold nx-volt-badge shrink-0">
                          {plan.badge}
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1.5 my-5">
                      <span className="text-sm text-zinc-400">{copy.plansSection.currency}</span>
                      <span
                        className={`text-4xl font-bold tracking-tight tabular-data ${
                          plan.featured ? 'text-[#D4FF00]' : 'text-white'
                        }`}
                      >
                        {plan.price}
                      </span>
                      <span className="text-sm text-zinc-400">{plan.period}</span>
                    </div>

                    <p className="text-[14px] text-zinc-400 leading-relaxed mb-6">
                      {plan.description}
                    </p>

                    <ul className="space-y-3 border-t border-white/10 pt-6 mb-8">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2.5 text-[14px] text-zinc-200">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                              plan.featured
                                ? 'bg-[#D4FF00]/15 text-[#D4FF00]'
                                : 'bg-white/10 text-zinc-300'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                          </span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <StarBorder
                    as="button"
                    type="button"
                    onClick={onGoToRegister}
                    hover="reveal"
                    theme="dark"
                    radius={999}
                    stars={2}
                    duration={plan.featured ? 3.1 : 3.6}
                    thickness={plan.featured ? 2 : 1.5}
                    glow={plan.featured ? 0.85 : 0.72}
                    sparkle={true}
                    clickPulse={true}
                    color={plan.featured ? '#FFFFFF' : '#D4FF00'}
                    trailColor={plan.featured ? '#D4FF00' : '#BDFE01'}
                    backgroundColor={
                      plan.featured
                        ? 'linear-gradient(135deg, #FFFD65 0%, #DBFF02 42%, #BDFE01 74%, #FFEA02 100%)'
                        : '#16161C'
                    }
                    textColor={plan.featured ? '#09090B' : '#FFFFFF'}
                    borderColor={plan.featured ? 'rgba(9, 9, 11, 0.16)' : 'rgba(255, 255, 255, 0.14)'}
                    className={`w-full py-3.5 px-5 text-[16px] font-semibold ${
                      plan.featured
                        ? 'shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_6px_22px_rgba(189,254,1,0.30)]'
                        : 'hover:bg-[#1E1E26]'
                    }`}
                  >
                    {plan.cta}
                  </StarBorder>
                </div>
              ))}
            </AnimatedContent>
          </div>
        </section>

        {/* Seção de Dúvidas Frequentes (FAQ Acordeão) */}
        <section id="duvidas" className="bg-[var(--nx-bg)] border-t border-[var(--nx-border)]">
          <div className="max-w-3xl mx-auto px-6 py-20">
            <AnimatedContent distance={26} duration={0.55}>
              <h2 className="text-3xl font-bold tracking-tight text-[var(--nx-text)] text-center mb-10">
                {copy.faqSection.heading}
              </h2>

              <div className="divide-y divide-[var(--nx-border)] border-t border-b border-[var(--nx-border)]">
                {copy.faqSection.items.map((item, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <div key={item.q}>
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                        className="w-full py-5 flex items-center justify-between gap-4 text-left group"
                        aria-expanded={isOpen}
                      >
                        <span className="text-base font-semibold text-[var(--nx-text)] group-hover:text-[var(--nx-volt-ink)] transition-colors">
                          {item.q}
                        </span>
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            isOpen
                              ? 'bg-[var(--nx-volt)] text-[#09090B]'
                              : 'bg-[var(--nx-surface-alt)] text-[var(--nx-muted)]'
                          }`}
                        >
                          {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="pb-5 pr-8 text-[14px] text-[var(--nx-muted)] leading-relaxed animate-fade-up">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </AnimatedContent>
          </div>
        </section>
      </main>

      {/* Rodapé Limpo */}
      <footer className="border-t border-[var(--nx-border)] bg-[var(--nx-surface)]">
        <div className="max-w-6xl mx-auto px-6 py-7 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--nx-subtle)]">
          <div className="flex items-center gap-3">
            <NeoxyLogo variant="lockup" height={14} />
          </div>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => onGoToLogin('contato@desentupidoraguri.com.br')}
              className="hover:text-[var(--nx-text)] transition-colors"
            >
              {copy.footer.demoServices}
            </button>
            <button
              type="button"
              onClick={() => onGoToLogin('contato@ferragensmarlene.com.br')}
              className="hover:text-[var(--nx-text)] transition-colors"
            >
              {copy.footer.demoRetail}
            </button>
            <button
              type="button"
              onClick={() => onGoToLogin('admin@neoxy.ai')}
              className="hover:text-[var(--nx-text)] transition-colors"
            >
              {copy.footer.admin}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
