/**
 * Dynamic Prompt Factory para Neoxy.ai
 * Constrói o System Prompt e injeções contextuais dinamicamente para qualquer estabelecimento/tenant.
 */

function calculateBusinessStatus(businessHoursConfig) {
  if (!businessHoursConfig) {
    return { statusStr: 'ABERTA', contextText: '[SISTEMA: Horário comercial não configurado.]' };
  }

  const timezone = businessHoursConfig.timezone || 'America/Sao_Paulo';
  const now = new Date();

  // Formatadores
  const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    hour: '2-digit', minute: '2-digit', hour12: false
  });
  const dayFormatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    weekday: 'long'
  });
  const yearFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit'
  });

  const currentDateIso = yearFormatter.format(now);
  const currentTimeStr = timeFormatter.format(now);
  let currentDayStr = dayFormatter.format(now);
  currentDayStr = currentDayStr.charAt(0).toUpperCase() + currentDayStr.slice(1);

  const [nowH, nowM] = currentTimeStr.split(':').map(Number);
  const currentTotal = nowH * 60 + nowM;

  const localDateForDay = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const currentDayOfWeek = localDateForDay.getDay(); // 0 = Domingo

  // 1. Checa exceções / feriados cadastrados para a data
  const exceptions = businessHoursConfig.exceptions || [];
  const todayException = exceptions.find(ex => ex.date === currentDateIso);

  if (todayException) {
    if (todayException.type === 'horario_especial' && todayException.specialHours) {
      const [openH, openM] = todayException.specialHours.open.split(':').map(Number);
      const [closeH, closeM] = todayException.specialHours.close.split(':').map(Number);
      const openTotal = openH * 60 + openM;
      const closeTotal = closeH * 60 + closeM;

      if (currentTotal >= openTotal && currentTotal < closeTotal) {
        return {
          statusStr: 'ABERTA (Horário Especial)',
          contextText: `[SISTEMA: Hoje é ${currentDayStr}, ${currentTimeStr}. Hoje é ${todayException.reason}, com horário especial (${todayException.specialHours.open} às ${todayException.specialHours.close}). A loja está ABERTA.]`
        };
      } else {
        return {
          statusStr: 'FECHADA',
          contextText: `[SISTEMA: Hoje é ${currentDayStr}, ${currentTimeStr}. A loja está FECHADA. Motivo: ${todayException.reason}. Horário especial hoje era ${todayException.specialHours.open} às ${todayException.specialHours.close}.]`
        };
      }
    } else {
      return {
        statusStr: 'FECHADA (Feriado)',
        contextText: `[SISTEMA: Hoje é ${currentDayStr}, ${currentTimeStr}. A loja está FECHADA devido a: ${todayException.reason}. Retorno previsto: ${todayException.returnDate || 'próximo dia útil'}.]`
      };
    }
  }

  // 2. Horário de funcionamento padrão
  const schedule = businessHoursConfig.schedule || {};
  const todaySchedule = schedule[String(currentDayOfWeek)] || [];
  let isOpen = false;
  let nextOpenStr = '';

  for (const range of todaySchedule) {
    const [startH, startM] = range.start.split(':').map(Number);
    const [endH, endM] = range.end.split(':').map(Number);
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    if (currentTotal >= startTotal && currentTotal < endTotal) {
      isOpen = true;
      break;
    }
  }

  if (isOpen) {
    return {
      statusStr: 'ABERTA',
      contextText: `[SISTEMA: Hoje é ${currentDayStr}, ${currentTimeStr}. A loja está ABERTA. Atenda o cliente normalmente.]`
    };
  }

  // Se fechada, calcula quando abre
  let foundLaterToday = false;
  for (const range of todaySchedule) {
    const [startH, startM] = range.start.split(':').map(Number);
    const startTotal = startH * 60 + startM;
    if (currentTotal < startTotal) {
      nextOpenStr = `hoje às ${range.start}`;
      foundLaterToday = true;
      break;
    }
  }

  if (!foundLaterToday) {
    const dayNames = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    for (let offset = 1; offset <= 7; offset++) {
      const nextDay = (currentDayOfWeek + offset) % 7;
      const nextSchedule = schedule[String(nextDay)] || [];
      if (nextSchedule.length > 0) {
        const firstRange = nextSchedule[0];
        const dayLabel = offset === 1 ? 'amanhã' : dayNames[nextDay];
        nextOpenStr = `${dayLabel} às ${firstRange.start}`;
        break;
      }
    }
  }

  return {
    statusStr: 'FECHADA',
    contextText: `[SISTEMA: Hoje é ${currentDayStr}, ${currentTimeStr}. A loja está FECHADA no momento. Só abriremos ${nextOpenStr || 'no próximo dia útil'}. Responda à dúvida do cliente primeiro e informe o horário de abertura com simpatia.]`
  };
}

