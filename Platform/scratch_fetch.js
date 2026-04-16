const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function main() {
  const apps = await db.appProject.findMany();
  console.log("Apps:");
  console.log(JSON.stringify(apps, null, 2));
}

main().catch(console.error).finally(() => db.$disconnect());
