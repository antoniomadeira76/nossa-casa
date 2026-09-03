// Aceitação: uma consulta marcada na app chega ao servidor — e não chega a
// quem não a pode ver.
//
//   node db/pocketbase/provar-saude-sobe.mjs
//
// ── O que isto prova, e as outras não ────────────────────────────────────────
//
// `provar-saude.mjs` prova as REGRAS contra o SDK cru. Os testes em `__tests__`
// provam a condição `eEnderecoDeCasa` e que o travão a chama. Nenhuma das duas
// prova o caminho todo: a app marca a consulta, o `sync` decide, a fila envia,
// o servidor aceita, e o telemóvel de cada pessoa recebe o que lhe compete.
//
// É esse caminho que isto percorre, pelo `src/sync.js` — o mesmo ficheiro que a
// app importa, sem interface pelo meio.
//
// ── E o que continua a não subir ─────────────────────────────────────────────
//
// Os documentos, as notas, as receitas e as decisões. Um documento leva
// ficheiro anexo, e é dessa peça que os cinco pontos do db/postgres/README.md
// mais falam. Sobe a consulta; o que está pendurado nela, não.
import PocketBase from 'pocketbase';
import { registerHooks } from 'node:module';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { URL, PREFIXO, comecar } from './casa-de-provas.mjs';
// O src/sync.js importa './pocketbase' sem extensao, porque e assim que o
// Metro resolve. O Node nao resolve, e a app nao se muda para agradar a prova
// — esta escrito no provar-gerir-casa-pela-app.mjs, que usa este mesmo gancho.
registerHooks({
  resolve(especificador, contexto, seguinte) {
    try { return seguinte(especificador, contexto); }
    catch (e) {
      if (especificador.startsWith('.') && !/.[cm]?jsx?$/.test(especificador)) {
        return seguinte(especificador + '.js', contexto);
      }
      throw e;
    }
  },
});

const { configurar, auth } = await import('../../src/pocketbase.js');
const { episodioDeSaude, saudeSincroniza, recusaSaude, eEnderecoDeCasa,
        NUNCA_SINCRONIZA, pendentes, esvaziar } = await import('../../src/sync.js');

const memoria = new Map();
const storage = {
  getItem: async (k) => (memoria.has(k) ? memoria.get(k) : null),
  setItem: async (k, v) => { memoria.set(k, v); },
  removeItem: async (k) => { memoria.delete(k); },
};

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

// ── A casa ───────────────────────────────────────────────────────────────────
const { pb: admin } = await comecar();
const casa = await admin.collection('casas').create({ nome: PREFIXO + 'Bengui', valor_ponto: 0.1 });
const mk = (nome, papel, extra) => admin.collection('membros').create({
  nome, login: `${casa.id}_${nome}`, casa: casa.id, papel, verified: true, ...extra });
const rita = await mk('rita', 'admin', { email: 'rita@x.pt', password: 'palavra-longa-1', passwordConfirm: 'palavra-longa-1' });
const tomas = await mk('tomas', 'adulto', { email: 'tomas@x.pt', password: 'palavra-longa-2', passwordConfirm: 'palavra-longa-2' });
const leo = await mk('leo', 'crianca', { password: '1357', passwordConfirm: '1357' });

// ── 1. O travão, antes de qualquer coisa ─────────────────────────────────────
console.log('\n── o travão decide pelo ENDEREÇO, não pela intenção ──');

await prova('com o servidor FORA de casa, a saúde não sobe', async () => {
  configurar({ storage, url: 'https://nossa-casa.exemplo.com' });
  igual(saudeSincroniza(), false);
  await recusado(() => episodioDeSaude({
    casa: casa.id, membro: leo.id, especialidade: 'Dentista', dia: '2026-09-20' }));
});

await prova('e sem servidor nenhum também não', async () => {
  configurar({ storage, url: undefined });
  igual(saudeSincroniza(), false);
  await recusado(() => recusaSaude('episodios_saude'));
});

await prova('com o servidor em casa, sobe', () => {
  configurar({ storage, url: URL });
  // A casa de provas corre em 127.0.0.1, que é o caso de casa.
  igual(eEnderecoDeCasa(URL), true, URL);
  igual(saudeSincroniza(), true);
});

// ── 2. O caminho todo ────────────────────────────────────────────────────────
console.log('\n── a consulta marcada na app chega ao servidor ──');

await auth.entrarAdulto('rita@x.pt', 'palavra-longa-1');

await prova('a Rita marca uma consulta ao Léo e ela fica no servidor', async () => {
  const r = await episodioDeSaude({
    casa: casa.id, membro: leo.id, especialidade: 'Dentista', dia: '2026-09-20', hora: '10:00' });
  igual(r.pendentes, 0, 'ficou pendente em vez de subir');
  const cRita = await como('rita@x.pt', 'palavra-longa-1');
  const v = await cRita.collection('episodios_saude').getFullList();
  igual(v.length, 1);
  igual(v[0].especialidade, 'Dentista');
  igual(v[0].membro, leo.id);
});

