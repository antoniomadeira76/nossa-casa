/**
 * ⚠ A visibilidade da saúde decide-se com os membros DESTA casa.
 *
 * ── O defeito ────────────────────────────────────────────────────────────────
 *
 * O `podeVerSaude` lia o `MEMBERS` do `data.js` — a família de DEMONSTRAÇÃO — e
 * mais nada:
 *
 *     podeVerSaude = (member, viewer) =>
 *       MEMBERS[member] && MEMBERS[member].kid ? … : member === viewer;
 *
 * Numa casa a sério com outras pessoas, a resposta vinha de uma família
 * inventada. O António existe nesta casa e não no `data.js`, portanto
 * `MEMBERS['António']` é `undefined` e a regra concluía que ele não é um adulto
 * conhecido: a app escondia-lhe as fichas das crianças.
 *
 * Medido: três consultas descarregadas do servidor, «0 consultas» no ecrã.
 *
 * ⚠ E o sentido do defeito importa. NÃO é uma fuga — o servidor manda, e mandou
 * bem. É o contrário: a app a esconder da pessoa o que ela tem direito a ver,
 * sem dizer porquê. Um ecrã vazio não se distingue de uma casa sem consultas.
 *
 * A demonstração tapava-o porque lá os nomes coincidem. Só se vê numa casa cujo
 * adulto não se chame Rita nem Tomás — ou seja, em qualquer casa a sério.
 *
 * O `podeVerEvento` já levava o quadro da casa desde sempre; este ficou para
 * trás. É a mesma forma dos «nomes escritos à mão» que este projeto já corrigiu
 * noutros seis sítios.
 */
const { podeVerSaude, receitasAExpirarDe } = require('../src/store');

// Uma casa a sério: um adulto que a demonstração não conhece, e duas crianças
// com outros nomes.
const CASA = {
  'António': { kid: false, papel: 'admin' },
  'Beatriz': { kid: false, papel: 'adulto' },
  'Chico':   { kid: true,  papel: 'crianca' },
  'Duarte':  { kid: true,  papel: 'crianca' },
};

describe('⚠ com os membros desta casa', () => {
  it('um adulto vê a ficha de uma criança da casa', () => {
    expect(podeVerSaude('Chico', 'António', CASA)).toBe(true);
    expect(podeVerSaude('Duarte', 'Beatriz', CASA)).toBe(true);
  });

  it('⚠ e isto FALHAVA — o adulto não existia na família de demonstração', () => {
    // Sem o quadro, cai no `MEMBERS` do `data.js`, onde não há nenhum António
    // nem nenhum Chico. A regra respondia que não, e o ecrã ficava vazio.
    expect(podeVerSaude('Chico', 'António')).toBe(false);
  });

  it('a ficha de um adulto é só dele', () => {
    expect(podeVerSaude('António', 'António', CASA)).toBe(true);
    expect(podeVerSaude('António', 'Beatriz', CASA)).toBe(false);
    expect(podeVerSaude('Beatriz', 'António', CASA)).toBe(false);
  });

  it('⚠ e uma criança não vê a sua própria', () => {
    // A regra do §5, e a que o servidor impõe: as fichas das crianças são
    // visíveis aos adultos e invisíveis às próprias.
    expect(podeVerSaude('Chico', 'Chico', CASA)).toBe(false);
    expect(podeVerSaude('Duarte', 'Chico', CASA)).toBe(false);
  });

  it('nem a de um adulto', () => {
    expect(podeVerSaude('António', 'Chico', CASA)).toBe(false);
  });

  it('as receitas a expirar seguem a mesma regra, com o mesmo quadro', () => {
    const docs = [
      { kind: 'Receita', member: 'Chico',   expires: 'd2026-09-20', id: 'a' },
      { kind: 'Receita', member: 'Beatriz', expires: 'd2026-09-20', id: 'b' },
    ];
    const vistas = receitasAExpirarDe(docs, 'António', 3000, CASA).map(d => d.id);
    // A da criança sim; a do outro adulto não.
    expect(vistas).toContain('a');
    expect(vistas).not.toContain('b');
  });
});

describe('e a loja passa o quadro da casa, não a demonstração', () => {
  const fs = require('fs');
  const path = require('path');
  const loja = fs.readFileSync(path.join(__dirname, '..', 'src', 'store.jsx'), 'utf8');

  it('⚠ o `canSeeHealth` leva o `quadro`', () => {
    expect(loja).toMatch(/const canSeeHealth = \(member, viewer\) => podeVerSaude\(member, viewer, quadro\)/);
    // A forma antiga era `const canSeeHealth = podeVerSaude;` — a função crua,
    // com o `MEMBERS` do módulo lá dentro.
    expect(loja).not.toMatch(/const canSeeHealth = podeVerSaude;/);
  });

  it('e as receitas a expirar também', () => {
    expect(loja).toMatch(/receitasAExpirarDe\(allHealthDocs\(\), viewer, 30, quadro\)/);
  });
});
