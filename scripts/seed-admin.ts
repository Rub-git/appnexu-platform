/**
 * Admin Seed Script
 * 
 * Promotes an existing user to ADMIN role, or creates a new admin user.
 * 
 * Usage:
 *   npx tsx scripts/seed-admin.ts <email> [password]
 * 
 * Examples:
 *   npx tsx scripts/seed-admin.ts admin@example.com           # Promote existing user
 *   npx tsx scripts/seed-admin.ts admin@example.com mypass123  # Create new admin user
 * 
 * Security:
 *   - This script should only be run manually by platform operators
 *   - Never expose this as an API endpoint
 *   - Run locally or via secure CI/CD only
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email) {
    console.error('Usage: npx tsx scripts/seed-admin.ts <email> [password]');
    console.error('  If user exists: promotes to ADMIN');
    console.error('  If user does not exist and password provided: creates new ADMIN');
    process.exit(1);
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    if (existingUser.role === 'ADMIN') {
      console.log(`✓ User ${email} is already an ADMIN.`);
      return;
    }

    // Promote to admin
    await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' },
    });
    console.log(`✓ User ${email} has been promoted to ADMIN.`);
    return;
  }

  // User doesn't exist — create if password provided
  if (!password) {
    console.error(`✗ User ${email} not found. Provide a password to create a new admin.`);
    console.error('  npx tsx scripts/seed-admin.ts admin@example.com mypassword');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('✗ Password must be at least 8 characters.');
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      name: 'Admin',
      password: hashedPassword,
      role: 'ADMIN',
      plan: 'AGENCY', // Admins get full access
    },
  });

  console.log(`✓ Admin user ${email} created successfully.`);
}

main()
  .catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
