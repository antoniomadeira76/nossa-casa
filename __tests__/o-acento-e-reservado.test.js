/**
 * O acento no botão principal é RESERVADO, e é uma lista fechada.
 *
 * A app tinha trinta e sete botões principais e trinta e sete levavam a cor do
 * esquema. «Guardar artigo» pintado como «Acertar Contas»; «Fechar» — o botão
 * que fecha uma folha e não faz nada — igual ao que apaga a casa. Quando tudo
 * grita, nada se ouve: a cor deixa de dizer «isto tem consequências» e passa a
 * dizer «isto é um botão».
 *
 * A regra que os separa, e são três coisas:
 *
 *   1. mexe em dinheiro ENTRE PESSOAS
 *   2. apaga
 *   3. fecha um período, ou tira dados de dentro da app para fora
 *
 * Tudo o resto é `comum` — fundo escuro, rótulo claro, igualmente legível
 * (13,7:1 medido) e igualmente o botão principal da folha. Não é um botão
 * secundário: é o mesmo botão sem a cor que promete consequências.
 *
 * ⚠ Esta prova ENUMERA a árvore. Não sabe quantos botões a app tem nem quer
 * saber: percorre todos os `<Primary`, e cada um que fique com o acento tem de
 * estar aqui em baixo com o motivo escrito. Um botão novo com acento falha esta
 * prova até alguém dizer por escrito porque merece — que é exactamente a
 * conversa que não aconteceu quando os trinta e sete o tinham.
 *
 * Também não confia em contar: a lista abaixo tem de ser exactamente a que a
 * árvore devolve, sem sobras de nenhum dos lados. Uma entrada que já não
 * corresponde a botão nenhum falha igual — senão a lista envelhece a dizer sim.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');

// ── Quem leva o acento, e porquê ─────────────────────────────────────────────
//
// A chave é `ficheiro:rótulo`. O rótulo é o que está no código — literal ou
// expressão — porque a linha muda a cada edição e o rótulo não.
const COM_ACENTO = {
  'src/screens/Dinheiro.jsx': {
    "{acertado ? 'Contas Acertadas' : 'Acertar Contas'}":
      'Dinheiro entre pessoas: passa o saldo de um adulto para o outro.',
    '"Confirmar Pagamento"':
      'Dinheiro entre pessoas: é o toque que move o valor.',
    '"Confirmar Abertura"':
      'Fecha um período: o mês anterior deixa de ser o aberto e os totais passam a contar noutra soma.',
    '"Confirmar Encerramento"':
      'Fecha um período: arquiva as despesas do mês e reinicia a contagem.',
  },
  'src/sheets/Carrinho.jsx': {
    '"Fechar Conta e Registar"':
      'Dinheiro entre pessoas: escreve uma despesa na conta conjunta, paga por quem foi às compras, e entra no acerto entre os dois adultos.',
  },
  'src/sheets/ConfirmarAdministradores.jsx': {
    "{aExecutar ? 'A apagar…' : rotuloAcao}":
      'Apaga. Regra sem excepção.',
  },
  'src/sheets/ExportarSaude.jsx': {
    "{aGuardar ? 'A preparar…' : 'Guardar como PDF'}":
      'Tira dados clínicos de um menor de dentro da app e põe-nos num ficheiro que a app deixa de governar. Não se desfaz.',
  },
};

// ── A árvore, lida ───────────────────────────────────────────────────────────

const jsxDaApp = () => {
  const achados = [];
  const percorrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) percorrer(p);
      else if (e.name.endsWith('.jsx')) achados.push(p);
    }
  };
  percorrer(path.join(RAIZ, 'src'));
  achados.push(path.join(RAIZ, 'App.jsx'));
  // O `ui.jsx` é onde o `Primary` VIVE, não onde se usa.
  return achados
    .map(p => path.relative(RAIZ, p).split(path.sep).join('/'))
    .filter(p => p !== 'src/ui.jsx');
};

// Cada `<Primary` da árvore, com o ficheiro, o rótulo, e se pediu `comum`.
const botoes = () => {
  const fora = [];
  for (const rel of jsxDaApp()) {
    const txt = fs.readFileSync(path.join(RAIZ, rel), 'utf8');
    let i = txt.indexOf('<Primary');
    while (i !== -1) {
      // O bloco da etiqueta vai até ao `/>` que a fecha. Basta para ler as
      // propriedades — nenhum `Primary` desta app tem filhos.
      const fim = txt.indexOf('/>', i);
      const bloco = txt.slice(i, fim === -1 ? txt.length : fim);
      const rot = bloco.match(/label=(\{[^}]*\}|"[^"]*")/);
      fora.push({
        ficheiro: rel,
        linha: txt.slice(0, i).split('\n').length,
        rotulo: rot ? rot[1] : '(sem rótulo)',
        comum: /\bcomum\b/.test(bloco),
        temSub: /\bsub=/.test(bloco),
      });
      i = txt.indexOf('<Primary', i + 1);
    }
  }
  return fora;
};

const TODOS = botoes();

describe('⚠ o acento é uma lista fechada, e a lista é esta', () => {
  it('a prova encontra botões — senão não prova nada', () => {
    // Se o `Primary` mudar de nome, isto avisa em vez de passar em silêncio.
    expect(TODOS.length).toBeGreaterThan(20);
  });

  it('⚠ nenhum botão leva o acento sem o motivo escrito nesta prova', () => {
    const semMotivo = TODOS
      .filter(b => !b.comum)
      .filter(b => !((COM_ACENTO[b.ficheiro] || {})[b.rotulo]))
      .map(b => `${b.ficheiro}:${b.linha} ${b.rotulo}`);

    expect(semMotivo).toEqual([]);
  });

  it('⚠ e nenhum motivo desta lista sobra sem botão — a lista não envelhece', () => {
    const vivos = new Set(TODOS.filter(b => !b.comum).map(b => `${b.ficheiro} ${b.rotulo}`));
    const orfaos = [];
    for (const [f, rotulos] of Object.entries(COM_ACENTO)) {
      for (const r of Object.keys(rotulos)) {
        if (!vivos.has(`${f} ${r}`)) orfaos.push(`${f} ${r}`);
      }
    }
    expect(orfaos).toEqual([]);
  });

  it('cada motivo diz alguma coisa, e não «porque sim»', () => {
    for (const [f, rotulos] of Object.entries(COM_ACENTO)) {
      for (const [r, motivo] of Object.entries(rotulos)) {
        expect(typeof motivo).toBe('string');
        // Um motivo de três palavras é uma etiqueta, não um motivo.
        expect(motivo.split(/\s+/).length).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('a grande maioria é comum — se deixar de ser, a cor voltou a não dizer nada', () => {
    const acentuados = TODOS.filter(b => !b.comum).length;
    // Um quinto é generoso: hoje são sete de trinta e sete.
    expect(acentuados / TODOS.length).toBeLessThanOrEqual(0.2);
  });
});

describe('o «Fechar» nunca é o botão de maior peso da folha', () => {
  // Havia três, todos com a cor do esquema: o botão que não faz nada pintado
  // como o que apaga a casa.
  it('nenhum `Primary` com rótulo «Fechar» ou «Cancelar» leva o acento', () => {
    const maus = TODOS
      .filter(b => /^"(Fechar|Cancelar|Voltar)"$/.test(b.rotulo) && !b.comum)
      .map(b => `${b.ficheiro}:${b.linha}`);
    expect(maus).toEqual([]);
  });
});

describe('a linha de consequência só aparece onde diz algo novo', () => {
  // O `sub` não é decoração: repetir o que a folha já diz três centímetros
  // acima gasta o único sítio onde caberia uma coisa que ela não diz.
  it('⚠ todos os botões que mexem em dinheiro entre pessoas dizem quanto e a quem', () => {
    const dinheiro = TODOS.filter(b =>
      !b.comum && /Acertar Contas|Confirmar Pagamento|Fechar Conta e Registar/.test(b.rotulo));
    expect(dinheiro.length).toBeGreaterThan(0);
    for (const b of dinheiro) {
      expect(b.temSub).toBe(true);
    }
  });

  it('e os que fecham um período dizem o que fica fechado', () => {
    const periodo = TODOS.filter(b => !b.comum && /Confirmar (Abertura|Encerramento)/.test(b.rotulo));
    expect(periodo.length).toBe(2);
    for (const b of periodo) expect(b.temSub).toBe(true);
  });
});
