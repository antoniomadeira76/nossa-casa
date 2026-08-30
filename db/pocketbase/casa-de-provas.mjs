// A casa onde as provas trabalham, e só ela.
//
// Antes, cada prova começava por apagar `membros`, `casas`, `despesas` e
// `cofre_movimentos` INTEIROS. Isso torna-as fiáveis — partem sempre de estado
// conhecido — mas significa que correr as provas apaga a casa de quem estiver
// a usar o servidor. Basta um `npm run db:provar` para o membro que entrou com
// a Google desaparecer.
//
// Agora as provas têm casa própria, marcada pelo nome, e a limpeza só toca no
// que lhe pertence. O que estiver noutra casa fica onde está.
//
// O isolamento não é só arrumação: várias provas verificam que uma casa não vê
// a outra. Para isso é preciso existir uma segunda casa — e ela também é de
// provas, também é limpa, e também não toca em mais nada.
import PocketBase from 'pocketbase';

export const URL = process.env.PB_URL || 'http://127.0.0.1:8095';

// As credenciais do superutilizador vêm do ambiente. Os valores por omissão
// são os do servidor de desenvolvimento e estão aqui para estes scripts
// correrem sem preparação nenhuma — mas num servidor a sério o administrador é
// outro, e a palavra-passe não deve estar escrita num ficheiro versionado.
const ADMIN = process.env.PB_ADMIN || 'admin@nossacasa.local';
const ADMIN_PASS = process.env.PB_ADMIN_PASS || 'casa-de-testes-123';

// O prefixo é o que distingue uma casa de provas de uma casa a sério. Está no
// nome porque é o único campo que se lê de fora sem convenções extra.
export const PREFIXO = '[provas] ';

export async function ligarComoAdmin() {
  const pb = new PocketBase(URL);
  await pb.collection('_superusers').authWithPassword(ADMIN, ADMIN_PASS);
  return pb;
}

// Apaga tudo o que pertence às casas de provas, e nada mais.
//
// A ordem importa: primeiro o que aponta para outras linhas, depois as linhas
// apontadas. Ao contrário, o servidor recusa por causa das relações.
const DEPENDENTES = [
  'anexos', 'episodios_saude', 'tarefas_feitas', 'artigos', 'listas_compras',
  'cofre_movimentos', 'despesas', 'transferencias', 'acertos', 'manutencoes',
  'eventos', 'tarefas', 'equipamentos', 'envelopes', 'metas', 'meses',
  'lojas', 'categorias_equip', 'especialidades', 'preferencias', 'membros',
];

export async function limparCasasDeProvas(pb) {
  const casas = await pb.collection('casas').getFullList();
  const nossas = casas.filter(c => String(c.nome).startsWith(PREFIXO));
  if (!nossas.length) return { casas: 0, linhas: 0 };

  const ids = new Set(nossas.map(c => c.id));
  let linhas = 0;
  for (const colecao of DEPENDENTES) {
    let registos;
    try { registos = await pb.collection(colecao).getFullList(); }
    catch { continue; }              // a coleção pode não existir neste servidor
    for (const r of registos) {
      if (!ids.has(r.casa)) continue;   // de outra casa — não se toca
      await pb.collection(colecao).delete(r.id).catch(() => {});
      linhas++;
    }
  }
  for (const c of nossas) await pb.collection('casas').delete(c.id).catch(() => {});
  return { casas: nossas.length, linhas };
}

// Uma casa de provas, limpa, com o nome marcado.
export async function criarCasa(pb, nome, campos = {}) {
  return pb.collection('casas').create({
    nome: PREFIXO + nome, valor_ponto: 0.10, ...campos,
  });
}

// Um membro dessa casa. O `login` leva o id da casa, que é o que o torna único
// entre casas sem depender do nome.
export async function criarMembro(pb, casa, nome, papel, extra = {}) {
  return pb.collection('membros').create({
    nome, login: `${casa.id}_${nome.toLowerCase()}`, casa: casa.id, papel, ...extra,
  });
}

// O arranque comum: liga, limpa o que é das provas, e devolve o cliente.
//
// A limpeza também fica agendada para o FIM. Limpar só ao arranque bastava
// para as provas serem fiáveis, mas deixava a última corrida no servidor: a
// seguir a um `npm run db:provar`, quem abrisse o painel do PocketBase via
// uma casa «[provas] …» e três membros inventados ao lado da casa a sério.
// Arrumar atrás de si é mais barato do que explicar o que aquilo é.
export async function comecar() {
  const pb = await ligarComoAdmin();
  const limpo = await limparCasasDeProvas(pb);
  let arrumado = false;
  const arrumar = async () => {
    if (arrumado) return;
    arrumado = true;
    try { await limparCasasDeProvas(pb); } catch { /* o servidor caiu; fica para a próxima */ }
  };
  // `beforeExit` não corre depois de um `process.exit()`, que é como as provas
  // acabam para devolver o código de saída. `exit` corre, mas é síncrono e não
  // espera por promessas — por isso a limpeza entra no `process.exit`, antes.
  const sairOriginal = process.exit.bind(process);
  process.exit = (codigo) => { arrumar().finally(() => sairOriginal(codigo)); };
  process.on('beforeExit', arrumar);
  return { pb, limpo, arrumar };
}
