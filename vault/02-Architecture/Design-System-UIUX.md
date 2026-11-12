# 🎨 Diretrizes de Design System & UI/UX — Neoxy.ai

Com a incorporação da inteligência da skill **UI/UX Pro Max**, todas as interfaces do Neoxy.ai (dashboard do lojista, painel de métricas, telas de configuração de tenant e web widgets) devem seguir um padrão profissional unificado.

---

## 1. Princípios Visuais para o Neoxy.ai

- **Estilo Primário**: *Modern Clean SaaS / Bento Grids* ou *Minimalismo Funcional*. Foco em alta legibilidade, densidade de informação confortável e contraste acessível.
- **Hierarquia de Cores**:
  - **Fundo / Superfície**: Tons neutros profundos (para modo escuro `#0D1117`, `#161B22`) ou superfícies limpas e suaves (modo claro `#F8FAFC`, `#FFFFFF`).
  - **Destaque / Ação (Brand)**: Azul tecnológico / Verde esmeralda para sinalizar conexões ativas do WhatsApp e status operacionais (`#10B981` para conectado, `#EF4444` para desconectado).
  - **Acessibilidade de Cores**: Relação de contraste mínima de **4.5:1** para texto normal e **3:1** para texto grande (conforme norma WCAG AA).

---

## 2. Regras Rígidas de Usabilidade (UI/UX Guidelines)

1. **Touch Targets Seguros**:
   - Todo botão, ícone interativo ou elemento de toque deve ter área mínima de **44×44px** com espaçamento mínimo de **8px** entre elementos adjacentes para evitar toques acidentais em mobile.
2. **Tipografia Escalar**:
   - Tamanho base de corpo de texto: **16px** (evitar textos menores que 12px mesmo em legendas de gráficos).
   - Altura de linha (*line-height*): **1.5** para blocos de texto e **1.2** para títulos.
3. **Transições e Animações Conscientes**:
   - Evitar pulos de layout (*Layout Shifts / CLS*).
   - Uso de `visibility: hidden / visible` ou `opacity` em vez de alternar abruptamente entre `display: none` e `display: flex`.
   - Duração padrão de microinterações: **150ms a 300ms** com curvas *ease-out*.
4. **Respeito a Safe Areas e Dispositivos Móveis**:
   - O painel do lojista precisa ser 100% responsivo para visualização no smartphone (onde o dono da loja frequentemente acompanha os atendimentos).
   - Uso de `viewport-fit=cover` e padding de segurança para barras inferiores (`env(safe-area-inset-bottom)`).
