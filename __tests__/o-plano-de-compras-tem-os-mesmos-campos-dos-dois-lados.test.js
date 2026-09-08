/**
 * Um campo que o ecrã lê tem de vir dos DOIS lados: da semente e do servidor.
 *
 * ⚠ Terceira ocorrência desta classe. As três:
 *
 *   `today` das tarefas    escrito à mão no `data.js`; as tarefas do servidor
 *                          não o tinham, e o «Tarefas de Hoje» do Início ficava
 *                          vazio para sempre numa casa ligada.
 *   `used` dos envelopes   as sementes traziam o gasto; o servidor traz o
 *                          `gastoPorEnvelope`, e a repartição não chegava.
 *   `time` do `shopPlan`   a semente tinha `time: '10:30'`; a `listas_compras`
 *                          não modela hora nenhuma, e o `puxarCasa` devolve o
 *                          plano INTEIRO com `{idServidor, store, who, day}`.
 *
 * O terceiro apareceu no ecrã como dois separadores com nada no meio:
 *
 *     «Quarta, 09/09 ·  · Pingo Doce do Restelo»
 *
 * porque a linha era `${dia} · ${plano.time || ''} · ${loja}` e o `|| ''`
 * transformava o campo ausente num vazio silencioso. Na casa de demonstração
 * lia-se bem; ligada ao servidor, não. As 1556 provas corriam com a semente.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 * O `shopPlan` é SUBSTITUÍDO por inteiro na leitura do servidor — não fundido.
 * Logo, todo o campo que algum ecrã lhe leia tem de estar nas duas formas: na
 * semente e no que o `puxarCasa` monta. Enumera-se dos dois lados, e a prova
 * não sabe nomear campo nenhum.
 *
 * ⚠ Isto cobre os objetos da loja que a leitura substitui por inteiro. Fundidos
 * (`status`, `envMove`) são outra conversa: aí um campo ausente é normal.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const soCodigo = (txt) => txt
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');

// ── Os campos que o servidor monta ───────────────────────────────────────────
//
// Lidos do literal do `sync.js`, e não escritos aqui. Um campo novo lá entra
// nesta prova sozinho; um campo retirado sai.
const camposDoServidor = () => {
  const sync = soCodigo(ler('src/sync.js'));
  const i = sync.indexOf('const shopPlan = aberta ? {');
  expect(i).toBeGreaterThan(0);
  const bloco = sync.slice(i, sync.indexOf('} : null;', i));
  return new Set([...bloco.matchAll(/^\s{4}(\w+):/gm)].map(m => m[1]));
};

// ── Os campos que a semente tem ──────────────────────────────────────────────
const camposDaSemente = () => {
  const { DEMO } = require('../src/store');
  return new Set(Object.keys(DEMO().shopPlan || {}));
};

// ── Os campos que os ecrãs leem ──────────────────────────────────────────────
//
// `plano.x`, `s.shopPlan.x`, `x.shopPlan.y`, e o destructuring.
const camposLidosNosEcras = () => {
  const fora = new Map();
  const percorrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) percorrer(p);
      else if (/\.jsx?$/.test(e.name)) {
        const rel = path.relative(RAIZ, p).split(path.sep).join('/');
        if (rel === 'src/sync.js' || rel === 'src/store.jsx') continue;
        const txt = soCodigo(ler(rel));
        const padroes = [
          /\bplano\.(\w+)/g,
          /\bs\.shopPlan\.(\w+)/g,
          /\(s\.shopPlan \|\| \{\}\)\.(\w+)/g,
          /\bx\.shopPlan\.(\w+)/g,
        ];
        for (const pat of padroes) {
          for (const m of txt.matchAll(pat)) {
            if (!fora.has(m[1])) fora.set(m[1], rel);
          }
        }
      }
    }
  };
  percorrer(path.join(RAIZ, 'src'));
  return fora;
};

const DO_SERVIDOR = camposDoServidor();
const DA_SEMENTE = camposDaSemente();
const LIDOS = camposLidosNosEcras();

describe('⚠ o `shopPlan` tem os mesmos campos na semente e no servidor', () => {
  it('a prova encontra os dois lados — senão não prova nada', () => {
    expect(DO_SERVIDOR.size).toBeGreaterThan(2);
    expect(DA_SEMENTE.size).toBeGreaterThan(1);
  });

  it('⚠ nenhum campo que um ecrã lê falta no que o servidor monta', () => {
    // O `puxarCasa` SUBSTITUI o plano por inteiro. Um campo que ele não traga
    // fica `undefined` numa casa ligada, para sempre.
    const faltam = [...LIDOS.entries()]
      .filter(([campo]) => !DO_SERVIDOR.has(campo))
      .map(([campo, onde]) => `${campo} (lido em ${onde})`);
    expect(faltam).toEqual([]);
  });

  it('e nenhum falta na semente — a demonstração não pode mostrar menos', () => {
    const faltam = [...LIDOS.entries()]
      .filter(([campo]) => !DA_SEMENTE.has(campo) && campo !== 'idServidor')
      .map(([campo, onde]) => `${campo} (lido em ${onde})`);
    expect(faltam).toEqual([]);
  });

  it('⚠ e a semente não tem campos a mais do que o servidor', () => {
    // Era exactamente este o defeito: `time` só na semente. Um campo a mais na
    // demonstração é uma app que se comporta de duas maneiras, e a que se vê a
    // testar é sempre a boa.
    //
    // O `idServidor` é a excepção com motivo: é o identificador da linha, e uma
    // casa sem servidor não tem nenhum.
    const aMais = [...DA_SEMENTE].filter(c => !DO_SERVIDOR.has(c));
    expect(aMais).toEqual([]);
  });

  it("⚠ e o `time` está nos DOIS — voltou com sítio no servidor", () => {
    // Esta prova exigia o contrário, e é a mesma regra vista do outro lado.
    //
    // Em 07/09/2026 a hora foi TIRADA porque só a semente a tinha: o
    // `planeada_para` descia sem ela e a linha lia-se «Quarta, 09/09 ·  ·
    // Pingo Doce». Em 08/09 voltou, agora escrita pelo `mudarPlanoDeCompras`
    // no mesmo campo `date` que sempre soube guardar o instante.
    //
    // O que a prova sempre defendeu não mudou: os dois lados têm os MESMOS
    // campos. Só mudou de que lado estava o buraco.
    expect(DA_SEMENTE.has('time')).toBe(true);
    expect(DO_SERVIDOR.has('time')).toBe(true);
  });
});

describe('e a linha do plano não deixa separadores vazios', () => {
  const React = require('react');
  const TestRenderer = require('react-test-renderer');
  const { SafeAreaProvider } = require('react-native-safe-area-context');
  const { StoreProvider, useStore } = require('../src/store');
  const { buildTheme } = require('../src/theme');
  const Compras = require('../src/screens/Compras').default;

  const texto = (n) => {
    if (n === null || n === undefined || n === false) return '';
    if (typeof n === 'string' || typeof n === 'number') return String(n);
    if (Array.isArray(n)) return n.map(texto).join('');
    return texto(n.children || (n.props && n.props.children) || null);
  };

  // Monta as Compras com o plano que se lhe der.
  const comPlano = (plano) => {
    let arvore = null;
    let api = null;
    const Sonda = () => {
      api = useStore();
      return React.createElement(Compras, {
        t: buildTheme(0, false), user: 'Rita', go: () => {},
        onModoCompras: () => {}, onClose: () => {},
      });
    };
    TestRenderer.act(() => {
      arvore = TestRenderer.create(
        React.createElement(SafeAreaProvider, {
          initialMetrics: { frame: { x: 0, y: 0, width: 402, height: 874 },
                            insets: { top: 47, left: 0, right: 0, bottom: 34 } },
        }, React.createElement(StoreProvider, null, React.createElement(Sonda))));
    });
    if (plano !== undefined) TestRenderer.act(() => { api.set({ shopPlan: plano }); });
    return texto(arvore.toJSON());
  };

  // ⚠ A propriedade: nunca dois separadores seguidos, nem um separador à solta
  // no fim de uma linha. É o que se vê quando um campo é `undefined`.
  const semSeparadorVazio = (t) => {
    expect(t).not.toMatch(/·\s*·/);
    expect(t).not.toContain('undefined');
    expect(t).not.toContain('NaN');
  };

  it('com o plano da demonstração', () => {
    semSeparadorVazio(comPlano(undefined));
  });

  it('⚠ com o plano tal como o servidor o devolve — sem `time`', () => {
    semSeparadorVazio(comPlano({ idServidor: 'abc', store: 1, who: 'Rita', day: 'd2026-09-09' }));
  });

  it('sem loja escolhida', () => {
    semSeparadorVazio(comPlano({ idServidor: 'abc', store: -1, who: 'Rita', day: 'd2026-09-09' }));
  });

  it('sem quem vai', () => {
    semSeparadorVazio(comPlano({ idServidor: 'abc', store: 0, who: null, day: 'd2026-09-09' }));
  });

  it('sem dia', () => {
    semSeparadorVazio(comPlano({ idServidor: 'abc', store: 0, who: 'Rita', day: null }));
  });

  it('e sem plano nenhum — que é o estado entre duas idas', () => {
    semSeparadorVazio(comPlano(null));
  });
});

describe('⚠ o «Alterar» faz alguma coisa', () => {
  const compras = soCodigo(ler('src/screens/Compras.jsx'));

  it('tem `onPress` — era um botão que não fazia nada', () => {
    // ⚠ O rótulo mudou de «Alterar quem vai às compras» para «Alterar a ida às
    // compras» em 08/09/2026: o botão deixou de trocar de pessoa e passou a
    // abrir o ecrã onde as três coisas se mudam. A propriedade que esta prova
    // defende é a mesma — tem destino, e tem alvo nas duas medidas.
    const i = compras.indexOf('Alterar a ida às compras');
    expect(i).toBeGreaterThan(0);
    // O bloco do `Pressable` à volta do rótulo.
    const inicio = compras.lastIndexOf('<Pressable', i);
    const bloco = compras.slice(inicio, compras.indexOf('</Pressable>', i));
    expect(bloco).toMatch(/onPress=/);
  });

  it('e declara as DUAS medidas de 44 — media 42 de largura', () => {
    const i = compras.indexOf('Alterar a ida às compras');
    const inicio = compras.lastIndexOf('<Pressable', i);
    const bloco = compras.slice(inicio, compras.indexOf('</Pressable>', i));
    expect(bloco).toMatch(/minHeight: 44/);
    expect(bloco).toMatch(/minWidth: 44/);
  });

  it('e os adultos vêm do quadro da casa, não de uma lista escrita à mão', () => {
    // ⚠ Este pedaço saiu do Compras com o botão: quem escolhe o adulto é agora
    // o ecrã «Como fazemos compras», e é lá que os adultos vêm do quadro da
    // casa — pelo `adultos` da loja, que é a mesma leitura num sítio só.
    const ecra = ler('src/screens/ComoFazemosCompras.jsx');
    expect(ecra).toMatch(/membros=\{adultos\}/);
  });
});
