// Aceitação: a fotografia de um anexo chega ao servidor, e só quem pode vê-la
// a recebe.
//
//   node db/pocketbase/provar-anexo-sobe.mjs
//
// ── O que só isto prova ──────────────────────────────────────────────────────
//
// Os testes em `__tests__/fotografia-do-anexo.test.js` provam a lógica: que a
// fotografia fica no dispositivo antes de subir, que o anexo não passa pela
// fila, que usa o `id` do servidor. Nenhum deles põe um FICHEIRO a atravessar a
// rede — e é aí que os defeitos deste género vivem: um campo com o nome errado,
// um `FormData` mal montado, um `select` que recusa «Exame» porque espera
// «exame». O PocketBase ignora campos que não conhece EM SILÊNCIO.
//
// Por isso isto sobe um ficheiro a sério e volta a pedi-lo.
import PocketBase from 'pocketbase';
import { registerHooks } from 'node:module';
import { writeFile, readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { URL, PREFIXO, comecar } from './casa-de-provas.mjs';

// O `src/sync.js` importa `'./pocketbase'` sem extensão, porque é assim que o
// Metro resolve. O Node não resolve, e a app não se muda para agradar à prova.
registerHooks({
  resolve(especificador, contexto, seguinte) {
    try { return seguinte(especificador, contexto); }
    catch (e) {
      if (especificador.startsWith('.') && !/\.[cm]?jsx?$/.test(especificador)) {
        return seguinte(especificador + '.js', contexto);
      }
      throw e;
    }
  },
});

const { configurar, auth, pb: cliente } = await import('../../src/pocketbase.js');
const { anexoDeSaude, episodioDeSaude } = await import('../../src/sync.js');

const memoria = new Map();
configurar({
  url: URL,
  storage: {
    getItem: async (k) => (memoria.has(k) ? memoria.get(k) : null),
    setItem: async (k, v) => { memoria.set(k, v); },
    removeItem: async (k) => { memoria.delete(k); },
  },
});

let ok = 0, mau = 0;
const prova = async (n, f) => {
  try { await f(); console.log(`  ✓ ${n}`); ok++; }
  catch (e) { console.log(`  ✕ ${n}\n      ${e.message}`); mau++; }
};
const igual = (a, b, o) => { if (a !== b) throw new Error(`esperava ${b}, veio ${a}${o ? ' · ' + o : ''}`); };
const recusado = async (f) => {
  try { await f(); throw new Error('PASSOU — devia ter sido recusado'); }
  catch (e) { if (/PASSOU/.test(e.message)) throw e; }
};
const como = async (id, senha) => {
  const c = new PocketBase(URL);
  await c.collection('membros').authWithPassword(id, senha);
  return c;
};

// ── Um ficheiro a sério ──────────────────────────────────────────────────────
// Um PNG de 1×1, o menor ficheiro válido que serve para provar um caminho de
// carregamento. O conteúdo não importa; o que importa é que atravessa.
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
  'base64');
const caminho = join(tmpdir(), `nossa-casa-prova-${Date.now()}.png`);
await writeFile(caminho, PNG_1x1);

// ── A casa ───────────────────────────────────────────────────────────────────
const { pb: admin } = await comecar();
const casa = await admin.collection('casas').create({ nome: PREFIXO + 'Bengui', valor_ponto: 0.1 });
const mk = (nome, papel, extra) => admin.collection('membros').create({
  nome, login: `${casa.id}_${nome}`, casa: casa.id, papel, verified: true, ...extra });
const rita = await mk('rita', 'admin', { email: 'rita@x.pt', password: 'palavra-longa-1', passwordConfirm: 'palavra-longa-1' });
const tomas = await mk('tomas', 'adulto', { email: 'tomas@x.pt', password: 'palavra-longa-2', passwordConfirm: 'palavra-longa-2' });
const leo = await mk('leo', 'crianca', { password: '1357', passwordConfirm: '1357' });

await auth.entrarAdulto('rita@x.pt', 'palavra-longa-1');

// ── 1. O episódio dá o seu id ────────────────────────────────────────────────
console.log('\n── o episódio aprende o id, que é o que o anexo precisa ──');

let episodio = null;
await prova('marcar a consulta devolve o id do servidor', async () => {
  const r = await episodioDeSaude({
    casa: casa.id, membro: leo.id, especialidade: 'Dentista',
    dia: '2026-09-20', hora: '10:00', medico: 'Dr.ª Neves', notas: 'Jejum' });
  if (!r || !r.id) throw new Error('não devolveu id: ' + JSON.stringify(r));
  episodio = r.id;
});

