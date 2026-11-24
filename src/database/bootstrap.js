const { execSync } = require('child_process');
const path = require('path');
const prisma = require('./prisma');
const { logger } = require('../config');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

async function ensureDatabaseReady() {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      logger.info('Banco de dados vazio detectado. Executando seed inicial...');
      execSync('node prisma/seed.js', { cwd: PROJECT_ROOT, stdio: 'inherit' });
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'Banco local não inicializado. Executando prisma db push e seed...');
    execSync('npx prisma db push --skip-generate', { cwd: PROJECT_ROOT, stdio: 'inherit' });
    const countAfterPush = await prisma.user.count().catch(() => 0);
    if (countAfterPush === 0) {
      execSync('node prisma/seed.js', { cwd: PROJECT_ROOT, stdio: 'inherit' });
    }
    logger.info('Banco de dados SQLite atualizado e pronto!');
  }

  // Migração automática: garante que Ferragens Demo consulte o banco local (e não a planilha legada externa)
  try {
    const ferragens = await prisma.tenant.findUnique({ where: { slug: 'ferragens-demo' } });
    if (ferragens && typeof ferragens.settings === 'string' && ferragens.settings.includes('google_sheets_csv')) {
      const parsed = JSON.parse(ferragens.settings);
      if (parsed?.catalogSource?.type === 'google_sheets_csv') {
        parsed.catalogSource = { type: 'database' };
        await prisma.tenant.update({
          where: { slug: 'ferragens-demo' },
          data: { settings: JSON.stringify(parsed) }
        });
        logger.info('CatalogSource de ferragens-demo migrado automaticamente para banco de dados local.');
      }
    }
  } catch {
    // Silencioso se tenant não existir
  }
}

module.exports = { ensureDatabaseReady };
