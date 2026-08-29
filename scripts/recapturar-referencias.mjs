// Recaptura as 29 referências do protótipo, a 402×874.
// Conduz o Chrome instalado — não descarrega Chromium.
//   npm run referencias        (ou: node scripts/recapturar-referencias.mjs <pasta>)
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';
import { createServer } from 'http';
import { readFileSync, statSync } from 'fs';
import { extname, join } from 'path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SAIDA = process.argv[2] || './capturas';
const PORTA = 8090;
const ALVO = `http://localhost:${PORTA}/Nossa%20Casa%20App.dc.html`;

// Servidor estático embutido. Um processo filho (npx http-server) sobrevivia
// ao kill quando lançado com shell:true e deixava o script pendurado.
const TIPOS = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.woff2':'font/woff2' };
const servidor = createServer((req, res) => {
  try {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
    const caminho = join('design', rel);
    if (!statSync(caminho).isFile()) throw 0;
    res.writeHead(200, { 'Content-Type': TIPOS[extname(caminho)] || 'application/octet-stream' });
    res.end(readFileSync(caminho));
  } catch { res.writeHead(404); res.end('não encontrado'); }
});
await new Promise(r => servidor.listen(PORTA, r));

const espera = (ms) => new Promise(r => setTimeout(r, ms));
const TEL = `[...document.querySelectorAll('*')].find(el=>{const b=el.getBoundingClientRect();return Math.round(b.width)===402&&Math.round(b.height)===874;})`;

const tocar = async (page, txt, exato = false) => {
  const ok = await page.evaluate((TEL, txt, exato) => {
    const tel = eval(TEL); if (!tel) return false;
    const a = [...tel.querySelectorAll('*')].filter(el => {
      const cs = getComputedStyle(el);
      if (!(cs.cursor === 'pointer' || el.onclick || el.getAttribute('role') === 'button')) return false;
      const t = el.textContent.trim().replace(/\s+/g, ' ');
      return exato ? t === txt : t.includes(txt);
    });
    const el = a.filter(x => !a.some(y => y !== x && x.contains(y)))[0];
    if (!el) return false;
    el.scrollIntoView({ block: 'center' }); el.click(); return true;
  }, TEL, txt, exato);
  await espera(520); return ok;
};

// O avatar do cabeçalho não tem texto — encontra-se pela posição.
const avatar = async (page) => {
  const ok = await page.evaluate((TEL) => {
    const tel = eval(TEL); const r = tel.getBoundingClientRect();
    const a = [...tel.querySelectorAll('*')].filter(e => {
      const cs = getComputedStyle(e); const b = e.getBoundingClientRect();
      return cs.cursor === 'pointer' && b.width < 60 && b.height < 60 && (b.y - r.y) < 130 && (b.x - r.x) > 300;
    });
    if (!a.length) return false; a[a.length - 1].click(); return true;
  }, TEL);
  await espera(600); return ok;
};

const resumo = (page) => page.evaluate((TEL) => {
  const t = eval(TEL); return t ? t.innerText.replace(/\s+/g, ' ').slice(0, 70) : '(sem telefone)';
}, TEL);

const capturar = async (page, nome) => {
  // A moldura tem de estar inteira dentro da janela, senão o recorte apanha
  // fundo da página em vez do ecrã.
  await page.evaluate((TEL) => {
    const t = eval(TEL);
    window.scrollTo(0, t.getBoundingClientRect().top + window.scrollY - 40);
  }, TEL);
  await espera(250);
  const h = await page.evaluateHandle((TEL) => eval(TEL), TEL);
  const box = await h.asElement().boundingBox();
  if (box.y < 0 || box.y + box.height > 1000) console.log(`    ⚠ ${nome}: moldura fora da janela (y=${Math.round(box.y)})`);
  await page.screenshot({ path: `${SAIDA}/${nome}.png`, clip: box });
};

const feitos = [], falhados = [];
const passo = async (page, nome, toques) => {
  for (const t of toques) {
    const [alvo, exato] = Array.isArray(t) ? t : [t, false];
    const ok = alvo === '@avatar' ? await avatar(page) : await tocar(page, alvo, exato);
    if (!ok) { console.log(`  ✕ ${nome}: falhou em «${alvo}»`); falhados.push(nome); return false; }
  }
  await espera(400);
  await capturar(page, nome);
  console.log(`  ✓ ${nome} — ${await resumo(page)}`);
  feitos.push(nome); return true;
};

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--force-device-scale-factor=1', '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 1100, deviceScaleFactor: 1 });
const recomecar = async () => {
  await page.goto(ALVO, { waitUntil: 'networkidle2' });
  await espera(1300);
  await tocar(page, 'Continuar com Google');
  await tocar(page, 'Rita');
  await tocar(page, 'Agora não');
};
mkdirSync(SAIDA, { recursive: true });

// ── Entrada ────────────────────────────────────────────────────────────────
// O servidor embutido já está a ouvir; a espera é por segurança.
for (let i = 0; i < 30; i++) {
  try { await page.goto(ALVO, { waitUntil: 'networkidle2', timeout: 4000 }); break; }
  catch { await espera(500); }
}
await espera(1300);
await capturar(page, '01-entrar'); feitos.push('01-entrar'); console.log('  ✓ 01-entrar');
await tocar(page, 'Continuar com Google');
await capturar(page, '02-escolher-conta'); feitos.push('02-escolher-conta'); console.log('  ✓ 02-escolher-conta');
await tocar(page, 'Rita');
await capturar(page, '03-popup-calendar'); feitos.push('03-popup-calendar'); console.log('  ✓ 03-popup-calendar');
await tocar(page, 'Agora não');