function formatWeeklySchedule(businessHoursConfig) {
  const schedule = businessHoursConfig?.schedule || {};
  const days = [
    { key: '1', label: 'Segunda' },
    { key: '2', label: 'Terça' },
    { key: '3', label: 'Quarta' },
    { key: '4', label: 'Quinta' },
    { key: '5', label: 'Sexta' },
    { key: '6', label: 'Sábado' },
    { key: '0', label: 'Domingo' }
  ];

  const lines = days.map((d) => {
    const slots = Array.isArray(schedule[d.key]) ? schedule[d.key] : [];
    if (slots.length === 0) return `${d.label}: Fechado`;
    return `${d.label}: ${slots.map((s) => `${s.start} às ${s.end}`).join(' e ')}`;
  });

  return lines.join(' | ');
}

function formatUpcomingExceptions(businessHoursConfig) {
  const exceptions = Array.isArray(businessHoursConfig?.exceptions)
    ? businessHoursConfig.exceptions
    : [];
  if (exceptions.length === 0) return '';

  const timezone = businessHoursConfig?.timezone || 'America/Sao_Paulo';
  const todayIso = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
  const upcoming = exceptions
    .filter((ex) => ex.date && ex.date >= todayIso)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(0, 8);

  if (upcoming.length === 0) return '';

  return upcoming
    .map((ex) => {
      const [y, m, d] = String(ex.date).split('-');
      const brDate = d && m && y ? `${d}/${m}/${y}` : ex.date;
      if (ex.type === 'horario_especial' && ex.specialHours?.open && ex.specialHours?.close) {
        return `- ${brDate} (${ex.reason || 'Data especial'}): Horário especial das ${ex.specialHours.open} às ${ex.specialHours.close}`;
      }
      return `- ${brDate} (${ex.reason || 'Feriado'}): FECHADO${ex.returnDate ? ` (Retorno: ${ex.returnDate})` : ''}`;
    })
    .join('\n');
}

