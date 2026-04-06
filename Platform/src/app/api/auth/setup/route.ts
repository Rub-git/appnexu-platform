import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// GET: Check if users exist and show their info (no passwords)
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        password: false, // never expose
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Check which users have passwords set
    const usersWithPasswordStatus = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        password: true,
      },
    });

    const passwordStatus = usersWithPasswordStatus.map(u => ({
      email: u.email,
      hasPassword: !!u.password,
    }));

    return NextResponse.json({
      totalUsers: users.length,
      users,
      passwordStatus,
      message: users.length === 0
        ? 'No users found. Use POST to create a test user.'
        : `Found ${users.length} user(s).`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Database error', details: error.message },
      { status: 500 }
    );
  }
}

// POST: Create a test user or reset password for existing user
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      email = 'admin@appnexu.com',
      password = 'Admin123!',
      name = 'Admin User',
      role = 'ADMIN',
      action = 'create', // 'create' | 'reset-password'
    } = body;

    if (action === 'reset-password') {
      // Reset password for existing user
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (!existingUser) {
        return NextResponse.json(
          { error: `User with email ${email} not found` },
          { status: 404 }
        );
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      await prisma.user.update({
        where: { email },
        data: { password: hashedPassword },
      });

      return NextResponse.json({
        success: true,
        message: `Password reset for ${email}`,
        credentials: { email, password },
      });
    }

    // Create new user (or update if exists)
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        name,
      },
      create: {
        email,
        password: hashedPassword,
        name,
        role: role as any,
        plan: 'FREE',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'User created/updated successfully. You can now login!',
      user,
      credentials: {
        email,
        password,
        note: 'Use these credentials on the login page',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create user', details: error.message },
      { status: 500 }
    );
  }
}
