// O CAMINHO DA GOOGLE na página de autorização da Alexa.
//
//   node db/pocketbase/provar-alexa-google.mjs
//
// ── Porque é que este caminho existe ─────────────────────────────────────────
//
// Porque sem ele o dono desta casa NÃO CONSEGUIA ligar a Alexa, e levou meio dia
// a descobrir-se. Os adultos daqui entram pela Google, e quem entra por lá nunca
// definiu palavra-passe: o registo nasce do OAuth com uma ao acaso, que ninguém
// sabe. A página só sabia pedir e-mail e palavra-passe, e a ele respondia
// sempre «Não reconheço esse endereço ou essa palavra-passe» — com razão, e sem
// serventia nenhuma.
//
// ── O que NÃO se prova aqui, e porquê ────────────────────────────────────────
//
// A ida à Google e a volta dela não se provam sem a Google. O que se prova é
// tudo o resto, que é onde os defeitos moram: a validação à entrada, a espera
// (uso único e prazo), as recusas na volta, e a limpeza do que fica a meio.
//
// ⚠ E prova-se com um `state` DO TAMANHO DO DA AMAZON. Foi um `state` de 1095
// caracteres cortado aos 500 que impediu a ligação de funcionar — e nenhuma
// prova o apanhou porque todas usavam `'abc123'`.
import PocketBase from 'pocketbase';
import { URL, comecar, criarCasa, criarMembro, prova, igual, resumo } from './provas.mjs';

const { pb: admin } = await comecar();
const raiz = URL.replace(/\/+$/, '');
const marca = `google-${Date.now()}`;

// O endereço público da casa, o mesmo que o hook lê. Vem de `CASA_URL_PUBLICA`
// para a prova continuar a valer quando a casa mudar de máquina — e a reserva
// é a mesma que está no `alexa-conta-comum.js`, de propósito: se as duas
// divergirem, esta prova fica vermelha, que é o que se quer.
const BASE_PUBLICA = String(process.env.CASA_URL_PUBLICA || 'https://casa.anossacasa.app').replace(/\/+$/, '');

const casaA = await criarCasa(admin, `${marca}-A`, { valor_ponto: 0.1 });
const casaB = await criarCasa(admin, `${marca}-B`, { valor_ponto: 0.1 });

const rita = await criarMembro(admin, casaA, 'Rita', 'admin', {
  email: `${marca}@exemplo.pt`, password: 'palavra-de-provas-1',
  passwordConfirm: 'palavra-de-provas-1', verified: true,
});
await criarMembro(admin, casaA, 'Leo', 'crianca', { password: '4731', passwordConfirm: '4731' });

const credA = await admin.collection('credenciais_alexa').create({
  casa: casaA.id, client_id: `${marca}-A`, client_secret: `segredo-${marca}-A`,
});
await admin.collection('credenciais_alexa').create({
  casa: casaB.id, client_id: `${marca}-B`, client_secret: `segredo-${marca}-B`,
});

const RETORNO = 'https://pitangui.amazon.com/api/skill/link/PROVAS';

// ⚠ O `state` como a Amazon o manda: um blob em base64, 1095 caracteres. Este
// número não é decorativo — é o que estava a partir tudo.
const ESTADO_DA_AMAZON = `Amase${Buffer.from('x'.repeat(818)).toString('base64')}`;

const params = (extra) => new URLSearchParams({
  client_id: credA.client_id, redirect_uri: RETORNO,
  state: ESTADO_DA_AMAZON, response_type: 'code', ...extra,
}).toString();

const ir = async (rota, q) => {
  const r = await fetch(`${raiz}${rota}?${q}`, { redirect: 'manual' });
  return { estado: r.status, destino: r.headers.get('location') || '', corpo: await r.text() };
};

const esperasDe = async () => admin.collection('alexa_esperas').getFullList();
const limparEsperas = async () => {
  for (const l of await esperasDe()) await admin.collection('alexa_esperas').delete(l.id);
};

// ── A página ─────────────────────────────────────────────────────────────────

