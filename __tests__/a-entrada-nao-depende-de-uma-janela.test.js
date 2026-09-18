/**
 * A ENTRADA NA CASA NÃO DEPENDE DE UMA JANELA
 * ===========================================
 *
 * 18/09/2026. A entrada pela Google abria uma janela, e o Chrome recusava-a.
 * Primeiro por defeito nosso — o `window.open` corria depois de um `await` e o
 * gesto já tinha expirado (ver `a-janela-abre-se-no-gesto`). Corrigido isso, o
 * navegador continuou a recusá-la: tinha guardado o bloqueio para o endereço,
 * das dezenas de vezes em que o defeito antigo a pediu fora do gesto.
 *
 * «Permitir janelas» resolve numa máquina e volta a faltar na seguinte. A
 * entrada na casa é a porta de tudo, e ele decidiu: deixa de haver janela. A
 * página inteira vai à Google e volta.
 *
 * ── O que este guarda prende ────────────────────────────────────────────────
 *
 *   1. no navegador, o botão da Google NÃO abre janela nenhuma — navega;
 *   2. o `state` compara-se à volta (senão um endereço com o código de outra
 *      pessoa punha esta casa na conta dela);
 *   3. o verificador PKCE vive no `sessionStorage` e não no disco;
 *   4. o endereço limpa-se SEMPRE — um `?code=` que fica é trocado outra vez
 *      ao recarregar, e a segunda troca falha sempre;
 *   5. a razão da falha chega ao ecrã de entrada, em vez de a pessoa aterrar
 *      no «Bem-vindo» sem uma palavra.
 */
const fs = require('fs');
const path = require('path');
const babel = require('@babel/parser');

const RAIZ = path.join(__dirname, '..');
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');

// ⚠ Sem comentários: este ficheiro explica o defeito citando os nomes em
// causa, e um guarda que lê texto encontra-se a si próprio. Os blocos trocam-se
// por o MESMO número de quebras de linha, para os números baterem certo.
const codigoDe = (p) => ler(p)
  .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ''))
  .replace(/(^|[^:])\/\/[^\n]*/g, (m, pre) => pre);

