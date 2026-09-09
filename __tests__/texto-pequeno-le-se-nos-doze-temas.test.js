/**
 * O texto pequeno lê-se — nos seis esquemas e nos dois aspetos.
 *
 * ── O que a sonda encontrou em 08/09/2026 ────────────────────────────────────
 *
 * O primeiro varrimento no ESCURO, com uma sonda a medir o contraste de cada
 * texto contra o fundo real por baixo dele, deu isto no Violeta:
 *
 *   «Léo · atrasada 1 dia»    errDeep #CE0002 sobre o cartão escuro     3,00
 *   «Ver mês», os dias        accent  #722ED1 sobre o cartão escuro     2,50
 *   «Alterar»                 titulo  #8B4EE0 sobre o cartão escuro     3,53
 *   «2 pt»                    warnDeep #AD8B00 sobre o tijolo amarelo   3,16  (nos DOIS aspetos)
 *   «Família»                 info sobre o tijolo azul-claro            2,91  (nos DOIS aspetos)
 *   «Cor do perfil» (Label)   slate sobre o cartão claro                4,41
 *   «Use Agendar Evento…»     text3 sobre o tijolo tingido do vazio     3,75
 *   «feita hoje · volta…»     text3 sobre o cartão de tarefa feita      4,27
 *   «1», «2», «3»             branco sobre a caixa urgente #FF4D4F      3,27
 *
 * Três causas, não nove:
 *
 *   1. as cores «deep» dos estados foram calibradas para o claro e eram usadas
 *      como texto também no escuro — nasceu o `xTexto`, que é o deep no claro
 *      e a própria cor no escuro
 *   2. o acento e o `titulo` eram usados como TEXTO pequeno — só o `actFg` foi
 *      desenhado para os 4,5:1, e é ele que o texto em cor de acção leva
 *   3. `text3`, `slate` e `warnDeep` estavam um tom acima do que os 4,5 pedem
 *      sobre a página e sobre os tijolos
 *
 * ── A propriedade, medida pelos tokens ───────────────────────────────────────
 *
 * Não se mede o ecrã: medem-se os PARES de tokens que o ecrã pode formar, nos
 * doze temas, com a fórmula da WCAG. Um par novo que falhe entra aqui quando
 * for acrescentado à lista — e a lista é o que a app pratica.
 */
const fs = require('fs');
const path = require('path');
const { buildTheme, SCHEMES } = require('../src/theme');

const RAIZ = path.join(__dirname, '..');

