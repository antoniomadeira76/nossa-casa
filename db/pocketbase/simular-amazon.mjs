// Faz de Amazon contra o endereço PÚBLICO da casa.
//
// Tudo o que se provou até agora correu contra `127.0.0.1`. O que a Amazon vai
// fazer é outra coisa: chega de fora, por HTTPS, através do túnel, e com os
// cabeçalhos e o corpo dela. Isto percorre o fluxo inteiro por esse caminho.
//
// Não escreve nada na casa a sério: cria uma casa de provas, autoriza-a, e
// apaga tudo no fim.
const CASA = 'https://casa.anossacasa.app';
const LOCAL = 'http://127.0.0.1:8095';
const RETORNO = 'https://pitangui.amazon.com/api/skill/link/SIMULACAO';

import PocketBase from 'pocketbase';
import { SUPERUTILIZADOR, SUPER_PALAVRA } from './ambiente.mjs';

// O superutilizador entra pelo LOCAL — de propósito. O túnel tapa esse caminho,
// e é essa a primeira coisa que isto confirma.
const admin = new PocketBase(LOCAL);
admin.autoCancellation(false);
await admin.collection('_superusers').authWithPassword(SUPERUTILIZADOR, SUPER_PALAVRA);

let falhas = 0;
const ver = (nome, ok, detalhe) => {
  console.log(`  ${ok ? '✓' : '✕'} ${nome}${detalhe ? '   ' + detalhe : ''}`);
  if (!ok) falhas++;
};

const forma = (o) => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

// ── Uma casa só para isto ────────────────────────────────────────────────────
const marca = `[provas] amazon ${Date.now()}`;
const casa = await admin.collection('casas').create({ nome: marca, valor_ponto: 0.1 });
const adulto = await admin.collection('membros').create({
  nome: 'Rita', login: `${casa.id}_rita`, casa: casa.id, papel: 'admin',
  email: `rita.sim.${Date.now()}@exemplo.pt`, verified: true,
  password: 'palavra-de-simulacao-1', passwordConfirm: 'palavra-de-simulacao-1',
});
const cred = await admin.collection('credenciais_alexa').create({
  casa: casa.id, client_id: `sim-${Date.now()}`, client_secret: 'segredo-de-simulacao-0000',
});

const arrumar = async () => {
  for (const c of ['alexa_ligacoes', 'alexa_pedidos', 'artigos', 'listas_compras', 'credenciais_alexa', 'membros']) {
    try {
      for (const l of await admin.collection(c).getFullList({ filter: `casa = "${casa.id}"` })) {
        await admin.collection(c).delete(l.id);
      }
    } catch (e) { /* segue */ }
  }
  try { await admin.collection('casas').delete(casa.id); } catch (e) { /* segue */ }
};

