/**
 * O TRAVÃO DA SAÚDE É PERGUNTADO EM TODO O LADO — e não só à entrada.
 *
 * ── O que aconteceu ──────────────────────────────────────────────────────────
 *
 * Em 28/09/2026, quatro leitores enumeraram os caminhos por que dados de saúde
 * podem chegar ao servidor. Encontraram 49; 46 confirmaram-se; **24 não tinham
 * travão nenhum**. Não eram 24 defeitos — eram seis, vistos de vários ângulos —
 * mas nenhum deles se via de dentro do `recusaSaude`, porque o `recusaSaude`
 * estava certo. O que estava errado era o número de sítios onde se perguntava.
 *
 * Os quatro que este guarda fecha:
 *
 *  1. **A FILA não voltava a perguntar.** O `recusaSaude` corria à ENTRADA, no
 *     `sync.js`; o `despachar()` do `pocketbase.js` enviava o que lá estava sem
 *     consultar ninguém. A fila vive no `AsyncStorage`, sobrevive ao reinício e
 *     à mudança de endereço — e qualquer escrita seguinte, uma despesa que
 *     seja, drenava-a para o servidor que estivesse configurado. Uma consulta
 *     enfileirada em casa subia para a internet.
 *
 *  2. **APAGAR estava travado, e isso tornava o servidor mais sujo.** Com o
 *     travão fechado, o `apagarEpisodioDeSaude` rebentava antes de chamar o
 *     servidor. A app dava a consulta por apagada e a linha ficava lá.
 *
 *  3. **A LEITURA não tinha travão próprio** — a condição vivia em quem chama.
 *
 *  4. **O DIÁRIO da casa contava a saúde.** «Alergia acrescentada à ficha da
 *     Mia» ia para `registo`, que não é coleção de saúde. Com o travão fechado
 *     passava a ser o único rasto — a anunciar o que o travão calara.
 *
 * ── Porque é que este guarda enumera ─────────────────────────────────────────
 *
 * Porque é a segunda vez que a mesma forma aparece: uma regra certa, aplicada
 * em menos sítios do que os que existem. A primeira foi o título da consulta a
 * ir para a agenda da Google mas não para a do servidor.
 *
 * Um guarda que confirmasse «o `recusaSaude` existe» ficaria verde em todos
 * estes casos. Este pergunta o contrário: **quem toca em saúde, e nenhum deles
 * pode estar sem resposta.**
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ler = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');

const semComentarios = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:])\/\/[^\n]*/g, (m, antes) => antes + ' '.repeat(m.length - antes.length));

