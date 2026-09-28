import type { AdminRole } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AdminRole;
      name?: string | null;
      email?: string | null;
    };
  }

  interface User {
    id: string;
    role: AdminRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    adminId: string;
    role: AdminRole;
  }
}
