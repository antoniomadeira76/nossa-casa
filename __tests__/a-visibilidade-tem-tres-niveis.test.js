/**
 * A VISIBILIDADE TEM TRÊS NÍVEIS, E QUEM FALA DELA TEM DE CONHECER OS TRÊS
 * =======================================================================
 *
 * `so-eu`, `adultos`, `familia`. É o que a loja devolve (`visibilidadeDe`, em
 * `src/store.jsx`), o que a `PastilhaVisibilidade` pinta, e o que o servidor
 * impõe — o INVARIANTE #3.
 *
 * O `ConfirmShare` conhecia DOIS (16/09/2026). Recebia `isPrivate`, um sim ou
 * não, e a tudo o que não fosse «Só eu» dizia:
 *
 *     «Este evento será visível para toda a família.»
 *
 * Com «Adultos» escolhido — o nível do meio, o de uma prenda ou de uma consulta
 * — a app prometia a família inteira e guardava outra coisa. É a última coisa
 * que se lê antes de o evento sair para a agenda da Google, onde convida quem
 * for por e-mail; e uma confirmação que descreve mal o que vai fazer é pior do
 * que não haver confirmação nenhuma, porque quem a lê deixa de a ler.
 *
 * ── A propriedade ──────────────────────────────────────────────────────────
 *
 *   1. O `ConfirmShare` tem uma frase POR NÍVEL, e as três dizem coisas
 *      diferentes.
 *   2. A frase do «adultos» não promete a família, e a do «familia» não a nega.
 *   3. Quem o chama passa a visibilidade inteira, e não um booleano.
 *   4. Os níveis que ele conhece são EXACTAMENTE os que a loja devolve — se a
 *      casa ganhar um quarto nível, esta prova cai.
 *   5. Os dois botões têm papel e rótulo de voz.
 */
const fs = require('fs');
const path = require('path');
const React = require('react');
const TestRenderer = require('react-test-renderer');
const ConfirmShare = require('../src/ConfirmShare').default;
const { buildTheme } = require('../src/theme');
const { visibilidadeDe } = require('../src/store');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
// ⚠ Sem os comentários, para as asserções de «já não existe» não apanharem a
// própria frase que EXPLICA que já não existe. O comentário deste ficheiro
// escreve `isPrivate` cinco vezes a dizer que ele saiu — e uma prova que lê
// texto não distingue código de explicação. É a armadilha documentada em
// `armadilhas-de-tratar-codigo-como-texto`, e apanhou-me outra vez.
const codigoDe = (p) => ler(p)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/[^\n]*/gm, '');
const T = buildTheme(1, false);

const textos = (arvore) => {
  const fora = [];
  const andar = (n) => {
    if (n === null || n === undefined || n === false) return;
    if (typeof n === 'string' || typeof n === 'number') { fora.push(String(n)); return; }
    if (Array.isArray(n)) { n.forEach(andar); return; }
    if (n.children) n.children.forEach(andar);
  };
  andar(arvore);
  return fora.join(' ');
};

const desenhar = (visibilidade) => {
  let r;
  TestRenderer.act(() => {
    r = TestRenderer.create(React.createElement(ConfirmShare, {
      t: T, visibilidade, onConfirm: () => {}, onCancel: () => {},
    }));
  });
  return r;
};

describe('⚠ a visibilidade tem três níveis', () => {
  it('os níveis que o diálogo conhece são os que a loja devolve', () => {
    // A loja decide os níveis; o diálogo segue-a. Um quarto nível na loja faz
    // esta prova cair, que é o que se quer.
    expect(visibilidadeDe({ visibilidade: 'so-eu' })).toBe('so-eu');
    expect(visibilidadeDe({ visibilidade: 'adultos' })).toBe('adultos');
    expect(visibilidadeDe({ visibilidade: 'familia' })).toBe('familia');
    // E os dois caminhos antigos, que ainda existem em dados guardados.
    expect(visibilidadeDe({ shared: true })).toBe('familia');
    expect(visibilidadeDe(null)).toBe('so-eu');

    const fonte = ler('src/ConfirmShare.jsx');
    for (const nivel of ['so-eu', 'adultos', 'familia']) {
      expect(fonte).toContain(nivel === 'so-eu' ? "'so-eu'" : nivel);
    }
  });

  it('⚠ cada nível tem a SUA frase, e as três dizem coisas diferentes', () => {
    const frases = ['so-eu', 'adultos', 'familia'].map(v => textos(desenhar(v).toJSON()));
    expect(new Set(frases).size).toBe(3);
  });

  it('⚠ o «Adultos» NÃO promete a família — era este o defeito', () => {
    const adultos = textos(desenhar('adultos').toJSON());
    expect(adultos).toMatch(/adultos/i);
    expect(adultos).toMatch(/crian/i);          // diz quem NÃO vê
    expect(adultos).not.toMatch(/toda a família/i);
  });

  it('o «Só eu» diz que mais ninguém vê, e o «Família» diz que todos veem', () => {
    const soEu = textos(desenhar('so-eu').toJSON());
    expect(soEu).toMatch(/apenas para si|só para si/i);
    const familia = textos(desenhar('familia').toJSON());
    expect(familia).toMatch(/toda a família/i);
  });

  it('um nível desconhecido cai no mais fechado, e não no mais aberto', () => {
    // Se algum dia chegar aqui um valor que este diálogo não conhece, o erro
    // tem de ser para o lado de esconder — nunca para o de mostrar.
    const desconhecido = textos(desenhar('qualquer-coisa').toJSON());
    expect(desconhecido).toBe(textos(desenhar('so-eu').toJSON()));
  });

  it('quem o chama passa a visibilidade inteira, e não um booleano', () => {
    const evento = codigoDe('src/sheets/NovoEvento.jsx');
    expect(evento).toMatch(/visibilidade=\{form\.visibilidade\}/);
    expect(evento).not.toMatch(/isPrivate=/);
    expect(codigoDe('src/ConfirmShare.jsx')).not.toMatch(/isPrivate/);
  });

  it('os dois botões têm papel e rótulo de voz', () => {
    const fonte = ler('src/ConfirmShare.jsx');
    const papeis = fonte.match(/accessibilityRole="button"/g) || [];
    expect(papeis.length).toBe(2);
    const rotulos = fonte.match(/accessibilityLabel=/g) || [];
    expect(rotulos.length).toBe(2);
    // E o de confirmar diz guardar COMO — que é o que o diálogo pergunta.
    expect(fonte).toMatch(/accessibilityLabel=\{`Guardar o evento como \$\{n\.rotulo\}`\}/);
  });

  it('⚠ e o ícone existe mesmo — um nome desconhecido dá um SVG vazio, sem erro', () => {
    // Era `users`, que não está no conjunto: o diálogo abria com um buraco onde
    // devia estar o símbolo, e nada falhava.
    const icones = require('../src/Icon');
    const fonte = ler('src/ConfirmShare.jsx');
    const usados = [...fonte.matchAll(/icone: '([a-zA-Z]+)'/g)].map(m => m[1]);
    expect(usados.length).toBeGreaterThanOrEqual(2);
    for (const nome of usados) {
      let r;
      TestRenderer.act(() => {
        r = TestRenderer.create(React.createElement(icones.default, { name: nome, size: 24, color: '#000000' }));
      });
      const json = JSON.stringify(r.toJSON());
      // Um ícone que existe desenha pelo menos um traço ou uma circunferência.
      expect(json).toMatch(/"d":"|"cx":/);
    }
  });
});
