import { PrismaClient, TemplateCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Reset existing templates to avoid duplicates (safeguard)
  await prisma.appTemplate.deleteMany();

  await prisma.appTemplate.createMany({
    data: [
      {
        name: "Iglesia Básica",
        slug: "iglesia-basica",
        category: TemplateCategory.CHURCH,
        description: "Plantilla para iglesias",
        configJson: {
          theme: { color: "#4f46e5" },
          pages: ["home", "about", "contact"]
        },
        isPremium: false
      },
      {
        name: "Negocio Local",
        slug: "negocio-local",
        category: TemplateCategory.BUSINESS,
        description: "Para negocios pequeños",
        configJson: {
          theme: { color: "#16a34a" },
          pages: ["home", "services", "contact"]
        },
        isPremium: false
      }
    ]
  });

  console.log('✅ Seed finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
