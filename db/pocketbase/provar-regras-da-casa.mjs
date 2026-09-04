// As regras da casa viajam entre telemóveis.
//
//   node db/pocketbase/provar-regras-da-casa.mjs
//
// ── O que se encontrou ───────────────────────────────────────────────────────
//
// O valor do ponto, o dia de pagamento, a divisão a meias, o interruptor dos
// pontos, os papéis e os PINs viviam só no telefone de quem os mudou:
//
//   a Rita desligava os pontos e o Tomás continuava a vê-los
//   ela mudava o valor do ponto e os dois pagavam semanadas diferentes
//   ela promovia o Tomás e o SERVIDOR continuava a recusar-lhe a Gestão
//   ela punha o PIN do Léo e ele não conseguia entrar no telefone dele
//
// O último é o mais claro de todos: o papel e o PIN decidem o que o servidor
// devolve. Mudá-los só no cliente não muda nada de facto — muda a aparência.
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
const casa = await admin.collection('casas').create({
  nome: PREFIXO + 'Bengui', valor_ponto: 0.1, dia_pagamento: 0,
  divide_meias: true, pontos_ligados: true, rendimento_mensal: 3200,
});
const mk = (nome, papel, extra) => admin.collection('membros').create({
  nome, login: `${casa.id}_${nome}`, casa: casa.id, papel, verified: true, ...extra });
const s = (p) => ({ password: p, passwordConfirm: p });

const rita  = await mk('Rita',  'admin',   { email: 'rita@x.pt',  ...s('palavra-longa-1') });
const tomas = await mk('Tomas', 'adulto',  { email: 'tomas@x.pt', ...s('palavra-longa-2') });
const leo   = await mk('Leo',   'crianca', { ...s('1357') });

await auth.entrarAdulto('rita@x.pt', 'palavra-longa-1');
const daRita = sync.sessao();

const telemovel = async (id, senha) => {
  const c = new PocketBase(URL);
  await c.collection('membros').authWithPassword(id, senha);
  return c;
};
const doTomas = await telemovel('tomas@x.pt', 'palavra-longa-2');

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── as regras da casa mudam para os dois ──');

await prova('o `puxarCasa` traz as regras na forma da loja', async () => {
  const lida = await sync.puxarCasa();
  if (!lida.regras) throw new Error('não trouxe regras nenhumas');
  igual(lida.regras.pointValue, 0.1);
  igual(lida.regras.payDay, 0);
  igual(lida.regras.splitHalf, true);
  igual(lida.regras.pontosLigados, true);
  igual(lida.regras.rendimento, 3200);
});

await prova('⚠ e os NOMES traduzem-se — é onde um erro se esconde', async () => {
  // `valor_ponto` e não `pointValue`; `divide_meias` e não `splitHalf`. O
  // PocketBase ignora em silêncio o que não conhece: um nome errado aqui é uma
  // regra que a casa julga ter mudado e não mudou.
  await sync.regrasDaCasa(daRita.casa, { pointValue: 0.25, payDay: 5 });
  const c = await admin.collection('casas').getOne(casa.id);
  igual(c.valor_ponto, 0.25);
  igual(c.dia_pagamento, 5);
});

await prova('⚠ o telemóvel do Tomás vê o valor novo', async () => {
  const c = (await doTomas.collection('casas').getFullList())[0];
  igual(c.valor_ponto, 0.25);
});

await prova('⚠ o valor do ponto pode ser 0 — os pontos são opcionais', async () => {
  // O servidor tinha `min: 0.01`, e a app passou a deixar descer a 0 em
  // 04/09/2026. A escolha era aceite no telefone e recusada ao subir: a mesma
  // falha silenciosa do `tarefas_feitas`, com a regra mais apertada do que a
  // app.
  await sync.regrasDaCasa(daRita.casa, { pointValue: 0 });
  igual((await admin.collection('casas').getOne(casa.id)).valor_ponto, 0);
});

await prova('mas acima de 5 continua recusado', () =>
  recusado(() => sync.regrasDaCasa(daRita.casa, { pointValue: 9 })));

await prova('⚠ desligar os pontos desliga-os para os DOIS', async () => {
  await sync.regrasDaCasa(daRita.casa, { pontosLigados: false });
  const c = (await doTomas.collection('casas').getFullList())[0];
  igual(c.pontos_ligados, false);
  // E volta a ligar.
  await sync.regrasDaCasa(daRita.casa, { pontosLigados: true });
  igual((await doTomas.collection('casas').getFullList())[0].pontos_ligados, true);
});

await prova('⚠ e `false` não vira o valor por omissão ao voltar', async () => {
  // Um `||` no cliente transformava `divide_meias: false` em `true`: desligar a
  // divisão a meias no servidor não pegava. É preciso `??`, e é o mesmo cuidado
  // que o `pontos_ligados` e o `valor_ponto: 0` precisam.
  await sync.regrasDaCasa(daRita.casa, { splitHalf: false, pointValue: 0, pontosLigados: false });
  const lida = await sync.puxarCasa();
  igual(lida.regras.splitHalf, false);
  igual(lida.regras.pointValue, 0);
  igual(lida.regras.pontosLigados, false);
  // repõe-se, para as provas seguintes
  await sync.regrasDaCasa(daRita.casa, { splitHalf: true, pointValue: 0.1, pontosLigados: true });
});

