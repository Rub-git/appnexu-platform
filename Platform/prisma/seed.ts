import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run seed.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@appnexu.com' },
    update: { password: adminPassword },
    create: {
      email: 'admin@appnexu.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'ADMIN',
      plan: 'AGENCY',
    },
  });
  console.log(`✅ Admin user: ${admin.email} (password: Admin123!)`);

  // Create test user
  const userPassword = await bcrypt.hash('User123!', 12);
  const user = await prisma.user.upsert({
    where: { email: 'user@appnexu.com' },
    update: { password: userPassword },
    create: {
      email: 'user@appnexu.com',
      name: 'Test User',
      password: userPassword,
      role: 'USER',
      plan: 'FREE',
    },
  });
  console.log(`✅ Test user: ${user.email} (password: User123!)`);

  // Seed billing plan catalog (safe to re-run)
  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "BillingPlan" ("id", "key", "display_name", "stripe_price_id", "cycle", "app_limit", "is_active", "sort_order")
      VALUES
        ('plan_starter', 'starter', 'Starter', NULL, 'MONTHLY', 1, true, 1),
        ('plan_pro', 'pro', 'Pro', NULL, 'MONTHLY', 10, true, 2),
        ('plan_business', 'business', 'Business', NULL, 'MONTHLY', NULL, true, 3)
      ON CONFLICT ("key") DO UPDATE
      SET
        "display_name" = EXCLUDED."display_name",
        "cycle" = EXCLUDED."cycle",
        "app_limit" = EXCLUDED."app_limit",
        "is_active" = EXCLUDED."is_active",
        "sort_order" = EXCLUDED."sort_order";
    `);

    await prisma.$executeRawUnsafe(`
      INSERT INTO "BillingPlanLimit" ("id", "plan_id", "metric_key", "soft_limit", "hard_limit")
      VALUES
        ('limit_starter_apps', 'plan_starter', 'apps', 1, 1),
        ('limit_pro_apps', 'plan_pro', 'apps', 8, 10),
        ('limit_business_apps', 'plan_business', 'apps', NULL, NULL)
      ON CONFLICT ("plan_id", "metric_key") DO UPDATE
      SET
        "soft_limit" = EXCLUDED."soft_limit",
        "hard_limit" = EXCLUDED."hard_limit";
    `);

    console.log('✅ Billing plans seeded (Starter, Pro, Business)');
  } catch (billingSeedError) {
    console.warn('⚠️ Billing seed skipped (migration not applied yet):', billingSeedError);
  }

  console.log('\n🎉 Seeding complete!');
  console.log('\nYou can now login with:');
  console.log('  Admin: admin@appnexu.com / Admin123!');
  console.log('  User:  user@appnexu.com / User123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
