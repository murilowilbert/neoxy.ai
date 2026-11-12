require('dotenv').config();
const readline = require('readline');
const tenantService = require('../src/modules/tenants/tenantService');
const messageQueueService = require('../src/modules/queue/messageQueueService');

const tenantSlug = process.argv[2] || 'ferragens-demo';
const customerPhone = process.argv[3] || '5551988880001';

async function startInteractiveChat() {
  const tenant = await tenantService.getTenantBySlug(tenantSlug);
  if (!tenant) {
    console.error(`❌ Tenant "${tenantSlug}" não encontrado.`);
    console.log(`Lojas disponíveis: ferragens-demo, petshop-demo`);
    process.exit(1);
  }

  console.log(`\n=============================================================`);
  console.log(`💬 CHAT INTERATIVO NEOXY.AI`);
  console.log(`🏢 Estabelecimento: ${tenant.name} (${tenant.slug})`);
  console.log(`📱 Telefone do Cliente Simulado: ${customerPhone}`);
  console.log(`💡 Dica: Digite sua mensagem como se fosse um cliente no WhatsApp.`);
  console.log(`💡 Para sair, digite 'sair' ou pressione Ctrl+C.`);
  console.log(`=============================================================\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const promptUser = () => {
    rl.question('👤 Você: ', async (input) => {
      const message = input.trim();
      if (!message) {
        promptUser();
        return;
      }

      if (message.toLowerCase() === 'sair' || message.toLowerCase() === 'exit') {
        console.log('\n👋 Encerrando chat interativo. Até logo!');
        rl.close();
        process.exit(0);
      }

      process.stdout.write('🤖 digitando...\r');

      try {
        const response = await messageQueueService.processQueueItemDirect({
          tenant,
          customerPhone,
          text: message
        });

        // Limpa a linha de "digitando..."
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);

        if (response.isNoResponse) {
          console.log(`🤖 [Bot]: (Silêncio Inteligente [NO_RESPONSE] acionado - não enviou mensagem)\n`);
        } else {
          // Exibe simulando bolhas separadas
          const bubbles = response.text.split('\n\n');
          for (const bubble of bubbles) {
            console.log(`🤖 ${tenant.name}: ${bubble.trim()}\n`);
          }
        }

        if (response.isHandoff) {
          console.log(`⚠️  [Atenção]: Tag [HANDOFF] detectada. A conversa foi pausada para um atendente humano.\n`);
        }

        if (response.photoCodes && response.photoCodes.length > 0) {
          console.log(`📸 [Fotos Acionadas]: Produtos com códigos para envio de foto: ${response.photoCodes.join(', ')}\n`);
        }
      } catch (err) {
        console.error(`❌ Erro ao processar mensagem:`, err.message);
      }

      promptUser();
    });
  };

  promptUser();
}

startInteractiveChat().catch(err => {
  console.error('Erro ao iniciar chat:', err);
  process.exit(1);
});
