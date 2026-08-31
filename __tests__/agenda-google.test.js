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

describe('a autorização da agenda vive no servidor', () => {
  // Terceira tentativa, e a última. As duas anteriores guardavam o token no
  // aparelho — memória só (morria ao recarregar) e depois `sessionStorage`
  // (morria com o separador, e uma app instalada pedia a entrada a cada
  // sessão). Esta não guarda nada: o que tem de durar é o refresh token, e
  // esse fica na coleção `credenciais_agenda`, cujas cinco regras são nulas.
  const pb = semComentarios(ler('src/pocketbase.js'));

  it('o aparelho não guarda o token em armazenamento nenhum', () => {
    expect(pb).not.toMatch(/sessionStorage/);
    expect(pb).not.toMatch(/localStorage/);
  });

  it('o token de acesso vem do servidor, e tem validade', () => {
    expect(pb).toMatch(/\/api\/agenda\/token/);
    expect(pb).toMatch(/tokenExpiraEm/);
  });

  it('o refresh token nunca é nomeado nesta camada', () => {
    // Se algum dia aparecer aqui, é porque saiu do servidor — e o desenho
    // inteiro deixou de valer.
    expect(pb).not.toMatch(/refresh_token|refreshToken/);
  });

  it('um token que a Google recusou é esquecido', () => {
    const bloco = pb.slice(pb.indexOf('async eventos'), pb.indexOf('async criarEvento'));
    expect(bloco).toMatch(/401[\s\S]{0,200}esquecerToken\(\)/);
  });

  it('sair leva o token com ele', () => {
    expect(pb).toMatch(/sair:[\s\S]{0,160}esquecerToken\(\)/);
  });

  it('a entrada com o Google já não pede a agenda', () => {
    // Pedia, e o consentimento não produzia autorização de longa duração
    // nenhuma: o PocketBase não pede `access_type=offline`. Eram dois ecrãs
    // de consentimento para o mesmo, e o primeiro inútil.
    expect(semComentarios(ler('src/screens/Login.jsx')))
      .not.toMatch(/calendario:\s*true/);
  });
});

describe('o servidor é que guarda a autorização', () => {
  const hook = semComentarios(ler('db/pocketbase/pb_hooks/agenda-google.pb.js'));
  const comum = semComentarios(ler('db/pocketbase/pb_hooks/agenda-google-comum.js'));

  it('pede à Google uma autorização de longa duração', () => {
    // Sem estes dois, a Google não emite refresh token e o desenho todo cai.
    // Foi exactamente o que faltava ao fluxo do PocketBase.
    expect(hook).toMatch(/access_type=offline/);
    expect(hook).toMatch(/prompt=consent/);
  });

  it('o segredo do cliente não está escrito em lado nenhum', () => {
    // Vem da configuração OAuth2 que já existe na coleção `membros`. Um
    // segredo com duas cópias é um segredo com o dobro das maneiras de escapar.
    expect(comum).toMatch(/getProviderConfig\('google'\)/);
    expect(hook + comum).not.toMatch(/GOCSPX/);
  });

  it('a rota do token devolve só o token de acesso', () => {
    // O que importa é a RESPOSTA, e não o ficheiro todo: o pedido à Google
    // leva o refresh token de propósito — é o que se está a trocar. Uma
    // primeira versão deste teste proibia a expressão em todo o bloco e
    // acusava essa linha, que está certa.
    const rota = hook.slice(hook.indexOf("'/api/agenda/token'"));
    const inicio = rota.indexOf('return e.json(200, {');
    const resposta = rota.slice(inicio, rota.indexOf('});', inicio));
    expect(resposta).toMatch(/access_token:/);
    expect(resposta).not.toMatch(/refresh/);
  });
});

