import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve('.env.local') });
dotenv.config({ path: path.resolve('.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL no está configurada en .env.local/.env o variables de entorno');
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

function hasLegacyInternalPath(value: string | null | undefined): boolean {
  if (!value) return false;

  const normalized = value.trim().toLowerCase();
  return normalized.startsWith('/pwa/') || normalized.includes('/pwa/');
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const apps = await prisma.appProject.findMany({
    where: {
      pwaMode: 'GENERATOR',
      OR: [
        { importedStartUrl: { startsWith: '/pwa/' } },
        { importedScope: { startsWith: '/pwa/' } },
      ],
    },
    select: {
      id: true,
      appName: true,
      targetUrl: true,
      importedStartUrl: true,
      importedScope: true,
      status: true,
    },
  });

  if (apps.length === 0) {
    console.log('No se encontraron apps legacy con start_url/scope interno.');
    return;
  }

  console.log(`Apps legacy detectadas: ${apps.length}`);

  for (const app of apps) {
    const needsRepair = hasLegacyInternalPath(app.importedStartUrl) || hasLegacyInternalPath(app.importedScope);
    if (!needsRepair) {
      continue;
    }

    console.log(`- ${app.id} | ${app.appName} | status=${app.status}`);
    console.log(`  targetUrl: ${app.targetUrl}`);
    console.log(`  importedStartUrl: ${app.importedStartUrl || 'null'}`);
    console.log(`  importedScope: ${app.importedScope || 'null'}`);

    if (!dryRun) {
      await prisma.appProject.update({
        where: { id: app.id },
        data: {
          importedStartUrl: null,
          importedScope: null,
          lastGeneratedAt: new Date(),
        },
      });
    }
  }

  if (dryRun) {
    console.log('Dry run completado. No se aplicaron cambios.');
  } else {
    console.log('Reparacion completada.');
    console.log('Manifest/scope se regeneran en runtime usando targetUrl para cada app.');
  }
}

main()
  .catch((error) => {
    console.error('Error ejecutando reparacion legacy:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
