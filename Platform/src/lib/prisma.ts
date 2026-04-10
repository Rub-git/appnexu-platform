import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

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
