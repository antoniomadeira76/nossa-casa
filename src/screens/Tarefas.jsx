import React, { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT, corDoMembro } from '../theme';
import { EUR, subtituloDaTarefa } from '../format';

import { Card, SectionTitle, Label, Pill, Row, Avatar, Empty, AddButton, Primary, Segmented, Toggle, usePaged, Pager, Tap, avatarDe } from '../ui';
import Icon from '../Icon';
import Sheet from '../Sheet';
import Confirm from '../Confirm';
import ListaArrastavel, { ATRASO_PARA_PEGAR } from '../ListaArrastavel';
import NovaTarefa from '../sheets/NovaTarefa';
import Cofre from '../sheets/Cofre';

// Urgência: a caixa do número leva a cor, e a lista ordena-se por ela.
// A forma acompanha a cor — cheia, tracejada, contorno — para não depender do matiz.
const URG = [
  { key: 0, label: 'Urgente',    fill: true,  color: '#FF4D4F', dash: false },
  { key: 1, label: 'Normal',     fill: false, color: '#FAAD14', dash: true },
  { key: 2, label: 'Sem pressa', fill: false, color: '#D9D9D9', dash: false },
];

// `abrir` é o id de uma tarefa cuja folha de gestão deve estar aberta à
// chegada — é o que faz uma tarefa tocada no Início levar àquela tarefa.
export default function Tarefas({ t, user, abrir }) {
  const st = useStore();
  const { s, set, allTasks, kidPts, dueOf, isRecurring, removerTarefa, membros: MEMBERS,
          membrosDaCasa, criancas, pontosNasTarefas } = st;
  const [filter, setFilter] = useState('Todos');
  const [manage, setManage] = useState(abrir || null);
  React.useEffect(() => { if (abrir) setManage(abrir); }, [abrir]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [aApagar, setAApagar] = useState(null);
  const [cofre, setCofre] = useState(null);   // criança cujo cofre está aberto

  const all = allTasks();
  const shown = filter === 'Todos' ? all : all.filter(x => x.who === filter);
  const pg = usePaged(shown, 5);
  const task = all.find(x => x.id === manage);

  // A tarefa que está a ser apagada, e o que ela já rendeu.
  //
  // ⚠ Lê-se do `all` e não do `task`: a folha de gestão fecha quando se
  // confirma, e a pergunta tem de continuar a saber de que tarefa fala.
  const aApagarTarefa = all.find(x => x.id === aApagar);
  const pontosQueFicam = aApagarTarefa && s.done[aApagarTarefa.id]
    && criancas.includes(aApagarTarefa.who) ? (aApagarTarefa.pts || 0) : 0;

  return (
    <>
      <View style={{ flexDirection: 'row', gap: S.md, flexWrap: 'wrap' }}>
        {['Todos', ...membrosDaCasa].map(n => {
          const on = filter === n;
          return (
            <Pressable key={n} onPress={() => setFilter(n)} accessibilityRole="button"
              accessibilityLabel={n} accessibilityState={{ selected: on }}
              // ⚠ Tinha 40. Medido no navegador, eram os dois únicos alvos
              // deste ecrã abaixo dos 44 do INVARIANTE #5 — e são o primeiro
              // que a mão encontra ao abrir as Tarefas.
              style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: R.pill, borderWidth: 1,
                borderColor: on ? t.chrome : t.border, backgroundColor: on ? t.chrome : 'transparent',
                flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              {n !== 'Todos' ? <View style={{ width: 8, height: 8, borderRadius: R.pill,
                backgroundColor: on ? '#FFFFFF' : corDoMembro(n, MEMBERS[n]?.cor) }} /> : null}
              <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: on ? '#FFFFFF' : t.text2 }}>{n}</Text>
            </Pressable>
          );
        })}
      </View>

      {criancas.length === 0 || !pontosNasTarefas ? null : (
      <View>
        <SectionTitle t={t}>Semanada das Crianças</SectionTitle>
        <Card t={t} style={{ gap: S.lg }}>
          {/* A 0 EUR os pontos contam e nao valem dinheiro — a linha do
              cambio nao teria sentido. */}
          <Label t={t}>{s.pointValue > 0 ? `1 pt = ${EUR(s.pointValue)}` : 'Pontos sem valor em euros'}</Label>
          <View style={{ flexDirection: 'row', gap: S.md }}>
            {criancas.map(k => {
              // ⚠ Sem os valores por omissão, uma criança acrescentada à
              // casa mostrava «NaN pt».
              //
              // O DEMO() semeia o `paidPts` só para as crianças da
              // demonstração; uma criança nova não tinha entrada, e
              // `numero - undefined` é NaN. Este era o ÚNICO sítio que
              // subtraía sem defesa — o Cofre, o KidApp e a Gestão já a
              // tinham, o que fez o defeito aparecer num ecrã só.
              const pend = (kidPts[k] ?? 0) - (s.paidPts[k] ?? 0);
              return (
                <Pressable key={k} onPress={() => setCofre(k)}
                  accessibilityRole="button" accessibilityLabel={`Cofre ${st.deNome(k)} ${k}`}
                  style={({ pressed }) => ({ flex: 1, backgroundColor: pressed ? t.card : t.subtle,
                    borderWidth: 1, borderColor: t.border,
                    borderRadius: R.card, padding: 14, gap: S.md })}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 8, height: 8, borderRadius: R.pill, backgroundColor: corDoMembro(k, MEMBERS[k]?.cor) }} />
                    <Text style={{ flex: 1, fontFamily: FONT.body, fontSize: 14.5, color: t.text2 }}>{k}</Text>
                    <Icon name="caretRight" size={16} color={t.text3} />
                  </View>
                  <Text style={{ fontFamily: FONT.display, fontSize: 20, color: t.text2 }}>{pend} pt</Text>
                  {s.pointValue > 0 ? (
                  <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>{EUR(pend * s.pointValue)} por pagar</Text>
                  ) : null}
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
      )}

      <View>
        <SectionTitle t={t} right={<Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>por urgência</Text>}>
          Rotinas e Tarefas
        </SectionTitle>
        {shown.length === 0 ? (
          <Empty t={t} icon="checkSquare" title="Sem tarefas nesta vista."
            hint="Use Acrescentar tarefa para criar a primeira rotina." />
        ) : (
          <View>
            {/* A ordem dentro do grupo é da mão. Ver `ListaArrastavel`: a
                pressão longa arma, o dedo move, e a tarefa nunca sai do seu
                grupo de urgência — a urgência manda nos grupos (INVARIANTE #6)
                e a mão manda dentro do seu.

                ⚠ Não há página para virar, e não é por preguiça. Arrasta-se o
                que está NESTA página, e o `reordenarTarefas` trata do resto:
                percorre o grupo inteiro e põe as arrastadas nos lugares que
                eram delas, deixando as das outras páginas onde estavam. É a
                mesma volta que faz a vista filtrada por membro funcionar, e é
                por isso que uma reordenação na página 1 não desarruma a 2. */}
            <ListaArrastavel
              itens={pg.slice}
              grupoDe={(x) => x.urgency}
              espaco={S.md}
              aoLargar={(ids) => st.reordenarTarefas(ids)}
              render={(x, { arrastando, armar }) => {
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
                  borderWidth: arrastando ? 2 : done ? 2 : 1,
                  borderColor: arrastando ? t.accent
                    : done ? t.state.okBorder : pend ? t.state.info : t.border,
                  backgroundColor: done ? t.state.okBg : t.card,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {/* ⚠ É o `onLongPress` DESTE Pressable que arma o arrasto.
                        Não há alça, e é de propósito: uma alça era o sexto
                        alvo numa linha que já tem cinco (erro #6 do
                        CLAUDE.md). O toque curto continua a marcar a tarefa —
                        a `ListaArrastavel` só toma conta do dedo depois de
                        estar armada. */}
                    <Pressable onPress={() => st.tapTask(x.id, false)} accessibilityRole="button"
                      onLongPress={() => armar(x.id)} delayLongPress={ATRASO_PARA_PEGAR}
                      accessibilityLabel={`${pend ? 'Confirmar' : 'Marcar'} ${x.title} · ${u.label}${done ? ' · concluída' : ''}`}
                      accessibilityHint="Mantenha premido para mudar a ordem dentro do grupo de urgência"
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
                      <Avatar {...avatarDe(x.who, MEMBERS[x.who], t.text3)} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text numberOfLines={2} style={{ fontFamily: FONT.body, fontSize: 15.5, color: t.text2 }}>{x.title}</Text>
                        <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11.5,
                          color: d && d.late ? t.state.errDeep : d && d.soon ? t.state.warnDeep : t.text3 }}>
                          {done && rec ? 'feita hoje · volta amanhã'
                            : pend ? 'Feito — a aguardar confirmação'
                            : subtituloDaTarefa(x, d)}
                        </Text>
                      </View>
                      {/* Pastilha contornada, como na referência: o amarelo
                          cheio competia com o distintivo da urgência. */}
                      {pontosNasTarefas && x.pts > 0 && !done ? <Pill label={`${x.pts} pt`} fg={t.text2} bg={t.card} border={t.border} /> : null}
                    </Pressable>
                    <Tap onPress={() => setManage(x.id)} label={`Gerir ${x.title}`} size={44}>
                      <Icon name="edit" size={20} color={t.text3} />
                    </Tap>
                  </View>
                </Card>
              );
              }}
            />
            <View style={{ marginTop: S.md }}>
              <Pager t={t} pg={pg} />
            </View>
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
        <Sheet t={t} title={task.title} sub={subtituloDaTarefa(task)} onClose={() => setManage(null)}
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
              <Pressable accessibilityRole="button"
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
              options={membrosDaCasa.map(n => ({ value: n, label: n }))}
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

          {/* ── Apagar ──────────────────────────────────────────────────────
              Não havia. Havia `taskGone` no estado e no filtro do `allTasks`
              desde sempre, e nada o escrevia: uma tarefa criada por engano
              ficava na casa para sempre, e esta folha só oferecia urgência,
              prazo e responsável.

              Fica em baixo, depois de tudo o que se pode ajustar, e separado
              por uma linha: quem vem aqui para mudar a urgência não passa pelo
              apagar a caminho. */}
          <View style={{ height: 1, backgroundColor: t.divider }} />
          <Pressable onPress={() => setAApagar(task.id)}
            accessibilityRole="button" accessibilityLabel={`Apagar ${task.title}`}
            style={{ minHeight: 44, borderRadius: R.pill, borderWidth: 1, borderColor: t.state.err,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icon name="trash" size={18} color={t.state.errDeep} />
            <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '500', color: t.state.errDeep }}>
              Apagar Tarefa
            </Text>
          </Pressable>
        </Sheet>
      ) : null}

      {/* ⚠ A pergunta diz o que a tarefa RENDEU, quando rendeu.
          Apagar uma tarefa feita não tira pontos a ninguém — ficam guardados
          num movimento aditivo (INVARIANTE #2) — e quem apaga tem de saber
          isso ANTES de decidir, senão hesita por uma razão que não existe. */}
      {aApagar && aApagarTarefa ? (
        <Confirm t={t} destructive icon="trash"
          title={`Apagar «${aApagarTarefa.title}»?`}
          message={pontosQueFicam
            ? `A tarefa sai da lista. Os ${pontosQueFicam} pontos que já rendeu ficam `
              + `com ${aApagarTarefa.who} — um ponto ganho não se desfaz. Não se desfaz.`
            : 'A tarefa sai da lista e não volta. Não se desfaz.'}
          confirmLabel="Apagar"
          onConfirm={() => { removerTarefa(aApagar); setAApagar(null); setManage(null); }}
          onCancel={() => setAApagar(null)} />
      ) : null}

      {cofre ? <Cofre t={t} kid={cofre} onClose={() => setCofre(null)} /> : null}
    </>
  );
}
