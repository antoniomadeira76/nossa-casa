// A ligação à agenda da Google, e os três defeitos que a tinham quebrada.
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const ler = (f) => fs.readFileSync(path.join(raiz, f), 'utf8');

// O código sem comentários.
//
// Sem isto, estes testes tropeçavam na sua própria documentação: os comentários
// que explicam o defeito CITAM o defeito, e uma rede que apanha a explicação em
// vez do erro obriga a não escrever a explicação.
const semComentarios = (texto) => texto
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').map(l => l.replace(/(^|\s)\/\/.*$/, '')).join('\n');

describe('a chave do dia leva sempre o prefixo', () => {
  // Já aconteceu duas vezes: o «Guardar evento» gravava `day: '2026-08-27'` e
  // a folha de importação fazia o mesmo. A app lê chaves com `d` à frente, e
  // portanto o evento entrava na loja e não aparecia em ecrã nenhum — sem erro,
  // sem aviso, com o botão a dizer que tinha gravado.
  //
  // Quatro eventos do utilizador ficaram assim, e só se recuperaram com uma
  // migração. Este teste é para não haver uma terceira vez.
  const ficheiros = ['src/screens', 'src/sheets']
    .flatMap(d => fs.readdirSync(path.join(raiz, d)).map(f => `${d}/${f}`))
    .concat(['App.jsx', 'src/store.jsx'])
    .filter(f => /\.jsx?$/.test(f));

  for (const f of ficheiros) {
    const linhas = semComentarios(ler(f)).split('\n');
    const suspeitas = linhas
      .map((l, i) => [i + 1, l])
      // `day:` a receber um literal de data sem o `d`.
      .filter(([, l]) => /\bday:\s*['"`]\d{4}-/.test(l));

    it(`${f} não escreve uma data crua em day:`, () => {
      expect(suspeitas.map(([n, l]) => `${n}: ${l.trim()}`)).toEqual([]);
    });
  }
});

describe('a folha de importação fala com a Google a sério', () => {
  const folha = semComentarios(ler('src/sheets/ImportarGoogle.jsx'));

  it('não tem eventos inventados no código', () => {
    // Eram estes três, escritos à mão, que apareciam a quem carregasse em
    // «importar do Google» — na agenda dele não existiam.
    for (const inventado of ['Reunião com professor', 'Dentista Mia', 'Reunião de trabalho']) {
      expect(folha).not.toContain(inventado);
    }
    expect(folha).not.toMatch(/mockEvents|Simulate fetching/);
  });

  it('pede os eventos à Google', () => {
    expect(folha).toMatch(/servidor\.google\.eventos\(/);
  });

  it('escreve pelo caminho que sabe montar a chave e a visibilidade', () => {
    expect(folha).toMatch(/importGoogleEvents\(/);
  });

  it('deixa escolher quem vê, e não só «partilhar sim ou não»', () => {
    // Era um interruptor de dois estados, e por isso a importação era o único
    // sítio da app onde não se podia dizer «só os adultos».
    expect(folha).toMatch(/VISIBILIDADES\.map/);
    expect(folha).not.toMatch(/shareAll/);
  });

  it('sem autorização não mostra uma lista vazia a fingir que procurou', () => {
    expect(folha).toMatch(/semAutorizacao/);
  });
});

describe('o token da agenda sobrevive a recarregar a página', () => {
  const pb = ler('src/pocketbase.js');

  it('passa por sessionStorage, e não fica só em memória', () => {
    // A sessão do PocketBase persiste; o token da Google não persistia. Quem
    // recarregava ficava dentro da app e o interruptor «marcar também na
    // agenda da Google» desaparecia do ecrã de agendar, sem uma palavra.
    expect(pb).toMatch(/sessionStorage/);
    expect(pb).toMatch(/const guardarToken/);
  });

  it('não vai para disco — é credencial de terceiro', () => {
    // sessionStorage aguenta o recarregar e morre com o separador. localStorage
    // seria uma credencial da conta Google de alguém guardada no disco.
    expect(pb).not.toMatch(/localStorage\.setItem\(\s*CHAVE_TOKEN/);
  });

  it('um token que a Google recusou deixa de ficar guardado', () => {
    const bloco = pb.slice(pb.indexOf('async eventos'), pb.indexOf('async criarEvento'));
    expect(bloco).toMatch(/401[\s\S]{0,120}guardarToken\(null\)/);
  });

  it('sair leva o token com ele', () => {
    expect(pb).toMatch(/sair:[\s\S]{0,120}guardarToken\(null\)/);
  });
});

describe('o aviso de importação não é uma vez na vida', () => {
  const app = ler('App.jsx');
  const efeito = app.slice(app.indexOf('// A importação da agenda'),
                           app.indexOf('// Quem entrou, tal como o quadro'));

  it('deixou de desistir só porque a casa já importou algo', () => {
    // A guarda era «já importou alguma coisa? então não voltes a olhar»: o
    // sentido Google → Nossa Casa funcionava no primeiro dia e nunca mais.
    expect(efeito).not.toMatch(/const jaViu/);
  });

  it('o que decide é haver eventos ainda não vistos', () => {
    expect(efeito).toMatch(/filter\(e => !jaVistos\[e\.id\]\)/);
  });

  it('numa casa a sério não oferece eventos de demonstração', () => {
    expect(efeito).toMatch(/if \(s\.clearedSeeds\) return;/);
  });
});
