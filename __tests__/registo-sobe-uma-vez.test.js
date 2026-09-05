/**
 * ⚠ O registo da casa sobe uma vez, e não volta a subir por ter descido.
 *
 * ── Porque é que isto é uma prova à parte ────────────────────────────────────
 *
 * São catorze os sítios do `store.jsx` que acrescentam uma linha ao registo —
 * apagar uma tarefa, mudar um papel, renomear a casa, alguém entrar, alguém
 * sair. Pôr a escrita em cada um deles era catorze oportunidades de esquecer a
 * décima quinta; a escrita está num efeito só, que vê tudo o que entra na lista.
 *
 * O preço de um sítio só é que ele também vê o que a LEITURA põe lá. E aí está
 * o defeito que esta prova existe para prender: depois de `puxarCasa`, a loja
 * fica com as linhas do servidor, o efeito não reconhece aqueles instantes — são
 * os do servidor, não os que este telefone escreveu — e manda-as outra vez. A
 * leitura seguinte trazia o dobro, e a seguinte o dobro disso.
 *
 * A decisão vive numa função pura de propósito: um efeito de React não se põe à
 * prova sem montar a app inteira, e o que interessa provar é a decisão.
 */
const { registosPorEnviar, chaveDeRegisto } = require('../src/store');

describe('⚠ o registo sobe uma vez', () => {
  it('uma linha nova, escrita neste telefone, sobe', () => {
    const nova = { t: 'A casa passou a chamar-se Bengui', at: 1000 };
    expect(registosPorEnviar([nova], new Set())).toEqual([nova]);
  });

  it('e não volta a subir depois de ter subido', () => {
    const nova = { t: 'Uma tarefa foi apagada', at: 2000 };
    const enviados = new Set([chaveDeRegisto(nova)]);
    expect(registosPorEnviar([nova], enviados)).toEqual([]);
  });

  it('⚠ uma linha que VEIO do servidor nunca sobe — é o ciclo', () => {
    // Tem `id`, portanto já lá está. Sem esta condição, cada leitura duplicava
    // o registo inteiro da casa.
    const doServidor = { id: 'abc123', t: 'Rita entrou na casa', at: 3000 };
    expect(registosPorEnviar([doServidor], new Set())).toEqual([]);
  });

  it('⚠ e uma lista mista deixa passar só a local', () => {
    // É o estado normal logo a seguir a alguém fazer uma coisa: o servidor já
    // respondeu uma vez, e por cima disso há uma linha acabada de escrever.
    const doServidor = { id: 'abc123', t: 'Rita entrou na casa', at: 3000 };
    const local = { t: 'Tomas apagou uma tarefa', at: 4000 };
    expect(registosPorEnviar([doServidor, local], new Set())).toEqual([local]);
  });

  it('a lista vazia, e a que não existe, não rebentam', () => {
    expect(registosPorEnviar([], new Set())).toEqual([]);
    expect(registosPorEnviar(undefined, new Set())).toEqual([]);
  });

  it('duas linhas com o mesmo texto em instantes diferentes são duas', () => {
    // Apagar duas tarefas com o mesmo nome, ou renomear a casa e voltar atrás.
    const a = { t: 'Uma tarefa foi apagada', at: 5000 };
    const b = { t: 'Uma tarefa foi apagada', at: 6000 };
    expect(chaveDeRegisto(a)).not.toBe(chaveDeRegisto(b));
    expect(registosPorEnviar([a, b], new Set([chaveDeRegisto(a)]))).toEqual([b]);
  });
});
