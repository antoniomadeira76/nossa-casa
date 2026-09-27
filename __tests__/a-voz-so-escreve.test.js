/**
 * A VOZ SÓ ESCREVE — três rotas, todas POST, e nenhuma que leia.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 * A Alexa não sabe quem está a falar: um altifalante na cozinha ouve os quatro
 * e a Amazon entrega sempre a identidade do dispositivo. A resposta da fase 1
 * não é resolver a identidade — é escolher trabalho onde ela não é precisa. Por
 * voz só entra o que já é público dentro de casa, e só na direcção de ESCREVER:
 * uma ordem mal ouvida acrescenta uma linha que se apaga na app; uma leitura
 * mal dirigida não se desfaz.
 *
 * Portanto: os hooks da Alexa registam exactamente três rotas, as três POST, e
 * mais nenhuma. Qualquer `routerAdd` novo — em qualquer método, com qualquer
 * nome — fica vermelho aqui e obriga a decidir outra vez.
 *
 * ── Porque é que isto é um guarda do Jest e não uma prova do servidor ────────
 *
 * Porque a prova do servidor NÃO CONSEGUE ver isto, e a primeira versão dela
 * fingia que sim. Dizia «não existe rota de leitura nenhuma» e pedia GET a
 * `/api/alexa/lista`, `/agenda`, `/tarefas`… à espera de 404.
 *
 * Medido em 27/09/2026 contra um PocketBase de deitar fora: um GET a um caminho
 * registado como POST devolve **exactamente o mesmo** 404 `{"message":"File not
 * found."}` que um caminho que não existe de todo. Não há 405. A prova não
 * distinguia «não existe» de «existe e é POST» — e um
 * `routerAdd('POST', '/api/alexa/lista', …)` que devolvesse a lista de compras
 * inteira deixava-a verde. (Pior: ela sondava `tarefas`, e a rota chama-se
 * `tarefa`. Os 404 vinham da ausência do caminho, não da ausência de leitura.)
 *
 * O que se vê do lado de fora não chega. O que decide isto é o CÓDIGO, e é o
 * código que este guarda lê.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');

// Sem comentários: este ficheiro e o hook explicam o defeito citando os nomes
// das rotas, e sem isto o guarda apanhava-se a si próprio.
const semComentarios = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:])\/\/[^\n]*/g, (m, antes) => antes + ' '.repeat(m.length - antes.length));

const HOOKS = 'db/pocketbase/pb_hooks';

const ficheirosDaVoz = () => fs.readdirSync(path.join(RAIZ, HOOKS))
  .filter(f => /^alexa.*\.js$/.test(f))
  .map(f => `${HOOKS}/${f}`);

