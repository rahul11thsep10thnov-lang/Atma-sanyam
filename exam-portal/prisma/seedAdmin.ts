// Creates the first SUPER_ADMIN from environment variables. Safe to re-run:
// it never overwrites an existing admin unless --reset-password is passed.
//
//   ADMIN_BOOTSTRAP_EMAIL=you@example.com \
//   ADMIN_BOOTSTRAP_PASSWORD='a-long-Strong-passw0rd' \
//   ADMIN_BOOTSTRAP_NAME='Your Name' npm run seed:admin
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db/client";

async function main() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const name = process.env.ADMIN_BOOTSTRAP_NAME ?? "Super Admin";
  const reset = process.argv.includes("--reset-password");

  if (!email || !password) {
    throw new Error(
      "Set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD",
    );
  }
  if (password.length < 12) {
    throw new Error("ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.adminUser.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing && !reset) {
    console.log(
      `Admin ${normalizedEmail} already exists (role: ${existing.role}). Nothing changed.`,
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  if (existing) {
    await prisma.adminUser.update({
      where: { id: existing.id },
      data: { passwordHash, isActive: true },
    });
    console.log(`Password reset for ${normalizedEmail}.`);
  } else {
    await prisma.adminUser.create({
      data: {
        email: normalizedEmail,
        name,
        passwordHash,
        role: "SUPER_ADMIN",
      },
    });
    console.log(`SUPER_ADMIN ${normalizedEmail} created.`);
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
