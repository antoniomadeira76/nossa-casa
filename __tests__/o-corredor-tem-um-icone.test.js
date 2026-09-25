/**
 * O CORREDOR TEM UM ÍCONE — escolhido por quem administra, nunca repetido
 * ========================================================================
 *
 * 25/09/2026. Começou em «podes criar 5 designs para ter as secções com
 * icons?» (cinco em `design/cinco-corredores-com-icon.dc.html`), passou por
 * «não repitas icons nas secções», e acabou em «dont chose the icons. let the
 * admins chose the icon to represent each "Compras" section».
 *
 * ── ⚠ Houve aqui uma adivinha, e saiu ──────────────────────────────────────
 *
 * A primeira versão lia o nome: «Padaria» dava o pão, «Peixaria» dava o peixe.
 * Ele tirou-a, e tinha razão — os corredores são inventados pela família, e uma
 * adivinha sobre nomes inventados acerta na maioria e ERRA EM SILÊNCIO no
 * resto. Um ícone errado é pior do que um por escolher, porque ninguém vai
 * corrigir o que não sabe que está errado.
 *
 * Este ficheiro guarda o que ficou:
 *
 *   1. a app NÃO adivinha — sem escolha, o corredor mostra a `caixa`;
 *   2. dois corredores nunca têm o mesmo ícone;
 *   3. a `caixa` é a excepção, porque não é uma escolha: é o lugar vazio;
 *   4. os doze existem mesmo no `Icon.jsx`, e nenhum colide com uma FIGURA de
 *      avatar — `folha` e `peixe` já são figuras, e por isso os corredores
 *      têm `hortalica` e `peixaria`;
 *   5. duas escolhas iguais resolvem-se de forma determinística, para dois
 *      telemóveis chegarem à mesma conclusão sem falarem um com o outro.
 */
const fs = require('fs');
const path = require('path');
const {
  iconeDoCorredor, iconesDosCorredores, donoDeCadaIcone, corredoresPorEscolher,
  ICONES_DE_CORREDOR, ICONE_POR_ESCOLHER, semAcentos,
} = require('../src/icone-do-corredor');

const RAIZ = path.join(__dirname, '..');
const nomesDe = (f, re) => new Set([...fs.readFileSync(path.join(RAIZ, f), 'utf8').matchAll(re)].map(m => m[1]));