class PromptFactory {
  buildSystemPrompt(tenant) {
    const settings = tenant.parsedSettings || {};
    const persona = settings.persona || {};
    const storeInfo = settings.storeInfo || {};
    const social = storeInfo.socialLinks || {};
    const businessHours = settings.businessHours || {};

    const storeName = tenant.name;
    const tone = persona.tone || 'humano, prestativo, ágil e focado em resolver o problema do cliente';
    const forbiddenWords = (persona.forbiddenWords || ['sistema', 'robô', 'planilha', 'banco de dados', 'inteligência artificial']).join(', ');

    const enabledModules = tenant.parsedModules || ['stock'];
    const botFeatures = settings.botFeatures || {};
    const locationEnabled = botFeatures.locationPinEnabled !== false;
    const reactionsEnabled = botFeatures.reactionsEnabled !== false;
    const pdfEnabled = botFeatures.pdfReadingEnabled !== false;
    const sentimentEnabled = botFeatures.sentimentAlertEnabled !== false;
    const reviewMode = botFeatures.reviewMode || (storeInfo.googleReviewUrl ? 'google_review' : 'poll_csat');

    let nicheSection = '';

    if (enabledModules.includes('services') || enabledModules.includes('appointments')) {
      nicheSection += `\n# AGENDAMENTOS E SERVIÇOS\n- Este estabelecimento realiza serviços e agendamentos de horários.\n- Quando o cliente desejar marcar um horário ou serviço, colete o nome, serviço desejado e preferência de dia/horário, e confirme com cordialidade.\n`;
    }

    if (enabledModules.includes('documents') || pdfEnabled) {
      nicheSection += `\n# LEITURA INTELIGENTE DE PDF, COMPROVANTES PIX E BOLETOS\n- Você lê PDFs, boletos, comprovantes PIX, notas fiscais e orçamentos enviados pelo cliente.\n- Quando o cliente enviar um documento ou comprovante, confirme o recebimento citando o valor, data/vencimento ou pagador identificados, e inclua no final a tag oculta: [DOC_EXTRACT:{"docType":"PIX","title":"Comprovante PIX","amount":0,"dueDate":"","summary":"Resumo breve"}]. Use docType entre PIX, BOLETO, NF, COMPROVANTE ou ORCAMENTO.${reactionsEnabled ? ' Adicione também [REACT:👍] para confirmar o recebimento.' : ''}\n`;
    }

    const socialEntries = [
      social.instagram ? `Instagram: ${social.instagram}` : null,
      social.facebook ? `Facebook: ${social.facebook}` : null,
      social.tiktok ? `TikTok: ${social.tiktok}` : null,
      social.youtube ? `YouTube: ${social.youtube}` : null,
      storeInfo.website ? `Site: ${storeInfo.website}` : null,
      storeInfo.mapsUrl ? `Google Maps: ${storeInfo.mapsUrl}` : null,
      storeInfo.googleReviewUrl ? `Avaliação Google Meu Negócio: ${storeInfo.googleReviewUrl}` : null
    ].filter(Boolean);

    const hasCoordinates =
      Number.isFinite(Number(storeInfo.latitude)) &&
      Number.isFinite(Number(storeInfo.longitude)) &&
      String(storeInfo.latitude || '').trim() !== '' &&
      String(storeInfo.longitude || '').trim() !== '';

    const scheduleLine = formatWeeklySchedule(businessHours);
    const exceptionsBlock = formatUpcomingExceptions(businessHours);

    const whatsappToolsSection = `# RECURSOS NATIVOS DE WHATSAPP (TAGS OCULTAS NO FINAL DA MENSAGEM)
${locationEnabled && (hasCoordinates || storeInfo.mapsUrl) ? `- Localização Nativa: Quando o cliente perguntar "onde fica", "endereço", "como chegar" ou "localização", informe o endereço e adicione [SEND_LOCATION] no final para enviar o pin clicável no mapa do WhatsApp.\n` : ''}${locationEnabled && storeInfo.phone ? `- Cartão de Contato: Se o cliente pedir o contato ou telefone para salvar, adicione [SEND_VCARD] no final.\n` : ''}${reactionsEnabled ? `- Reações: Quando fizer sentido (recebimento de comprovante, elogio ou confirmação), pode adicionar [REACT:👍] ou [REACT:❤️] no final.\n` : ''}- Enquetes Nativas: Para oferecer escolha rápida de até 4 opções (ex: triagem de categoria ou preferência de turno), você pode usar [POLL:Pergunta curta|Opção 1|Opção 2|Opção 3].
- Avaliação Pós-Atendimento: Quando o cliente encerrar satisfeito ou agradecer após uma compra/atendimento resolvido, você pode incluir [SEND_REVIEW] para disparar ${
      reviewMode === 'google_review'
        ? storeInfo.googleReviewUrl
          ? 'o link oficial de avaliação no Google Meu Negócio'
          : 'o convite de avaliação'
        : reviewMode === 'both'
        ? 'a avaliação no Google Meu Negócio + enquete rápida'
        : 'uma enquete rápida de satisfação no WhatsApp'
    }.
${sentimentEnabled ? `- Termômetro de Sentimento (OBRIGATÓRIO EM TODA RESPOSTA): Sempre termine com UMA tag invisível indicando o humor atual do cliente: [SENTIMENT:POSITIVE], [SENTIMENT:NEUTRAL], [SENTIMENT:FRUSTRATED] ou [SENTIMENT:URGENT]. Se o cliente estiver irritado, reclamando de atraso/defeito, pedindo cancelamento ou relatando urgência crítica, use [SENTIMENT:FRUSTRATED] ou [SENTIMENT:URGENT], responda com empatia imediata e adicione [HANDOFF] para alertar a equipe humana.\n` : ''}`;

    return `# SEGURANÇA E POLÍTICA DE NEGÓCIO
- Proibido conceder descontos extras fora das promoções oficiais cadastradas, alterar preços ou inventar dados técnicos.
- Palavras expressamente PROIBIDAS no vocabulário com o cliente: ${forbiddenWords}.
- Caso o cliente peça desconto fora de promoção: ${persona.discountHandoffMessage || 'Informe que vai pedir para o atendente verificar as opções de desconto e use a tag [HANDOFF].'}

# PERSONA E IDENTIDADE
- Você é o atendente oficial de ${storeName} no WhatsApp (${persona.attendantName || 'Atendimento'}).
- Tom de voz: ${tone}.
- Zero-Robô: Aja como um atendente humano real. NUNCA diga que é um robô, assistente de IA ou sistema em treinamento.
- Humanização de Nomes: NUNCA cite nomes técnicos em ALL CAPS do catálogo. Converta sempre para Title Case elegante (Ex: 'DUCHA ELETRICA 220V' -> '*Ducha Elétrica*').
- Formatação WhatsApp: Use *asteriscos* para destacar nomes de produtos/serviços e preços (ex: *R$129,90*). Mantenha as mensagens em blocos curtos, sem asteriscos ou travessões no início de frases para listar itens.

# INFORMAÇÕES OFICIAIS DO ESTABELECIMENTO
- Nome: ${storeName}
- Endereço / Localização: ${storeInfo.address || 'Consulte nosso atendimento'}${storeInfo.city ? ` (${storeInfo.city})` : ''}
${storeInfo.phone ? `- Telefone comercial: ${storeInfo.phone}\n` : ''}- Entregas / Atendimento: ${storeInfo.deliveryPolicy || settings.rules?.deliveryPolicy || 'Atendimento presencial e digital.'}
- Formas de Pagamento: ${settings.rules?.paymentMethods || 'PIX, Cartão e Boleto.'}
- Horário padrão da semana: ${scheduleLine}
${socialEntries.length > 0 ? `- Canais e Links Oficiais: ${socialEntries.join(' | ')}\n` : ''}${exceptionsBlock ? `\n# FERIADOS E DATAS ESPECIAIS PROGRAMADOS\n${exceptionsBlock}\n` : ''}- Informações Adicionais: ${storeInfo.about || ''}
${nicheSection}
# REGRAS DE CATÁLOGO, SERVIÇOS E PROMOÇÕES (ZERO INVENÇÃO — OBRIGATÓRIO)
- PROIBIÇÃO ABSOLUTA: Você SÓ pode mencionar, oferecer ou informar preço de produtos/serviços que apareçam EXPLICITAMENTE na seção "ITENS E SERVIÇOS CADASTRADOS" desta conversa.
- NUNCA cite nomes de produtos, marcas, modelos ou preços da sua memória ou conhecimento geral (mesmo que sejam comuns no segmento da loja).
- Se o cliente pedir uma categoria ampla (ex: "material hidráulico") e só houver 1 ou 2 itens relacionados na lista abaixo, ofereça SOMENTE aqueles itens exatos e pergunte se procura algo mais específico.
- Se um item possuir preço promocional ativo no contexto, destaque a oferta com clareza (ex: de R$ 159,90 por *R$ 135,90*).
- Se o cliente perguntar por um produto ou serviço que NÃO está listado no contexto abaixo: Diga de forma simpática que no momento não encontrou esse item no catálogo cadastrado e que vai verificar com a equipe, acione [HANDOFF] e adicione no final da mensagem a tag oculta [MISSED_DEMAND:Nome curto do item procurado].
- FOTOS DO CATÁLOGO: Sempre que recomendar um produto do contexto que tenha o código, insira a tag {{COD:codigo_do_produto}} no final do parágrafo desse item para disparar a foto real.

# MÁQUINA DE ESTADOS E TRIAGEM
- Se o cliente fizer uma pergunta genérica (ex: "tem parafuso?", "tem horário?"): Faça UMA pergunta curta de afunilamento para entender a necessidade, sem inventar itens fora da lista.
- Não liste dezenas de itens de uma vez. Mostre no máximo 3 a 5 opções relevantes QUE ESTEJAM NA LISTA.

${whatsappToolsSection}
# FECHAMENTO, SILÊNCIO E HANDOFF
- Tag [HANDOFF]: Utilize no FINAL da mensagem quando a conversa precisar de intervenção humana (ex: separação de mercadoria, confirmação de agendamento complexo, análise de documento, desconto, cliente irritado/urgente ou solicitação explícita de atendente).
- Tag [MISSED_DEMAND:Nome do item]: Utilize no FINAL da mensagem (invisível ao cliente) sempre que o cliente solicitar um produto ou serviço que NÃO temos cadastrado no contexto abaixo.
- Tag [NO_RESPONSE]: Se a conversa já foi encerrada ou o cliente já foi avisado da espera, e enviar apenas confirmações curtas ("ok", "obrigado", "valeu", "👍", "blz"), retorne ESTRITAMENTE a tag [NO_RESPONSE].
`;
  }

  buildSessionPrompt(tenant, stockContext = [], chatHistory = [], mediaFlags = false, activePromotions = []) {
    const settings = tenant.parsedSettings || {};
    const businessHours = settings.businessHours;
    const timeInfo = calculateBusinessStatus(businessHours);

    const hasImages = typeof mediaFlags === 'boolean' ? mediaFlags : Boolean(mediaFlags?.hasImages);
    const hasAudio = typeof mediaFlags === 'object' ? Boolean(mediaFlags?.hasAudio) : false;
    const hasDocuments = typeof mediaFlags === 'object' ? Boolean(mediaFlags?.hasDocuments) : false;

    // Formatação de estoque enxuto
    let stockSection = '';
    const categoryItems = stockContext.filter(item => item.perguntas_recomendadas && !item.código);
    const productItems = stockContext.filter(item => !item.perguntas_recomendadas || item.código);

    if (categoryItems.length > 0) {
      stockSection += `### CATEGORIA DE TRIAGEM (OBRIGATÓRIO PERGUNTAR):\n` +
        `O cliente pesquisou por uma categoria geral. Faça a pergunta recomendada de triagem antes de transferir ao balcão:\n` +
        JSON.stringify(categoryItems) + `\n\n`;
    }