describe('a entrada na casa não depende de uma janela', () => {
  const pb = codigoDe('src/pocketbase.js');
  const login = codigoDe('src/screens/Login.jsx');
  const app = codigoDe('App.jsx');

  it('as três peças do caminho sem janela existem', () => {
    expect(pb).toMatch(/async comecarEntradaGoogle\(\)/);
    expect(pb).toMatch(/haRetornoDaGoogle\(\)/);
    expect(pb).toMatch(/async concluirEntradaGoogle\(\)/);
    expect(pb).toMatch(/export const enderecoDeRetorno = /);
  });

  it('⚠ quando a janela é recusada, a app NAVEGA em vez de ficar sem caminho', () => {
    // A ordem: a janela primeiro, porque não exige configuração nenhuma; o
    // redireccionamento como RESERVA, que entra quando ela for recusada.
    //
    // ⚠ Pô-lo à frente foi um erro de 18/09/2026: o redireccionamento exige o
    // endereço registado na consola da Google, e quem ainda o não tivesse
    // registado ficava na página de erro da Google, sem volta — pior do que
    // estava. Uma reserva nunca pode ser o caminho principal.
    const i = login.indexOf('const entrarComGoogle');
    expect(i).toBeGreaterThan(0);
    const corpo = login.slice(i, login.indexOf('const press', i));
    const ondeJanela = corpo.indexOf('servidor.auth.entrarComGoogle');
    const ondeReserva = corpo.indexOf('comecarEntradaGoogle');
    expect(ondeJanela).toBeGreaterThan(0);
    expect(ondeReserva).toBeGreaterThan(ondeJanela);   // a reserva vem DEPOIS
    // E só entra quando a causa for mesmo o bloqueador.
    expect(corpo).toMatch(/if \(!\/bloqueou a janela\/i\.test\(daJanela\.message \|\| ''\)\) throw daJanela;/);

    // O caminho da reserva navega mesmo, e não abre janela nenhuma.
    const j = pb.indexOf('async comecarEntradaGoogle');
    expect(pb.slice(j, j + 2000)).toMatch(/window\.location\.assign\(/);
    expect(pb.slice(j, j + 2000)).not.toMatch(/window\.open|abrirNoGesto/);
  });

  it('⚠ o `state` compara-se à volta', () => {
    // Sem isto, um endereço com o código de outra pessoa punha esta casa na
    // conta dela. É a única defesa que este fluxo precisa de ter a mais.
    const i = pb.indexOf('async concluirEntradaGoogle');
    const corpo = pb.slice(i, i + 3000);
    expect(corpo).toMatch(/q\.get\('state'\) !== guardado\.state/);
  });

  it('⚠ o verificador PKCE vive no `sessionStorage`, não no disco', () => {
    const i = pb.indexOf('async comecarEntradaGoogle');
    const corpo = pb.slice(i, i + 2000);
    expect(corpo).toMatch(/window\.sessionStorage\.setItem/);
    expect(corpo).not.toMatch(/localStorage/);
  });

  it('⚠ o endereço limpa-se SEMPRE — em erro, em recusa e em sucesso', () => {
    // Um `?code=` que fica na barra é trocado outra vez a cada recarregamento,
    // e a segunda troca falha: um código de autorização gasta-se à primeira.
    const i = pb.indexOf('async concluirEntradaGoogle');
    const corpo = pb.slice(i, pb.indexOf('async entrarComGoogle', i));
    expect(corpo).toMatch(/window\.history\.replaceState/);
    // Um `limpar()` por cada saída que já leu o código: a recusa da Google, o
    // estado perdido, o estado trocado, o sucesso e a falha da troca.
    expect((corpo.match(/limpar\(\);/g) || []).length).toBeGreaterThanOrEqual(5);
  });

  it('⚠ o arranque conclui a entrada ANTES de esperar pela sessão gravada', () => {
    // Quem volta da Google não tem sessão gravada nenhuma para esperar, e o
    // código gasta-se à primeira.
    const ondeRetorno = app.indexOf('haRetornoDaGoogle');
    const ondeSessao = app.indexOf('sessaoPronta');
    expect(ondeRetorno).toBeGreaterThan(0);
    expect(ondeRetorno).toBeLessThan(ondeSessao);
    expect(app).toMatch(/const r = await servidor\.auth\.concluirEntradaGoogle\(\);/);
    expect(app).toMatch(/if \(vivo\) setUser\(r\.record\.nome\);/);
  });

  it('⚠ e a razão da falha chega ao ecrã de entrada', () => {
    expect(app).toMatch(/setErroDoRetorno\(r\.erro\)/);
    expect(app).toMatch(/<Login t=\{t\} onEnter=\{entrar\} erroInicial=\{erroDoRetorno\} \/>/);
    expect(login).toMatch(/erroInicial = null/);
    expect(login).toMatch(/useState\(erroInicial\)/);
    // E abre no passo das CONTAS: quem acabou de falhar a entrada pela Google
    // precisa do caminho local à vista, não do botão que acabou de falhar.
    expect(login).toMatch(/useState\(erroInicial \? 'contas' : 'login'\)/);
  });

  it('o ficheiro continua a analisar-se — é a rede de baixo', () => {
    expect(() => babel.parse(ler('src/pocketbase.js'), { sourceType: 'module', plugins: ['jsx'] })).not.toThrow();
    expect(() => babel.parse(ler('src/screens/Login.jsx'), { sourceType: 'module', plugins: ['jsx'] })).not.toThrow();
    expect(() => babel.parse(ler('App.jsx'), { sourceType: 'module', plugins: ['jsx'] })).not.toThrow();
  });
});
