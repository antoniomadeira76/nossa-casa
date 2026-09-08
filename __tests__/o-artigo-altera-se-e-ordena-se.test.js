/**
 * Um artigo altera-se, e a ordem dele no corredor é a que a mão dá.
 *
 * ── O que faltava ────────────────────────────────────────────────────────────
 *
 * Havia `criarArtigo` e `removerArtigo`, e mais nada. Consequências medidas:
 *
 *   mudar o nome      «Leite» para «Leite meio-gordo · 6 un.» era APAGAR e
 *                     voltar a escrever — e com isso perdia-se o estado desta
 *                     ida (apanhado, sem stock) e o lugar no corredor
 *   mudar o corredor  não se mudava de sítio nenhum: o corredor escolhia-se na
 *                     criação e ficava
 *   a ordem           era a ordem de criação, e o Modo Compras leva a pessoa
 *                     corredor a corredor por ela — a lista era o percurso da
 *                     loja e ninguém a podia arrumar
 *
 * ── As duas armadilhas que isto podia repetir ────────────────────────────────
 *
 * ⚠ Uma SEMENTE do `data.js` não se altera no sítio: é uma constante do módulo.
 * As alterações vivem num mapa `itemEdits`, como o `taskEdits` das tarefas e o
 * `equipEdits` dos equipamentos.
 *
 * ⚠ E os postos contam de UM, dos dois lados. Um `number` do PocketBase não é
 * anulável e nasce a zero em todas as linhas que já existem: com a contagem a
 * começar em zero, a lista inteira lia-se empatada em primeiro e saía por ordem
 * qualquer. Já aconteceu às tarefas.
 */
const fs = require('fs');
const path = require('path');
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { SafeAreaProvider } = require('react-native-safe-area-context');
const { StoreProvider, useStore } = require('../src/store');
const { buildTheme } = require('../src/theme');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const soCodigo = (txt) => txt
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .split('\n').map(l => (/^\s*(\/\/|\*)/.test(l) ? '' : l)).join('\n');

// ── A loja, sem ecrã ─────────────────────────────────────────────────────────
const abrir = () => {
  let api = null;
  const Sonda = () => { api = useStore(); return null; };
  TestRenderer.act(() => {
    TestRenderer.create(React.createElement(StoreProvider, null, React.createElement(Sonda)));
  });
  return {
    loja: () => api,
    mexer: (f) => { let r; TestRenderer.act(() => { r = f(api); }); return r; },
  };
};

describe('⚠ alterar um artigo', () => {
  it('muda o rótulo de uma SEMENTE — que é o caso que não se podia escrever', () => {
    const d = abrir();
    const antes = d.loja().allItems()[0];
    d.mexer(a => a.alterarArtigo(antes.id, { label: 'Leite meio-gordo · 6 un.' }));
    const depois = d.loja().allItems().find(i => i.id === antes.id);
    expect(depois.label).toBe('Leite meio-gordo · 6 un.');
    // E o resto do artigo fica: alterar um campo não é reescrever a linha.
    expect(depois.s).toBe(antes.s);
    expect(depois.est).toBe(antes.est);
  });

  it('muda o corredor, a estimativa e o habitual', () => {
    const d = abrir();
    const artigo = d.loja().allItems()[0];
    const outro = d.loja().seccoes.find(s => s !== artigo.s);
    d.mexer(a => a.alterarArtigo(artigo.id, { s: outro, est: 4.5, staple: true }));
    const depois = d.loja().allItems().find(i => i.id === artigo.id);
    expect(depois.s).toBe(outro);
    expect(depois.est).toBe(4.5);
    expect(depois.staple).toBe(true);
  });

  it('⚠ e o estado desta ida NÃO se perde — era o que apagar e recriar custava', () => {
    const d = abrir();
    const artigo = d.loja().allItems()[0];
    d.mexer(a => a.marcarArtigo(artigo.id, 'done'));
    d.mexer(a => a.alterarArtigo(artigo.id, { label: 'Outro nome' }));
    expect(d.loja().s.status[artigo.id]).toBe('done');
  });

  it('recusa um nome vazio, e diz porquê', () => {
    const d = abrir();
    const artigo = d.loja().allItems()[0];
    const msg = d.mexer(a => a.alterarArtigo(artigo.id, { label: '   ' }));
    expect(typeof msg).toBe('string');
    expect(d.loja().allItems().find(i => i.id === artigo.id).label).toBe(artigo.label);
  });

  it('⚠ recusa um corredor que esta casa não tem', () => {
    // Um artigo num corredor que não existe desaparecia de todas as abas menos
    // «Todos», e ninguém saberia porquê — é o mesmo defeito que o
    // `apagarSeccao` teve de resolver.
    const d = abrir();
    const artigo = d.loja().allItems()[0];
    const msg = d.mexer(a => a.alterarArtigo(artigo.id, { s: 'Charcutaria' }));
    expect(typeof msg).toBe('string');
    expect(d.loja().allItems().find(i => i.id === artigo.id).s).toBe(artigo.s);
  });

  it('e um artigo que não existe não rebenta', () => {
    const d = abrir();
    expect(typeof d.mexer(a => a.alterarArtigo('nao-existe', { label: 'X' }))).toBe('string');
  });
});

