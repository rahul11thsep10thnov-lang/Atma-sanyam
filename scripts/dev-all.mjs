// `npm run dev:all`: runs the API, admin console and website together with
// labelled output. Ctrl+C stops all three.
import { spawn } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const apps = [
  { name: 'api    ', cwd: path.join(root, 'backend'), cmd: 'npm run dev', color: 36 },
  { name: 'admin  ', cwd: path.join(root, 'admin'), cmd: 'npm run dev', color: 35 },
  { name: 'website', cwd: root, cmd: 'npm run dev', color: 33 },
];

const children = apps.map((app) => {
  const child = spawn(app.cmd, { cwd: app.cwd, shell: true, env: { ...process.env, FORCE_COLOR: '1' } });
  const tag = `\x1b[${app.color}m[${app.name}]\x1b[0m `;
  const pipe = (stream, out) => {
    let buf = '';
    stream.on('data', (chunk) => {
      buf += chunk.toString();
      const lines = buf.split(/\r?\n/);
      buf = lines.pop() ?? '';
      for (const line of lines) out.write(tag + line + '\n');
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => console.log(`${tag}stopped${code ? ` (exit ${code})` : ''}`));
  return child;
});

console.log('\nStarting… website http://localhost:3000 · admin http://localhost:3001 · API http://localhost:4000\n');

function stop() {
  for (const c of children) {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(c.pid), '/T', '/F'], { shell: true });
    else c.kill('SIGINT');
  }
  setTimeout(() => process.exit(0), 1500);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
