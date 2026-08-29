import React, { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT, MEMBER_COLOR } from '../theme';
import { EUR } from '../format';
import { MEMBERS } from '../data';
import { Card, SectionTitle, Label, Pill, Row, Avatar, Empty, AddButton, Primary, Segmented, Toggle, usePaged, Pager, Tap } from '../ui';
import Icon from '../Icon';
import Sheet from '../Sheet';
import NovaTarefa from '../sheets/NovaTarefa';
import Cofre from '../sheets/Cofre';

// Urgência: a caixa do número leva a cor, e a lista ordena-se por ela.
// A forma acompanha a cor — cheia, tracejada, contorno — para não depender do matiz.
const URG = [
  { key: 0, label: 'Urgente',    fill: true,  color: '#FF4D4F', dash: false },
  { key: 1, label: 'Normal',     fill: false, color: '#FAAD14', dash: true },
  { key: 2, label: 'Sem pressa', fill: false, color: '#D9D9D9', dash: false },
];

export default function Tarefas({ t, user }) {
  const st = useStore();
  const { s, set, allTasks, kidPts, dueOf, isRecurring } = st;
  const [filter, setFilter] = useState('Todos');
  const [manage, setManage] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cofre, setCofre] = useState(null);   // criança cujo cofre está aberto

  const all = allTasks();
  const shown = filter === 'Todos' ? all : all.filter(x => x.who === filter);
  const pg = usePaged(shown, 5);
  const task = all.find(x => x.id === manage);

  return (
    <>
      <View style={{ flexDirection: 'row', gap: S.md, flexWrap: 'wrap' }}>
        {['Todos', 'Rita', 'Tomás', 'Léo', 'Mia'].map(n => {
          const on = filter === n;
          return (
            <Pressable key={n} onPress={() => setFilter(n)} accessibilityRole="button"
              accessibilityLabel={n} accessibilityState={{ selected: on }}
              style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: R.pill, borderWidth: 1,
                borderColor: on ? t.chrome : t.border, backgroundColor: on ? t.chrome : 'transparent',
                flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              {n !== 'Todos' ? <View style={{ width: 8, height: 8, borderRadius: R.pill,
                backgroundColor: on ? '#FFFFFF' : MEMBER_COLOR[n] }} /> : null}
              <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: on ? '#FFFFFF' : t.text2 }}>{n}</Text>
            </Pressable>
          );
        })}
      </View>

      <View>
        <SectionTitle t={t}>Semanada das Crianças</SectionTitle>
        <Card t={t} style={{ gap: S.lg }}>
          <Label t={t}>1 pt = {EUR(s.pointValue)}</Label>
          <View style={{ flexDirection: 'row', gap: S.md }}>
            {['Léo', 'Mia'].map(k => {
              const pend = kidPts[k] - s.paidPts[k];
              return (
                <Pressable key={k} onPress={() => setCofre(k)}
                  accessibilityRole="button" accessibilityLabel={`Cofre do ${k}`}
                  style={({ pressed }) => ({ flex: 1, backgroundColor: pressed ? t.card : t.subtle,
                    borderWidth: 1, borderColor: t.border,
                    borderRadius: R.card, padding: 14, gap: S.md })}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 8, height: 8, borderRadius: R.pill, backgroundColor: MEMBER_COLOR[k] }} />
                    <Text style={{ flex: 1, fontFamily: FONT.body, fontSize: 14.5, color: t.text2 }}>{k}</Text>
                    <Icon name="caretRight" size={16} color={t.text3} />
                  </View>
                  <Text style={{ fontFamily: FONT.display, fontSize: 20, color: t.text2 }}>{pend} pt</Text>
                  <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>{EUR(pend * s.pointValue)} por pagar</Text>
                  <View style={{ height: 1, backgroundColor: t.divider }} />
                  <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.state.okDeep }}>
                    No cofre {EUR(st.vaultOf(k))}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
      </View>

      <View>
        <SectionTitle t={t} right={<Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>por urgência</Text>}>
          Rotinas e Tarefas
        </SectionTitle>
        {shown.length === 0 ? (
          <Empty t={t} icon="checkSquare" title="Sem tarefas nesta vista."
            hint="Use Acrescentar tarefa para criar a primeira rotina." />
        ) : (
          <View style={{ gap: S.md }}>
            {pg.slice.map((x, i) => {
              const idx = shown.indexOf(x) + 1;
              const done = !!s.done[x.id], pend = !!s.pending[x.id];
              const u = URG[x.urgency] || URG[1];
              const d = dueOf(x);
              const rec = isRecurring(x);
              // A urgência vive no distintivo do número — cor E forma —, não
              // também na borda do cartão. Na referência 06 os cartões são
              // lisos e só o distintivo muda; com a urgência nos dois sítios a
              // lista fica às riscas e o distintivo deixa de ser o sinal,
              // passa a ser redundante. A borda diz só o estado: feita, ou à
              // espera de confirmação.
              return (
                <Card key={x.id} t={t} style={{
                  borderWidth: done ? 2 : 1,
                  borderColor: done ? t.state.okBorder : pend ? t.state.info : t.border,
                  backgroundColor: done ? t.state.okBg : t.card,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Pressable onPress={() => st.tapTask(x.id, false)} accessibilityRole="button"
                      accessibilityLabel={`${pend ? 'Confirmar' : 'Marcar'} ${x.title} · ${u.label}${done ? ' · concluída' : ''}`}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minHeight: 44 }}>
                      {/* caixa do número: cor E forma dizem a urgência */}
                      <View style={{ width: 20, height: 20, borderRadius: R.sm,
                        backgroundColor: u.fill ? u.color : 'transparent',
                        borderWidth: u.fill ? 0 : 1.5, borderStyle: u.dash ? 'dashed' : 'solid',
                        borderColor: u.color, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontFamily: FONT.ui, fontSize: 11, fontWeight: '700',
                          color: u.fill ? '#FFFFFF' : t.text2 }}>{idx}</Text>
                      </View>
                      {/* Ícone de estado, como na referência: entre o número
                          e o avatar. Faltava — a linha não dizia se estava
                          feita, à espera, ou por fazer, sem ler a legenda. */}
                      <Icon name={done ? 'checkCircle' : pend ? 'clock' : 'infoCircle'} size={20}
                        color={done ? t.state.ok : pend ? t.state.info : t.text3} />
                      <Avatar initial={(MEMBERS[x.who] || { initial: '?' }).initial} color={MEMBER_COLOR[x.who] || t.text3} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text numberOfLines={2} style={{ fontFamily: FONT.body, fontSize: 15.5, color: t.text2 }}>{x.title}</Text>
                        <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11.5,
                          color: d && d.late ? t.state.errDeep : d && d.soon ? t.state.warnDeep : t.text3 }}>
                          {done && rec ? 'feita hoje · volta amanhã'
                            : pend ? 'Feito — a aguardar confirmação'
                            : d ? `${x.who} · ${d.text}` : `${x.who} · ${x.meta}`}
                        </Text>
                      </View>
                      {/* Pastilha contornada, como na referência: o amarelo
                          cheio competia com o distintivo da urgência. */}
                      {x.pts > 0 && !done ? <Pill label={`${x.pts} pt`} fg={t.text2} bg={t.card} border={t.border} /> : null}
                    </Pressable>
                    <Tap onPress={() => setManage(x.id)} label={`Gerir ${x.title}`} size={44}>
                      <Icon name="edit" size={20} color={t.text3} />
                    </Tap>
                  </View>
                </Card>
              );
            })}
            <Pager t={t} pg={pg} />
          </View>
        )}
      </View>

      <AddButton t={t} label="acrescentar tarefa" onPress={() => setSheetOpen(true)} />

      {sheetOpen ? (
        <Sheet t={t} title="Nova Tarefa" sub="Criar uma tarefa recorrente ou pontual"
          onClose={() => setSheetOpen(false)}>
          <NovaTarefa t={t} user={user} onClose={() => setSheetOpen(false)} />
        </Sheet>
      ) : null}

      {task ? (
        <Sheet t={t} title={task.title} sub={`${task.who} · ${task.meta}`} onClose={() => setManage(null)}
          action={<Primary t={t} label="Guardar Alterações" onPress={() => setManage(null)} />}>
          <View style={{ gap: S.md }}>
            <Label t={t}>Urgência</Label>
            <Segmented t={t} small value={task.urgency}
              options={URG.map(u => ({ value: u.key, label: u.label }))}
              onChange={(v) => set(x => ({ urg: { ...x.urg, [task.id]: v } }))} />
            <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
              {task.urgency === 0 ? 'Sobe ao topo da lista, com a caixa cheia a vermelho e borda vermelha.'
                : task.urgency === 1 ? 'Fica no meio da lista, com a caixa tracejada a âmbar e borda tracejada.'
                : 'Desce para o fim da lista, com a caixa em contorno cinzento.'}
            </Text>
          </View>

          <View style={{ gap: S.md }}>
            <Label t={t}>Prazo (opcional)</Label>
            <View style={{ flexDirection: 'row', gap: S.sm, alignItems: 'center' }}>
              <Pressable
                onPress={() => set(x => {
                  const newDue = { ...x.due };
                  if (task.dueKey) {
                    delete newDue[task.id];
                  } else {
                    newDue[task.id] = { key: task.dueKey || s.due[task.id]?.key, time: s.due[task.id]?.time || '18:00' };
                  }
                  return { due: newDue };
                })}
                style={{
                  flex: 1, minHeight: 44, paddingHorizontal: S.md, borderRadius: R.row, borderWidth: 1,
                  borderColor: task.dueKey ? t.chrome : t.border, backgroundColor: task.dueKey ? t.chrome : t.card,
                  justifyContent: 'center',
                }}>
                <Text style={{ fontFamily: FONT.body, fontSize: 15, color: task.dueKey ? '#FFFFFF' : t.text2 }}>
                  {task.dueKey ? '✓ Com prazo' : 'Sem prazo'}
                </Text>
              </Pressable>
              {task.dueKey && (
                <TextInput
                  value={task.dueTime || '18:00'}
                  onChangeText={(v) => set(x => ({ due: { ...x.due, [task.id]: { key: task.dueKey, time: v } } }))}
                  placeholder="18:00"
                  placeholderTextColor={t.text3}
                  maxLength={5}
                  style={{
                    width: 70, minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.ui,
                    fontSize: 15, color: t.text2, borderRadius: R.row, borderWidth: 1,
                    borderColor: t.border, backgroundColor: t.card, textAlign: 'center',
                  }}
                />
              )}
            </View>
            {dueOf(task) && (
              <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: dueOf(task).late ? t.state.errDeep : dueOf(task).soon ? t.state.warnDeep : t.text3 }}>
                Prazo: {dueOf(task).text}
              </Text>
            )}
          </View>

          <View style={{ gap: S.md }}>
            <Label t={t}>Atribuir a</Label>
            <Segmented t={t} small value={task.who}
              options={['Rita', 'Tomás', 'Léo', 'Mia'].map(n => ({ value: n, label: n }))}
              onChange={(v) => set(x => ({ taskEdits: { ...x.taskEdits, [task.id]: { ...(x.taskEdits[task.id] || {}), who: v } } }))} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: t.subtle,
            borderWidth: 1, borderColor: t.border, borderRadius: R.card, padding: 14 }}>
            <Icon name="refresh" size={22} color={t.chrome} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>Alternar entre as crianças</Text>
              <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
                {s.rotate[task.id] ? `Alterna semanalmente. Esta semana: ${task.who}.` : 'A tarefa fica sempre com o mesmo membro.'}
              </Text>
            </View>
            <Toggle t={t} on={!!s.rotate[task.id]} label="Alternar entre as crianças"
              onPress={() => set(x => ({ rotate: { ...x.rotate, [task.id]: !x.rotate[task.id] } }))} />
          </View>
        </Sheet>
      ) : null}

      {cofre ? <Cofre t={t} kid={cofre} onClose={() => setCofre(null)} /> : null}
    </>
  );
}
