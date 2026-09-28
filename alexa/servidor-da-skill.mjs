// O endpoint da skill da Alexa — o tradutor entre a Amazon e a casa.
//
//   node alexa/servidor-da-skill.mjs
//   npm run alexa:servir
//
// ── Porque é que isto existe, e não é um hook do PocketBase ──────────────────
//
// A Amazon não chama as rotas da casa. Ela manda UM pedido, para UM endereço,
// num envelope dela — com a intenção, os slots e o token de quem ligou a conta
// — e espera uma resposta no formato dela, com a frase que o altifalante vai
// dizer. As rotas `/api/alexa/artigo` e companhia falam outra língua.
//
// ⚠ E há mais: um endpoint HTTPS TEM de verificar a assinatura de cada pedido.
// A Amazon exige a cadeia de certificados a partir de `s3.amazonaws.com`, o
// nome alternativo `echo-api.amazon.com`, a validade, uma tolerância de 150
// segundos no relógio, e a assinatura SHA-256 do corpo em bytes.
//
// O JSVM do PocketBase não faz nada disso: não tem X.509, não tem RSA, não tem
// cadeia de confiança. Escrever aquilo à mão em Goja seria criptografia caseira
// no sítio errado. O Node tem tudo de origem — `X509Certificate` com
// `checkIssued` e `checkHost`, `crypto.verify`, e as 145 raízes do sistema.
//
// Por isso: um processo à parte, pequeno, que só traduz e verifica. As rotas da
// casa não mudam, e as 20 provas que as defendem continuam a valer.
import http from 'node:http';
import https from 'node:https';
import crypto from 'node:crypto';
import tls from 'node:tls';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

// ⚠ As funções PURAS — as que decidem quem entra — vivem em `verificacao.cjs`,
// e o cabeçalho dele diz porquê. Em duas linhas: o Jest deste projeto corre em
// CommonJS e transforma um `import()` num `require()`, que não resolve um
// `file://`. Dava para contornar com um truque no teste; não se contorna, que
// são justamente as funções que mais precisam de ser postas à prova.
const exigir = createRequire(import.meta.url);
const V = exigir('./verificacao.cjs');
export const { enderecoDaCadeiaValido, relogioAceite, cadeiaDeConfianca, daNossaSkill, ROTAS } = V;
const slot = V.slot;

const PORTA = Number(process.env.ALEXA_PORTA || 8094);
const CASA = process.env.ALEXA_CASA || 'http://127.0.0.1:8095';
const RAIZ = path.resolve(import.meta.dirname, '..');

// ── O identificador da skill ─────────────────────────────────────────────────
//
// Impede que OUTRA skill use este endereço. Vive no `.env.local`, que o
// `.gitignore` exclui, como as credenciais da Google.
//
// ⚠ Sem ele o serviço aceita na mesma, e diz-o em cada pedido. Recusar tudo
// antes de a skill existir impediria de a experimentar; aceitar em silêncio
// seria pior. A tranca a sério é o token de acesso, que vem no envelope e que
// as rotas da casa exigem — um envelope sem token válido leva 401.
const doAmbiente = (chave) => {
  if (process.env[chave]) return process.env[chave];
  try {
    const t = fs.readFileSync(path.join(RAIZ, '.env.local'), 'utf8');
    const l = t.split(/\r?\n/).find((x) => new RegExp(`^\\s*${chave}\\s*=`).test(x));
    return l ? l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '') : '';
  } catch (e) { return ''; }
};
const SKILL = doAmbiente('ALEXA_SKILL_ID');

// ── A verificação da assinatura ──────────────────────────────────────────────

const cadeiaEmCache = new Map();

