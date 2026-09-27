import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { createDatabase, type Db } from './client.js';
import { admins } from './schema.js';
import { hashPassword } from '../lib/password.js';
import { ROLES } from '../lib/roles.js';

export const PASSWORD_RULE = 'at least 12 characters with a letter and a number';
export function isStrongPassword(p: string) {
  return p.length >= 12 && /[A-Za-z]/.test(p) && /\d/.test(p);
}

/** Creates (or resets the password of) an admin. Used for the very first
 * super admin; later admins are created from the console. */
export async function upsertAdmin(db: Db, email: string, password: string, name: string, role = 'super_admin') {
  if (!ROLES[role]) throw new Error(`Unknown role ${role}`);
  if (!isStrongPassword(password)) throw new Error(`Password must be ${PASSWORD_RULE}.`);
  const passwordHash = await hashPassword(password);
  const [existing] = await db
    .select({ id: admins.id })
    .from(admins)
    .where(sql`lower(${admins.email}) = ${email.toLowerCase()}`)
    .limit(1);
  if (existing) {
    await db.update(admins).set({ passwordHash, role, status: 'active', updatedAt: new Date() }).where(sql`${admins.id} = ${existing.id}`);
    return { id: existing.id, created: false };
  }
  const [row] = await db.insert(admins).values({ email: email.toLowerCase(), name, passwordHash, role }).returning({ id: admins.id });
  return { id: row!.id, created: true };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!email || !password) {
    console.error('Set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD.');
    process.exit(1);
  }
  const database = createDatabase(process.env.DATABASE_URL, 1);
  database
    .migrate()
    .then(() => upsertAdmin(database.db, email, password, process.env.ADMIN_BOOTSTRAP_NAME ?? 'Super Admin'))
    .then(async (r) => {
      console.log(r.created ? `Super admin ${email} created.` : `Admin ${email} already existed: password reset, role set to super_admin.`);
      await database.close();
    })
    .catch(async (err) => {
      console.error(err instanceof Error ? err.message : err);
      await database.close();
      process.exit(1);
    });
}