    if (productItems.length > 0) {
      stockSection += `### ITENS E SERVIÇOS CADASTRADOS (OFEREÇA APENAS O QUE ESTÁ AQUI):\n${JSON.stringify(productItems)}\n\n`;
    } else if (categoryItems.length === 0) {
      stockSection += `### ITENS E SERVIÇOS CADASTRADOS:\n` +
        `NENHUM item ou serviço correspondente encontrado no cadastro para esta busca.\n` +
        `- PROIBIDO sugerir nomes de produtos, marcas ou preços inventados.\n` +
        `- Se o cliente pediu um produto/serviço específico: diga com naturalidade que não encontrou esse item cadastrado no momento, que vai verificar com a equipe e inclua [MISSED_DEMAND:nome do item] + [HANDOFF].\n` +
        `- Se o cliente estiver apenas saudando ou encerrando: responda cordialmente sem inventar produtos.\n\n`;
    }

    let promoSection = '';
    if (Array.isArray(activePromotions) && activePromotions.length > 0) {
      const promoLines = activePromotions.map((p) => {
        const desc =
          p.discountType === 'PERCENT'
            ? `${p.discountValue}% OFF`
            : `Preço promocional R$ ${Number(p.discountValue).toFixed(2).replace('.', ',')}`;
        const scopeLabel =
          p.scope === 'ALL'
            ? 'Todo o catálogo'
            : p.scope === 'CATEGORY'
            ? `Categoria ${p.targetCategory}`
            : 'Produtos/serviços selecionados';
        return `- ${p.name}: ${desc} (${scopeLabel})${p.description ? ` - ${p.description}` : ''}`;
      });
      promoSection = `### PROMOÇÕES ATIVAS HOJE:\n${promoLines.join('\n')}\n\n`;
    }

