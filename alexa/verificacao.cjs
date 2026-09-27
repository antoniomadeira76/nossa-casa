// As partes PURAS da verificação da Alexa — as que se provam sem levantar nada.
//
// ⚠ Isto é CommonJS (`.cjs`) de propósito, e não por gosto.
//
// O serviço (`servidor-da-skill.mjs`) é um módulo ES, porque é o que corre como
// programa. O Jest deste projeto corre em CommonJS e transforma um `import()`
// num `require()` — que não resolve um `file://` e dá «Cannot find module» a
// apontar para um ficheiro que está claramente lá.
//
// Dava para contornar com um truque no teste. Não se contorna: as funções que
// decidem quem entra são as que mais precisam de ser postas à prova, e o sítio
// delas é um módulo que os dois lados leem sem artifício. O Node importa um
// `.cjs` de dentro de um `.mjs` sem queixa; o Jest faz-lhe `require` direto.
//
// O guarda é `__tests__/a-assinatura-da-alexa.test.js`.
const crypto = require('node:crypto');
const tls = require('node:tls');
const path = require('node:path');

// ── O endereço de onde se descarrega a cadeia ────────────────────────────────
//
// Confere-se ANTES de lá ir. Quem escolhe de onde se descarrega o certificado
// escolhe quem assina — e o endereço vem no cabeçalho do pedido, ou seja, de
// quem estamos a tentar verificar.
// ⚠ Sem `new URL()`, e isto não é preferência.
//
// A primeira versão usava-o. Em Node puro devolvia `true` para o endereço
// verdadeiro; dentro do Jest deste projeto (`jest-expo`) devolvia `false` — o
// `URL` de lá não é o do Node, rebenta, e o `try/catch` engolia-o em silêncio.
// O guarda ficou vermelho a dizer que o endereço verdadeiro era inválido.
//
// É a mesma pedra que está na memória desta casa: «o React Native não tem URL».
// Uma função que decide quem entra não pode responder coisas diferentes
// conforme o sítio onde corre — e a que foi provada tem de ser a que corre.
const enderecoDaCadeiaValido = (url) => {
  const s = String(url || '');
  if (s.length > 500) return false;
  // esquema://anfitrião[:porta]/caminho — sem nada antes, e com o `@` de fora,
  // que é o truque de pôr o anfitrião verdadeiro no lugar do utilizador.
  const m = s.match(/^https:\/\/([a-zA-Z0-9.-]+)(?::(\d+))?(\/[^\s?#]*)/);
  if (!m) return false;
  if (m[1].toLowerCase() !== 's3.amazonaws.com') return false;
  if (m[2] && m[2] !== '443') return false;
  // ⚠ `/echo.api/` com a barra, e depois de NORMALIZAR: um
  // `/echo.api/../evil/cert.pem` passaria numa comparação ingénua.
  return path.posix.normalize(m[3]).startsWith('/echo.api/');
};

// ── A janela do relógio ──────────────────────────────────────────────────────
//
// 150 segundos, que é o que a Amazon manda — e para os DOIS lados: um relógio
// adiantado é tão suspeito como um atrasado. Um é uma gravação a ser repetida
// mais tarde; o outro é uma forjada com data do futuro.
const relogioAceite = (carimbo, agora) => {
  const t = Date.parse(String(carimbo || ''));
  if (!Number.isFinite(t)) return false;
  return Math.abs((agora || Date.now()) - t) <= 150 * 1000;
};

const RAIZES = tls.rootCertificates.map((p) => new crypto.X509Certificate(p));

// ── A cadeia de confiança ────────────────────────────────────────────────────
//
// Sobe até ao PRIMEIRO âncora, e pára aí.
//
// ⚠ A primeira versão subia até ao TOPO e só depois procurava a raiz. Com a
// cadeia verdadeira da Alexa isso RECUSA TUDO — medido em 27/09/2026 contra o
// certificado real, que está guardado em `alexa/amostras/`:
//
//   CN=echo-api.amazon.com
//   CN=Amazon RSA 2048 M01
//   CN=Amazon Root CA 1                                    ← o âncora está AQUI
//   CN=Starfield Services Root Certificate Authority - G2  ← e isto vem a mais
//
// O quarto elo é um *cross-sign*: um Starfield Services Root G2 assinado por
// OUTRA autoridade, com impressão diferente da raiz que o sistema tem. Olhando
// só para o topo, nada encaixa — e o endpoint recusaria todos os pedidos da
// Amazon, o que só se descobriria com a skill publicada e o altifalante calado.
//
// O que vem depois de um âncora é história, não prova.
const cadeiaDeConfianca = (certs, agora) => {
  const quando = agora || new Date();
  if (!certs || !certs.length) return 'a cadeia está vazia';

  for (let i = 0; i < certs.length; i++) {
    const c = certs[i];
    // A validade confere-se só nos elos que se USAM: um cross-sign expirado
    // depois do âncora não diz nada sobre a assinatura.
    if (new Date(c.validFrom) > quando || new Date(c.validTo) < quando) {
      return 'um certificado da cadeia está fora de validade';
    }
    if (RAIZES.some((r) => r.fingerprint256 === c.fingerprint256)) return null;
    const raiz = RAIZES.find((r) => c.checkIssued(r) && c.verify(r.publicKey));
    if (raiz) {
      if (new Date(raiz.validTo) < quando) return 'a raiz de confiança está fora de validade';
      return null;
    }
    if (i === certs.length - 1) return 'a cadeia não chega a uma raiz de confiança';
    if (!c.checkIssued(certs[i + 1])) return 'a cadeia não encaixa';
    if (!c.verify(certs[i + 1].publicKey)) return 'uma assinatura da cadeia não bate';
  }
  return 'a cadeia não chega a uma raiz de confiança';
};

// ── O mapa das intenções ─────────────────────────────────────────────────────
//
// Uma intenção, uma rota. É o mapa inteiro, e é de propósito que cabe aqui: o
// guarda compara-o com o `modelo-de-interacao.pt-BR.json` e exige que digam o
// mesmo. Uma intenção no modelo sem rota é um pedido que a Alexa aceita e a
// casa não sabe fazer; uma rota sem intenção é código morto.
const slot = (pedido, nome) => {
  const s = pedido && pedido.intent && pedido.intent.slots && pedido.intent.slots[nome];
  return s && s.value ? String(s.value) : '';
};

const ROTAS = {
  AcrescentarArtigo: (p) => ['artigo', { artigo: slot(p, 'artigo') }],
  AcrescentarTarefa: (p) => ['tarefa', { titulo: slot(p, 'titulo') }],
  MarcarEvento: (p) => ['evento', { titulo: slot(p, 'titulo'), dia: slot(p, 'data'), hora: slot(p, 'hora') }],
};

module.exports = { enderecoDaCadeiaValido, relogioAceite, cadeiaDeConfianca, slot, ROTAS, RAIZES };
