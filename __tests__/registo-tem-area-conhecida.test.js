/**
 * ⚠ Toda a linha do registo tem uma área, e a área é uma das que existem.
 *
 * ── Porque é que isto é um guarda ────────────────────────────────────────────
 *
 * A área de uma linha do registo faz duas coisas no ecrã: dá o filtro «Onde», e
 * dá o destino ao toque. As duas dependem de a string bater certo com a lista
 * de áreas da Documentação (`AREAS`) e com o mapa de destinos (`DESTINO`).
 *
 * Uma string mal escrita não dá erro nenhum. Dá uma pastilha de filtro a mais,
 * chamada «Gestão da casa» ao lado de «Gestão da Casa», e uma linha que deixa
 * de ser tocável sem que nada o explique.
 *
 * E há vinte e uma escritas espalhadas pelo `store.jsx`. Vinte e uma
 * oportunidades de escrever o nome à mão de forma diferente.
 *
 * ── O que se enumera ─────────────────────────────────────────────────────────
 *
 * Lê-se o `store.jsx`, tiram-se as áreas de todas as chamadas ao `maisRegisto`,
 * e exige-se que cada uma esteja no `AREAS`. E que nenhuma chamada fique sem
 * área — sem ela a linha não se filtra nem leva a lado nenhum.
 */
const fs = require('fs');
const path = require('path');
const { AREAS } = require('../src/registo-app');

const raiz = path.join(__dirname, '..');
const loja = fs.readFileSync(path.join(raiz, 'src/store.jsx'), 'utf8');
const ecra = fs.readFileSync(path.join(raiz, 'src/screens/Documentacao.jsx'), 'utf8');

const CONHECIDAS = AREAS.map(a => a.area);

// Cada chamada ao `maisRegisto`, com o texto todo até ao fecho — o texto da
// linha pode ter ternários e quebras, e a área é sempre o ÚLTIMO argumento.
const chamadas = [...loja.matchAll(/maisRegisto\(x,[\s\S]{0,400}?\),\n/g)].map(m => m[0]);

// A área de uma chamada: a cadeia entre plicas que fecha o parêntesis.
//
// ⚠ A ÚLTIMA, e não a primeira. À primeira escrevi `c.match(...)`, que devolve
// a primeira ocorrência — e na linha da semanada a primeira é o `'pontos'` de
// um `plural(pontos, 'ponto', 'pontos')` lá dentro. A prova acusou uma área
// inexistente chamada «pontos», e o defeito era dela, não do código.
const areaDe = (c) => {
  const todas = [...c.matchAll(/,\s*'([^']+)'\)/g)];
  return todas.length ? todas[todas.length - 1][1] : null;
};

describe('⚠ a área de cada linha do registo', () => {
  it('há chamadas para conferir — senão isto não prova nada', () => {
    expect(chamadas.length).toBeGreaterThanOrEqual(20);
  });

  it('⚠ nenhuma escrita do registo fica sem área', () => {
    // Sem área, a linha não entra em filtro nenhum e não leva a lado nenhum.
    const semArea = chamadas.filter(c => !areaDe(c))
      .map(c => c.slice(0, 80).replace(/\s+/g, ' '));
    expect(semArea).toEqual([]);
  });

  it('⚠ e toda a área escrita existe na Documentação', () => {
    // A mensagem diz qual — é quase sempre uma maiúscula ou um acento.
    const desconhecidas = [...new Set(chamadas.map(areaDe).filter(Boolean))]
      .filter(a => !CONHECIDAS.includes(a));
    expect(desconhecidas).toEqual([]);
  });

  it('⚠ e todo o destino do toque é uma área que existe', () => {
    // O `DESTINO` mapeia área → ecrã. Uma chave que não seja uma área é um
    // destino que nunca se usa, e a linha que devia ser tocável não é.
    const bloco = ecra.slice(ecra.indexOf('const DESTINO = {'));
    const chaves = [...bloco.slice(0, bloco.indexOf('};')).matchAll(/'([^']+)':/g)]
      .map(m => m[1]);
    expect(chaves.length).toBeGreaterThanOrEqual(6);
    expect(chaves.filter(a => !CONHECIDAS.includes(a))).toEqual([]);
  });
});
