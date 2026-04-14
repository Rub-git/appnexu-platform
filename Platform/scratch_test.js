const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const app = await prisma.appProject.findUnique({
    where: { slug: 'cmnxj7l4x0003kz04r5js866g' }
  });
  console.log('App by slug:', app ? app.status : 'NOT FOUND');
}
main().catch(console.error).finally(() => prisma.$disconnect());
