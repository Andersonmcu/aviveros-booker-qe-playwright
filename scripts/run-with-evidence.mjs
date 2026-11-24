#!/usr/bin/env node
/**
 * Harness mínimo: ejecuta Playwright, conserva código de salida y evidencias en evidence/<timestamp>/.
 * Uso:  node scripts/run-with-evidence.mjs [argumentos de playwright]
 *   ej: node scripts/run-with-evidence.mjs --grep @smoke
 * El proceso termina con el MISMO código de salida que Playwright (0 = todo verde, !=0 = fallo).
 * Una prueba omitida o no ejecutada aparece como "skipped"/"notRun" en summary.json: no cuenta como aprobada.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = join('evidence', stamp);
mkdirSync(outDir, { recursive: true });

const started = Date.now();
const result = spawnSync('npx', ['playwright', 'test', ...args], { stdio: 'inherit', shell: true });
const exitCode = result.status ?? 1;

let stats = null;
if (existsSync('reports/results.json')) {
  const report = JSON.parse(readFileSync('reports/results.json', 'utf8'));
  stats = report.stats;
  cpSync('reports/results.json', join(outDir, 'results.json'));
}
for (const [src, dst] of [['reports/html', 'html'], ['reports/junit.xml', 'junit.xml'], ['reports/test-results', 'test-results']]) {
  if (existsSync(src)) cpSync(src, join(outDir, dst), { recursive: true });
}

const summary = {
  command: `npx playwright test ${args.join(' ')}`.trim(),
  exitCode,
  verdict: exitCode === 0 ? 'PASSED' : 'FAILED',
  durationMs: Date.now() - started,
  stats,
  baseURL: process.env.BASE_URL ?? 'https://automationintesting.online',
  workers: process.env.WORKERS ?? '2',
  node: process.version,
};
writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
writeFileSync(join(outDir, 'exit-code.txt'), String(exitCode));
console.log(`\nEvidencia guardada en ${outDir} — exitCode=${exitCode} (${summary.verdict})`);
process.exit(exitCode);
