require('dotenv').config();
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./neoxy.db';
}
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined
});

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  geminiApiKey: process.env.GEMINI_API_KEY,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  evolutionApi: {
    baseUrl: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
    apiKey: process.env.EVOLUTION_API_KEY || 'neoxy-secret-token'
  },
  webhookSecret: process.env.NEOXY_WEBHOOK_SECRET || 'neoxy-super-secret',
  logger
};