const rotasDe = (rel) => {
  const saida = [];
  for (const m of semComentarios(ler(rel)).matchAll(/routerAdd\(\s*['"](\w+)['"]\s*,\s*['"]([^'"]+)['"]/g)) {
    saida.push(`${m[1].toUpperCase()} ${m[2]}`);
  }
  return saida;
};

// A lista fechada. Três escritas, e a razão de cada uma está no `docs/alexa.md`.
const AS_TRES = [
  'POST /api/alexa/artigo',
  'POST /api/alexa/evento',
  'POST /api/alexa/tarefa',
];

describe('a voz só escreve', () => {
  it('o varrimento funciona — encontra os ficheiros da voz e as rotas deles', () => {
    // Um guarda que não varre nada passa sempre.
    const fich = ficheirosDaVoz();
    expect(fich.length).toBeGreaterThan(0);
    expect(fich.flatMap(rotasDe).length).toBeGreaterThan(0);
  });

  it('⚠ os hooks da Alexa registam EXACTAMENTE três rotas, e são estas', () => {
    // Quando isto falhar: ou a rota nova escreve algo que já é público dentro
    // de casa e entra nesta lista com a razão escrita no `docs/alexa.md`; ou
    // ela LÊ, e então a pergunta não é técnica — é se se quer que um
    // altifalante diga em voz alta uma coisa que não sabe a quem está a dizer.
    const achadas = ficheirosDaVoz().flatMap(rotasDe).sort();
    expect(achadas).toEqual([...AS_TRES].sort());
  });

  it('⚠ e nenhuma delas é um GET — por voz não se lê', () => {
    const lerem = ficheirosDaVoz().flatMap(rotasDe).filter(r => !r.startsWith('POST '));
    expect(lerem).toEqual([]);
  });

  it('⚠ e a frase dita não se guarda em lado nenhum', () => {
    // Guardá-la punha títulos de eventos e nomes de artigos numa SEGUNDA cópia,
    // numa coleção que não é de saúde — fora do `recusaSaude()` e de tudo o que
    // o travão da saúde defende. No reenvio, a frase refaz-se da linha criada.
    const comum = semComentarios(ler(`${HOOKS}/alexa-comum.js`));
    expect(comum).toMatch(/const fraseDe =/);
    expect(comum).not.toMatch(/set\('resposta'/);
    const colecoes = semComentarios(ler('db/pocketbase/criar-colecoes.mjs'));
    const bloco = colecoes.slice(colecoes.indexOf("name: 'alexa_pedidos'"), colecoes.indexOf("name: 'alexa_pedidos'") + 700);
    expect(bloco).not.toMatch(/txt\('resposta'/);
  });

  it('⚠ a coleção dos pedidos nasce nos DOIS sítios, e diz o mesmo nos dois', () => {
    // A regra do CLAUDE.md: o `criar-colecoes.mjs` é a verdade de como a base
    // se constrói do zero, e o `acrescentar-campos.mjs` é como ela chega a uma
    // base que já tem dados. Cada coleção nova desde 11/09 ganhou um guarda
    // escrito à mão; esta foi a primeira a nascer sem nenhum, e nada prendia
    // as duas declarações uma à outra.
    const cria = semComentarios(ler('db/pocketbase/criar-colecoes.mjs'));
    const acresc = semComentarios(ler('db/pocketbase/acrescentar-campos.mjs'));

    // Está nos dois sítios, e na lista de apagamento do `criar-colecoes.mjs`.
    expect(cria).toMatch(/name: 'alexa_pedidos'/);
    expect(cria).toMatch(/'alexa_pedidos',/);          // a lista NOSSAS
    expect(acresc).toMatch(/nome: 'alexa_pedidos'/);

    // Os mesmos campos nos dois. ⚠ E `resposta` não está em nenhum.
    for (const campo of ['casa', 'membro', 'request_id', 'intencao', 'linha', 'criado_em']) {
      expect(cria).toMatch(new RegExp(`'${campo}'`));
      expect(acresc).toMatch(new RegExp(`name: '${campo}'`));
    }

    // O mesmo índice único, letra a letra — é ele que decide quem escreve
    // quando dois pedidos iguais chegam ao mesmo tempo.
    const indice = 'CREATE UNIQUE INDEX idx_alexa_pedido ON alexa_pedidos (casa, request_id)';
    expect(cria).toContain(indice);
    expect(acresc).toContain(indice);

    // ⚠ E as cinco regras a `null` nos dois. No PocketBase, `null` é «só
    // superutilizadores» e `''` é «toda a gente, sem sessão nenhuma» — a
    // diferença entre as duas é uma tecla.
    // ⚠ A janela vai até ao FIM da declaração e não a um número de caracteres:
    // o comentário lá dentro continua a ocupar espaço depois de apagado, e uma
    // janela curta parava antes das regras — dando o guarda por falhado sem o
    // código ter nada.
    const daColecao = (texto, marca) => {
      const i = texto.indexOf(marca);
      const fim = texto.indexOf('});', i);
      return texto.slice(i, fim > i ? fim : i + 3000);
    };
    const bloco = daColecao(cria, "name: 'alexa_pedidos'");
    expect(bloco).toMatch(/listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null/);
    const blocoA = daColecao(acresc, "nome: 'alexa_pedidos'");
    expect(blocoA).toMatch(/listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null/);
  });

  it('⚠ e nenhuma rota do servidor aceita sessão de outra coleção', () => {
    // O `users` é a coleção por omissão do PocketBase, que este projeto nunca
    // usa — e tem inscrição pública. Um `requireAuth()` sem nome de coleção
    // aceitava o token de um estranho, que passava também o travão da criança
    // (um registo de `users` não tem `papel`). O que o travava era o
    // `if (!casa)`: um acaso do esquema, não uma decisão.
    const hooks = fs.readdirSync(path.join(RAIZ, HOOKS)).filter(f => f.endsWith('.pb.js'));
    const soltas = [];
    for (const f of hooks) {
      semComentarios(ler(`${HOOKS}/${f}`)).split('\n').forEach((linha, i) => {
        if (/\$apis\.requireAuth\(\s*\)/.test(linha)) soltas.push(`${HOOKS}/${f}:${i + 1}`);
      });
    }
    expect(soltas).toEqual([]);
  });

  it('⚠ e o «Começar de Zero» apaga os pedidos por voz', () => {
    // Quem pede para apagar tudo não está a excluir o que disse ao altifalante.
    // E ninguém repararia na falta: a coleção tem as cinco regras a `null`,
    // portanto nem o dono da casa a consegue ver pela app.
    expect(semComentarios(ler(`${HOOKS}/limpar-casa.pb.js`))).toMatch(/'alexa_pedidos'/);
  });
});
