/**
 * UM OBJETO GRÁFICO VÊ-SE NOS DOZE TEMAS
 * ======================================
 *
 * O irmão do `texto-pequeno-le-se-nos-doze-temas`, para o que NÃO é texto:
 * ícones, anéis de escolhido, barras de progresso, faixas de estado, bordas de
 * caixa. Texto pequeno pede 4,5:1; um objeto gráfico pede 3:1 — e esta app
 * andou a pintá-los com tokens que não lá chegam.
 *
 * ── O que a revisão de 16/09/2026 apanhou, medido ──────────────────────────
 *
 *   t.state.ok     2,11 contra a página   ·  o visto da confirmação, as barras
 *   t.state.warn   1,77                   ·  o triângulo do envelope no limite,
 *                                            a borda da urgência «Normal»
 *   t.accent       2,12 contra o cartão   ·  O ANEL QUE MARCA «ESCOLHIDO», em
 *                                            toda a app, no Cinza escuro
 *   t.border       1,32                   ·  a borda da urgência «Sem pressa»
 *   t.chrome       1,01                   ·  o ícone «alternar entre as
 *                                            crianças» — invisível
 *
 * O `t.accent` é o mais grave dos cinco: é o sinal com que a app inteira diz
 * «este», e é justamente o que se apaga quando o esquema é o Cinza e o aspeto o
 * escuro. O tema já tem a resposta desde 09/09/2026 — o `titulo`, que é o
 * próprio acento clareado até aos 3:1 contra o cartão escuro, e o CLAUDE.md já
 * escrevia a regra: «texto em cor de ação leva actFg; ícone em cor de ação leva
 * titulo». Estava escrita e não estava guardada.
 *
 * ── A propriedade ──────────────────────────────────────────────────────────
 *
 *   1. Calcula-se, nos doze temas, o contraste de cada token contra as três
 *      superfícies onde os objetos assentam (página, cartão, superfície).
 *      Os que não chegam aos 3:1 em alguma delas entram numa lista de PROIBIDOS.
 *   2. Nenhum ficheiro da app pinta um ícone com um token proibido.
 *   3. Nenhum ficheiro pinta a barra de uma `<Bar>` com um token proibido.
 *
 * ⚠ A lista de proibidos é CALCULADA, não escrita. Um token que mude de valor
 * no tema entra ou sai dela sozinho — e um token novo que nasça fraco é
 * apanhado sem ninguém se lembrar de o acrescentar aqui.
 */
const fs = require('fs');
const path = require('path');
const { buildTheme, SCHEMES } = require('../src/theme');

const RAIZ = path.join(__dirname, '..');

const luminancia = (hex) => {
  const c = String(hex).replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(c)) return null;
  const v = [0, 2, 4].map(i => parseInt(c.substr(i, 2), 16) / 255)
    .map(x => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};
const contraste = (a, b) => {
  const la = luminancia(a), lb = luminancia(b);
  if (la === null || lb === null) return null;
  const [x, y] = la > lb ? [la, lb] : [lb, la];
  return (x + 0.05) / (y + 0.05);
};

// Os tokens que alguma vez se usam para pintar um objeto gráfico.
const CANDIDATOS = [
  'accent', 'titulo', 'slate', 'text2', 'text3', 'border', 'divider', 'chrome',
  'state.ok', 'state.warn', 'state.err', 'state.info',
  'state.okTexto', 'state.warnTexto', 'state.errTexto', 'state.infoTexto',
  'state.okBorder',
];
const ler = (t, nome) => (nome.startsWith('state.') ? t.state[nome.slice(6)] : t[nome]);

// O pior contraste de cada token contra as superfícies onde um objeto assenta.
const pior = {};
for (const nome of CANDIDATOS) {
  let p = Infinity;
  for (let i = 0; i < SCHEMES.length; i++) {
    for (const escuro of [false, true]) {
      const t = buildTheme(i, escuro);
      for (const fundo of [t.page, t.card, t.surface]) {
        const v = contraste(ler(t, nome), fundo);
        if (v !== null && v < p) p = v;
      }
    }
  }
  pior[nome] = p;
}
const PROIBIDOS = CANDIDATOS.filter(n => pior[n] < 3);

const ficheiros = (() => {
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
  return fora.map(p => path.relative(RAIZ, p).split(path.sep).join('/'));
})();

// ⚠ Os comentários apagam-se SEM PERDER LINHAS. O `semComentarios` das outras
// provas troca um comentário de bloco por nada, e um bloco de seis linhas
// encolhe o ficheiro em cinco: o número da linha que esta prova aponta deixa de
// corresponder ao ficheiro, e quem a for corrigir abre a linha errada. Aqui um
// bloco vira o mesmo número de linhas vazias.
const semComentarios = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, (bloco) => '\n'.repeat((bloco.match(/\n/g) || []).length))
  .replace(/^\s*\/\/[^\n]*/gm, '');

