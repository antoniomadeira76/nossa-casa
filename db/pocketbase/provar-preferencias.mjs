// As preferências de cada um — a regra mais apertada de todo o sistema.
//
//   node db/pocketbase/provar-preferencias.mjs
//
// ── Porque é que esta é diferente de todas as outras ─────────────────────────
//
// Todas as outras coleções são DA CASA: quem lá vive vê o que lá está, com as
// restrições do papel. Esta não. A regra é `membro = @request.auth.id` nas
// CINCO operações — cada um vê e escreve as suas, e mais ninguém.
//
// Nem quem administra. É a única coleção onde ser administrador não abre nada,
// e é de propósito: o esquema de cor do avatar do Tomás é dele.
//
// ── E o que faltava ──────────────────────────────────────────────────────────
//
// A coleção existia e ninguém escrevia nela. Quem entrasse no segundo telemóvel
// da casa encontrava a app no esquema de cor por omissão, no aspeto por
// omissão, e com os avisos por omissão — e tinha de escolher tudo outra vez.
import PocketBase from 'pocketbase';
import { registerHooks } from 'node:module';
import { URL, PREFIXO, comecar } from './casa-de-provas.mjs';

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

const { configurar, auth } = await import('../../src/pocketbase.js');
const sync = await import('../../src/sync.js');

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

// ── A casa ───────────────────────────────────────────────────────────────────
const { pb: admin } = await comecar();
const casa = await admin.collection('casas').create({ nome: PREFIXO + 'Bengui', valor_ponto: 0.1 });
const mk = (nome, papel, extra) => admin.collection('membros').create({
  nome, login: `${casa.id}_${nome}`, casa: casa.id, papel, verified: true, ...extra });
const s = (p) => ({ password: p, passwordConfirm: p });

const rita  = await mk('Rita',  'admin',   { email: 'rita@x.pt',  ...s('palavra-longa-1') });
const tomas = await mk('Tomas', 'adulto',  { email: 'tomas@x.pt', ...s('palavra-longa-2') });

await auth.entrarAdulto('rita@x.pt', 'palavra-longa-1');
const daRita = sync.sessao();

const telemovel = async (id, senha) => {
  const c = new PocketBase(URL);
  await c.collection('membros').authWithPassword(id, senha);
  return c;
};
const doTomas = await telemovel('tomas@x.pt', 'palavra-longa-2');

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── as preferências sobem, e voltam ──');

await prova('a Rita escolhe o esquema, o aspeto e os avisos', async () => {
  await sync.preferenciasDoMembro({
    membro: daRita.membro, esquemaCor: 3, aspeto: 'escuro',
    resumoAtivo: false, resumoHora: '08:30', avisoPrazoDias: 2,
  });
  const p = await admin.collection('preferencias').getFirstListItem(`membro="${daRita.membro}"`);
  // `esquema_cor` e não `scheme`; `resumo_ativo` e não `digest`. O PocketBase
  // ignora em silêncio o que não conhece.
  igual(p.esquema_cor, 3);
  igual(p.aspeto, 'escuro');
  igual(p.resumo_ativo, false);
  igual(p.resumo_hora, '08:30');
  igual(p.aviso_prazo_dias, 2);
});

await prova('⚠ e o `puxarCasa` traz tudo de volta, na forma da loja', async () => {
  const lida = await sync.puxarCasa();
  if (!lida.preferencias) throw new Error('não trouxe preferências nenhumas');
  igual(lida.preferencias.nome, 'Rita');
  igual(lida.preferencias.esquema, 3);
  igual(lida.preferencias.aspeto, 'escuro');
  igual(lida.preferencias.notif.digest, false);
  igual(lida.preferencias.notif.hour, '08:30');
  igual(lida.preferencias.notif.lead, 2);
});

await prova('⚠ e `false` e `0` não viram o valor por omissão', async () => {
  // O `resumo_ativo: false` e o `aviso_prazo_dias: 0` são escolhas VÁLIDAS. Um
  // `||` no cliente transformava-as em `true` e `1`, e desligar o resumo não
  // pegava. É o mesmo cuidado que o `divide_meias` precisou.
  await sync.preferenciasDoMembro({
    membro: daRita.membro, esquemaCor: 0, resumoAtivo: false, avisoPrazoDias: 0 });
  const lida = await sync.puxarCasa();
  igual(lida.preferencias.esquema, 0);
  igual(lida.preferencias.notif.digest, false);
  igual(lida.preferencias.notif.lead, 0);
});

