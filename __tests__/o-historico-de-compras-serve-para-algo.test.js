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
    // ⚠ A comparação vive no `artigosDaIda` desde 18/09/2026, que passou a ser
    // a FONTE ÚNICA: dá todos os artigos da ida com a marca `jaNaLista`, e o
    // `artigosQueFaltamDaIda` é um filtro dela. A folha precisa dos que já lá
    // estão para os mostrar trancados — antes desapareciam sem explicação —, e
    // duas contas do mesmo número é a classe de defeito que já pôs a grelha de
    // envelopes a mostrar uma lista e a confirmação a aplicar outra.
    const loja = codigoDe('src/store.jsx');
    const i = loja.indexOf('const artigosDaIda');
    expect(i).toBeGreaterThan(0);
    const corpo = loja.slice(i, loja.indexOf('const repetirCompra'));
    expect(corpo).toMatch(/jaNaLista: jaLa\.has\(chave\)/);   // já na lista de hoje
    expect(corpo).toMatch(/vistos\.has\(chave\)/);            // repetido dentro da ida
    expect(corpo).toMatch(/if \(!chave/);                     // e sem rótulo não entra
    // E o filtro é um filtro, e não uma segunda cópia da comparação.
    expect(loja).toMatch(/const artigosQueFaltamDaIda = \(at\) => artigosDaIda\(at\)\.filter\(a => !a\.jaNaLista\);/);
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
    //
    // ⚠ Desde 18/09/2026 o botão vive na FOLHA da ida, e a linha do histórico
    // abre-a sempre — tem destino mesmo quando não há nada a repetir, porque
    // ver o que se comprou é uma razão para lá ir. Quem diz o que a folha vai
    // oferecer, antes de se tocar, é a pastilha «N por repetir».
    const ecra = codigoDe('src/screens/Compras.jsx');
    expect(ecra).toMatch(/const faltam = st\.artigosQueFaltamDaIda\(h\.at\)\.length/);
    // A pastilha existe, e é condicional ao que falta — não aparece numa ida
    // que não tem nada a repetir.
    expect(ecra).toMatch(/<Pill label=\{`\$\{faltam\} por repetir`\}/);
    expect(ecra).toMatch(/\{faltam > 0[\s\S]{0,40}<Pill label=/);

    const folha = codigoDe('src/sheets/IdaAsCompras.jsx');
    expect(folha).toMatch(/const podeRepetir = artigos\.some\(a => !a\.jaNaLista\);/);
    expect(folha).toMatch(/action=\{podeRepetir \? \(/);
    // E sem nada marcado o botão está DESATIVADO, não mudo.
    expect(folha).toMatch(/disabled=\{quantos === 0\}/);

    // E já não há `onPress` vazio em lado nenhum deste ecrã.
    expect(ecra).not.toMatch(/onPress=\{\(\) => \{\}\}/);
  });

  it('⚠ MOSTRA o que se comprou antes de acrescentar — e não só quantos são', () => {
    // 18/09/2026, ele a olhar para o botão «Repetir»: «quando clico aqui não
    // devia ver-se o que foi comprado para validar se quero repetir ou não?».
    //
    // O que aqui estava era um `Confirm` a dizer «4 artigos entram na lista de
    // hoje»: o VOLUME, e não o conteúdo. Com uma ida de trinta artigos era
    // carregar às cegas, que é o contrário do que uma confirmação serve para
    // fazer.
    const ecra = codigoDe('src/screens/Compras.jsx');
    const i = ecra.indexOf('aRepetir !== null');
    expect(i).toBeGreaterThan(0);
    const bloco = ecra.slice(i, ecra.indexOf('})() : null}', i));
    expect(bloco).toMatch(/<IdaAsCompras t=\{t\} ida=\{ida\} user=\{user\}/);
    expect(bloco).not.toMatch(/<Confirm/);

    const folha = codigoDe('src/sheets/IdaAsCompras.jsx');
    // A folha LISTA os artigos, um a um, com o rótulo à vista.
    expect(folha).toMatch(/artigos\.map\(\(a, i\) => linha\(a, i === artigos\.length - 1\)\)/);
    expect(folha).toMatch(/\{a\.rotulo\}/);
    // E os que JÁ estão na lista aparecem, trancados e com a razão à vista —
    // antes eram filtrados para fora e desapareciam sem explicação.
    expect(folha).toMatch(/label="já na lista"/);
    expect(folha).toMatch(/a\.jaNaLista \? corpo : \(/);
    // O botão leva a ESCOLHA, e não a ida inteira.
    expect(folha).toMatch(/repetirCompra\(ida\.at, user, \[\.\.\.escolhidos\]\)/);
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
