const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const templates = await prisma.$queryRaw`select id, name, category, "is_active" as "isActive" from "AppTemplate"`;
  console.log("Returned rows:", templates.length);
  console.table(templates);
}
main().catch(console.error).finally(() => prisma.$disconnect());