// ── A fórmula ────────────────────────────────────────────────────────────────
const canal = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const rgb = (c) => {
  const s = String(c).trim();
  if (s.startsWith('#')) {
    const n = s.slice(1);
    return { r: parseInt(n.slice(0, 2), 16), g: parseInt(n.slice(2, 4), 16), b: parseInt(n.slice(4, 6), 16), a: 1 };
  }
  const m = s.match(/[\d.]+/g);
  return { r: +m[0], g: +m[1], b: +m[2], a: m.length > 3 ? +m[3] : 1 };
};
const sobre = (topo, fundo) => {
  const t = rgb(topo), f = rgb(fundo);
  return { r: t.r * t.a + f.r * (1 - t.a), g: t.g * t.a + f.g * (1 - t.a), b: t.b * t.a + f.b * (1 - t.a), a: 1 };
};
const lum = ({ r, g, b }) => 0.2126 * canal(r / 255) + 0.7152 * canal(g / 255) + 0.0722 * canal(b / 255);
const contraste = (texto, fundo) => {
  // Os dois lados aceitam uma cor escrita OU um já composto pelo `sobre`.
  const a = lum(typeof texto === 'string' ? rgb(texto) : texto);
  const b = lum(typeof fundo === 'string' ? rgb(fundo) : fundo);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

const TEMAS = [];
for (let e = 0; e < SCHEMES.length; e++) for (const dark of [false, true]) {
  const t = buildTheme(e, dark);
  TEMAS.push({ nome: `${t.name} ${dark ? 'escuro' : 'claro'}`, t });
}

// Cada par que falha, dito com o número.
const falhas = (pares, minimo) => {
  const fora = [];
  for (const { nome, t } of TEMAS) {
    for (const [rotulo, texto, fundo] of pares(t)) {
      const r = contraste(texto, fundo);
      if (r < minimo - 0.005) fora.push(`${nome}: ${rotulo} = ${r.toFixed(2)} (mín ${minimo})`);
    }
  }
  return fora;
};

describe('⚠ o texto pequeno chega aos 4,5:1 sobre as superfícies, nos doze temas', () => {
  it('há doze temas para conferir — senão isto não prova nada', () => {
    expect(TEMAS.length).toBe(12);
  });

  it('text1, text2, text3 e slate sobre a página, o cartão e o subtil', () => {
    expect(falhas(t => ['page', 'card', 'subtle'].flatMap(f =>
      ['text1', 'text2', 'text3', 'slate'].map(c => [`${c}/${f}`, t[c], t[f]])), 4.5)).toEqual([]);
  });

  it('⚠ o texto em cor de acção é o `actFg` — sobre a página, o cartão e o subtil', () => {
    // O acento dá 2,12–3,07 sobre o cartão escuro; o `titulo` 3,01–4,08. Só o
    // `actFg` foi desenhado para os 4,5, e passa nos doze.
    expect(falhas(t => ['page', 'card', 'subtle'].map(f => [`actFg/${f}`, t.actFg, t[f]]), 4.5)).toEqual([]);
  });

  it('⚠ o texto de cada estado (`xTexto`) sobre o cartão e o subtil', () => {
    expect(falhas(t => ['card', 'subtle'].flatMap(f =>
      ['ok', 'err', 'warn', 'info'].map(k => [`${k}Texto/${f}`, t.state[`${k}Texto`], t[f]])), 4.5)).toEqual([]);
  });

  // O acento com alfa, como o `comAlfa` do tema o escreve — para o tijolo do
  // vazio, que é o acento a 9 % (18 % no escuro) sobre o cartão.
  const acentoComAlfa = (t) => {
    const { r, g, b } = rgb(t.accent);
    return `rgba(${r},${g},${b},${t.dark ? 0.18 : 0.09})`;
  };

  it('⚠ o texto de cada estado sobre o SEU tijolo', () => {
    // Dois tipos de tijolo. Os OPACOS (`warnBg`, `infoBg`) são claros nos dois
    // aspetos, e o texto em cima é o «deep» constante — era aqui que o âmbar
    // dava 3,16. Os TINGIDOS (`okBg`, `errBg`) são um alfa sobre o cartão, ficam
    // escuros no escuro, e o texto em cima é o `xTexto`.
    expect(falhas(t => [
      ['warnDeep/warnBg', t.state.warnDeep, t.state.warnBg],
      ['infoDeep/infoBg', t.state.infoDeep, t.state.infoBg],
      ['okTexto/okBg sobre o cartão', t.state.okTexto, sobre(t.state.okBg, t.card)],
      ['errTexto/errBg sobre o cartão', t.state.errTexto, sobre(t.state.errBg, t.card)],
      ['text3/okBg sobre o cartão', t.text3, sobre(t.state.okBg, t.card)],
      ['text2/tijolo do vazio', t.text2, sobre(acentoComAlfa(t), t.card)],
    ], 4.5)).toEqual([]);
  });

  it('⚠ o branco com alfa do cabeçalho lê-se a 4,5 nos seis esquemas', () => {
    // O subtítulo do cabeçalho e os rótulos do rodapé são `onChrome(t.chrome)`,
    // um branco com alfa sobre a cor do cabeçalho. No Cinza — o cabeçalho mais
    // claro — o alfa estimado dava 3,93 a 10,5 px. Agora resolve-se para 4,6.
    const { onChrome } = require('../src/theme');
    expect(falhas(t => [['onChrome/chrome', sobre(onChrome(t.chrome), t.chrome), t.chrome]], 4.5)).toEqual([]);
  });

  it('⚠ branco sobre os preenchimentos que levam branco', () => {
    // O botão destrutivo do `Confirm` e a caixa da tarefa urgente. Branco sobre
    // #FF4D4F dá 3,27; sobre #CE0002 dá 5,79 — é por isso que a caixa é errDeep.
    expect(falhas(t => [
      ['branco/errDeep', '#FFFFFF', t.state.errDeep],
      ['branco/accent', '#FFFFFF', t.accent],
      ['branco/chrome', '#FFFFFF', t.chrome],
    ], 4.5)).toEqual([]);
  });

  it('⚠ a inicial sobre a cor de cada membro da paleta', () => {
    // Era branco sempre, e sobre o azul, o cião e o âmbar da paleta dava
    // 3,24, 3,55 e 2,5 nos avatares de 20 px. O `corSobre` escolhe.
    const { PALETA_MEMBROS, corSobre } = require('../src/theme');
    const fora = PALETA_MEMBROS
      .map(c => [c, contraste(corSobre(c), c)])
      .filter(([, r]) => r < 4.5)
      .map(([c, r]) => `${corSobre(c)} sobre ${c} = ${r.toFixed(2)}`);
    expect(fora).toEqual([]);
  });

  it('os objetos gráficos em cor de acção chegam aos 3:1 — o `titulo` sobre o cartão', () => {
    expect(falhas(t => [['titulo/card', t.titulo, t.card], ['titulo/page', t.titulo, t.page]], 3)).toEqual([]);
  });
});

// ── E o código pratica-o ─────────────────────────────────────────────────────
const jsx = (() => {
  const fora = [];
  const percorrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) percorrer(p);
      else if (/\.jsx$/.test(e.name)) fora.push(path.relative(RAIZ, p).split(path.sep).join('/'));
    }
  };
  percorrer(path.join(RAIZ, 'src'));
  return fora;
})();
const soCodigo = (txt) => txt
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .split('\n').map(l => (/^\s*(\/\/|\*)/.test(l) ? '' : l));

