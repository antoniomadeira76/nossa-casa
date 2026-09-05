/**
 * ⚠ Cada campo da loja tem uma decisão escrita: sobe, ou não sobe e porquê.
 *
 * ── Porque é que esta prova existe ───────────────────────────────────────────
 *
 * Em 04/09/2026 a base de dados tinha 31 coleções e o cliente escrevia em 10.
 * Corrigi-o por partes — tarefas, agenda, regras da casa, orçamento — e a cada
 * parte ficava a mesma pergunta sem resposta escrita: e o resto?
 *
 * «Não sobe» era indistinguível de «esqueci-me», e a única forma de saber qual
 * era ler o `sync.js` inteiro. Foi assim que oito funções de escrita ficaram
 * sem quem as chamasse sem ninguém dar por isso.
 *
 * ── A forma do guarda ────────────────────────────────────────────────────────
 *
 * A mesma que fechou as relações não ancoradas: em vez de eu me lembrar,
 * ENUMERA-SE. Lê as `DATA_KEYS` da loja e exige que cada uma esteja classificada
 * em `src/o-que-sobe.js`.
 *
 * A consequência prática é a que interessa: quem acrescentar um campo à loja tem
 * de decidir, ali e nesse momento, se ele é da casa ou do dispositivo. Não pode
 * adiar sem que uma prova o diga.
 */
const fs = require('fs');
const path = require('path');
const { O_QUE_SOBE, RESPOSTAS } = require('../src/o-que-sobe');

const raiz = path.join(__dirname, '..');
const loja = fs.readFileSync(path.join(raiz, 'src/store.jsx'), 'utf8');

const i = loja.indexOf('const DATA_KEYS = [');
const bloco = loja.slice(i, loja.indexOf('];', i));
const CHAVES = [...bloco.matchAll(/'([^']+)'/g)].map(m => m[1]);

describe('⚠ cada campo da loja tem uma decisão escrita', () => {
  it('há chaves para conferir — senão isto não prova nada', () => {
    expect(CHAVES.length).toBeGreaterThan(50);
  });

  it('⚠ nenhuma chave de `DATA_KEYS` fica por classificar', () => {
    // Uma chave nova sem classificação é um campo que ninguém decidiu se é da
    // casa ou deste telefone. A mensagem diz QUAIS.
    const porClassificar = CHAVES.filter(k => !O_QUE_SOBE[k]);
    expect(porClassificar).toEqual([]);
  });

  it('⚠ e nenhuma classificação sobra — uma chave que já não existe esconde a próxima', () => {
    const aMais = Object.keys(O_QUE_SOBE).filter(k => !CHAVES.includes(k));
    expect(aMais).toEqual([]);
  });

  it('cada resposta é uma das três, e traz razão', () => {
    for (const [chave, valor] of Object.entries(O_QUE_SOBE)) {
      expect(Array.isArray(valor)).toBe(true);
      const [como, porque] = valor;
      expect(RESPOSTAS).toContain(como);
      // Uma razão de três palavras não é uma razão. O limite é para obrigar a
      // dizer o que acontece, não a etiquetar.
      expect(typeof porque).toBe('string');
      expect(porque.length).toBeGreaterThanOrEqual(40);
    }
  });

  it('⚠ e o que diz `linhas` ou `campo` é mesmo mencionado no `sync.js`', () => {
    // Uma classificação que diga «sobe» sobre um campo que o `sync` nunca viu é
    // uma promessa por escrito — que é pior do que a lacuna, porque quem a ler
    // deixa de ir verificar.
    const sync = fs.readFileSync(path.join(raiz, 'src/sync.js'), 'utf8');
    // ⚠ O terceiro elemento é o SÍMBOLO que prova a ligação, para os casos em
    // que o nome da chave da loja não é o nome de nada no `sync`: o `pins` sobe
    // pelo `definirPin`, e procurar «pins» no `sync.js` não o encontra.
    //
    // Sem isto eu ia alargar a janela de procura até a prova deixar de provar —
    // que é o que se faz quando um guarda incomoda e não se percebe porquê.
    const mentiras = Object.entries(O_QUE_SOBE)
      .filter(([, [como]]) => como !== 'local')
      .map(([chave, [, , prova]]) => prova || chave)
      .filter(nome => !new RegExp(`\\b${nome}\\b`).test(sync));
    expect(mentiras).toEqual([]);
  });
});

describe('o retrato de hoje', () => {
  // Não é uma regra — é um número que se lê de relance, e que sobe à medida que
  // as lacunas fecham. Se descer, alguém desligou alguma coisa.
  it('mostra quanto da casa já vive na base de dados', () => {
    const conta = (q) => Object.values(O_QUE_SOBE).filter(([c]) => c === q).length;
    const sobem = conta('linhas') + conta('campo');
    const locais = conta('local');
    // eslint-disable-next-line no-console
    console.log(`      sobem: ${sobem} · locais: ${locais} · total: ${CHAVES.length}`);
    expect(sobem + locais).toBe(CHAVES.length);
    // ⚠ Em 05/09/2026 são 32 a subir, contra 10 dois dias antes. A prova prende
    // o CHÃO, não o teto: sobe à medida que as lacunas fecham, e se descer é
    // porque alguém desligou alguma coisa.
    //
    // Escrevi 34 à primeira, de cabeça, e a prova corrigiu-me. Fica o número
    // medido, não o que eu julgava.
    expect(sobem).toBeGreaterThanOrEqual(32);
  });
});