const buscarCadeia = (url) => new Promise((resolver, rejeitar) => {
  if (cadeiaEmCache.has(url)) return resolver(cadeiaEmCache.get(url));
  https.get(url, (r) => {
    if (r.statusCode !== 200) { r.resume(); return rejeitar(new Error(`a cadeia respondeu ${r.statusCode}`)); }
    let t = '';
    r.setEncoding('utf8');
    r.on('data', (c) => { t += c; });
    r.on('end', () => {
      const pems = t.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) || [];
      if (!pems.length) return rejeitar(new Error('a cadeia não trouxe certificados'));
      const certs = pems.map((p) => new crypto.X509Certificate(p));
      // A Amazon diz que se pode guardar. Guarda-se por endereço, que é o que
      // identifica a cadeia.
      cadeiaEmCache.set(url, certs);
      resolver(certs);
    });
  }).on('error', rejeitar);
});

export const verificarPedido = async (cabecalhos, corpoBytes, agora) => {
  const url = cabecalhos['signaturecertchainurl'] || cabecalhos['SignatureCertChainUrl'];
  const assinatura = cabecalhos['signature-256'] || cabecalhos['Signature-256'];
  if (!url || !assinatura) return 'faltam os cabeçalhos da assinatura';
  if (!enderecoDaCadeiaValido(url)) return 'o endereço da cadeia não é da Amazon';

  let certs;
  try { certs = await buscarCadeia(url); } catch (e) { return `não consegui a cadeia: ${e.message}`; }

  const mau = cadeiaDeConfianca(certs, agora ? new Date(agora) : new Date());
  if (mau) return mau;

  // ⚠ O nome alternativo, e não o «subject»: é o `echo-api.amazon.com` no SAN
  // que identifica um certificado de assinatura da Alexa.
  try {
    if (certs[0].checkHost('echo-api.amazon.com') !== 'echo-api.amazon.com') {
      return 'o certificado não é o da Alexa';
    }
  } catch (e) { return 'o certificado não é o da Alexa'; }

  const ok = crypto.verify('RSA-SHA256', corpoBytes, certs[0].publicKey, Buffer.from(String(assinatura), 'base64'));
  if (!ok) return 'a assinatura não bate com o corpo';
  return null;
};

// ── A tradução ───────────────────────────────────────────────────────────────

const fala = (frase, terminar) => ({
  version: '1.0',
  response: {
    outputSpeech: { type: 'PlainText', text: frase },
    shouldEndSession: terminar !== false,
  },
});

const AJUDA = 'Posso acrescentar artigos à lista de compras, marcar eventos de família e '
  + 'acrescentar tarefas. Não leio nada, e não mexo em dinheiro nem em saúde. '
  + 'Diga, por exemplo: acrescentar leite.';

