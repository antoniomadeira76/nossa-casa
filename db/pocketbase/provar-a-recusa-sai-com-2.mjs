// A recusa do `criar-colecoes.mjs` sai com o código 2 — medido, não afirmado.
//
//   npm run db:provar-a-recusa
//
// ⚠ Corre-se À MÃO, e não está na cadeia do `db:provar`. Levanta um PocketBase
// só dela, numa pasta temporária, e um servidor que aparece sozinho no meio de
// uma bateria é uma surpresa em cima de quem está a usar a máquina — ainda por
// cima porque o PocketBase abre o navegador quando nasce sem administrador.
// Corra-a quando mexer numa saída de um guião. Decisão do dono da casa,
// 27/09/2026.
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
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import PocketBase from 'pocketbase';
import { prova, igual, resumo } from './provas.mjs';
import { sair } from './sair.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
// ⚠ A porta PEDE-SE ao sistema; não se escolhe, nem à mão nem à sorte.
//
// Isto era a 8097 — vizinha das que se usam à mão (8095 a casa, 8096 a
// simulação) —, e o dono da casa apanhou um separador do navegador aberto nela:
// de cada vez que a bateria corria, aparecia-lhe à frente um PocketBase vazio a
// pedir para criar o primeiro administrador. Um servidor de deitar fora não
// deve ir bater a portas onde alguém possa estar a olhar, e menos ainda a
// escrever.
//
// ⚠ E sortear um número alto também não serve: no Windows os serviços do
// sistema ocupam a gama efémera logo a partir da 49664 — estavam quatro
// ocupadas nesta máquina no dia em que isto se escreveu. Sortear dava um teste
// que falha de vez em quando sem razão nenhuma, que é a pior espécie.
//
// Ligar ao porto 0 faz o sistema entregar um que está mesmo livre.
const portaEmprestada = () => new Promise((resolver, rejeitar) => {
  const s = net.createServer();
  s.once('error', rejeitar);
  s.listen(0, '127.0.0.1', () => {
    const { port } = s.address();
    s.close(() => resolver(port));
  });
});

const PORTA = await portaEmprestada();
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
  await sair(1);
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

// ⚠ A porta tem de estar LIVRE, e confirma-se a tentar ocupá-la — não a
// perguntar ao que lá estiver.
//
// Esta prova pedia `/api/health` e aceitava qualquer 200. Com um
// `http.createServer` de brincadeira à escuta na 8097 — vinte linhas que
// respondem «nao» a tudo — ela dava o servidor por bom, corria as seis provas
// contra ele e declarava o travão avariado, com o `criar-colecoes.mjs` a
// rebentar num `TypeError`. Uma prova que acusa o código por causa de quem lhe
// ocupou a porta é pior do que não haver prova. Medido em 27/09/2026.
const portaLivre = () => new Promise((resolver) => {
  const s = net.createServer();
  s.once('error', () => resolver(false));
  s.once('listening', () => s.close(() => resolver(true)));
  s.listen(PORTA, '127.0.0.1');
});

if (!await portaLivre()) {
  console.error(`A porta ${PORTA} já está ocupada. Esta prova precisa dela para o seu`);
  console.error('PocketBase de deitar fora, e não sabe medir nada contra o que lá estiver.');
  await sair(1);
}

// ⚠ O superutilizador cria-se ANTES de o servidor arrancar. Não é arrumação.
//
// Um PocketBase que arranca com a pasta de dados vazia e sem administrador
// **abre o navegador do utilizador** na página «Setup your PocketBase
// instance». Esta prova criava-o depois de arrancar, e por isso cada corrida da
// bateria atirava um separador à cara de quem estivesse a usar o computador —
// um formulário a pedir uma palavra-passe, vindo do nada, sem explicação.
//
// Com o administrador já lá, o servidor não tem motivo para abrir coisa
// nenhuma. Reclamado em 27/09/2026, e com razão.
spawnSync(binario, ['superuser', 'upsert', SUPER, SENHA, `--dir=${pasta}`], { cwd: RAIZ });

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
      // ⚠ E tem de ser o formato do PocketBase, não um 200 qualquer.
      if (r.ok && (await r.json())?.code === 200) return true;
    } catch { /* ainda não abriu a porta */ }
    await new Promise(r => setTimeout(r, 250));
  }
  return false;
};

if (!await esperarPorEle()) {
  console.error(`O PocketBase de medição não respondeu em ${URL_TEMP} ao fim de 15 segundos.`);
  console.error(queixas.trim() || '(e não se queixou de nada — provavelmente a porta está ocupada)');
  // ⚠ O `arrumar()` ANTES do `sair()`, e não só no `process.on('exit')`.
  //
  // O `sair()` põe o código e espera que o ciclo de eventos se esvazie. Com o
  // PocketBase filho ainda vivo, o ciclo NUNCA se esvazia: o processo fica
  // pendurado para sempre em vez de falhar. Aconteceu, e travou uma corrida
  // inteira — dez minutos sem uma linha impressa. Quem tem um filho aberto
  // fecha-o antes de sair.
  arrumar();
  await sair(1);
}

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
