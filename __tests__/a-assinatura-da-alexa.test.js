/**
 * A ASSINATURA DA ALEXA — a verificação que deixa entrar quem é ela, e mais ninguém.
 *
 * ── Porque é que isto é um serviço à parte ───────────────────────────────────
 *
 * Um endpoint HTTPS de uma skill TEM de verificar a assinatura de cada pedido:
 * a cadeia de certificados a partir de `s3.amazonaws.com/echo.api/`, o nome
 * alternativo `echo-api.amazon.com`, a validade, uma tolerância de 150 segundos
 * no relógio, e a assinatura SHA-256 sobre o corpo em BYTES.
 *
 * O JSVM do PocketBase não faz nada disso — não tem X.509, não tem RSA, não tem
 * cadeia de confiança. Por isso o endpoint é um processo Node à parte
 * (`alexa/servidor-da-skill.mjs`), e as rotas da casa não mudaram.
 *
 * ── Porque é que há um certificado guardado ao lado ──────────────────────────
 *
 * Porque isto só se prova contra uma cadeia a sério. O `alexa/amostras/` tem o
 * certificado PÚBLICO da Amazon, expirado de propósito — serve para provar as
 * duas coisas: que a validade é conferida (com o relógio de hoje) e que a
 * cadeia encaixa e chega a uma raiz do sistema (com o relógio dentro da janela
 * dele).
 *
 * ⚠ E foi ele que apanhou o defeito. A primeira versão subia até ao TOPO da
 * cadeia antes de procurar a raiz — e o topo da cadeia verdadeira é um
 * *cross-sign* que não está no arquivo do sistema. O âncora está um elo antes.
 * Escrita assim, a verificação recusava TODOS os pedidos da Amazon, e isso só
 * se descobriria com a skill publicada e o altifalante calado.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.join(__dirname, '..');
const AMOSTRA = path.join(RAIZ, 'alexa/amostras/cadeia-da-alexa.pem');

// As funções puras vivem num .cjs partilhado — ver o cabeçalho dele. O Jest
// faz-lhe require direto, sem truque nenhum.
const V = require(path.join(RAIZ, "alexa/verificacao.cjs"));
const carregar = async () => V;

const certsDaAmostra = () => (fs.readFileSync(AMOSTRA, 'utf8')
  .match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) || [])
  .map((p) => new crypto.X509Certificate(p));

describe('a assinatura da Alexa', () => {
  it('a amostra está lá, e é a cadeia de quatro elos da Amazon', () => {
    // Um guarda que não lê nada passa sempre.
    const certs = certsDaAmostra();
    expect(certs.length).toBe(4);
    expect(certs[0].subject).toContain('echo-api.amazon.com');
    expect(certs[0].checkHost('echo-api.amazon.com')).toBe('echo-api.amazon.com');
  });

  it('⚠ a cadeia verdadeira é aceite — até ao PRIMEIRO âncora, não até ao topo', async () => {
    const { cadeiaDeConfianca } = await carregar();
    const certs = certsDaAmostra();
    // Um instante em que a folha era válida: o que se prova aqui é a LIGAÇÃO e
    // a raiz, sem a validade a tapar o resultado.
    const dentro = new Date(new Date(certs[0].validFrom).getTime() + 24 * 3600 * 1000);
    expect(cadeiaDeConfianca(certs, dentro)).toBeNull();
  });

  it('⚠ e recusa-a de cinco maneiras', async () => {
    const { cadeiaDeConfianca } = await carregar();
    const certs = certsDaAmostra();
    const dentro = new Date(new Date(certs[0].validFrom).getTime() + 24 * 3600 * 1000);

    const casos = [
      ['hoje, com a folha expirada em 2023', cadeiaDeConfianca(certs, new Date())],
      ['só a folha, sem o resto', cadeiaDeConfianca([certs[0]], dentro)],
      ['a cadeia fora de ordem', cadeiaDeConfianca([certs[0], certs[2], certs[1], certs[3]], dentro)],
      ['vazia', cadeiaDeConfianca([], dentro)],
      ['sem cadeia nenhuma', cadeiaDeConfianca(null, dentro)],
    ];
    const aceites = casos.filter(([, r]) => r === null).map(([q]) => q);
    expect(aceites).toEqual([]);
  });

  it('⚠ o endereço da cadeia tem de ser o da Amazon — dez casos', async () => {
    const { enderecoDaCadeiaValido } = await carregar();
    // Quem escolhe de onde se descarrega o certificado escolhe quem assina.
    const CASOS = [
      ['https://s3.amazonaws.com/echo.api/echo-api-cert.pem', true, 'o verdadeiro'],
      ['https://S3.AMAZONAWS.COM/echo.api/x.pem', true, 'maiúsculas'],
      ['https://s3.amazonaws.com/echo.api/../evil/cert.pem', false, 'a subir com ..'],
      ['http://s3.amazonaws.com/echo.api/x.pem', false, 'sem TLS'],
      ['https://s3.amazonaws.com.evil.pt/echo.api/x', false, 'anfitrião colado'],
      ['https://evil.pt/echo.api/x.pem', false, 'outro anfitrião'],
      ['https://s3.amazonaws.com/outra/x.pem', false, 'outro caminho'],
      ['https://s3.amazonaws.com:8443/echo.api/x', false, 'outra porta'],
      ['https://evil.pt@s3.amazonaws.com/echo.api/x', false, 'o truque do arroba'],
      ['', false, 'vazio'],
    ];
    const errados = CASOS
      .filter(([u, esperado]) => enderecoDaCadeiaValido(u) !== esperado)
      .map(([u, esperado, porque]) => `${porque}: esperava ${esperado} — ${u}`);
    expect(errados).toEqual([]);
  });

  it('⚠ e a janela do relógio é de 150 segundos, para os dois lados', async () => {
    const { relogioAceite } = await carregar();
    // Um relógio adiantado é tão suspeito como um atrasado: é uma gravação a
    // ser repetida mais tarde, ou uma forjada com data do futuro.
    const agora = Date.parse('2026-09-27T21:00:00Z');
    const CASOS = [
      ['2026-09-27T21:00:00Z', true, 'à hora'],
      ['2026-09-27T20:57:31Z', true, '149 segundos atrás'],
      ['2026-09-27T20:57:29Z', false, '151 segundos atrás'],
      ['2026-09-27T21:02:31Z', false, '151 segundos à frente'],
      ['nao-e-data', false, 'não é data'],
      ['', false, 'vazio'],
    ];
    const errados = CASOS
      .filter(([t, esperado]) => relogioAceite(t, agora) !== esperado)
      .map(([t, esperado, porque]) => `${porque}: esperava ${esperado} — «${t}»`);
    expect(errados).toEqual([]);
  });

  it('⚠ a assinatura é sobre os BYTES do corpo, e um byte mudado chumba', async () => {
    // ⚠ Reconstruir o corpo a partir do objecto já analisado muda-o — a ordem
    // das chaves, os espaços — e a assinatura deixa de bater por uma razão que
    // ninguém encontra. Por isso o serviço guarda os bytes tal como chegaram.
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const corpo = Buffer.from('{"version":"1.0","request":{"type":"IntentRequest"}}', 'utf8');
    const assinatura = crypto.sign('RSA-SHA256', corpo, privateKey);

    expect(crypto.verify('RSA-SHA256', corpo, publicKey, assinatura)).toBe(true);

    const mudado = Buffer.from(corpo);
    mudado[mudado.length - 2] = mudado[mudado.length - 2] ^ 1;
    expect(crypto.verify('RSA-SHA256', mudado, publicKey, assinatura)).toBe(false);

    // E outra chave não serve, por mais bem formado que o resto esteja.
    const outra = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    expect(crypto.verify('RSA-SHA256', corpo, outra.publicKey, assinatura)).toBe(false);
  });

  it('⚠ e o mapa de intenções é o que está no modelo, e mais nada', async () => {
    const { ROTAS } = await carregar();
    const modelo = JSON.parse(fs.readFileSync(path.join(RAIZ, 'alexa/modelo-de-interacao.pt-BR.json'), 'utf8'));
    const nossas = modelo.interactionModel.languageModel.intents
      .map((i) => i.name)
      .filter((n) => !n.startsWith('AMAZON.'));
    // Uma intenção no modelo sem rota aqui é um pedido que a Alexa aceita e a
    // casa não sabe fazer — e o altifalante diz «não percebi» sem se perceber
    // porquê. Uma rota aqui sem intenção no modelo é código morto.
    expect(Object.keys(ROTAS).sort()).toEqual(nossas.sort());
  });

  it('⚠ e o modelo é COLÁVEL na consola: só `interactionModel` no topo', () => {
    // A consola valida contra o esquema dela, e uma chave que ela não conheça é
    // um erro à frente de quem está a colar. As razões vivem no
    // `alexa/PORQUE-ASSIM.md`, que é onde podem ser escritas em português.
    const modelo = JSON.parse(fs.readFileSync(path.join(RAIZ, 'alexa/modelo-de-interacao.pt-BR.json'), 'utf8'));
    expect(Object.keys(modelo)).toEqual(['interactionModel']);
  });
});