await prova('e o médico e a nota chegaram — os campos têm os nomes do servidor', async () => {
  // ⚠ `medico` e `notas`, não `doctor` e `nota`. O PocketBase ignora campos
  // que não conhece em silêncio: com os nomes da loja a escrita passava e os
  // dois dados caíam.
  const e = await admin.collection('episodios_saude').getOne(episodio);
  igual(e.medico, 'Dr.ª Neves');
  igual(e.notas, 'Jejum');
});

// ── 2. O ficheiro atravessa ──────────────────────────────────────────────────
console.log('\n── a fotografia atravessa a rede e volta ──');

let anexo = null;
await prova('o anexo sobe COM o ficheiro', async () => {
  const r = await anexoDeSaude({
    casa: casa.id, episodio, tipo: 'Exame', titulo: 'Radiografia',
    blob: new Blob([PNG_1x1], { type: 'image/png' }), nome: 'radiografia.png', mime: 'image/png' });
  if (!r || !r.id) throw new Error('não criou o anexo');
  anexo = r;
  if (!r.ficheiro) throw new Error('o registo subiu sem ficheiro — o FormData não levou nada');
});

await prova('⚠ e o ficheiro volta a poder ser pedido, com o tamanho certo', async () => {
  // A prova mais dura: o registo pode existir com o campo vazio, que é o modo
  // silencioso de falhar.
  const url = admin.files.getURL(anexo, anexo.ficheiro);
  const resposta = await fetch(url);
  igual(resposta.status, 200, url);
  const bytes = Buffer.from(await resposta.arrayBuffer());
  igual(bytes.length, PNG_1x1.length, `${bytes.length} bytes`);
});

await prova('o tipo foi traduzido para o que o servidor aceita', async () => {
  // O `select` do servidor tem `exame`, `receita`, `relatorio` — minúsculos e
  // sem acento. A loja fala «Exame», «Receita», «Relatório».
  igual(anexo.tipo, 'exame');
});

await prova('e um «Relatório» também', async () => {
  const r = await anexoDeSaude({
    casa: casa.id, episodio, tipo: 'Relatório', titulo: 'Relatório do dentista',
    blob: new Blob([PNG_1x1], { type: 'image/png' }), nome: 'rel.png', mime: 'image/png' });
  igual(r.tipo, 'relatorio');
});

await prova('⚠ um anexo sem episódio é recusado — seria um exame órfão', () =>
  recusado(() => anexoDeSaude({
    casa: casa.id, episodio: null, tipo: 'Exame', titulo: 'Solto',
    blob: new Blob([PNG_1x1], { type: 'image/png' }), nome: 'x.png', mime: 'image/png' })));

// ── 3. Quem vê ───────────────────────────────────────────────────────────────
console.log('\n── e só quem pode ver a ficha vê o anexo ──');

await prova('a Rita vê o anexo da criança', async () => {
  const c = await como('rita@x.pt', 'palavra-longa-1');
  const a = await c.collection('anexos').getFullList();
  if (!a.some(x => x.id === anexo.id)) throw new Error('não vê o anexo da criança');
});

await prova('o outro adulto também', async () => {
  const c = await como('tomas@x.pt', 'palavra-longa-2');
  const a = await c.collection('anexos').getFullList();
  if (!a.some(x => x.id === anexo.id)) throw new Error('não vê');
});

await prova('⚠ e o telemóvel do LÉO não recebe nenhum', async () => {
  const c = await como(`${casa.id}_leo`, '1357');
  igual((await c.collection('anexos').getFullList()).length, 0);
});

// ── 4. Fora de casa, não sobe ────────────────────────────────────────────────
console.log('\n── e para um servidor fora de casa não sobe nada ──');

await prova('o travão da conformidade recusa antes de tocar no ficheiro', async () => {
  configurar({ url: 'https://nossa-casa.exemplo.com' });
  let mensagem = null;
  try {
    await anexoDeSaude({
      casa: casa.id, episodio, tipo: 'Exame', titulo: 'Não devia subir',
      blob: new Blob([PNG_1x1], { type: 'image/png' }), nome: 'x.png', mime: 'image/png' });
  } catch (e) { mensagem = e.message; }
  configurar({ url: URL });

  // ⚠ A MENSAGEM, e não só «rebentou». Esta prova usava um `recusado()`, que
  // passa com qualquer erro — e sem travão haveria um erro de rede de qualquer
  // modo, porque o endereço não existe. Passava com o travão e sem ele: não
  // distinguia recusa de falha, que é a única coisa que aqui interessa.
  if (!mensagem) throw new Error('PASSOU — devia ter sido recusado');
  if (!/cinco pontos de conformidade/.test(mensagem)) {
    throw new Error('rebentou por outra razão, não pelo travão: ' + mensagem);
  }
});

await unlink(caminho).catch(() => {});
console.log(`\n${ok} provas passaram, ${mau} falharam.`);
process.exit(mau ? 1 : 0);
