/**
 * A fotografia de um anexo — o ponto 8 da revalidação da Saúde.
 *
 * ── A decisão ────────────────────────────────────────────────────────────────
 *
 * «Sobe tudo» (03/09/2026). A fotografia sobe para o servidor da casa, pelas
 * mesmas condições do resto da saúde: o `eEnderecoDeCasa` decide, e nunca sai
 * para um servidor fora de casa.
 *
 * ── A restrição técnica que moldou o desenho ──────────────────────────────────
 *
 * ⚠ Um anexo NÃO pode passar pela fila de escritas. A fila serializa em JSON
 * dentro do armazenamento local, e um ficheiro não é JSON: enfiá-lo lá gravava
 * `{}` e a escrita subia sem o anexo, em silêncio.
 *
 * Daí a forma: a fotografia fica no dispositivo PRIMEIRO, com `porSubir: true`,
 * e só depois se tenta o carregamento direto. Guardar antes de tentar é o que
 * impede a fotografia de se perder por não haver rede; o `porSubir` é o que
 * impede a app de fingir que ela já está no servidor.
 *
 * ⚠ E um anexo é uma RELAÇÃO para o episódio. Sem o `id` que o servidor deu à
 * consulta não há relação nenhuma, e o anexo ficaria órfão do outro lado — que
 * é o que o TAREFAS.md proíbe pelo nome. Foi por isso que o `episodioDeSaude`
 * passou a tentar direto antes de cair na fila: a fila devolve quantas subiram,
 * não o registo, portanto uma consulta que fosse só pela fila nunca aprendia o
 * seu `id`.
 *
 * O carregamento a sério — o ficheiro a chegar ao servidor — prova-se em
 * `db/pocketbase/provar-anexo-sobe.mjs`, contra um PocketBase a correr. Aqui
 * prova-se o que é lógica.
 */
const fs = require('fs');
const path = require('path');
const React = require('react');
const TestRenderer = require('react-test-renderer');
const { StoreProvider, useStore, DEMO } = require('../src/store');

const ler = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const semComentarios = (f) => ler(f)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^[ \t]*\/\/.*$/gm, '');

const comLoja = (estado) => {
  let api = null;
  const Sonda = () => { api = useStore(); return null; };
  TestRenderer.act(() => {
    TestRenderer.create(React.createElement(StoreProvider, null,
      React.createElement(Sonda)));
  });
  TestRenderer.act(() => { api.set(() => estado); });
  return () => api;
};

const casa = () => ({
  ...DEMO(),
  clearedSeeds: true,
  health: [{ id: 'hlth-1', member: 'Léo', day: 'd2026-09-20', specialty: 'Dentista', time: '10:00' }],
  healthDocs: [], healthArchived: {}, healthNotes: {}, healthRecipes: {}, healthDecisions: {},
});

describe('⚠ a fotografia fica no dispositivo antes de subir', () => {
  it('um documento com fotografia nasce «por subir»', () => {
    const loja = comLoja(casa());
    TestRenderer.act(() => {
      loja().addHealthDoc('hlth-1', 'Léo', { kind: 'Exame', title: 'Radiografia', foto: 'file:///tmp/x.jpg' });
    });
    const d = loja().s.healthDocs[0];
    expect(d.foto).toBe('file:///tmp/x.jpg');
    // Sem servidor configurado nos testes, nada sobe — e o documento di-lo.
    expect(d.porSubir).toBe(true);
  });

  it('e um sem fotografia não tem `porSubir` nenhum — não há nada para subir', () => {
    const loja = comLoja(casa());
    TestRenderer.act(() => {
      loja().addHealthDoc('hlth-1', 'Léo', { kind: 'Exame', title: 'Sem foto' });
    });
    const d = loja().s.healthDocs[0];
    expect(d.foto).toBeUndefined();
    expect(d.porSubir).toBeUndefined();
  });

  it('a fotografia não se perde: o documento existe mesmo sem rede', () => {
    const loja = comLoja(casa());
    TestRenderer.act(() => {
      loja().addHealthDoc('hlth-1', 'Léo', { kind: 'Receita', title: 'Ferro', foto: 'file:///tmp/r.jpg' });
    });
    expect(loja().s.healthDocs).toHaveLength(1);
    expect(loja().docsDaConsulta('hlth-1')).toHaveLength(1);
  });
});

