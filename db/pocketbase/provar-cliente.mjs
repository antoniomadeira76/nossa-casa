// Prova o próprio src/pocketbase.js contra um servidor — não o SDK cru.
// É a diferença entre «o cliente está escrito» e «o cliente funciona».
//   node db/pocketbase/provar-cliente.mjs
import PocketBase from 'pocketbase';
import { URL, PREFIXO, comecar } from './casa-de-provas.mjs';
import { configurar, estaLigado, auth, ler, escrever, google } from '../../src/pocketbase.js';


// Um AsyncStorage de mentira, em memória. É para isto que o módulo aceita
// armazenamento injetado.
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

// ── Dados de prova, pelo caminho de administração ─────────────────────────────
// Casa de provas, limpa. Só o que é das provas é apagado — o que estiver
// noutra casa fica onde está.
const { pb: admin } = await comecar();
const casa = await admin.collection('casas').create({ nome: PREFIXO + 'Bengui', valor_ponto: 0.1 });
const rita = await admin.collection('membros').create({
  nome: 'rita', login: `${casa.id}_rita`, casa: casa.id, papel: 'admin',
  email: 'rita@x.pt', password: 'palavra-longa-1', passwordConfirm: 'palavra-longa-1', verified: true });
const leo = await admin.collection('membros').create({
  nome: 'leo', login: `${casa.id}_leo`, casa: casa.id, papel: 'crianca',
  password: '1357', passwordConfirm: '1357', verified: true });
await admin.collection('envelopes').create({ casa: casa.id, nome: 'Mercearia', limite_base: 550 });

// ── Provas ───────────────────────────────────────────────────────────────────
console.log('\n── a ligação é opcional ──');
await prova('sem URL, o módulo diz que não está ligado', () => {
  configurar({ storage, url: '' });
  igual(estaLigado(), false);
});
await prova('sem URL, uma leitura recusa em vez de rebentar', async () => {
  try { await ler.casa(); throw new Error('devia ter recusado'); }
  catch (e) { igual(e.message, 'Servidor não configurado.'); }
});
await prova('a fila continua a aceitar escritas offline', async () => {
  const r = await escrever.criar('cofre_movimentos', { casa: casa.id, membro: leo.id, tipo: 'bonus', valor: 1 });
  igual(r.pendentes, 1, 'a escrita não ficou em fila');
});

console.log('\n── com servidor ──');
configurar({ storage, url: URL });
await prova('agora diz que está ligado', () => igual(estaLigado(), true));

await prova('o adulto entra por e-mail', async () => {
  await auth.entrarAdulto('rita@x.pt', 'palavra-longa-1');
  igual(auth.valida(), true);
  igual(auth.membro().nome, 'rita');
});

await prova('a fila pendente esvazia ao ligar', async () => {
  const r = await escrever.esvaziar();
  igual(r.pendentes, 0, `ficaram ${r.pendentes}`);
  igual(r.enviadas, 1);
});

await prova('ler.casa() devolve as coleções', async () => {
  const d = await ler.casa();
  igual(Array.isArray(d.envelopes), true);
  igual(d.envelopes.length, 1);
  igual(d.membros.length, 2);
});

await prova('escrever.criar põe chave de idempotência sozinha', async () => {
  await escrever.criar('cofre_movimentos', { casa: casa.id, membro: leo.id, tipo: 'bonus', valor: 2 });
  const movs = await ler.colecao('cofre_movimentos');
  if (!movs.every(m => m.idem_key)) throw new Error('há movimentos sem chave');
});

await prova('o saldo é a soma das vistas, não um campo', async () => {
  const v = await ler.colecao('v_cofre_saldo');
  const doLeo = v.find(x => x.membro === leo.id);
  igual(doLeo.saldo, 3, 'os dois bónus não somaram');
});

console.log('\n── a criança, pelo mesmo cliente ──');
await prova('entra pelo login com o PIN', async () => {
  auth.sair();
  await auth.entrarCrianca(leo.login, '1357');
  igual(auth.membro().nome, 'leo');
});
await prova('e o orçamento vem VAZIO — a regra é do servidor', async () => {
  const d = await ler.casa();
  igual(d.envelopes.length, 0, 'a criança recebeu envelopes');
  igual(d.despesas.length, 0);
});
await prova('mas o cofre dela vem', async () => {
  igual((await ler.colecao('cofre_movimentos')).length, 2);
});

console.log('\n── a saúde, pelo cliente ──');
// A ficha é criada pelo caminho de administração; o que se prova é quem a lê.
const ep = await admin.collection('episodios_saude').create({
  casa: casa.id, membro: leo.id, especialidade: 'Pediatria', dia: '2026-08-28', medico: 'Dr.ª Neves' });
await admin.collection('anexos').create({
  casa: casa.id, episodio: ep.id, titulo: 'Análises', tipo: 'exame' });
const epRita = await admin.collection('episodios_saude').create({
  casa: casa.id, membro: rita.id, especialidade: 'Medicina geral', dia: '2026-07-11' });

await prova('a criança lê a sua ficha e os seus anexos', async () => {
  const f = await ler.saude(leo.id);
  igual(f.episodios.length, 1);
  igual(f.episodios[0].especialidade, 'Pediatria');
  igual(f.anexos.length, 1);
});
await prova('a criança pede a ficha da Rita e recebe VAZIO', async () => {
  const f = await ler.saude(rita.id);
  igual(f.episodios.length, 0, 'a criança viu a ficha de um adulto');
});
await prova('o adulto lê a ficha da criança', async () => {
  auth.sair();
  await auth.entrarAdulto('rita@x.pt', 'palavra-longa-1');
  const f = await ler.saude(leo.id);
  igual(f.episodios.length, 1);
  igual(f.anexos.length, 1);
});
await prova('e a sua própria', async () => igual((await ler.saude(rita.id)).episodios.length, 1));

console.log('\n── Google: o que se pode provar sem credenciais ──');
// O que precisa da Google a sério fica por verificar até haver um projeto no
// Google Cloud. O que NÃO precisa é o comportamento quando ela falta — e é aí
// que uma app costuma rebentar em vez de explicar.
await prova('o servidor anuncia se o OAuth está ligado', async () => {
  const m = await admin.collection('membros').listAuthMethods();
  igual(typeof m.oauth2.enabled, 'boolean');
  if (m.oauth2.enabled && !m.oauth2.providers.some(p => p.name === 'google')) {
    throw new Error('oauth2 ligado mas sem o provedor google');
  }
});
await prova('sem autorização da agenda, google.disponivel() é falso', () =>
  igual(google.disponivel(), false));
// A mensagem mudou com o desenho, e a prova acompanha. A autorização
// deixou de vir da entrada — vem do fluxo próprio, e o que falta agora é
// LIGAR a agenda, não entrar outra vez.
await prova('e pedir eventos explica o que fazer, em vez de rebentar', async () => {
  try { await google.eventos(); throw new Error('devia ter recusado'); }
  catch (e) { igual(e.message, 'A agenda não está ligada nesta conta.'); }
});
await prova('entrar com Google sem provedor configurado dá erro claro', async () => {
  try { await auth.entrarComGoogle(); throw new Error('devia ter recusado'); }
  catch (e) { if (/devia ter recusado/.test(e.message)) throw e; }
});

console.log(`\n${ok} provas passaram, ${mau} falharam.`);
process.exit(mau ? 1 : 0);
