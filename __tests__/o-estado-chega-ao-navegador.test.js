/**
 * O estado de um tocável chega ao navegador.
 *
 * ── O que se passava ─────────────────────────────────────────────────────────
 *
 * A app declara o estado de cada tocável no `accessibilityState` — escolhido,
 * marcado, desligado, aberto. É o que o React Native lê no iOS e no Android.
 *
 * Na WEB não chegava a lado nenhum. O `react-native-web` 0.21 não conhece esse
 * nome: o `createDOMProps` só reencaminha os `aria-*` (a lista está no
 * `forwardedProps`), e o `accessibilityState` era deitado fora em silêncio — sem
 * aviso, sem erro, sem atributo no DOM. Medido no navegador em 15/09/2026: três
 * bolas de escolha múltipla com `accessibilityState={{ checked: true }}`
 * respondiam `aria-checked = null` às três.
 *
 * O efeito: um leitor de ecrã na web anunciava «botão» a um botão desligado, e
 * «botão» a uma opção escolhida — o mesmo que a uma opção por escolher. Eram
 * 39 sítios em 19 ficheiros.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 * Todo o `accessibilityState` tem, no mesmo elemento, o `aria-*` que lhe
 * corresponde. O `accessibilityState` fica — é ele que serve o nativo.
 *
 * E o atributo segue o PAPEL, não o nome da chave:
 *
 *   checked   →  aria-checked    (só num checkbox, radio ou switch)
 *   selected  →  aria-selected   num tab/option/row — a lista escolhe um item
 *             →  aria-pressed    num button — um botão que alterna
 *   disabled  →  aria-disabled
 *   expanded  →  aria-expanded
 *
 * Escrever `aria-checked` num `role="button"` é ARIA inválido, e um leitor de
 * ecrã ignora-o: seria o mesmo defeito, com mais letras.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ler = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');

const jsx = (() => {
  const fora = [];
  (function percorrer(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) percorrer(p);
      else if (/\.jsx$/.test(e.name)) fora.push(path.relative(RAIZ, p).split(path.sep).join('/'));
    }
  })(path.join(RAIZ, 'src'));
  fora.push('App.jsx');
  return fora;
})();

// O fim do `{{ … }}` que começa no `{` do índice `i`.
const fecho = (l, i) => {
  let n = 0;
  for (let k = i; k < l.length; k++) {
    if (l[k] === '{') n += 1;
    else if (l[k] === '}') { n -= 1; if (n === 0) return k; }
  }
  return -1;
};

// Parte o interior nas vírgulas de nível zero — um ternário lá dentro tem
// `:` e `?` mas não vírgulas soltas.
const partes = (texto) => {
  const out = [];
  let n = 0, atual = '';
  for (const c of texto) {
    if ('{(['.includes(c)) n += 1;
    else if ('})]'.includes(c)) n -= 1;
    if (c === ',' && n === 0) { out.push(atual); atual = ''; continue; }
    atual += c;
  }
  if (atual.trim()) out.push(atual);
  return out.map(x => x.trim()).filter(Boolean);
};

const ESTADOS = (() => {
  const fora = [];
  for (const rel of jsx) {
    const linhas = ler(rel).split('\n');
    linhas.forEach((l, i) => {
      const marca = l.indexOf('accessibilityState={{');
      if (marca === -1) return;
      if (/^\s*(\/\/|\*)/.test(l)) return;                  // um comentário não desenha nada
      const abre = l.indexOf('{', marca + 'accessibilityState='.length - 1);
      const fim = fecho(l, abre);
      const dentro = fim === -1 ? '' : l.slice(abre + 2, fim - 1);
      const volta = linhas.slice(Math.max(0, i - 10), i + 5).join(' ');
      // ⚠ O papel pode ser uma EXPRESSÃO — a bola do escolhedor é `checkbox`
      // quando se escolhem várias pessoas e `button` quando é uma. Nesses, o
      // elemento leva os dois atributos, cada um com o seu ramo, e a prova do
      // papel não se aplica.
      const dinamico = /accessibilityRole=\{/.test(volta);
      const papel = dinamico ? 'dinâmico'
        : (volta.match(/accessibilityRole="([a-z]+)"/) || [])[1] || 'button';
      // O elemento: da etiqueta de abertura até duas linhas depois desta — é
      // onde os atributos do mesmo tocável cabem, e a prop `disabled` costuma
      // vir logo na abertura.
      let inicio = i;
      while (inicio > 0 && !/<[A-Z][A-Za-z]*\b/.test(linhas[inicio])) inicio -= 1;
      const elemento = linhas.slice(inicio, i + 3).join(' ');
      const chaves = partes(dentro).map((p) => {
        const dp = p.indexOf(':');
        return (dp === -1 ? p : p.slice(0, dp)).trim();
      });
      fora.push({ rel, linha: i + 1, papel, chaves, elemento });
    });
  }
  return fora;
})();

const DE_LISTA = ['tab', 'option', 'row', 'gridcell'];
const MARCAVEL = ['checkbox', 'radio', 'switch', 'menuitemcheckbox'];
// O atributo de cada chave, pelo papel. Devolve a lista do que SERVE: num
// papel dinâmico serve qualquer um dos dois, porque o elemento leva os dois.
const atributos = (chave, papel) => {
  // ⚠ O `disabled` é o caso à parte, e custou a descobrir: o `Pressable` do
  // react-native-web escreve ele próprio o `aria-disabled` a partir da SUA
  // prop `disabled` (exports/Pressable/index.js), e escreve-a DEPOIS do resto
  // — um `aria-disabled` passado à mão é sobreposto por `undefined` e nunca
  // chega ao DOM. Medido no navegador: um «Guardar alterações» desligado, com
  // `aria-disabled={true}` escrito, saía sem atributo nenhum. O que se exige
  // aqui é a prop, que também tira o botão da ordem do TAB.
  if (chave === 'disabled') return ['disabled='];
  if (chave === 'expanded') return ['aria-expanded'];
  if (chave === 'busy') return ['aria-busy'];
  if (chave === 'checked') {
    // Um `checked` num papel que não é marcável é, em ARIA, um `pressed`.
    if (papel === 'dinâmico') return ['aria-checked', 'aria-pressed'];
    return MARCAVEL.includes(papel) ? ['aria-checked'] : ['aria-pressed'];
  }
  if (chave === 'selected') {
    if (papel === 'dinâmico') return ['aria-selected', 'aria-pressed', 'aria-checked'];
    return DE_LISTA.includes(papel) ? ['aria-selected'] : ['aria-pressed'];
  }
  return null;
};

describe('⚠ o estado de um tocável chega ao navegador', () => {
  it('a prova encontra estados — senão não prova nada', () => {
    expect(ESTADOS.length).toBeGreaterThan(30);
  });

  it('⚠ cada `accessibilityState` tem o `aria-*` que lhe corresponde, no mesmo elemento', () => {
    const maus = [];
    for (const e of ESTADOS) {
      for (const chave of e.chaves) {
        const attrs = atributos(chave, e.papel);
        if (!attrs) { maus.push(`${e.rel}:${e.linha} → chave «${chave}» sem atributo conhecido`); continue; }
        // O `disabled=` já vem com o sinal de igual; os `aria-*` não.
        const tem = attrs.some(a => e.elemento.includes(a.endsWith('=') ? a : `${a}=`));
        if (!tem) {
          maus.push(`${e.rel}:${e.linha} [${e.papel}] falta o ${attrs.join(' ou o ')} (de «${chave}»)`);
        }
      }
    }
    expect(maus).toEqual([]);
  });

  it('⚠ e o atributo segue o papel — nada de `aria-checked` num botão', () => {
    // Um `aria-checked` num `role="button"` é ARIA inválido: o leitor de ecrã
    // ignora-o, e fica-se com o mesmo silêncio de antes.
    const maus = [];
    for (const e of ESTADOS) {
      if (e.papel === 'dinâmico') continue;             // leva os dois, um por ramo
      const ehLista = DE_LISTA.includes(e.papel);
      const marcavel = MARCAVEL.includes(e.papel);
      if (!marcavel && /aria-checked=/.test(e.elemento)) maus.push(`${e.rel}:${e.linha} [${e.papel}] tem aria-checked e não é marcável`);
      if (!ehLista && /aria-selected=/.test(e.elemento)) maus.push(`${e.rel}:${e.linha} [${e.papel}] tem aria-selected e não é de lista`);
      if (ehLista && /aria-pressed=/.test(e.elemento)) maus.push(`${e.rel}:${e.linha} [${e.papel}] tem aria-pressed e é de lista`);
    }
    expect(maus).toEqual([]);
  });

  it('⚠ e o motivo continua verdadeiro: o react-native-web não conhece o `accessibilityState`', () => {
    // Se um dia passar a conhecê-lo, esta prova cai — e aí o par deixa de ser
    // preciso. Um guarda que enumera tem de saber quando deixa de fazer falta.
    const p = path.join(RAIZ, 'node_modules/react-native-web/dist/modules/forwardedProps/index.js');
    if (!fs.existsSync(p)) return;                      // sem dependências instaladas, não se mede
    const fonte = fs.readFileSync(p, 'utf8');
    expect(fonte).toMatch(/'aria-checked': true/);
    expect(fonte).not.toMatch(/accessibilityState/);
  });
});