// As funções exportadas do `sync.js`, com o corpo de cada uma.
const funcoesDe = (ficheiro) => {
  const t = semComentarios(ler(ficheiro));
  const saida = [];
  for (const m of t.matchAll(/export\s+(?:async\s+)?function\s+(\w+)\s*\(/g)) {
    const fim = t.indexOf('\n}', m.index);
    saida.push({ nome: m[1], corpo: t.slice(m.index, fim > 0 ? fim : t.length) });
  }
  return saida;
};

describe('o travão da saúde é perguntado em todo o lado', () => {
  const COLECOES = ler('src/colecoes-de-saude.js');
  const NOMES = [...COLECOES.matchAll(/^\s*'(\w+)',/gm)].map((m) => m[1]);

  it('a lista das coleções de saúde vive num sítio só, e tem as sete', () => {
    // Um guarda que não lê nada passa sempre.
    expect(NOMES.sort()).toEqual([
      'alergias_saude', 'anexos', 'decisoes_saude', 'episodios_saude',
      'notas_saude', 'receitas_saude', 'tomas_saude',
    ].sort());

    // ⚠ E NÃO há uma segunda cópia. Duas listas divergem, e a que diverge é
    // sempre a que o defeito usa.
    const sync = semComentarios(ler('src/sync.js'));
    expect(sync).not.toMatch(/const SAUDE\s*=\s*\[/);
  });

  it('o ajudante partilhado pergunta ao travão — é nele que metade delas se apoia', () => {
    // ⚠ Isto vem PRIMEIRO de propósito. A prova a seguir aceita que uma função
    // delegue no `criarOuEnfileirar` em vez de chamar o travão à mão, e essa
    // aceitação só vale enquanto ele próprio perguntar. Sem esta linha, tirar o
    // `recusaSaude` de lá deixava quatro funções sem travão e o guarda verde.
    const sync = semComentarios(ler('src/sync.js'));
    const i = sync.indexOf('const criarOuEnfileirar = async');
    expect(i).toBeGreaterThan(0);
    const corpo = sync.slice(i, sync.indexOf('\n};', i));
    expect(corpo).toMatch(/recusaSaude\(colecao\)/);
    // E antes de escrever seja o que for.
    expect(corpo.indexOf('recusaSaude(')).toBeLessThan(corpo.indexOf('.create('));
  });

  it('⚠ toda a função do `sync.js` que ESCREVE saúde pergunta ao travão', () => {
    // Enumera do código: qualquer função cujo corpo nomeie uma coleção de
    // saúde e que não seja de apagar tem de perguntar — ou à mão, com o
    // `recusaSaude`, ou pelo `criarOuEnfileirar`, que é provado acima.
    const mudas = [];
    for (const f of funcoesDe('src/sync.js')) {
      const tocaSaude = NOMES.some((c) => f.corpo.includes(`'${c}'`));
      if (!tocaSaude) continue;
      if (/^apagar/.test(f.nome)) continue;          // tratadas na prova seguinte
      if (/^puxar|^recusaSaude|^apagarPodeSempre/.test(f.nome)) continue;
      const pergunta = /recusaSaude\(/.test(f.corpo) || /criarOuEnfileirar\(/.test(f.corpo);
      if (!pergunta) mudas.push(f.nome);
    }
    expect(mudas).toEqual([]);
  });

  it('⚠ e toda a que APAGA passa pelo `apagarPodeSempre`, nunca pelo travão', () => {
    // O contrário, e é deliberado: apagar não leva informação a lado nenhum —
    // tira-a. Travá-lo deixava a linha no servidor com a app a dar-lhe baixa.
    const erradas = [];
    for (const f of funcoesDe('src/sync.js')) {
      if (!/^apagar/.test(f.nome) || f.nome === 'apagarPodeSempre') continue;
      const tocaSaude = NOMES.some((c) => f.corpo.includes(`'${c}'`));
      if (!tocaSaude) continue;
      if (/recusaSaude\(/.test(f.corpo)) erradas.push(`${f.nome}: ainda chama o recusaSaude`);
      if (!/apagarPodeSempre\(/.test(f.corpo)) erradas.push(`${f.nome}: não diz que pode sempre`);
    }
    expect(erradas).toEqual([]);
  });

  it('⚠ a FILA volta a perguntar à saída — não só à entrada', () => {
    // O caminho que ninguém via: `recusaSaude` à entrada, `despachar()` a
    // enviar sem consultar. A fila sobrevive à mudança de endereço.
    const pb = semComentarios(ler('src/pocketbase.js'));
    const i = pb.indexOf('async despachar()');
    expect(i).toBeGreaterThan(0);
    const corpo = pb.slice(i, pb.indexOf('\n  },', i));
    expect(corpo).toMatch(/eColecaoDeSaude\(/);
    expect(corpo).toMatch(/eEnderecoDeCasa\(/);
    // E a decisão é tomada ANTES de a escrita ser tentada.
    expect(corpo.indexOf('eColecaoDeSaude(')).toBeLessThan(corpo.indexOf('.create('));
  });

  it('⚠ e a LEITURA tem travão próprio, não só em quem chama', () => {
    const pb = semComentarios(ler('src/pocketbase.js'));
    const i = pb.indexOf('async saude(membroId)');
    expect(i).toBeGreaterThan(0);
    const corpo = pb.slice(i, i + 1400);
    expect(corpo).toMatch(/eEnderecoDeCasa\(/);
    // Antes de ir buscar o que quer que seja.
    expect(corpo.indexOf('eEnderecoDeCasa(')).toBeLessThan(corpo.indexOf('getFullList'));
  });

  it('⚠ e o DIÁRIO da casa não conta a saúde quando o travão está fechado', () => {
    // «Alergia acrescentada à ficha da Mia» ia para `registo`, que não é
    // coleção de saúde. Com o travão fechado passava a ser o único rasto.
    const sync = semComentarios(ler('src/sync.js'));
    const i = sync.indexOf('export async function registoDaCasa');
    expect(i).toBeGreaterThan(0);
    const corpo = sync.slice(i, sync.indexOf('\n}', i));
    expect(corpo).toMatch(/textoDoRegisto\(/);

    const j = sync.indexOf('export const textoDoRegisto');
    expect(j).toBeGreaterThan(0);
    const regra = sync.slice(j, j + 260);
    expect(regra).toMatch(/'Saúde'/);
    expect(regra).toMatch(/saudeSincroniza\(\)/);
  });
});
