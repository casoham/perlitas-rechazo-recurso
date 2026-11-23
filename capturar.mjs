// Captura diapositivas por id (abre cada una directamente con #N), recorre sus pasos y, con --trans,
// pulsa → y captura a mitad de la transición hacia la siguiente.
// Uso: node capturar.mjs id,id,... [--trans]     (sin ids: todas; CHROMIUM_PATH opcional)
import fs from 'node:fs';
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
const config = JSON.parse(fs.readFileSync('presentacion.json', 'utf8'));
const ids = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2].split(',') : config.orden;
const conTrans = process.argv.includes('--trans');
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
fs.mkdirSync('revision', { recursive: true });
const errores = [];
for (const id of ids) {
  const i = config.orden.indexOf(id);
  if (i < 0) { console.warn('No existe', id); continue; }
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  p.on('pageerror', (e) => errores.push(id + ': ' + e.message));
  p.on('console', (m) => m.type() === 'error' && errores.push(id + ': ' + m.text()));
  await p.goto(pathToFileURL('index.html').href + '#' + (i + 1));
  await p.waitForTimeout(4500);
  const nombre = (k) => `revision/${String(i + 1).padStart(2, '0')}-${id}-${k}.png`;
  await p.screenshot({ path: nombre(0), timeout: 120000 });
  const pasos = await p.evaluate(() => Number(document.querySelector('#escenario > section.activa')?.dataset.pasos || 0));
  for (let k = 1; k <= pasos; k++) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(3000); await p.screenshot({ path: nombre(k), timeout: 120000 }); }
  if (conTrans && i < config.orden.length - 1) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(650); await p.screenshot({ path: `revision/transicion-${id}.png`, timeout: 120000 }); }
  await p.close();
}
console.log('errores:', errores.length ? errores.join(' | ') : 'ninguno');
await b.close();
