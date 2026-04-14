const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const apps = await prisma.appProject.findMany({
    select: { id: true, slug: true, status: true, appName: true },
    orderBy: { createdAt: 'desc' },
    take: 3
  });
  console.log(apps);
}
main().catch(console.error).finally(() => prisma.$disconnect());
