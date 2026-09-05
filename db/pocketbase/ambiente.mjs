// Ler o `.env.local` a partir de um script do Node.
//
// ── Porquê ───────────────────────────────────────────────────────────────────
//
// O Expo carrega o `.env.local` sozinho; o Node não. Os scripts daqui liam
// `process.env` e caíam no valor por omissão — `casa-de-testes-123` — que está
// escrito no código e **este repositório é público**.
//
// Enquanto o servidor só respondia em `127.0.0.1` isso era inofensivo: para usar
// aquela palavra-passe era preciso já estar dentro da máquina. Deixou de ser no
// dia em que o servidor passou a responder na rede de casa, para o telemóvel lhe
// chegar — aí qualquer aparelho na mesma Wi-Fi podia entrar como
// superutilizador com uma credencial publicada no GitHub.
//
// Com isto, `PB_ADMIN_PASS` vive no `.env.local`, que o `.gitignore` exclui, e
// os scripts continuam a correr sem preparação nenhuma.
//
// ⚠ O AMBIENTE ganha ao ficheiro: quem exporta a variável na consola está a ser
// explícito, e um ficheiro no disco não deve calar uma decisão dessas.
//
// O leitor já existia duas vezes — no `configurar-google.mjs` e no
// `diagnosticar-google.mjs` —, escrito à mão nas duas. É a mesma coisa em três
// sítios; passa a ser num.
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.join(import.meta.dirname, '..', '..');

const doFicheiro = (() => {
  try {
    return Object.fromEntries(fs.readFileSync(path.join(RAIZ, '.env.local'), 'utf8')
      .split(/\r?\n/)
      .filter(l => /^\s*[A-Z_][A-Z0-9_]*\s*=/.test(l))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
      }));
  } catch (e) {
    return {};                       // sem ficheiro: só o ambiente
  }
})();

export const doAmbiente = (chave) => process.env[chave] || doFicheiro[chave] || '';

// As credenciais do superutilizador, na ordem certa: ambiente, ficheiro, e por
// fim o valor de desenvolvimento — que só serve numa base acabada de criar.
export const SUPERUTILIZADOR = doAmbiente('PB_ADMIN') || 'admin@nossacasa.local';
export const SUPER_PALAVRA = doAmbiente('PB_ADMIN_PASS') || 'casa-de-testes-123';

// O endereço do servidor, para os scripts. `PB_URL` primeiro porque é o nome
// que eles já usavam; o `EXPO_PUBLIC_PB_URL` é o da app e serve de reserva, para
// não haver dois endereços a divergir no mesmo `.env.local`.
export const URL_DO_SERVIDOR = doAmbiente('PB_URL')
  || doAmbiente('EXPO_PUBLIC_PB_URL')
  || 'http://127.0.0.1:8095';
