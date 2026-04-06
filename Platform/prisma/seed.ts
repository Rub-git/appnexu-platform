import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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