// ── As excepções, com o motivo escrito ──────────────────────────────────────
//
// Um objeto que assenta no TIJOLO do seu próprio estado (`okBg`, `warnBg`) ou
// sobre o acento cheio não se mede contra a página — mede-se contra o que tem
// debaixo, e aí a conta é outra. Quem acrescentar uma entrada aqui escreve
// porquê, como em todo o lado nesta casa.
const COM_MOTIVO = {
  // (nenhuma, para já — e é assim que se quer)
};

describe('⚠ um objeto gráfico vê-se nos doze temas', () => {
  it('a lista de proibidos é calculada, e não está vazia — senão não prova nada', () => {
    expect(PROIBIDOS.length).toBeGreaterThan(0);
    // Os cinco que a revisão de 16/09/2026 apanhou têm de continuar proibidos:
    // se algum sair desta lista é porque o tema mudou, e vale a pena saber.
    for (const n of ['state.ok', 'state.warn', 'accent', 'border', 'chrome']) {
      expect(PROIBIDOS).toContain(n);
    }
    // E os que os substituíram têm de continuar a chegar lá.
    for (const n of ['titulo', 'text3', 'state.okTexto', 'state.warnTexto']) {
      expect(pior[n]).toBeGreaterThanOrEqual(3);
    }
  });

  it('nenhum ícone é pintado com um token que não chega aos 3:1', () => {
    const maus = [];
    for (const rel of ficheiros) {
      const linhas = semComentarios(fs.readFileSync(path.join(RAIZ, rel), 'utf8')).split('\n');
      linhas.forEach((linha, i) => {
        if (!/<Icon\b/.test(linha) && !/color=\{/.test(linha)) return;
        if (!/<Icon\b/.test(linha)) return;
        const cor = (linha.match(/color=\{([^}]*)\}/) || [])[1];
        if (!cor) return;
        for (const n of PROIBIDOS) {
          // `t.accent` e não `t.accentQualquerCoisa`: a fronteira de palavra
          // evita apanhar um token cujo nome comece pelo mesmo.
          const re = new RegExp(`t\\.${n.replace('.', '\\.')}(?![A-Za-z])`);
          if (re.test(cor)) {
            const chave = `${rel}:${i + 1}`;
            if (COM_MOTIVO[chave]) return;
            maus.push(`${chave} → ícone com t.${n} (${pior[n].toFixed(2)}:1) — ${linha.trim().slice(0, 70)}`);
          }
        }
      });
    }
    expect(maus).toEqual([]);
  });

  it('nenhuma barra de progresso é pintada com um token que não chega aos 3:1', () => {
    const maus = [];
    for (const rel of ficheiros) {
      const linhas = semComentarios(fs.readFileSync(path.join(RAIZ, rel), 'utf8')).split('\n');
      linhas.forEach((linha, i) => {
        if (!/<Bar\b/.test(linha)) return;
        const cor = (linha.match(/color=\{([^}]*)\}/) || [])[1];
        if (!cor) return;
        for (const n of PROIBIDOS) {
          const re = new RegExp(`t\\.${n.replace('.', '\\.')}(?![A-Za-z])`);
          if (re.test(cor)) {
            const chave = `${rel}:${i + 1}`;
            if (COM_MOTIVO[chave]) return;
            maus.push(`${chave} → barra com t.${n} (${pior[n].toFixed(2)}:1) — ${linha.trim().slice(0, 70)}`);
          }
        }
      });
    }
    expect(maus).toEqual([]);
  });

  it('⚠ e o ANEL do escolhido — o sinal com que a app diz «este» — usa o titulo', () => {
    // O anel de «escolhido» tem quatro casas: a bola de uma pessoa, a pastilha
    // de texto do filtro, a bola do esquema de cor e a bola do aspeto. Levavam
    // todas o `t.accent` cru, que no Cinza escuro mede 2,12 contra o cartão.
    const anelDe = (rel) => semComentarios(fs.readFileSync(path.join(RAIZ, rel), 'utf8'));
    expect(anelDe('src/FiltroDeMembros.jsx')).toMatch(/const cor = t\.titulo;/);
    expect(anelDe('src/FiltroDeMembros.jsx')).toMatch(/borderColor: on \? t\.titulo/);
    expect(anelDe('src/EsquemaDeCor.jsx')).toMatch(/borderColor: t\.titulo/);
    expect(anelDe('src/screens/Perfil.jsx')).toMatch(/borderColor: on \? t\.titulo/);
    expect(anelDe('src/sheets/EscolherAvatar.jsx')).toMatch(/borderColor: t\.titulo/);
    // E nenhum deles voltou ao acento cru.
    for (const rel of ['src/FiltroDeMembros.jsx', 'src/EsquemaDeCor.jsx', 'src/screens/Perfil.jsx']) {
      expect(anelDe(rel)).not.toMatch(/borderColor: (on|escolhida) \? t\.accent/);
    }
  });
});
