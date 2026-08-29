import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { S, R, FONT, elev } from '../theme';
import { EUR } from '../format';
import { SECTIONS } from '../data';
import { Card, SectionTitle, Label, Pill, Bar, Primary, AddButton, Empty, usePaged, Pager, Tap, Tile } from '../ui';
import Icon, { Marca } from '../Icon';
import Sheet from '../Sheet';
import NovoArtigo from '../sheets/NovoArtigo';

// A lista partilhada. O modo de loja saiu daqui para ModoCompras.jsx: era um
// <Modal>, que no react-native-web escapa à raiz da app e tapava o rodapé.
export default function Compras({ t, user, onModoCompras }) {
  const st = useStore();
  const { s, set, allItems } = st;
  const [sheetOpen, setSheetOpen] = useState(false);

  const items = allItems();
  const stateOf = (i) => s.status[i.id] || (i.real ? 'done' : 'open');
  const doneItems = items.filter(i => stateOf(i) === 'done');
  const estimate = items.reduce((a, i) => a + i.est, 0);
  const merc = 550 + (s.envMove['Mercearia'] || 0) - (s.monthZero ? 0 : 412);

  const listPg = usePaged(items, 5);

  const toggle = (id) => set(x => ({
    status: { ...x.status, [id]: (x.status[id] || 'open') === 'done' ? 'open' : 'done' },
  }));


  return (
    <>
      <Card t={t} style={{ gap: S.lg }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {[['Artigos na lista', String(items.length)],
            ['Por comprar', String(items.filter(i => stateOf(i) === 'open').length)],
            ['Estimativa', EUR(estimate)],
            ['Envelope Mercearia', EUR(merc)]].map(([k, v], i) => (
            <View key={k} style={{ width: '50%', gap: 2, paddingBottom: S.lg }}>
              <Label t={t}>{k}</Label>
              <Text style={{ fontFamily: FONT.display, fontSize: 20,
                color: i === 3 ? t.state.okDeep : t.text2 }}>{v}</Text>
            </View>
          ))}
        </View>
        <View style={{ height: 1, backgroundColor: t.divider }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>
              Compras · {s.shopPlan.who}
            </Text>
            <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
              {s.shopPlan.time} · {s.stores[s.shopPlan.store]}
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Alterar quem vai às compras"
            style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '700', color: t.accent }}>Alterar</Text>
          </Pressable>
        </View>
      </Card>

      {SECTIONS.map((sec, si) => {
        const rows = items.filter(i => i.s === si);
        if (!rows.length) return null;
        return (
          <View key={sec}>
            <SectionTitle t={t} right={
              <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>{rows.length} artigos</Text>
            }>{sec}</SectionTitle>
            <View style={{ gap: S.md }}>
              {rows.map(i => {
                const done = stateOf(i) === 'done';
                return (
                  <Card key={i.id} t={t} style={{
                    borderWidth: done ? 2 : 1,
                    borderColor: done ? t.state.okBorder : t.border,
                    backgroundColor: done ? t.state.okBg : t.card,
                  }}>
                    <Pressable onPress={() => toggle(i.id)} accessibilityRole="button"
                      accessibilityLabel={i.label}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
                      <Icon name={done ? 'checkCircle' : 'infoCircle'} size={24} color={done ? t.state.ok : t.text3} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text numberOfLines={1} style={{ fontFamily: FONT.body, fontSize: 15.5, color: t.text2 }}>{i.label}</Text>
                        <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>{i.by}</Text>
                      </View>
                      <Text style={{ fontFamily: FONT.ui, fontSize: 13,
                        fontWeight: done ? '600' : '400', color: done ? t.state.okDeep : t.text3 }}>
                        {done ? EUR(i.real || i.est) : `~ ${EUR(i.est)}`}
                      </Text>
                    </Pressable>
                  </Card>
                );
              })}
            </View>
          </View>
        );
      })}

      <AddButton t={t} label="acrescentar artigo" onPress={() => setSheetOpen(true)} />
      <AddButton t={t} label="iniciar compras na loja" onPress={onModoCompras} />

      {s.shopHistory.length ? (
        <View>
          <SectionTitle t={t}>Histórico de Compras</SectionTitle>
          <Card t={t} pad={false} style={{ paddingHorizontal: 16 }}>
            {s.shopHistory.slice(0, 10).map((h, i, arr) => (
              <Pressable key={h.at} onPress={() => {
                // Repetir esta lista: readd items from the purchase
                // This would require storing items per purchase in shopHistory
                // For now, showing the feature intent
              }} accessibilityRole="button" accessibilityLabel={`Repetir compra em ${h.store}`}
                style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12,
                  borderBottomWidth: i === Math.min(9, arr.length - 1) ? 0 : 1, borderBottomColor: t.divider }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>{h.store}</Text>
                  <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
                    {h.who} · {h.items} artigos · {new Date(h.at).toLocaleDateString('pt-PT')}
                  </Text>
                </View>
                <View style={{ gap: 8, alignItems: 'flex-end' }}>
                  <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.text2 }}>{EUR(h.total)}</Text>
                  <Icon name="caretRight" size={16} color={t.text3} />
                </View>
              </Pressable>
            ))}
          </Card>
        </View>
      ) : null}

      {sheetOpen ? (
        <Sheet t={t} title="Novo Artigo" sub="Acrescentar à lista de compras"
          onClose={() => setSheetOpen(false)}>
          <NovoArtigo t={t} user={user} onClose={() => setSheetOpen(false)} />
        </Sheet>
      ) : null}
    </>
  );
}

// Carrinho: validação antes de fechar e registar despesa