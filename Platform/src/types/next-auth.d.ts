import 'next-auth';
import { Plan } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      plan?: Plan;
    };
  }

  interface User {
    id: string;
    plan?: Plan;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
  }
}
