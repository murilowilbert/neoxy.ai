const { execSync } = require('child_process');
const path = require('path');
const prisma = require('./prisma');
const { logger } = require('../config');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

async function ensureDatabaseReady() {
  try {
    const count = await prisma.user.count();
    if (count === 0) {
      logger.info('Banco de dados vazio detectado. Executando seed inicial...');
      execSync('node prisma/seed.js', { cwd: PROJECT_ROOT, stdio: 'inherit' });
    }
  } catch (err) {
    logger.warn('Tabelas ainda não criadas no banco local. Executando prisma db push + seed automaticamente...');
    execSync('npx prisma db push --skip-generate', { cwd: PROJECT_ROOT, stdio: 'inherit' });
    execSync('node prisma/seed.js', { cwd: PROJECT_ROOT, stdio: 'inherit' });
    logger.info('Banco de dados SQLite inicializado e populado com sucesso!');
  }
}

module.exports = { ensureDatabaseReady };
