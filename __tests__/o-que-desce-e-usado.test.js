/**
 * ⚠ O que a leitura calcula, alguém tem de USAR.
 *
 * ── O buraco que este guarda tapa ────────────────────────────────────────────
 *
 * O `o-que-sobe.test.js` pergunta «esta chave é mencionada no `sync.js`?». O
 * `provar-relacoes-ancoradas` pergunta pelas regras do servidor. Nenhum dos dois
 * pergunta a segunda metade do caminho: **o `store.jsx` faz alguma coisa com o
 * que o `puxarCasa` devolve?**
 *
 * Faltava, e custou. O `registered` — o gasto do mês — era calculado pela
 * leitura, devolvido, e NUNCA aplicado à loja. Numa casa a sério o orçamento
 * dizia «0,00 € gastos» com dez despesas na base de dados: as do outro adulto
 * nunca contavam, e as deste telefone desapareciam ao recarregar a página.
 *
 * Não deu erro nenhum, não falhou prova nenhuma, e só apareceu quando semeei a
 * casa para a experimentar com dados a sério. Uma soma que o servidor faz e o
 * cliente ignora é indistinguível de uma casa vazia.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 * Cada campo do objeto que o `puxarCasa` devolve tem de aparecer no `store.jsx`
 * como `casa.<campo>`. É o mínimo: não prova que é BEM usado, prova que é lido.
 *
 * O que estiver de fora está lá para nada — e a lista de exceções obriga a
 * escrever porquê.
 */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const sync = fs.readFileSync(path.join(raiz, 'src/sync.js'), 'utf8');
const loja = fs.readFileSync(path.join(raiz, 'src/store.jsx'), 'utf8');

// O objeto que o `puxarCasa` devolve.
const i = sync.indexOf('  return {', sync.indexOf('export async function puxarCasa'));
const devolve = sync.slice(i, sync.indexOf('\n  };', i));
const CAMPOS = [...devolve.matchAll(/^\s{4}(\w+)[,:]/gm)].map(m => m[1]);

// Campos que o `store.jsx` não lê por `casa.<campo>`, com a razão escrita.
const NAO_SE_LEEM = {
  // O `lerDoServidor` usa-o para o mapa de ids do servidor, por `casa._servidor`.
  _servidor: 'lido por `casa._servidor`, no mapa de identificadores',
  casaId: 'lido por `casa.casaId`, no mesmo mapa',
};

describe('⚠ o que a leitura devolve, a loja usa', () => {
  it('há campos para conferir — senão isto não prova nada', () => {
    expect(CAMPOS.length).toBeGreaterThanOrEqual(20);
  });

  it('⚠ nenhum campo devolvido fica sem quem o leia', () => {
    // A mensagem diz QUAIS. Cada um destes é uma soma que o servidor faz e o
    // ecrã ignora — e o ecrã fica com ar de casa vazia.
    const porUsar = CAMPOS
      .filter(c => !NAO_SE_LEEM[c])
      .filter(c => !new RegExp(`casa\\.${c}\\b`).test(loja));
    expect(porUsar).toEqual([]);
  });

  it('⚠ e nenhuma exceção sobra — uma que já não exista esconde a próxima', () => {
    const aMais = Object.keys(NAO_SE_LEEM).filter(c => !CAMPOS.includes(c));
    expect(aMais).toEqual([]);
  });

  it('as duas exceções são mesmo lidas, só que por outro nome', () => {
    for (const c of Object.keys(NAO_SE_LEEM)) {
      expect(loja).toMatch(new RegExp(`casa\\.${c}\\b`));
    }
  });
});