describe('⚠ a ordem dentro do corredor', () => {
  const doCorredor = (api) => {
    const corredor = api.seccoes.find(s => api.allItems().filter(i => i.s === s).length > 2);
    return { corredor, ids: api.allItems().filter(i => i.s === corredor).map(i => i.id) };
  };

  it('as sementes dão um corredor com três artigos — senão isto não prova nada', () => {
    const { ids } = doCorredor(abrir().loja());
    expect(ids.length).toBeGreaterThan(2);
  });

  it('reordenar muda a ordem que os ecrãs leem', () => {
    const d = abrir();
    const { corredor, ids } = doCorredor(d.loja());
    const invertida = [...ids].reverse();
    expect(d.mexer(a => a.reordenarArtigos(invertida))).toBe(null);
    expect(d.loja().allItems().filter(i => i.s === corredor).map(i => i.id)).toEqual(invertida);
  });

  it('⚠ e os postos contam de UM — zero é «sem posto» no servidor', () => {
    const d = abrir();
    const { ids } = doCorredor(d.loja());
    d.mexer(a => a.reordenarArtigos([...ids].reverse()));
    expect(Math.min(...Object.values(d.loja().s.itemOrder))).toBe(1);
  });

  it('⚠ recusa uma ordem que atravesse corredores', () => {
    // O corredor manda nos grupos, como a urgência manda nos das tarefas.
    // Mudar de corredor é a folha de gestão, com o nome do corredor à vista.
    const d = abrir();
    const itens = d.loja().allItems();
    const a1 = itens[0];
    const a2 = itens.find(i => i.s !== a1.s);
    const msg = d.mexer(a => a.reordenarArtigos([a2.id, a1.id]));
    expect(typeof msg).toBe('string');
    expect(d.loja().s.itemOrder).toEqual({});
  });

  it('⚠ arrastar PARTE do corredor não desarruma o resto', () => {
    // A vista pode mostrar só parte. Escrever postos só ao subconjunto deixava
    // o resto sem posto, e esse resto saltava para o fim.
    const d = abrir();
    const { corredor, ids } = doCorredor(d.loja());
    // Troca os dois primeiros e deixa o terceiro de fora da ordem.
    d.mexer(a => a.reordenarArtigos([ids[1], ids[0]]));
    const agora = d.loja().allItems().filter(i => i.s === corredor).map(i => i.id);
    expect(agora).toEqual([ids[1], ids[0], ...ids.slice(2)]);
  });

  it('⚠ mudar de corredor põe o artigo no FIM do corredor novo', () => {
    // ⚠ Esta prova apanhou uma afirmação minha que era falsa. O código LIMPAVA
    // o posto e o comentário dizia «sem posto, entra no fim»: não entra. Sem
    // posto o artigo ordena-se pela ordem de CRIAÇÃO, e um artigo antigo cai a
    // meio do corredor novo tal como se tivesse trazido o número — medido, a
    // banana passou para os «Frescos» e entrou à frente da manteiga.
    //
    // O que resolve é escrever a ordem do corredor de destino INTEIRO, com o
    // recém-chegado no fim.
    const d = abrir();
    const { corredor, ids } = doCorredor(d.loja());
    d.mexer(a => a.reordenarArtigos([...ids].reverse()));
    const primeiro = d.loja().allItems().filter(i => i.s === corredor)[0];
    const destino = d.loja().seccoes.find(s => s !== corredor);
    const antesNoDestino = d.loja().allItems().filter(i => i.s === destino).map(i => i.id);

    d.mexer(a => a.alterarArtigo(primeiro.id, { s: destino }));
    const noDestino = d.loja().allItems().filter(i => i.s === destino).map(i => i.id);
    expect(noDestino).toEqual([...antesNoDestino, primeiro.id]);
  });

  it('uma ordem com menos de dois não faz nada, e não é erro', () => {
    const d = abrir();
    const um = d.loja().allItems()[0].id;
    expect(d.mexer(a => a.reordenarArtigos([um]))).toBe(null);
    expect(d.mexer(a => a.reordenarArtigos([]))).toBe(null);
    expect(d.mexer(a => a.reordenarArtigos(null))).toBe(null);
    expect(d.loja().s.itemOrder).toEqual({});
  });

  it('⚠ e recusa o mesmo artigo duas vezes', () => {
    const d = abrir();
    const { ids } = doCorredor(d.loja());
    expect(typeof d.mexer(a => a.reordenarArtigos([ids[0], ids[0]]))).toBe('string');
  });

  it('sem posto, a ordem é a de criação — e é ESTÁVEL', () => {
    // Dois sem posto EMPATAM. Um comparador que devolva NaN deixa a ordenação
    // por conta do motor, e a lista sai numa ordem qualquer.
    const d = abrir();
    const uma = d.loja().allItems().map(i => i.id);
    const outra = d.loja().allItems().map(i => i.id);
    expect(uma).toEqual(outra);
  });
});

