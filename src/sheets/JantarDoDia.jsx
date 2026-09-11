import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { plural } from '../format';
import { Label, Choice, Primary, Pill, Linha } from '../ui';
import Icon from '../Icon';

// O jantar de um dia: escolher o prato (ou nenhum), ver que ingredientes já
// estão na lista e quais entram, e pô-los lá de uma vez.
//
// (11/09/2026 — a terceira das dez funcionalidades.) «Pôr o que falta» não
// duplica: compara pelo nome com a lista aberta, e só cria o que não há.
export default function JantarDoDia({ t, user, dia, titulo, onClose, onNovoPrato, onApagarPrato }) {
  const st = useStore();
  const { s, marcarJantar, oQueFalta, porOQueFaltaNaLista } = st;
  const pratos = s.pratos || [];
  const escolhido = (s.ementa || {})[dia] || null;
  const [feito, setFeito] = useState(null);   // quantos entraram, depois de pôr

  const faltam = escolhido ? oQueFalta(escolhido) : [];
  const porEntrar = faltam.filter(i => !i.jaNaLista).length;
  const prato = pratos.find(p => p.id === escolhido) || null;

  const escolher = (id) => { setFeito(null); marcarJantar(dia, id); };
  const por = () => { const n = porOQueFaltaNaLista(escolhido, user); setFeito(n); };

  return (
    <View style={{ gap: S.lg }}>
      <View style={{ gap: S.sm }}>
        <Label t={t}>{titulo}</Label>
        <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
          <Choice t={t} label="Sem jantar" selected={!escolhido} onPress={() => escolher(null)} />
          {pratos.map(p => (
            <Choice key={p.id} t={t} label={p.nome} selected={escolhido === p.id} onPress={() => escolher(p.id)} />
          ))}
        </View>
        {/* Um prato novo cria-se numa folha irmã — não dentro desta. */}
        <Pressable onPress={onNovoPrato} accessibilityRole="button" accessibilityLabel="Novo prato"
          style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
          <Icon name="plus" size={18} color={t.titulo} />
          <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '700', color: t.actFg }}>Novo prato</Text>
        </Pressable>
      </View>

      {prato ? (
        <View style={{ gap: S.sm }}>
          <Label t={t}>{`${prato.nome} · ${plural(prato.ingredientes.length, 'ingrediente', 'ingredientes')}`}</Label>
          <View>
            {faltam.map((i, idx) => (
              <Linha key={`${i.rotulo}-${idx}`} t={t} last={idx === faltam.length - 1}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 36 }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>{i.rotulo}</Text>
                    {i.s ? <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>{i.s}</Text> : null}
                  </View>
                  {/* Sobre o tijolo OPACO (`warnBg`) o texto é o «deep» — é a
                      regra dos doze temas. O `okBg` não é opaco: leva `okTexto`. */}
                  {i.jaNaLista
                    ? <Pill label="já na lista" fg={t.state.okTexto} bg={t.state.okBg} border={t.state.okBorder} />
                    : <Pill label="entra na lista" fg={t.state.warnDeep} bg={t.state.warnBg} border={t.state.warn} />}
                </View>
              </Linha>
            ))}
          </View>
          {feito !== null ? (
            <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, color: t.state.okTexto }}>
              {feito ? `${plural(feito, 'artigo entrou', 'artigos entraram')} na lista, com o seu nome.` : 'Já estava tudo na lista.'}
            </Text>
          ) : null}
          <Primary comum t={t}
            label={porEntrar ? `Pôr o que falta na lista (${porEntrar})` : 'Já está tudo na lista'}
            disabled={!porEntrar} onPress={por} />
          {/* Apagar o prato da casa — em baixo e separado, como o apagar das
              outras folhas. Os dias que o tinham ficam sem jantar. */}
          <View style={{ height: 1, backgroundColor: t.divider }} />
          <Pressable onPress={() => onApagarPrato(prato)} accessibilityRole="button"
            accessibilityLabel={`Apagar o prato ${prato.nome}`}
            style={{ minHeight: 44, borderRadius: R.row, borderWidth: 1, borderColor: t.state.err,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icon name="trash" size={18} color={t.state.errTexto} />
            <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '500', color: t.state.errTexto }}>Apagar prato</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, lineHeight: 19, color: t.text3 }}>
          {pratos.length ? 'Escolha um prato para este dia, ou crie um novo.' : 'A casa ainda não tem pratos. Crie o primeiro.'}
        </Text>
      )}
    </View>
  );
}