await prova('⚠ escrever duas vezes ALTERA a linha — não cria uma segunda', async () => {
  // Há um índice único no `membro`. Criar às cegas colidia, e a segunda escrita
  // de cada sessão falhava — em silêncio, porque quem chama tem um `.catch`.
  await sync.preferenciasDoMembro({ membro: daRita.membro, aspeto: 'claro' });
  await sync.preferenciasDoMembro({ membro: daRita.membro, aspeto: 'sistema' });
  const todas = (await admin.collection('preferencias').getFullList())
    .filter(p => p.membro === daRita.membro);
  igual(todas.length, 1, `ficaram ${todas.length} linhas`);
  igual(todas[0].aspeto, 'sistema');
});

await prova('⚠ e alterar UM campo não apaga os outros', async () => {
  // O `update` só leva o que se mandou. Se levasse a linha inteira, mudar o
  // aspeto repunha o esquema e os avisos nos valores por omissão.
  const lida = await sync.puxarCasa();
  igual(lida.preferencias.esquema, 0);
  igual(lida.preferencias.notif.hour, '08:30');
});

await prova('um aspeto que não existe é recusado', () =>
  recusado(() => sync.preferenciasDoMembro({ membro: daRita.membro, aspeto: 'meio-claro' })));

await prova('e um esquema fora de 0–5 também', async () => {
  await recusado(() => sync.preferenciasDoMembro({ membro: daRita.membro, esquemaCor: 9 }));
  // E o valor bom continua lá — a recusa não estragou nada.
  igual((await sync.puxarCasa()).preferencias.esquema, 0);
});

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── ⚠ e são de cada um, e de mais ninguém ──');

await prova('o Tomás escolhe as dele, e são outras', async () => {
  await doTomas.collection('preferencias').create({
    membro: tomas.id, esquema_cor: 5, aspeto: 'claro' });
  const dele = (await admin.collection('preferencias').getFullList())
    .find(p => p.membro === tomas.id);
  igual(dele.esquema_cor, 5);
});

await prova('⚠ a Rita NÃO vê as do Tomás — e ela ADMINISTRA a casa', async () => {
  // É a única coleção onde ser administrador não abre nada. Não é um descuido:
  // a cor do avatar dele é dele.
  const dela = await telemovel('rita@x.pt', 'palavra-longa-1');
  const v = await dela.collection('preferencias').getFullList();
  igual(v.length, 1, 'devia ver só a dela');
  igual(v[0].membro, daRita.membro);
});

await prova('⚠ nem pedindo pelo id, que é a porta do lado', async () => {
  const doTomasPref = (await admin.collection('preferencias').getFullList())
    .find(p => p.membro === tomas.id);
  const dela = await telemovel('rita@x.pt', 'palavra-longa-1');
  await recusado(() => dela.collection('preferencias').getOne(doTomasPref.id));
});

await prova('⚠ e não as altera nem apaga', async () => {
  const doTomasPref = (await admin.collection('preferencias').getFullList())
    .find(p => p.membro === tomas.id);
  const dela = await telemovel('rita@x.pt', 'palavra-longa-1');
  await recusado(() => dela.collection('preferencias').update(doTomasPref.id, { esquema_cor: 0 }));
  await recusado(() => dela.collection('preferencias').delete(doTomasPref.id));
  // As dele ficaram como estavam.
  igual((await admin.collection('preferencias').getOne(doTomasPref.id)).esquema_cor, 5);
});

await prova('⚠ e ninguém cria uma linha em nome de outra pessoa', async () => {
  const dela = await telemovel('rita@x.pt', 'palavra-longa-1');
  await recusado(() => dela.collection('preferencias').create({
    membro: tomas.id, esquema_cor: 1, aspeto: 'escuro' }));
});

await prova('⚠ e uma vizinha não vê nada disto', async () => {
  const outra = await admin.collection('casas').create({ nome: PREFIXO + 'Outra', valor_ponto: 0.1 });
  await admin.collection('membros').create({
    nome: 'Vizinha', login: `${outra.id}_Vizinha`, casa: outra.id, papel: 'admin',
    email: 'viz-pref@x.pt', ...s('palavra-longa-9'), verified: true });
  const cVizinha = await telemovel('viz-pref@x.pt', 'palavra-longa-9');
  igual((await cVizinha.collection('preferencias').getFullList()).length, 0);
});

console.log(`\n${ok} provas passaram, ${mau} falharam.`);
process.exit(mau ? 1 : 0);
