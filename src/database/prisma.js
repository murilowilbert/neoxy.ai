const { PrismaClient } = require('@prisma/client');
const { logger } = require('../config');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

module.exports = prisma;