describe('⚠ a linha da lista: dois alvos, e um deles abre a gestão', () => {
  const Compras = require('../src/screens/Compras').default;

  const montar = () => {
    let arvore = null;
    let api = null;
    const Sonda = () => {
      api = useStore();
      return React.createElement(Compras, {
        t: buildTheme(0, false), user: 'Rita', go: () => {},
        onModoCompras: () => {}, onIda: () => {}, onClose: () => {},
      });
    };
    TestRenderer.act(() => {
      arvore = TestRenderer.create(
        React.createElement(SafeAreaProvider, {
          initialMetrics: { frame: { x: 0, y: 0, width: 402, height: 874 },
                            insets: { top: 47, left: 0, right: 0, bottom: 34 } },
        }, React.createElement(StoreProvider, null, React.createElement(Sonda))));
    });
    const alvos = () => arvore.root.findAll(x => x.props
      && typeof x.props.onPress === 'function' && x.props.accessibilityLabel);
    return {
      loja: () => api,
      alvos,
      rotulos: () => alvos().map(a => String(a.props.accessibilityLabel)),
      tocar: (rotulo) => {
        const a = alvos().find(x => String(x.props.accessibilityLabel) === rotulo);
        if (!a) throw new Error(`sem alvo «${rotulo}»`);
        TestRenderer.act(() => { a.props.onPress(); });
      },
      texto: () => {
        const t = (n) => {
          if (n === null || n === undefined || n === false) return '';
          if (typeof n === 'string' || typeof n === 'number') return String(n);
          if (Array.isArray(n)) return n.map(t).join(' ');
          return t(n.children || (n.props && n.props.children) || null);
        };
        return t(arvore.toJSON());
      },
    };
  };

  it('⚠ a linha tem o artigo e o lápis, e o caixote saiu dela', () => {
    // Erro #6 do CLAUDE.md: uma linha, um destino. Com o lápis a chegar a
    // linha ficava com TRÊS alvos — marcar, gerir e apagar — e obrigava a
    // adivinhar onde se tinha tocado. O apagar mudou-se para dentro da folha,
    // que é onde as Tarefas o têm.
    const d = montar();
    const artigo = d.loja().allItems()[0];
    expect(d.rotulos()).toContain(artigo.label);
    expect(d.rotulos()).toContain(`Gerir ${artigo.label}`);
    expect(d.rotulos()).not.toContain(`Apagar ${artigo.label}`);
  });

  it('o lápis abre a folha, com o corredor à vista', () => {
    const d = montar();
    const artigo = d.loja().allItems()[0];
    d.tocar(`Gerir ${artigo.label}`);
    const t = d.texto();
    expect(t).toContain('Guardar alterações');
    expect(t).toContain('Corredor');
    expect(t).toContain(artigo.s);
  });

  it('⚠ e o apagar vive lá dentro', () => {
    const d = montar();
    const artigo = d.loja().allItems()[0];
    d.tocar(`Gerir ${artigo.label}`);
    expect(d.rotulos()).toContain(`Apagar ${artigo.label}`);
    d.tocar(`Apagar ${artigo.label}`);
    // A pergunta, e não o apagar directo.
    expect(d.texto()).toContain(`Apagar «${artigo.label}»?`);
  });

  it('⚠ o botão de guardar diz a consequência, e não se toca sem nada mudar', () => {
    const d = montar();
    const artigo = d.loja().allItems()[0];
    d.tocar(`Gerir ${artigo.label}`);
    expect(d.texto()).toContain('Nada mudou');
  });

  it('todos os alvos da folha declaram para que servem', () => {
    const d = montar();
    d.tocar(`Gerir ${d.loja().allItems()[0].label}`);
    for (const a of d.alvos()) {
      expect(String(a.props.accessibilityLabel).length).toBeGreaterThan(2);
    }
  });

  it('⚠ e a linha diz que se mantém premida para mudar a ordem', () => {
    // Sem alça, o gesto é invisível: a dica é a única coisa que o anuncia a
    // quem usa leitor de ecrã.
    const d = montar();
    const artigo = d.loja().allItems()[0];
    const linha = d.alvos().find(x => String(x.props.accessibilityLabel) === artigo.label);
    expect(String(linha.props.accessibilityHint)).toMatch(/premid/i);
    expect(typeof linha.props.onLongPress).toBe('function');
  });
});

