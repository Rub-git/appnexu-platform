import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return;

  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function buildDirectSupabaseUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  const host = url.hostname.toLowerCase();
  const user = decodeURIComponent(url.username);

  const isPoolerHost = host.endsWith('.pooler.supabase.com');
  const isDirectHost = /^db\.[a-z0-9]+\.supabase\.co$/i.test(host);

  if (isDirectHost && /^postgres$/i.test(user)) {
    url.port = '5432';
    url.search = '';
    return url.toString();
  }

  if (!isPoolerHost) {
    throw new Error('DATABASE_URL must point to Supabase pooler or direct db host.');
  }

  const projectRefMatch = /^postgres\.([a-z0-9]+)$/i.exec(user);
  if (!projectRefMatch) {
    throw new Error('Pooler DATABASE_URL user must be postgres.<project-ref> for automatic direct conversion.');
  }

  url.hostname = `db.${projectRefMatch[1]}.supabase.co`;
  url.port = '5432';
  url.username = 'postgres';
  url.search = '';

  return url.toString();
}

function quoteArg(arg: string): string {
  if (arg.length === 0) return '""';
  if (/^[a-zA-Z0-9._:=\-\/]+$/.test(arg)) return arg;
  return `"${arg.replace(/"/g, '\\"')}"`;
}

function main(): void {
  loadEnvFile(resolve(process.cwd(), '.env.local'));
  loadEnvFile(resolve(process.cwd(), '.env'));

  const pooledDatabaseUrl = process.env.DATABASE_URL;
  if (!pooledDatabaseUrl) {
    throw new Error('DATABASE_URL is not defined in environment or .env files.');
  }

  const directDatabaseUrl = buildDirectSupabaseUrl(pooledDatabaseUrl);

  const commandArg = process.argv[2]?.toLowerCase();
  const passthroughArgs = process.argv.slice(3);
  const allowedCommand = commandArg === 'status' || commandArg === 'resolve' || commandArg === 'deploy'
    ? commandArg
    : 'deploy';

  let prismaArgs: string;
  if (allowedCommand === 'status') {
    prismaArgs = 'migrate status';
  } else if (allowedCommand === 'resolve') {
    const extra = passthroughArgs.map(quoteArg).join(' ');
    prismaArgs = extra ? `migrate resolve ${extra}` : 'migrate resolve';
  } else {
    prismaArgs = 'migrate deploy';
  }

  const prismaBinary = resolve(
    process.cwd(),
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'prisma.cmd' : 'prisma',
  );

  const command = process.platform === 'win32'
    ? `"${prismaBinary}" ${prismaArgs}`
    : `${prismaBinary} ${prismaArgs}`;

  const result = spawnSync(command, {
    shell: true,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: directDatabaseUrl,
    },
  });

  if (typeof result.status === 'number') {
    process.exit(result.status);
  }

  throw new Error(result.error?.message || 'Failed to run prisma migrate deploy.');
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`[db:migrate:direct] ${message}`);
  process.exit(1);
}