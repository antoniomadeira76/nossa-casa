/**
 * UMA TAREFA MARCADA DIZ, POR PALAVRAS, QUE ESTÁ FEITA
 * ===================================================
 *
 * 16/09/2026, o dono da casa, com o print da linha à frente: «o que acontece
 * quando marco alguma coisa como feita?». Acontecia quase tudo — a linha em
 * `tarefas_feitas` no servidor, o visto na cor do perfil, a faixa verde, a
 * pastilha dos pontos a sair — menos a legenda.
 *
 * A frase de «feita» só existia para a tarefa RECORRENTE («feita hoje · volta
 * amanhã»). Uma tarefa de uma vez só caía no subtítulo normal e continuava a
 * mostrar o prazo: «Marcar revisão do carro», com visto, e por baixo «António ·
 * Segunda, 21/09 às 00:00». A marca dizia feita e as palavras diziam por fazer,
 * na mesma linha.
 *
 * ── As propriedades ──────────────────────────────────────────────────────────
 *
 *   1. Marcada, a legenda diz «feita» — recorrente ou não.
 *   2. A de uma vez só NÃO diz «hoje»: a app não guarda o dia em que foi feita,
 *      e amanhã «feita hoje» passava a mentira. A recorrente pode dizê-lo
 *      porque se desmarca sozinha no dia seguinte.
 *   3. Marcada, a legenda NÃO mostra o prazo — era esse o defeito.
 *   4. A frase vive num sítio só. Estava escrita à mão nas Tarefas E no
 *      Início: a mesma tarefa, vista de dois ecrãs, com duas legendas à espera
 *      de divergirem — e divergiram, porque o defeito estava nos dois.
 */
const fs = require('fs');
const path = require('path');
const { legendaDaTarefa, subtituloDaTarefa } = require('../src/format');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');

const REVISAO = { id: 't1', title: 'Marcar revisão do carro', who: 'António' };
const PRAZO = { text: 'Segunda, 21/09 às 00:00', late: false, soon: false };
const CAMA = { id: 't2', title: 'Fazer a cama', who: 'Léo', recur: 'Todos os dias' };

describe('uma tarefa marcada diz que está feita', () => {
  it('⚠ a de UMA VEZ SÓ diz «feita» — era aqui que ficava calada', () => {
    const legenda = legendaDaTarefa(REVISAO, PRAZO, { feita: true, recorrente: false });
    expect(legenda).toMatch(/feita/);
    expect(legenda).toBe('António · feita');
  });

  it('⚠ e NÃO mostra o prazo — o defeito era a legenda ficar no subtítulo normal', () => {
    const legenda = legendaDaTarefa(REVISAO, PRAZO, { feita: true, recorrente: false });
    expect(legenda).not.toContain('21/09');
    // A prova de que o defeito existia: sem o estado, a legenda É o prazo.
    expect(legendaDaTarefa(REVISAO, PRAZO, {})).toBe('António · Segunda, 21/09 às 00:00');
    expect(legendaDaTarefa(REVISAO, PRAZO, {})).toBe(subtituloDaTarefa(REVISAO, PRAZO));
  });

  it('⚠ e NÃO diz «hoje»: a app não guarda o dia em que uma tarefa de uma vez só se fez', () => {
    expect(legendaDaTarefa(REVISAO, PRAZO, { feita: true, recorrente: false })).not.toContain('hoje');
    // A recorrente pode dizê-lo — desmarca-se sozinha amanhã.
    expect(legendaDaTarefa(CAMA, null, { feita: true, recorrente: true })).toBe('feita hoje · volta amanhã');
  });

  it('a que espera confirmação continua a dizê-lo, e a que está por fazer mostra o prazo', () => {
    expect(legendaDaTarefa(CAMA, null, { pendente: true })).toBe('Feito — a aguardar confirmação');
    expect(legendaDaTarefa(REVISAO, PRAZO, {})).toContain('21/09');
    // Sem prazo nem recorrência, fica o nome sozinho — que é verdade e chega.
    expect(legendaDaTarefa({ who: 'Mia' }, null, {})).toBe('Mia');
    // Sem nome, não se inventa um separador solto.
    expect(legendaDaTarefa({}, null, { feita: true })).toBe('feita');
  });

  it('⚠ a frase vive num sítio só — nem as Tarefas nem o Início a escrevem à mão', () => {
    for (const ecra of ['src/screens/Tarefas.jsx', 'src/screens/Inicio.jsx']) {
      const codigo = semComentarios(ler(ecra));
      expect(codigo).toMatch(/legendaDaTarefa\(/);
      // A frase literal saiu dos dois ecrãs: quem a quiser mudar muda-a uma vez.
      expect(codigo).not.toContain('feita hoje · volta amanhã');
      expect(codigo).not.toContain('a aguardar confirmação');
    }
    // E está no `format.js`, que é onde as frases desta app se escrevem.
    expect(semComentarios(ler('src/format.js'))).toContain('feita hoje · volta amanhã');
  });

  it('⚠ e os dois ecrãs passam-lhe os TRÊS estados — uma função certa mal chamada é o mesmo defeito', () => {
    // O guarda de cima prova que a chamam; este prova que lhe dizem o que ela
    // precisa de saber. Com `recorrente` esquecido, toda a tarefa marcada
    // passava a dizer «feita» e a recorrente perdia o «volta amanhã»; com
    // `feita` esquecido, voltava tudo ao princípio e nada dizia nada.
    for (const ecra of ['src/screens/Tarefas.jsx', 'src/screens/Inicio.jsx']) {
      const codigo = semComentarios(ler(ecra));
      const chamada = codigo.match(/legendaDaTarefa\([^)]*\{[^}]*\}\s*\)/);
      expect(chamada).toBeTruthy();
      expect(chamada[0]).toMatch(/feita:\s*done/);
      expect(chamada[0]).toMatch(/pendente:\s*pend/);
      expect(chamada[0]).toMatch(/recorrente:\s*rec/);
    }
  });
});