const chamarACasa = async (rota, corpo, token) => {
  const r = await fetch(`${CASA}/api/alexa/${rota}`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  const t = await r.text();
  let d = {};
  try { d = JSON.parse(t); } catch (e) { d = {}; }
  return { estado: r.status, d };
};

export const responderA = async (envelope) => {
  const pedido = envelope.request || {};
  const sistema = (envelope.context && envelope.context.System) || {};

  // ⚠ A decisão vive no `verificacao.cjs`, com as outras que decidem quem entra
  // — e o cabeçalho de lá explica o buraco que a versão escrita aqui tinha: um
  // envelope sem `context.System.application` saltava a tranca inteira.
  if (!daNossaSkill(envelope, SKILL)) {
    return { codigo: 403, corpo: fala('Esta skill não é desta casa.') };
  }

  if (pedido.type === 'SessionEndedRequest') return { codigo: 200, corpo: { version: '1.0', response: {} } };

  // ⚠ Sem conta ligada, a Alexa mostra o cartão de ligação em vez de uma frase
  // que ninguém percebe. É o que o `LinkAccount` faz.
  const token = (sistema.user && sistema.user.accessToken) || '';
  if (!token) {
    return {
      codigo: 200,
      corpo: {
        version: '1.0',
        response: {
          outputSpeech: { type: 'PlainText', text: 'Primeiro ligue a sua conta da Nossa Casa na aplicação da Alexa.' },
          card: { type: 'LinkAccount' },
          shouldEndSession: true,
        },
      },
    };
  }

  if (pedido.type === 'LaunchRequest') return { codigo: 200, corpo: fala(AJUDA, false) };

  if (pedido.type !== 'IntentRequest') return { codigo: 200, corpo: fala(AJUDA) };

  const nome = (pedido.intent && pedido.intent.name) || '';

  if (nome === 'AMAZON.HelpIntent') return { codigo: 200, corpo: fala(AJUDA, false) };
  if (nome === 'AMAZON.StopIntent' || nome === 'AMAZON.CancelIntent' || nome === 'AMAZON.NavigateHomeIntent') {
    return { codigo: 200, corpo: fala('Está bem.') };
  }

  const mapa = ROTAS[nome];
  if (!mapa) return { codigo: 200, corpo: fala('Não percebi o que quer que eu faça.') };

  const [rota, corpo] = mapa(pedido);
  // ⚠ O `requestId` da Alexa é a chave de idempotência da casa. É ele que faz
  // um reenvio dela escrever UMA linha e responder a mesma frase.
  corpo.requestId = pedido.requestId || '';

  const r = await chamarACasa(rota, corpo, token);

  if (r.estado === 200 && r.d.frase) return { codigo: 200, corpo: fala(r.d.frase) };
  if (r.estado === 401) {
    return {
      codigo: 200,
      corpo: {
        version: '1.0',
        response: {
          outputSpeech: { type: 'PlainText', text: 'A ligação da conta expirou. Volte a ligá-la na aplicação da Alexa.' },
          card: { type: 'LinkAccount' },
          shouldEndSession: true,
        },
      },
    };
  }
  // ⚠ A mensagem da casa vem em português e é para ser dita. As das rotas foram
  // escritas a pensar nisto — «Não percebi o dia», e não um código.
  return { codigo: 200, corpo: fala(r.d.message || 'Não consegui fazer isso agora.') };
};

// ── O servidor ───────────────────────────────────────────────────────────────

export const servidor = http.createServer((req, res) => {
  const responder = (codigo, corpo) => {
    const t = JSON.stringify(corpo);
    res.writeHead(codigo, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(t);
  };

  if (req.method === 'GET' && req.url === '/saude') return responder(200, { ok: true, skill: SKILL ? 'fixada' : 'por fixar' });
  if (req.method !== 'POST') return responder(405, { erro: 'so POST' });

  const pedacos = [];
  req.on('data', (c) => pedacos.push(c));
  req.on('end', async () => {
    // ⚠ Os BYTES, e não o texto: a assinatura é sobre o corpo tal como chegou.
    // Reconstruí-lo a partir do objecto já analisado muda-o — e a assinatura
    // deixa de bater por uma razão que ninguém encontra.
    const bytes = Buffer.concat(pedacos);

    const mau = await verificarPedido(req.headers, bytes);
    if (mau) {
      console.error(`[alexa] pedido recusado: ${mau}`);
      return responder(400, { erro: mau });
    }

    let envelope;
    try { envelope = JSON.parse(bytes.toString('utf8')); } catch (e) { return responder(400, { erro: 'corpo ilegível' }); }

    const carimbo = envelope.request && envelope.request.timestamp;
    if (!relogioAceite(carimbo)) {
      console.error('[alexa] pedido fora da janela de 150 segundos');
      return responder(400, { erro: 'fora da janela' });
    }

    try {
      const r = await responderA(envelope);
      return responder(r.codigo, r.corpo);
    } catch (e) {
      console.error(`[alexa] rebentou: ${e.message}`);
      return responder(200, fala('Não consegui fazer isso agora.'));
    }
  });
});

// Só arranca quando é ele o programa — assim as provas podem importar as
// funções sem levantar porta nenhuma.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  servidor.listen(PORTA, '127.0.0.1', () => {
    console.log(`Endpoint da skill em http://127.0.0.1:${PORTA}`);
    console.log(`A casa: ${CASA}`);
    console.log(SKILL
      ? `Skill fixada: ${SKILL}`
      : '⚠ ALEXA_SKILL_ID por definir no .env.local — aceita qualquer skill.');
  });
}
