// Liga o «Entrar com Google» e a leitura da agenda, sem tocar nos dados.
//
// O `criar-colecoes.mjs` também sabe fazer isto, mas recria as 26 coleções do
// zero — usá-lo só para ligar o OAuth apagava a casa. Este faz só esta parte.
//
// ── O segredo não entra aqui ─────────────────────────────────────────────────
//
// As credenciais vêm do AMBIENTE, não de um ficheiro no repositório nem de
// nada escrito neste código. O segredo do cliente é uma credencial da sua
// conta Google: quem o põe é quem o tem.
//
// A forma mais simples: pôr as duas linhas no `.env.local`, que o .gitignore
// exclui, e correr `npm run db:google`. O segredo fica num ficheiro seu, e não
// no histórico da consola.
//
// Também funciona pelo ambiente, que ganha ao ficheiro:
//   $env:GOOGLE_CLIENT_SECRET = "..."      (PowerShell)
//   GOOGLE_CLIENT_SECRET=... node ...      (Linux/macOS)
//
// ── Antes de correr ──────────────────────────────────────────────────────────
//
// No Google Cloud (console.cloud.google.com), no mesmo projeto:
//   1. APIs e Serviços → Biblioteca → ativar **Google Calendar API**
//   2. Credenciais → Criar → **ID de cliente OAuth** → Aplicação Web
//   3. URI de redirecionamento autorizado — exatamente este:
//        <URL-do-servidor>/api/oauth2-redirect
//      Em desenvolvimento: http://127.0.0.1:8095/api/oauth2-redirect
//   4. Ecrã de consentimento: enquanto estiver «em teste», só as contas que
//      indicar à mão conseguem entrar (até 100). Publicar exige verificação da
//      Google por causa do scope do Calendar, e isso demora semanas.
import PocketBase from 'pocketbase';
import fs from 'node:fs';

// Lê o .env.local se existir, para o segredo poder viver num ficheiro do
// disco de quem o tem em vez de ser escrito num comando — que fica no
// histórico da consola. O .gitignore já exclui .env.*, portanto não sai daqui.
// O ambiente ganha ao ficheiro: quem exporta a variável está a ser explícito.
const doFicheiro = (() => {
  try {
    return Object.fromEntries(fs.readFileSync('.env.local', 'utf8')
      .split(/\r?\n/)
      .filter(l => /^[A-Z_]+=/.test(l.trim()))
      .map(l => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
      }));
  } catch { return {}; }
})();
const doAmbiente = (n) => process.env[n] || doFicheiro[n] || '';

const URL = doAmbiente('PB_URL') || 'http://127.0.0.1:8095';
const ID = doAmbiente('GOOGLE_CLIENT_ID');
const SEGREDO = doAmbiente('GOOGLE_CLIENT_SECRET');

if (!ID || !SEGREDO) {
  console.error(
    'Faltam credenciais no ambiente.\n'
    + '  GOOGLE_CLIENT_ID     ' + (ID ? '✓' : '— em falta')
    + '\n  GOOGLE_CLIENT_SECRET ' + (SEGREDO ? '✓' : '— em falta')
    + '\n\nVer o cabeçalho deste ficheiro, ou docs/GOOGLE_CALENDAR_SETUP.md.');
  process.exit(1);
}

// As credenciais do superutilizador vêm do ambiente. Os valores por omissão
// são os do servidor de desenvolvimento e estão aqui para este script correr
// sem preparação nenhuma — mas num servidor a sério o administrador é outro, e
// a palavra-passe não deve estar escrita num ficheiro versionado.
const ADMIN = doAmbiente('PB_ADMIN') || 'admin@nossacasa.local';
const ADMIN_PASS = doAmbiente('PB_ADMIN_PASS') || 'casa-de-testes-123';

const pb = new PocketBase(URL);
await pb.collection('_superusers').authWithPassword(ADMIN, ADMIN_PASS);

const membros = (await pb.collections.getFullList()).find(c => c.name === 'membros');
if (!membros) {
  console.error('A coleção `membros` não existe. Corra primeiro: npm run db:colecoes');
  process.exit(1);
}

await pb.collections.update(membros.id, {
  oauth2: {
    enabled: true,
    providers: [{ name: 'google', clientId: ID, clientSecret: SEGREDO }],
    // O nome vem do perfil Google; o resto é da casa e não se deixa mapear.
    // Em particular o papel: quem entra pelo Google não escolhe se é
    // administrador. Isso é da casa, e um adulto é que o define.
    mappedFields: { name: 'nome' },
  },
});

// Confirmar contra o servidor, não contra a nossa esperança.
const metodos = await pb.collection('membros').listAuthMethods();
const provedores = (metodos.oauth2?.providers || []).map(p => p.name);

console.log(`OAuth ativado: ${metodos.oauth2?.enabled ? 'sim' : 'NÃO'}`);
console.log(`Provedores: ${provedores.join(', ') || 'nenhum'}`);
console.log(`Redirecionamento a autorizar na Google: ${URL}/api/oauth2-redirect`);

if (!provedores.includes('google')) {
  console.error('\nO servidor não ficou com o provedor. Verifique as credenciais.');
  process.exit(1);
}

// ⚠ `membros` não tem regra de criação: entrar com Google NÃO cria conta.
// Quem não tiver sido acrescentado à casa por um administrador é recusado, e
// numa app familiar é essa a porta certa. Se quiser deixar alguém entrar,
// acrescente-o primeiro em Gestão da Casa → Membros, com o e-mail da conta
// Google que vai usar.
console.log('\nPronto. Note que entrar com Google não cria conta: o membro tem de');
console.log('já existir na casa, com o e-mail da conta Google que vai usar.');
