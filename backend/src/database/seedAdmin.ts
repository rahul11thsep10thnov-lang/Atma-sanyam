// Creates the first Super Admin from environment variables. Safe to re-run:
// it never overwrites an existing admin unless --reset-password is passed.
//
//   ADMIN_BOOTSTRAP_EMAIL=you@example.com \
//   ADMIN_BOOTSTRAP_PASSWORD='a-long-Strong-passw0rd' \
//   ADMIN_BOOTSTRAP_NAME='Your Name' npm run seed:admin
import { eq } from 'drizzle-orm';
import { createDatabase } from './client.js';
import { admins } from './schema.js';
import { hashPassword } from '../lib/password.js';
import { normalizeEmail } from '../lib/strings.js';
import { adminPassword } from '../routes/admin/auth.js';

async function main() {
  const url = process.env.DATABASE_URL;
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const name = process.env.ADMIN_BOOTSTRAP_NAME ?? 'Super Admin';
  const reset = process.argv.includes('--reset-password');

  if (!url || !email || !password) {
    throw new Error('Set DATABASE_URL, ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD');
  }
  const check = adminPassword.safeParse(password);
  if (!check.success) throw new Error(`ADMIN_BOOTSTRAP_PASSWORD: ${check.error.issues[0]?.message}`);

  const database = createDatabase(url, 1);
  try {
    const normalized = normalizeEmail(email);
    const [existing] = await database.db.select().from(admins).where(eq(admins.email, normalized));
    if (existing && !reset) {
      console.log(`Admin ${normalized} already exists (role: ${existing.roleKey}). Nothing changed.`);
      return;
    }
    const passwordHash = await hashPassword(password);
    if (existing) {
      await database.db
        .update(admins)
        .set({ passwordHash, status: 'active', lockedUntil: null, failedLoginCount: 0, updatedAt: new Date() })
        .where(eq(admins.id, existing.id));
      console.log(`Password reset for ${normalized}.`);
    } else {
      await database.db.insert(admins).values({ email: normalized, name, passwordHash, roleKey: 'super_admin' });
      console.log(`Super Admin ${normalized} created.`);
    }
  } finally {
    await database.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
