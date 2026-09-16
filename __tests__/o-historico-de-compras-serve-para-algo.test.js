/**
 * O HISTÓRICO DE COMPRAS SERVE PARA ALGO
 * ======================================
 *
 * 16/09/2026, o dono da casa, a olhar para a secção: «para que serve isto
 * afinal???». Não servia. Era uma lista só de leitura — loja, quem foi, quantos
 * artigos, data, total — ao lado de uma despesa que o ecrã do Dinheiro já
 * regista. A única ação que teve, «Repetir compra», foi tirada em 13/09/2026
 * porque o `onPress` estava vazio: a entrada do histórico não guardava os
 * artigos, logo não havia o que repetir.
 *
 * O que faltava nunca foi o botão. Eram os artigos: as linhas de cada ida
 * continuam no servidor, presas à sua lista, e a leitura trazia delas só uma
 * CONTAGEM. Agora traz o rótulo e o corredor, e repetir uma ida é acrescentar à
 * lista de hoje o que falta dela.
 *
 * ── As propriedades ─────────────────────────────────────────────────────────
 *
 *   1. Repetir acrescenta só O QUE FALTA — nunca duplica o que já está na
 *      lista, e a comparação é como uma pessoa a faria: sem maiúsculas nem
 *      acentos a contar.
 *   2. Nem duplica dentro da própria ida: o mesmo rótulo duas vezes entra uma.
 *   3. O corredor de cada artigo é o que ele tinha, se a casa ainda o tiver.
 *   4. Devolve a contagem, para se poder perguntar ANTES de fazer.
 *   5. Uma ida cujos artigos já lá estão todos não oferece botão nenhum — foi
 *      esse o defeito original, um botão que não fazia nada.
 *   6. E passa pelo `criarArtigo`, que é quem sabe falar com o servidor. Uma
 *      segunda via de escrita é a classe de defeito que já apagou o acerto de
 *      contas três vezes.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const codigoDe = (p) => ler(p)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/[^\n]*/gm, '');

