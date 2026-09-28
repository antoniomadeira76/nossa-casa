// O que um evento de saúde diz, e a quem.
//
// ── Porque é que isto saiu do `agenda-google.js` ─────────────────────────────
//
// Porque a regra nunca foi sobre a Google. É sobre **o que sai deste
// dispositivo**, e o ficheiro da Google só a aplicava a um dos destinos.
//
// O comentário dele dizia-o, desde 06/09/2026, e ninguém foi ver o outro lado:
//
//   «O módulo de saúde só sincroniza para um servidor DENTRO de casa, porque
//    são dados clínicos de menores. Mandar "Consulta Dentista · Mia" para a
//    Google é exactamente o que esse travão existe para impedir, por outra
//    porta.»
//
// Havia uma terceira porta, e estava aberta: o **servidor da casa**. Uma
// consulta marcada na Saúde cria um evento em `eventos` com o título
// «Consulta Pediatria», a etiqueta «Saúde», a criança como responsável e a
// relação para o episódio. A coleção `eventos` não é de saúde, o `recusaSaude`
// não a conhece, e isso subia — medido em 28/09/2026, com 24 caminhos
// enumerados por quatro leitores.
//
// Desde 27/09 o servidor da casa atende na internet, e a casa vai mudar-se para
// uma máquina alugada. A porta que estava aberta deixou de dar para o corredor.
//
// ── A decisão ────────────────────────────────────────────────────────────────
//
// A mesma que já estava tomada para a Google, aplicada aos dois destinos
// (dono da casa, 28/09/2026): **o título neutro**. Vai «Consulta» e a hora.
// A especialidade, o médico e as notas ficam no dispositivo e nas coleções de
// saúde, onde as regras do servidor decidem quem as vê.
//
// ⚠ O que NÃO se neutraliza, e é uma escolha: a `etiqueta`, o `responsavel` e a
// relação `episodio`. Esses são estrutura, não texto livre — dizem «esta pessoa
// tem uma consulta a esta hora», que é o que as próprias coleções de saúde já
// dizem, e são o que a app precisa para juntar as duas coisas ao mostrá-las. O
// que estava a mais era o texto livre: é ele que carrega «Pediatria», «Dr.
// Silva» ou o nome de um medicamento, e é ele que se cala.
//
// ── Porque é que é um ficheiro puro ──────────────────────────────────────────
//
// Pelo mesmo motivo do `endereco.js`: uma regra que só se verifica a olho não é
// uma regra. Isto não importa o `react-native` nem o SDK do PocketBase, e por
// isso prova-se em Node, sem ecrã e sem servidor.

// Um evento é de saúde se pertence a um episódio ou traz a etiqueta.
//
// ⚠ As duas condições, e não só o `healthId`: o `Saude.jsx` manda os dois, mas
// um evento pode ganhar a etiqueta «Saúde» na folha de agendar sem episódio
// nenhum atrás — e esse leva a mesma discrição.
//
// ⚠ E os nomes das DUAS formas de descrever um evento nesta app: a da loja
// (`healthId`, `tag`) e a do servidor (`episodio`, `etiqueta`). Uma regra que
// só conhecesse uma delas deixava passar metade dos caminhos — e é por metade
// dos caminhos que os defeitos entram.
export const eDeSaude = (ev) => Boolean(ev && (
  ev.healthId || ev.episodio || ev.tag === 'Saúde' || ev.etiqueta === 'Saúde'
));

// O título neutro, e a razão dele está em cima.
export const TITULO_NEUTRO = 'Consulta';

// O que um evento de saúde mostra fora do dispositivo — para a Google e para o
// servidor da casa, que é a mesma pergunta feita a dois destinos.
export const tituloLaFora = (ev) => (eDeSaude(ev)
  ? TITULO_NEUTRO
  : String((ev && (ev.title || ev.titulo)) || '').trim());
