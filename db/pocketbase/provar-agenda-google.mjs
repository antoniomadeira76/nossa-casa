// A autorização da agenda da Google — o que NÃO pode acontecer.
//
// O ponto todo do `pb_hooks/agenda-google.pb.js` é o refresh token nunca sair
// do servidor. Uma revisão a ler o código diz que sim; estas provas tentam
// tirá-lo por todos os caminhos que a API oferece, e falham se algum funcionar.
//
//   node db/pocketbase/provar-agenda-google.mjs
import PocketBase from 'pocketbase';
import { URL, comecar, criarCasa, criarMembro } from './casa-de-provas.mjs';

let ok = 0, mau = 0;
const prova = async (titulo, fn) => {
  try { await fn(); console.log(`  ✓ ${titulo}`); ok++; }
  catch (e) { console.error(`  ✗ ${titulo}\n      ${e.message}`); mau++; }
};

// Uma operação que TEM de falhar. Se passar, é o defeito.
const recusa = async (titulo, fn) => prova(titulo, async () => {
  let passou = false;
  try { await fn(); passou = true; } catch { /* era o esperado */ }
  if (passou) throw new Error('a operação passou, e não devia');
});

const { pb: admin } = await comecar();

const casa = await criarCasa(admin, 'agenda-google');
const rita = await criarMembro(admin, casa, 'Rita', 'admin',
  { email: 'rita.agenda@exemplo.pt', password: 'palavra-de-provas-1', passwordConfirm: 'palavra-de-provas-1', verified: true });
const tomas = await criarMembro(admin, casa, 'Tomás', 'adulto',
  { email: 'tomas.agenda@exemplo.pt', password: 'palavra-de-provas-2', passwordConfirm: 'palavra-de-provas-2', verified: true });

// Uma credencial a sério, posta pelo administrador — é o que o hook faria.
const SEGREDO = 'refresh-token-de-provas-NUNCA-DEVE-SAIR';
const linha = await admin.collection('credenciais_agenda').create({
  membro: rita.id, refresh_token: SEGREDO,
});

const comoRita = new PocketBase(URL);
await comoRita.collection('membros').authWithPassword('rita.agenda@exemplo.pt', 'palavra-de-provas-1');
const comoTomas = new PocketBase(URL);
await comoTomas.collection('membros').authWithPassword('tomas.agenda@exemplo.pt', 'palavra-de-provas-2');

console.log('\n── o refresh token não sai pela API ──');

await recusa('a dona não lista as suas credenciais',
  () => comoRita.collection('credenciais_agenda').getFullList());

await recusa('a dona não lê a sua própria linha',
  () => comoRita.collection('credenciais_agenda').getOne(linha.id));

await recusa('o outro adulto da casa não lê a linha dela',
  () => comoTomas.collection('credenciais_agenda').getOne(linha.id));

await recusa('a dona não escreve uma linha nova',
  () => comoRita.collection('credenciais_agenda').create({ membro: rita.id, refresh_token: 'meu' }));

await recusa('a dona não altera a linha dela',
  () => comoRita.collection('credenciais_agenda').update(linha.id, { refresh_token: 'outro' }));

await recusa('a dona não apaga a linha dela',
  () => comoRita.collection('credenciais_agenda').delete(linha.id));

await recusa('ninguém lê sem sessão nenhuma',
  () => new PocketBase(URL).collection('credenciais_agenda').getFullList());

// Um filtro é um canal de leitura por si só: pode não devolver a linha e
// mesmo assim dizer se ela existe, uma resposta de cada vez.
await recusa('nem por adivinha, um caractere de cada vez',
  () => comoRita.collection('credenciais_agenda')
    .getFullList({ filter: 'refresh_token ~ "refresh-token%"' }));

console.log('\n── as rotas da agenda ──');

const chamar = async (metodo, caminho, token) => {
  const r = await fetch(`${URL}${caminho}`, {
    method: metodo,
    headers: token ? { Authorization: token } : {},
    redirect: 'manual',
  });
  return { estado: r.status, corpo: await r.text(), cabecalhos: r.headers };
};

await prova('sem sessão, /token recusa', async () => {
  const r = await chamar('POST', '/api/agenda/token');
  if (r.estado !== 401) throw new Error(`devolveu ${r.estado}, esperava 401`);
});

await prova('sem sessão, /estado recusa', async () => {
  const r = await chamar('GET', '/api/agenda/estado');
  if (r.estado !== 401) throw new Error(`devolveu ${r.estado}, esperava 401`);
});

