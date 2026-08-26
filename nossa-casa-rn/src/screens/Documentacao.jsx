import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useStore } from '../store';
import { S, R, elev, FONT } from '../theme';
import Icon from '../Icon';
import { SectionTitle, Tap, Pill } from '../ui';
import { REGISTO } from '../registo';

const AREAS = ['Tudo', 'Agenda', 'Tarefas', 'Compras', 'Dinheiro', 'Equipamentos', 'Saúde', 'Sistema'];

// versão descendente: 1.4.0 acima de 1.2.0
const cmp = (a, b) => {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pb[i] || 0) !== (pa[i] || 0)) return (pb[i] || 0) - (pa[i] || 0);
  return 0;
};

export default function Documentacao({ t, onBack }) {
  const { s, set } = useStore();
  const [area, setArea] = useState('Tudo');
  const lista = REGISTO
    .filter(r => area === 'Tudo' || r.a === area)
    .slice()
    .sort((x, y) => cmp(x.v, y.v));
  const versoes = [...new Set(REGISTO.map(r => r.v))].sort(cmp);

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <View style={{ backgroundColor: t.chrome, paddingTop: 56, paddingHorizontal: 16,
        paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...elev(3) }}>
        <Tap onPress={onBack} label="Voltar"><Icon name="arrowLeft" size={22} color="#FFFFFF" /></Tap>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: '500', color: '#FFFFFF', letterSpacing: 0.25 }}>Documentação</Text>
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: 'rgba(255,255,255,.65)' }}>
            versão {versoes[0]} · {REGISTO.length} entradas
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ padding: 16, gap: S.lg }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: S.md, paddingBottom: 4 }}>
          {AREAS.map(a => {
            const on = area === a;
            return (
              <Pressable key={a} onPress={() => setArea(a)} accessibilityRole="button"
                accessibilityLabel={a} accessibilityState={{ selected: on }}
                style={{ paddingHorizontal: 14, minHeight: 40, borderRadius: R.pill, borderWidth: 1,
                  justifyContent: 'center',
                  borderColor: on ? t.chrome : t.border, backgroundColor: on ? t.chrome : 'transparent' }}>
                <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600',
                  color: on ? '#FFFFFF' : t.text2 }}>{a}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View>
          <SectionTitle t={t}>{area === 'Tudo' ? 'Todas as alterações' : area}</SectionTitle>
          <View style={{ gap: S.md }}>
            {lista.map((r, i) => (
              <View key={i} style={{ backgroundColor: t.card, borderRadius: R.card, padding: 16,
                gap: S.md, ...elev(1) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                  <Pill label={r.v} fg={t.slate} bg={t.subtle} border={t.border} />
                  <Text style={{ flex: 1, fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>{r.a}</Text>
                  {r.k === 'fix' ? <Pill label="correção" fg={t.state.warnDeep} bg={t.tileWarn} border={t.state.warn} /> : null}
                </View>
                <Text style={{ fontFamily: FONT.body, fontSize: 15, lineHeight: 22, color: t.text2 }}>{r.t}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