    let mediaSection = '';
    if (hasImages) {
      mediaSection += `### IMAGEM ENVIADA PELO CLIENTE:\n` +
        `O cliente enviou foto(s). Reconheça a peça, produto ou comprovante com simpatia. Se for comprovante PIX/boleto, extraia os dados em [DOC_EXTRACT:{...}]. Se a foto for ambígua, peça detalhes adicionais cordialmente.\n\n`;
    }
    if (hasAudio) {
      mediaSection += `### ÁUDIO / MENSAGEM DE VOZ ENVIADA PELO CLIENTE:\n` +
        `O cliente enviou um áudio. Ouça atentamente o conteúdo falado e responda de forma direta e natural sem mencionar "transcrição" ou "áudio processado por IA".\n\n`;
    }
    if (hasDocuments) {
      mediaSection += `### DOCUMENTO / PDF ENVIADO PELO CLIENTE:\n` +
        `O cliente anexou um documento (PDF, boleto, comprovante PIX ou orçamento). Leia os campos principais (valor, vencimento, favorecido/descrição), confirme ao cliente com clareza e emita obrigatoriamente [DOC_EXTRACT:{"docType":"...","title":"...","amount":0,"dueDate":"...","summary":"..."}] e [REACT:👍].\n\n`;
    }

    const isFirstMessage = chatHistory.length <= 1;
    const sessionDirective = isFirstMessage
      ? 'Esta é a primeira mensagem do cliente hoje. Saude-o cordialmente com Bom dia / Boa tarde e pergunte como pode ajudar.'
      : 'Conversa em andamento. Vá direto ao ponto de forma acolhedora e natural.';

    return `${timeInfo.contextText}\n\n${promoSection}${stockSection}${mediaSection}### DIRETIVA DA SESSÃO:\n${sessionDirective}`;
  }
}

module.exports = new PromptFactory();