console.log('\n── e quem as pode mudar ──');

await prova('⚠ o Tomás, que é adulto e não administra, NÃO muda as regras', () =>
  recusado(() => doTomas.collection('casas').update(casa.id, { valor_ponto: 5 })));

await prova('⚠ nem uma criança', async () => {
  const doLeo = await telemovel(leo.login, '1357');
  await recusado(() => doLeo.collection('casas').update(casa.id, { valor_ponto: 5 }));
});

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── os papéis: mudam de facto, não só de aparência ──');

await prova('a Rita promove o Tomás a administrador', async () => {
  await sync.editarMembro(tomas.id, { papel: 'admin' });
  igual((await admin.collection('membros').getOne(tomas.id)).papel, 'admin');
});

await prova('⚠ e o SERVIDOR passa a deixá-lo mudar as regras da casa', async () => {
  // É isto que faltava: o papel decide o que o servidor devolve e aceita.
  // Mudá-lo só no telefone mudava a aparência da Gestão e mais nada.
  const dele = await telemovel('tomas@x.pt', 'palavra-longa-2');
  const r = await dele.collection('casas').update(casa.id, { dia_pagamento: 3 });
  igual(r.dia_pagamento, 3);
});

await prova('e despromovê-lo volta a fechar-lhe a porta', async () => {
  await sync.editarMembro(tomas.id, { papel: 'adulto' });
  const dele = await telemovel('tomas@x.pt', 'palavra-longa-2');
  await recusado(() => dele.collection('casas').update(casa.id, { dia_pagamento: 1 }));
});

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── e o PIN é a palavra-passe, não um resumo local ──');

await prova('⚠ pela COLEÇÃO é recusado — e era assim que a app o tentava', async () => {
  // O PocketBase exige `oldPassword`, mesmo a quem administra. Quem põe o PIN
  // de uma criança de sete anos não sabe o antigo — o objetivo é muitas vezes
  // não saber. A app fazia `editarMembro(id, { password })` e apanhava a recusa
  // num `.catch(() => {})`: falhava em silêncio.
  let mensagem = null;
  try { await sync.editarMembro(leo.id, { password: '2470', passwordConfirm: '2470' }); }
  catch (e) { mensagem = e.message; }
  if (!mensagem) throw new Error('PASSOU — a coleção devia exigir oldPassword');
});

await prova('⚠ mas pela ROTA passa, e a criança entra no telemóvel dela', async () => {
  // O resumo local (`resumoPin`) serve a entrada sem servidor, e é isso e nada
  // mais. O PIN a sério é a palavra-passe no PocketBase, com bcrypt feito pelo
  // servidor.
  await sync.definirPin(leo.id, '2470');
  const dele = await telemovel(leo.login, '2470');
  igual(dele.authStore.record.nome, 'Leo');
});

await prova('e o PIN antigo deixa de servir', () =>
  recusado(() => telemovel(leo.login, '1357')));

await prova('⚠ a rota verifica a qualidade do PIN outra vez, no SERVIDOR', async () => {
  // O cliente já a verifica, e isso é para a pessoa saber porquê enquanto
  // escreve. Isto é outra coisa: um cliente pode ser trocado, e a regra que
  // protege a casa não pode viver só nele.
  for (const mau of ['1111', '1234', '4321', '12', 'abcd']) {
    await recusado(() => sync.definirPin(leo.id, mau));
  }
  // E o PIN bom continua a servir — nenhuma das recusas o estragou.
  const dele = await telemovel(leo.login, '2470');
  igual(dele.authStore.record.nome, 'Leo');
});

await prova('⚠ e a rota NÃO toca num adulto', async () => {
  // Um adulto tem palavra-passe, não PIN, e muda-a ele. Deixar esta rota tocar
  // num adulto era dar a quem administra a chave da conta do companheiro —
  // incluindo a ficha de saúde dele, que é só dele (INVARIANTE #3).
  await recusado(() => sync.definirPin(tomas.id, '2470'));
  const dele = await telemovel('tomas@x.pt', 'palavra-longa-2');
  igual(dele.authStore.record.nome, 'Tomas');
});

await prova('⚠ nem numa criança de OUTRA casa', async () => {
  const outra = await admin.collection('casas').create({ nome: PREFIXO + 'Outra', valor_ponto: 0.1 });
  const doutra = await admin.collection('membros').create({
    nome: 'Ines', login: `${outra.id}_Ines`, casa: outra.id, papel: 'crianca',
    verified: true, password: '9753', passwordConfirm: '9753' });
  await recusado(() => sync.definirPin(doutra.id, '2470'));
  // O PIN dela continua o que era.
  const dela = await telemovel(doutra.login, '9753');
  igual(dela.authStore.record.nome, 'Ines');
});

