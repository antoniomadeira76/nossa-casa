import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useStore } from '../store';
import { MEMBERS } from '../data';
import { MEMBER_COLOR, S, R, elev, FONT } from '../theme';
import { EUR } from '../format';
import Icon from '../Icon';
import { Card, SectionTitle, Tap, Avatar, Pill, Primary, Tile, Empty } from '../ui';

// App reduzida: duas entradas, alvos maiores, e nada de orçamento.
export default function Crianca({ t, who, onExit }) {
  const { s, set, allTasks, kidPts, tapTask } = useStore();
  const [tab, setTab] = React.useState('tarefas');
  const cor = MEMBER_COLOR[who];
  const minhas = allTasks().filter(x => x.who === who);
  const porFazer = minhas.filter(x => !s.done[x.id] && !s.pending[x.id]).length;
  const porPagar = (kidPts[who] || 0) - (s.paidPts[who] || 0);
  const pedido = !!(s.kidRequests || {})[who];

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <View style={{ backgroundColor: cor, paddingTop: 56, paddingHorizontal: 16,
        paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12, ...elev(3) }}>
        <View style={{ width: 40, height: 40, borderRadius: R.pill, borderWidth: 2,
          borderColor: 'rgba(255,255,255,.5)', backgroundColor: 'rgba(255,255,255,.22)',
          alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: FONT.display, fontSize: 17, fontWeight: '500', color: '#FFFFFF' }}>{MEMBERS[who].initial}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: '500', color: '#FFFFFF', letterSpacing: 0.25 }}>Olá, {who}</Text>
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: 'rgba(255,255,255,.75)' }}>
            {porPagar} pontos por pagar · {EUR(s.vault[who] || 0)} no cofre
          </Text>
        </View>
        <Tap onPress={onExit} label="Sair"><Icon name="logout" size={22} color="#FFFFFF" /></Tap>
      </View>

      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ padding: 16, gap: S.xl }}>
        {tab === 'tarefas' ? (
          <>
            <Card t={t}>
              <View style={{ flexDirection: 'row' }}>
                {[['Por fazer hoje', String(porFazer)], ['Pontos da semana', String(porPagar)]].map(([k, v]) => (
                  <View key={k} style={{ flex: 1, gap: 3 }}>
                    <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.slate }}>{k}</Text>
                    <Text style={{ fontFamily: FONT.display, fontSize: 26, color: t.text2 }}>{v}</Text>
                  </View>
                ))}
              </View>
            </Card>

            <View>
              <SectionTitle t={t}>As Minhas Tarefas</SectionTitle>
              {minhas.length === 0 ? (
                <Empty t={t} icon="checkSquare" title="Sem tarefas para hoje." hint="Volta a ver mais tarde." />
              ) : (
                <View style={{ gap: 10 }}>
                  {minhas.map(x => {
                    const done = !!s.done[x.id], pend = !!s.pending[x.id];
                    return (
                      <Pressable key={x.id} onPress={() => tapTask(x.id, true)}
                        accessibilityRole="button" accessibilityLabel={`Marcar ${x.title} como feita`}
                        style={({ pressed }) => ({
                          minHeight: 64, padding: 16, borderRadius: R.card, flexDirection: 'row',
                          alignItems: 'center', gap: 14, opacity: pressed ? 0.85 : 1,
                          backgroundColor: done ? t.state.okBg : pend ? t.tileInfo : t.card,
                          borderWidth: done || pend ? 2 : 1,
                          borderColor: done ? t.state.okBorder : pend ? t.state.info : t.border, ...elev(1),
                        })}>
                        <Icon name={done ? 'checkCircle' : pend ? 'clock' : 'infoCircle'} size={32}
                          color={done ? t.state.ok : pend ? t.state.info : t.text3} />
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={{ fontFamily: FONT.body, fontSize: 17, color: t.text2 }}>{x.title}</Text>
                          <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
                            {pend ? 'Feito — a aguardar confirmação'
                              : done ? 'Confirmado pelos pais' : x.meta}
                          </Text>
                        </View>
                        {x.pts > 0 ? (
                          <Pill label={`${x.pts} pt`}
                            fg={pend ? t.state.info : t.state.warnDeep}
                            bg={pend ? t.tileInfo : t.tileWarn}
                            border={pend ? t.state.info : t.state.warn} />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        ) : (
          <>
            <View style={{ backgroundColor: t.state.okBg, borderWidth: 2, borderColor: t.state.okBorder,
              borderRadius: R.card, padding: 20, gap: 6 }}>
              <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.slate }}>O meu cofre</Text>
              <Text style={{ fontFamily: FONT.display, fontSize: 38, color: t.text2 }}>{EUR(s.vault[who] || 0)}</Text>
              <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
                {porPagar > 0 ? `Mais ${EUR(porPagar * s.pointValue)} quando a semanada for paga.`
                  : 'Semanada desta semana já paga.'}
              </Text>
            </View>

            <View>
              <SectionTitle t={t}>Movimentos</SectionTitle>
              <Card t={t} style={{ gap: 14 }}>
                {[...(s.extraLog[who] || []), { icon: 'checkCircle', t: 'Semanada da semana passada', m: 'pago a 18/08', v: who === 'Léo' ? 1.6 : 1.3 },
                  { icon: 'smile', t: 'Bónus — boletim escolar', m: '14/08', v: 5 }].map((m, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Icon name={m.icon || 'checkCircle'} size={20} color={t.state.ok} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>{m.t}</Text>
                      <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>{m.m}</Text>
                    </View>
                    <Text style={{ fontFamily: FONT.ui, fontSize: 14, fontWeight: '600', color: t.state.okDeep }}>+ {EUR(m.v)}</Text>
                  </View>
                ))}
              </Card>
            </View>

            {pedido ? <Tile t={t} icon="clock">Pedido enviado. A Rita ou o Tomás têm de autorizar antes de poder usar o dinheiro.</Tile> : null}

            <Primary t={t} icon="smile"
              label={pedido ? 'Pedido a Aguardar Autorização' : 'Pedir para Usar o Dinheiro'}
              disabled={pedido}
              onPress={() => set(x => ({ kidRequests: { ...(x.kidRequests || {}), [who]: true } }))} />
          </>
        )}
      </ScrollView>

      <View style={{ flex: 0, backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.divider,
        paddingTop: 6, paddingHorizontal: 4, paddingBottom: 28, flexDirection: 'row', ...elev(2) }}>
        {[['tarefas', 'checkSquare', 'Tarefas'], ['cofre', 'bank', 'O Meu Cofre']].map(([k, ic, lb]) => (
          <Pressable key={k} onPress={() => setTab(k)} accessibilityRole="button"
            accessibilityLabel={lb} accessibilityState={{ selected: tab === k }}
            style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <Icon name={ic} size={24} color={tab === k ? cor : t.text3} />
            <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, fontWeight: '600',
              color: tab === k ? cor : t.text3 }}>{lb}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
