/**
 * Regressões — Nossa Casa
 *
 * Ao contrário de smoke.test.js, estes testes lêem o código-fonte e as
 * sementes. Cada um corresponde a um defeito que chegou a estar em produção
 * e que os testes existentes não apanharam, porque comparavam literais
 * consigo próprios.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const jsxFiles = () => {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (/\.jsx?$/.test(e.name)) out.push(rel);
    }
  };
  walk('src');
  return out;
};

describe('Contratos dos componentes partilhados', () => {
  // Pill é um View de estado: não aceita selected/onPress. Quatro folhas
  // passavam-lhos, e as pastilhas ficavam sem preenchimento e sem toque.
  test('Pill nunca recebe selected ou onPress — para isso existe Choice', () => {
    const offenders = [];
    for (const f of jsxFiles()) {
      const src = read(f);
      for (const tag of src.match(/<Pill\b[\s\S]*?\/>/g) || []) {
        if (/\bselected=|\bonPress=/.test(tag)) offenders.push(f);
      }
    }
    expect(offenders).toEqual([]);
  });

  // Toggle declara {on, onPress} e não desenha o rótulo. Quem passava
  // value/onChange ficava com um interruptor inerte e sem legenda.
  test('Toggle nunca recebe value ou onChange', () => {
    const offenders = [];
    for (const f of jsxFiles()) {
      const src = read(f);
      for (const tag of src.match(/<Toggle\b[\s\S]*?\/>/g) || []) {
        if (/\bvalue=|\bonChange=/.test(tag)) offenders.push(f);
      }
    }
    expect(offenders).toEqual([]);
  });

  // Passar strings cruas dava três segmentos em branco, todos «selecionados»
  // porque undefined === undefined.
  test('Segmented normaliza opções em string', () => {
    expect(read('src/ui.jsx')).toMatch(/typeof raw === 'string'/);
  });

  test('Choice existe e o seu alvo de toque tem 44', () => {
    const ui = read('src/ui.jsx');
    const choice = ui.slice(ui.indexOf('export const Choice'), ui.indexOf('export const Tap'));
    expect(choice).toMatch(/minHeight: 44/);
    expect(choice).toMatch(/t\.accent/);          // cor de ação lida do tema
    expect(choice).not.toMatch(/#[0-9a-fA-F]{6}(?!')/); // sem literais de cor de ação
  });
});

describe('INVARIANTE #2 — saldos são somas de movimentos', () => {
  test('o cofre não é um campo escrito', () => {
    const store = read('src/store.jsx');
    expect(store).not.toMatch(/^\s*vault:\s*\{/m);
    expect(store).toMatch(/vaultMoves/);
  });

  test('nenhum ecrã lê um saldo de cofre directamente', () => {
    const offenders = jsxFiles().filter(f => /s\.vault\s*\[/.test(read(f)));
    expect(offenders).toEqual([]);
  });

  test('os movimentos semeados somam os saldos da demonstração', () => {
    const { VAULT } = require('../src/data.js');
    const soma = (kid) => Math.round(
      VAULT.reduce((n, m) => (m.kid === kid ? n + m.delta : n), 0) * 100) / 100;
    expect(soma('Léo')).toBe(12.40);
    expect(soma('Mia')).toBe(8.90);
  });
});

describe('Armazenamento local — versão e migração', () => {
  const store = read('src/store.jsx');

  test('o formato gravado tem versão e uma cadeia de migrações', () => {
    expect(store).toMatch(/const SCHEMA = \d+/);
    expect(store).toMatch(/const MIGRATIONS = \{/);
    // grava a versão do código, não um literal preso no 1
    expect(store).toMatch(/\{ v: SCHEMA, savedAt/);
    // e recusa ler um formato mais recente do que sabe interpretar
    expect(store).toMatch(/v <= SCHEMA/);
  });

  // As sementes eram gravadas, por isso mudá-las não tinha efeito em quem já
  // tinha a app aberta — vi ícones errados no cofre por causa disto.
  test('as sementes do cofre vivem no código, não no estado gravado', () => {
    expect(read('src/data.js')).toMatch(/export const VAULT = \[/);
    expect(store).toMatch(/vaultMoves: \[\], paidPts/);        // DEMO não semeia
    expect(store).toMatch(/s\.clearedSeeds \? \[\] : VAULT/);  // a derivação junta-as
  });

  // A migração corre aqui, contra o mesmo código que a app usa.
  test('v1 → v2 preserva o dinheiro e deixa de gravar as sementes', () => {
    const { VAULT } = require('../src/data.js');
    const body = store.slice(store.indexOf('  2: (o) =>'), store.indexOf('export const DEMO'));
    const mig = new Function('VAULT', 'TODAY_KEY', `return (${body.replace(/^\s*2:\s*/, '').replace(/,\s*};?\s*$/, '')})`)
      (VAULT, 'd2026-08-20');
    const soma = (mv, kid) => Math.round(
      [...VAULT, ...mv].reduce((n, m) => (m.kid === kid ? n + m.delta : n), 0) * 100) / 100;

    // saldo antigo diferente das sementes: a diferença tem de sobreviver
    const a = mig({ v: 1, vault: { 'Léo': 20.00, 'Mia': 8.90 } });
    expect('vault' in a).toBe(false);
    expect(soma(a.vaultMoves, 'Léo')).toBe(20.00);
    expect(soma(a.vaultMoves, 'Mia')).toBe(8.90);

    // estado intermédio: sementes gravadas + um movimento do utilizador
    const b = mig({ v: 1, vaultMoves: [...VAULT, { id: 'vm-x', kid: 'Léo', delta: 1 }] });
    expect(b.vaultMoves).toHaveLength(1);          // as sementes saíram
    expect(soma(b.vaultMoves, 'Léo')).toBe(13.40); // 12,40 + 1,00
  });
});

describe('PIN', () => {
  // setPin grava. Chamá-lo no JSX comprometia o PIN a meio da escrita.
  test('Gestao valida com pinError e só grava no manipulador do botão', () => {
    const src = read('src/screens/Gestao.jsx');
    const renderPart = src.slice(src.indexOf('return ('));
    const calls = renderPart.match(/setPin\(/g) || [];
    expect(calls.length).toBe(1);                       // só a do onPress
    expect(renderPart).toMatch(/onPress=\{\(\) => \{\s*if \(setPin\(/);
    expect(src).toMatch(/pinError\(selectedMember, input\)/);
  });

  test('não há PIN de fábrica', () => {
    expect(read('src/store.jsx')).toMatch(/pins:\s*\{\}/);
    const offenders = jsxFiles().filter(f =>
      /pins\s*\[[^\]]+\]\s*\|\|\s*['"]\d{4}['"]/.test(read(f)));
    expect(offenders).toEqual([]);
  });
});

describe('Equipamentos', () => {
  const dataSrc = read('src/data.js');
  const equip = [...dataSrc.matchAll(
    /\{ id: '(\w+)',\s+name: '([^']+)',\s+cat: '([^']+)',\s+bought: '([^']+)',[\s\S]*?warrantyEnd: '([^']+)'/g
  )].map(([, id, name, cat, bought, warrantyEnd]) => ({ id, name, cat, bought, warrantyEnd }));

  test('as sementes foram lidas', () => {
    expect(equip.length).toBe(4);
  });

  // O ecrã lia e.category/e.purchase; as sementes têm cat/bought. Todas as
  // linhas mostravam «undefined · Data desconhecida».
  test('o ecrã lê os campos que as sementes carregam', () => {
    const src = read('src/screens/Equipamentos.jsx');
    expect(src).not.toMatch(/e\.category|e\.purchase\b|e\.warrantyDays|e\.purchaseAt/);
    expect(src).toMatch(/e\.cat/);
    expect(src).toMatch(/e\.bought/);
  });

  test('gravar um equipamento produz a forma das sementes', () => {
    const src = read('src/screens/Equipamentos.jsx');
    const save = src.slice(src.indexOf('const handleSave'), src.indexOf('const Section'));
    for (const field of ['cat:', 'bought:', 'warrantyEnd:']) expect(save).toContain(field);
  });

  // Antes: tudo caía em today+365, e a caldeira expirada aparecia em garantia.
  test('as sementes povoam os três estados de garantia', () => {
    const { warrantyDaysLeft } = require('../src/format.js');
    const bucket = (e) => {
      const d = warrantyDaysLeft(e);
      return d > 90 ? 'em' : d > 0 ? 'a-expirar' : 'fora';
    };
    const states = new Set(equip.map(bucket));
    expect([...states].sort()).toEqual(['a-expirar', 'em', 'fora']);
    expect(bucket(equip.find(e => /Caldeira/.test(e.name)))).toBe('fora');
  });
});

describe('Ficha do equipamento — alinhada com 12-ficha-equipamento.png', () => {
  const ficha = read('src/sheets/FichaEquipamento.jsx');

  test('tem as secções que a referência mostra', () => {
    for (const s of ['Garantia', 'Fotografias', 'Preço de compra', 'Data de compra']) {
      expect(ficha).toContain(s);
    }
  });

  test('tem as três ações, com os ícones que a referência usa', () => {
    for (const [rotulo, icone] of [['Agendar Manutenção', 'calendar'],
                                   ['Exportar Fatura', 'printer'],
                                   ['Remover Equipamento', 'trash']]) {
      expect(ficha).toContain(rotulo);
      expect(ficha).toContain(`"${icone}"`);
    }
  });

  // O defeito que esta sessão passou a corrigir: controlos que não fazem nada.
  // Cada ação ou está ligada, ou está desativada com o motivo à vista.
  test('nenhuma ação é um botão morto', () => {
    expect(ficha).toMatch(/removeEquip\(equip\.id\)/);        // remover liga
    expect(ficha).toMatch(/editEquip\(equip\.id, manut\)/);   // manutenção liga
    expect(ficha).toMatch(/launchImageLibraryAsync/);         // fotografias ligam
    // exportar não é possível sem fatura, e diz porquê em vez de não fazer nada
    expect(ficha).toMatch(/desativado=\{!equip\.fatura\}/);
    expect(ficha).toMatch(/Ainda não há fatura para exportar/);
  });

  test('remover pede confirmação — não se desfaz', () => {
    expect(ficha).toMatch(/<Confirm[\s\S]*?destructive/);
    expect(ficha).toContain('Remover equipamento?');
  });

  test('as edições não escrevem sobre as sementes', () => {
    const store = read('src/store.jsx');
    expect(store).toMatch(/equipEdits/);
    expect(store).toMatch(/\.\.\.\(\(s\.equipEdits \|\| \{\}\)\[e\.id\] \|\| \{\}\)/);
    expect(read('src/data.js')).toMatch(/export const EQUIP = \[/);   // sementes intactas
  });
});

describe('Português europeu', () => {
  const BR = [
    [/\bCompartilh/i, 'compartilhar → partilhar'],
    [/\bgerenci/i, 'gerenciar → gerir'],
    [/\bAguardando\b/, 'Aguardando → A aguardar'],
    [/\bplanejar\b/i, 'planejar → planear'],
    [/\busuário/i, 'usuário → utilizador'],
    [/\bdeletar\b/i, 'deletar → eliminar'],
  ];

  test.each(BR)('nenhum ficheiro usa %s', (re, hint) => {
    const offenders = jsxFiles().filter(f => re.test(read(f)));
    expect({ hint, offenders }).toEqual({ hint, offenders: [] });
  });

  // Fronteiras em Unicode: \b parte-se nos acentos, e /\bvocê\b/ casava dentro
  // de «vocês». As fronteiras aqui são «não é letra».
  test('não há tratamento por «tu»', () => {
    const re = /(?<![\p{L}])(tu|teu|teus|tua|tuas|contigo|ti)(?![\p{L}])/iu;
    const offenders = jsxFiles().filter(f => re.test(read(f)));
    expect(offenders).toEqual([]);
  });
});

describe('Camada de ligação ao servidor — PocketBase', () => {
  const cliente = read('src/pocketbase.js');
  const colecoes = read('db/pocketbase/criar-colecoes.mjs');

  // Estes testes leem código. As regras do servidor não se verificam assim —
  // verificam-se a correr, em db/pocketbase/provar-regras.mjs (19 provas) e
  // provar-hooks.mjs (12). Aqui só se guarda o que o cliente não pode fazer.
  test('a ligação é opcional: sem URL, a app corre local', () => {
    expect(cliente).toMatch(/export const ligado = Boolean\(URL\)/);
    expect(cliente).toMatch(/process\.env\.EXPO_PUBLIC_PB_URL/);
  });

  // INVARIANTE #3: quem decide o que existe é o servidor.
  test('o PIN é verificado no servidor, nunca comparado aqui', () => {
    expect(cliente).toMatch(/authWithPassword\(login, pin\)/);
    expect(cliente).not.toMatch(/pin\s*===|===\s*pin\b/);
    // e a coleção de membros é de autenticação, que é o que faz o hash
    expect(colecoes).toMatch(/name: 'membros', type: 'auth'/);
  });

  // INVARIANTE #2: sem regra de update nem de delete, o servidor recusa-os.
  test('o cofre é uma coleção de inserções', () => {
    const bloco = colecoes.slice(colecoes.indexOf("name: 'cofre_movimentos'"),
                                 colecoes.indexOf("name: 'equipamentos'"));
    expect(bloco).toMatch(/updateRule: null/);
    expect(bloco).toMatch(/deleteRule: null/);
    expect(cliente).not.toMatch(/update\([^)]*saldo/i);
  });

  // §5: ausentes da resposta, não escondidos na interface.
  test('o orçamento exclui perfis de criança na própria regra', () => {
    const bloco = colecoes.slice(colecoes.indexOf("name: 'envelopes'"),
                                 colecoes.indexOf("name: 'despesas'"));
    expect(bloco).toMatch(/listRule: `\$\{DA_CASA\} && \$\{ADULTO\}`/);
  });

  // §6 e §9: nenhuma operação de dinheiro sem chave.
  test('as operações de dinheiro levam chave de idempotência', () => {
    for (const c of ['despesas', 'cofre_movimentos']) {
      expect(colecoes).toMatch(new RegExp(`CREATE UNIQUE INDEX \\w+ ON ${c} \\(casa, idem_key\\)`));
    }
    expect(cliente).toMatch(/COM_IDEM = new Set\(\['despesas', 'cofre_movimentos'\]\)/);
  });

  // A decisão desta sessão: a saúde fica fora até a conformidade estar tratada.
  test('a saúde está fora da camada de ligação e das coleções', () => {
    const semComentarios = cliente.replace(/\/\/.*$/gm, '');
    expect(semComentarios).not.toMatch(/episodios_saude|'anexos'/);
    expect(colecoes).not.toMatch(/name: 'episodios_saude'|name: 'anexos'/);
  });

  test('nenhum segredo ficou no código', () => {
    expect(cliente).not.toMatch(/eyJ[A-Za-z0-9_-]{20}|service_role/);
    // a palavra-passe de superutilizador só existe nos scripts de prova locais
    expect(cliente).not.toMatch(/casa-de-testes/);
  });

  test('as provas do servidor existem e são executáveis', () => {
    for (const f of ['db/pocketbase/provar-regras.mjs', 'db/pocketbase/provar-hooks.mjs']) {
      expect(read(f)).toMatch(/process\.exit\(mau \? 1 : 0\)/);
    }
  });
});

describe('O que a interface promete, o código faz', () => {
  // O texto anunciava 30 % para as metas (Dinheiro) e para os cofres (Gestão);
  // o manipulador não fazia nem uma coisa nem outra.
  // Sem comentários: o que se mede é o que o utilizador lê, não as notas ao lado.
  const withoutComments = (src) => src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

  test('fechar o mês não promete mover dinheiro', () => {
    for (const f of ['src/screens/Dinheiro.jsx', 'src/screens/Gestao.jsx']) {
      expect(withoutComments(read(f))).not.toMatch(/30\s*%|\*\s*0\.30/);
    }
  });

  test('não sobra o cálculo morto dos 30 %', () => {
    expect(read('src/screens/Dinheiro.jsx')).not.toMatch(/toGoals/);
  });
});
