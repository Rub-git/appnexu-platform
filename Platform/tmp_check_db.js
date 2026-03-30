const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const t = await prisma.$queryRaw`select id, name, category, "isActive" from "AppTemplate"`;
  console.log(t.length, "rows returned");
  console.log(t);
}
main().catch(console.error).finally(()=>prisma.$disconnect());
