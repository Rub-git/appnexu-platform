import "server-only";
import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import type { User, Role } from '@prisma/client';

const useSecureCookies = process.env.NODE_ENV === 'production';

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Auth.js v5 requires AUTH_SECRET (auto-read from env, but explicit for safety)
  secret: process.env.AUTH_SECRET,
  // CRITICAL for Vercel/production: trust the host header
  // Needed because Next.js 16 can return null for x-forwarded-proto
  trustHost: true,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    signOut: '/',
    error: '/login',
  },
  cookies: {
    sessionToken: {
      name: useSecureCookies ? '__Secure-authjs.session-token' : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          console.log("[AUTH] authorize called, AUTH_SECRET exists:", !!process.env.AUTH_SECRET);
          console.log("[AUTH] DATABASE_URL exists:", !!process.env.DATABASE_URL);

          if (!credentials?.email || !credentials?.password) {
            throw new CredentialsSignin("Missing credentials");
          }

          // 1. Buscar usuario en la base de datos
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          console.log("[AUTH] User found:", user?.email ? "yes" : "no");

          if (!user || !user.password) {
            console.log("[AUTH] User not found or OAuth user without password");
            throw new CredentialsSignin("Invalid credentials");
          }

          // 2. Validar password con bcrypt
          const passwordMatch = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          console.log("[AUTH] Password valid:", passwordMatch);

          if (!passwordMatch) {
            console.log("[AUTH] Incorrect password");
            throw new CredentialsSignin("Invalid credentials");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
          };
        } catch (error) {
          // Re-throw CredentialsSignin errors (these are expected auth failures)
          if (error instanceof CredentialsSignin) {
            throw error;
          }
          // Log unexpected errors (DB connection, etc.) that would otherwise
          // be swallowed and returned as generic "Configuration" error
          console.error("[AUTH] Unexpected error in authorize:", error);
          throw new CredentialsSignin("Server error during authentication");
        }
      },
    }),
  ],

});

// Helper function to get the current user with plan info
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      role: true,
      createdAt: true,
      _count: {
        select: { apps: true },
      },
    },
  });

  return user;
}

/**
 * Server-side admin guard.
 * Verifies the current session user has ADMIN role.
 * Returns the user if admin, null otherwise.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user || user.role !== 'ADMIN') return null;
  return user;
}

// Plan limits
export const PLAN_LIMITS = {
  FREE: 1,
  PRO: 10,
  AGENCY: Infinity,
} as const;

// Check if user can create more apps
export async function canCreateApp(userId: string): Promise<{ allowed: boolean; limit: number; current: number; plan: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: { apps: true },
      },
    },
  });

  if (!user) {
    return { allowed: false, limit: 0, current: 0, plan: 'FREE' };
  }

  const limit = PLAN_LIMITS[user.plan] ?? PLAN_LIMITS.FREE;
  const current = user._count.apps;

  return {
    allowed: current < limit,
    limit: limit === Infinity ? -1 : limit,
    current,
    plan: user.plan,
  };
}
