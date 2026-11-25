import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const [, , input, output] = process.argv;
const clip = (s, n) => (!s ? '' : s.length > n ? `${s.slice(0, n)}\n... [recortado: ${s.length - n} caracteres más]` : s);
const fence = (s) => '```\n' + String(s).replaceAll('```', "'''") + '\n```';
const quote = (s) => '> ' + s.trim().replaceAll('\n', '\n> ');
const time = (t) => (t ? new Date(t).toISOString().slice(11, 19) + ' UTC' : '');

const out = [
  '# Transcripción de la sesión del agente (uso de la skill)',
  '',
  'Exportada desde el registro local de Claude Code (JSONL) de la sesión en la que se invocó',
  '`/playwright-test-implementer` para implementar el escenario UI+API (2026-11-24).',
  'Incluye los mensajes del usuario, las respuestas del agente, cada herramienta que usó y un extracto de su resultado.',
  'Se omiten el razonamiento interno, los mensajes de sistema y el contenido de la skill inyectado (está en `.claude/skills/`).',
  'Las salidas largas se recortan. Agente: Claude Code (Claude Opus 5.5, esfuerzo medio).',
  '',
];

for (const line of readFileSync(input, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const o = JSON.parse(line);
  if (o.isMeta || o.isSidechain) continue;
  const c = o.message?.content;
  if (o.type === 'user') {
    const blocks = typeof c === 'string' ? [{ type: 'text', text: c }] : c ?? [];
    for (const b of blocks) {
      if (b.type === 'text') {
        let t = b.text;
        const m = t.match(/<command-args>([\s\S]*?)<\/command-args>/);
        if (m) t = '/playwright-test-implementer ' + m[1];
        else if (t.trimStart().startsWith('<')) continue;
        out.push(`## Usuario (${time(o.timestamp)})`, '', quote(t), '');
      } else if (b.type === 'tool_result') {
        let r = typeof b.content === 'string' ? b.content : (b.content ?? []).filter((x) => x.type === 'text').map((x) => x.text).join('\n');
        r = r.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim();
        out.push('<details><summary>Resultado</summary>', '', fence(clip(r, 1500)), '', '</details>', '');
      }
    }
  } else if (o.type === 'assistant') {
    for (const b of c ?? []) {
      if (b.type === 'text' && b.text.trim()) {
        out.push(`## Agente (${time(o.timestamp)})`, '', b.text.trim(), '');
      } else if (b.type === 'tool_use') {
        const i = b.input ?? {};
        let detail;
        if (i.command) detail = i.command;
        else if (i.file_path) {
          detail = `archivo: ${i.file_path}`;
          if (i.content) detail += '\n\n' + clip(i.content, 2500);
          else if (i.new_string !== undefined) detail += '\n--- reemplaza:\n' + clip(i.old_string, 600) + '\n+++ por:\n' + clip(i.new_string, 1500);
        } else detail = JSON.stringify(i);
        out.push(`**Herramienta: \`${b.name}\`${i.description ? ' — ' + i.description : ''}**`, '', fence(clip(detail, 3000)), '');
      }
    }
  }
}
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, out.join('\n'), 'utf8');
console.log('ok', output);
