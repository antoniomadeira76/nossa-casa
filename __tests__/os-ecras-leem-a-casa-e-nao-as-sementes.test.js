/**
 * ⚠ Um ecrã lê a lista DA CASA, nunca as sementes do `data.js`.
 *
 * ── O defeito, e é de dinheiro ───────────────────────────────────────────────
 *
 * O `Dinheiro.jsx` lia o `ENV_BASE` — os quatro envelopes da demonstração — em
 * cinco sítios. Esta casa tem seis, com outros nomes.
 *
 * E não é só mostrar nomes errados. Duas listas, indexadas pelo MESMO número:
 *
 *     {ENV_BASE.map((e, i) => <Pressable onPress={() => setExp({ env: i })} …
 *     registarDespesa({ envelope: envelopes[exp.env].name, … })
 *
 * Escolhia-se «Casa & contas» na lista da demonstração e a despesa era lançada
 * no que estivesse nesse lugar na lista da casa. Com seis e quatro envelopes,
 * os lugares nem correspondem: tocar no primeiro movia dinheiro de
 * «Transportes».
 *
 * Aconteceu em três sítios ao mesmo tempo — registar despesa, mover dinheiro
 * entre envelopes, e abrir o mês seguinte — e é dinheiro a sério no envelope
 * errado, sem erro nenhum.
 *
 * ── Porque é que nenhuma prova o via ─────────────────────────────────────────
 *
 * Porque as 1429 provas de então corriam com a casa de demonstração, onde as
 * duas listas são A MESMA. O defeito é invisível enquanto a casa for a do
 * `data.js` — e aparece no dia em que uma família a sério cria os seus
 * envelopes. Foi assim que se viu: a semear a casa e a abrir o ecrã.
 *
 * É a mesma forma dos «nomes escritos à mão» que este projeto já corrigiu no
 * `podeVerSaude`, na rotação das tarefas e em seis listas de membros.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const conteudo = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
// Tira os comentários SEM perder as linhas — senão os números que a prova
// aponta não são os do ficheiro, e mandam quem os lê para o sítio errado.
const semComentarios = (t) => t
  .replace(/\{?\/\*[\s\S]*?\*\/\}?/g, (m) => m.replace(/[^\n]/g, ''))
  .replace(/^(\s*)\/\/.*$/gm, '$1');

// As sementes que o `data.js` exporta e que são LISTAS DA CASA — coisas que
// uma família cria, edita e apaga. Tiradas do próprio ficheiro, para a próxima
// que alguém acrescentar ficar coberta.
//
// Ficam de fora as que NÃO são da casa: `SECTIONS` são as secções de uma loja
// (forma da app), `DE` são as preposições da língua, `ROLES` os papéis
// possíveis, e `GOALS` as metas, que ainda não vivem no servidor.
const DA_CASA = ['ENV_BASE', 'TASKS', 'ITEMS', 'EVENTS', 'EQUIP', 'MEMBERS', 'HEALTH', 'HEALTH_DOCS', 'VAULT'];

const ECRAS = fs.readdirSync(path.join(RAIZ, 'src', 'screens'))
  .filter(f => f.endsWith('.jsx')).map(f => `src/screens/${f}`)
  .concat(fs.readdirSync(path.join(RAIZ, 'src', 'sheets'))
    .filter(f => f.endsWith('.jsx')).map(f => `src/sheets/${f}`));

// ⚠ As excepções trazem a razão. Uma lista de excepções sem porquê é uma lista
// de defeitos por descobrir.
const EXCECOES = {
  // O ecrã de entrada corre ANTES de haver casa: não há sessão, não há
  // servidor lido, e o `s.membros` ainda é o que estiver gravado. Ele usa o
  // quadro da loja e não o `data.js` — está aqui só porque importa o `MEMBERS`
  // como valor por omissão do próprio quadro.
  'src/screens/Login.jsx': 'corre antes de haver casa lida',
};

describe('⚠ nenhum ecrã desenha a partir das sementes', () => {
  it('há sementes e ecrãs para conferir', () => {
    const dados = conteudo('src/data.js');
    for (const n of DA_CASA) expect(dados).toMatch(new RegExp(`export const ${n}\\b`));
    expect(ECRAS.length).toBeGreaterThan(15);
  });

  it('⚠ e nenhum as percorre com `.map` nem as indexa', () => {
    // ⚠ Só conta o que o ficheiro IMPORTA do `data.js`.
    //
    // Metade dos ecrãs faz `const { membros: MEMBERS } = useStore()` — o
    // `MEMBERS` deles é o quadro DA CASA, e está certo. A primeira versão
    // desta prova apanhou-os a todos e apontou dezasseis defeitos que não
    // existiam. O que distingue um do outro é a linha de importação.
    const soltas = [];
    for (const f of ECRAS) {
      if (EXCECOES[f]) continue;
      const texto = semComentarios(conteudo(f));
      const importa = new Set();
      for (const m of texto.matchAll(/import \{([^}]*)\} from '\.\.?\/data'/g)) {
        for (const n of m[1].split(',')) importa.add(n.trim().split(/\s+as\s+/).pop());
      }
      if (!importa.size) continue;

      texto.split(/\r?\n/).forEach((linha, i) => {
        if (/^\s*import\b/.test(linha)) return;
        for (const semente of DA_CASA) {
          if (!importa.has(semente)) continue;
          // `ENV_BASE.map(`, `ENV_BASE.forEach(`, `ENV_BASE[i]`, `ENV_BASE.length`
          const re = new RegExp(`\\b${semente}\\s*(?:\\.(?:map|forEach|filter|find|length)\\b|\\[)`);
          if (re.test(linha)) soltas.push(`${f}:${i + 1}  ${semente}`);
        }
      });
    }
    expect(soltas).toEqual([]);
  });
});

describe('e o Dinheiro em particular, que era onde doía', () => {
  const ecra = semComentarios(conteudo('src/screens/Dinheiro.jsx'));

  it('⚠ a lista que se ESCOLHE e a que se APLICA são a mesma', () => {
    // O que se aplica: `envelopes[exp.env].name` e `envelopes[mv.from].name`.
    expect(ecra).toMatch(/envelopes\[exp\.env\]\.name/);
    expect(ecra).toMatch(/envelopes\[mv\.from\]\.name/);
    // E o que se escolhe tem de vir do mesmo sítio.
    expect(ecra).toMatch(/\{envelopes\.map\(\(e, i\) =>/);
    expect(ecra).toMatch(/<GrelhaEnvelopes t=\{t\} envelopes=\{envelopes\}/);
  });

  it('e abrir o mês distribui pelos envelopes da casa', () => {
    expect(ecra).toMatch(/envelopes\.forEach\(e => \{/);
  });

  it('e o ecrã já nem importa as sementes de envelopes', () => {
    expect(conteudo('src/screens/Dinheiro.jsx')).not.toMatch(/import \{[^}]*ENV_BASE/);
  });
});
