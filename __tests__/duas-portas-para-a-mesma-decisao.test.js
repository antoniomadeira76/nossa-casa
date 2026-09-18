/**
 * DUAS PORTAS PARA A MESMA DECISÃO — as mesmas palavras, duas vezes, no mesmo ecrã
 * ===============================================================================
 *
 * Segunda vez (17/09/2026). A primeira foi o par «Abrir Mês / Fechar Mês» do
 * Dinheiro, escrito à mão com outras cores, ao lado do MESMO par no cartão da
 * Gestão — resolvido a unificar o componente. A segunda foi dentro de um único
 * ecrã: o Dinheiro tinha uma `Row` com ícone e seta a dizer «Abrir Outubro»,
 * debaixo do título «Envelopes», e um `BotaoCompacto` a dizer «Abrir Outubro»,
 * na Administração, quinze linhas de scroll abaixo. As mesmas palavras, o mesmo
 * destino, e nenhuma pista de que eram a mesma coisa.
 *
 * E não eram sequer iguais por dentro: a `Row` fazia `setSheet('openMonth')` e
 * mais nada, deixando lá a distribuição de uma tentativa anterior; o botão
 * limpava-a primeiro. Duas portas para a mesma folha, com dois comportamentos —
 * que é o pior caso, porque a que parece igual engana.
 *
 * Remendar não serve: já foi remendado uma vez. Este guarda ENUMERA todos os
 * ficheiros da app e cruza, dentro de cada um, o RÓTULO que se lê com o DESTINO
 * para onde o toque leva. Duas vezes o mesmo par é a mesma porta duas vezes.
 *
 * ⚠ O que NÃO é este defeito, e por isso não conta:
 *   - «editar» e «criar» na mesma folha (`ComoFazemosCompras`, o corredor) —
 *     mesmo destino, rótulos diferentes;
 *   - o título de uma folha igual ao botão que a confirma (`Saúde`, «Anexar») —
 *     o botão é o destino, não outra porta para ele;
 *   - o mesmo `confirmLabel="Apagar"` em dois `Confirm` que nunca aparecem
 *     juntos — mesma palavra, decisões diferentes;
 *   - um rótulo que é só uma variável (`title={nome}`), que não diz palavra
 *     nenhuma a quem lê e se repete honestamente dentro de um ciclo.
 *
 * ⚠ E lê-se a ÁRVORE, não o texto. Um guarda desta casa que procurasse
 * `setSheet('openMonth')` com uma expressão regular encontrava-o no comentário
 * que explica esta correcção, dentro do próprio `Dinheiro.jsx` — é a armadilha
 * já catalogada em `armadilhas-de-tratar-codigo-como-texto`, e custou duas
 * tardes. O analisador do Babel deita os comentários fora sozinho.
 */
const fs = require('fs');
const path = require('path');
const babel = require('@babel/parser');

const RAIZ = path.join(__dirname, '..');

const ficheirosDaApp = () => {
  const achados = [];
  const andar = (dir) => {
    for (const nome of fs.readdirSync(dir)) {
      const p = path.join(dir, nome);
      if (fs.statSync(p).isDirectory()) andar(p);
      else if (/\.jsx$/.test(nome)) achados.push(p);
    }
  };
  andar(path.join(RAIZ, 'src'));
  const app = path.join(RAIZ, 'App.jsx');
  if (fs.existsSync(app)) achados.push(app);
  return achados;
};

// Os atributos que o utilizador LÊ num alvo de toque.
const ROTULOS = new Set(['label', 'title', 'confirmLabel']);
// Os atributos que LEVAM a algum lado. O `onClose` fica de fora de propósito:
// voltar de uma folha empilhada para a de baixo é um regresso, não uma porta.
const TOQUES = new Set(['onPress', 'onConfirm']);

const andarNaArvore = (no, visita) => {
  if (!no || typeof no !== 'object') return;
  if (Array.isArray(no)) { for (const x of no) andarNaArvore(x, visita); return; }
  if (typeof no.type === 'string') visita(no);
  for (const k of Object.keys(no)) {
    if (k === 'loc' || k === 'leadingComments' || k === 'trailingComments') continue;
    andarNaArvore(no[k], visita);
  }
};

