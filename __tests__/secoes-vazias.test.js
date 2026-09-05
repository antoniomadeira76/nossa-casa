// Um título de secção com nada por baixo.
//
// Aconteceu no «Tarefas de Hoje» e no «Precisa de Si»: a casa é nova, a lista
// vem vazia, e o ecrã mostra um cabeçalho a apontar para o vácuo. Não é um
// erro que rebente — é um ecrã que parece avariado.
//
// Este teste lê os ecrãs e exige que cada secção que percorre uma LISTA tenha
// ou uma protecção de vazio, ou um `<Empty>`. É estático de propósito: apanha
// a secção nova que alguém escrever daqui a seis meses, que é quando isto
// volta a acontecer.
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const ficheiros = ['src/screens', 'src/sheets']
  .flatMap(d => fs.readdirSync(path.join(raiz, d)).map(f => `${d}/${f}`))
  .filter(f => f.endsWith('.jsx'));

// Secções cuja lista nunca pode vir vazia. Cada linha tem de dizer porquê —
// sem razão escrita, não entra aqui.
const NUNCA_VAZIAS = {
  // ⚠ Saiu daqui o `Documentacao.jsx :: {g.area}`, e foi esta prova a dizê-lo.
  //
  // O «Como funciona» deixou de ser uma lista de `<SectionTitle>` por área e
  // passou a um cartão por área, com o que ela faz escrito à mão. O título já
  // não existe, e a excepção passou a justificar coisa nenhuma — que é
  // exactamente o que a prova de baixo apanha.
  'src/screens/Gestao.jsx :: Membros e PIN':
    'quem abre a Gestão é membro da casa, logo a lista tem-no sempre',
  // Chamava-se «O Meu Perfil» e passou a «Aparência» quando o ecrã foi
  // reorganizado. Foi esta prova que deu por isso — é para isso que ela existe.
  'src/screens/Perfil.jsx :: Aparência':
    'os três aspetos e os seis esquemas de cor são constantes do tema',
};

// `].map(` é um array escrito na própria linha — as opções de um Segmented, os
// seis esquemas de cor. Não é uma lista de dados e não pode vir vazia.
const percorreUmaLista = (texto) => /(?<!\])\.map\(/.test(texto);

const protegido = (texto) =>
  /<Empty|length === 0|length \?|length &&|length > 0|\.length\)|!\(/.test(texto);

describe('nenhum título de secção fica com nada por baixo', () => {
  for (const f of ficheiros) {
    const linhas = fs.readFileSync(path.join(raiz, f), 'utf8').split('\n');
    for (let i = 0; i < linhas.length; i++) {
      if (!/<SectionTitle/.test(linhas[i])) continue;

      // A protecção pode estar ACIMA do título (`{lista.length > 0 && (`) ou
      // abaixo (`<Empty>`), por isso olha-se para os dois lados.
      const acima = linhas.slice(Math.max(0, i - 4), i).join('\n');
      const corpo = [];
      for (let j = i + 1; j < linhas.length && !/<SectionTitle/.test(linhas[j]) && corpo.length < 26; j++) {
        corpo.push(linhas[j]);
      }
      const texto = corpo.join('\n');
      if (!percorreUmaLista(texto)) continue;

      const titulo = ((linhas[i].match(/>(.+?)</) || [, linhas[i].trim()])[1] || '').trim();
      const chave = `${f} :: ${titulo}`;
      it(`${f}:${i + 1} — ${titulo}`, () => {
        if (NUNCA_VAZIAS[chave]) return;
        expect(protegido(`${acima}\n${texto}`)).toBe(true);
      });
    }
  }

  // A lista de excepções não pode envelhecer em silêncio: uma entrada que já
  // não corresponde a secção nenhuma é uma justificação a proteger nada.
  it('todas as excepções ainda correspondem a uma secção real', () => {
    const todas = ficheiros.map(f => {
      const c = fs.readFileSync(path.join(raiz, f), 'utf8');
      return c.split('\n').filter(l => /<SectionTitle/.test(l))
        .map(l => `${f} :: ${((l.match(/>(.+?)</) || [, ''])[1] || '').trim()}`);
    }).flat();
    for (const chave of Object.keys(NUNCA_VAZIAS)) {
      expect(todas).toContain(chave);
    }
  });
});
