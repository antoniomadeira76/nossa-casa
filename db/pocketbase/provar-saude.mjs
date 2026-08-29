// A §5 chama à visibilidade das fichas de saúde «a regra mais restritiva do
// sistema, e a que mais tem de ser testada». É o que este ficheiro faz.
//
//   ficha de ADULTO   → só o próprio. Nem o companheiro, nem a administração.
//   ficha de CRIANÇA  → os adultos da casa; a criança lê a sua, não a escreve.
//
//   node db/pocketbase/provar-saude.mjs
import PocketBase from 'pocketbase';

const URL = process.env.PB_URL || 'http://127.0.0.1:8095';
const admin = new PocketBase(URL);
await admin.collection('_superusers').authWithPassword('admin@nossacasa.local', 'casa-de-testes-123');

for (const c of ['anexos', 'episodios_saude', 'membros', 'casas']) {
  for (const r of await admin.collection(c).getFullList()) await admin.collection(c).delete(r.id).catch(() => {});
}

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

const casa = await admin.collection('casas').create({ nome: 'Bengui', valor_ponto: 0.1 });
const mk = (nome, papel, extra) => admin.collection('membros').create({
  nome, login: `${casa.id}_${nome}`, casa: casa.id, papel, ...extra,
});
const s = (p) => ({ password: p, passwordConfirm: p });

const rita  = await mk('rita',  'admin',   { email: 'rita@x.pt',  ...s('palavra-longa-1'), verified: true });
const tomas = await mk('tomas', 'adulto',  { email: 'tomas@x.pt', ...s('palavra-longa-2'), verified: true });
const leo   = await mk('leo',   'crianca', { ...s('1357'), verified: true });

const ep = (membro, especialidade) => admin.collection('episodios_saude').create({
  casa: casa.id, membro, especialidade, dia: '2026-08-28', medico: 'Dr. Cardoso',
});
const epRita  = await ep(rita.id,  'Medicina geral');
const epTomas = await ep(tomas.id, 'Dermatologia');
const epLeo   = await ep(leo.id,   'Pediatria');
await admin.collection('anexos').create({ casa: casa.id, episodio: epTomas.id, titulo: 'Análises do Tomás', tipo: 'exame' });
await admin.collection('anexos').create({ casa: casa.id, episodio: epLeo.id, titulo: 'Análises do Léo', tipo: 'exame' });

const cRita  = await como('rita@x.pt',  'palavra-longa-1');
const cTomas = await como('tomas@x.pt', 'palavra-longa-2');
const cLeo   = await como(leo.login, '1357');

console.log('\n── a ficha de um adulto é só dele ──');
await prova('a Rita (administradora) NÃO vê a ficha do Tomás', async () => {
  const v = await cRita.collection('episodios_saude').getFullList();
  const dele = v.filter(x => x.membro === tomas.id);
  igual(dele.length, 0, v.map(x => x.especialidade).join('/'));
});
await prova('nem por acesso direto ao registo', () =>
  recusado(() => cRita.collection('episodios_saude').getOne(epTomas.id)));
await prova('o Tomás vê a sua', async () => {
  const v = await cTomas.collection('episodios_saude').getFullList();
  if (!v.some(x => x.membro === tomas.id)) throw new Error('não vê a própria ficha');
});
await prova('o Tomás NÃO vê a da Rita', async () => {
  const v = await cTomas.collection('episodios_saude').getFullList();
  igual(v.filter(x => x.membro === rita.id).length, 0);
});

console.log('\n── a ficha de uma criança é dos adultos ──');
await prova('a Rita vê a ficha do Léo', async () => {
  const v = await cRita.collection('episodios_saude').getFullList();
  if (!v.some(x => x.membro === leo.id)) throw new Error('não vê a ficha da criança');
});
await prova('o Tomás também', async () => {
  const v = await cTomas.collection('episodios_saude').getFullList();
  if (!v.some(x => x.membro === leo.id)) throw new Error('não vê a ficha da criança');
});
await prova('o Léo lê a sua', async () => {
  const v = await cLeo.collection('episodios_saude').getFullList();
  igual(v.length, 1);
  igual(v[0].especialidade, 'Pediatria');
});
await prova('o Léo NÃO vê a de nenhum adulto', async () => {
  const v = await cLeo.collection('episodios_saude').getFullList();
  igual(v.filter(x => x.membro !== leo.id).length, 0);
});
await prova('o Léo não escreve na sua própria ficha', () =>
  recusado(() => cLeo.collection('episodios_saude').create({
    casa: casa.id, membro: leo.id, especialidade: 'Inventada', dia: '2026-09-01' })));
await prova('o Léo não apaga a sua própria ficha', () =>
  recusado(() => cLeo.collection('episodios_saude').delete(epLeo.id)));

console.log('\n── os anexos herdam a regra do episódio ──');
await prova('a Rita não vê o anexo do Tomás', async () => {
  const a = await cRita.collection('anexos').getFullList();
  igual(a.filter(x => x.episodio === epTomas.id).length, 0, a.map(x => x.titulo).join('/'));
});
await prova('a Rita vê o anexo do Léo', async () => {
  const a = await cRita.collection('anexos').getFullList();
  if (!a.some(x => x.episodio === epLeo.id)) throw new Error('não vê o anexo da criança');
});
await prova('o Léo vê o seu anexo e mais nenhum', async () => {
  const a = await cLeo.collection('anexos').getFullList();
  igual(a.length, 1);
  igual(a[0].titulo, 'Análises do Léo');
});

console.log('\n── §5: a transição de papel reavalia RETROATIVAMENTE ──');
await prova('o Léo a passar a adulto tira a ficha da vista dos pais', async () => {
  // A ficha continua a mesma; muda só o papel do dono.
  await admin.collection('membros').update(leo.id, { papel: 'adulto', email: 'leo@x.pt' });
  const v = await cRita.collection('episodios_saude').getFullList();
  igual(v.filter(x => x.membro === leo.id).length, 0, 'a ficha ainda é visível aos pais');
  const a = await cRita.collection('anexos').getFullList();
  igual(a.filter(x => x.episodio === epLeo.id).length, 0, 'o anexo ainda é visível');
});
await prova('e ele continua a ver a sua', async () => {
  const c = await como('leo@x.pt', '1357');
  igual((await c.collection('episodios_saude').getFullList()).length, 1);
});

console.log(`\n${ok} provas passaram, ${mau} falharam.`);
process.exit(mau ? 1 : 0);
