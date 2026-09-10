/**
 * O «hoje» da app muda sem recarregar — e sem reiniciar a sessão.
 *
 * ── O que se viu ─────────────────────────────────────────────────────────────
 *
 * `TODAY` e `TODAY_KEY` eram lidos UMA vez, ao carregar o módulo. A app
 * deixada aberta de um dia para o outro dizia «Quarta, 09/09» na quinta
 * (10/09/2026), e a única saída era recarregar — o que, a quem entrou pela
 * Google, pode custar a sessão.
 *
 * ── A propriedade ────────────────────────────────────────────────────────────
 *
 * `atualizarHoje()` volta a ler o relógio e, se o dia mudou, mexe no `TODAY`
 * POR DENTRO (mesma referência) e volta a atribuir o `TODAY_KEY` — que é um
 * `export let`, uma ligação viva: quem o importou lê o valor novo. O `App.jsx`
 * chama-o a cada meio minuto e quando a janela volta à frente, e volta a
 * desenhar quando ele diz que mudou.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');

describe('⚠ o «hoje» muda sem recarregar', () => {
  // Cada prova carrega o módulo de fresco: o `TODAY` é estado partilhado.
  const fresco = () => { jest.resetModules(); return require('../src/format'); };

  it('`TODAY` muda POR DENTRO — a referência é a mesma, os valores são os novos', () => {
    const f = fresco();
    const antes = f.TODAY;
    const mudou = f.atualizarHoje(new Date(2031, 4, 17, 12));
    expect(mudou).toBe(true);
    expect(f.TODAY).toBe(antes);
    expect(f.TODAY).toEqual({ y: 2031, m: 4, d: 17 });
  });

  it('`TODAY_KEY` é uma ligação VIVA — quem o importou lê o valor novo', () => {
    const f = fresco();
    // Outro módulo que importa o `TODAY_KEY` — o `Inicio`, por exemplo — lê-o
    // pelo módulo, como o Babel compila `import { TODAY_KEY }`.
    const outro = require('../src/format');
    const antigo = outro.TODAY_KEY;
    f.atualizarHoje(new Date(2031, 4, 17, 12));
    expect(outro.TODAY_KEY).not.toBe(antigo);
    expect(outro.TODAY_KEY).toBe(f.dkey(2031, 4, 17));
  });

  it('no mesmo dia não muda nada, e diz que não mudou', () => {
    const f = fresco();
    const mesmo = new Date(f.TODAY.y, f.TODAY.m, f.TODAY.d, 15);
    const chave = f.TODAY_KEY;
    expect(f.atualizarHoje(mesmo)).toBe(false);
    expect(f.TODAY_KEY).toBe(chave);
  });

  it('com o dia FIXADO (`EXPO_PUBLIC_HOJE`) o relógio não o move — as capturas dependem disso', () => {
    const guardado = process.env.EXPO_PUBLIC_HOJE;
    process.env.EXPO_PUBLIC_HOJE = '2026-08-20';
    try {
      const f = fresco();
      expect(f.TODAY).toEqual({ y: 2026, m: 7, d: 20 });
      expect(f.atualizarHoje()).toBe(false);
      expect(f.TODAY).toEqual({ y: 2026, m: 7, d: 20 });
    } finally {
      if (guardado === undefined) delete process.env.EXPO_PUBLIC_HOJE; else process.env.EXPO_PUBLIC_HOJE = guardado;
    }
  });

  it('a app tem o relógio: a cada meio minuto e quando a janela volta à frente', () => {
    const app = fs.readFileSync(path.join(RAIZ, 'App.jsx'), 'utf8');
    expect(app).toMatch(/if \(atualizarHoje\(\)\) setDiaDeHoje\(TODAY_KEY\)/);
    expect(app).toMatch(/setInterval\(conferir, 30 \* 1000\)/);
    expect(app).toMatch(/addEventListener\('visibilitychange', conferir\)/);
    // E nenhum ano ou dia fica preso numa constante do módulo.
    expect(app).not.toMatch(/const TODAY_ANO/);
  });
});
