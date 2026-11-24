const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA_PATH = path.join(ROOT, 'prisma', 'schema.prisma');
const CLIENT_DIR = path.join(ROOT, 'node_modules', '.prisma', 'client');
const HASH_MARKER = path.join(ROOT, 'node_modules', '.prisma', '.neoxy-schema-hash');

function resolveDbPath() {
  const envUrl = process.env.DATABASE_URL || '';
  if (envUrl.startsWith('file:')) {
    const rel = envUrl.slice('file:'.length);
    return path.isAbsolute(rel) ? rel : path.resolve(ROOT, 'prisma', rel);
  }
  return path.join(ROOT, 'prisma', 'neoxy.db');
}

function computeSchemaHash() {
  const content = fs.readFileSync(SCHEMA_PATH, 'utf8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

function main() {
  if (!fs.existsSync(SCHEMA_PATH)) return;

  const currentHash = computeSchemaHash();
  const savedHash = fs.existsSync(HASH_MARKER)
    ? fs.readFileSync(HASH_MARKER, 'utf8').trim()
    : '';
  const dbExists = fs.existsSync(resolveDbPath());
  const clientExists = fs.existsSync(CLIENT_DIR);

  if (currentHash === savedHash && dbExists && clientExists) {
    return;
  }

  console.log('[Neoxy] Sincronizando Prisma Client e banco SQLite com prisma/schema.prisma...');
  execSync('npx prisma generate', { cwd: ROOT, stdio: 'inherit' });
  execSync('npx prisma db push --skip-generate', { cwd: ROOT, stdio: 'inherit' });

  try {
    fs.mkdirSync(path.dirname(HASH_MARKER), { recursive: true });
    fs.writeFileSync(HASH_MARKER, currentHash, 'utf8');
  } catch {
    // Ignora caso não consiga gravar marcador
  }

  console.log('[Neoxy] Banco de dados e Prisma Client sincronizados com sucesso!');
}

main();
