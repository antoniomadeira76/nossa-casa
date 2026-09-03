/**
 * A saúde sobe — mas só para um servidor que viva na casa.
 *
 * ── A decisão ────────────────────────────────────────────────────────────────
 *
 * O travão da saúde era um «não» inteiro: o `recusaSaude` rebentava sempre. A
 * decisão do dono da casa, em 03/09/2026, foi condicional — «o servidor fica na
 * minha máquina POR AGORA».
 *
 * Enquanto o servidor vive na casa, os cinco pontos do db/postgres/README.md
 * colapsam: não há subcontratante para contratar, não há política a publicar
 * para titulares que não existem fora do lar, e o RGPD tem uma exclusão para
 * actividade puramente pessoal ou doméstica. Não é uma manobra — é o âmbito do
 * regulamento.
 *
 * ⚠ «Por agora» quer dizer que isto muda. Se a condição vivesse numa nota, o
 * dia em que o servidor fosse para a internet passaria sem ninguém voltar a
 * esta conversa, e a saúde continuaria a subir. Em código, deixa de subir
 * sozinha.
 *
 * ── Onde a regra vive, e porquê ──────────────────────────────────────────────
 *
 * ⚠ Em `src/endereco.js`, e não no `src/sync.js`. Importar o sync arrasta o
 * SDK do PocketBase, que é ESM e que o jest desta app não transforma — a
 * primeira versão desta prova rebentou por isso. Uma regra que não se consegue
 * provar por estar no ficheiro errado é o ficheiro errado.
 *
 * O comportamento a correr — a fila, o servidor, a recusa real — prova-se em
 * `db/pocketbase/provar-cliente.mjs`. Aqui prova-se a regra, exaustivamente, e
 * que o travão a CHAMA em vez de a repetir.
 */
const fs = require('fs');
const path = require('path');
const { eEnderecoDeCasa, PORQUE_NAO_SOBE } = require('../src/endereco');

const ler = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const sync = ler('src/sync.js');

describe('o que conta como um servidor de casa', () => {
  const deCasa = [
    'http://127.0.0.1:8095',            // o próprio dispositivo
    'http://localhost:8095',
    'https://localhost',
    'http://127.1.2.3:8095',            // 127.0.0.0/8 inteiro
    'http://[::1]:8095',                // IPv6 do próprio
    'http://192.168.1.5:8095',          // a rede de casa
    'http://192.168.0.1',
    'http://10.0.0.7:8095',             // 10/8
    'http://172.16.0.9',                // 172.16/12, na borda de baixo
    'http://172.31.255.254',            // e na de cima
    'http://169.254.10.20',             // ligação local
    'http://casa.local:8095',           // mDNS: o nome que o telefone vê
    'http://Casa.LOCAL:8095',           // e em maiúsculas
  ];
  it.each(deCasa)('%s é de casa', (url) => {
    expect(eEnderecoDeCasa(url)).toBe(true);
  });
});

describe('⚠ e o que NÃO conta, mesmo parecendo', () => {
  const foraDeCasa = [
    ['http://nossa-casa.pt', 'um nome na internet'],
    ['https://api.exemplo.com:8095', 'outro'],
    ['http://192.168.1.5.exemplo.com', 'COMEÇA por 192.168. e é um nome público'],
    ['http://10.0.0.7.evil.pt', 'o mesmo truque com 10/8'],
    ['http://127.0.0.1.attacker.net', 'e com o próprio dispositivo'],
    ['http://172.15.0.1', 'um a menos do que 172.16 — fora do bloco privado'],
    ['http://172.32.0.1', 'um a mais do que 172.31 — também fora'],
    ['http://192.169.1.1', 'parecido com 192.168 e não é'],
    ['http://11.0.0.1', 'parecido com 10/8 e não é'],
    ['http://8.8.8.8', 'público, sem disfarce'],
    ['http://999.1.1.1', 'nem é um endereço'],
    ['http://exemplo.localhost.pt', 'tem «localhost» pelo meio'],
    ['http://local', 'é «local» e não acaba em «.local»'],
    ['127.0.0.1:8095', 'sem esquema: não se sabe ler, portanto não sobe'],
  ];
  it.each(foraDeCasa)('%s — %s', (url) => {
    expect(eEnderecoDeCasa(url)).toBe(false);
  });

  it('e a ausência de endereço também não é casa', () => {
    for (const v of [null, undefined, '', 0, false]) expect(eEnderecoDeCasa(v)).toBe(false);
  });
});