describe('o corredor tem um ícone', () => {
  const icones = nomesDe(path.join('src', 'Icon.jsx'), /^ {2}([a-zA-Z][a-zA-Z0-9]*):\s*'/gm);
  const figuras = nomesDe(path.join('src', 'Avatares.jsx'), /^ {2}([a-zA-Z][a-zA-Z0-9]*):/gm);

  it('⚠ os doze existem mesmo no `Icon.jsx`', () => {
    // Um nome que o `Icon.jsx` não conhece devolve um SVG VAZIO, sem erro: o
    // título do corredor ficava com um buraco. Foi o que aconteceu ao
    // `storefront` na Gestão.
    expect(ICONES_DE_CORREDOR).toHaveLength(12);
    expect(ICONES_DE_CORREDOR.filter(n => !icones.has(n))).toEqual([]);
    expect(ICONES_DE_CORREDOR).toContain(ICONE_POR_ESCOLHER);
  });

  it('⚠ e nenhum tem o nome de uma FIGURA de avatar', () => {
    // `folha` e `peixe` já são figuras — uma criança pode ter um peixe. Um
    // nome que sirva as duas coisas é o princípio de um defeito que ninguém
    // consegue ler, e o `escolher-avatar` chumba-o.
    expect(ICONES_DE_CORREDOR.filter(n => figuras.has(n))).toEqual([]);
  });

  it('⚠ a app NÃO adivinha: sem escolha, é a caixa', () => {
    const casa = ['Frutas & Legumes', 'Padaria', 'Peixaria', 'Corredor 3'];
    const mapa = iconesDosCorredores(casa);
    for (const n of casa) expect(mapa[n]).toBe(ICONE_POR_ESCOLHER);
    // E não há vestígio da tabela que aqui esteve.
    const modulo = fs.readFileSync(path.join(RAIZ, 'src', 'icone-do-corredor.js'), 'utf8');
    expect(modulo).not.toMatch(/export function iconeSugerido/);
  });

  it('a escolha de quem administra é a que vale', () => {
    const mapa = iconesDosCorredores(['Padaria', 'Talho'], { Padaria: 'padaria' });
    expect(mapa.Padaria).toBe('padaria');
    expect(mapa.Talho).toBe(ICONE_POR_ESCOLHER);
  });

  it('⚠ nunca dá o mesmo ícone a dois corredores', () => {
    const escolhas = { Padaria: 'padaria', Talho: 'talho', Peixaria: 'peixaria' };
    const mapa = iconesDosCorredores(Object.keys(escolhas), escolhas);
    const usados = Object.values(mapa);
    expect(new Set(usados).size).toBe(usados.length);
  });

  it('⚠ duas escolhas iguais resolvem-se sempre da mesma maneira', () => {
    // Acontece com dois telemóveis a escolher ao mesmo tempo. Ganha a primeira
    // por ordem alfabética, e a outra volta à caixa — determinístico, para os
    // dois chegarem à mesma conclusão sem falarem um com o outro.
    const a = iconesDosCorredores(['Alfa', 'Beta'], { Alfa: 'padaria', Beta: 'padaria' });
    const b = iconesDosCorredores(['Beta', 'Alfa'], { Beta: 'padaria', Alfa: 'padaria' });
    expect(a.Alfa).toBe('padaria');
    expect(a.Beta).toBe(ICONE_POR_ESCOLHER);
    expect(b).toEqual(a);
  });

  it('⚠ a caixa é a única que se repete — é o lugar vazio', () => {
    const mapa = iconesDosCorredores(['A', 'B', 'C'], { A: 'caixa', B: 'caixa' });
    expect(Object.values(mapa)).toEqual([ICONE_POR_ESCOLHER, ICONE_POR_ESCOLHER, ICONE_POR_ESCOLHER]);
    // E a caixa nunca tem dono, porque escolhê-la é desistir de escolher.
    expect(donoDeCadaIcone(['A', 'B'], { A: 'caixa' }).caixa).toBeUndefined();
  });

  it('um ícone escolhido que já não existe volta à caixa', () => {
    // Pode vir de um servidor mais novo, ou de uma versão em que a lista era
    // outra. Desenhar um nome desconhecido dá um SVG em branco.
    expect(iconeDoCorredor('Padaria', { Padaria: 'inventado' })).toBe(ICONE_POR_ESCOLHER);
    expect(iconeDoCorredor('Padaria', { Padaria: 'home' })).toBe(ICONE_POR_ESCOLHER);
    expect(iconeDoCorredor('Padaria', null)).toBe(ICONE_POR_ESCOLHER);
  });

  it('⚠ reordenar o percurso NÃO troca os ícones', () => {
    const e = { Padaria: 'padaria', Talho: 'talho' };
    expect(iconesDosCorredores(['Talho', 'Padaria'], e))
      .toEqual(iconesDosCorredores(['Padaria', 'Talho'], e));
  });

  it('a grelha sabe de quem é cada ícone', () => {
    const dono = donoDeCadaIcone(['Padaria', 'Talho'], { Padaria: 'padaria' });
    expect(dono.padaria).toBe('Padaria');
    expect(dono.talho).toBeUndefined();
  });

  it('⚠ e diz quais faltam, para o ecrã não deixar a pessoa descobrir sozinha', () => {
    const faltam = corredoresPorEscolher(['Padaria', 'Talho', 'Bebidas'], { Padaria: 'padaria' });
    expect(faltam).toEqual(['Bebidas', 'Talho']);
    expect(corredoresPorEscolher(['Padaria'], { Padaria: 'padaria' })).toEqual([]);
  });

  it('a normalização continua a servir quem a use', () => {
    expect(semAcentos('  Pão E Água ')).toBe('pao e agua');
  });
});
