import { lstatSync, rmSync, symlinkSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(new URL('.', import.meta.url).pathname, '..');
const linkPath = resolve(projectRoot, 'node_modules', '@prisma', 'client', '.prisma');
const desiredTarget = '../../.prisma';

try {
  let shouldCreate = true;

  try {
    const stat = lstatSync(linkPath);
    if (stat.isSymbolicLink()) {
      rmSync(linkPath, { force: true });
      shouldCreate = true;
    } else {
      rmSync(linkPath, { recursive: true, force: true });
      shouldCreate = true;
    }
  } catch {
    shouldCreate = true;
  }

  if (shouldCreate) {
    symlinkSync(desiredTarget, linkPath);
    process.stdout.write('Prisma workspace symlink created.\n');
  }
} catch (error) {
  process.stderr.write(`Prisma symlink setup skipped: ${String(error)}\n`);
}
