import { createHash } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { createDatabase, type Db } from './client.js';
import { loadDotEnv } from '../config/dotenv.js';
import { isMainModule } from '../lib/isMain.js';
import { admins, appSettings } from './schema.js';
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

/**
 * Applies ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD from .env.
 * The pair is remembered (as a fingerprint, never the password), so it is
 * applied again only when you CHANGE it in .env — a password changed later
 * inside the console is not undone on the next start. `force` always applies it.
 */
export async function syncBootstrapAdmin(db: Db, email: string, password: string, opts: { force?: boolean } = {}) {
  const fingerprint = createHash('sha256').update(`${email.toLowerCase()}\n${password}`).digest('hex');
  const [saved] = await db.select().from(appSettings).where(eq(appSettings.key, 'admin_bootstrap')).limit(1);
  if (!opts.force && (saved?.value as { fingerprint?: string } | undefined)?.fingerprint === fingerprint) {
    return { changed: false as const };
  }
  const result = await upsertAdmin(db, email, password, 'Super Admin');
  await db
    .insert(appSettings)
    .values({ key: 'admin_bootstrap', value: { fingerprint } })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: { fingerprint }, updatedAt: new Date() } });
  return { changed: true as const, created: result.created };
}

if (isMainModule(import.meta.url)) {
  loadDotEnv();
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!email || !password) {
    console.error('Set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD.');
    process.exit(1);
  }
  let database: ReturnType<typeof createDatabase>;
  try {
    database = createDatabase(process.env.DATABASE_URL, 1);
  } catch (err) {
    console.error(`\n${err instanceof Error ? err.message : err}\n`);
    process.exit(1);
  }
  database
    .migrate()
    .then(() => syncBootstrapAdmin(database.db, email, password, { force: true }))
    .then(async (r) => {
      console.log(r.created ? `Super admin ${email} created.` : `Password for ${email} has been reset. Start the app and sign in with it.`);
      await database.close();
    })
    .catch(async (err) => {
      console.error(err instanceof Error ? err.message : err);
      await database.close();
      process.exit(1);
    });
}