describe('⚠ o travão existe, e chama a regra em vez de a repetir', () => {
  it('o `saudeSincroniza` exige ligação E endereço de casa', () => {
    expect(sync).toMatch(/export const saudeSincroniza = \(\) =>\s*ligado\(\) && eEnderecoDeCasa\(servidor\.enderecoDoServidor\(\)\)/);
  });

  it('e o `recusaSaude` pergunta-lhe, para as duas coleções', () => {
    const i = sync.indexOf('export function recusaSaude');
    expect(i).toBeGreaterThan(0);
    const bloco = sync.slice(i, i + 320);
    expect(bloco).toContain("colecao === 'episodios_saude' || colecao === 'anexos'");
    expect(bloco).toMatch(/if \(!saudeSincroniza\(\)\) throw new Error\(PORQUE_NAO_SOBE\)/);
  });

  it('⚠ e a escrita de um episódio passa pelo travão ANTES de tocar na fila', () => {
    const i = sync.indexOf('export async function episodioDeSaude');
    expect(i).toBeGreaterThan(0);
    const bloco = sync.slice(i, i + 500);
    expect(bloco).toContain("recusaSaude('episodios_saude')");
    expect(bloco.indexOf("recusaSaude('episodios_saude')"))
      .toBeLessThan(bloco.indexOf('servidor.escrever.criar'));
  });

  it('a loja não repete a condição — delega no sync', () => {
    // Duas ideias da mesma regra acabam sempre com a segunda mais fraca. É o
    // mesmo erro que o `podeVer` da Saúde já teve, e está escrito lá.
    const loja = ler('src/store.jsx');
    const i = loja.indexOf('const addHealthRecord');
    const bloco = loja.slice(i, i + 1600);
    expect(bloco).toContain('sync.episodioDeSaude(');
    expect(bloco).not.toContain('eEnderecoDeCasa');
    expect(bloco).not.toContain('EXPO_PUBLIC_PB_URL');
  });

  it('e um episódio sobe pela FILA, como o dinheiro — não direto', () => {
    // Uma consulta marcada no corredor do hospital, sem rede, não se perde.
    const i = sync.indexOf('export async function episodioDeSaude');
    expect(sync.slice(i, i + 500)).toContain('escrever.criar');
  });
});

describe('o que continua a nunca subir', () => {
  const bloco = sync.slice(sync.indexOf('export const NUNCA_SINCRONIZA'),
    sync.indexOf('export const ligado'));

  it('⚠ os documentos e as notas ficam, mesmo com o servidor em casa', () => {
    // Um documento leva ficheiro anexo, e um ficheiro clínico de menor é a
    // peça de que os cinco pontos mais falam. Sobe a consulta; o que está
    // pendurado nela, não.
    for (const k of ['healthNotes', 'healthRecipes', 'healthDecisions', 'healthDocs', 'healthGone']) {
      expect(bloco).toContain(`'${k}'`);
    }
  });

  it('e o `health` saiu da lista, porque agora sobe sob condição', () => {
    expect(bloco).not.toMatch(/'health'/);
  });

  it('a frase da recusa diz o porquê e onde ler mais', () => {
    expect(PORQUE_NAO_SOBE).toMatch(/cinco pontos/);
    expect(PORQUE_NAO_SOBE).toMatch(/db\/postgres\/README\.md/);
    expect(PORQUE_NAO_SOBE).toMatch(/menores/);
  });
});

describe('⚠ e a regra não depende de um `URL` que o telemóvel pode não ter', () => {
  // ⚠ Sem os comentários. A primeira versão desta prova falhou por apanhar o
  // `new URL(` que está no comentário a EXPLICAR porque é que ele saiu — uma
  // prova a medir o texto em vez do código.
  const endereco = ler('src/endereco.js')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '');

  it('não usa `new URL`', () => {
    // A primeira versão usava, e o React Native não tem um `URL` completo —
    // no ambiente destes testes não tem nenhum: «TextEncoder is not defined».
    // Com o try/catch a devolver falso pelo lado seguro, o efeito era a saúde
    // NUNCA subir no telemóvel. Um lado seguro que esconde o defeito em vez de
    // o mostrar é pior do que um erro.
    expect(endereco).not.toMatch(/new URL\(/);
  });

  it('nem de qualquer outra coisa — o ficheiro não importa nada', () => {
    // É o que o torna provável sem React, sem servidor e sem SDK.
    expect(endereco).not.toMatch(/^\s*(import|require)\b/m);
  });
});
