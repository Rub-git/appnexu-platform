import 'next-auth';
import { Plan, Role } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      plan?: Plan;
      role?: Role;
    };
  }

  interface User {
    id: string;
    plan?: Plan;
    role?: Role;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role?: Role;
  }
}
