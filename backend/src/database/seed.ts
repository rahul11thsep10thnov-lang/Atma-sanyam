// npm run seed [-- --with-sample-questions]
// Applies migrations, seeds the exam taxonomy from seed/taxonomy.json and,
// optionally, imports the website's 360 sample questions (through the
// normal validator; they land in NEEDS_REVIEW for a human to approve).
// ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD also create the first admin.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { createDatabase } from './client.js';
import { admins } from './schema.js';
import { loadDotEnv } from '../config/dotenv.js';
import { SEED_DIR, seedTaxonomy } from './seedTaxonomy.js';
import { syncBootstrapAdmin } from './seedAdmin.js';
import { importQuestions } from '../services/importService.js';

async function main() {
  loadDotEnv();
  const database = createDatabase(process.env.DATABASE_URL, 1);
  try {
    await database.migrate();
    const { created } = await seedTaxonomy(database.db);
    console.log(`Taxonomy ready (${created} new rows).`);

    let adminId: string | null = null;
    if (process.env.ADMIN_BOOTSTRAP_EMAIL && process.env.ADMIN_BOOTSTRAP_PASSWORD) {
      await syncBootstrapAdmin(database.db, process.env.ADMIN_BOOTSTRAP_EMAIL, process.env.ADMIN_BOOTSTRAP_PASSWORD, { force: true });
      const [admin] = await database.db
        .select({ id: admins.id })
        .from(admins)
        .where(sql`lower(${admins.email}) = ${process.env.ADMIN_BOOTSTRAP_EMAIL.toLowerCase()}`)
        .limit(1);
      adminId = admin!.id;
      console.log(`Super admin ${process.env.ADMIN_BOOTSTRAP_EMAIL} is ready.`);
    }

    if (process.argv.includes('--with-sample-questions')) {
      if (!adminId) throw new Error('Importing samples needs ADMIN_BOOTSTRAP_EMAIL/PASSWORD (imports are attributed to an admin).');
      const content = readFileSync(path.join(SEED_DIR, 'sample-questions.json'), 'utf8');
      const report = await importQuestions(database.db, 'json', content, adminId, { dryRun: false });
      console.log(`Sample questions: ${report.imported} imported (NEEDS_REVIEW), ${report.failed} rejected by validation.`);
    }
  } finally {
    await database.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