describe('⚠ o histórico de compras serve para algo', () => {
  it('a leitura traz os ARTIGOS de cada ida, e não só a contagem', () => {
    const sync = codigoDe('src/sync.js');
    // O mapa por lista guarda objetos com rótulo e corredor.
    expect(sync).toMatch(/artigosPorLista\[a\.lista\] = artigosPorLista\[a\.lista\] \|\| \[\]/);
    expect(sync).toMatch(/rotulo: a\.rotulo/);
    expect(sync).toMatch(/corredor: nomeDoCorredor\[a\.corredor\]/);
    // E a entrada do histórico leva os dois: a contagem que a linha mostra, e
    // os artigos que o «Repetir» usa.
    expect(sync).toMatch(/items: \(artigosPorLista\[l\.id\] \|\| \[\]\)\.length/);
    expect(sync).toMatch(/artigos: \(artigosPorLista\[l\.id\] \|\| \[\]\)\.filter\(a => a\.rotulo\)/);
    // Só os confirmados — o que não se comprou não entra no que se repete.
    expect(sync).toMatch(/a\.estado === 'confirmado'/);
  });

  it('⚠ a loja compara os rótulos sem maiúsculas nem acentos', () => {
    const loja = codigoDe('src/store.jsx');
    expect(loja).toMatch(/const semAcentos =/);
    expect(loja).toMatch(/normalize\('NFD'\)/);
    // A comparação usa-o dos dois lados: o que já lá está e o que vem da ida.
    expect(loja).toMatch(/new Set\(allItems\(\)\.map\(i => semAcentos\(i\.label\)\)\)/);
    expect(loja).toMatch(/semAcentos\(a\.rotulo\)/);
  });

  it('⚠ não duplica o que já está na lista, nem dentro da própria ida', () => {
    const loja = codigoDe('src/store.jsx');
    const i = loja.indexOf('const artigosQueFaltamDaIda');
    expect(i).toBeGreaterThan(0);
    const corpo = loja.slice(i, loja.indexOf('const repetirCompra'));
    expect(corpo).toMatch(/jaLa\.has\(chave\)/);      // já na lista de hoje
    expect(corpo).toMatch(/vistos\.has\(chave\)/);    // repetido dentro da ida
    expect(corpo).toMatch(/if \(!chave/);             // e sem rótulo não entra
  });

  it('o corredor é o que o artigo tinha, se a casa ainda o tiver', () => {
    const loja = codigoDe('src/store.jsx');
    const i = loja.indexOf('const repetirCompra');
    const corpo = loja.slice(i, i + 900);
    expect(corpo).toMatch(/a\.corredor && seccoes\.includes\(a\.corredor\)/);
    expect(corpo).toMatch(/\? a\.corredor : seccoes\[0\]/);
  });

  it('⚠ escreve pelo `criarArtigo`, e não por um `set` com a lista inteira', () => {
    const loja = codigoDe('src/store.jsx');
    const i = loja.indexOf('const repetirCompra');
    const corpo = loja.slice(i, i + 900);
    expect(corpo).toMatch(/criarArtigo\(\{/);
    // Nenhuma escrita directa no `newItems` a partir daqui.
    expect(corpo).not.toMatch(/newItems:/);
    expect(corpo).not.toMatch(/sync\./);
  });

  it('devolve a contagem, para a pergunta poder dizer quantos são', () => {
    const loja = codigoDe('src/store.jsx');
    const i = loja.indexOf('const repetirCompra');
    expect(loja.slice(i, i + 900)).toMatch(/return faltam\.length;/);
    // E as duas funções saem da loja — uma para perguntar, outra para fazer.
    expect(loja).toMatch(/repetirCompra, artigosQueFaltamDaIda,/);
  });

  it('⚠ o botão só aparece quando há mesmo o que repetir', () => {
    // O defeito original foi um botão com o `onPress` vazio. Um botão que
    // aparece sempre e às vezes não faz nada é o mesmo defeito, mais subtil.
    const ecra = codigoDe('src/screens/Compras.jsx');
    expect(ecra).toMatch(/const faltam = st\.artigosQueFaltamDaIda\(h\.at\)\.length/);
    expect(ecra).toMatch(/const podeRepetir = faltam > 0/);
    expect(ecra).toMatch(/\{podeRepetir \? \(/);
    // E já não há `onPress` vazio em lado nenhum deste ecrã.
    expect(ecra).not.toMatch(/onPress=\{\(\) => \{\}\}/);
  });

  it('e pergunta antes de acrescentar', () => {
    const ecra = codigoDe('src/screens/Compras.jsx');
    expect(ecra).toMatch(/aRepetir !== null \? \(\(\) => \{/);
    // O bloco da pergunta, do `<Confirm` até fechar: é aí que o `onConfirm`
    // tem de chamar o `repetirCompra`, e não em qualquer sítio do ficheiro.
    const i = ecra.indexOf('aRepetir !== null');
    const bloco = ecra.slice(i, ecra.indexOf('})() : null}', i));
    expect(bloco).toMatch(/<Confirm/);
    expect(bloco).toMatch(/onConfirm=\{\(\) => \{ st\.repetirCompra\(aRepetir, user\); setARepetir\(null\); \}\}/);
    expect(bloco).toMatch(/onCancel=\{\(\) => setARepetir\(null\)\}/);
    // A pergunta diz QUANTOS entram — é uma confirmação de volume.
    expect(ecra).toMatch(/plural\(faltam\.length, 'artigo entra', 'artigos entram'\)/);
  });

  it('⚠ nenhum botão desta app ficou com o onPress vazio', () => {
    // O genérico: um `onPress={() => {}}` é um controlo morto, e esta casa já
    // teve dois — o «Repetir compra» e o «agendar em dd/mm» da Agenda.
    const fora = [];
    const andar = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) andar(p);
        else if (/\.jsx$/.test(e.name)) fora.push(p);
      }
    };
    andar(path.join(RAIZ, 'src'));
    fora.push(path.join(RAIZ, 'App.jsx'));
    const maus = [];
    for (const f of fora) {
      const linhas = fs.readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, (b) => '\n'.repeat((b.match(/\n/g) || []).length))
        .replace(/^\s*\/\/[^\n]*/gm, '')
        .split('\n');
      linhas.forEach((l, i) => {
        if (/on(Press|Change|Confirm|Cancel|Close)=\{\(\s*\)\s*=>\s*\{\s*\}\}/.test(l)) {
          maus.push(`${path.relative(RAIZ, f)}:${i + 1} — ${l.trim().slice(0, 70)}`);
        }
      });
    }
    expect(maus).toEqual([]);
  });
});
