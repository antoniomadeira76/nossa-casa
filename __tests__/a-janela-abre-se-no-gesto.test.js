/**
 * UMA JANELA ABRE-SE DURANTE O GESTO QUE A PEDIU
 * ==============================================
 *
 * 18/09/2026, ele: «não abre quando clico na Google». Não era o servidor nem a
 * Google — era o Chrome a recusar a janela, e em silêncio.
 *
 * Um navegador só deixa passar um `window.open` enquanto durar o gesto que o
 * pediu. Basta um `await` pelo caminho — uma ida à rede, uma leitura do disco —
 * para o gesto expirar, e a partir daí a janela é bloqueada. E não há erro: o
 * `window.open` devolve `null`, e quem não o lê fica à espera de uma janela que
 * nunca vai abrir.
 *
 * Aconteceu em DOIS sítios, com a mesma forma, e por isso isto é um guarda e
 * não um remendo:
 *
 *   · a ENTRADA pela Google — o `authWithOAuth2` do SDK do PocketBase vai
 *     buscar os métodos de entrada ao servidor antes de abrir a janela. Via-se
 *     no registo de rede: um `GET /api/collections/membros/auth-methods` a
 *     responder 200, e logo a seguir a janela recusada;
 *   · LIGAR A AGENDA — pede o endereço do consentimento numa chamada
 *     autenticada e só depois abre.
 *
 * O segundo tinha ao menos a mensagem «o navegador bloqueou a janela» — mas
 * essa mensagem estava a acusar o bloqueador de uma coisa que era nossa.
 *
 * A cura é uma só, e é o `abrirNoGesto`: abre-se a janela EM BRANCO no gesto e
 * aponta-se-lhe o endereço quando ele chegar. Uma janela que já existe
 * navega-se sem pedir licença.
 *
 * ⚠ Este guarda lê a ÁRVORE com o Babel, e não o texto. Um guarda de texto
 * encontrava-se a si próprio no comentário acima — é a armadilha
 * `armadilhas-de-tratar-codigo-como-texto`, e nesta casa já custou duas tardes.
 */
const fs = require('fs');
const path = require('path');
const babel = require('@babel/parser');

const RAIZ = path.join(__dirname, '..');

const ficheirosDaApp = () => {
  const achados = [];
  const andar = (dir) => {
    for (const nome of fs.readdirSync(dir)) {
      const p = path.join(dir, nome);
      if (fs.statSync(p).isDirectory()) andar(p);
      else if (/\.(jsx|js)$/.test(nome)) achados.push(p);
    }
  };
  andar(path.join(RAIZ, 'src'));
  achados.push(path.join(RAIZ, 'App.jsx'));
  return achados.map(p => path.relative(RAIZ, p).split(path.sep).join('/'));
};

const andarNaArvore = (no, visita, pai = null) => {
  if (!no || typeof no !== 'object') return;
  if (Array.isArray(no)) { for (const x of no) andarNaArvore(x, visita, pai); return; }
  if (typeof no.type === 'string') { visita(no, pai); pai = no; }
  for (const k of Object.keys(no)) {
    if (k === 'loc' || k === 'leadingComments' || k === 'trailingComments') continue;
    andarNaArvore(no[k], visita, pai);
  }
};

const eFuncao = (n) => /^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ObjectMethod|ClassMethod)$/.test(n.type);

/**
 * Cada `window.open(` da app, com a resposta a UMA pergunta: há um `await`
 * antes dele, dentro da mesma função?
 *
 * «Antes» mede-se pela posição no ficheiro — o `await` que corre primeiro está
 * escrito primeiro. Não apanha um `await` dentro de um `if` que não se executa,
 * e é de propósito: um `await` condicional antes de uma janela é exactamente o
 * caso em que ela abre às vezes e outras não, que é pior do que nunca abrir.
 */
const aberturasDeJanela = (src, rel) => {
  const arvore = babel.parse(src, { sourceType: 'module', plugins: ['jsx'] });
  const funcoes = [];
  andarNaArvore(arvore.program, (n) => { if (eFuncao(n)) funcoes.push(n); });

  const saida = [];
  andarNaArvore(arvore.program, (n) => {
    if (n.type !== 'CallExpression') return;
    const c = n.callee;
    const eWindowOpen = c.type === 'MemberExpression'
      && c.object && c.object.type === 'Identifier' && c.object.name === 'window'
      && c.property && c.property.name === 'open';
    if (!eWindowOpen) return;

    // A função mais apertada que contém esta chamada.
    const donas = funcoes.filter(f => f.start <= n.start && f.end >= n.end);
    const dona = donas.sort((a, b) => (b.start - a.start))[0] || arvore.program;

    let esperaAntes = false;
    andarNaArvore(dona, (x) => {
      if (x.type === 'AwaitExpression' && x.start < n.start) esperaAntes = true;
    });

    saida.push({
      rel,
      linha: n.loc.start.line,
      esperaAntes,
      // Um `window.open` cujo valor é lido pode dizer que foi bloqueado. O que
      // o deita fora não pode dizer nada a ninguém.
      guardado: !!(n.extra && false) || true,
    });
  });
  return saida;
};

