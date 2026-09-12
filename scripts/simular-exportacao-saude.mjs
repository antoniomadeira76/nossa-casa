// Simula a exportação de uma ficha de saúde COM imagens em anexo — sem tocar
// na casa.
//
//   node scripts/simular-exportacao-saude.mjs [pasta-de-saída]
//
// 12/09/2026: o dono da casa pediu que o PDF da ficha incluísse as imagens dos
// documentos, e quis vê-lo a funcionar antes de haver fotografias nos anexos
// da casa. Este guião fabrica duas imagens com o Chrome (uma «radiografia» e um
// «relatório», as duas a dizerem por escrito que são simulação), monta uma ficha
// da família de demonstração com as duas em anexo e um terceiro documento sem
// fotografia — para se ver o outro caminho —, passa-a pelo MESMO
// `documentoDeSaude` da app e imprime-a em PDF pelo Chrome.
//
// Não lê nem escreve no servidor: tudo vive na pasta de saída (por omissão,
// `.simulacao/` na raiz, ignorada pelo git). Precisa do Chrome instalado.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const raiz = path.resolve(import.meta.dirname, '..');
const saida = path.resolve(process.argv[2] || path.join(raiz, '.simulacao'));
fs.mkdirSync(saida, { recursive: true });

// O resolvedor de `./format` sem extensão, como nas provas do servidor.
await import(pathToFileURL(path.join(raiz, 'db/pocketbase/provas.mjs')).href);
const { documentoDeSaude, anexosComImagens } = await import(pathToFileURL(path.join(raiz, 'src/exportar-saude.js')).href);
const { SCHEMES } = await import(pathToFileURL(path.join(raiz, 'src/theme.js')).href);

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find(p => fs.existsSync(p));
if (!CHROME) { console.error('Sem Chrome nesta máquina — a simulação precisa dele para fabricar as imagens e o PDF.'); process.exit(1); }

const chrome = (...args) => spawnSync(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', ...args], { stdio: 'ignore' });
const url = (f) => pathToFileURL(path.join(saida, f)).href;

// ── As duas imagens, fabricadas ─────────────────────────────────────────────
fs.writeFileSync(path.join(saida, 'sim-radiografia.html'), `<!doctype html><html><body style="margin:0;width:900px;height:600px;background:radial-gradient(ellipse at 50% 45%, #cfd6dd 0%, #6b7683 45%, #1d222a 100%);font-family:Segoe UI,Arial;color:#f2f4f7">
<div style="position:absolute;left:0;right:0;top:40px;text-align:center;font-size:22px;letter-spacing:4px;opacity:.85">SIMULAÇÃO · RADIOGRAFIA PANORÂMICA</div>
<div style="position:absolute;left:120px;right:120px;top:210px;height:150px;border:6px solid rgba(255,255,255,.55);border-radius:50% 50% 45% 45%/60% 60% 40% 40%"></div>
<div style="position:absolute;left:170px;right:170px;top:300px;height:70px;background:repeating-linear-gradient(90deg,rgba(255,255,255,.7) 0 26px,transparent 26px 34px);opacity:.75;border-radius:8px"></div>
<div style="position:absolute;left:0;right:0;bottom:36px;text-align:center;font-size:16px;opacity:.7">imagem gerada para teste da exportação · não é um exame real</div>
</body></html>`);
fs.writeFileSync(path.join(saida, 'sim-relatorio.html'), `<!doctype html><html><body style="margin:0;width:800px;height:1000px;background:#fbfbf8;font-family:Georgia,serif;color:#222;padding:70px 90px;box-sizing:border-box">
<div style="font-size:13px;letter-spacing:3px;color:#8a3a5a;margin-bottom:24px">SIMULAÇÃO · RELATÓRIO CLÍNICO</div>
<h1 style="font-size:30px;margin:0 0 6px">Plano ortodôntico</h1>
<p style="color:#666;margin:0 0 30px">Clínica de Exemplo · Dr. Cardoso</p>
<p style="font-size:18px;line-height:1.7">Documento fabricado para testar a exportação da ficha de saúde em PDF. Não contém dados de nenhuma pessoa real.</p>
<p style="font-size:18px;line-height:1.7">Fase 1 — aparelho removível durante a noite. Fase 2 — avaliação da necessidade de aparelho fixo.</p>
</body></html>`);
chrome('--window-size=900,600', `--screenshot=${path.join(saida, 'sim-radiografia.png')}`, url('sim-radiografia.html'));
chrome('--window-size=800,1000', `--screenshot=${path.join(saida, 'sim-relatorio.png')}`, url('sim-relatorio.html'));

// ── A ficha de simulação, pelo documento da app ─────────────────────────────
const consultas = [
  { id: 'sim-1', member: 'Mia', specialty: 'Dentista', doctor: 'Dr. Cardoso', day: 'd2026-08-28', time: '10:00' },
  { id: 'sim-2', member: 'Mia', specialty: 'Pediatria', doctor: 'Dra. Nunes', day: 'd2026-06-12', time: '09:30' },
];
const docsCrus = [
  { id: 'a1', healthId: 'sim-1', title: 'Radiografia panorâmica', kind: 'Exame', foto: path.join(saida, 'sim-radiografia.png') },
  { id: 'a2', healthId: 'sim-1', title: 'Plano ortodôntico', kind: 'Relatório', foto: path.join(saida, 'sim-relatorio.png') },
  { id: 'a3', healthId: 'sim-2', title: 'Análises ao sangue', kind: 'Exame' },   // sem fotografia: fica nomeado
];
const ler = async (caminho) => `data:image/png;base64,${fs.readFileSync(caminho).toString('base64')}`;
const docs = await anexosComImagens(docsCrus, ler);
const notas = { 'sim-1': [{ author: 'Rita', text: 'Tolerou bem a anestesia. Simulação.' }] };
const e = SCHEMES[1];
const hoje = `d${new Date().toISOString().slice(0, 10)}`;
const html = documentoDeSaude({ membro: 'Mia', casa: 'Bengui (simulação)', consultas, docs, notas, ambito: 'tudo',
  hoje, quemImprime: 'António', t: { chrome: e.chrome, actFg: e.accent, accent: e.accent } });
fs.writeFileSync(path.join(saida, 'simulacao-ficha-com-imagens.html'), html);
chrome('--no-pdf-header-footer', `--print-to-pdf=${path.join(saida, 'simulacao-ficha-com-imagens.pdf')}`, url('simulacao-ficha-com-imagens.html'));

const figuras = (html.match(/<figure class="anexo">/g) || []).length;
const aviso = (html.match(/class="aviso">([^<]*)/) || [])[1];
console.log(`figuras: ${figuras} · ${aviso}`);
console.log(`PDF: ${path.join(saida, 'simulacao-ficha-com-imagens.pdf')}`);
if (figuras !== 2) { console.error('ESPERAVA 2 figuras'); process.exit(1); }
