const { execSync } = require('child_process');
const path = require('path');
const prisma = require('./prisma');
const { logger } = require('../config');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

async function ensureDatabaseReady() {
  try {
    const [userCount] = await Promise.all([
      prisma.user.count(),
      prisma.whatsAppContact.count(),
      prisma.promotion.count(),
      prisma.quickReply.count(),
      prisma.demandTracker.count()
    ]);
    if (userCount === 0) {
      logger.info('Banco de dados vazio detectado. Executando seed inicial...');
      execSync('node prisma/seed.js', { cwd: PROJECT_ROOT, stdio: 'inherit' });
    }
  } catch (err) {
    logger.warn('Schema local desatualizado ou tabelas ausentes. Executando prisma db push automaticamente...');
    execSync('npx prisma db push --skip-generate', { cwd: PROJECT_ROOT, stdio: 'inherit' });
    const countAfterPush = await prisma.user.count().catch(() => 0);
    if (countAfterPush === 0) {
      execSync('node prisma/seed.js', { cwd: PROJECT_ROOT, stdio: 'inherit' });
    }
    logger.info('Banco de dados SQLite atualizado e pronto!');
  }
}

module.exports = { ensureDatabaseReady };
