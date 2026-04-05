import "server-only";
import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';

const useSecureCookies = process.env.NODE_ENV === 'production';

export const { handlers, signIn, signOut, auth } = NextAuth({
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
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
     async authorize(credentials) {
  if (!credentials?.email || !credentials?.password) {
    throw new CredentialsSignin("Missing credentials")
  }

  const user = await prisma.user.findUnique({
    where: { email: credentials.email as string },
  })

  console.log("USER:", user)

  if (!user || !user.password) {
    console.log("User not found")
    return null
  }

  const isValid = await bcrypt.compare(
    credentials.password,
    user.password
  )

  console.log("PASSWORD VALID:", isValid)

  if (!isValid) {
    return null
  }

  // 
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  }
}

        // 1. Buscar usuario correctamente
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        // 3. Agregar log de debug: User
        console.log("User:", user?.email ? { ...user, password: '[REDACTED]' } : null);

        // 4. Manejar errores: Si no hay usuario -> return null (devuelve 401 en Auth.js)
        if (!user || !user.password) {
          console.log("Login NextAuth: User not found or OAuth user without password");
          throw new CredentialsSignin("Invalid credentials");
        }

        // 2. Validar password con bcrypt
        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        // 3. Agregar log de debug: Password valid
        console.log("Password valid:", passwordMatch);

        // 4. Manejar errores: Si password incorrecto -> return null / throw
        if (!passwordMatch) {
          console.log("Login NextAuth: Incorrect password");
          throw new CredentialsSignin("Invalid credentials");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role, // Include role in the authorized user object
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as User).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        (session.user as unknown as Record<string, unknown>).role = token.role as string;
      }
      return session;
    },
  },
  trustHost: true,
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
export async function canCreateApp(userId: string): Promise<{ allowed: boolean; limit: number; current: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: { apps: true },
      },
    },
  });

  if (!user) {
    return { allowed: false, limit: 0, current: 0 };
  }

  const limit = PLAN_LIMITS[user.plan];
  const current = user._count.apps;

  return {
    allowed: current < limit,
    limit: limit === Infinity ? -1 : limit,
    current,
  };
}