describe('os três sentidos chegam à agenda da Google', () => {
  const folha = semComentarios(ler('src/sheets/NovoEvento.jsx'));

  it('criar', () => {
    expect(folha).toMatch(/servidor\.google\.criarEvento\(/);
    // O identificador que a Google devolve tem de ficar guardado: sem ele,
    // editar e apagar não sabem em que evento mexer do lado de lá.
    expect(folha).toMatch(/idGoogle/);
  });

  it('editar', () => {
    expect(folha).toMatch(/servidor\.google\.atualizarEvento\(/);
  });

  it('apagar', () => {
    // `google.apagarEvento` existia e NINGUÉM o chamava: o evento apagado na
    // app continuava na agenda da Google, a apitar à hora marcada para uma
    // coisa que já não existe. A app dizia «apagado» e mentia.
    expect(folha).toMatch(/servidor\.google\.apagarEvento\(/);
  });

  it('apagar guarda o identificador antes de o tirar da app', () => {
    // `removerEvento` corre primeiro, e a seguir já não há de onde ler o
    // `idGoogle` — tem de ser lido ANTES.
    const bloco = folha.slice(folha.indexOf('const apagar'), folha.indexOf('const apagar') + 700);
    expect(bloco.indexOf('evento.idGoogle')).toBeLessThan(bloco.indexOf('removerEvento('));
  });

  it('se a Google falhar, a folha diz que ficou por apagar lá', () => {
    expect(folha).toMatch(/continua na agenda da Google/);
  });
});

describe('o aviso de importação identifica o evento', () => {
  // Observado com a agenda ligada: o aviso mostrava uma caixa com uma marca de
  // seleção e NADA — sem nome, sem data — a perguntar se a pessoa a queria na
  // casa. A camada da Google fala `titulo/dia/hora`; o aviso lê
  // `title/date/time`. Enquanto o aviso só via os eventos de demonstração,
  // que já vinham na forma dele, ninguém notou.
  const app = semComentarios(ler('App.jsx'));
  const modal = semComentarios(ler('src/modals/GoogleCalendarImportModal.jsx'));

  // Os campos que o aviso lê de cada evento, tirados do próprio aviso: assim
  // este teste acompanha-o em vez de guardar uma lista que envelhece.
  const lidos = [...new Set([...modal.matchAll(/\b(?:e|event)\.([a-zA-Z]+)/g)]
    .map(m => m[1]))].filter(k => k !== 'id');

  it('o aviso lê campos, e sabe-se quais', () => {
    expect(lidos.length).toBeGreaterThan(2);
  });

  const conversor = app.slice(app.indexOf('const daGoogle'), app.indexOf('const EVENTOS_DE_DEMONSTRACAO'));

  it('há um conversor da forma da Google para a forma do aviso', () => {
    expect(conversor).toMatch(/title:/);
    expect(app).toMatch(/novos\.map\(daGoogle\)/);
  });

  for (const campo of lidos) {
    it(`o conversor dá \`${campo}\``, () => {
      expect(conversor).toMatch(new RegExp(`\\b${campo}:`));
    });
  }
});

describe('o que a app pôs na Google não volta como novidade', () => {
  // O ciclo fechava-se em cima de si próprio: agenda-se na app, o evento vai
  // para a agenda da Google, e da vez seguinte a importação lê-o de lá e
  // oferece-o como novo. Quem aceitasse ficava com o mesmo almoço duas vezes.
  // Observado na casa a sério: «teste 31/8», criado na app, com idGoogle
  // guardado, a ser oferecido pela folha de importação.
  const loja = semComentarios(ler('src/store.jsx'));

  it('a loja sabe que eventos da Google são dela', () => {
    expect(loja).toMatch(/const idsGoogleDaCasa/);
    // Os dois sítios onde o identificador pode estar.
    const bloco = loja.slice(loja.indexOf('const idsGoogleDaCasa'),
                             loja.indexOf('const idsGoogleDaCasa') + 500);
    expect(bloco).toMatch(/s\.added/);
    expect(bloco).toMatch(/s\.eventEdits/);
  });

  it('a folha de importação consulta-a', () => {
    expect(semComentarios(ler('src/sheets/ImportarGoogle.jsx')))
      .toMatch(/nossos\.has\(e\.id\)/);
  });

  it('o aviso automático consulta-a também', () => {
    expect(semComentarios(ler('App.jsx'))).toMatch(/nossos\.has\(e\.id\)/);
  });
});

describe('a migração que não chegou a correr', () => {
  const loja = ler('src/store.jsx');

  it('há uma migração nova para o `date` órfão', () => {
    // A migração 7 faz o trabalho certo e nunca correu nesta casa: foi escrita
    // depois de a loja já estar estampada com 8, e uma migração numerada
    // abaixo da versão gravada nunca corre. Quatro eventos ficaram com
    // `date: '2026-08-14'` e nenhum `day` — invisíveis em todos os ecrãs.
    expect(loja).toMatch(/export const SCHEMA = 9;/);
    expect(loja).toMatch(/^ {2}9: \(o\) => \{/m);
  });

  it('a versão do esquema acompanha a última migração', () => {
    const versao = Number(loja.match(/export const SCHEMA = (\d+);/)[1]);
    const numeros = [...loja.matchAll(/^ {2}(\d+): \(o\)/gm)].map(m => Number(m[1]));
    // Uma migração acima do SCHEMA nunca corre; o SCHEMA acima da última
    // migração deixa passar dados por converter. Têm de bater certo.
    expect(Math.max(...numeros)).toBe(versao);
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