/** O rótulo tal como se lê, ou `null` se não disser palavra nenhuma. */
const rotuloDe = (attr, src) => {
  const v = attr.value;
  if (!v) return null;
  if (v.type === 'StringLiteral') return v.value.trim() || null;
  if (v.type !== 'JSXExpressionContainer') return null;
  const e = v.expression;
  // `title={nome}` e `title={x.nome}` não dizem nada a quem lê o código, e
  // repetem-se com honestidade dentro de um ciclo.
  if (e.type === 'Identifier' || e.type === 'MemberExpression') return null;
  return src.slice(e.start, e.end).replace(/\s+/g, ' ').trim() || null;
};

/** Os destinos a que o toque leva: `setX('folha')` e `setX(true)`. */
const destinosDe = (attr) => {
  const destinos = [];
  andarNaArvore(attr.value, (no) => {
    if (no.type !== 'CallExpression') return;
    if (no.callee.type !== 'Identifier' || !/^set[A-Z]/.test(no.callee.name)) return;
    const arg = no.arguments[0];
    if (!arg) return;
    if (arg.type === 'StringLiteral') destinos.push(`${no.callee.name}('${arg.value}')`);
    else if (arg.type === 'BooleanLiteral' && arg.value === true) destinos.push(`${no.callee.name}(true)`);
  });
  return destinos;
};

/** As portas de um ficheiro: pares (rótulo que se lê, destino para onde vai). */
const portasDe = (src, nomeDoFicheiro) => {
  const arvore = babel.parse(src, { sourceType: 'module', plugins: ['jsx'] });
  const portas = [];
  andarNaArvore(arvore.program, (no) => {
    if (no.type !== 'JSXOpeningElement') return;
    let rotulo = null;
    const destinos = [];
    for (const a of no.attributes) {
      if (a.type !== 'JSXAttribute' || !a.name || a.name.type !== 'JSXIdentifier') continue;
      if (ROTULOS.has(a.name.name) && !rotulo) rotulo = rotuloDe(a, src);
      if (TOQUES.has(a.name.name)) destinos.push(...destinosDe(a));
    }
    if (!rotulo || !destinos.length) return;
    const feitio = no.name.type === 'JSXIdentifier' ? no.name.name : 'desconhecido';
    for (const d of destinos) portas.push({ rotulo, destino: d, feitio, linha: no.loc.start.line, ficheiro: nomeDoFicheiro });
  });
  return portas;
};

/**
 * Os pares (rótulo, destino) que aparecem com MAIS DO QUE UM FEITIO no ficheiro.
 *
 * ⚠ O feitio — o nome do componente — é o que separa o defeito do que é apenas
 * repetição. O `App.jsx` desenha o mesmo `<Tap label="Perfil e ajustes">` em
 * dois sítios, e está certo: são os dois ramos de `isHome && !V ? null : …`,
 * nunca aparecem juntos, e é a MESMA porta escrita duas vezes porque o
 * cabeçalho do Início tem outra arrumação (medido em 09/09/2026). Escrever a
 * mesma coisa duas vezes é arrumação; escrever a mesma coisa de DUAS MANEIRAS é
 * o defeito — foi uma `Row` com seta contra um botão de acento cheio que se viu
 * no Dinheiro, e é por parecerem coisas diferentes que enganam.
 */
const repetidas = (portas) => {
  const por = new Map();
  for (const p of portas) {
    const chave = `${p.rotulo} → ${p.destino}`;
    if (!por.has(chave)) por.set(chave, []);
    por.get(chave).push(p);
  }
  return [...por.entries()]
    .filter(([, ps]) => new Set(ps.map(p => p.feitio)).size > 1)
    .map(([chave, ps]) => `${ps[0].ficheiro}: «${chave}» — `
      + ps.map(p => `<${p.feitio}> na linha ${p.linha}`).join(' e '));
};

