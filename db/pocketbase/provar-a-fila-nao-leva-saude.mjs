// A FILA NÃO LEVA SAÚDE PARA FORA DE CASA — provado a correr, não a ler.
//
//   node db/pocketbase/provar-a-fila-nao-leva-saude.mjs
//
// ── Porque é que esta prova existe, e porque é do SERVIDOR e não do Jest ─────
//
// Porque o guarda de texto não chegou, e eu vi-o não chegar.
//
// O `__tests__/o-travao-da-saude-em-todo-o-lado.test.js` confere que o
// `despachar()` nomeia o `eColecaoDeSaude`. Para o pôr à prova, reintroduzi o
// defeito assim:
//
//     if (false && eColecaoDeSaude(w.colecao) && !eEnderecoDeCasa(URL)) {
//
// e o guarda ficou VERDE. O texto continua lá; o comportamento desapareceu.
// Cinco dos seis defeitos que injectei foram apanhados — este não, e é o mais
// grave dos seis.
//
// Um guarda que lê código como texto não distingue «está escrito» de
// «acontece». Para esta, a única prova honesta é correr o `despachar()` a
// sério, com uma linha de saúde na fila e o servidor a um endereço que não é de
// casa, e ver o que chega ao outro lado.
//
// E é do servidor e não do Jest por uma razão escrita no `provar-cliente.mjs`:
// o `src/pocketbase.js` traz o SDK do PocketBase, que é ESM, e o Jest deste
// projeto não o importa.
//
// ── O que se prova ──────────────────────────────────────────────────────────
//
// O caminho medido em 28/09/2026: uma consulta escrita sem rede fica na fila; a
// fila vive no armazenamento e sobrevive à MUDANÇA DE ENDEREÇO; qualquer
// escrita seguinte — uma despesa que seja — drena-a para o endereço que
// estiver configurado nesse momento.
import PocketBase from 'pocketbase';
import { URL, PREFIXO, comecar, prova, igual, resumo } from './provas.mjs';
import { configurar, estaLigado, auth, escrever } from '../../src/pocketbase.js';

const memoria = new Map();
const storage = {
  getItem: async (k) => (memoria.has(k) ? memoria.get(k) : null),
  setItem: async (k, v) => { memoria.set(k, v); },
  removeItem: async (k) => { memoria.delete(k); },
};

const { pb: admin } = await comecar();
const casa = await admin.collection('casas').create({ nome: `${PREFIXO}fila`, valor_ponto: 0.1 });
const rita = await admin.collection('membros').create({
  nome: 'Rita', login: `${casa.id}_rita`, casa: casa.id, papel: 'admin',
  email: `fila.${Date.now()}@exemplo.pt`, password: 'palavra-longa-1',
  passwordConfirm: 'palavra-longa-1', verified: true,
});
const leo = await admin.collection('membros').create({
  nome: 'Leo', login: `${casa.id}_leo`, casa: casa.id, papel: 'crianca',
  password: '1357', passwordConfirm: '1357', verified: true,
});
await admin.collection('envelopes').create({ casa: casa.id, nome: 'Mercearia', limite_base: 550 });

// ⚠ Um endereço que NÃO é de casa e que aponta para o MESMO servidor.
//
// É o coração desta prova: se o travão falhar, a escrita CHEGA mesmo, e
// conta-se do outro lado. A primeira versão usou um nome inventado
// (`nao-e-de-casa.exemplo.pt`) e a prova ficou verde por engano — nada subia
// porque o nome não resolvia. Estaria a provar que a rede não funciona.
//
// O `localtest.me` tem um registo público que aponta para 127.0.0.1, e o
// `eEnderecoDeCasa` diz-lhe que NÃO (não é `localhost`, nem `.local`, nem um
// endereço privado). Mesmo servidor, nome de fora: é exactamente o que se quer
// para distinguir «o travão segurou» de «a ligação falhou».
const COMO_SE_FOSSE_FORA = URL.replace('127.0.0.1', 'localtest.me');

// ⚠ Mudar de endereço PERDE a sessão, e sem sessão o servidor recusa por uma
// razão que não é esta: um 400 «Failed to create record» da regra da coleção
// lia-se como «o travão segurou», e não é. Reautentica-se sempre, que é o que a
// app faz — ela tem sessão contra o servidor com que estiver a falar.
const apontarA = async (url) => {
  configurar({ storage, url });
  try { await auth.entrarAdulto(rita.email, 'palavra-longa-1'); } catch (e) { /* o endereço morto não deixa */ }
};

const contar = async (colecao) => (await admin.collection(colecao)
  .getList(1, 1, { filter: `casa = "${casa.id}"` })).totalItems;

