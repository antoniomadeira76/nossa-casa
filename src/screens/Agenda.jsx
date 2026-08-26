import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT, MEMBER_COLOR } from '../theme';
import { MONTHS, WD_SHORT, TODAY, TODAY_KEY, dkey, dayLabel, evTime, pad2 } from '../format';
import { MEMBERS } from '../data';
import { Card, SectionTitle, Pill, Avatar, Empty, AddButton, Tap, usePaged, Pager } from '../ui';
import Icon from '../Icon';
import Sheet from '../Sheet';
import NovoEvento from '../sheets/NovoEvento';

export default function Agenda({ t, user }) {
  const { s, allEvents } = useStore();
  const [open, setOpen] = useState(false);
  const [ym, setYm] = useState({ y: TODAY.y, m: TODAY.m });
  const [sel, setSel] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const mine = allEvents().filter(e => e.shared || e.owner === user);

  // A Agenda começa em hoje — o passado vive na ficha de cada membro
  const keys = [...new Set([TODAY_KEY, ...mine.map(e => e.day)])].filter(k => k >= TODAY_KEY).sort();
  const pg = usePaged(keys, 5);

  const grid = (() => {
    const first = new Date(ym.y, ym.m, 1);
    const shift = (first.getDay() + 6) % 7;
    const total = new Date(ym.y, ym.m + 1, 0).getDate();
    const rows = [];
    for (let r = 0; r < 6; r++) {
      const cells = [];
      let any = false;
      for (let c = 0; c < 7; c++) {
        const n = r * 7 + c - shift + 1;
        if (n < 1 || n > total) { cells.push(null); continue; }
        any = true;
        const key = dkey(ym.y, ym.m, n);
        cells.push({ n, key, evs: mine.filter(e => e.day === key) });
      }
      if (any) rows.push(cells);
    }
    return rows;
  })();

  const home = ym.y === TODAY.y && ym.m === TODAY.m;
  const selEvents = sel ? mine.filter(e => e.day === sel).sort((a, b) => (a.time || '').localeCompare(b.time || '')) : [];

  return (
    <>
      <Card t={t} style={{ gap: S.lg }}>
        <Pressable onPress={() => setOpen(v => !v)} accessibilityRole="button"
          accessibilityLabel={open ? 'Ver semana' : 'Ver mês'}
          style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: S.md }}>
          <Text style={{ flex: 1, fontFamily: FONT.display, fontSize: 17, fontWeight: '500', color: t.text1 }}>
            {MONTHS[ym.m]} de {ym.y}
          </Text>
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.accent }}>
            {open ? 'Ver semana' : 'Ver mês'}
          </Text>
          <Icon name={open ? 'caretUp' : 'caretDown'} size={20} color={t.text3} />
        </Pressable>

        {open ? (
          <View style={{ gap: S.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
              <Tap label="Ano anterior" onPress={() => setYm(v => ({ ...v, y: v.y - 1 }))}
                style={{ borderWidth: 1, borderColor: t.border, borderRadius: R.sm }}>
                <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.text2 }}>‹‹</Text>
              </Tap>
              <Tap label="Mês anterior" onPress={() => setYm(v => v.m === 0 ? { y: v.y - 1, m: 11 } : { ...v, m: v.m - 1 })}
                style={{ borderWidth: 1, borderColor: t.border, borderRadius: R.sm }}>
                <Icon name="caretLeft" size={16} color={t.text3} />
              </Tap>
              <Text style={{ flex: 1, textAlign: 'center', fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.text2 }}>
                {MONTHS[ym.m]} de {ym.y}
              </Text>
              <Tap label="Mês seguinte" onPress={() => setYm(v => v.m === 11 ? { y: v.y + 1, m: 0 } : { ...v, m: v.m + 1 })}
                style={{ borderWidth: 1, borderColor: t.border, borderRadius: R.sm }}>
                <Icon name="caretRight" size={16} color={t.text3} />
              </Tap>
              <Tap label="Ano seguinte" onPress={() => setYm(v => ({ ...v, y: v.y + 1 }))}
                style={{ borderWidth: 1, borderColor: t.border, borderRadius: R.sm }}>
                <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.text2 }}>››</Text>
              </Tap>
            </View>

            <View style={{ flexDirection: 'row' }}>
              {WD_SHORT.map(w => (
                <Text key={w} style={{ flex: 1, textAlign: 'center', fontFamily: FONT.ui,
                  fontSize: 10.5, fontWeight: '600', color: t.text3 }}>{w}</Text>
              ))}
            </View>

            {grid.map((row, ri) => (
              <View key={ri} style={{ flexDirection: 'row', gap: S.sm }}>
                {row.map((c, ci) => {
                  if (!c) return <View key={ci} style={{ flex: 1, minHeight: 46 }} />;
                  const isToday = home && c.n === TODAY.d;
                  const on = sel === c.key;
                  return (
                    <Pressable key={ci} onPress={() => setSel(on ? null : c.key)}
                      accessibilityRole="button"
                      accessibilityLabel={`${c.n} de ${MONTHS[ym.m].toLowerCase()}${c.evs.length ? ` · ${c.evs.length} eventos` : ''}`}
                      accessibilityState={{ selected: on }}
                      style={{ flex: 1, minHeight: 46, borderRadius: R.sm, alignItems: 'center',
                        justifyContent: 'center', gap: 4,
                        borderWidth: on ? 2 : 0, borderColor: t.accent,
                        backgroundColor: isToday ? t.chrome : c.evs.length ? t.subtle : 'transparent' }}>
                      <Text style={{ fontFamily: FONT.ui, fontSize: 14, fontWeight: '600',
                        color: isToday ? '#FFFFFF' : t.text2 }}>{c.n}</Text>
                      <View style={{ flexDirection: 'row', gap: 3, height: 5 }}>
                        {c.evs.slice(0, 3).map(e => (
                          <View key={e.id} style={{ width: 5, height: 5, borderRadius: R.pill,
                            backgroundColor: MEMBER_COLOR[e.owner] || t.text3 }} />
                        ))}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
              <Text style={{ flex: 1, fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
                Toque num dia para o ver.
              </Text>
              {home ? (
                <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>Mês atual</Text>
              ) : (
                <Pressable onPress={() => setYm({ y: TODAY.y, m: TODAY.m })} accessibilityRole="button"
                  accessibilityLabel="Voltar a hoje" style={{ minHeight: 44, justifyContent: 'center' }}>
                  <Text style={{ fontFamily: FONT.display, fontSize: 12.5, fontWeight: '700', color: t.accent }}>Voltar a hoje</Text>
                </Pressable>
              )}
            </View>
          </View>
        ) : null}
      </Card>

      {sel ? (
        <Card t={t} style={{ gap: S.md }}>
          <Text style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: '500', color: t.text1 }}>
            {dayLabel(sel)}
          </Text>
          {selEvents.length === 0 ? (
            <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: t.text3 }}>Nada agendado neste dia.</Text>
          ) : selEvents.map(e => (
            <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
              <Text style={{ width: 42, fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.text3 }}>{evTime(e.time)}</Text>
              <Avatar initial={(MEMBERS[e.owner] || { initial: '?' }).initial} color={MEMBER_COLOR[e.owner] || t.text3} />
              <Text numberOfLines={1} style={{ flex: 1, fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>{e.title}</Text>
            </View>
          ))}
          <AddButton t={t} label={`agendar em ${sel.slice(9)}/${sel.slice(6, 8)}`} onPress={() => {}} />
        </Card>
      ) : null}

      {/* legenda: uma cor por membro */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.lg }}>
        {Object.keys(MEMBERS).map(n => (
          <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: R.pill, backgroundColor: MEMBER_COLOR[n] }} />
            <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.text3 }}>{n}</Text>
          </View>
        ))}
      </View>

      {keys.length === 0 ? (
        <Empty t={t} icon="calendar" title="Sem eventos agendados." hint="Use Agendar evento para acrescentar o primeiro." />
      ) : pg.slice.map(k => {
        const evs = mine.filter(e => e.day === k).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
        return (
          <View key={k}>
            <SectionTitle t={t}>{dayLabel(k)}</SectionTitle>
            {evs.length === 0 ? (
              <Empty t={t} icon="calendar" title="Nada agendado." />
            ) : (
              <View style={{ gap: S.md }}>
                {evs.map(e => (
                  <Card key={e.id} t={t}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
                      <Text style={{ width: 42, fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.text3 }}>{evTime(e.time)}</Text>
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
        );
      })}
      <Pager t={t} pg={pg} />

      <AddButton t={t} label="agendar evento" onPress={() => setSheetOpen(true)} />

      {sheetOpen ? (
        <Sheet t={t} title="Novo Evento" sub="Criar um evento na agenda"
          onClose={() => setSheetOpen(false)}>
          <NovoEvento t={t} user={user} onClose={() => setSheetOpen(false)} />
        </Sheet>
      ) : null}
    </>
  );
}
