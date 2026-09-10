/**
 * Tudo o que se toca tem o mesmo canto: `R.row`, 6 px.
 *
 * ── A decisão ────────────────────────────────────────────────────────────────
 *
 * Pedida pelo dono da casa em 07/09/2026, com um print do botão do aspeto no
 * Perfil — um quadrado de 44 com cantos de 6 — e a frase «os cantos dos botões
 * arredondados de toda a app serem assim».
 *
 * A app tinha os dois: `R.pill` (100) em metade dos botões e `R.row` (6) na
 * outra, escolhidos ficheiro a ficheiro. O `Primary` era um cilindro, o botão
 * do aspeto era um canto, a pastilha de filtro era um cilindro, a `Opcao` era
 * um canto — e a diferença não dizia nada: eram coisas do mesmo tipo com duas
 * formas. Uma app onde o mesmo tipo de coisa tem duas formas obriga a olhar
 * duas vezes para perceber que é a mesma coisa.
 *
 * Mudaram 19 sítios, e todos tinham um `minHeight` — a assinatura de um
 * retângulo tocável.
 *
 * ── O que FICA redondo, e porquê ─────────────────────────────────────────────
 *
 * O que é redondo POR FORMA e não por decisão de estilo: a barra de progresso,
 * o carril do interruptor e a bola dele, o anel do rádio, os avatares, os
 * discos de cor, os pontos do PIN, o disco do dia escolhido no calendário.
 * Nesses, quadrar os cantos não é uma escolha de desenho — é desenhar outra
 * coisa. E a `Pill`, a pastilha de estado, que não se toca.
 *
 * ⚠ Sete deles escaparam-me à primeira, e a causa é uma que vale a pena não
 * repetir: o meu varrimento procurava um `borderRadius` DENTRO de um
 * `<Pressable>`, e quatro avatares do Login, duas bolas do EscolherAvatar e um
 * ponto de cor das Tarefas vivem exactamente aí — são círculos dentro de um
 * botão, não o botão. **O raio que conta é o do próprio tocável**, e o teste
 * abaixo faz essa distinção pela linha, não pelo bloco.
 */
const fs = require('fs');
const path = require('path');
const { R } = require('../src/theme');

const RAIZ = path.join(__dirname, '..');

// ── O que fica redondo, com o motivo escrito ─────────────────────────────────
//
// A chave é `ficheiro` e o valor é a lista de motivos, um por ocorrência. É a
// lista que a prova exige que se mantenha exacta: uma pílula nova sem motivo
// falha, e um motivo que já não corresponde a pílula nenhuma falha também.
const FICAM_REDONDOS = {
  'src/ui.jsx': [
    'pastilha de estado — não se toca, é uma etiqueta',
    'anel do rádio da Opcao',
    'disco do rádio da Opcao',
    'disco de cor do membro, 9 px',
    'disco da caixa de seleção, 9 px',
    'carril do interruptor',
    'bola do interruptor',
    'avatar do cabeçalho — é um círculo',
    'avatar — é um círculo',
    'barra de progresso',
    'preenchimento da barra de progresso',
  ],
  'src/screens/Agenda.jsx': [
    'pontos dos eventos de um dia, 5 px',
    'discos de cor da legenda, 10 px',
  ],
  'src/CampoData.jsx': ['disco do dia escolhido no calendário'],
  'src/screens/ModoCompras.jsx': ['barra de progresso do corredor'],
  'src/screens/Tarefas.jsx': [
    // O «disco de cor da criança no cofre» saiu daqui com a semanada, que
    // passou ao Dinheiro em 10/09/2026 — e lá a linha usa o `Avatar`.
    'disco de cor do membro na pastilha de filtro, 8 px',
  ],
  'src/sheets/EscolherAvatar.jsx': [
    'bola do avatar de uma figura',
    'bola da inicial',
    'disco de cor do avatar — é uma amostra de cor',
  ],
  'src/screens/Login.jsx': [
    'avatar de um adulto na entrada',
    'círculo tracejado de «outra conta Google»',
    'avatar de uma criança na entrada',
    'avatar da criança no ecrã do PIN',
    'os quatro pontos do PIN',
  ],
  'src/screens/Gestao.jsx': ['barra do envelope', 'preenchimento da barra do envelope'],
  'src/KidApp.jsx': ['forma do cabeçalho da app da criança', 'forma do cabeçalho da app da criança'],
  'src/screens/Perfil.jsx': ['o quadrado rodado do ícone da app'],
  'App.jsx': ['a forma do ecrã de arranque'],
};

const jsx = (() => {
  const fora = [];
  const percorrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) percorrer(p);
      else if (/\.jsx$/.test(e.name)) fora.push(p);
    }
  };
  percorrer(path.join(RAIZ, 'src'));
  fora.push(path.join(RAIZ, 'App.jsx'));
  return fora.map(p => path.relative(RAIZ, p).split(path.sep).join('/'));
})();

