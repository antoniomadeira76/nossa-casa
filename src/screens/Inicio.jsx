import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT, MEMBER_COLOR } from '../theme';
import { EUR, plural, evTime, TODAY_KEY, dayLabel } from '../format';
import { MEMBERS } from '../data';
import { Card, SectionTitle, Label, Pill, Row, Bar, Tile, Avatar, Empty, usePaged, Pager } from '../ui';
import Icon from '../Icon';

export default function Inicio({ t, user, go, onSaude, onEquip, onGestao, onDoc }) {
  const st = useStore();
  const { s, allTasks, allEvents, envelopes, budget, spent, remaining, dueOf, isRecurring } = st;

  const hour = 9;
  const greet = hour < 13 ? 'Bom dia' : hour < 20 ? 'Boa tarde' : 'Boa noite';

  const tasks = allTasks();
  const toConfirm = tasks.filter(x => s.pending[x.id]);
  const overdue = tasks.filter(x => x.today && !s.done[x.id] && !s.pending[x.id]);
  const tight = envelopes.filter(e => e.used / e.limit >= 0.94);
  const settleBase = s.clearedSeeds ? 0 : 86.5;

  // Precisa de si — só o que exige decisão, por ordem de urgência
  const needs = [];
  if (toConfirm.length) needs.push({ icon: 'clock', color: t.state.info,
    title: plural(toConfirm.length, 'tarefa a confirmar', 'tarefas a confirmar'),
    sub: [...new Set(toConfirm.map(x => x.who))].join(', '), go: () => go('tarefas') });
  if (!s.settled && settleBase > 0) needs.push({ icon: 'wallet', color: t.accent,
    title: 'Contas por acertar', sub: `O Tomás deve ${EUR(settleBase)}`, go: () => go('dinheiro') });
  tight.forEach(e => needs.push({ icon: 'warning', color: t.state.warn,
    title: `Envelope ${e.name} no limite`, sub: `${EUR(Math.max(0, e.limit - e.used))} disponíveis`, go: () => go('dinheiro') }));
  if (overdue.length) needs.push({ icon: 'checkSquare', color: t.text3,
    title: plural(overdue.length, 'tarefa por fazer hoje', 'tarefas por fazer hoje'),
    sub: [...new Set(overdue.map(x => x.who))].join(', '), go: () => go('tarefas') });

  const needsPg = usePaged(needs, 5);
  const today = allEvents().filter(e => e.day === TODAY_KEY && (e.shared || e.owner === user))
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const todayTasks = tasks.filter(x => x.today);
  const pct = Math.round((spent / budget) * 100);

  return (
    <>
      <View style={{ gap: S.md }}>
        <Text style={{ fontFamily: FONT.display, fontSize: 28, fontWeight: '500', color: t.text1 }}>
          {greet}, {user}
        </Text>
        <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
          {dayLabel(TODAY_KEY).replace('Hoje · ', '')} · {today.length} eventos e {overdue.length} tarefas por concluir
        </Text>
      </View>

      {needs.length ? (
        <View>
          <SectionTitle t={t}>Precisa de Si</SectionTitle>
          <View style={{ gap: S.md }}>
            {needsPg.slice.map((n, i) => (
              <Card key={i} t={t} style={{ borderLeftWidth: 4, borderLeftColor: n.color }}>
                <Row t={t} title={n.title} sub={n.sub} onPress={n.go} last
                  icon={undefined} right={<Icon name="caretRight" size={18} color={t.text3} />} />
              </Card>
            ))}
            <Pager t={t} pg={needsPg} />
          </View>
        </View>
      ) : null}

      <View>
        <SectionTitle t={t}>Agenda de Hoje</SectionTitle>
        {today.length === 0 ? (
          <Empty t={t} icon="calendar" title="Nada agendado para hoje."
            hint="Use Agendar Evento na Agenda para acrescentar o primeiro." />
        ) : (
          <View style={{ gap: S.md }}>
            {today.map(e => (
              <Card key={e.id} t={t}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ width: 42, fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.text3 }}>
                    {evTime(e.time)}
                  </Text>
                  <Avatar initial={(MEMBERS[e.owner] || { initial: '?' }).initial} color={MEMBER_COLOR[e.owner] || t.text3} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text numberOfLines={1} style={{ fontFamily: FONT.body, fontSize: 15.5, color: t.text2 }}>{e.title}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>{e.who}</Text>
                  </View>
                  <Pill label={e.shared ? 'Família' : 'Só eu'}
                    fg={e.shared ? t.state.info : t.text3}
                    bg={e.shared ? t.state.infoBg : t.subtle}
                    border={e.shared ? t.state.info : t.border} />
                </View>
              </Card>
            ))}
          </View>
        )}
      </View>

      <View>
        <SectionTitle t={t}>Tarefas de Hoje</SectionTitle>
        <View style={{ gap: S.md }}>
          {todayTasks.map((x, i) => {
            const done = !!s.done[x.id], pend = !!s.pending[x.id];
            const d = dueOf(x);
            const rec = isRecurring(x);
            return (
              <Card key={x.id} t={t} style={{
                borderWidth: done ? 2 : 1,
                borderColor: done ? t.state.okBorder : pend ? t.state.info : t.border,
                backgroundColor: done ? t.state.okBg : t.card,
              }}>
                <Row t={t} last
                  onPress={() => st.tapTask(x.id, false)}
                  title={x.title}
                  sub={done && rec ? 'feita hoje · volta amanhã'
                    : pend ? 'Feito — a aguardar confirmação'
                    : d ? `${x.who} · ${d.text}` : `${x.who} · ${x.meta}`}
                  right={<>
                    {x.pts > 0 && !done ? <Pill label={`${x.pts} pt`} fg={t.state.warnDeep} bg={t.state.warnBg} border={t.state.warn} /> : null}
                  </>}
                  icon={done ? 'checkCircle' : pend ? 'clock' : 'infoCircle'} />
              </Card>
            );
          })}
        </View>
      </View>

      <View>
        <SectionTitle t={t}>Orçamento de {s.monthName}</SectionTitle>
        <Card t={t} style={{ gap: S.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Label t={t}>Disponível</Label>
              <Text style={{ fontFamily: FONT.display, fontSize: 28, color: t.text2 }}>{EUR(remaining)}</Text>
            </View>
            <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3, textAlign: 'right' }}>
              de {EUR(budget)}{'\n'}orçamento
            </Text>
          </View>
          <Bar t={t} pct={pct} color={t.accent} />
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
            {pct} % do orçamento de {s.monthName} usado até agora.
          </Text>
        </Card>
      </View>

      <Tile t={t} kind={s.settled || settleBase === 0 ? 'info' : 'warn'}>
        {s.settled || settleBase === 0
          ? 'As contas entre a Rita e o Tomás estão acertadas.'
          : `O Tomás deve à Rita ${EUR(settleBase)} de despesas partilhadas.`}
      </Tile>

      <View style={{ flexDirection: 'row', gap: S.md, flexWrap: 'wrap' }}>
        <Pressable onPress={onSaude}
          style={{ flex: 1, minWidth: 140, minHeight: 48, backgroundColor: t.card, borderRadius: R.row,
            borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center', gap: S.sm }}>
          <Icon name="heartPulse" size={18} color={t.text2} />
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text2, textAlign: 'center' }}>Saúde</Text>
        </Pressable>

        <Pressable onPress={onEquip}
          style={{ flex: 1, minWidth: 140, minHeight: 48, backgroundColor: t.card, borderRadius: R.row,
            borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center', gap: S.sm }}>
          <Icon name="houseGear" size={18} color={t.text2} />
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text2, textAlign: 'center' }}>Equip.</Text>
        </Pressable>

        <Pressable onPress={onGestao}
          style={{ flex: 1, minWidth: 140, minHeight: 48, backgroundColor: t.card, borderRadius: R.row,
            borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center', gap: S.sm }}>
          <Icon name="sliders" size={18} color={t.text2} />
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text2, textAlign: 'center' }}>Gestão</Text>
        </Pressable>

        <Pressable onPress={onDoc}
          style={{ flex: 1, minWidth: 140, minHeight: 48, backgroundColor: t.card, borderRadius: R.row,
            borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center', gap: S.sm }}>
          <Icon name="fileText" size={18} color={t.text2} />
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text2, textAlign: 'center' }}>Docs</Text>
        </Pressable>
      </View>
    </>
  );
}
