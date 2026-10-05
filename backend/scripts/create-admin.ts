/* eslint-disable no-console */
// Creates (or resets the password of) an admin user.
// Usage: ADMIN_PASSWORD='…' npm run create-admin -- --email you@example.com [--role SUPER_ADMIN|EDITOR]
// The password is read from the environment so it never appears in shell history or process lists.
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email");
  const role = (arg("role") ?? "SUPER_ADMIN") as "SUPER_ADMIN" | "EDITOR";
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !/^[^@\s]+@[^@\s]+$/.test(email)) throw new Error("Pass --email you@example.com");
  if (!password || password.length < 10) throw new Error("Set ADMIN_PASSWORD (at least 10 characters) in the environment");
  if (!["SUPER_ADMIN", "EDITOR"].includes(role)) throw new Error("--role must be SUPER_ADMIN or EDITOR");
  const prisma = new PrismaClient();
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.adminUser.upsert({ where: { email }, update: { passwordHash, role }, create: { email, passwordHash, role } });
  console.log(`Admin ${user.email} (${user.role}) is ready.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
