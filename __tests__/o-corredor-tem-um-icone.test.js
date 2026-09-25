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
  rotuloDoIcone, ICONES_DE_CORREDOR, ICONE_POR_ESCOLHER, semAcentos,
} = require('../src/icone-do-corredor');

const RAIZ = path.join(__dirname, '..');
const nomesDe = (f, re) => new Set([...fs.readFileSync(path.join(RAIZ, f), 'utf8').matchAll(re)].map(m => m[1]));

describe('o corredor tem um ícone', () => {
  const icones = nomesDe(path.join('src', 'Icon.jsx'), /^ {2}([a-zA-Z][a-zA-Z0-9]*):\s*'/gm);
  const figuras = nomesDe(path.join('src', 'Avatares.jsx'), /^ {2}([a-zA-Z][a-zA-Z0-9]*):/gm);

  it('⚠ todos existem mesmo no `Icon.jsx`', () => {
    // Um nome que o `Icon.jsx` não conhece devolve um SVG VAZIO, sem erro: o
    // título do corredor ficava com um buraco. Foi o que aconteceu ao
    // `storefront` na Gestão.
    expect(ICONES_DE_CORREDOR.filter(n => !icones.has(n))).toEqual([]);
    expect(ICONES_DE_CORREDOR).toContain(ICONE_POR_ESCOLHER);
  });

  it('⚠ a cobertura é completa — os corredores que uma casa inventa mesmo', () => {
    // 25/09/2026: «implementa o 3 com cobertura completa dos corredores». Com
    // doze, metade das casas ficava com caixas: faltavam a charcutaria, as
    // conservas, os cereais, a higiene. Esta lista é o CHÃO, e prende-se aqui
    // para ninguém a encurtar sem reparar.
    const temDeHaver = [
      'hortalica', 'fruta', 'peixaria', 'talho', 'charcutaria',
      'padaria', 'pastelaria', 'laticinios', 'queijo', 'ovos',
      'bebidas', 'cafe', 'congelados', 'conservas', 'cereais',
      'massa', 'mercearia', 'snacks', 'doces',
      'limpeza', 'higiene', 'papel', 'bebe', 'animais', 'cozinha', 'jardim',
    ];
    expect(temDeHaver.filter(n => !ICONES_DE_CORREDOR.includes(n))).toEqual([]);
    expect(ICONES_DE_CORREDOR.length).toBeGreaterThanOrEqual(temDeHaver.length + 1);
    // E não há nomes repetidos na lista.
    expect(new Set(ICONES_DE_CORREDOR).size).toBe(ICONES_DE_CORREDOR.length);
  });

  it('⚠ e cada desenho tem mesmo caminhos — nenhum vem vazio', () => {
    // Um `nome: ''` passa em todas as outras provas e desenha um buraco.
    const src = fs.readFileSync(path.join(RAIZ, 'src', 'Icon.jsx'), 'utf8');
    const vazios = [];
    for (const nome of ICONES_DE_CORREDOR) {
      const m = new RegExp(`^ {2}${nome}:[ ]*'([^']*)'`, 'm').exec(src);
      const caminhos = ((m && m[1]) || '').split('|').filter(x => x.trim());
      if (!caminhos.length) vazios.push(nome);
    }
    expect(vazios).toEqual([]);
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

  it('⚠ cada ícone diz por escrito o que quer dizer', () => {
    // 25/09/2026: «cada icon deve ter uma label». Sem isto a grelha eram
    // vinte e sete desenhos mudos, e escolher passava por adivinhar o que cada
    // um queria dizer — o problema que os ícones vieram resolver, devolvido ao
    // contrário.
    const semRotulo = ICONES_DE_CORREDOR
      .filter(i => i !== ICONE_POR_ESCOLHER)
      .filter(i => rotuloDoIcone(i) === rotuloDoIcone(ICONE_POR_ESCOLHER));
    expect(semRotulo).toEqual([]);
  });

  it('⚠ e nenhum rótulo se repete', () => {
    // Dois desenhos com a mesma palavra por baixo não se distinguem, e a
    // unicidade dos ícones deixava de servir para alguma coisa.
    const rotulos = ICONES_DE_CORREDOR.map(rotuloDoIcone);
    expect(new Set(rotulos).size).toBe(rotulos.length);
  });

  it('os rótulos são os que uma casa portuguesa escreve', () => {
    expect(rotuloDoIcone('charcutaria')).toBe('Enchidos');
    expect(rotuloDoIcone('hortalica')).toBe('Legumes');
    expect(rotuloDoIcone('limpeza')).toBe('Limpeza');
    expect(rotuloDoIcone('caixa')).toBe('Por escolher');
    // E um nome que não existe não dá vazio.
    expect(rotuloDoIcone('inventado')).toBe('Por escolher');
  });

  it('⚠ e nenhum rótulo é comprido de mais para a célula', () => {
    // A célula da grelha tem 66 px e o rótulo vai a 11 px numa linha só. Um
    // que não caiba corta-se em «Massa e a…», que não diz nada — aconteceu, e
    // é pior do que um rótulo menos exacto.
    const compridos = ICONES_DE_CORREDOR
      .map(i => rotuloDoIcone(i))
      .filter(r => r.length > 12);
    expect(compridos).toEqual([]);
  });

  it('a normalização continua a servir quem a use', () => {
    expect(semAcentos('  Pão E Água ')).toBe('pao e agua');
  });
});
