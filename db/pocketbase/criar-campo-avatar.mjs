// Acrescenta o campo `avatar` a `membros`, se ainda não existir.
//
// É a URL da fotografia da conta Google. Um texto, não um ficheiro: a imagem
// vive na Google, e copiá-la para o servidor da casa seria guardar um dado
// pessoal que não precisamos de guardar.
//
// Idempotente. Não vive no `criar-colecoes.mjs` porque esse APAGA e recria a
// base toda, e isto tem de poder ser acrescentado a um servidor a andar.
import PocketBase from 'pocketbase';

const pb = new PocketBase(process.env.PB_URL || 'http://127.0.0.1:8095');
pb.autoCancellation(false);
await pb.collection('_superusers').authWithPassword(
  process.env.PB_ADMIN || 'admin@nossacasa.local',
  process.env.PB_ADMIN_PASS || 'casa-de-testes-123');

const c = await pb.collections.getOne('membros');
const FALTA = ['avatar', 'figura'].filter(n => !c.fields.some(f => f.name === n));
if (!FALTA.length) {
  console.log('membros: avatar e figura já existem');
} else {
  await pb.collections.update(c.id, {
    fields: [...c.fields, ...FALTA.map(n => ({ name: n, type: 'text', max: n === 'avatar' ? 500 : 24 }))],
  });
  console.log('membros: criado ' + FALTA.join(' e '));
}

const depois = await pb.collections.getOne('membros');
const campo = depois.fields.find(f => f.name === 'avatar');
const fig = depois.fields.find(f => f.name === 'figura');
if (!fig) { console.error('✗ figura não ficou lá'); process.exit(1); }
if (!campo) { console.error('✗ não ficou lá'); process.exit(1); }
console.log('✓ membros.avatar e membros.figura existem');
