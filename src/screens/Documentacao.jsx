import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { S, R, FONT } from '../theme';
import { Card, SectionTitle, Pill, Segmented } from '../ui';
import { plural } from '../format';
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
// O que continua a não existir é um ecrã que o MOSTRE — o registo da casa é
// escrito e lido de volta, e não aparece em lado nenhum. Onde deve aparecer é
// decisão do dono da casa, não minha: acrescentar uma secção é das coisas que o
// CLAUDE.md manda perguntar antes.
export default function Documentacao({ t }) {
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

  return (
    <>
      <Segmented t={t} value={aba}
        options={[{ value: 'novidades', label: 'Novidades' },
                  { value: 'como', label: 'Como funciona' }]}
        onChange={setAba} />

      {aba === 'novidades' ? porVersao.map(g => (
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
