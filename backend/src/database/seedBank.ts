// npm run seed:bank -- --file path/to/questions.csv [--dry-run] [--format csv|json]
//
// Imports a question file of any size into the bank through the same checks
// as the console's Import page (validator, duplicate check, all rows land in
// NEEDS_REVIEW). The file is processed in chunks of 2,000 rows, and re-running
// it is safe: rows whose external_id is already in the bank are skipped.
// Run it against the live database with DATABASE_URL set (backend/.env).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { eq, sql } from 'drizzle-orm';
import { createDatabase } from './client.js';
import { admins } from './schema.js';
import { loadDotEnv } from '../config/dotenv.js';
import { loadEnv } from '../config/env.js';
import { isMainModule } from '../lib/isMain.js';
import { importRows, MAX_IMPORT_ROWS, rowsFromCsv, rowsFromJson, type ImportReport } from '../services/importService.js';
import { seedTaxonomy } from './seedTaxonomy.js';

async function main() {
  loadDotEnv();
  const env = loadEnv();
  const args = process.argv.slice(2);
  const fileArg = args.includes('--file') ? args[args.indexOf('--file') + 1] : undefined;
  if (!fileArg) throw new Error('Usage: npm run seed:bank -- --file <questions.csv|json> [--dry-run]');
  const file = path.resolve(fileArg);
  const formatArg = args.includes('--format') ? args[args.indexOf('--format') + 1] : undefined;
  const format: 'csv' | 'json' = formatArg === 'json' || (!formatArg && file.toLowerCase().endsWith('.json')) ? 'json' : 'csv';
  const dryRun = args.includes('--dry-run');
  const content = readFileSync(file, 'utf8');
  const rows = format === 'csv' ? rowsFromCsv(content) : rowsFromJson(content);
  console.log(`${path.basename(file)}: ${rows.length} rows${dryRun ? ' (dry run — nothing is saved)' : ''}`);

  const database = createDatabase(env.DATABASE_URL, 1);
  try {
    await database.migrate();
    await seedTaxonomy(database.db); // adds any chapters the file needs; never changes existing ones
    const db = database.db;
    const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.toLowerCase();
    const [admin] = await db
      .select({ id: admins.id })
      .from(admins)
      .where(email ? sql`lower(${admins.email}) = ${email}` : eq(admins.role, 'super_admin'))
      .limit(1);
    if (!admin) throw new Error('No admin account found. Run npm run seed first.');

    const total: Omit<ImportReport, 'rows' | 'dryRun'> = { total: 0, imported: 0, needsReview: 0, skipped: 0, failed: 0 };
    const problems: string[] = [];
    for (let at = 0; at < rows.length; at += MAX_IMPORT_ROWS) {
      const report = await importRows(db, format, rows.slice(at, at + MAX_IMPORT_ROWS), admin.id, { dryRun, rowOffset: at });
      for (const k of Object.keys(total) as (keyof typeof total)[]) total[k] += report[k];
      for (const r of report.rows) if (!r.ok && r.issues[0]?.code !== 'ALREADY_IMPORTED') problems.push(`  row ${r.row}: ${r.issues.map((i) => i.message).join(' · ')}`);
      console.log(`  rows ${at + 1}–${at + report.total}: ${report.imported} ${dryRun ? 'valid' : 'imported'}, ${report.skipped} already there, ${report.failed} rejected`);
    }
    if (problems.length) console.log(`\nRejected rows:\n${problems.slice(0, 50).join('\n')}${problems.length > 50 ? `\n  … and ${problems.length - 50} more` : ''}`);
    console.log(
      `\n${dryRun ? 'Would import' : 'Imported'} ${total.imported} of ${total.total} questions` +
        ` (${total.needsReview} with warnings for the reviewer); ${total.skipped} were already in the bank, ${total.failed} rejected.`
    );
    if (!dryRun && total.imported) console.log('They are in NEEDS_REVIEW. Open the console → Question Bank → filter Status: NEEDS_REVIEW.');
  } finally {
    await database.close();
  }
}

if (isMainModule(import.meta.url)) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
