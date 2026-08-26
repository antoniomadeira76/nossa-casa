import React, { useState } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { S, R, FONT, elev } from '../theme';
import { EUR } from '../format';
import { SECTIONS } from '../data';
import { Card, SectionTitle, Label, Pill, Bar, Primary, AddButton, Empty, usePaged, Pager, Tap } from '../ui';
import Icon, { Marca } from '../Icon';

// Modo de loja: ecrã inteiro, mas com cabeçalho e rodapé próprios —
// o invariante é que nunca há uma janela sem cabeçalho nem rodapé.
export default function Compras({ t, user }) {
  const st = useStore();
  const { s, set, allItems } = st;
  const [shop, setShop] = useState(false);
  const [step, setStep] = useState(-1);          // -1 = Todos
  const insets = useSafeAreaInsets();

  const items = allItems();
  const stateOf = (i) => s.status[i.id] || (i.real ? 'done' : 'open');
  const doneItems = items.filter(i => stateOf(i) === 'done');
  const cart = doneItems.reduce((a, i) => a + (i.real || i.est), 0);
  const estimate = items.reduce((a, i) => a + i.est, 0);
  const merc = 550 + (s.envMove['Mercearia'] || 0) - (s.monthZero ? 0 : 412);

  const inStep = step === -1 ? items : items.filter(i => i.s === step);
  const pg = usePaged(inStep, 10);
  const listPg = usePaged(items, 5);

  const toggle = (id) => set(x => ({
    status: { ...x.status, [id]: (x.status[id] || 'open') === 'done' ? 'open' : 'done' },
  }));

  if (shop) {
    const tabs = [{ i: -1, label: 'Todos' }, ...SECTIONS.map((n, i) => ({ i, label: n.split(' ')[0] }))];
    const pctCart = merc > 0 ? (cart / merc) * 100 : 0;
    const barColor = pctCart > 100 ? t.state.err : pctCart > 80 ? t.state.warn : t.state.info;

    return (
      <Modal visible animationType="slide" onRequestClose={() => setShop(false)}>
        <View style={{ flex: 1, backgroundColor: t.page }}>
          {/* cabeçalho do modo de loja */}
          <View style={{ flex: 0, backgroundColor: t.chrome, overflow: 'hidden',
            paddingTop: insets.top + 10, paddingBottom: 14, paddingHorizontal: 16,
            flexDirection: 'row', alignItems: 'center', gap: 12, ...elev(3) }}>
            <Marca size={120} mono opacity={0.10} style={{ position: 'absolute', top: insets.top + 4, right: -24 }} />
            <Tap onPress={() => setShop(false)} label="Voltar à lista">
              <Icon name="arrowLeft" size={22} color="#FFFFFF" />
            </Tap>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: '500', color: '#FFFFFF' }}>Modo Compras</Text>
              <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
                {s.shopPlan.who} · {s.stores[s.shopPlan.store]}
              </Text>
            </View>
            <Tap onPress={() => setShop(false)} label="Fechar o modo de compras">
              <Icon name="close" size={22} color="#FFFFFF" />
            </Tap>
          </View>

          {/* stepper por corredor */}
          <View style={{ flex: 0, backgroundColor: t.surface, borderBottomWidth: 1, borderBottomColor: t.divider,
            flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 12, gap: S.md }}>
            {tabs.map(x => {
              const on = step === x.i;
              const clean = x.i >= 0 && items.filter(i => i.s === x.i).every(i => stateOf(i) !== 'open');
              return (
                <Pressable key={x.i} onPress={() => setStep(x.i)} accessibilityRole="tab"
                  accessibilityLabel={x.label} accessibilityState={{ selected: on }}
                  style={{ flex: 1, minHeight: 44, gap: 6, justifyContent: 'center' }}>
                  <View style={{ height: 4, borderRadius: R.pill,
                    backgroundColor: on ? t.accent : clean ? t.state.ok : t.border }} />
                  <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11, textAlign: 'center',
                    fontWeight: on || clean ? '600' : '400',
                    color: on ? t.accent : clean ? t.state.okDeep : t.text3 }}>{x.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ flex: 1, minHeight: 0, padding: 16, gap: S.lg }}>
            <Card t={t} style={{ gap: S.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Label t={t}>Total no carrinho</Label>
                  <Text style={{ fontFamily: FONT.display, fontSize: 28, color: t.text2 }}>{EUR(cart)}</Text>
                </View>
                <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3, textAlign: 'right' }}>
                  estimativa {EUR(estimate)}{'\n'}envelope {EUR(merc)}
                </Text>
              </View>
              <Bar t={t} pct={pctCart} color={barColor} />
              <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
                {doneItems.length} de {items.length} artigos confirmados
              </Text>
            </Card>

            <View style={{ flex: 1, minHeight: 0, gap: S.md }}>
              <Text style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: '700', color: t.slate }}>
                {step === -1 ? `Toda a lista · ${items.length} artigos` : `${SECTIONS[step]} · ${inStep.length} artigos`}
              </Text>
              {pg.slice.map(i => {
                const stt = stateOf(i);
                const done = stt === 'done';
                return (
                  <Pressable key={i.id} onPress={() => toggle(i.id)} accessibilityRole="button"
                    accessibilityLabel={`${done ? 'Desconfirmar' : 'Confirmar'} ${i.label}`}
                    style={{ minHeight: 64, borderRadius: R.card, padding: 16, flexDirection: 'row',
                      alignItems: 'center', gap: 14, borderWidth: done ? 2 : 1,
                      borderColor: done ? t.state.okBorder : t.border,
                      backgroundColor: done ? t.state.okBg : t.card, ...elev(1) }}>
                    <Icon name={done ? 'checkCircle' : 'infoCircle'} size={30}
                      color={done ? t.state.ok : t.text3} />
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text numberOfLines={1} style={{ fontFamily: FONT.body, fontSize: 16, color: t.text2 }}>{i.label}</Text>
                      <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
                        {done ? `Confirmado · ${EUR(i.real || i.est)}` : `estimativa ${EUR(i.est)}`}
                      </Text>
                    </View>
                    {!done ? (
                      <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '700',
                        color: t.accent, letterSpacing: 0.4 }}>Confirmar</Text>
                    ) : null}
                  </Pressable>
                );
              })}
              <Pager t={t} pg={pg} />
              <AddButton t={t} label="acrescentar artigo à lista" onPress={() => {}} />
            </View>
          </View>

          {/* rodapé do modo de loja */}
          <View style={{ flex: 0, backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.divider,
            paddingHorizontal: 16, paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 12), gap: S.md, ...elev(2) }}>
            {step === -1 || step < SECTIONS.length - 1 ? (
              <View style={{ flexDirection: 'row', gap: S.md }}>
                <View style={{ flex: 1 }}>
                  <Primary t={t} label="Secção seguinte" icon="caretRight"
                    onPress={() => setStep(x => Math.min(SECTIONS.length - 1, x + 1))} />
                </View>
              </View>
            ) : (
              <Primary t={t} label="Fechar Conta e Registar Despesa"
                onPress={() => {
                  set(x => ({
                    registered: x.registered + cart,
                    settled: false,
                    shopHistory: [{
                      at: Date.now(), store: x.stores[x.shopPlan.store], who: x.shopPlan.who,
                      total: cart, items: doneItems.length,
                    }, ...x.shopHistory].slice(0, 10),
                  }));
                  setShop(false);
                }} />
            )}
          </View>
        </View>
      </Modal>
    );
  }

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

      <AddButton t={t} label="acrescentar artigo" onPress={() => {}} />
      <AddButton t={t} label="iniciar compras na loja" onPress={() => { setStep(-1); setShop(true); }} />

      {s.shopHistory.length ? (
        <View>
          <SectionTitle t={t}>Últimas Compras</SectionTitle>
          <Card t={t} pad={false} style={{ paddingHorizontal: 16 }}>
            {s.shopHistory.slice(0, 5).map((h, i, arr) => (
              <View key={h.at} style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12,
                borderBottomWidth: i === arr.length - 1 ? 0 : 1, borderBottomColor: t.divider }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>{h.store}</Text>
                  <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
                    {h.who} · {h.items} artigos
                  </Text>
                </View>
                <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.text2 }}>{EUR(h.total)}</Text>
              </View>
            ))}
          </Card>
        </View>
      ) : null}
    </>
  );
}
