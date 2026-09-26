// A recusa do `criar-colecoes.mjs` sai com o código 2 — medido, não afirmado.
//
//   node db/pocketbase/provar-a-recusa-sai-com-2.mjs
//
// ── O defeito ────────────────────────────────────────────────────────────────
//
// O travão do `PB_RECRIAR` nasceu em 26/09/2026 a dizer, em três sítios — o
// comentário, a mensagem impressa e a mensagem do commit —, que recusava «com o
// código 2». Recusava com 127, e com um despejo do libuv por cima:
//
//   Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 76
//
// ⚠ O número do código errado depende de quem o conta, e não vale a pena
// «corrigi-lo» num sentido ou no outro: a consola do `bash` mostra 127, e o
// `spawn` do Node entrega 3221226505 — o `0xC0000409` do Windows — para a mesma
// corrida. O que a prova afirma é que não é 2, não é qual dos dois é.
//
// O `simular-casa.mjs` recusa ANTES de falar com o servidor, e o `process.exit(2)`
// dele sai limpo. Esta recusa só se sabe DEPOIS do `authWithPassword` e dos dois
// `getFullList`, e sair com as ligações do `fetch` abertas rebenta no Windows.
// Quem visse aquilo na consola concluía que o guião tinha ido abaixo — não que
// tinha recusado, que é precisamente a leitura que um travão não pode permitir.
//
// ── Porque é que isto é uma prova e não uma linha no `regressoes.test.js` ─────
//
// Porque lá já estava, e passou na mesma. A linha era
// `expect(colecoes).toMatch(/process\.exit\(2\)/)` — leu o ficheiro, encontrou o
// texto, e chamou-lhe provado. Um guarda que LÊ um guião não sabe nada sobre o
// que ele FAZ.
//
// ⚠ E um servidor de MENTIRA também não serve, o que é a parte que custa. Com um
// `http.createServer` de vinte linhas a responder o suficiente para o guião se
// autenticar e ler as casas, a versão avariada sai com 2 e parece sã: o despejo
// só aparece com as ligações que um PocketBase a sério deixa abertas. Medido nos
// dois sentidos em 27/09/2026. Por isso esta prova arranca um PocketBase de
// deitar fora, numa porta e numa pasta só dela, e mede o processo filho.
//
// ── A propriedade ────────────────────────────────────────────────────────────
//
// Corrido contra um servidor com uma casa lá dentro e um `PB_RECRIAR` que não é
// o nome dela, o `criar-colecoes.mjs` sai com 2, sem despejo nenhum, e não apaga
// coleção nenhuma. Com o nome certo, segue em frente.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import PocketBase from 'pocketbase';
import { prova, igual, resumo } from './provas.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const PORTA = 8097;
const URL_TEMP = `http://127.0.0.1:${PORTA}`;
const SUPER = 'admin@nossacasa.local';
const SENHA = 'so-para-medir-123';
const CASA = 'Casa de Medir';

// O binário está na raiz do projeto e não no PATH — é a mesma história do `gh`
// que o `CLAUDE.md` conta. Aqui procura-se pelos dois nomes e falha-se em claro.
const binario = ['pocketbase.exe', 'pocketbase']
  .map(n => path.join(RAIZ, n))
  .find(p => fs.existsSync(p));

if (!binario) {
  console.error('Não encontrei o `pocketbase` na raiz do projeto. Sem ele esta prova');
  console.error('não pode medir nada — e o `db:servir` também não arrancaria.');
  process.exit(1);
}

const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'nossa-casa-recusa-'));
let servidor = null;

const arrumar = () => {
  if (servidor && !servidor.killed) servidor.kill();
  try { fs.rmSync(pasta, { recursive: true, force: true }); } catch { /* o Windows às vezes segura o ficheiro */ }
};
process.on('exit', arrumar);

// ── O servidor de deitar fora ────────────────────────────────────────────────
//
// ⚠ As duas pastas apontam-se para uma pasta VAZIA, e não se omitem.
//
// Esta prova não quer o esquema da casa — quer duas coleções e uma linha. Mas
// omitir os dois argumentos não dá um servidor limpo: o PocketBase procura as
// migrações por conta própria, e numa das corridas foi buscá-las a uma pasta
// deixada por outra execução, rebentando com «failed to apply migration
// 1790461524_created_cofre_movimentos.js: … The relation collection doesn't
// exist». O servidor morria à nascença.
//
// ⚠ E a primeira versão desta prova apanhou esse arranque falhado com um
// `stdio: 'ignore'` e disse «não abriu a porta em 15 segundos — se houver outra
// coisa à escuta nessa porta, é isso». A porta estava livre. Uma prova que
// inventa a causa da própria falha custa mais tempo do que a que não existe, e
// é a mesma lição do `db:servir` que dizia que a Google estava mal configurada.
// Por isso o `stderr` fica guardado e sai impresso quando o arranque falha.
const semNada = path.join(pasta, 'sem-migracoes');
fs.mkdirSync(semNada);

