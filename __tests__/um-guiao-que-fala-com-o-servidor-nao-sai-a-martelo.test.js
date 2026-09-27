/**
 * UM GUIÃO QUE FALA COM O SERVIDOR NÃO SAI A MARTELO — nada de `process.exit`.
 *
 * ── O defeito ────────────────────────────────────────────────────────────────
 *
 * 26/09/2026. O travão novo do `criar-colecoes.mjs` dizia, em três sítios — o
 * comentário, a mensagem impressa e a mensagem do commit —, que recusava «com o
 * código 2». Recusava com 127, e com um despejo por cima:
 *
 *   Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 76
 *
 * Um `process.exit(n)` chamado depois de uma chamada de DADOS ao PocketBase
 * rebenta no Windows, com o Node 24. Quem visse aquilo na consola concluía que
 * o guião tinha ido abaixo — não que tinha recusado, que é precisamente a
 * leitura que um travão não pode permitir.
 *
 * ── Porque é que isto ENUMERA em vez de remendar ─────────────────────────────
 *
 * Porque à segunda vez varre-se tudo. E ao varrer, em 27/09/2026, o defeito
 * estava em mais oito sítios, todos medidos a correr contra um PocketBase de
 * deitar fora: `semear-simulacao.mjs`, `migrar-seccoes.mjs` (duas),
 * `configurar-google.mjs` (duas), `criar-campo-avatar.mjs`,
 * `criar-credenciais-agenda.mjs` e `acrescentar-campos.mjs`. Todos devolviam
 * 3221226505 em vez do código que pediam.
 *
 * ⚠ E não se distingue a olho quais são. O `acrescentar-campos.mjs:530` sai
 * LIMPO com 47 pedidos atrás dele, e o `semear-simulacao.mjs:52` rebenta com
 * dois — porque o que salva é o tempo decorrido desde a última resposta, não o
 * número de chamadas. Esperar 50 ms chega. Ou seja: «este passa hoje» não é uma
 * propriedade do código, é o calhar do dia. Por isso a regra vale para todos.
 *
 * O mesmo acidente segurava a cadeia inteira do `npm run db:provar` de pé: o
 * `resumo()` do `provas.mjs` saía com `process.exit`, e o que o salvava era o
 * `casa-de-provas.mjs` ter substituído o `process.exit` por um que corria a
 * limpeza assíncrona primeiro. O adiamento dava tempo às ligações. Quem chamasse
 * o `resumo()` sem passar por lá não tinha rede nenhuma — e havia um assim.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 * Num ficheiro que fale com o servidor — directamente ou por importar quem fale
 * — não há `process.exit(...)`. Há `await sair(n)` do `db/pocketbase/sair.mjs`,
 * que põe o `process.exitCode` e não desliga nada.
 *
 * O que isto NÃO prova: que a saída funciona. Isso mede-se a correr, e quem o
 * faz é `db/pocketbase/provar-a-recusa-sai-com-2.mjs` — que se corre À MÃO, com
 * `npm run db:provar-a-recusa`, porque levanta um PocketBase só dele e um
 * servidor a aparecer no meio de uma bateria é uma surpresa em cima de quem
 * está a trabalhar na máquina.
 *
 * Ou seja: este guarda é o que corre todos os dias, e só ele. Garante a FORMA —
 * que ninguém volta a escrever `process.exit` num guião que fala com o
 * servidor. O EFEITO mede-se quando se mexer numa saída.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const rel = (p) => path.relative(RAIZ, p).replace(/\\/g, '/');

// Apaga comentários PRESERVANDO os números de linha — este ficheiro e os que
// ele lê explicam o defeito citando `process.exit` pelo nome, e sem isto o
// guarda apanhava-se a si próprio.
const semComentarios = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:])\/\/[^\n]*/g, (m, antes) => antes + ' '.repeat(m.length - antes.length));

// ── O varrimento ─────────────────────────────────────────────────────────────

const PASTAS = ['db/pocketbase', 'scripts'];

