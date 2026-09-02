/**
 * A app publicada tem de arrancar no endereço onde vive.
 *
 * ── O defeito ────────────────────────────────────────────────────────────────
 *
 * O site esteve a servir um ECRÃ EM BRANCO. A página respondia 200, pintava a
 * cor de fundo, e mais nada.
 *
 * O GitHub Pages serve isto numa página de PROJETO — `…github.io/nossa-casa/`
 * — e o `expo export` emitia os caminhos a partir da raiz:
 *
 *     pedido   /_expo/static/js/web/AppEntry-….js     404
 *     existe   /nossa-casa/_expo/static/js/web/…      200
 *
 * O pacote da app nunca chegava a carregar. Nada nas provas o apanhava, porque
 * nenhuma delas construía a versão publicada — e a CI dava verde, porque `npm
 * test` passa e o `expo export` não falha por emitir caminhos errados.
 *
 * ── E porque não basta fixar /nossa-casa/ ────────────────────────────────────
 *
 * Porque em desenvolvimento a app vive na raiz. Um caminho absoluto só pode
 * servir um dos dois endereços; o `experiments.baseUrl` resolve o que o Expo
 * gera, e o que está escrito à mão em `public/` tem de ser RELATIVO — resolve
 * contra o documento que o pediu, e serve os dois.
 *
 * Verificado a servir o `dist` debaixo de `/nossa-casa/`: a app arrancou e o
 * ecrã de entrada apareceu, sem um erro na consola.
 */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const ler = (f) => fs.readFileSync(path.join(raiz, f), 'utf8');

describe('o que o Expo gera', () => {
  const app = JSON.parse(ler('app.json'));

  it('⚠ tem `experiments.baseUrl`, e é o nome do repositório', () => {
    // Sem isto, o `<script src>` do index.html sai a apontar para a raiz.
    expect(app.expo.experiments).toBeDefined();
    expect(app.expo.experiments.baseUrl).toBe('/nossa-casa');
  });

  it('e o baseUrl concorda com o `slug`', () => {
    // O endereço da página de projeto é o nome do repositório. O `slug` é o
    // que mais perto está dele neste ficheiro; se um mudar sem o outro, o
    // site volta a servir um ecrã branco.
    expect(app.expo.experiments.baseUrl).toBe(`/${app.expo.slug}`);
  });

  it('⚠ e o `web` não guarda um startUrl/scope próprios', () => {
    // Só valem quando NÃO há `public/manifest.json` — e há. Duas verdades
    // sobre a mesma coisa acabam a discordar.
    expect(app.expo.web.startUrl).toBeUndefined();
    expect(app.expo.web.scope).toBeUndefined();
  });
});

describe('o que está escrito à mão em public/', () => {
  // O Expo copia estes ficheiros tal e qual: o `baseUrl` não lhes toca.
  const ABSOLUTOS = /(?:href|src)="\/[^/]/;

  it('⚠ o index.html não pede nada a partir da raiz', () => {
    const html = ler('public/index.html');
    const maus = [...html.matchAll(/(?:href|src)="(\/[^/"][^"]*)"/g)].map(m => m[1]);
    expect(maus).toEqual([]);
  });

  it('o manifesto abre onde está, e não na raiz', () => {
    // `.` resolve contra o próprio manifesto: no site é /nossa-casa/, em
    // desenvolvimento é /. Uma app instalada abre onde foi instalada.
    const m = JSON.parse(ler('public/manifest.json'));
    expect(m.start_url).toBe('.');
    expect(m.scope).toBe('.');
  });

  it('e os ícones do manifesto são relativos', () => {
    const m = JSON.parse(ler('public/manifest.json'));
    const absolutos = m.icons.filter(i => i.src.startsWith('/'));
    expect(absolutos).toEqual([]);
    expect(m.icons.length).toBeGreaterThan(0);
  });
});

describe('a CI publica o que constrói', () => {
  const wf = ler('.github/workflows/deploy.yml');

  it('constrói antes de publicar', () => {
    // Uma versão anterior publicava `./dist` sem nunca o construir — e o
    // `dist/` está no .gitignore, portanto em CI não existia.
    expect(wf).toMatch(/expo export --platform web/);
    expect(wf.indexOf('expo export')).toBeLessThan(wf.indexOf('upload-pages-artifact'));
  });

  it('e corre as provas antes de construir', () => {
    expect(wf).toMatch(/needs: testes/);
    expect(wf).toMatch(/npm test/);
  });
});
