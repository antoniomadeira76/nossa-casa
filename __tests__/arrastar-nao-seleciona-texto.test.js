/**
 * Arrastar não seleciona texto.
 *
 * 15/09/2026, o dono da casa no telemóvel: «quando se arrasta uma tarefa ou
 * uma compra acaba sempre por selecionar texto». A pressão longa que arma a
 * `ListaArrastavel` é, para o navegador do telemóvel, o gesto de começar a
 * selecionar; o arrasto a seguir estendia a seleção pelos títulos das linhas.
 *
 * A correção vive num sítio só — o `View` raiz da lista, na web — e é CSS:
 * `userSelect: none` (e o prefixo), sempre e não só armado, porque a seleção
 * começa ANTES de armar; e sem o balão «Copiar» do iOS (`WebkitTouchCallout`).
 * O `touchAction: none` do arrasto fica como estava, só enquanto armado — o
 * scroll do dedo é do navegador e tem de continuar a ser.
 */
const fs = require('fs');
const path = require('path');

const ler = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*/gm, '');

describe('a lista que se arrasta, na web', () => {
  const lista = semComentarios(ler('src/ListaArrastavel.jsx'));
  const raiz = lista.slice(lista.indexOf('<View {...responder.panHandlers}'), lista.indexOf('{itens.map('));

  it('não deixa selecionar texto — sempre, não só armada', () => {
    expect(raiz).toMatch(/Platform\.OS === 'web'\s*\?\s*\{\s*userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none'/);
  });

  it('e o `touchAction: none` continua só enquanto armada', () => {
    expect(raiz).toMatch(/\.\.\.\(armado \? \{ touchAction: 'none' \} : \{\}\)/);
    expect(raiz).not.toMatch(/touchAction: 'none' \}\s*:\s*null/);
  });

  it('as três listas que se arrastam passam por ela', () => {
    for (const f of ['src/screens/Tarefas.jsx', 'src/screens/Compras.jsx', 'src/screens/ComoFazemosCompras.jsx']) {
      expect(ler(f)).toMatch(/<ListaArrastavel/);
    }
  });
});
