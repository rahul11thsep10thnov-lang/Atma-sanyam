// One-time local setup: `npm run setup` (from the project root).
// Installs the API and admin console, creates local .env files with safe
// development defaults (MOCK_AI=true, embedded database), seeds the exam
// syllabus and the 360 sample questions, and creates your admin login.
// Safe to run again: existing .env files and data are kept.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const withSamples = !process.argv.includes('--no-samples');

function run(cmd, cwd) {
  console.log(`\n> ${cmd}   (in ${path.relative(root, cwd) || '.'})`);
  const r = spawnSync(cmd, { cwd, stdio: 'inherit', shell: true });
  if (r.status !== 0) {
    console.error(`\nSetup stopped: "${cmd}" failed. Fix the error above and run "npm run setup" again.`);
    process.exit(r.status ?? 1);
  }
}

function readEnv(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
  );
}

// 1. Dependencies
if (!existsSync(path.join(root, 'node_modules'))) run('npm install', root);
run('npm install', path.join(root, 'backend'));
run('npm install', path.join(root, 'admin'));

// 2. Environment files (never overwritten)
const apiEnv = path.join(root, 'backend', '.env');
if (!existsSync(apiEnv)) {
  writeFileSync(
    apiEnv,
    [
      '# Local development. Empty DATABASE_URL = embedded database in backend/.data',
      'DATABASE_URL=',
      'PORT=4000',
      'CORS_ORIGINS=http://localhost:3000',
      '# true = questions are generated locally, no AI key, no cost',
      'MOCK_AI=true',
      'ENROLL_DEV_ACTIVATE=true',
      'AI_API_KEY=',
      '',
    ].join('\n')
  );
  console.log('\nCreated backend/.env (MOCK_AI=true, embedded database).');
}
let env = readEnv(apiEnv);
let createdPassword = null;
if (!env.ADMIN_BOOTSTRAP_EMAIL || !env.ADMIN_BOOTSTRAP_PASSWORD) {
  createdPassword = `Admin-${randomBytes(6).toString('hex')}-1`;
  appendFileSync(apiEnv, `\n# First admin login for the console (change it after signing in)\nADMIN_BOOTSTRAP_EMAIL=admin@policeexams.local\nADMIN_BOOTSTRAP_PASSWORD=${createdPassword}\n`);
  env = readEnv(apiEnv);
}
const adminEnv = path.join(root, 'admin', '.env.local');
if (!existsSync(adminEnv)) writeFileSync(adminEnv, 'API_URL=http://localhost:4000\n');
const webEnv = path.join(root, '.env.local');
const web = readEnv(webEnv);
if (!('NEXT_PUBLIC_API_URL' in web)) appendFileSync(webEnv, '\nNEXT_PUBLIC_API_URL=http://localhost:4000\n');

// 3. Database: migrations, syllabus, admin, sample questions
run(`npm run seed${withSamples ? ' -- --with-sample-questions' : ''}`, path.join(root, 'backend'));

console.log(`
============================================================
 Setup complete.

 Start everything:   npm run dev:all

   Website        http://localhost:3000
   Admin console  http://localhost:3001
   API            http://localhost:4000/api/health

 Admin login:  ${env.ADMIN_BOOTSTRAP_EMAIL}
 Password:     ${createdPassword ?? '(the ADMIN_BOOTSTRAP_PASSWORD in backend/.env)'}
${createdPassword ? ' (also saved in backend/.env — change it in Settings after signing in)\n' : ''}============================================================
`);