await prova('a página oferece o caminho da Google', async () => {
  const r = await ir('/api/alexa/autorizar', params());
  igual(r.estado, 200, `devolveu ${r.estado}`);
  if (!/Continuar com Google/.test(r.corpo)) throw new Error('não há botão da Google');
  if (!/href="\/api\/alexa\/google\?/.test(r.corpo)) throw new Error('o botão não aponta para a rota');
});

await prova('⚠ e o `state` da Amazon chega ao formulário INTEIRO', async () => {
  // O defeito de 28/09/2026 em uma linha: `.slice(0, 500)` no `lerPedido`.
  const r = await ir('/api/alexa/autorizar', params());
  const noForm = (r.corpo.match(/name="state" value="([^"]*)"/) || [])[1] || '';
  igual(noForm.length, ESTADO_DA_AMAZON.length,
    `o formulário ficou com ${noForm.length} caracteres de ${ESTADO_DA_AMAZON.length}`);
  igual(noForm, ESTADO_DA_AMAZON, 'o state chegou diferente ao formulário');
});

// ── A ida ────────────────────────────────────────────────────────────────────

await prova('⚠ a ida à Google guarda o pedido e manda uma chave OPACA', async () => {
  await limparEsperas();
  const r = await ir('/api/alexa/google', params());
  igual(r.estado, 302, `devolveu ${r.estado}`);
  if (r.destino.indexOf('https://accounts.google.com/') !== 0) {
    throw new Error(`foi parar a ${r.destino.slice(0, 60)}`);
  }
  const u = new global.URL(r.destino);
  const enviado = String(u.searchParams.get('state') || '');
  igual(enviado.length, 40, `a chave tem ${enviado.length} caracteres`);

  // ⚠ O pedido da Amazon NÃO pode viajar dentro do `state` da Google: ele volta
  // pela barra de endereços, por mãos de quem se está a autenticar.
  if (/pitangui|amazon|nossacasa|Amase/.test(enviado)) {
    throw new Error('o pedido da Amazon vai dentro do state da Google');
  }
  igual(String(u.searchParams.get('redirect_uri')),
    BASE_PUBLICA + '/api/alexa/retorno-google',
    'o retorno pedido à Google não é o que está registado na consola');
});

await prova('⚠ e o `state` fica GUARDADO inteiro, não cortado', async () => {
  await limparEsperas();
  await ir('/api/alexa/google', params());
  const esperas = await esperasDe();
  igual(esperas.length, 1, `ficaram ${esperas.length} esperas`);
  igual(String(esperas[0].estado).length, ESTADO_DA_AMAZON.length,
    `guardou ${String(esperas[0].estado).length} de ${ESTADO_DA_AMAZON.length}`);
  igual(esperas[0].estado, ESTADO_DA_AMAZON, 'o state guardado não é o que veio');
});

await prova('⚠ um `state` absurdo é RECUSADO, e não cortado em silêncio', async () => {
  // Cortar em silêncio é o pior dos três caminhos: a casa faz tudo bem e a
  // Amazon recusa-se a vir buscar o token, sem ninguém saber porquê.
  const r = await ir('/api/alexa/google', params({ state: 'z'.repeat(5000) }));
  igual(r.estado, 400, `devolveu ${r.estado}`);
});

await prova('⚠ e a ida valida o pedido OUTRA VEZ, do zero', async () => {
  // Quem chama esta rota é o navegador de quem estamos a autenticar. Um
  // endereço escrito à mão chega cá igualzinho ao que a nossa página escreveu.
  const CASOS = [
    ['um client_id que não existe', params({ client_id: 'nao-existe' }), 400],
    ['um retorno que não é da Amazon', params({ redirect_uri: 'https://evil.pt/x' }), 400],
    ['um retorno colado ao da Amazon', params({ redirect_uri: 'https://pitangui.amazon.com.evil.pt/x' }), 400],
    ['sem TLS', params({ redirect_uri: 'http://pitangui.amazon.com/x' }), 400],
    ['um response_type que não é code', params({ response_type: 'token' }), 400],
  ];
  const maus = [];
  for (const [porque, q, esperado] of CASOS) {
    const r = await ir('/api/alexa/google', q);
    if (r.estado !== esperado) maus.push(`${porque}: devolveu ${r.estado}`);
  }
  if (maus.length) throw new Error(maus.join(' · '));
});

// ── A volta ──────────────────────────────────────────────────────────────────

await prova('⚠ a volta com uma chave desconhecida não autoriza nada', async () => {
  const r = await ir('/api/alexa/retorno-google', 'state=nao-existe-nenhuma&code=xyz');
  igual(r.estado, 400, `devolveu ${r.estado}`);
  igual(r.destino, '', 'redireccionou para algum lado');
  if (!/expirou/.test(r.corpo)) throw new Error('não explicou o que aconteceu');
});

await prova('⚠ e uma chave só serve UMA vez', async () => {
  // Uma chave que sobrevivesse ao uso era um código de autorização reutilizável.
  await limparEsperas();
  await ir('/api/alexa/google', params());
  const chave = (await esperasDe())[0].chave;

  // A primeira volta gasta-a (falha adiante, na Google, e é o que se quer aqui).
  await ir('/api/alexa/retorno-google', `state=${encodeURIComponent(chave)}&code=falso`);
  igual((await esperasDe()).length, 0, 'a espera sobreviveu ao uso');

  const segunda = await ir('/api/alexa/retorno-google', `state=${encodeURIComponent(chave)}&code=falso`);
  igual(segunda.estado, 400, `a segunda volta devolveu ${segunda.estado}`);
});

await prova('⚠ e uma chave CADUCADA não serve', async () => {
  await limparEsperas();
  const velha = await admin.collection('alexa_esperas').create({
    chave: `caducada-${Date.now()}`, client_id: credA.client_id, redirect_uri: RETORNO,
    estado: ESTADO_DA_AMAZON, expira: '2020-01-01 00:00:00.000Z',
  });
  const r = await ir('/api/alexa/retorno-google', `state=${encodeURIComponent(velha.chave)}&code=falso`);
  igual(r.estado, 400, `devolveu ${r.estado}`);
  // ⚠ E é GASTA na mesma: uma caducada que ficasse era lixo eterno com o
  // `state` da Amazon lá dentro.
  igual((await esperasDe()).length, 0, 'a espera caducada ficou lá');
});

await prova('⚠ e a Google a recusar não vira um redireccionamento para a Amazon', async () => {
  // São dois OAuth encadeados, com dois conjuntos de erros. Misturá-los é como
  // um deles acaba a levar dados para o destino do outro.
  await limparEsperas();
  await ir('/api/alexa/google', params());
  const chave = (await esperasDe())[0].chave;
  const r = await ir('/api/alexa/retorno-google', `state=${encodeURIComponent(chave)}&error=access_denied`);
  igual(r.estado, 400, `devolveu ${r.estado}`);
  igual(r.destino, '', `redireccionou para ${r.destino.slice(0, 50)}`);
});

// ── O que fica a meio ────────────────────────────────────────────────────────

await prova('⚠ o que fica a meio é limpo — e o que está FEITO não', async () => {
  // Medido a 28/09/2026: três tentativas de ligar a conta deixaram duas linhas
  // em `alexa_ligacoes` com o código por gastar, cada uma com um `refresh`
  // válido. Uma credencial de longa duração para uma ligação que nunca existiu.
  await limparEsperas();

  const meio = await admin.collection('alexa_ligacoes').create({
    casa: casaA.id, membro: rita.id, codigo: 'codigo-a-meio-caducado',
    codigo_expira: '2020-01-01 00:00:00.000Z', redirect_uri: RETORNO,
    refresh: `refresh-a-meio-${Date.now()}`, criado_em: '2020-01-01 00:00:00.000Z',
  });
  // Uma ligação FEITA é a que já não tem código: a troca apagou-o. Por mais
  // velha que seja, não pode entrar na limpeza.
  const feita = await admin.collection('alexa_ligacoes').create({
    casa: casaA.id, membro: rita.id, codigo: '',
    codigo_expira: '2020-01-01 00:00:00.000Z', redirect_uri: RETORNO,
    refresh: `refresh-feita-${Date.now()}`, criado_em: '2020-01-01 00:00:00.000Z',
  });
  const caducada = await admin.collection('alexa_esperas').create({
    chave: `velha-${Date.now()}`, client_id: credA.client_id, redirect_uri: RETORNO,
    estado: 'x', expira: '2020-01-01 00:00:00.000Z',
  });

  // Uma ida nova é o que dispara a limpeza.
  await ir('/api/alexa/google', params());

  const aMeio = await admin.collection('alexa_ligacoes').getOne(meio.id).catch(() => null);
  if (aMeio) throw new Error('a ligação a meio sobreviveu');
  const aFeita = await admin.collection('alexa_ligacoes').getOne(feita.id).catch(() => null);
  if (!aFeita) throw new Error('⚠ a limpeza APAGOU uma ligação boa');
  const aVelha = await admin.collection('alexa_esperas').getOne(caducada.id).catch(() => null);
  if (aVelha) throw new Error('a espera caducada sobreviveu');

  await admin.collection('alexa_ligacoes').delete(feita.id);
  await limparEsperas();
});

// ── E o que ninguém pode ler ─────────────────────────────────────────────────

await prova('⚠ nem um administrador lê as esperas pela API', async () => {
  // Elas guardam o `state` da Amazon. As cinco regras são `null`.
  await limparEsperas();
  await ir('/api/alexa/google', params());

  const telemovel = new PocketBase(URL);
  telemovel.autoCancellation(false);
  await telemovel.collection('membros').authWithPassword(`${marca}@exemplo.pt`, 'palavra-de-provas-1');

  const r = await fetch(`${raiz}/api/collections/alexa_esperas/records`, {
    headers: { Authorization: telemovel.authStore.token },
  });
  if (r.status === 200) {
    const d = await r.json();
    if (d.totalItems) throw new Error(`a Rita leu ${d.totalItems} espera(s)`);
  }
  if (r.status !== 403 && r.status !== 404 && r.status !== 400) {
    throw new Error(`devolveu ${r.status}`);
  }
  await limparEsperas();
});

resumo();