describe('⚠ e nenhum ecrã volta a pintar texto pequeno com o acento ou com um «deep» fora do tijolo', () => {
  it('nenhum `<Text` leva `color: t.accent`, `t.titulo` ou `t.hover` — só o título de secção', () => {
    // O `SectionTitle` passou a 13 px (desenho C, 09/09/2026) e leva `actFg`
    // como todo o texto pequeno; a excepção do `titulo` abaixo fica para o
    // dia em que voltar a haver texto grande na cor do esquema.
    const maus = [];
    for (const rel of jsx) {
      const linhas = soCodigo(fs.readFileSync(path.join(RAIZ, rel), 'utf8'));
      linhas.forEach((l, i) => {
        // ⚠ Em QUALQUER ramo do ternário. Era só «logo a seguir ao `?`», e
        // `color: feito ? t.text3 : t.accent` passava — o «Confirmar» do
        // Modo Compras, a 4,49 sobre a linha sem stock (09/09/2026).
        if (!/color:\s*[^,}\n]*\bt\.(accent|titulo|hover)\b/.test(l)) return;
        // O acento como ARGUMENTO do `onChrome` é o fundo, não o texto.
        if (/onChrome\(/.test(l)) return;
        if (/backgroundColor|borderColor|borderLeftColor|borderBottomColor|Bar\b|<Icon/.test(l)) return;
        // A linha do `SectionTitle` no `ui.jsx`.
        if (rel === 'src/ui.jsx' && /letterSpacing: 0\.1/.test(l)) return;
        // Uma linha de `<Icon` partida em duas: a cor na linha, o `<Icon` na de cima.
        if (/<Icon\b/.test(linhas[i - 1] || '') && !/<Text/.test(linhas[i - 1] || '')) return;
        maus.push(`${rel}:${i + 1} → ${l.trim().slice(0, 70)}`);
      });
    }
    expect(maus).toEqual([]);
  });

  it('⚠ nenhum texto leva branco com alfa FIXO — sobre o acento, o alfa calcula-se (`onChrome`)', () => {
    // «livre 62,00 €» na escolha do envelope, em branco a 70 % sobre o acento
    // Cião: 3,07 a 11,5 px (09/09/2026). O mesmo erro #4 do CLAUDE.md — alfas
    // de branco calibrados para um fundo escuro — noutro sítio. O `onChrome`
    // sobe o alfa até aos 4,6 contra o fundo REAL; um literal não sabe qual é.
    // A Entrada fica de fora: o fundo dela é a fotografia com o véu, sempre o
    // mesmo, e está medida à mão.
    const maus = [];
    for (const rel of jsx) {
      if (rel === 'src/screens/Login.jsx') continue;
      soCodigo(fs.readFileSync(path.join(RAIZ, rel), 'utf8')).forEach((l, i) => {
        if (/color:\s*(?:[^,}]*\?\s*)?'rgba\(255,\s*255,\s*255,\s*0?\.\d+\)'/.test(l)) {
          maus.push(`${rel}:${i + 1} → ${l.trim().slice(0, 70)}`);
        }
      });
    }
    expect(maus).toEqual([]);
  });

  it('⚠ um «deep» como texto só vive sobre o seu tijolo ou como preenchimento', () => {
    // Fora dos tijolos e do `Confirm`, o texto de estado é `xTexto`. Quem
    // escrever `color: t.state.errDeep` num cartão volta ao vermelho a 3,00
    // no escuro — e entra aqui.
    const FICAM = {
      'src/Confirm.jsx': /./,
      'src/ui.jsx': /PastilhaVisibilidade|Adultos|Família|infoDeep|warnDeep/,
      // Os distintivos do registo e a pastilha «Repete-se»: texto sobre o
      // tijolo do estado, na mesma linha do `xBg`.
      'src/screens/Documentacao.jsx': /corrigido:|alterado:/,
      'src/sheets/ImportarGoogle.jsx': /Repete-se/,
      // A linha da próxima consulta na ficha vive num tijolo `infoBg`.
      'src/screens/FichaSaude.jsx': /infoDeep/,
      'src/screens/Equipamentos.jsx': /Garantia a Expirar/,
      'src/sheets/FichaEquipamento.jsx': /Garantia a Expirar|tom: t\.state\.warnDeep/,
      'src/screens/Perfil.jsx': /warnBg/,
      'src/screens/Inicio.jsx': /warnBg/,
      'src/screens/ModoCompras.jsx': /sem \? t\.state\.warnDeep/,
    };
    const maus = [];
    for (const rel of jsx) {
      const linhas = soCodigo(fs.readFileSync(path.join(RAIZ, rel), 'utf8'));
      linhas.forEach((l, i) => {
        if (!/t\.state\.(ok|err|warn|info)Deep/.test(l)) return;
        if (FICAM[rel] && FICAM[rel].test(l)) return;
        // Uma `Pill` escreve as props em linhas seguidas: o `fg` numa, o `bg`
        // na de baixo. Se o tijolo (`xBg`) está a duas linhas, o «deep» é dele.
        const volta = linhas.slice(Math.max(0, i - 2), i + 3).join(' ');
        if (/t\.state\.(ok|err|warn|info)Bg|STATE\.(ok|err|warn|info)Bg|tile(Warn|Info|Err)/.test(volta)) return;
        maus.push(`${rel}:${i + 1} → ${l.trim().slice(0, 70)}`);
      });
    }
    expect(maus).toEqual([]);
  });

  it('⚠ e a cor-BASE de um estado não é texto — é borda, ícone ou barra', () => {
    // «Administrador» a `state.info` sobre o cartão dava 3,16 (Gestão,
    // 08/09/2026). A base do estado passa 3:1 como objeto gráfico e não passa
    // 4,5 como texto pequeno no claro. Texto é `xTexto`; sobre o tijolo, `xDeep`.
    const maus = [];
    for (const rel of jsx) {
      const linhas = soCodigo(fs.readFileSync(path.join(RAIZ, rel), 'utf8'));
      linhas.forEach((l, i) => {
        // `t.state.x` e também `STATE.x` — a Saúde importa a paleta directamente,
        // e a pastilha «Ação» a `STATE.warn` sobre `STATE.warnBg` dava 1,85.
        // Em qualquer ramo de um ternário: `fg={acertado ? okDeep : t.state.info}`
        // escondia a base no ramo do «senão» — a pastilha «A Decorrer» dava 2,91.
        // Só o VALOR do `color:`/`fg=` — até à vírgula ou à chaveta — senão o
        // `border={t.state.warn}` da mesma linha, que é legítimo, entrava aqui.
        const m = l.match(/(?:\bcolor:|\bfg[:=])\s*\{?\s*([^},\n]*)/);
        const texto = m && /(?:t\.state|STATE)\.(ok|err|warn|info)\b(?![A-Za-z])/.test(m[1]);
        if (!texto) return;
        if (/backgroundColor|borderColor|borderLeftColor|<Icon|<Bar\b|\bBar\b/.test(l)) return;
        if (/<Icon\b/.test(linhas[i - 1] || '') && !/<Text/.test(linhas[i - 1] || '')) return;
        maus.push(`${rel}:${i + 1} → ${l.trim().slice(0, 70)}`);
      });
    }
    expect(maus).toEqual([]);
  });

  it('⚠ uma barra pintada com a cor de um dado tem sempre um valor por omissão', () => {
    // Os envelopes da casa vêm do servidor com `cor` vazia — só as sementes
    // tinham cor — e `<Bar color={e.color}>` pintava o preenchimento com
    // `null`: cinco barras transparentes com «546,60 € / 590,00 €» ao lado.
    // Uma cor lida de um dado leva `|| t.…` na mesma linha.
    const maus = [];
    for (const rel of jsx) {
      const linhas = soCodigo(fs.readFileSync(path.join(RAIZ, rel), 'utf8'));
      linhas.forEach((l, i) => {
        if (!/<Bar\b/.test(l)) return;
        const m = l.match(/color=\{([^}]*)\}/);
        if (!m) return;
        if (/\.(color|cor)\b/.test(m[1]) && !/\|\|/.test(m[1])) maus.push(`${rel}:${i + 1} → ${m[0]}`);
      });
    }
    expect(maus).toEqual([]);
  });

  it('e o `xTexto` existe para os quatro estados, nos dois aspetos', () => {
    for (const { t } of TEMAS) {
      for (const k of ['ok', 'err', 'warn', 'info']) expect(typeof t.state[`${k}Texto`]).toBe('string');
    }
  });
});