console.log('\n── a fila enche-se enquanto o servidor é de casa ──');

await apontarA(URL);

await prova('o endereço de casa deixa a saúde subir — senão não há nada a provar', async () => {
  igual(estaLigado(), true);
  const r = await escrever.criar('episodios_saude', {
    casa: casa.id, membro: leo.id, especialidade: 'Pediatria',
    medico: 'Dra. Prova', dia: '2026-09-20 10:00:00', notas: 'NOTAS CLINICAS',
  });
  igual(r.enviadas, 1, `enviadas ${r.enviadas}, pendentes ${r.pendentes}`);
  igual(await contar('episodios_saude'), 1, 'o episódio não chegou ao servidor');
});

console.log('\n── e agora o caminho do defeito ──');

await prova('uma consulta fica na fila quando o servidor não responde', async () => {
  // Endereço morto: a escrita directa falha e a linha fica à espera.
  await apontarA('http://127.0.0.1:1');
  const r = await escrever.criar('episodios_saude', {
    casa: casa.id, membro: leo.id, especialidade: 'Dermatologia',
    medico: 'Dr. Prova', dia: '2026-09-21 11:00:00', notas: 'SEGREDO CLINICO',
  });
  igual(r.pendentes, 1, `ficaram ${r.pendentes} na fila`);
});

await prova('⚠ e NÃO sobe quando o endereço passa a ser de fora de casa', async () => {
  // ⚠ Isto é o defeito de 28/09/2026. A fila sobrevive à mudança de endereço, e
  // o `despachar()` enviava o que lá estava sem voltar a perguntar.
  await apontarA(COMO_SE_FOSSE_FORA);
  const r = await escrever.esvaziar();
  igual(await contar('episodios_saude'), 1, '⚠ A CONSULTA SUBIU para um servidor que não é de casa');
  igual(r.enviadas, 0, `enviou ${r.enviadas}`);
  if (!r.recusadas || !r.recusadas.length) throw new Error('saiu da fila sem dizer porquê');
  igual(r.recusadas[0].colecao, 'episodios_saude', 'recusou a coleção errada');
});

await prova('⚠ e uma escrita QUALQUER não a arrasta consigo', async () => {
  // O que tornava isto perigoso: ninguém chama o `esvaziar()` de propósito. A
  // fila drena como efeito secundário da escrita seguinte — uma despesa, um
  // movimento de cofre, uma linha de registo.
  await apontarA(COMO_SE_FOSSE_FORA);
  await escrever.criar('episodios_saude', {
    casa: casa.id, membro: leo.id, especialidade: 'Oftalmologia',
    medico: 'Dr. Prova', dia: '2026-09-22 09:00:00', notas: 'OUTRO SEGREDO',
  }).catch(() => null);
  await escrever.criar('registo', {
    casa: casa.id, texto: 'uma linha qualquer', quando: new Date().toISOString(), area: 'Casa',
  }).catch(() => null);
  igual(await contar('episodios_saude'), 1, '⚠ a saúde foi arrastada por outra escrita');
});

await prova('mas o que NÃO é saúde continua a subir de qualquer endereço', async () => {
  // O travão é da saúde, e só dela. Se travasse tudo, a app parava — e uma
  // prova que não medisse isto deixaria passar essa regressão.
  const antes = await contar('registo');
  await apontarA(COMO_SE_FOSSE_FORA);
  const r = await escrever.criar('registo', {
    casa: casa.id, texto: 'isto tem de passar', quando: new Date().toISOString(), area: 'Casa',
  });
  const depois = await contar('registo');
  if (!(depois > antes)) {
    throw new Error(`o registo não subiu: ${antes} -> ${depois} · ${JSON.stringify(r)}`);
  }
});

await prova('⚠ e de volta a casa, a saúde volta a subir', async () => {
  // O travão é uma CONDIÇÃO, não um «não» permanente. Se ficasse fechado para
  // sempre depois de uma vez, era outro defeito.
  const antes = await contar('episodios_saude');
  await apontarA(URL);
  await escrever.criar('episodios_saude', {
    casa: casa.id, membro: leo.id, especialidade: 'Ortopedia',
    medico: 'Dra. Prova', dia: '2026-09-23 15:00:00', notas: 'em casa pode',
  });
  // ⚠ A conta, e não o `enviadas`: a fila pode trazer outras linhas atrás —
  // uma escrita que tenha ficado pendente noutra prova — e contar o `enviadas`
  // fazia esta prova depender da ordem das outras.
  igual(await contar('episodios_saude'), antes + 1, 'não subiu de volta em casa');
});

resumo();
