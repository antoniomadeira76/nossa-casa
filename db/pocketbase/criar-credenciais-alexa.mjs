// Gera o `client_id` e o `client_secret` da skill da Alexa, uma vez por casa.
//
//   node db/pocketbase/criar-credenciais-alexa.mjs
//
// São eles que a Amazon põe no Account Linking da skill, e é com eles que ela
// troca um código por um token. Quem os tiver pode pedir um token em nome de
// quem autorizou — por isso vivem numa coleção com as cinco regras a `null`,
// onde só os hooks e o superutilizador chegam.
//
// ⚠ Correr isto duas vezes NÃO gera credenciais novas.
//
// Trocá-las parte a ligação que já existe: a Amazon fica com as antigas, e a
// primeira coisa que o altifalante disser leva um 401 que ninguém percebe. Para
// as trocar de propósito há o `--novo`, que o diz por escrito antes de o fazer.
import PocketBase from 'pocketbase';
import { SUPERUTILIZADOR, SUPER_PALAVRA, URL_DO_SERVIDOR } from './ambiente.mjs';
import { sair } from './sair.mjs';

const pb = new PocketBase(URL_DO_SERVIDOR);
pb.autoCancellation(false);
await pb.collection('_superusers').authWithPassword(SUPERUTILIZADOR, SUPER_PALAVRA);

const novo = process.argv.includes('--novo');

const casas = await pb.collection('casas').getFullList();
if (!casas.length) {
  console.error('Não há casa nenhuma neste servidor. Entre na app uma vez primeiro.');
  await sair(1);
}

// Letras e algarismos, sem símbolos: estes valores são copiados à mão para a
// consola da Amazon, e um `+` ou um `/` num campo de formulário é um convite ao
// erro que depois se procura durante uma hora.
const aoAcaso = (n) => {
  const letras = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < n; i++) s += letras[Math.floor(Math.random() * letras.length)];
  return s;
};

for (const casa of casas) {
  let linha = null;
  try {
    linha = await pb.collection('credenciais_alexa').getFirstListItem(`casa = "${casa.id}"`);
  } catch (e) { /* ainda não tem */ }

  if (linha && !novo) {
    console.log(`\nCasa «${casa.nome}» — já tem credenciais. Não lhes toco.`);
    console.log(`  Client ID:     ${linha.client_id}`);
    console.log(`  Client secret: ${linha.client_secret}`);
    console.log('  (para as TROCAR, e partir a ligação que existe: --novo)');
    continue;
  }

  const dados = { casa: casa.id, client_id: `nossacasa-${aoAcaso(16)}`, client_secret: aoAcaso(48) };
  if (linha) {
    console.log(`\n⚠ Casa «${casa.nome}» — a TROCAR as credenciais. A ligação que existe deixa de servir:`);
    console.log('  a Amazon fica com as antigas, e o altifalante leva 401 até ser ligado outra vez.');
    await pb.collection('credenciais_alexa').update(linha.id, dados);
  } else {
    console.log(`\nCasa «${casa.nome}» — credenciais novas:`);
    await pb.collection('credenciais_alexa').create(dados);
  }
  console.log(`  Client ID:     ${dados.client_id}`);
  console.log(`  Client secret: ${dados.client_secret}`);
}

console.log('\nNa consola da Amazon, em Account Linking, com o endereço público desta casa:');
console.log('  Authorization URI   https://<a-casa>/api/alexa/autorizar');
console.log('  Access Token URI    https://<a-casa>/api/alexa/token');
console.log('  Scope               casa.escrever');
console.log('\n⚠ O segredo não se volta a ver em lado nenhum sem ser aqui ou na base.');
