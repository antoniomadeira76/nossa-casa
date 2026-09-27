/**
 * O ENDEREÇO QUE A CONSOLA LEVA — cada URL copiável da `docs/alexa.md` tem de
 * ir dar a um sítio que existe.
 *
 * ── Porque é que isto existe ─────────────────────────────────────────────────
 *
 * Porque a página esteve errada, e o erro era meu: dizia para apontar o
 * *endpoint* da skill a `https://casa.anossacasa.app`, sem caminho. Esse
 * endereço vai dar ao PocketBase, que não sabe responder a um envelope da
 * Alexa. A skill teria ficado publicada, a consola teria dado tudo por bom, e o
 * sintoma seria o altifalante calado — o pior sítio para se descobrir.
 *
 * Foi a segunda vez que um endereço escrito à mão num documento divergiu do que
 * a casa serve. À segunda vez não se remenda a frase: enumera-se.
 *
 * ── O que ele enumera ────────────────────────────────────────────────────────
 *
 * Os sítios de onde alguém COPIA: as linhas dentro de blocos de código e as
 * células de tabela. A prosa pode dizer «o casa.anossacasa.app» à vontade —
 * ninguém cola uma frase num formulário. Um bloco de código ou uma linha de
 * tabela é uma instrução.
 *
 * Cada endereço copiável tem de ter caminho, e cada caminho tem de bater com o
 * CÓDIGO — não com outra frase:
 *
 *   /api/…          tem de ser um `routerAdd` declarado nos hooks
 *   /alexa/skill    NÃO pode ser um `routerAdd` — é o serviço Node ao lado
 *
 * Assim, mudar o nome de uma rota e esquecer a página fica vermelho aqui, e
 * escrever um endereço que não existe também.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const PAGINA = 'docs/alexa.md';
const ANFITRIAO = 'casa.anossacasa.app';

const ler = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

// As rotas que o servidor da casa DECLARA. Lidas do código, e sem os
// comentários — um `routerAdd` citado dentro de um comentário não é uma rota.
const semComentarios = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

const rotasDeclaradas = () => {
  const dir = path.join(RAIZ, 'db/pocketbase/pb_hooks');
  const caminhos = new Set();
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.pb.js'))) {
    const t = semComentarios(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const m of t.matchAll(/routerAdd\(\s*['"](\w+)['"]\s*,\s*['"]([^'"]+)['"]/g)) {
      caminhos.add(m[2]);
    }
  }
  return caminhos;
};

// As linhas de onde se COPIA: dentro de ``` ou a começar por |.
const linhasCopiaveis = (texto) => {
  const saida = [];
  let dentro = false;
  texto.split(/\r?\n/).forEach((linha, i) => {
    if (/^\s*```/.test(linha)) { dentro = !dentro; return; }
    const tabela = /^\s*\|/.test(linha);
    if (dentro || tabela) saida.push({ n: i + 1, linha, onde: dentro ? 'bloco de código' : 'tabela' });
  });
  return saida;
};

describe('o endereço que a consola leva', () => {
  const texto = ler(PAGINA);

  it('a página nomeia o endereço público, e há linhas copiáveis para conferir', () => {
    // Um guarda que não lê nada passa sempre. Se a página mudar de nome ou o
    // anfitrião mudar, isto fica vermelho antes de as outras provas mentirem.
    expect(texto).toContain(ANFITRIAO);
    const copiaveis = linhasCopiaveis(texto).filter((l) => l.linha.includes(ANFITRIAO));
    expect(copiaveis.length).toBeGreaterThanOrEqual(4);
  });

  it('⚠ nenhum endereço copiável fica sem caminho', () => {
    // Foi exactamente isto que esteve errado: `https://casa.anossacasa.app` no
    // campo do endpoint, sem o `/alexa/skill`.
    const nus = linhasCopiaveis(texto)
      .filter((l) => l.linha.includes(ANFITRIAO))
      .flatMap((l) => [...l.linha.matchAll(new RegExp(`${ANFITRIAO.replace(/\./g, '\\.')}(\\S*)`, 'g'))]
        .map((m) => ({ ...l, resto: m[1] })))
      .filter(({ resto }) => !/^\/[A-Za-z]/.test(resto.replace(/[`|,.]+$/, '')))
      .map(({ n, onde, linha }) => `linha ${n} (${onde}): ${linha.trim()}`);
    expect(nus).toEqual([]);
  });

  it('⚠ e cada caminho bate com o que o CÓDIGO declara', () => {
    const declaradas = rotasDeclaradas();
    // Sem isto a prova a seguir pode ficar verde por não ter lido nada.
    expect(declaradas.size).toBeGreaterThanOrEqual(6);

    const erros = [];
    for (const l of linhasCopiaveis(texto)) {
      for (const m of l.linha.matchAll(new RegExp(`${ANFITRIAO.replace(/\./g, '\\.')}(/[^\\s\`|,)]*)`, 'g'))) {
        const caminho = m[1].replace(/[.,]+$/, '');
        if (caminho.startsWith('/api/')) {
          if (!declaradas.has(caminho)) {
            erros.push(`linha ${l.n}: «${caminho}» não é nenhum routerAdd dos hooks`);
          }
        } else if (caminho === '/alexa/skill') {
          // O contrário: se algum dia isto virasse rota do PocketBase, a
          // explicação toda desta página passava a estar errada.
          if (declaradas.has(caminho)) {
            erros.push(`linha ${l.n}: «${caminho}» virou rota do PocketBase — o endpoint deixou de ser o serviço Node`);
          }
        } else {
          erros.push(`linha ${l.n}: «${caminho}» não é nem rota da casa nem o endpoint da skill`);
        }
      }
    }
    expect(erros).toEqual([]);
  });

  it('⚠ e as portas do desenho são as que o serviço usa mesmo', () => {
    // O desenho da página diz `8094 → 8095`. São os valores por omissão do
    // serviço, e se um deles mudar no código a página fica a mentir.
    const servico = ler('alexa/servidor-da-skill.mjs');
    const porta = servico.match(/ALEXA_PORTA\s*\|\|\s*(\d+)/);
    const casa = servico.match(/ALEXA_CASA\s*\|\|\s*'http:\/\/127\.0\.0\.1:(\d+)'/);
    expect(porta && porta[1]).toBe('8094');
    expect(casa && casa[1]).toBe('8095');
    expect(texto).toContain('8094');
    expect(texto).toContain('8095');
  });
});
