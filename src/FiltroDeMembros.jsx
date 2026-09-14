import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { S, R, FONT } from './theme';
import { Avatar, avatarDe } from './ui';

// ── O filtro por membro: «Todos» e um AVATAR por pessoa ─────────────────────
//
// Nasceu nas Tarefas (12/09/2026, opção A de `design/filtro-de-membros.dc.html`):
// eram seis pastilhas com o nome e embrulhavam — 355 px dão para quatro, e as
// outras caíam para uma segunda linha que parecia um acidente. Cada membro é a
// sua bola, a mesma que cada linha já mostra, num alvo de 44; o escolhido ganha
// um anel do acento, e o NOME passa para o título da secção.
//
// Em 13/09/2026 a Saúde ainda tinha as pastilhas com o nome (com cinco membros
// a «Mia» e o «Léo» ficavam com 39 px), e o dono da casa pediu «como o segundo
// print»: passou a ser ESTE componente nos dois ecrãs — um desenho, um sítio.
//
// `escolhido` é o nome do membro ou «Todos»; tocar no escolhido volta a «Todos».
// `rotuloDe(nome)` é o que o leitor de ecrã diz de cada bola — cada ecrã diz o
// seu («Mostrar só as tarefas do Léo», «Mostrar só a saúde do Léo»).
//
// O NOME por baixo de cada bola (13/09/2026, opção B de
// `design/nome-no-filtro.dc.html`): ele perguntou «há alguma hipótese de saber o
// nome da pessoa?». Uma palavra a 10 px, cortada com «…» num nome composto, numa
// coluna de 52; o escolhido em `actFg`. É rótulo de ícone, não texto para ler —
// o nome inteiro vai para o título da secção quando se toca (opção A).
export default function FiltroDeMembros({ t, membros, escolhido, onEscolher, rotuloDe, MEMBERS }) {
  const todos = escolhido === 'Todos' || !escolhido;
  return (
    <View style={{ flexDirection: 'row', gap: S.md, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <Pressable onPress={() => onEscolher('Todos')} accessibilityRole="button"
        accessibilityLabel="Todos" accessibilityState={{ selected: todos }}
        // ⚠ Tinha 40. Medido no navegador, era o único alvo deste ecrã abaixo
        // dos 44 do INVARIANTE #5 — e é o primeiro que a mão encontra.
        style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: R.row, borderWidth: 1,
          borderColor: todos ? t.accent : t.border, backgroundColor: todos ? t.accent : 'transparent',
          alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: todos ? '#FFFFFF' : t.text2 }}>Todos</Text>
      </Pressable>
      {membros.map(n => {
        const on = escolhido === n;
        return (
          <Pressable key={n} onPress={() => onEscolher(on ? 'Todos' : n)} accessibilityRole="button"
            accessibilityLabel={rotuloDe(n)} accessibilityState={{ selected: on }}
            style={{ width: 52, minHeight: 44, alignItems: 'center', justifyContent: 'flex-start' }}>
            {/* O anel é um círculo à volta de um círculo — redondo por forma,
                como o próprio avatar; o alvo é o Pressable de 44 (52 de largo com
                o nome), sem raio. */}
            <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 40, height: 40, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: on ? t.accent : 'transparent' }}>
                <Avatar {...avatarDe(n, MEMBERS[n], t.text3)} size={32} />
              </View>
            </View>
            <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11, lineHeight: 12, marginTop: -2,
              maxWidth: 52, color: on ? t.actFg : t.text3, fontWeight: on ? '600' : '400' }}>{n}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
