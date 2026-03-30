const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const t = await prisma.appTemplate.findMany({ select: { id: true, name: true, category: true, isActive: true }});
  console.log(t.length, "rows returned");
  console.log(t);
}
main().catch(console.error).finally(()=>prisma.$disconnect());
