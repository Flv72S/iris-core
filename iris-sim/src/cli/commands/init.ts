import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import type { CliCommandResult } from '../cli_types.js';

const TEMPLATE_IDS = ['hello-world', 'messaging-basic', 'secure-node'] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

function isTemplateId(value: string): value is TemplateId {
  return (TEMPLATE_IDS as readonly string[]).includes(value);
}

function getTemplatesRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // dist/cli/commands -> dist/templates
  return path.join(here, '..', '..', 'templates');
}

function isDirEffectivelyEmpty(cwd: string): boolean {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(cwd, { withFileTypes: true });
  } catch {
    return true;
  }
  return !entries.some((e) => e.name !== '.iris' && e.name !== '.git');
}

function writeDefaultConfig(cwd: string): void {
  const cfgPath = path.join(cwd, 'iris.config.json');
  fs.writeFileSync(
    cfgPath,
    JSON.stringify(
      {
        transport: { type: 'ws', options: { host: '127.0.0.1', port: 4000 } },
        features: { encryption: false, replay_protection: false, covenants: true },
        dev_mode: true,
        observability: {
          logging: true,
          metrics: true,
          tracing: true,
          logLevel: 'info',
        },
      },
      null,
      2,
    ),
    'utf8',
  );
}

function copyTemplate(templateId: TemplateId, cwd: string): void {
  const root = getTemplatesRoot();
  const src = path.join(root, templateId);
  if (!fs.existsSync(src)) {
    throw new Error(`Template not found: ${templateId} (expected ${src})`);
  }
  fs.cpSync(src, cwd, { recursive: true });
}

async function promptYesNo(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input, output });
  try {
    const ans = (await rl.question(question)).trim().toLowerCase();
    return ans === 'y' || ans === 'yes';
  } finally {
    rl.close();
  }
}

async function promptTemplateInteractive(): Promise<TemplateId> {
  const rl = readline.createInterface({ input, output });
  try {
    console.log('Select a template:');
    console.log('1) Hello World');
    console.log('2) Messaging Basic');
    console.log('3) Secure Node');
    const ans = (await rl.question('Enter choice (1-3): ')).trim();
    const n = Number(ans);
    if (n === 1) return 'hello-world';
    if (n === 2) return 'messaging-basic';
    if (n === 3) return 'secure-node';
  } finally {
    rl.close();
  }
  return 'hello-world';
}

function parseInitArgv(argv: string[]): { templateArg?: string; yes: boolean } {
  const rest = argv.slice(3);
  let templateArg: string | undefined;
  let yes = false;
  for (const a of rest) {
    if (a === '--yes' || a === '-y') yes = true;
    else if (!a.startsWith('-') && templateArg === undefined) templateArg = a;
  }
  return { yes, ...(templateArg !== undefined ? { templateArg } : {}) };
}

function printNextSteps(templateId: TemplateId): void {
  console.log('\n🚀 IRIS project ready\n');
  console.log('Next steps:');
  console.log('1. npx iris start');
  if (templateId === 'messaging-basic') {
    console.log('2. node --experimental-strip-types receiver.ts  (terminal 1)');
    console.log('3. node --experimental-strip-types sender.ts    (terminal 2)');
  } else {
    console.log('2. node --experimental-strip-types index.ts');
  }
}

export async function runInit(cwd: string, argv: string[] = process.argv): Promise<CliCommandResult> {
  const { templateArg, yes } = parseInitArgv(argv);

  let templateId: TemplateId | undefined;
  if (templateArg) {
    if (!isTemplateId(templateArg)) {
      console.error(`❌ IRIS Error\n\nUnknown template: ${templateArg}`);
      console.error(`Expected one of: ${TEMPLATE_IDS.join(', ')}`);
      return { exitCode: 1 };
    }
    templateId = templateArg;
  } else if (process.stdin.isTTY && process.stdout.isTTY) {
    templateId = await promptTemplateInteractive();
  } else {
    const env = process.env.IRIS_INIT_TEMPLATE;
    templateId = env && isTemplateId(env) ? env : 'hello-world';
  }

  const forceYes = process.env.IRIS_INIT_YES === '1' || process.env.IRIS_INIT_YES === 'true';
  if (!isDirEffectivelyEmpty(cwd)) {
    const allow =
      yes ||
      forceYes ||
      (process.stdin.isTTY && process.stdout.isTTY && (await promptYesNo('⚠️ Directory not empty\nOverwrite? (y/n) ')));
    if (!allow) {
      console.log('Aborted.');
      return { exitCode: 1 };
    }
  }

  try {
    copyTemplate(templateId, cwd);
  } catch (e) {
    console.error((e as Error).message);
    return { exitCode: 1 };
  }

  writeDefaultConfig(cwd);
  printNextSteps(templateId);
  return { exitCode: 0 };
}