try {
  console.log('\n── o túnel tapa o que tem de tapar ──');
  for (const [caminho, esperado] of [['/_/', 404], ['/api/collections/_superusers/auth-with-password', 404]]) {
    const r = await fetch(CASA + caminho, { method: caminho.includes('auth') ? 'POST' : 'GET' });
    ver(`${caminho} de fora`, r.status === esperado, `${r.status}`);
  }

  console.log('\n── a Amazon manda o navegador à página ──');
  const q = forma({ client_id: cred.client_id, redirect_uri: RETORNO, state: 'sim-abc', response_type: 'code' });
  const p = await fetch(`${CASA}/api/alexa/autorizar?${q}`);
  const html = await p.text();
  ver('a página abre pelo endereço público', p.status === 200, `${p.status}`);
  ver('e diz o que a skill faz e o que não faz', /acrescentar/.test(html) && /dinheiro nem em saúde/.test(html));
  ver('e não deixa guardar nem indexar', p.headers.get('cache-control') === 'no-store'
    && String(p.headers.get('x-robots-tag')).includes('noindex'));

  console.log('\n── um adulto identifica-se ──');
  const a = await fetch(`${CASA}/api/alexa/autorizar`, {
    method: 'POST', redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: forma({
      client_id: cred.client_id, redirect_uri: RETORNO, state: 'sim-abc', response_type: 'code',
      email: adulto.email, palavra: 'palavra-de-simulacao-1',
    }),
  });
  const destino = a.headers.get('location') || '';
  ver('volta com 302 para a Amazon', a.status === 302 && destino.startsWith(RETORNO), `${a.status}`);
  ver('e traz o state de volta', /[?&]state=sim-abc(&|$)/.test(destino));
  const codigo = (destino.match(/[?&]code=([^&]+)/) || [])[1] || '';
  ver('e um código', codigo.length > 20);

  console.log('\n── a Amazon troca o código por um token ──');
  const t = await fetch(`${CASA}/api/alexa/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: forma({
      grant_type: 'authorization_code', code: decodeURIComponent(codigo),
      redirect_uri: RETORNO, client_id: cred.client_id, client_secret: cred.client_secret,
    }),
  });
  const tok = await t.json();
  ver('devolve um token', t.status === 200 && !!tok.access_token, `${t.status} ${tok.error || ''}`);
  ver('do tipo Bearer, com âmbito e validade', tok.token_type === 'Bearer'
    && tok.scope === 'casa.escrever' && Number(tok.expires_in) > 0);
  ver('e um token de renovação', !!tok.refresh_token);

  console.log('\n── o altifalante fala, pela internet ──');
  const chamar = (rota, corpo) => fetch(`${CASA}${rota}`, {
    method: 'POST',
    headers: { Authorization: tok.access_token, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });

  const art = await chamar('/api/alexa/artigo', { artigo: 'leite da simulacao', requestId: 'amzn1.echo-api.request.sim-1' });
  const artD = await art.json();
  ver('«acrescenta leite à lista»', art.status === 200, `${art.status} ${JSON.stringify(artD).slice(0, 90)}`);

  const rep = await chamar('/api/alexa/artigo', { artigo: 'leite da simulacao', requestId: 'amzn1.echo-api.request.sim-1' });
  const repD = await rep.json();
  const quantos = (await admin.collection('artigos').getFullList({ filter: `casa = "${casa.id}"` })).length;
  ver('e o reenvio da Amazon não duplica', rep.status === 200 && repD.repetido === true && quantos === 1, `${quantos} artigo(s)`);

  const ev = await chamar('/api/alexa/evento', { titulo: 'jantar da simulacao', dia: '2026-10-10', hora: '20:00' });
  const evD = await ev.json();
  ver('«marca jantar amanhã às oito»', ev.status === 200 && evD.visibilidade === 'familia', `${ev.status}`);
  ver('e diz que é visível para a família', /visível para a família/.test(String(evD.frase)));

  console.log('\n── e o que o altifalante NÃO consegue ──');
  for (const c of ['episodios_saude', 'notas_saude', 'receitas_saude', 'anexos', 'alergias_saude', 'tomas_saude']) {
    const r = await fetch(`${CASA}/api/collections/${c}/records`, { headers: { Authorization: tok.access_token } });
    const d = await r.json().catch(() => ({}));
    ver(`não lê ${c}`, !d.totalItems, d.totalItems ? `devolveu ${d.totalItems}` : '');
  }

  console.log('\n── a renovação, como a Amazon a faz ──');
  const rn = await fetch(`${CASA}/api/alexa/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: forma({
      grant_type: 'refresh_token', refresh_token: tok.refresh_token,
      client_id: cred.client_id, client_secret: cred.client_secret,
    }),
  });
  const rnD = await rn.json();
  ver('o refresh dá um token novo', rn.status === 200 && !!rnD.access_token, `${rn.status}`);

} finally {
  await arrumar();
  const sobrou = (await admin.collection('casas').getFullList()).filter(c => String(c.nome).startsWith('[provas] amazon')).length;
  console.log(`\n${falhas ? '✕ ' + falhas + ' falha(s)' : '✓ o fluxo inteiro funciona pela internet'} · casas de simulação por arrumar: ${sobrou}`);
  process.exitCode = falhas || sobrou ? 1 : 0;
}
