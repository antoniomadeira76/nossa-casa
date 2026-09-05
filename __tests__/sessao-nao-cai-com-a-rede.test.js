/**
 * ⚠ Uma falha de REDE não termina a sessão. Só uma recusa do servidor o faz.
 *
 * ── O que aconteceu ─────────────────────────────────────────────────────────
 *
 * Em 05/09/2026 o servidor de casa parou a meio da tarde. A app perdeu a
 * sessão e voltou ao ecrã de entrada — e voltar a entrar exige a janela de
 * consentimento da Google, que é a conta do dono da casa e que mais ninguém
 * pode fazer por ele. Ficou de fora da própria app por causa de um processo
 * que se tinha desligado.
 *
 * Ao mesmo tempo descobriu-se o irmão do defeito: o token dos membros durava
 * cinco dias e NADA o renovava. Quem usasse a app todos os dias era expulso à
 * mesma, de cinco em cinco dias, para repetir a mesma janela.
 *
 * ── A regra ─────────────────────────────────────────────────────────────────
 *
 *   • 4xx  → o servidor VIU o token e recusou-o. Está morto, e a sessão acaba.
 *   • 0/5xx → não houve resposta. O token gravado continua bom e FICA.
 *
 * É a mesma distinção da fila de escritas (`esvaziar`), no sítio onde custa
 * mais: ali perde-se uma escrita, aqui perde-se a entrada na app.
 *
 * A decisão vive numa função pura de propósito — provar isto com um servidor a
 * sério obrigava a desligá-lo a meio das provas, que é exactamente o gesto que
 * causou o problema.
 */
const { terminaSessao } = require('../src/sessao');

describe('⚠ a sessão não cai por causa da rede', () => {
  it('⚠ sem resposta nenhuma, a sessão FICA', () => {
    // `status: 0` é o que o SDK do PocketBase põe quando o pedido nem chegou a
    // sair — servidor desligado, telemóvel sem rede, portátil a arrancar.
    expect(terminaSessao({ status: 0, message: 'Failed to fetch' })).toBe(false);
  });

  it('e um erro sem `status` também não a termina', () => {
    expect(terminaSessao(new Error('qualquer coisa'))).toBe(false);
    expect(terminaSessao(undefined)).toBe(false);
    expect(terminaSessao(null)).toBe(false);
  });

  it('⚠ o servidor a arder também não — isso passa', () => {
    // Um 500 é o servidor a falhar, não o token a ser mau. Expulsar alguém por
    // causa de um erro do servidor é castigá-lo por uma coisa que não fez.
    expect(terminaSessao({ status: 500 })).toBe(false);
    expect(terminaSessao({ status: 502 })).toBe(false);
    expect(terminaSessao({ status: 503 })).toBe(false);
  });

  it('⚠ mas um token RECUSADO termina-a — senão a app mentia', () => {
    // 401 é o servidor a dizer que aquele token já não vale. Guardá-lo era
    // deixar a app a insistir com uma credencial morta a cada arranque.
    expect(terminaSessao({ status: 401 })).toBe(true);
    expect(terminaSessao({ status: 403 })).toBe(true);
    expect(terminaSessao({ status: 404 })).toBe(true);
  });
});

describe('⚠ e o token renova-se, para o prazo nunca chegar', () => {
  const fs = require('fs');
  const path = require('path');
  const raiz = path.join(__dirname, '..');
  const cliente = fs.readFileSync(path.join(raiz, 'src/pocketbase.js'), 'utf8');
  const app = fs.readFileSync(path.join(raiz, 'App.jsx'), 'utf8');
  const colecoes = fs.readFileSync(path.join(raiz, 'db/pocketbase/criar-colecoes.mjs'), 'utf8');

  it('há um `authRefresh`, e é o `renovarSessao` que o faz', () => {
    expect(cliente).toMatch(/authRefresh\(\)/);
  });

  it('⚠ e o arranque da app CHAMA-O — senão não serve de nada', () => {
    // O `sessaoPronta` sozinho só LÊ o que está gravado; sem renovar, o prazo
    // chega na mesma. É a mesma forma das oito funções de escrita que ninguém
    // chamava.
    expect(app).toMatch(/servidor\.renovarSessao\(\)/);
  });

  it('o prazo do token está escrito, e não deixado ao acaso', () => {
    // Os cinco dias por omissão do PocketBase não foram uma decisão de
    // ninguém. Trinta são.
    expect(colecoes).toMatch(/const DURACAO_TOKEN = 30 \* 24 \* 60 \* 60/);
    // ⚠ E aplica-se também numa casa habitada: o `REGRAS_MEMBROS` é o único
    // caminho que a coleção percorre da segunda execução em diante.
    const i = colecoes.indexOf('const REGRAS_MEMBROS');
    expect(colecoes.slice(i, i + 500)).toMatch(/authToken: \{ duration: DURACAO_TOKEN \}/);
  });
});