const varrer = (dir) => {
  const saida = [];
  for (const e of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) {
      if (e.name === 'pb_migrations' || e.name === 'pb_hooks') continue;
      saida.push(...varrer(p));
    } else if (/\.m?js$/.test(e.name)) {
      saida.push(p);
    }
  }
  return saida;
};

const FICHEIROS = PASTAS.flatMap(varrer);
const CODIGO = Object.fromEntries(FICHEIROS.map(f => [f, semComentarios(ler(f))]));

// Quem fala com o servidor: quem importa o cliente, quem o instancia, quem usa
// a camada da app — e, por fecho, quem importa algum desses.
const falaDirecto = (f) => /from ['"]pocketbase['"]/.test(CODIGO[f])
  || /new PocketBase\(/.test(CODIGO[f])
  || /src\/(pocketbase|sync)\.js/.test(CODIGO[f]);

// ⚠ Não chega procurar `from '…'`. Metade destes guiões carrega os outros por
// `await import(...)` ou pelo ajudante `modulo('db/pocketbase/provas.mjs')` do
// `simular-casa.mjs`, e a primeira versão deste guarda deixava o
// `simular-exportacao-saude.mjs` de fora por causa disso. Por isso apanha-se
// QUALQUER literal que pareça um caminho para um ficheiro do projeto, e
// resolve-se contra a pasta do ficheiro e contra a raiz. Um guarda de segurança
// erra para o lado de incluir de mais: o que entrar a mais explica-se nas
// EXCECOES, o que ficar de fora não se explica a ninguém.
const caminhosCitados = (f) => {
  const saida = new Set();
  for (const m of CODIGO[f].matchAll(/['"`]([\w./-]+\.m?js)['"`]/g)) {
    saida.add(rel(path.resolve(path.dirname(path.join(RAIZ, f)), m[1])));
    saida.add(rel(path.resolve(RAIZ, m[1])));
  }
  return saida;
};

const FALAM = new Set(FICHEIROS.filter(falaDirecto));
for (let volta = 0; volta < 10; volta++) {
  const antes = FALAM.size;
  for (const f of FICHEIROS) {
    if (FALAM.has(f)) continue;
    for (const destino of caminhosCitados(f)) {
      if (FALAM.has(destino)) { FALAM.add(f); break; }
    }
  }
  if (FALAM.size === antes) break;
}

const chave = (f, linha) => `${f} · ${linha.trim().slice(0, 60)}`;

const marteladas = [];
for (const f of FICHEIROS) {
  if (!FALAM.has(f)) continue;
  CODIGO[f].split('\n').forEach((linha, i) => {
    if (!/process\.exit\s*\(/.test(linha)) return;
    marteladas.push({ f, n: i + 1, chave: chave(f, ler(f).split('\n')[i]) });
  });
}

// ── As excepções, com a razão escrita de cada uma ────────────────────────────
//
// A chave é `ficheiro · o texto da linha`, e não o número: a linha muda a cada
// edição e o texto não. O que a prova imprime ao falhar copia-se tal e qual
// para aqui — se não copiar, o guarda contorna-se apagando uma linha.
const EXCECOES = {
  'scripts/simular-exportacao-saude.mjs · if (!CHROME) { console.error(\'Sem Chrome nesta máquina — a s':
    'Este guião NUNCA fala com o servidor: fabrica imagens e um PDF com o Chrome '
    + 'e escreve-os em `.simulacao/`. Entra na lista só porque importa o '
    + '`provas.mjs` para lhe aproveitar o resolvedor de `./format`. E esta saída '
    + 'acontece antes de tudo — sem Chrome não há nada a fazer.',

  'scripts/simular-exportacao-saude.mjs · if (figuras !== 2) { console.error(\'ESPERAVA 2 figuras\'); pr':
    'O mesmo ficheiro, e a mesma razão: nenhuma ligação ao PocketBase é aberta '
    + 'em lado nenhum dele. Conta as figuras que o Chrome desenhou e desiste se '
    + 'não forem duas.',
};

// ─────────────────────────────────────────────────────────────────────────────

describe('um guião que fala com o servidor não sai a martelo', () => {
  it('o varrimento funciona — encontra guiões, e encontra os que falam com o servidor', () => {
    // Um guarda que não varre nada passa sempre.
    expect(FICHEIROS.length).toBeGreaterThan(30);
    expect(FALAM.size).toBeGreaterThan(20);
    // E o fecho apanha mesmo os indirectos: estes não importam `pocketbase`,
    // importam quem importa.
    expect([...FALAM]).toEqual(expect.arrayContaining([
      'db/pocketbase/provar-ementa.mjs',
      'scripts/simular-casa.mjs',
    ]));
  });

  it('⚠ nenhum guião que fala com o servidor chama process.exit', () => {
    // Quando isto falhar: ou o sítio fala com o servidor, e leva `await sair(n)`
    // do `db/pocketbase/sair.mjs`; ou não fala, e entra nas EXCECOES com a razão
    // escrita. Não há terceira saída — «este passa hoje» não é uma razão, porque
    // o que salva é o tempo desde a última resposta e isso muda com o dia.
    const soltas = marteladas
      .filter(m => !(m.chave in EXCECOES))
      // A chave PRIMEIRO e sozinha, para se copiar tal e qual para as EXCECOES;
      // a linha entre parênteses no fim, que muda a cada edição e não faz parte
      // da chave.
      .map(m => `${m.chave}   (linha ${m.n})`);
    expect(soltas).toEqual([]);
  });

  it('⚠ e o `sair` é sempre esperado — um `sair()` sem `await` não pára nada', () => {
    // Sem o `await`, o guião põe o código de saída e CONTINUA a correr as linhas
    // seguintes, que é pior do que qualquer uma das duas coisas em separado.
    // ⚠ `sair(` colado, e não `sair\s*\(`: a primeira versão apanhava a frase
    // «devia sair (${porque})» dentro de uma mensagem de erro. E `(?<![.\w])`
    // porque o `auth.sair()` da camada da app é o terminar sessão de um membro,
    // outra coisa com o mesmo nome — apanhá-lo era o guarda a acusar código são.
    const soltas = [];
    for (const f of FICHEIROS) {
      CODIGO[f].split('\n').forEach((linha, i) => {
        if (!/(?<![.\w])sair\(/.test(linha)) return;
        if (/await sair\(/.test(linha)) return;
        if (/export const sair|const sair =|from ['"].*sair\.mjs['"]/.test(linha)) return;
        soltas.push(`${f}:${i + 1}   ${linha.trim().slice(0, 70)}`);
      });
    }
    expect(soltas).toEqual([]);
  });

  it('⚠ e o inventário não tem linhas mortas', () => {
    // Uma razão escrita para uma saída que já não existe é documentação a
    // apodrecer: parece que alguém pensou no caso, e o caso desapareceu.
    const vivas = new Set(marteladas.map(m => m.chave));
    expect(Object.keys(EXCECOES).filter(k => !vivas.has(k))).toEqual([]);
  });

  it('⚠ e cada excepção tem a razão escrita', () => {
    const curtas = Object.entries(EXCECOES)
      .filter(([, razao]) => razao.trim().length < 40)
      .map(([k]) => k);
    expect(curtas).toEqual([]);
  });

  it('o ajudante existe, e diz porque existe', () => {
    const sair = ler('db/pocketbase/sair.mjs');
    expect(sair).toMatch(/process\.exitCode = codigo/);
    expect(sair).toMatch(/new Promise\(\(\) => \{\}\)/);
    // A medição que justifica isto fica escrita ao lado do código, senão o
    // próximo a passar por aqui «simplifica» de volta para o `process.exit`.
    expect(sair).toMatch(/UV_HANDLE_CLOSING/);
    expect(sair).toMatch(/3221226505/);
  });
});