let queixas = '';
servidor = spawn(binario, [
  'serve',
  `--http=127.0.0.1:${PORTA}`,
  `--dir=${pasta}`,
  `--migrationsDir=${semNada}`,
  `--hooksDir=${semNada}`,
], { cwd: RAIZ });
servidor.stdout.on('data', (d) => { queixas += d; });
servidor.stderr.on('data', (d) => { queixas += d; });

const esperarPorEle = async () => {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${URL_TEMP}/api/health`);
      if (r.ok) return true;
    } catch { /* ainda não abriu a porta */ }
    await new Promise(r => setTimeout(r, 250));
  }
  return false;
};

if (!await esperarPorEle()) {
  console.error(`O PocketBase de medição não respondeu em ${URL_TEMP} ao fim de 15 segundos.`);
  console.error(queixas.trim() || '(e não se queixou de nada — provavelmente a porta está ocupada)');
  process.exit(1);
}

spawnSync(binario, ['superuser', 'upsert', SUPER, SENHA, `--dir=${pasta}`], { cwd: RAIZ });

const pb = new PocketBase(URL_TEMP);
pb.autoCancellation(false);
await pb.collection('_superusers').authWithPassword(SUPER, SENHA);

// O mínimo que o travão precisa de ver: uma coleção `casas` com uma linha, e uma
// `membros` para o retrato ser o de uma casa a sério.
await pb.collections.create({ name: 'casas', type: 'base', fields: [{ name: 'nome', type: 'text' }] });
await pb.collections.create({ name: 'membros', type: 'base', fields: [{ name: 'nome', type: 'text' }] });
await pb.collection('casas').create({ nome: CASA });
await pb.collection('membros').create({ nome: 'Rita' });

const quantasColecoes = async () => (await pb.collections.getFullList()).length;
const antes = await quantasColecoes();

// ── Correr o guião e MEDIR o que ele devolve ─────────────────────────────────
const correr = (pedido) => new Promise((resolver) => {
  const filho = spawn(process.execPath, [path.join(RAIZ, 'db/pocketbase/criar-colecoes.mjs')], {
    cwd: RAIZ,
    env: { ...process.env, PB_URL: URL_TEMP, PB_ADMIN: SUPER, PB_ADMIN_PASS: SENHA, PB_RECRIAR: pedido },
  });
  let saida = '';
  filho.stdout.on('data', (d) => { saida += d; });
  filho.stderr.on('data', (d) => { saida += d; });
  filho.on('close', (codigo) => resolver({ codigo, saida }));
});

console.log('\n── a recusa ──');

const recusa = await correr('1');

await prova('um PB_RECRIAR que não é o nome da casa é recusado', async () => {
  if (!/RECUSADO: PB_RECRIAR/.test(recusa.saida)) {
    throw new Error(`não imprimiu a recusa. Saiu:\n${recusa.saida.trim()}`);
  }
});

await prova('⚠ e sai com o código 2 — não com 127', async () => {
  igual(recusa.codigo, 2, `saiu com ${recusa.codigo}`);
});

await prova('⚠ e sem despejo do libuv, que se lê como ir abaixo', async () => {
  const despejo = recusa.saida.match(/Assertion failed[^\n]*/);
  if (despejo) throw new Error(despejo[0]);
});

await prova('e a mensagem ensina o nome exacto a escrever', async () => {
  if (!recusa.saida.includes(`PB_RECRIAR="${CASA}"`)) {
    throw new Error('não mostrou a linha a copiar, com o nome da casa lá dentro');
  }
});

await prova('e não apagou coleção nenhuma', async () => {
  igual(await quantasColecoes(), antes, 'o número de coleções mudou');
  igual((await pb.collection('casas').getFullList()).length, 1, 'a casa desapareceu');
});

console.log('\n── e o caminho de quem escreve o nome certo ──');

const total = await correr(CASA);

await prova('o nome exacto passa o travão e reconstrói', async () => {
  if (!/RECONSTRUÇÃO TOTAL/.test(total.saida)) {
    throw new Error(`não anunciou a reconstrução. Saiu:\n${total.saida.slice(-500)}`);
  }
  igual(total.codigo, 0, `saiu com ${total.codigo}`);
});

resumo();
