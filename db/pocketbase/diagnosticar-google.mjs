// Porque é que a entrada pela Google falha — perguntado à Google.
//
// O PocketBase responde sempre «Failed to fetch OAuth2 user» e essa frase
// cobre três causas muito diferentes: segredo errado, redirecionamento não
// autorizado, e código já usado. Adivinhar entre as três custa uma ida à
// consola por tentativa.
//
// Isto faz uma troca de código deliberadamente inválida contra o mesmo
// endereço que o PocketBase usa. O código é falso de propósito: o que
// interessa é COMO a Google recusa.
//
//   invalid_client   → o segredo não corresponde ao identificador
//   invalid_grant    → o par está certo (a Google aceitou o cliente e só
//                      recusou o código, que era falso)
//   redirect_uri_mismatch → falta autorizar o endereço de redirecionamento
//
// ⚠ O segredo é lido do ficheiro por este script e enviado só para a Google,
// que é a dona dele. Não é impresso, não é registado, e não passa por mais
// lado nenhum.
//
//   node db/pocketbase/diagnosticar-google.mjs
import fs from 'node:fs';
import path from 'node:path';

const raiz = path.join(import.meta.dirname, '..', '..');
const lerEnv = () => {
  try {
    const txt = fs.readFileSync(path.join(raiz, '.env.local'), 'utf8');
    const pega = (k) => {
      const m = txt.match(new RegExp('^' + k + '\\s*=\\s*(.*)$', 'm'));
      return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
    };
    return { id: pega('GOOGLE_CLIENT_ID'), segredo: pega('GOOGLE_CLIENT_SECRET') };
  } catch { return { id: '', segredo: '' }; }
};

const { id, segredo } = lerEnv();
const doAmbiente = { id: process.env.GOOGLE_CLIENT_ID, segredo: process.env.GOOGLE_CLIENT_SECRET };
const clientId = id || doAmbiente.id || '';
const clientSecret = segredo || doAmbiente.segredo || '';

console.log('\n── o que está configurado ──');
console.log('  identificador: ' + (clientId ? clientId.slice(0, 24) + '…' : 'EM FALTA'));
console.log('  segredo:       ' + (clientSecret
  ? `presente, ${clientSecret.length} caracteres, começa por «${clientSecret.slice(0, 6)}»`
  : 'EM FALTA'));

if (!clientId || !clientSecret) {
  console.log('\n✕ Sem os dois não há nada a diagnosticar.\n');
  process.exit(1);
}

// A forma do segredo da Google é conhecida. Um espaço a mais, aspas coladas ou
// um corte a meio dão exatamente o mesmo «Failed to fetch OAuth2 user».
console.log('\n── a forma do segredo ──');
const avisos = [];
if (!clientSecret.startsWith('GOCSPX-')) {
  avisos.push('não começa por «GOCSPX-» — os segredos de cliente da Google começam assim');
}
if (/\s/.test(clientSecret)) avisos.push('tem espaços ou mudanças de linha lá dentro');
if (/^["']|["']$/.test(clientSecret)) avisos.push('parece ter aspas agarradas');
if (!clientId.endsWith('.apps.googleusercontent.com')) {
  avisos.push('o identificador não acaba em «.apps.googleusercontent.com»');
}
if (avisos.length) for (const a of avisos) console.log('  ⚠ ' + a);
else console.log('  nada a apontar');

const REDIRECT = process.env.PB_REDIRECT || 'http://127.0.0.1:8095/api/oauth2-redirect';

console.log('\n── o que a Google diz ──');
console.log('  redirecionamento usado: ' + REDIRECT);

const resposta = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: 'codigo-de-diagnostico-deliberadamente-invalido',
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT,
  }),
});
const corpo = await resposta.json().catch(() => ({}));
const erro = corpo.error || '(sem erro)';
const detalhe = corpo.error_description || '';

console.log('  resposta: ' + resposta.status + ' · ' + erro + (detalhe ? ' · ' + detalhe : ''));
console.log('');

if (erro === 'invalid_grant') {
  console.log('✓ O PAR ESTÁ CERTO.');
  console.log('  A Google aceitou o identificador e o segredo, e recusou só o código —');
  console.log('  que era falso de propósito. O problema da entrada está noutro sítio:');
  console.log('  no redirecionamento autorizado, ou no segredo que o PocketBase tem');
  console.log('  gravado (que pode ser diferente do que está no .env.local).');
} else if (erro === 'invalid_client') {
  console.log('✕ O SEGREDO NÃO CORRESPONDE AO IDENTIFICADOR.');
  console.log('  A Google não reconhece este par. Ou o segredo é de outro cliente OAuth,');
  console.log('  ou foi copiado com um pedaço a menos, ou foi reposto na consola e este');
  console.log('  é o antigo. Volte a copiá-lo em APIs e serviços → Credenciais.');
} else if (erro === 'redirect_uri_mismatch') {
  console.log('✕ O REDIRECIONAMENTO NÃO ESTÁ AUTORIZADO.');
  console.log('  Acrescente exatamente este endereço em «URIs de redirecionamento');
  console.log('  autorizados», no mesmo cliente OAuth:');
  console.log('      ' + REDIRECT);
} else {
  console.log('? A Google respondeu «' + erro + '», que não é um dos casos previstos.');
}
console.log('');
