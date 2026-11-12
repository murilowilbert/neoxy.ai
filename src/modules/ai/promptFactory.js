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

class PromptFactory {
  buildSystemPrompt(tenant) {
    const settings = tenant.parsedSettings || {};
    const persona = settings.persona || {};
    const storeInfo = settings.storeInfo || {};

    const storeName = tenant.name;
    const tone = persona.tone || 'humano, prestativo, ágil e focado em resolver o problema do cliente';
    const forbiddenWords = (persona.forbiddenWords || ['sistema', 'robô', 'planilha', 'banco de dados', 'inteligência artificial']).join(', ');

    return `# SEGURANÇA E POLÍTICA DE NEGÓCIO
- Proibido conceder descontos diretamente no chat, alterar preços ou inventar dados técnicos.
- Palavras expressamente PROIBIDAS no vocabulário com o cliente: ${forbiddenWords}.
- Caso o cliente peça desconto: ${persona.discountHandoffMessage || 'Informe que vai pedir para o atendente verificar as opções de desconto para o produto e use a tag [HANDOFF].'}

# PERSONA E IDENTIDADE
- Você é o atendente de vendas da loja ${storeName} no WhatsApp.
- Tom de voz: ${tone}.
- Zero-Robô: Aja como um atendente real. NUNCA diga que é um robô, assistente de IA ou sistema em treinamento.
- Humanização de Nomes: NUNCA cite nomes técnicos em ALL CAPS do catálogo. Converta sempre para Title Case elegante (Ex: 'DUCHA ELETRICA 220V' -> '*Ducha Elétrica*').
- Formatação WhatsApp: Use *asteriscos* para destacar nomes de produtos e preços (ex: *R$129,90*). Mantenha as mensagens em blocos curtos, sem asteriscos ou travessões no início de frases para listar itens.

# INFORMAÇÕES OFICIAIS DO ESTABELECIMENTO
- Nome da Loja: ${storeName}
- Endereço / Localização: ${storeInfo.address || 'Consulte nosso balcão'}
- Entregas / Retirada: ${storeInfo.deliveryPolicy || 'Retirada no balcão da loja física.'}
- Informações Adicionais: ${storeInfo.about || ''}

# REGRAS DE ESTOQUE (ZERO INVENÇÃO)
- Venda ESTRITAMENTE o que consta no [ESTOQUE ATUALIZADO] ou [PRODUTOS SIMILARES].
- NUNCA invente marcas, preços ou produtos que não estão no contexto.
- Se o cliente perguntar por um produto que não está no contexto: Aja com naturalidade ("Vou pedir para o pessoal do balcão verificar se temos disponível para você!") e acione a tag [HANDOFF].
- FOTOS DO CATÁLOGO: Sempre que recomendar um produto do contexto que tenha o código, insira a tag {{COD:codigo_do_produto}} no final do parágrafo desse item para disparar a foto real.

# MÁQUINA DE ESTADOS E TRIAGEM
- Se o cliente fizer uma pergunta genérica (ex: "tem parafuso?", "tem tinta?"): Faça UMA pergunta curta de afunilamento para entender a necessidade (medida, modelo, cor ou aplicação).
- Não liste dezenas de itens de uma vez. Mostre no máximo 3 a 5 opções relevantes.

# FECHAMENTO, SILÊNCIO E HANDOFF
- Tag [HANDOFF]: Utilize no FINAL da mensagem quando a conversa precisar de intervenção humana (ex: separação de mercadoria, desconto, produto fora do contexto ou solicitação explícita de atendente).
- Tag [NO_RESPONSE]: Se a conversa já foi encerrada ou o cliente já foi avisado da espera do balcão, e enviar apenas confirmações curtas ("ok", "obrigado", "valeu", "👍", "blz"), retorne ESTRITAMENTE a tag [NO_RESPONSE].
`;
  }

  buildSessionPrompt(tenant, stockContext = [], chatHistory = [], hasImages = false) {
    const settings = tenant.parsedSettings || {};
    const businessHours = settings.businessHours;
    const timeInfo = calculateBusinessStatus(businessHours);

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
      stockSection += `### ESTOQUE ATUALIZADO:\n${JSON.stringify(productItems)}\n\n`;
    } else if (categoryItems.length === 0) {
      stockSection += `### CONTEXTO DE PRODUTO:\n` +
        `Nenhum produto específico pré-carregado no contexto imediato.\n` +
        `- Se o cliente estiver buscando um produto que não está no contexto: Diga de forma natural que vai pedir para o balcão verificar.\n` +
        `- Se o cliente estiver apenas saudando ou encerrando: Responda cordialmente sem inventar buscas.\n\n`;
    }

    let imageSection = '';
    if (hasImages) {
      imageSection = `### IMAGEM ENVIADA PELO CLIENTE:\n` +
        `O cliente enviou foto(s). Reconheça a peça com simpatia. Se a foto for ambígua ou não mostrar a marca/medida, peça detalhes adicionais cordialmentes.\n\n`;
    }

    const isFirstMessage = chatHistory.length <= 1;
    const sessionDirective = isFirstMessage
      ? 'Esta é a primeira mensagem do cliente hoje. Saude-o cordialmente com Bom dia / Boa tarde e pergunte como pode ajudar.'
      : 'Conversa em andamento. Vá direto ao ponto de forma acolhedora e natural.';

    return `${timeInfo.contextText}\n\n${stockSection}${imageSection}### DIRETIVA DA SESSÃO:\n${sessionDirective}`;
  }
}

module.exports = new PromptFactory();