await prova('o outro adulto também a vê — é a ficha de uma criança', async () => {
  const cTomas = await como('tomas@x.pt', 'palavra-longa-2');
  const v = await cTomas.collection('episodios_saude').getFullList();
  igual(v.length, 1);
});

await prova('⚠ e o telemóvel do LÉO não a recebe', async () => {
  // O ponto todo do INVARIANTE #3: não é a interface a esconder — a consulta
  // não vem na resposta.
  const cLeo = await como(`${casa.id}_leo`, '1357');
  const v = await cLeo.collection('episodios_saude').getFullList();
  igual(v.length, 0, v.map(x => x.especialidade).join('/'));
});

await prova('a consulta de um ADULTO é só dele, nem o outro adulto a vê', async () => {
  await auth.entrarAdulto('rita@x.pt', 'palavra-longa-1');
  await episodioDeSaude({
    casa: casa.id, membro: rita.id, especialidade: 'Medicina geral', dia: '2026-09-22' });
  const cTomas = await como('tomas@x.pt', 'palavra-longa-2');
  const v = await cTomas.collection('episodios_saude').getFullList();
  igual(v.filter(x => x.membro === rita.id).length, 0, 'o Tomás viu a ficha da Rita');
  const cRita = await como('rita@x.pt', 'palavra-longa-1');
  igual((await cRita.collection('episodios_saude').getFullList())
    .filter(x => x.membro === rita.id).length, 1);
});

// ── 3. Sem rede ──────────────────────────────────────────────────────────────
console.log('\n── uma consulta marcada sem rede não se perde ──');

await prova('fica na fila e sobe ao reconectar', async () => {
  // Marcar com o servidor inalcançável: o endereço continua a ser de casa,
  // portanto o travão deixa passar — o que falha é a rede, não a regra.
  configurar({ storage, url: 'http://127.0.0.1:1' });
  await auth.entrarAdulto('rita@x.pt', 'palavra-longa-1').catch(() => {});
  await episodioDeSaude({
    casa: casa.id, membro: leo.id, especialidade: 'Oftalmologia', dia: '2026-09-25' }).catch(() => {});
  const naFila = await pendentes();
  if (naFila < 1) throw new Error('a consulta não ficou na fila');

  // De volta a casa: a fila esvazia.
  configurar({ storage, url: URL });
  await auth.entrarAdulto('rita@x.pt', 'palavra-longa-1');
  await esvaziar();
  igual(await pendentes(), 0, 'a fila não esvaziou');
  const cRita = await como('rita@x.pt', 'palavra-longa-1');
  const v = await cRita.collection('episodios_saude').getFullList();
  if (!v.some(x => x.especialidade === 'Oftalmologia')) throw new Error('a consulta não chegou');
});

// ── 4. O que continua a não subir ────────────────────────────────────────────
console.log('\n── e o que fica no dispositivo, mesmo com o servidor em casa ──');

// ⚠ O nome desta prova dizia «os anexos continuam travados» e o que ela
// afirmava era que PASSAM — um nome a dizer o contrário do que a prova mede é
// pior do que nenhuma prova. O que prende os anexos não é o travão de
// conformidade: com o endereço de casa, o `recusaSaude` deixa-os passar. O que
// os prende é não existir caminho de escrita nenhum no cliente.
await prova('os anexos não têm caminho de escrita no cliente — é isso que os prende', async () => {
  configurar({ storage, url: URL });
  igual(recusaSaude('anexos'), 'anexos', 'o travão de conformidade deixa-os passar, e é o esperado');

  // ⚠ Pelo caminho, e não por `new URL(...)`: o `URL` importado da casa de
  // provas é o endereço do servidor, uma string, e tapa o `URL` global —
  // «URL is not a constructor». Um nome importado que colide com um global é
  // um erro que só aparece quando alguém usa o global.
  const sync = await readFile(join(import.meta.dirname, '../../src/sync.js'), 'utf8');
  const semComentarios = sync
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '');
  if (/escrever\.criar\(\s*['"]anexos['"]/.test(semComentarios)) {
    throw new Error('alguém escreveu um caminho de escrita para anexos');
  }
  // E quando esse caminho existir, tem de nascer a partir do travão — como o
  // `episodioDeSaude` nasce.
  if (!/recusaSaude\('episodios_saude'\)/.test(semComentarios)) {
    throw new Error('o episodioDeSaude deixou de passar pelo travão');
  }
});

await prova('as notas, as receitas e os documentos estão na lista do que nunca sobe', () => {
  for (const k of ['healthNotes', 'healthRecipes', 'healthDecisions', 'healthDocs', 'healthGone']) {
    if (!NUNCA_SINCRONIZA.includes(k)) throw new Error(`${k} saiu da lista`);
  }
});

await prova('e `health` já não está nela, porque sobe sob condição', () => {
  if (NUNCA_SINCRONIZA.includes('health')) throw new Error('health ainda está na lista');
});

console.log(`\n${ok} provas passaram, ${mau} falharam.`);
process.exit(mau ? 1 : 0);
