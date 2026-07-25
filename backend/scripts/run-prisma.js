const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length > 0) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  }
}

const args = process.argv.slice(2);
const result = require('child_process').spawnSync('npx prisma ' + args.join(' '), [], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});
if (result.error) throw result.error;
process.exit(result.status ?? 0);
