import React from 'react';

/**
 * A ação de um ECRÃ, fixa no fundo — o irmão do `useAcaoDaFolha` das folhas.
 *
 * ── Porque existe ────────────────────────────────────────────────────────────
 *
 * 15/09/2026, o dono da casa a olhar para as Tarefas: «move o botão para o
 * fundo e assim aproveita-se mais o ecrã». O «acrescentar tarefa» vivia no fim
 * do conteúdo, depois da lista e da paginação: numa lista curta ficava a meio
 * de um ecrã vazio, e numa lista longa desaparecia por baixo dela — era preciso
 * rolar até ao fim para acrescentar seja o que for.
 *
 * Agora é o mesmo que uma folha faz com o botão principal: o ecrã declara a sua
 * ação com `useAcaoDoEcra(<AddButton …/>)`, e a `App.jsx` desenha-a numa barra
 * fixa entre a área que rola e o rodapé.
 *
 * ⚠ O RODAPÉ continua a ser o último filho da raiz (INVARIANTE #1). Esta barra
 * é irmã dele, e vem ANTES — não é um elemento a flutuar por cima, que era o
 * caminho fácil e o que tapa a primeira linha do rodapé em metade dos
 * telemóveis.
 *
 * ⚠ E sem provedor por cima — um ecrã montado sozinho numa prova — o hook
 * devolve o elemento para ele se desenhar onde está. É o que faz com que as
 * provas que montam um ecrã continuem a ver o botão.
 */
export const AcaoDoEcra = React.createContext(null);

export function useAcaoDoEcra(elemento) {
  const registar = React.useContext(AcaoDoEcra);
  // ⚠ Sem lista de dependências, e com uma comparação por REFERÊNCIA guardada
  // num `ref`: o elemento é JSX novo a cada desenho, e registá-lo sempre era um
  // ciclo de atualizações. Compara-se o que o ecrã diz (o rótulo e o estado de
  // quem o desenha) pela chave que o próprio elemento traz.
  const anterior = React.useRef(null);
  const chave = elemento ? JSON.stringify(elemento.props || {}, (k, v) => (typeof v === 'function' ? '·' : v)) : null;
  React.useEffect(() => {
    if (!registar) return undefined;
    if (anterior.current !== chave) {
      anterior.current = chave;
      registar(elemento);
    }
    return () => { anterior.current = null; registar(null); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registar, chave]);
  return registar ? null : elemento;
}
