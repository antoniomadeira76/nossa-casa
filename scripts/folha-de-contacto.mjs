// Compõe a folha de contacto a partir das 29 capturas.
import puppeteer from 'puppeteer-core';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DIR = process.argv[2];
const SAIDA = process.argv[3];

const pngs = readdirSync(DIR).filter(f => /^\d\d-.*\.png$/.test(f)).sort();
const celulas = pngs.map(f => {
  const b64 = readFileSync(join(DIR, f)).toString('base64');
  return `<figure><img src="data:image/png;base64,${b64}"><figcaption>${f.replace('.png','')}</figcaption></figure>`;
}).join('\n');

const html = `<!doctype html><meta charset="utf-8"><style>
  body { margin:0; padding:24px; background:#F0F2F5; font:12px/1.4 -apple-system,Segoe UI,Roboto,sans-serif; }
  .g { display:grid; grid-template-columns:repeat(6,1fr); gap:16px; }
  figure { margin:0; }
  img { width:100%; display:block; border:1px solid #D9D9D9; border-radius:6px; background:#fff; }
  figcaption { margin-top:6px; color:#67769B; font-weight:600; font-size:11px; }
</style><div class="g">${celulas}</div>`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1680, height: 1200, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'networkidle0' });
await page.screenshot({ path: SAIDA, fullPage: true });
await browser.close();
console.log(`folha de contacto: ${pngs.length} ecrãs → ${SAIDA}`);
