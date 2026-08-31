// A coleção que guarda a autorização de longa duração da agenda da Google.
//
// ── Porque é que existe ──────────────────────────────────────────────────────
//
// O token de acesso da Google dura uma hora. Havia três sítios possíveis para
// a autorização viver, e dois são maus:
//
//   memória do telemóvel  → morre ao fechar o separador; pede-se a entrada
//                           outra vez a cada sessão. Era o que estava.
//   disco do telemóvel    → deixa de pedir, mas fica uma credencial da conta
//                           Google de alguém gravada no aparelho.
//   AQUI, no servidor     → o `refresh_token` nunca sai daqui. O telemóvel
//                           recebe, quando precisa, um token de acesso de uma
//                           hora, que não persiste em lado nenhum.
//
// ── Porque é que não se usa o fluxo do PocketBase ────────────────────────────
//
// Porque não dá. O PocketBase 0.40.1 devolve um campo `refreshToken` na
// resposta do OAuth, mas nunca pede `access_type=offline` à Google — e sem
// isso a Google não emite refresh token nenhum. Verificado no binário:
// `refreshToken` aparece seis vezes, `access_type` zero. O campo vem sempre
// vazio para a Google. O fluxo tem de ser nosso (ver `pb_hooks/agenda-google`).
//
// ── Quem pode ler isto ──────────────────────────────────────────────────────
//
// Ninguém, pela API. As quatro regras ficam nulas, o que no PocketBase quer
// dizer «só superutilizador» — e portanto só os hooks, que correm com esse
// privilégio. Um adulto da casa não lê a autorização do outro, e nem a sua
// própria: não tem nada que a ver, só que ela funcione.
//
// É idempotente: correr outra vez não estraga nada. Não vive no
// `criar-colecoes.mjs` porque esse APAGA e recria a base toda, e isto tem de
// poder ser acrescentado a um servidor que já está a andar.
import PocketBase from 'pocketbase';

const pb = new PocketBase(process.env.PB_URL || 'http://127.0.0.1:8095');
pb.autoCancellation(false);
await pb.collection('_superusers').authWithPassword(
  process.env.PB_ADMIN || 'admin@nossacasa.local',
  process.env.PB_ADMIN_PASS || 'casa-de-testes-123');

const membros = await pb.collections.getOne('membros');

const definicao = {
  name: 'credenciais_agenda',
  type: 'base',
  // As quatro nulas: só o superutilizador, portanto só os hooks.
  listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
  fields: [
    { name: 'membro', type: 'relation', required: true,
      collectionId: membros.id, cascadeDelete: true, maxSelect: 1 },
    // A autorização de longa duração. Vem da Google e nunca sai daqui.
    { name: 'refresh_token', type: 'text' },
    // O `state` do fluxo OAuth, enquanto ele está a meio: liga o retorno da
    // Google ao membro que o começou. Sem isto, quem interceptasse o retorno
    // podia pendurar a sua conta Google na casa de outra pessoa.
    { name: 'estado', type: 'text' },
    { name: 'estado_em', type: 'autodate', onUpdate: true },
  ],
  indexes: [
    // Um membro, uma autorização. Sem isto, ligar duas vezes deixava duas
    // linhas e a segunda leitura podia devolver a antiga.
    'CREATE UNIQUE INDEX idx_credenciais_membro ON credenciais_agenda (membro)',
  ],
};

let c = null;
try { c = await pb.collections.getOne('credenciais_agenda'); } catch { /* não existe */ }

if (c) {
  await pb.collections.update(c.id, definicao);
  console.log('credenciais_agenda: actualizada');
} else {
  await pb.collections.create(definicao);
  console.log('credenciais_agenda: criada');
}

// A prova de que as regras são o que se quer, dita aqui e não só esperada.
const depois = await pb.collections.getOne('credenciais_agenda');
for (const r of ['listRule', 'viewRule', 'createRule', 'updateRule', 'deleteRule']) {
  if (depois[r] !== null) {
    console.error(`✗ ${r} devia ser nula e é ${JSON.stringify(depois[r])}`);
    process.exit(1);
  }
}
console.log('✓ as cinco regras são nulas — só os hooks lhe chegam');
