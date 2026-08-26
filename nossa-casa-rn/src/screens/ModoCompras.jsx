import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useStore } from '../store';
import { SECTIONS } from '../data';
import { EUR } from '../format';
import { S, R, elev, FONT } from '../theme';
import Icon from '../Icon';
import { Card, Tap, Primary, AddButton, Bar, usePaged, Pager } from '../ui';

// Modo de loja: uma mão no carrinho. Linhas de 64 px, duas saídas.
export default function ModoCompras({ t, onExit, onDone, onAdd }) {
  const { s, set, allItems, envelopes } = useStore();
  const items = allItems();
  const [step, setStep] = useState(-1);           // -1 = aba Todos
  const st = (id) => s.status[id] || 'open';

  const merc = envelopes.find(e => e.name === 'Mercearia');
  const cart = items.filter(i => st(i.id) === 'done').reduce((a, i) => a + (i.real || i.est), 0);
  const estim = items.filter(i => st(i.id) === 'open').reduce((a, i) => a + i.est, 0);
  const abertos = items.filter(i => st(i.id) === 'open').length;
  const skips = items.filter(i => st(i.id) === 'skip').length;
  const livre = merc ? merc.limit - merc.used : 0;
  const pctEnv = livre > 0 ? (cart / livre) * 100 : 100;
  const barColor = pctEnv > 100 ? t.state.err : pctEnv > 80 ? t.state.warn : t.state.info;

  const doStep = (id, next) => set(x => ({ status: { ...x.status, [id]: next } }));

  const lista = step === -1 ? items : items.filter(i => i.s === step);
  const pg = usePaged(lista, 10);
  const abertosNoPasso = lista.filter(i => st(i.id) === 'open').length;
  const ultimo = step >= SECTIONS.length - 1;

  const abas = [{ k: -1, label: 'Todos' }, ...SECTIONS.map((n, i) => ({ k: i, label: n.split(' ')[0] }))];

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <View style={{ backgroundColor: t.chrome, paddingTop: 56, paddingHorizontal: 16,
        paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...elev(3) }}>
        <Tap onPress={onExit} label="Voltar à lista"><Icon name="arrowLeft" size={22} color="#FFFFFF" /></Tap>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: '500', color: '#FFFFFF', letterSpacing: 0.25 }}>Modo Compras</Text>
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: 'rgba(255,255,255,.65)' }}>
            {s.shopPlan.who} · {s.stores[s.shopPlan.store] || s.stores[0]}
          </Text>
        </View>
        <Tap onPress={onExit} label="Fechar"><Icon name="close" size={22} color="#FFFFFF" /></Tap>
      </View>

      <View style={{ backgroundColor: t.surface, paddingVertical: 14, paddingHorizontal: 12,
        flexDirection: 'row', gap: S.md, borderBottomWidth: 1, borderBottomColor: t.divider }}>
        {abas.map(a => {
          const on = step === a.k;
          const limpo = a.k === -1 ? abertos === 0 : items.filter(i => i.s === a.k && st(i.id) === 'open').length === 0;
          const cor = on ? t.accent : limpo ? t.state.ok : t.border;
          return (
            <Pressable key={a.k} onPress={() => setStep(a.k)} accessibilityRole="button"
              accessibilityLabel={a.label} accessibilityState={{ selected: on }}
              style={{ flex: 1, gap: 6, minHeight: 44, justifyContent: 'center' }}>
              <View style={{ height: 4, borderRadius: R.pill, backgroundColor: cor }} />
              <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11,
                fontWeight: on || limpo ? '600' : '400',
                color: on ? t.accent : limpo ? t.state.okDeep : t.text3 }}>{a.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ padding: 16, gap: S.lg }}>
        <Card t={t} style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ gap: 3 }}>
              <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.slate }}>Total no carrinho</Text>
              <Text style={{ fontFamily: FONT.display, fontSize: 28, color: t.text2 }}>{EUR(cart)}</Text>
            </View>
            <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3, textAlign: 'right' }}>
              estimativa {EUR(estim)}{'\n'}livre {EUR(livre)}
            </Text>
          </View>
          <Bar t={t} pct={pctEnv} color={barColor} />
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
            {items.length - abertos - skips} de {items.length} confirmados · {abertos} por confirmar{skips ? ` · ${skips} sem stock` : ''}
          </Text>
        </Card>

        {pctEnv > 100 ? (
          <View style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: R.card,
            borderWidth: 1, borderColor: t.state.err }}>
            <Icon name="warning" size={20} color={t.state.err} />
            <Text style={{ flex: 1, fontFamily: FONT.body, fontSize: 14.5, color: t.text2 }}>
              O carrinho excede o livre do envelope Mercearia em {EUR(cart - livre)}.
            </Text>
          </View>
        ) : null}

        <View style={{ gap: 10 }}>
          <Text style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: '700',
            color: t.slate, letterSpacing: 0.1 }}>
            {step === -1 ? `Toda a lista · ${items.length} artigos` : `${SECTIONS[step]} · ${lista.length} artigos`}
          </Text>
          {pg.slice.map(i => {
            const e = st(i.id);
            const done = e === 'done', skip = e === 'skip';
            return (
              <Pressable key={i.id} onPress={() => doStep(i.id, done ? 'open' : 'done')}
                accessibilityRole="button"
                accessibilityLabel={done ? `Desmarcar ${i.label}` : `Confirmar ${i.label}`}
                style={({ pressed }) => ({
                  minHeight: 64, padding: 16, borderRadius: R.card, flexDirection: 'row',
                  alignItems: 'center', gap: 14, opacity: pressed ? 0.85 : 1,
                  backgroundColor: done ? t.state.okBg : t.card,
                  borderWidth: done ? 2 : 1,
                  borderColor: done ? t.state.okBorder : t.border, ...elev(1),
                })}>
                <Icon name={done ? 'checkCircle' : skip ? 'closeCircle' : 'infoCircle'} size={32}
                  color={done ? t.state.ok : t.text3} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontFamily: FONT.body, fontSize: 17,
                    color: skip ? t.text3 : t.text2 }}>{i.label}</Text>
                  <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
                    {done ? `Confirmado · ${EUR(i.real || i.est)}`
                      : skip ? 'Sem stock · adiado para a próxima lista'
                      : `estimativa ${EUR(i.est)}`}
                  </Text>
                </View>
                {!done && !skip ? (
                  <Pressable onPress={(ev) => { ev.stopPropagation(); doStep(i.id, 'skip'); }}
                    accessibilityRole="button" accessibilityLabel={`${i.label} sem stock`}
                    hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
                    <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, fontWeight: '600', color: t.text3 }}>Sem stock</Text>
                  </Pressable>
                ) : null}
              </Pressable>
            );
          })}
          <Pager t={t} pg={pg} />
        </View>

        <AddButton t={t} label="Acrescentar artigo à lista" onPress={onAdd} />

        <View style={{ gap: 10 }}>
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3, textAlign: 'center' }}>
            {s.splitHalf ? 'A despesa entra no envelope Mercearia e divide-se a meias.' : 'A despesa entra no envelope Mercearia.'}
          </Text>
          {abertosNoPasso > 0 && !ultimo && step !== -1 ? (
            <Primary t={t} label="Secção Seguinte" onPress={() => setStep(step + 1)} />
          ) : (
            <Primary t={t} label="Fechar Conta e Registar Despesa" icon="fileDone"
              onPress={() => onDone(cart)} />
          )}
          <Tap onPress={onExit} label="Voltar à lista" size={44}
            style={{ flexDirection: 'row', gap: S.md }}>
            <Icon name="arrowLeft" size={16} color={t.text3} />
            <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '500',
              color: t.text3, letterSpacing: 0.4 }}>Voltar à Lista</Text>
          </Tap>
        </View>
      </ScrollView>
    </View>
  );
}