// Cada `borderRadius: R.pill` da árvore.
const pilulas = () => {
  const fora = [];
  for (const rel of jsx) {
    const linhas = fs.readFileSync(path.join(RAIZ, rel), 'utf8').split('\n');
    linhas.forEach((l, i) => {
      if (/^\s*(\/\/|\*)/.test(l)) return;         // um comentário não desenha nada
      if (!/borderRadius: R\.pill/.test(l)) return;
      fora.push({ rel, linha: i + 1, texto: l.trim() });
    });
  }
  return fora;
};

const PILULAS = pilulas();

describe('⚠ o canto de tudo o que se toca é o mesmo', () => {
  it('a prova encontra pílulas — senão não prova nada', () => {
    expect(PILULAS.length).toBeGreaterThan(10);
  });

  it('⚠ nenhuma pílula está num sítio sem motivo escrito nesta prova', () => {
    const contas = {};
    const semMotivo = [];
    for (const p of PILULAS) {
      const permitidas = (FICAM_REDONDOS[p.rel] || []).length;
      contas[p.rel] = (contas[p.rel] || 0) + 1;
      if (contas[p.rel] > permitidas) {
        semMotivo.push(`${p.rel}:${p.linha} → ${p.texto.slice(0, 62)}`);
      }
    }
    expect(semMotivo).toEqual([]);
  });

  it('⚠ e nenhum motivo sobra sem pílula — a lista não envelhece a dizer sim', () => {
    const porFicheiro = {};
    for (const p of PILULAS) porFicheiro[p.rel] = (porFicheiro[p.rel] || 0) + 1;
    const sobras = [];
    for (const [rel, motivos] of Object.entries(FICAM_REDONDOS)) {
      const tem = porFicheiro[rel] || 0;
      if (tem < motivos.length) sobras.push(`${rel}: ${motivos.length} motivos, ${tem} pílulas`);
    }
    expect(sobras).toEqual([]);
  });

  it('cada motivo diz alguma coisa, e não «porque sim»', () => {
    for (const [rel, motivos] of Object.entries(FICAM_REDONDOS)) {
      for (const m of motivos) expect(m.split(/\s+/).length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('⚠ nenhum RETÂNGULO TOCÁVEL leva pílula', () => {
  // A assinatura de um retângulo tocável é o `minHeight`: um botão declara a
  // altura mínima do alvo (INVARIANTE #5), um círculo declara `width` e
  // `height` iguais. Foi a distinção que faltou ao primeiro varrimento.
  it('nenhuma linha junta `minHeight` e `R.pill`', () => {
    const maus = PILULAS
      .filter(p => /minHeight/.test(p.texto))
      .map(p => `${p.rel}:${p.linha} → ${p.texto.slice(0, 62)}`);
    expect(maus).toEqual([]);
  });

  it('⚠ nem `minHeight` e `R.card` — o buraco que a primeira versão tinha', () => {
    // A primeira versão desta prova só procurava `R.pill`, e havia ONZE
    // tocáveis a `R.card` (8): os dois botões do `Confirm`, os dois da modal da
    // Google, os dois da FichaSaude, o «Usar outra conta» do Login, a linha de
    // um artigo no Modo Compras, o Cofre, a FichaEquipamento e o KidApp.
    //
    // Um canto de 8 num botão não salta à vista ao lado de um de 6 — e é
    // precisamente por isso que precisa de prova: ninguém o ia ver, e ficavam
    // três cantos onde a decisão foi um.
    const maus = [];
    for (const rel of jsx) {
      const linhas = fs.readFileSync(path.join(RAIZ, rel), 'utf8').split('\n');
      linhas.forEach((l, i) => {
        if (/^\s*(\/\/|\*)/.test(l)) return;
        if (/minHeight/.test(l) && /borderRadius: R\.card/.test(l)) {
          maus.push(`${rel}:${i + 1} → ${l.trim().slice(0, 62)}`);
        }
      });
    }
    expect(maus).toEqual([]);
  });

  // ── ⚠ O raio do PRÓPRIO tocável, lido do bloco de estilo inteiro ───────────
  //
  // As duas provas acima procuram `minHeight` e o raio NA MESMA LINHA, e é
  // essa a assinatura que deixou passar dois casos em 08/09/2026, no
  // varrimento com a casa a sério:
  //
  //   o paginador   `Tap` com `borderRadius: R.sm` no `style` — o tamanho vem
  //                 do `size={44}` do componente, não há `minHeight` na linha
  //   o cofre       `Pressable` a `R.card` com `flex: 1` e `padding: 14` — o
  //                 alvo resulta do enchimento, e o raio está noutra linha
  //
  // A propriedade não é «minHeight e raio juntos»: é que o bloco de estilo de
  // um `<Pressable` ou `<Tap` — inteiro, com as chaves contadas — só declare
  // `R.row`, ou `R.pill` para o que for redondo por forma (e essa lista tem os
  // motivos escritos em cima). `R.card` e `R.sm` num tocável são o que não pode
  // existir.
  const blocosDeEstiloDosTocaveis = () => {
    const fora = [];
    for (const rel of jsx) {
      const txt = fs.readFileSync(path.join(RAIZ, rel), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
        .split('\n').map(l => (/^\s*(\/\/|\*)/.test(l) ? '' : l)).join('\n');
      const re = /<(Pressable|Tap)\b/g;
      let m;
      while ((m = re.exec(txt))) {
        // ⚠ O fim da etiqueta é o primeiro `>` FORA de chavetas — não o
        // primeiro `>` que aparecer. Um estilo em função, `style={({ pressed })
        // => ({ … })}`, tem um `>` no `=>`, e a primeira versão disto cortava a
        // etiqueta aí, antes do `borderRadius`. Foi assim que os dois
        // «Adicionar» da ficha do equipamento ficaram a `R.card` com o guarda
        // verde — apanhados pela sonda no navegador, não por aqui.
        let fim = -1, prof = 0;
        for (let j = m.index; j < txt.length; j++) {
          const ch = txt[j];
          if (ch === '{') prof++;
          else if (ch === '}') prof--;
          else if (ch === '>' && prof === 0) { fim = j; break; }
        }
        const etiqueta = txt.slice(m.index, fim === -1 ? txt.length : fim + 1);
        const s = etiqueta.indexOf('style=');
        if (s === -1) continue;
        // ⚠ Um `Pressable` sem `onPress` não é um tocável: é o cartão de um
        // diálogo que existe para engolir o toque e não deixar fechar o fundo
        // (os dois da Gestão). Esse é um cartão, e um cartão leva `R.card`. O
        // `Tap` tem sempre `onPress` — é para isso que existe.
        if (m[1] === 'Pressable' && !/\bonPress=/.test(etiqueta)) continue;
        // Conta chaves a partir do `{` do `style=`.
        let nivel = 0, j = s + 6, ini = -1;
        for (; j < etiqueta.length; j++) {
          if (etiqueta[j] === '{') { if (nivel === 0) ini = j; nivel++; }
          else if (etiqueta[j] === '}') { nivel--; if (nivel === 0) break; }
        }
        const bloco = etiqueta.slice(ini, j + 1);
        const linha = txt.slice(0, m.index).split('\n').length;
        fora.push({ rel, linha, bloco });
      }
    }
    return fora;
  };

  it('⚠ nenhum `Pressable`/`Tap` declara `R.card` nem `R.sm` no seu próprio estilo', () => {
    const maus = blocosDeEstiloDosTocaveis()
      .filter(({ bloco }) => /borderRadius:\s*R\.(card|sm)\b/.test(bloco))
      .map(({ rel, linha, bloco }) => `${rel}:${linha} → ${bloco.match(/borderRadius:\s*R\.\w+/)[0]}`);
    expect(maus).toEqual([]);
  });

  it('e a prova lê blocos de estilo — senão não prova nada', () => {
    // Eram 39 em 08/09/2026, sem os dois cartões de diálogo da Gestão. O piso
    // é para apanhar o padrão a deixar de casar, não para contar botões.
    expect(blocosDeEstiloDosTocaveis().length).toBeGreaterThan(30);
  });

  it('e o `Primary`, a `Choice` e a `Opcao` levam `R.row`', () => {
    const ui = fs.readFileSync(path.join(RAIZ, 'src', 'ui.jsx'), 'utf8');
    for (const nome of ['Primary', 'Choice', 'Opcao']) {
      const i = ui.indexOf(`export const ${nome} =`);
      expect(i).toBeGreaterThan(0);
      const bloco = ui.slice(i, i + 700);
      // O raio do PRÓPRIO tocável: a linha que também tem o `minHeight`.
      const linha = bloco.split('\n').find(l => /minHeight/.test(l) && /borderRadius/.test(l));
      expect(linha).toBeTruthy();
      expect(linha).toMatch(/borderRadius: R\.row/);
    }
  });
});

describe('a escala de cantos continua a ser quatro valores', () => {
  it('e o `row` é 6, que é o do print do botão do aspeto', () => {
    expect(R.row).toBe(6);
    expect(Object.keys(R).sort()).toEqual(['card', 'pill', 'row', 'sm']);
  });

  it('⚠ nenhum ficheiro escreve um raio à mão em vez de o ler do tema', () => {
    // Eu escrevi `borderRadius: 10` no cartão do mês, e um número solto é o
    // primeiro passo para haver cinco cantos em vez de quatro.
    const maus = [];
    for (const rel of jsx) {
      const linhas = fs.readFileSync(path.join(RAIZ, rel), 'utf8').split('\n');
      linhas.forEach((l, i) => {
        if (/^\s*(\/\/|\*)/.test(l)) return;
        const m = l.match(/borderRadius: (\d+)/);
        // O 0 é «sem canto», e não um valor da escala.
        if (m && Number(m[1]) !== 0) maus.push(`${rel}:${i + 1} → borderRadius: ${m[1]}`);
      });
    }
    expect(maus).toEqual([]);
  });
});
