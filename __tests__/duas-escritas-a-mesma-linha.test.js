/**
 * Uma escrita não se perde por chegar outra atrás dela.
 *
 * ── O defeito ────────────────────────────────────────────────────────────────
 *
 * O SDK do PocketBase cancela sozinho um pedido pendente quando lhe chega
 * outro com a MESMA chave — coleção, acção e identificador. Para leituras é
 * útil: um ecrã que relê ao rolar não empilha pedidos. Para escritas é uma
 * armadilha, porque a primeira é abortada **em silêncio**: sem erro, sem nada
 * na consola, e o `.catch(() => {})` que a app põe em todas as escritas apanha
 * o cancelamento e não o distingue de uma rede em baixo.
 *
 * Medido em 08/09/2026, com a casa a sério e um telemóvel: passar as bananas
 * dos «Frescos» para a «Mercearia» fazia duas escritas na mesma linha no mesmo
 * tique — o corredor, e o posto dentro do corredor novo. O ecrã mostrava as
 * bananas na Mercearia. O servidor continuava a ter «Frescos». O outro
 * telemóvel nunca soube.
 *
 * ── O que isto tem de instrutivo ─────────────────────────────────────────────
 *
 * Os SCRIPTS que mexem na casa a sério — `semear-simulacao`, `migrar-seccoes`,
 * `acrescentar-campos`, `criar-campo-avatar`, `criar-credenciais-agenda` —
 * têm todos `pb.autoCancellation(false)` na terceira linha. Fazem escritas
 * seguidas e sem ele perdiam-nas. A app faz as mesmas escritas e nunca o teve.
 *
 * ⚠ E os ficheiros de PROVAS do servidor não o tinham — vinte deles construíam
 * clientes de telemóvel sem ele. Escrevi aqui, na primeira versão desta prova,
 * que «os vinte e dois têm todos», e era falso: contei os scripts e disse
 * provas. Os clientes deles escapavam por sorte, porque cada prova espera pela
 * anterior com `await`; o dia em que uma fizesse duas escritas seguidas sem
 * esperar, sumia uma, e a prova ficava verde. Passaram a ter, os trinta e seis.
 *
 * ⚠ As 1789 provas do Jest não podiam apanhar o defeito original: correm sem
 * servidor. Foi preciso mexer na app ligada e ir ver a linha do outro lado.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 * Todo o cliente do PocketBase que esta casa constrói tem o cancelamento
 * automático DESLIGADO. Enumera-se do disco: um ficheiro novo que construa um
 * cliente entra nesta prova sozinho.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');

describe('⚠ o cliente da app não cancela escritas', () => {
  const cliente = ler('src/pocketbase.js');

  it('⚠ o cliente partilhado desliga o cancelamento automático', () => {
    // Uma escrita perdida é pior do que uma leitura repetida.
    expect(cliente).toMatch(/autoCancellation\(false\)/);
  });

  it('e desliga-o no MESMO sítio onde o cliente nasce', () => {
    // Desligá-lo noutro sítio deixava uma janela entre a construção e a
    // chamada, e a primeira escrita da sessão podia cair nela.
    const i = cliente.indexOf('cliente = new PocketBase(');
    expect(i).toBeGreaterThan(0);
    const bloco = cliente.slice(i, i + 1600);
    expect(bloco).toMatch(/cliente\.autoCancellation\(false\)/);
  });
});

describe('⚠ e TODO o cliente que esta casa constrói diz o mesmo', () => {
  // ⚠ Enumera-se do disco, e cliente a cliente — não ficheiro a ficheiro. Um
  // ficheiro com dois clientes e o desligar num só passava por bom, e é
  // exactamente a forma que os `provar-gerir-casa` e `provar-ordem-e-registo`
  // têm: três e quatro telemóveis cada um.
  const ficheiros = fs.readdirSync(path.join(RAIZ, 'db/pocketbase'))
    .filter(f => f.endsWith('.mjs'))
    .map(f => [`db/pocketbase/${f}`, ler(`db/pocketbase/${f}`)]);

  // Cada `const|let NOME = new PocketBase(...)`, com o ficheiro e a linha.
  const clientes = [];
  for (const [rel, txt] of ficheiros) {
    const linhas = txt.split('\n');
    linhas.forEach((l, i) => {
      const m = l.match(/^\s*(?:const|let) (\w+) = new PocketBase\(/);
      if (m) clientes.push({ rel, linha: i + 1, nome: m[1], seguinte: linhas[i + 1] || '' });
    });
  }

  it('há clientes para conferir — senão isto não prova nada', () => {
    expect(clientes.length).toBeGreaterThan(20);
  });

  it('⚠ cada um desliga o cancelamento na linha seguinte à que o cria', () => {
    // Na linha SEGUINTE, e não em qualquer sítio do ficheiro: entre a
    // construção e a chamada não pode haver uma escrita.
    const maus = clientes
      .filter(c => !new RegExp(`^\\s*${c.nome}\\.autoCancellation\\(false\\)`).test(c.seguinte))
      .map(c => `${c.rel}:${c.linha} → ${c.nome}`);
    expect(maus).toEqual([]);
  });

  it('⚠ e um cliente que vive para uma chamada só está isento, com razão', () => {
    // `new PocketBase(URL).collection(...).getFullList()` é um cliente que
    // nasce, faz um pedido e morre: não tem com que colidir. Ficam de fora
    // desta prova de propósito, e há-os — se deixasse de haver, esta prova
    // avisaria que a isenção já não é precisa.
    const inline = ficheiros
      .filter(([, txt]) => /new PocketBase\([^)]*\)\.collection/.test(txt));
    expect(inline.length).toBeGreaterThan(0);
  });
});

describe('⚠ e a loja não escreve duas vezes na mesma linha', () => {
  // A porta fechada não dispensa não bater nela. Mudar de corredor escreve o
  // corredor E a ordem do corredor de destino; a ordem inclui o artigo que
  // acabou de chegar, e por isso as duas caíam na mesma linha.
  const loja = ler('src/store.jsx')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .split('\n').map(l => (/^\s*(\/\/|\*)/.test(l) ? '' : l)).join('\n');

  const bloco = () => {
    const i = loja.indexOf('const alterarArtigo = (');
    expect(i).toBeGreaterThan(0);
    return loja.slice(i, loja.indexOf('\n  };', i));
  };

  it('⚠ o `alterarArtigo` não chama o `reordenarArtigos` do `sync`', () => {
    // Era isso: `sync.alterarArtigo(banana, {corredor})` e, no mesmo tique,
    // `sync.reordenarArtigos([frango, banana])` — duas escritas na banana.
    expect(bloco()).not.toMatch(/sync\.reordenarArtigos/);
  });

  it('e o artigo que muda de corredor leva o posto na MESMA escrita', () => {
    expect(bloco()).toMatch(/posto: i \+ 1/);
  });
});