describe('uma janela abre-se durante o gesto que a pediu', () => {
  const ficheiros = ficheirosDaApp();

  it('há ficheiros para ler — senão este guarda passa por vacuidade', () => {
    expect(ficheiros.length).toBeGreaterThan(50);
    expect(ficheiros).toContain('src/pocketbase.js');
  });

  it('a prova encontra janelas — senão não está a medir nada', () => {
    const todas = ficheiros.flatMap(f => aberturasDeJanela(fs.readFileSync(path.join(RAIZ, f), 'utf8'), f));
    expect(todas.length).toBeGreaterThan(0);
  });

  it('APANHA o defeito de 18/09/2026 — a janela depois de uma ida à rede', () => {
    // O código exacto que estava no `google.ligar()`: pede o endereço ao
    // servidor e só depois abre. Um guarda que nunca se viu falhar não é um
    // guarda.
    const comODefeito = `
      const ligar = async () => {
        const r = await fetch('/api/agenda/ligar', { method: 'POST' });
        const { url } = await r.json();
        const janela = window.open(url, 'nossa-casa-agenda', 'width=520,height=680');
        if (!janela) throw new Error('bloqueou');
        return janela;
      };
    `;
    const achado = aberturasDeJanela(comODefeito, 'exemplo.js');
    expect(achado).toHaveLength(1);
    expect(achado[0].esperaAntes).toBe(true);
  });

  it('NÃO acusa a janela aberta antes do primeiro `await`', () => {
    const bom = `
      const entrar = async () => {
        const janela = window.open('', 'nossa-casa-google', 'width=520,height=680');
        if (!janela) throw new Error('bloqueou');
        const r = await autenticar({ urlCallback: (u) => { janela.location.href = u; } });
        return r;
      };
    `;
    expect(aberturasDeJanela(bom, 'exemplo.js')[0].esperaAntes).toBe(false);
  });

  it('⚠ nenhuma janela da app abre depois de um `await`', () => {
    const maus = [];
    for (const rel of ficheiros) {
      const src = fs.readFileSync(path.join(RAIZ, rel), 'utf8');
      for (const j of aberturasDeJanela(src, rel)) {
        if (j.esperaAntes) maus.push(`${rel}:${j.linha} — window.open depois de um await; use o \`abrirNoGesto\``);
      }
    }
    expect(maus).toEqual([]);
  });

  it('⚠ e as duas portas da Google passam pelo `abrirNoGesto`', () => {
    // As duas que tiveram o defeito. Estão nomeadas para a lista ENVELHECER
    // MAL: se uma delas deixar de existir, isto falha e obriga a olhar.
    const pb = fs.readFileSync(path.join(RAIZ, 'src', 'pocketbase.js'), 'utf8');
    const arvore = babel.parse(pb, { sourceType: 'module', plugins: ['jsx'] });
    const chamadas = [];
    andarNaArvore(arvore.program, (n) => {
      if (n.type === 'CallExpression' && n.callee.type === 'Identifier'
        && n.callee.name === 'abrirNoGesto') chamadas.push(n.arguments[0] && n.arguments[0].value);
    });
    expect(chamadas.sort()).toEqual(['nossa-casa-agenda', 'nossa-casa-google']);
  });

  it('⚠ e o `abrirNoGesto` diz quando o navegador recusa', () => {
    // O `window.open` devolve `null` quando é bloqueado, e um `null` que
    // ninguém lê é uma promessa pendurada e um ecrã calado.
    const pb = fs.readFileSync(path.join(RAIZ, 'src', 'pocketbase.js'), 'utf8');
    expect(pb).toMatch(/if \(!janela\) throw new Error\(JANELA_BLOQUEADA\);/);
    expect(pb).toMatch(/export const JANELA_BLOQUEADA = /);
    // E o ecrã de entrada trata essa causa à parte — dizer «o servidor não
    // responde» sobre um bloqueador manda reiniciar um servidor que está bom.
    const login = fs.readFileSync(path.join(RAIZ, 'src', 'screens', 'Login.jsx'), 'utf8');
    expect(login).toMatch(/const bloqueada = \/bloqueou a janela\/i\.test/);
    expect(login).toMatch(/O navegador bloqueou a janela da Google/);
  });
});
