/**
 * O `STATE` DA AMAZON NÃO SE CORTA — e as provas não o experimentam de brincar.
 *
 * ── O que aconteceu ──────────────────────────────────────────────────────────
 *
 * Em 28/09/2026 o Account Linking da Alexa não ligava. Do lado da casa corria
 * tudo bem: a página abria, o adulto identificava-se, a ligação nascia, o código
 * era devolvido. E a Amazon respondia «Não foi possível vincular a sua conta»
 * sem nunca vir buscar o token — portanto sem deixar um único registo no
 * servidor para explicar porquê.
 *
 * A causa era uma linha:
 *
 *     state: String(state || '').slice(0, 500),
 *
 * O `state` da Amazon tem **1095 caracteres** — um blob dela, em base64, que ela
 * valida à chegada. Cortado aos 500, voltava mutilado, ela não o reconhecia, e
 * desistia em silêncio.
 *
 * ⚠ E a razão de nunca ter sido apanhado é a lição, não o defeito: TODAS as
 * provas usavam `'abc123'`, `'xyz'`, `'sim-abc'`. Três caracteres contra mil e
 * noventa e cinco. Uma prova com um valor de brincar não prova o caminho
 * verdadeiro — mede outra coisa e diz que mediu esta.
 *
 * ── O que este guarda enumera ────────────────────────────────────────────────
 *
 * 1. Nenhum ficheiro do servidor CORTA o `state`. Cortar em silêncio é o pior
 *    dos três caminhos: pior do que recusar, e muito pior do que deixar passar.
 * 2. As provas que percorrem o Account Linking usam, pelo menos uma vez, um
 *    `state` do tamanho do verdadeiro. Uma prova só com valores curtos volta a
 *    deixar passar exactamente este defeito.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const HOOKS = 'db/pocketbase/pb_hooks';

const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const semComentarios = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:])\/\/[^\n]*/g, (m, antes) => antes + ' '.repeat(m.length - antes.length));

// O tamanho do `state` que a Amazon mandou mesmo, medido nos registos do
// servidor a 28/09/2026. Uma prova que não chegue perto disto não prova nada.
const O_TAMANHO_VERDADEIRO = 1095;

const ficheirosDaConta = () => fs.readdirSync(path.join(RAIZ, HOOKS))
  .filter((f) => /^alexa.*\.js$/.test(f))
  .map((f) => `${HOOKS}/${f}`);

const provasDaConta = () => fs.readdirSync(path.join(RAIZ, 'db/pocketbase'))
  .filter((f) => /^(provar|simular)-alexa.*\.mjs$/.test(f) || f === 'simular-amazon.mjs')
  .map((f) => `db/pocketbase/${f}`);

describe('o state da Amazon não se corta', () => {
  it('o varrimento encontra os ficheiros — senão isto passa sempre', () => {
    expect(ficheirosDaConta().length).toBeGreaterThanOrEqual(3);
    expect(provasDaConta().length).toBeGreaterThanOrEqual(3);
  });

  it('⚠ nenhum hook CORTA o `state`', () => {
    // A linha que custou meio dia. Qualquer `slice`, `substring` ou `substr`
    // aplicado ao `state` volta a pô-la lá.
    const maus = [];
    for (const f of ficheirosDaConta()) {
      semComentarios(ler(f)).split('\n').forEach((linha, i) => {
        if (!/\bstate\b/i.test(linha)) return;
        if (/\.(slice|substring|substr)\s*\(/.test(linha)) {
          maus.push(`${f}:${i + 1}  ${linha.trim()}`);
        }
      });
    }
    expect(maus).toEqual([]);
  });

  it('⚠ e o `state` grande de mais é RECUSADO, não encolhido', () => {
    // A alternativa a cortar não é deixar passar tudo: é dizer que não.
    const t = semComentarios(ler(`${HOOKS}/alexa-conta-comum.js`));
    expect(t).toMatch(/if\s*\(\s*s\.length\s*>\s*\d{3,}\s*\)\s*throw/);
    // E o limite tem de dar folga ao tamanho verdadeiro.
    const limite = Number((t.match(/if\s*\(\s*s\.length\s*>\s*(\d+)\s*\)\s*throw/) || [])[1] || 0);
    expect(limite).toBeGreaterThan(O_TAMANHO_VERDADEIRO);
  });

  it('⚠ e alguma prova usa um `state` do TAMANHO do verdadeiro', () => {
    // O guarda que faltava. Sem isto, as provas voltam a medir `'abc123'` e a
    // dizer que o Account Linking funciona.
    //
    // Procura-se uma construção que GERE um valor comprido — `repeat(...)` com
    // um número grande —, porque escrever 1095 caracteres à mão num ficheiro de
    // provas ninguém faz, e ninguém devia ter de fazer.
    const comEstadoGrande = [];
    for (const f of provasDaConta()) {
      const t = ler(f);
      for (const m of t.matchAll(/repeat\s*\(\s*(\d+)\s*\)/g)) {
        if (Number(m[1]) >= 700) { comEstadoGrande.push(f); break; }
      }
    }
    // A mensagem diz o que fazer, e não só que falhou.
    expect(`provas com um state realista: ${comEstadoGrande.length ? comEstadoGrande.join(', ') : 'NENHUMA'}`)
      .not.toBe('provas com um state realista: NENHUMA');
  });

  it('⚠ e o campo que o guarda na base tem folga para ele', () => {
    // O `state` viaja e fica guardado em `alexa_esperas.estado`. Um campo curto
    // de mais rebenta a gravação depois de o corte ter sido tirado — e o erro
    // aparece longe da causa. Tem de estar declarado nos DOIS sítios com folga.
    const declaracoes = [
      ['criar-colecoes', ler('db/pocketbase/criar-colecoes.mjs'), /txt\('estado',\s*\{\s*max:\s*(\d+)/],
      ['acrescentar-campos', ler('db/pocketbase/acrescentar-campos.mjs'), /name: 'estado', type: 'text', max: (\d+)/],
    ];
    const curtos = declaracoes
      .map(([onde, texto, padrao]) => [onde, Number((texto.match(padrao) || [])[1] || 0)])
      .filter(([, max]) => !(max > O_TAMANHO_VERDADEIRO))
      .map(([onde, max]) => `${onde}: max=${max}, e o state verdadeiro tem ${O_TAMANHO_VERDADEIRO}`);
    expect(curtos).toEqual([]);
  });
});