describe('⚠ um anexo nunca sobe pela fila — a fila não leva ficheiros', () => {
  const sync = semComentarios('src/sync.js');
  const cliente = semComentarios('src/pocketbase.js');

  it('o `anexoDeSaude` usa o `criarComFicheiro`, não o `escrever.criar`', () => {
    const i = sync.indexOf('export async function anexoDeSaude');
    expect(i).toBeGreaterThan(0);
    const bloco = sync.slice(i, i + 600);
    expect(bloco).toContain('criarComFicheiro');
    expect(bloco).not.toMatch(/escrever\.criar\(/);
  });

  it('e passa pelo travão da conformidade antes de tocar no ficheiro', () => {
    const i = sync.indexOf('export async function anexoDeSaude');
    const bloco = sync.slice(i, i + 600);
    expect(bloco.indexOf("recusaSaude('anexos')"))
      .toBeLessThan(bloco.indexOf('criarComFicheiro'));
  });

  it('⚠ e recusa um anexo sem episódio — seria um exame órfão', () => {
    const i = sync.indexOf('export async function anexoDeSaude');
    expect(sync.slice(i, i + 600)).toMatch(/if \(!episodio\) throw/);
  });

  it('⚠ o `criarComFicheiro` ramifica pelo ESQUEMA da URI, não pela plataforma', () => {
    // A primeira versão fazia `Platform.OS === 'web'`, o que obriga a
    // `import { Platform } from 'react-native'` — e isso REBENTOU todas as
    // provas que correm em Node: o `index.js` do RN usa sintaxe Flow que o
    // Node não analisa, e o erro aponta para o RN, não para aqui.
    //
    // O esquema é a pergunta certa de qualquer modo: `blob:`, `data:` e
    // `http:` trazem-se com um `fetch`; `file://` não, em nenhum ambiente.
    const i = cliente.indexOf('async criarComFicheiro');
    expect(i).toBeGreaterThan(0);
    const bloco = cliente.slice(i, i + 1200);
    expect(bloco).toMatch(/\/\^\(blob:\|data:\|https\?:\)\/i\.test/);
    expect(bloco).toContain('name: nome');
    expect(bloco).toContain('ficheiro.blob');
  });

  it('⚠ e este ficheiro não importa `react-native` — é o que o mantém provável', () => {
    expect(cliente).not.toMatch(/from 'react-native'/);
  });

  it('e recusa sem servidor em vez de falhar em silêncio', () => {
    const i = cliente.indexOf('async criarComFicheiro');
    expect(cliente.slice(i, i + 300)).toMatch(/if \(!estaLigado\(\)\) throw/);
  });
});

describe('⚠ o episódio aprende o seu `id` no servidor', () => {
  const sync = semComentarios('src/sync.js');
  const loja = semComentarios('src/store.jsx');

  it('o `episodioDeSaude` tenta direto e só depois cai na fila', () => {
    const i = sync.indexOf('export async function episodioDeSaude');
    const bloco = sync.slice(i, i + 800);
    expect(bloco).toMatch(/pb\.collection\('episodios_saude'\)\.create/);
    expect(bloco).toContain('escrever.criar');
    // O direto vem primeiro; a fila é a rede de segurança.
    expect(bloco.indexOf('.create(linha)')).toBeLessThan(bloco.indexOf('escrever.criar'));
    expect(bloco).toMatch(/return \{ id: r\.id \}/);
    expect(bloco).toMatch(/return \{ pendente: true \}/);
  });

  it('e a loja guarda esse `id` na consulta', () => {
    const i = loja.indexOf('const addHealthRecord');
    const bloco = loja.slice(i, i + 2200);
    expect(bloco).toMatch(/idServidor: r\.id/);
  });

  it('⚠ e o anexo usa o `id` do SERVIDOR, não o local', () => {
    // Com o id local, a relação apontava para nada e o servidor recusava — ou,
    // pior, aceitava e o anexo ficava pendurado no vazio.
    const i = loja.indexOf('const addHealthDoc');
    const bloco = loja.slice(i, i + 2200);
    expect(bloco).toMatch(/episodio: .*idServidor/);
    expect(bloco).not.toMatch(/episodio: healthId/);
  });
});

describe('a app diz onde a fotografia está', () => {
  const ecra = ler('src/screens/Saude.jsx');

  it('um anexo por subir leva a pastilha «só aqui»', () => {
    expect(ecra).toMatch(/d\.foto && d\.porSubir/);
    expect(ecra).toContain('label="só aqui"');
  });

  it('e a folha diz para onde a fotografia vai — nunca para fora de casa', () => {
    expect(ecra).toContain('sobe para o servidor da casa — nunca para fora dela');
  });

  it('a fotografia escolhe-se pelo mesmo caminho da fatura de um equipamento', () => {
    // Dois modos de escolher uma imagem na mesma app é um a mais.
    expect(ecra).toContain("import * as ImagePicker from 'expo-image-picker'");
    expect(ecra).toMatch(/ImagePicker\.launchImageLibraryAsync\(\{ quality: 0\.7 \}\)/);
    const equip = ler('src/sheets/FichaEquipamento.jsx');
    expect(equip).toMatch(/ImagePicker\.launchImageLibraryAsync\(\{ quality: 0\.7 \}\)/);
  });
});