describe('a folha desenha-se sozinha, com o artigo que se lhe der', () => {
  // ⚠ Montada DIRECTAMENTE, e não só pelo caminho das Compras. É o que a prova
  // `ecras-que-nunca-eram-desenhados` exige de cada ecrã e folha, e apanha o
  // que o caminho de cima não apanha: um artigo com campos em falta.
  const GerirArtigo = require('../src/sheets/GerirArtigo').default;

  const montar = (artigo) => {
    let arvore = null;
    TestRenderer.act(() => {
      arvore = TestRenderer.create(
        React.createElement(SafeAreaProvider, {
          initialMetrics: { frame: { x: 0, y: 0, width: 402, height: 874 },
                            insets: { top: 47, left: 0, right: 0, bottom: 34 } },
        }, React.createElement(StoreProvider, null,
          React.createElement(GerirArtigo, {
            t: buildTheme(0, false), artigo, onApagar: () => {}, onClose: () => {},
          }))));
    });
    const t = (n) => {
      if (n === null || n === undefined || n === false) return '';
      if (typeof n === 'string' || typeof n === 'number') return String(n);
      if (Array.isArray(n)) return n.map(t).join(' ');
      return t(n.children || (n.props && n.props.children) || null);
    };
    return t(arvore.toJSON());
  };

  it('com um artigo inteiro', () => {
    // ⚠ O rótulo vive no `value` de um `TextInput` e não nos filhos, por isso
    // não sai deste texto — o que se confere é o que está desenhado à volta.
    const t = montar({ id: 'x', label: 'Leite', s: 'Frescos', est: 1.2, staple: true });
    expect(t).toContain('Artigo');
    expect(t).toContain('Corredor');
    expect(t).toMatch(/Estimativa de agora:\s+1,20/);
    expect(t).toContain('Volta à lista todas as semanas');
    expect(t).not.toContain('undefined');
    expect(t).not.toContain('NaN');
  });

  it('⚠ e com um artigo sem estimativa nem corredor — não mostra «NaN»', () => {
    const t = montar({ id: 'x', label: 'Leite' });
    expect(t).not.toContain('undefined');
    expect(t).not.toContain('NaN');
    expect(t).toContain('Nada mudou');
    // A estimativa em falta lê-se como zero, e não como um espaço em branco.
    expect(t).toMatch(/Estimativa de agora:\s+0,00/);
  });
});

