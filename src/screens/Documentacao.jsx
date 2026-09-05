import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { Card, SectionTitle, Pill, Segmented, Empty, Pager, usePaged } from '../ui';
import { plural, pad2 } from '../format';
import Icon from '../Icon';
import { REGISTO_APP, TIPOS } from '../registo-app';

// Documentação: as novidades da app, versão a versão, e o «Como funciona» por
// área — as duas geradas do mesmo registo.
//
// Este ecrã mostrava `s.registo`, que é o histórico das alterações que a
// FAMÍLIA faz à casa. A referência 17 mostra outra coisa — o que mudou na app.
// São duas funcionalidades com o mesmo nome, e este ecrã é a segunda.
//
// ⚠ «e está sempre vazio: nada o escreve» dizia esta linha, e era verdade
// quando a escrevi. Deixou de ser: catorze sítios do `store.jsx` acrescentam-lhe
// linhas, e desde 05/09/2026 sobem para a coleção `registo`, com o `quem`.
//
// ── E agora as duas vivem aqui, em abas separadas ────────────────────────────
//
// São mesmo duas coisas: as «Novidades» são o que mudou na APP, escritas à mão
// por quem a faz; o «Nesta casa» é o que a FAMÍLIA fez. Partilham o ecrã e não
// se misturam — um separador entre elas é mais barato do que dois ecrãs, e o
// nome do ecrã serve as duas.
//
// ⚠ O desenho da terceira aba é o do protótipo, que já tinha isto pensado como
// folha «Histórico da Casa» (linha 3168): linha com ícone à esquerda, texto e
// data ao meio, quem fez à direita, «mais recente primeiro», estado vazio com
// as palavras dele, e paginação acima de cinco. O sítio é o que o dono da casa
// pediu; o desenho é o que estava desenhado.
export default function Documentacao({ t }) {
  const { s } = useStore();
  const [aba, setAba] = useState('novidades');

  const corDo = (k) => ({
    novo:      { fg: t.state.okDeep,   bg: t.state.okBg,   br: t.state.okBorder },
    alterado:  { fg: t.state.info,     bg: t.state.infoBg, br: t.state.info },
    corrigido: { fg: t.state.warnDeep, bg: t.state.warnBg, br: t.state.warn },
  }[k] || { fg: t.text3, bg: t.subtle, br: t.border });

  // Por versão, da mais recente para a mais antiga. As versões comparam-se
  // número a número — «1.10» é depois de «1.9», e a ordem alfabética punha-a
  // antes.
  const ordemVersao = (a, b) => {
    const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) if ((pb[i] || 0) !== (pa[i] || 0)) return (pb[i] || 0) - (pa[i] || 0);
    return 0;
  };

  const porVersao = (() => {
    const mapa = {};
    for (const r of REGISTO_APP) (mapa[r.v] ||= { v: r.v, d: r.d, itens: [] }).itens.push(r);
    return Object.values(mapa).sort((a, b) => ordemVersao(a.v, b.v));
  })();

  const porArea = (() => {
    const mapa = {};
    for (const r of REGISTO_APP) (mapa[r.a] ||= []).push(r);
    return Object.entries(mapa)
      .map(([area, itens]) => ({ area, itens: itens.sort((a, b) => ordemVersao(a.v, b.v)) }))
      .sort((a, b) => a.area.localeCompare(b.area, 'pt'));
  })();

  const Linha = ({ r, mostrarArea }) => {
    const c = corDo(r.k);
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: S.md, paddingVertical: S.md }}>
        <View style={{ minWidth: 74 }}>
          <Pill label={TIPOS[r.k] || r.k} fg={c.fg} bg={c.bg} border={c.br} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: FONT.body, fontSize: 14.5, lineHeight: 21, color: t.text2 }}>
            {r.t}
          </Text>
          <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
            {mostrarArea ? r.a : `versão ${r.v}`}
          </Text>
        </View>
      </View>
    );
  };

  // ── O registo da casa ──────────────────────────────────────────────────────
  //
  // Mais recente primeiro. A lista já vem ordenada do servidor, mas ordena-se
  // aqui também: sem servidor ela é a local, e essa vem pela ordem em que os
  // catorze sítios a foram acrescentando.
  const daCasa = [...(s.registo || [])].sort((a, b) => (b.at || 0) - (a.at || 0));
  const pgCasa = usePaged(daCasa, 5);

  // Data e hora da entrada, numa linha só à direita.
  //
  // ⚠ Havia uma segunda linha por baixo do texto com «Setembro de 2026», e
  // saiu: dizia o mesmo que o `05/09` do lado direito, em todas as linhas do
  // mês corrente. Vi-a no ecrã e não no código — três linhas por registo, duas
  // delas a dar a mesma data.
  //
  // O ANO só aparece quando não é este. Numa casa com dois anos de uso é a
  // única coisa que a data curta não diz, e é barato dizê-la só quando conta.
  const anoCorrente = new Date().getFullYear();
  const quando = (at) => {
    if (!at) return '';
    const d = new Date(at);
    if (Number.isNaN(d.getTime())) return '';
    const dia = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
    const ano = d.getFullYear() === anoCorrente ? '' : `/${d.getFullYear()}`;
    return `${dia}${ano} · ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };

  return (
    <>
      <Segmented t={t} value={aba}
        options={[{ value: 'novidades', label: 'Novidades' },
                  { value: 'como', label: 'Como funciona' },
                  { value: 'casa', label: 'Nesta casa' }]}
        onChange={setAba} />

      {aba === 'casa' ? (
        // ⚠ O título é um `SectionTitle`, como na aba «Como funciona» ao lado.
        //
        // Escrevi-o primeiro como um cabeçalho de 16 px dentro do cartão, ao
        // jeito do da Saúde, e medi 4,08:1 contra a página escura no esquema
        // Menta. A 16 px isso não chega — os 3:1 que o `t.titulo` assume valem
        // para texto GRANDE, e grande começa nos 18,66 px a negrito. O
        // `SectionTitle` são 20/700, que é texto grande a sério, e além disso é
        // o que a aba do lado já usa.
        <View>
          <SectionTitle t={t} right={daCasa.length
            ? <Pill label={plural(daCasa.length, 'registo', 'registos')}
                fg={t.text3} bg={t.subtle} border={t.border} />
            : null}>
            Histórico da Casa
          </SectionTitle>

          {daCasa.length ? (
            <Card t={t} style={{ gap: S.sm }}>
              <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
                Mais recente primeiro
              </Text>
              <View style={{ height: 1, backgroundColor: t.divider }} />
              {pgCasa.slice.map((r, i) => (
                // ⚠ Um ícone só, o mesmo em todas as linhas, e é uma decisão.
                //
                // O protótipo dá um ícone por tipo de acontecimento; as nossas
                // entradas são texto e mais nada — não trazem tipo. Adivinhá-lo
                // pelas palavras dava o ícone ERRADO de vez em quando, e cada
                // ícone desta app tem um significado exclusivo: um `smile` numa
                // linha que fala de dinheiro mente mais do que um ícone neutro
                // não diz. Quando as entradas ganharem tipo, ganham ícone.
                <View key={r.id || `${r.at}-${i}`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: S.md,
                    minHeight: 44, paddingVertical: S.md }}>
                  <Icon name="fileText" size={20} color={t.text3} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontFamily: FONT.body, fontSize: 14.5, lineHeight: 21, color: t.text2 }}>
                      {r.t}
                    </Text>
                  </View>
                  <View style={{ gap: 2, alignItems: 'flex-end' }}>
                    {/* Quem fez. Só existe com servidor: um registo escrito
                        neste telefone antes de haver casa ligada não sabe de
                        quem é, e inventar um nome era pior do que não o dizer. */}
                    {r.quem ? (
                      <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.text2 }}>
                        {r.quem}
                      </Text>
                    ) : null}
                    <Text style={{ fontFamily: FONT.ui, fontSize: 11, color: t.text3 }}>
                      {quando(r.at)}
                    </Text>
                  </View>
                </View>
              ))}
              <Pager t={t} pg={pgCasa} />
            </Card>
          ) : (
            // As palavras são as do protótipo.
            <Empty t={t} icon="fileText" title="Ainda sem registos."
              hint="Tudo o que a família fizer na app fica aqui: tarefas, despesas, compras, agenda e equipamentos." />
          )}
        </View>
      ) : aba === 'novidades' ? porVersao.map(g => (
        <Card key={g.v} t={t} style={{ gap: S.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
            <Text style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: '600', color: t.text1 }}>
              {g.v}
            </Text>
            <Pill label={plural(g.itens.length, 'alteração', 'alterações')}
              fg={t.text3} bg={t.subtle} border={t.border} />
            <View style={{ flex: 1 }} />
            <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>{g.d}</Text>
          </View>
          <View style={{ height: 1, backgroundColor: t.divider }} />
          {g.itens.map((r, i) => <Linha key={i} r={r} mostrarArea />)}
        </Card>
      )) : porArea.map(g => (
        <View key={g.area}>
          <SectionTitle t={t}>{g.area}</SectionTitle>
          <Card t={t} style={{ gap: 0 }}>
            {g.itens.map((r, i) => <Linha key={i} r={r} />)}
          </Card>
        </View>
      ))}
    </>
  );
}
