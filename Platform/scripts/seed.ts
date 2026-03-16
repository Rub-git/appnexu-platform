/**
 * Seed script for local development / demo.
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *
 * Only runs when NODE_ENV is NOT "production".
 * Creates a demo user and sample apps for testing all features.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config(); // also load .env

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Seed script cannot run in production.');
    process.exit(1);
  }

  console.log('🌱 Seeding database...\n');

  // 1. Create demo user
  const password = await bcrypt.hash('demo1234', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'demo@example.com',
      password,
      plan: 'PRO', // PRO so they can create multiple apps
    },
  });

  console.log(`✅ User: ${user.email} (plan: ${user.plan})`);

  // 2. Create demo apps

  // App 1: DRAFT
  const draftApp = await prisma.appProject.upsert({
    where: { slug: 'demo-draft-app' },
    update: {},
    create: {
      slug: 'demo-draft-app',
      targetUrl: 'https://example.com',
      appName: 'Draft Demo App',
      shortName: 'Draft',
      themeColor: '#4F46E5',
      backgroundColor: '#ffffff',
      iconUrls: '/icons/icon-192.png',
      status: 'DRAFT',
      userId: user.id,
    },
  });
  console.log(`✅ App (DRAFT): ${draftApp.appName} — slug: ${draftApp.slug}`);

  // App 2: PUBLISHED
  const publishedApp = await prisma.appProject.upsert({
    where: { slug: 'demo-published-app' },
    update: {},
    create: {
      slug: 'demo-published-app',
      targetUrl: 'https://github.com',
      appName: 'Published Demo App',
      shortName: 'Published',
      themeColor: '#10B981',
      backgroundColor: '#f0fdf4',
      iconUrls: '/icons/icon-192.png',
      status: 'PUBLISHED',
      lastGeneratedAt: new Date(),
      userId: user.id,
    },
  });
  console.log(`✅ App (PUBLISHED): ${publishedApp.appName} — slug: ${publishedApp.slug}`);
  console.log(`   🌐 Public URL: /app/${publishedApp.slug}`);

  // App 3: PUBLISHED with custom domain
  const domainApp = await prisma.appProject.upsert({
    where: { slug: 'demo-custom-domain' },
    update: {},
    create: {
      slug: 'demo-custom-domain',
      targetUrl: 'https://vercel.com',
      appName: 'Custom Domain App',
      shortName: 'Domain',
      themeColor: '#F59E0B',
      backgroundColor: '#fffbeb',
      iconUrls: '/icons/icon-192.png',
      status: 'PUBLISHED',
      customDomain: 'demo.localtest.me',
      userId: user.id,
    },
  });
  console.log(`✅ App (PUBLISHED + domain): ${domainApp.appName} — domain: ${domainApp.customDomain}`);

  // App 4: FAILED (to test retry UI)
  const failedApp = await prisma.appProject.upsert({
    where: { slug: 'demo-failed-app' },
    update: {},
    create: {
      slug: 'demo-failed-app',
      targetUrl: 'https://this-url-does-not-exist-1234.com',
      appName: 'Failed Demo App',
      shortName: 'Failed',
      themeColor: '#EF4444',
      backgroundColor: '#fef2f2',
      iconUrls: '/icons/icon-192.png',
      status: 'FAILED',
      failureReason: 'Website analysis failed: DNS resolution error',
      retryCount: 1,
      userId: user.id,
    },
  });
  console.log(`✅ App (FAILED): ${failedApp.appName} — reason: ${failedApp.failureReason}`);

  // 3. Create a second (FREE) user to test plan limits
  const freePassword = await bcrypt.hash('free1234', 12);
  const freeUser = await prisma.user.upsert({
    where: { email: 'free@example.com' },
    update: {},
    create: {
      name: 'Free User',
      email: 'free@example.com',
      password: freePassword,
      plan: 'FREE',
    },
  });
  console.log(`✅ User: ${freeUser.email} (plan: ${freeUser.plan})`);

  // Create one app for FREE user (at limit)
  const freeApp = await prisma.appProject.upsert({
    where: { slug: 'free-user-app' },
    update: {},
    create: {
      slug: 'free-user-app',
      targetUrl: 'https://example.org',
      appName: 'Free User App',
      shortName: 'FreeApp',
      themeColor: '#EF4444',
      backgroundColor: '#fef2f2',
      iconUrls: '/icons/icon-192.png',
      status: 'DRAFT',
      userId: freeUser.id,
    },
  });
  console.log(`✅ App (FREE user): ${freeApp.appName} — at plan limit`);

  console.log('\n🎉 Seeding complete!\n');
  console.log('Login credentials:');
  console.log('  PRO user:  demo@example.com / demo1234');
  console.log('  FREE user: free@example.com / free1234');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
