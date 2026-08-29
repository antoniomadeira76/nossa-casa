// Prova os hooks: qualidade do PIN, força da palavra-passe de adulto,
// minimização e as guardas de papel. Um hook por testar é um hook que não existe.
//   node db/pocketbase/provar-hooks.mjs
import PocketBase from 'pocketbase';

const pb = new PocketBase(process.env.PB_URL || 'http://127.0.0.1:8095');
await pb.collection('_superusers').authWithPassword('admin@nossacasa.local', 'casa-de-testes-123');

for (const c of ['cofre_movimentos', 'despesas', 'eventos', 'membros', 'casas']) {
  for (const r of await pb.collection(c).getFullList()) await pb.collection(c).delete(r.id).catch(() => {});
}

let ok = 0, mau = 0;
const prova = async (n, f) => {
  try { await f(); console.log(`  ✓ ${n}`); ok++; }
  catch (e) { console.log(`  ✕ ${n}\n      ${e.message}`); mau++; }
};
const recusado = async (f) => {
  try { await f(); throw new Error('PASSOU — devia ter sido recusado'); }
  catch (e) { if (/PASSOU/.test(e.message)) throw e; }
};

const casa = await pb.collection('casas').create({ nome: 'Prova', valor_ponto: 0.1 });
const mk = (nome, papel, extra) => pb.collection('membros').create({
  nome, login: `${casa.id}_${nome}`, casa: casa.id, papel, ...extra,
});
const senha = (p) => ({ password: p, passwordConfirm: p });

console.log('\n── qualidade do PIN ──');
await prova('quatro dígitos iguais recusados', () => recusado(() => mk('a', 'crianca', senha('1111'))));
await prova('sequência recusada',              () => recusado(() => mk('b', 'crianca', senha('1234'))));
await prova('sequência invertida recusada',    () => recusado(() => mk('b2', 'crianca', senha('4321'))));
await prova('letras recusadas',                () => recusado(() => mk('c', 'crianca', senha('12ab'))));
let leo;
await prova('PIN válido aceite', async () => { leo = await mk('leo', 'crianca', senha('1357')); });

console.log('\n── palavra-passe de adulto ──');
await prova('adulto com 4 caracteres recusado',
  () => recusado(() => mk('d', 'adulto', { email: 'd@x.pt', ...senha('1357') })));
let rita;
await prova('adulto com palavra longa aceite', async () => {
  rita = await mk('rita', 'admin', { email: 'r@x.pt', ...senha('palavra-longa-1') });
});

console.log('\n── §8: minimização ──');
await prova('criança com e-mail recusada',
  () => recusado(() => mk('e', 'crianca', { email: 'e@x.pt', ...senha('1357') })));
await prova('criança sem e-mail: é assim que fica', () => {
  if (leo.email) throw new Error('a criança ficou com e-mail');
});

console.log('\n── §4: guardas de papel ──');
await prova('despromover o último administrador recusado',
  () => recusado(() => pb.collection('membros').update(rita.id, { papel: 'adulto' })));
await prova('adulto → criança recusado', async () => {
  const t = await mk('tomas', 'adulto', { email: 't@x.pt', ...senha('palavra-longa-2') });
  await recusado(() => pb.collection('membros').update(t.id, { papel: 'crianca' }));
});
await prova('com dois administradores, despromover um é permitido', async () => {
  const t = (await pb.collection('membros').getFullList()).find(m => m.nome === 'tomas');
  await pb.collection('membros').update(t.id, { papel: 'admin' });
  await pb.collection('membros').update(rita.id, { papel: 'adulto' });
});

console.log(`\n${ok} provas passaram, ${mau} falharam.`);
process.exit(mau ? 1 : 0);