// ── Separadores ────────────────────────────────────────────────────────────
console.log('\n── separadores ──');
for (const [n, tab] of [['04-inicio','Início'],['05-dinheiro','Dinheiro'],['06-tarefas','Tarefas'],
                        ['07-compras','Compras'],['08-agenda','Agenda']]) {
  await passo(page, n, [[tab, true]]);
}

// ── Folhas e ecrãs internos ────────────────────────────────────────────────
console.log('\n── folhas e ecrãs internos ──');
await recomecar(); await passo(page, '09-perfil', ['@avatar']);
await recomecar(); await passo(page, '10-modo-compras', [['Compras', true], 'Iniciar compras na loja']);
await recomecar(); await passo(page, '11-equipamentos', [['Dinheiro', true], 'Equipamentos da Casa']);
await recomecar(); await passo(page, '12-ficha-equipamento', [['Dinheiro', true], 'Equipamentos da Casa', 'Frigorífico']);
await recomecar(); await passo(page, '13-gestao-casa', ['@avatar', 'Gestão da Casa']);
await recomecar(); await passo(page, '14-membros-pin', ['@avatar', 'Gestão da Casa', 'Membros']);
await recomecar(); await passo(page, '15-saude', ['@avatar', 'Saúde da Família']);
await recomecar(); await passo(page, '16-ficha-saude', ['@avatar', 'Saúde da Família', 'Mia']);
await recomecar(); await passo(page, '17-documentacao', ['@avatar', 'Documentação']);
await recomecar(); await passo(page, '18-agendar-evento', [['Agenda', true], 'Agendar um evento']);
await recomecar(); await passo(page, '19-mover-dinheiro', [['Dinheiro', true], 'Mover Dinheiro entre Envelopes']);
await recomecar(); await passo(page, '20-nova-tarefa', [['Tarefas', true], 'Acrescentar tarefa']);
await recomecar(); await passo(page, '21-cofre-crianca', [['Tarefas', true], 'No cofre']);
await recomecar(); await passo(page, '25-terminar-sessao', ['@avatar', 'Terminar sessão']);

// ── Modo escuro ────────────────────────────────────────────────────────────
// O seletor de aspeto são três ícones sem texto no perfil: sol, lua, telemóvel.
console.log('\n── modo escuro ──');
await recomecar();
await avatar(page);
// O seletor de aspeto é o único trio de irmãos clicáveis de 44×44 em linha.
// Escolher pela estrutura em vez de por coordenada: a folha rola.
const aspeto = await page.evaluate((TEL, i) => {
  const tel = eval(TEL);
  for (const pai of tel.querySelectorAll('*')) {
    const f = [...pai.children].filter(c => getComputedStyle(c).cursor === 'pointer');
    if (f.length !== 3) continue;
    const bs = f.map(c => c.getBoundingClientRect());
    if (bs.every(b => Math.abs(b.y - bs[0].y) < 6 && Math.abs(b.width - bs[0].width) < 6
                      && b.width > 30 && b.width < 90)) { f[i].click(); return true; }
  }
  return false;
}, TEL, 1);                                    // 1 = a lua
console.log('  aspeto escuro:', aspeto);
await espera(600);
await page.keyboard.press('Escape'); await espera(600);
await passo(page, '22-escuro-inicio',  [['Início', true]]);
await passo(page, '23-escuro-dinheiro',[['Dinheiro', true]]);
await passo(page, '24-escuro-perfil',  [['Início', true], '@avatar']);

// ── Modo criança ───────────────────────────────────────────────────────────
console.log('\n── modo criança ──');
await recomecar();
// O Léo não tem PIN de fábrica — um adulto define-o primeiro, que é a regra.
await avatar(page);
await tocar(page, 'Gestão da Casa');
await tocar(page, 'Membros e PIN');
const abriuPin = await tocar(page, 'Perfil de criança');
console.log('  membros e PIN → perfil de criança:', abriuPin, '·', await resumo(page));
console.log('  definir:', await tocar(page, 'Definir'));
for (const d of ['1', '3', '5', '7']) await tocar(page, d, true);
await espera(400);
await tocar(page, 'Guardar') || await tocar(page, 'OK', true) || await tocar(page, 'Confirmar');
await espera(700);
console.log('  PIN definido →', await resumo(page));

// Sem recarregar: o protótipo guarda o estado em memória, e um goto apagaria
// o PIN que acabámos de definir.
await page.keyboard.press('Escape'); await espera(400);
await tocar(page, 'Voltar às Definições'); await espera(300);
await page.keyboard.press('Escape'); await espera(400);
await tocar(page, 'Início', true); await espera(300);
await avatar(page);
await tocar(page, 'Terminar sessão');
await espera(400);
await tocar(page, 'Terminar sessão');          // confirmar, se houver diálogo
await espera(700);
await passo(page, '26-entrar-crianca', ['Entrar como Criança']);
await passo(page, '27-pin-crianca',    ['Léo']);
for (const d of ['1', '3', '5', '7']) await tocar(page, d, true);
await espera(900);
await capturar(page, '28-crianca-tarefas');
console.log('  ✓ 28-crianca-tarefas —', await resumo(page));
feitos.push('28-crianca-tarefas');
await passo(page, '29-crianca-cofre', ['Cofre']);

console.log(`\nfeitos ${feitos.length} · falhados ${falhados.length}${falhados.length ? ': ' + falhados.join(', ') : ''}`);
await browser.close();
servidor.close();