await prova('/estado diz «ligada» a quem tem credencial', async () => {
  const r = await chamar('GET', '/api/agenda/estado', comoRita.authStore.token);
  const d = JSON.parse(r.corpo);
  if (d.ligada !== true) throw new Error(`disse ${JSON.stringify(d)}`);
});

await prova('/estado nunca devolve o token, só o sim ou não', async () => {
  const r = await chamar('GET', '/api/agenda/estado', comoRita.authStore.token);
  if (r.corpo.includes(SEGREDO)) throw new Error('a resposta traz o refresh token');
  if (/refresh/i.test(r.corpo)) throw new Error('a resposta fala de refresh token');
});

await prova('/estado diz «não ligada» a quem não tem', async () => {
  const r = await chamar('GET', '/api/agenda/estado', comoTomas.authStore.token);
  const d = JSON.parse(r.corpo);
  if (d.ligada !== false) throw new Error(`disse ${JSON.stringify(d)}`);
});

await prova('quem não ligou a agenda não recebe token', async () => {
  const r = await chamar('POST', '/api/agenda/token', comoTomas.authStore.token);
  if (r.estado !== 404) throw new Error(`devolveu ${r.estado}, esperava 404`);
  if (r.corpo.includes(SEGREDO)) throw new Error('a resposta traz o refresh token de outra pessoa');
});

console.log('\n── o consentimento pede offline, que é o ponto de tudo isto ──');

await prova('/ligar devolve um endereço da Google com access_type=offline', async () => {
  const r = await chamar('POST', '/api/agenda/ligar', comoRita.authStore.token);
  if (r.estado !== 200) throw new Error(`devolveu ${r.estado}, esperava 200`);
  const destino = JSON.parse(r.corpo).url || '';
  if (!destino.startsWith('https://accounts.google.com/')) {
    throw new Error(`manda para ${destino.slice(0, 60)}`);
  }
  // Sem isto a Google NÃO emite refresh token, e todo o desenho cai. Foi
  // exactamente o que faltava ao fluxo do PocketBase.
  if (!/access_type=offline/.test(destino)) throw new Error('falta access_type=offline');
  // Sem isto, quem já tinha autorizado volta sem refresh token novo.
  if (!/prompt=consent/.test(destino)) throw new Error('falta prompt=consent');
});

await prova('o endereço do consentimento não leva o segredo do cliente', async () => {
  const r = await chamar('POST', '/api/agenda/ligar', comoRita.authStore.token);
  const destino = JSON.parse(r.corpo).url || '';
  // Um endereço vazio passaria neste teste sem nada provar. Já passou.
  if (!destino.startsWith('https://accounts.google.com/')) throw new Error('não há endereço para verificar');
  if (/client_secret/.test(destino)) throw new Error('o segredo vai no endereço');
});

await prova('/ligar guarda um estado ligado a quem pediu', async () => {
  const r = await chamar('POST', '/api/agenda/ligar', comoTomas.authStore.token);
  const destino = JSON.parse(r.corpo).url || '';
  const estado = new global.URL(destino).searchParams.get('state');
  if (!estado || estado.length < 20) throw new Error('estado ausente ou curto de mais');
  const guardado = await admin.collection('credenciais_agenda')
    .getFirstListItem(`membro = "${tomas.id}"`);
  if (guardado.estado !== estado) throw new Error('o estado guardado não é o que foi enviado');
});

await prova('um retorno com estado inventado é recusado', async () => {
  const r = await chamar('GET', '/api/agenda/retorno?code=abc&state=inventado-por-mim');
  if (r.estado === 200) throw new Error('aceitou um estado que ninguém emitiu');
});

await prova('um retorno sem código é recusado', async () => {
  const r = await chamar('GET', '/api/agenda/retorno?state=seja-o-que-for');
  if (r.estado === 200) throw new Error('aceitou um retorno sem código');
});

// Limpeza: as linhas de credenciais não pertencem a nenhuma casa, portanto a
// limpeza normal não lhes chega.
for (const m of [rita.id, tomas.id]) {
  const linhas = await admin.collection('credenciais_agenda')
    .getFullList({ filter: `membro = "${m}"` }).catch(() => []);
  for (const l of linhas) await admin.collection('credenciais_agenda').delete(l.id).catch(() => {});
}

console.log(`\n${mau ? '✗' : '✓'} ${ok} provas passaram, ${mau} falharam`);
process.exit(mau ? 1 : 0);
