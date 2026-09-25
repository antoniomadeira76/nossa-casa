/**
 * UM CLIQUE TEM SEMPRE CONSEQUÊNCIA — o botão da entrada nunca fica calado
 * ========================================================================
 *
 * «Não acontece nada quando clico» foi dito TRÊS vezes sobre o mesmo botão, em
 * 18/09 e 25/09/2026, com três causas completamente diferentes:
 *
 *   1. o `window.open` corria depois de um `await` e o Chrome recusava a
 *      janela em silêncio — guarda `a-janela-abre-se-no-gesto`;
 *   2. `new URL` não existe no React Native: a excepção saía antes de a
 *      página navegar, e um `catch` trocava-a por uma frase amigável que não
 *      dizia nada — guarda `o-react-native-nao-tem-url`;
 *   3. o separador dele corria o pacote ANTIGO depois de eu mexer nos
 *      ficheiros; o Metro não substitui a quente um módulo preso em fechos.
 *
 * As três causas são diferentes e nenhuma se repetiu. **O que se repetiu foi o
 * SINTOMA**: um botão que não muda, não navega e não diz nada. Foi isso que
 * custou uma tarde de cada vez — não a causa, que apareceu em minutos assim
 * que houve uma mensagem para ler.
 *
 * Remendar causas uma a uma não acaba com isto, porque a quarta causa há-de
 * ser outra. O que este guarda prende é a AUSÊNCIA DE SILÊNCIO:
 *
 *   · o botão muda de estado à primeira, antes de qualquer `await`;
 *   · fica desactivado enquanto trabalha (um segundo clique num
 *     redireccionamento recomeça tudo e perde o primeiro pedido);
 *   · há um relógio que, se nada acontecer, transforma o silêncio numa frase
 *     com o que fazer a seguir;
 *   · o relógio pára-se em todas as saídas, e ao sair do ecrã;
 *   · a razão CRUA vai para a consola e para o ecrã, porque é dela que a
 *     causa sai.
 */
const fs = require('fs');
const path = require('path');
const babel = require('@babel/parser');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');

// ⚠ Sem comentários: este ficheiro cita os nomes que procura, e um guarda que
// lê texto encontra-se a si próprio.
const codigoDe = (p) => ler(p)
  .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ''))
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, (c) => c.replace(/[^\n]/g, ''))
  .replace(/(^|[^:])\/\/[^\n]*/g, (m, pre) => pre);

const login = codigoDe('src/screens/Login.jsx');

// O corpo do `entrarComGoogle`, do `const` até ao `const` seguinte.
const corpoDoBotao = () => {
  const i = login.indexOf('const entrarComGoogle');
  expect(i).toBeGreaterThan(0);
  return login.slice(i, login.indexOf('const press', i));
};

describe('um clique tem sempre consequência', () => {
  it('⚠ o botão muda de estado ANTES de qualquer `await`', () => {
    // Se a primeira coisa que o botão faz for esperar, tudo o que corra mal
    // antes de a espera terminar é invisível — e foi assim as três vezes.
    const corpo = corpoDoBotao();
    const ondeEstado = corpo.indexOf('setAAbrirGoogle(true)');
    const ondePrimeiroAwait = corpo.indexOf('await');
    expect(ondeEstado).toBeGreaterThan(0);
    expect(ondePrimeiroAwait).toBeGreaterThan(ondeEstado);
  });

  it('⚠ e o ecrã mostra-o — rótulo e `disabled`', () => {
    // Um estado que ninguém desenha é um estado que não existe.
    expect(login).toContain("{aAbrirGoogle ? 'A abrir a Google… ' : 'Continuar com Google'}"
      .replace('… ', '…'));
    expect(login).toContain('disabled={aAbrirGoogle}');
    expect(login).toContain('busy: aAbrirGoogle');
  });

  it('⚠ `aAbrirGoogle` é DIFERENTE do `aEntrar` do PIN', () => {
    // O `aEntrar` deste ecrã quer dizer «a criança está a submeter o PIN».
    // Reaproveitá-lo punha o botão da Google desactivado enquanto uma criança
    // escreve o PIN, e ao contrário — duas coisas com um nome só.
    expect(login).toContain('const [aEntrar, setAEntrar] = useState(false);');
    expect(login).toContain('const [aAbrirGoogle, setAAbrirGoogle] = useState(false);');
    // E o PIN continua a usar o dele.
    expect(login).toContain('blocked > Date.now() || aEntrar');
  });

  it('⚠ há um relógio que transforma o silêncio em palavras', () => {
    const corpo = corpoDoBotao();
    expect(corpo).toMatch(/relogioDoSilencio\.current = setTimeout\(/);
    expect(corpo).toContain('Nada aconteceu ao entrar pela Google');
    // E a frase diz O QUE FAZER, não só que correu mal.
    expect(corpo).toMatch(/Ctrl\+Shift\+R/);
    expect(corpo).toMatch(/bloqueou a janela/);
    // E abre a lista local, que é o caminho que funciona sem credenciais.
    expect(corpo).toContain("setStep('contas')");
  });

  it('⚠ o relógio pára-se em todas as saídas, e ao sair do ecrã', () => {
    const corpo = corpoDoBotao();
    // No sucesso da janela e no `catch`.
    expect((corpo.match(/pararOSilencio\(\);/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(login).toContain('const pararOSilencio = () => {');
    // E na desmontagem: um relógio que dispara depois de a app entrar punha
    // uma mensagem de erro por cima de uma casa aberta.
    expect(login).toMatch(/useEffect\(\(\) => \(\) => \{\s*\n\s*if \(relogioDoSilencio\.current\) clearTimeout\(relogioDoSilencio\.current\);/);
  });

  it('⚠ a razão CRUA não se perde — vai para a consola e para o ecrã', () => {
    // É dela que a causa sai. As cinco frases amigáveis são boas para quem
    // quer entrar e más para quem tem de descobrir porquê.
    expect(login).toContain("console.error('[entrada] falhou:', e)");
    expect(login).toContain('setDetalheDoErro(cru)');
    expect(login).toContain('{detalheDoErro}');
  });

  it('o ficheiro analisa-se — é a rede de baixo', () => {
    expect(() => babel.parse(ler('src/screens/Login.jsx'), { sourceType: 'module', plugins: ['jsx'] }))
      .not.toThrow();
  });
});