await prova('⚠ e quem não administra não define PIN nenhum', async () => {
  // O Tomás voltou a «adulto» numa prova acima.
  const r = await fetch(`${URL.replace(/\/+$/, '')}/api/casa/pin`, {
    method: 'POST',
    headers: { Authorization: doTomas.authStore.token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ membro: leo.id, pin: '8642' }),
  });
  igual(r.ok, false, 'estado ' + r.status);
});

// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── as três listas da casa ──');

// A Rita voltou a ser a única administradora; entra-se outra vez para o `sync`
// ter a sessão dela.
await auth.entrarAdulto('rita@x.pt', 'palavra-longa-1');

for (const [chave, colecao] of Object.entries(sync.LISTA_NO_SERVIDOR)) {
  await prova(`«${chave}» acrescenta uma linha em \`${colecao}\``, async () => {
    const r = await sync.acrescentarNaLista(chave, { casa: daRita.casa, nome: 'Fisioterapia' });
    if (!r || !r.id) throw new Error('não devolveu id: ' + JSON.stringify(r));
    igual((await admin.collection(colecao).getOne(r.id)).nome, 'Fisioterapia');

    // ⚠ Renomear GUARDA a linha. Apagar e criar dava id novo e sem histórico —
    // e numa loja levava atrás as listas de compras que a referem.
    await sync.renomearNaLista(chave, r.id, 'Fisioterapia geral');
    const depois = await admin.collection(colecao).getOne(r.id);
    igual(depois.nome, 'Fisioterapia geral');
    igual(depois.id, r.id, 'a linha mudou de id — foi apagada e recriada');

    await sync.apagarDaLista(chave, r.id);
    await recusado(() => admin.collection(colecao).getOne(r.id));
  });
}

await prova('⚠ e o `puxarCasa` traz as três como listas de TEXTO', async () => {
  // É a forma que oito ecrãs leem. Mudá-la para objetos com id obrigava a
  // mexer neles todos por uma razão que não é deles — daí o mapa à parte.
  const ids = {};
  for (const [chave, colecao] of Object.entries(sync.LISTA_NO_SERVIDOR)) {
    const r = await admin.collection(colecao).create({ casa: casa.id, nome: 'Um nome' });
    ids[chave] = r.id;
  }
  const lida = await sync.puxarCasa();
  for (const chave of Object.keys(sync.LISTA_NO_SERVIDOR)) {
    if (!Array.isArray(lida.listas[chave])) throw new Error(`${chave} não veio como lista`);
    igual(lida.listas[chave].includes('Um nome'), true, chave);
    igual(typeof lida.listas[chave][0], 'string', chave);
    // E o mapa `nome → id`, que é o que permite renomear e apagar.
    igual(lida.listasIds[chave]['Um nome'], ids[chave], chave);
  }
});

await prova('⚠ quem não administra não mexe nas listas', async () => {
  // Mais apertado do que a app, que deixa qualquer adulto criar uma
  // especialidade. Fica dito: é divergência conhecida.
  await recusado(() => doTomas.collection('especialidades').create({
    casa: casa.id, nome: 'Cardiologia' }));
});

await prova('⚠ e ninguém acrescenta à lista de OUTRA casa', async () => {
  // ⚠ Esta prova pedia um `recusado(...)` e falhou por bem: o
  // `acrescentarNaLista` cai na FILA quando o servidor recusa, e devolve
  // `{ pendente: true }` em vez de rebentar. É a mesma armadilha que o
  // `provar-anexo-sobe.mjs` já documenta — um `recusado()` que passa com
  // qualquer erro, ou que não vê erro nenhum, não distingue recusa de nada.
  //
  // O que interessa é a LINHA não existir do outro lado, e é isso que se mede.
  const outra = await admin.collection('casas').create({
    nome: PREFIXO + 'Vizinha', valor_ponto: 0.1 });
  await sync.acrescentarNaLista('specialities', { casa: outra.id, nome: 'Intrusa' });

  const dela = (await admin.collection('especialidades').getFullList())
    .filter(e => e.casa === outra.id);
  igual(dela.length, 0, dela.map(e => e.nome).join(','));
});

await prova('⚠ e uma escrita recusada NÃO fica a repetir-se para sempre', async () => {
  // A fila é uma rede de segurança para falhas de REDE. Uma recusa de
  // permissão nunca vai passar, e uma fila que a guarde tenta-a a cada
  // arranque, para sempre. Isto mede quantas lá ficaram.
  const p = await sync.pendentes();
  const n = typeof p === 'number' ? p : (p && p.length) || 0;
  if (n > 5) throw new Error(`a fila tem ${n} escritas presas`);
});

console.log(`\n${ok} provas passaram, ${mau} falharam.`);
process.exit(mau ? 1 : 0);