describe('duas portas para a mesma decisão', () => {
  const ficheiros = ficheirosDaApp();

  it('há ficheiros para ler — senão este guarda passa por vacuidade', () => {
    // Um `every` sobre uma lista vazia é verdadeiro. Já aconteceu nesta casa
    // com as secções do modo compras: o guarda ficou verde a ver zero coisas.
    expect(ficheiros.length).toBeGreaterThan(50);
    expect(ficheiros.some(f => f.includes(path.join('src', 'screens', 'Dinheiro.jsx')))).toBe(true);
  });

  it('encontra portas — senão não está a ler nada', () => {
    const todas = ficheiros.flatMap(f => portasDe(fs.readFileSync(f, 'utf8'), path.relative(RAIZ, f)));
    expect(todas.length).toBeGreaterThan(40);
  });

  it('APANHA o defeito de 17/09/2026 — o «Abrir Outubro» a dobrar no Dinheiro', () => {
    // A prova de que o guarda serve para alguma coisa: o código EXACTO que
    // estava no `Dinheiro.jsx`, com a `Row` que foi removida ao lado do botão
    // que ficou. Um guarda que nunca se viu falhar não é um guarda.
    const comODefeito = `
      const Ecra = () => (
        <View>
          <SectionTitle t={t}>Envelopes</SectionTitle>
          {admin ? (
            <Linha t={t}>
              <Row t={t} icon="fileAdd" title={\`Abrir \${proximoMes}\`}
                sub="Distribuir o rendimento e reiniciar os envelopes"
                onPress={() => setSheet('openMonth')} last />
            </Linha>
          ) : null}
          <BotaoCompacto t={t} tom="acento" label={\`Abrir \${proximoMes}\`}
            onPress={() => { setOpenMonth({ envelopes: {} }); setSheet('openMonth'); }} />
        </View>
      );
    `;
    const achado = repetidas(portasDe(comODefeito, 'exemplo.jsx'));
    expect(achado).toHaveLength(1);
    expect(achado[0]).toContain('Abrir ${proximoMes}');
    expect(achado[0]).toContain("setSheet('openMonth')");
  });

  it('NÃO confunde «editar» com «criar» na mesma folha', () => {
    // Dois rótulos diferentes para o mesmo destino são duas coisas diferentes.
    const bom = `
      const Ecra = () => (
        <View>
          <Row t={t} title="Mercearia" onPress={() => { setAEditar(nome); setFolha('loja'); }} />
          <AddButton t={t} label="acrescentar loja" onPress={() => { setAEditar(null); setFolha('loja'); }} />
        </View>
      );
    `;
    expect(repetidas(portasDe(bom, 'exemplo.jsx'))).toEqual([]);
  });

  it('NÃO acusa a mesma porta escrita em dois ramos que se excluem', () => {
    // O `App.jsx`, tal como está: o avatar do cabeçalho do Início e o de todos
    // os outros cabeçalhos. Mesmo componente, mesmo rótulo, mesmo destino, e
    // `isHome && !V ? null : …` garante que nunca se vêem juntos.
    const bom = `
      const Cabecalho = () => (
        <View>
          <Tap onPress={() => setPerfil(true)} label="Perfil e ajustes" size={44}>
            <AvatarDeCabecalho t={t} nome={user} size={44} />
          </Tap>
          {isHome && !V ? null : (
            <Tap onPress={() => setPerfil(true)} label="Perfil e ajustes" size={44}>
              <AvatarDeCabecalho t={t} nome={user} size={44} />
            </Tap>
          )}
        </View>
      );
    `;
    expect(repetidas(portasDe(bom, 'exemplo.jsx'))).toEqual([]);
  });

  it('NÃO conta o título de uma folha como porta para ela própria', () => {
    // A `Sheet` chama-se «Avatar» e o `Row` que a abre também: é o nome do
    // sítio, dito à entrada e lá dentro. O título não tem toque.
    const bom = `
      const Ecra = () => (
        <Sheet t={t} title="O Meu Perfil" onClose={onClose}>
          <Row t={t} title="Avatar" onPress={() => setAEscolherAvatar(true)} last />
          {aEscolherAvatar ? <Sheet t={t} title="Avatar" onClose={() => setAEscolherAvatar(false)} /> : null}
        </Sheet>
      );
    `;
    expect(repetidas(portasDe(bom, 'exemplo.jsx'))).toEqual([]);
  });

  it('nenhum ecrã da app tem a mesma porta duas vezes', () => {
    const maus = [];
    for (const f of ficheiros) {
      const nome = path.relative(RAIZ, f);
      maus.push(...repetidas(portasDe(fs.readFileSync(f, 'utf8'), nome)));
    }
    expect(maus).toEqual([]);
  });
});
