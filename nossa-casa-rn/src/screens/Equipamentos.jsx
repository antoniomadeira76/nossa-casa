import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useStore } from '../store';
import { EUR } from '../format';
import { S, R, elev, FONT } from '../theme';
import Icon from '../Icon';
import { Card, SectionTitle, Row, Pill, Tap, Primary, AddButton, Empty, Tile, usePaged, Pager } from '../ui';

// Três estados, calculados dos dias que faltam — nunca guardados
export const warranty = (t, d) => {
  if (d > 90)  return { label: 'Em Garantia',        fg: t.state.okDeep, border: t.state.okBorder, bg: t.state.okBg };
  if (d >= 0)  return { label: 'Garantia a Expirar', fg: t.state.warnDeep, border: t.state.warn,   bg: t.tileWarn };
  return         { label: 'Fora de Garantia',        fg: t.state.errDeep, border: t.state.err,     bg: 'transparent' };
};

export default function Equipamentos({ t, onBack, onOpen }) {
  const { allEquip } = useStore();
  const list = allEquip();
  const pg = usePaged(list, 5);
  const emGar = list.filter(e => e.daysLeft > 90).length;
  const aExp  = list.filter(e => e.daysLeft >= 0 && e.daysLeft <= 90).length;
  const fora  = list.filter(e => e.daysLeft < 0).length;
  const valor = list.reduce((a, e) => a + e.price, 0);
  const prox  = list.filter(e => e.maintDate).sort((a, b) => a.maintDate.localeCompare(b.maintDate))[0];

  const [filtro, setFiltro] = useState(null);
  const vis = filtro === null ? pg.slice
    : list.filter(e => filtro === 'exp' ? (e.daysLeft >= 0 && e.daysLeft <= 90) : filtro === 'fora' ? e.daysLeft < 0 : e.daysLeft > 90);

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <View style={{ backgroundColor: t.chrome, paddingTop: 56, paddingHorizontal: 16,
        paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...elev(3) }}>
        <Tap onPress={onBack} label="Voltar"><Icon name="arrowLeft" size={22} color="#FFFFFF" /></Tap>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: '500', color: '#FFFFFF', letterSpacing: 0.25 }}>Equipamentos da Casa</Text>
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: 'rgba(255,255,255,.65)' }}>{list.length} equipamentos · {emGar} em garantia</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ padding: 16, gap: S.xl }}>
        <Card t={t}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {[['Equipamentos', String(list.length), null],
              ['Valor registado', EUR(valor), null],
              ['Garantias a expirar', String(aExp), aExp ? t.state.warnDeep : null],
              ['Garantias expiradas', String(fora), fora ? t.state.errDeep : null]].map(([k, v, col]) => (
              <View key={k} style={{ width: '50%', gap: 2, paddingVertical: S.md }}>
                <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.slate }}>{k}</Text>
                <Text style={{ fontFamily: FONT.body, fontSize: 20, color: col || t.text2 }}>{v}</Text>
              </View>
            ))}
          </View>
          {prox ? (
            <Row t={t} icon="clock" title="Próxima manutenção" sub={`${prox.maint} · ${prox.maintDate}`} last />
          ) : null}
        </Card>

        {(aExp > 0 || fora > 0) ? (
          <View style={{ flexDirection: 'row', gap: S.md }}>
            {aExp > 0 ? (
              <Pressable onPress={() => setFiltro(filtro === 'exp' ? null : 'exp')} style={{ flex: 1 }}>
                <Tile t={t} kind="warn" icon="idcard">{aExp} a expirar</Tile>
              </Pressable>
            ) : null}
            {fora > 0 ? (
              <Pressable onPress={() => setFiltro(filtro === 'fora' ? null : 'fora')} style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: R.card,
                  borderWidth: 1, borderColor: t.state.err }}>
                  <Icon name="closeCircle" size={20} color={t.state.err} />
                  <Text style={{ flex: 1, fontFamily: FONT.body, fontSize: 14.5, color: t.text2 }}>{fora} expiradas</Text>
                </View>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View>
          <SectionTitle t={t}>{filtro ? 'Filtrados' : 'Registados'}</SectionTitle>
          {list.length === 0 ? (
            <Empty t={t} icon="camera" title="Nenhum equipamento registado."
              hint="Fotografe a fatura do próximo que comprar e a garantia fica guardada." />
          ) : (
            <View style={{ gap: S.md }}>
              {vis.map(e => {
                const w = warranty(t, e.daysLeft);
                return (
                  <Pressable key={e.id} onPress={() => onOpen(e.id)} accessibilityRole="button"
                    accessibilityLabel={e.name}
                    style={({ pressed }) => ({ backgroundColor: t.card, borderWidth: 1, borderColor: t.border,
                      borderRadius: R.card, padding: 16, gap: 11, opacity: pressed ? 0.8 : 1, ...elev(1) })}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={{ fontFamily: FONT.body, fontSize: 16, color: t.text1 }}>{e.name}</Text>
                        <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>Comprado a {e.bought} · {EUR(e.price)}</Text>
                      </View>
                      <Pill label={w.label} fg={w.fg} bg={w.bg} border={w.border} />
                    </View>
                    <View style={{ height: 1, backgroundColor: t.divider }} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                      <Icon name="clock" size={16} color={t.text3} />
                      <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
                        {e.maintDate ? `${e.maint} · ${e.maintDate}` : 'Sem manutenção agendada.'}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
              {!filtro ? <Pager t={t} pg={pg} /> : null}
            </View>
          )}
        </View>

        <AddButton t={t} label="Registar equipamento" onPress={() => onOpen('novo')} />
      </ScrollView>
    </View>
  );
}
