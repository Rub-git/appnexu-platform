import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;

function createUnavailablePrismaClient(): PrismaClient {
  const errorMessage = 'DATABASE_URL is required for database operations';

  return new Proxy(
    {},
    {
      get() {
        throw new Error(errorMessage);
      },
    },
  ) as PrismaClient;
}

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  (connectionString
    ? new PrismaClient({
        adapter: new PrismaPg({ connectionString }),
      })
    : createUnavailablePrismaClient());

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Retry wrapper for transient database errors (connection drops, pool exhaustion).
 * Use for critical operations like app creation.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  { retries = 2, delayMs = 500 }: { retries?: number; delayMs?: number } = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message : '';
      const isTransient =
        msg.includes("Can't reach database") ||
        msg.includes('connect') ||
        msg.includes('connection') ||
        msg.includes('timeout') ||
        msg.includes('ECONNRESET') ||
        msg.includes('ECONNREFUSED') ||
        msg.includes('prepared statement');
      if (!isTransient || attempt === retries) throw error;
      // Exponential backoff
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
  throw lastError;
}