describe('⚠ os campos de criar e de alterar são os MESMOS', () => {
  // A propriedade: um artigo que se cria com quatro coisas e se altera com duas
  // obriga a apagar para mudar a terceira — que é o defeito que a folha de
  // alterar vem resolver. Enumera-se das duas folhas, e a prova não sabe nomear
  // campo nenhum.
  const camposDe = (rel) => {
    const txt = soCodigo(ler(rel));
    const i = txt.indexOf('useState({');
    const bloco = txt.slice(i, txt.indexOf('});', i));
    return new Set([...bloco.matchAll(/^\s{4}(\w+):/gm)].map(m => m[1]));
  };

  const NOVO = camposDe('src/sheets/NovoArtigo.jsx');
  const GERIR = camposDe('src/sheets/GerirArtigo.jsx');

  it('a prova lê as duas folhas — senão não prova nada', () => {
    expect(NOVO.size).toBeGreaterThan(3);
    expect(GERIR.size).toBeGreaterThan(3);
  });

  it('⚠ nenhum campo da folha de criar falta na de alterar', () => {
    // ⚠ O `section` da folha de criar chama-se `s` na de alterar, e é assim de
    // propósito: `s` é o nome que o artigo TEM na loja, e a folha de alterar
    // parte do artigo. A tradução faz-se no `criarArtigo`.
    const mesmoNome = { section: 's' };
    const faltam = [...NOVO]
      .map(c => mesmoNome[c] || c)
      .filter(c => !GERIR.has(c));
    expect(faltam).toEqual([]);
  });
});

describe('⚠ e a alteração chega ao servidor com os nomes dele', () => {
  const sync = soCodigo(ler('src/sync.js'));
  const loja = soCodigo(ler('src/store.jsx'));

  it('o `sync` tem um `alterarArtigo`, e traduz campo a campo', () => {
    expect(sync).toMatch(/export async function alterarArtigo/);
    for (const campo of ['rotulo', 'corredor', 'habitual', 'estimativa', 'posto']) {
      expect(sync).toMatch(new RegExp(`\\b${campo}:`));
    }
  });

  it('⚠ cada campo entra só se quem chama o mandou', () => {
    // Um `campos.rotulo` ausente não pode virar `rotulo: ''` e apagar o nome
    // do artigo. É a mesma forma do `alterarEquipamento` e do `alterarEvento`.
    const i = sync.indexOf('export async function alterarArtigo');
    const bloco = sync.slice(i, sync.indexOf('\n}', i));
    const atribuicoes = [...bloco.matchAll(/^\s{4}\.\.\.\(campos\.(\w+) !== undefined/gm)];
    expect(atribuicoes.length).toBeGreaterThan(4);
  });

  it('⚠ o `mudarCorredor` passa pelo `alterarArtigo` — um dono do campo', () => {
    // Dois sítios a escrever o mesmo campo é a classe de defeito que pôs o
    // «sem stock» com duas grafias e a perder marcações nos dois sentidos.
    const i = sync.indexOf('export async function mudarCorredor');
    const bloco = sync.slice(i, sync.indexOf('\n}', i));
    expect(bloco).toMatch(/alterarArtigo\(/);
    expect(bloco).not.toMatch(/collection\('artigos'\)/);
  });

  it('e a ordem sobe pelo `reordenarArtigos`, com o posto a contar de um', () => {
    expect(sync).toMatch(/export async function reordenarArtigos/);
    const i = sync.indexOf('export async function reordenarArtigos');
    expect(sync.slice(i, sync.indexOf('\n}', i))).toMatch(/posto: i \+ 1/);
  });

  it('⚠ e o `posto` ZERO não entra no mapa da loja na leitura', () => {
    // Um campo novo nasce a zero em todas as linhas que já existem. Sem este
    // filtro, a lista inteira ficava empatada em primeiro.
    const i = sync.indexOf('const itemOrder = {}');
    expect(i).toBeGreaterThan(0);
    const bloco = sync.slice(i, sync.indexOf('const status = {}', i));
    expect(bloco).toMatch(/posto > 0/);
  });

  it('⚠ e o `itemOrder` do servidor SUBSTITUI o local, como o `taskOrder`', () => {
    // Os postos são relativos: fundir os do servidor com os deste telefone dá
    // dois números iguais no mesmo corredor e uma lista que salta a cada
    // leitura.
    expect(loja).toMatch(/itemOrder: casa\.itemOrder \|\| \{\}/);
  });
});
