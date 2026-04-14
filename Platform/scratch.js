const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.mqchnqdracldchlwpnqd:Rubiselsup1@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true'
    }
  }
});
prisma.user.findFirst().then(console.log).catch(console.error).finally(() => prisma.$disconnect());
