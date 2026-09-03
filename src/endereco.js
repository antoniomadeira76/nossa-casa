// Onde é que a saúde pode ir.
//
// ── Porquê um ficheiro só para isto ──────────────────────────────────────────
//
// Porque é uma REGRA, e uma regra que só se verifica a olho não é uma regra —
// é uma esperança. Igual ao `podeVerSaude` da loja: pura, sem importar nada, e
// portanto provável sem React, sem servidor e sem o SDK do PocketBase.
//
// A primeira versão vivia dentro do `src/sync.js`. As provas não conseguiam
// chegar-lhe: importar o `sync` arrasta o `pocketbase`, que é ESM, e o jest
// desta app não o transforma. Uma regra que não se consegue provar por estar
// no ficheiro errado é o ficheiro errado.
//
// ── A decisão que ela codifica ───────────────────────────────────────────────
//
// O travão da saúde era um «não» inteiro. Passou a ser uma condição, porque a
// decisão do dono da casa foi condicional: «o servidor fica na minha máquina
// por agora» (03/09/2026).
//
// Enquanto o servidor vive na casa, os cinco pontos de conformidade do
// db/postgres/README.md colapsam: não há subcontratante para contratar, não há
// política a publicar para titulares que não existem fora do lar, e o RGPD tem
// uma exclusão para actividade puramente pessoal ou doméstica. Não é uma
// manobra — é o âmbito do regulamento.
//
// ⚠ «Por agora» quer dizer que isto muda. Se a condição vivesse numa nota, o
// dia em que o servidor fosse para a internet passaria sem ninguém voltar a
// esta conversa, e a saúde continuaria a subir. Aqui, deixa de subir sozinha.

// O que conta como «de casa»: o próprio dispositivo, a rede local, ou um nome
// mDNS que só existe nela. Um nome que não acabe em `.local` é a internet, e a
// dúvida resolve-se sempre para o lado de NÃO subir.
// O anfitrião de um endereço, sem `new URL`.
//
// ⚠ E é uma correção, não uma preferência. A primeira versão usava
// `new URL(url).hostname`, e o React Native não tem um `URL` completo — no
// ambiente dos testes desta app não tem nenhum: `new URL('http://127.0.0.1')`
// atira «TextEncoder is not defined». Com o `try/catch` a devolver falso pelo
// lado seguro, o efeito era a saúde NUNCA subir no telemóvel, que é onde a
// família a usa — e o lado seguro escondia o defeito em vez de o mostrar.
//
// Exige esquema de propósito: um endereço sem `http://` não se sabe ler, e o
// que não se sabe ler não é casa. O `[^@/]*@` deixa passar utilizador e senha
// no endereço sem os confundir com o anfitrião; os rectos apanham IPv6.
const hostDe = (url) => {
  const m = String(url).match(/^[a-z][a-z0-9+.\-]*:\/\/(?:[^@/]*@)?(\[[^\]]+\]|[^/?#:]+)/i);
  return m ? m[1].toLowerCase() : null;
};

export const eEnderecoDeCasa = (url) => {
  if (!url) return false;
  let host = hostDe(url);
  if (!host) return false;
  host = host.replace(/^\[/, '').replace(/\]$/, '');        // IPv6 entre rectos

  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host === '::1') return true;
  if (host.endsWith('.local')) return true;                 // mDNS da rede de casa

  // ⚠ Por partes, e não por prefixo de texto: `192.168.1.5.exemplo.com` começa
  // por «192.168.» e é um nome na internet.
  const partes = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!partes) return false;
  if (partes.slice(1).some(n => Number(n) > 255)) return false;
  const [a, b] = [Number(partes[1]), Number(partes[2])];
  if (a === 127) return true;                               // 127.0.0.0/8
  if (a === 10) return true;                                // 10/8
  if (a === 172 && b >= 16 && b <= 31) return true;          // 172.16/12
  if (a === 192 && b === 168) return true;                   // 192.168/16
  if (a === 169 && b === 254) return true;                   // ligação local
  return false;
};

export const PORQUE_NAO_SOBE =
  'A saúde não sai deste dispositivo para um servidor fora de casa: cinco '
  + 'pontos de conformidade por resolver (db/postgres/README.md). São dados '
  + 'clínicos de menores.';
