import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Switch } from 'react-native';
import { S, R, FONT, elev } from '../theme';
import Icon, { GoogleG } from '../Icon';
import { pad2, parseKey } from '../format';
import { Label, Opcao } from '../ui';
import { VISIBILIDADES } from '../store';

// Helper para formatar data para display (dd/mm)
const formatDateForDisplay = (dateKey) => {
  if (!dateKey) return 'Data indisponível';
  const parsed = parseKey(dateKey);
  if (!parsed) return dateKey;
  return `${pad2(parsed.d)}/${pad2(parsed.m + 1)}`;
};

// Data · hora · local, na ordem em que se lê
const formatEventDescription = (event) => {
  const parts = [];
  if (event.date) parts.push(formatDateForDisplay(event.date));
  if (event.time) parts.push(event.time);
  if (event.description) parts.push(event.description);
  return parts.join(' · ');
};

export default function GoogleCalendarImportModal({ t, events, onImportar, onIgnore }) {
  // Os recorrentes aparecem na lista, mas por omissão ficam de fora.
  const [selected, setSelected] = useState(() => {
    const init = {};
    events.forEach(e => { init[e.id] = !e.isRecurring; });
    return init;
  });
  const [visibilidade, setVisibilidade] = useState('familia');

  const toggleEvent = (id) => setSelected(prev => ({ ...prev, [id]: !prev[id] }));

  const selectedEvents = events.filter(e => selected[e.id]);
  const n = selectedEvents.length;

  const handleImport = () => {
    if (!n) return;
    onImportar(selectedEvents, visibilidade);
  };

  return (
    <View style={{
      width: '100%', maxWidth: 420, maxHeight: '100%',
      backgroundColor: t.surface, borderRadius: 14, overflow: 'hidden', ...elev(3),
    }}>
      {/* Cabeçalho */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12,
        paddingHorizontal: 20, paddingTop: 20, paddingBottom: S.lg }}>
        <GoogleG size={22} style={{ marginTop: 2 }} />
        <View style={{ flex: 1, gap: S.xs }}>
          <Text style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: '500', color: t.text1 }}>
            {events.length} evento{events.length === 1 ? '' : 's'} novo{events.length === 1 ? '' : 's'}
          </Text>
          <Text style={{ fontFamily: FONT.body, fontSize: 14, color: t.text3 }}>
            Escolha os que quer na Nossa Casa.
          </Text>
        </View>
      </View>

      {/* Eventos */}
      <ScrollView style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: S.lg, gap: S.md, paddingBottom: S.lg }}>
        {events.map(e => {
          const on = !!selected[e.id];
          return (
            <Pressable key={e.id} onPress={() => toggleEvent(e.id)}
              accessibilityRole="checkbox" accessibilityState={{ checked: on }}
              accessibilityLabel={e.title}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44,
                paddingVertical: 12, paddingHorizontal: 12, borderRadius: R.card, borderWidth: 1,
                // O preenchimento de informação é claro e fixo; no modo escuro
                // dava texto quase branco sobre azul claro. Aí a superfície é que marca.
                backgroundColor: on ? (t.dark ? t.subtle : t.state.infoBg) : t.card,
                borderColor: on ? t.accent : t.border,
              }}>
              <View style={{
                width: 22, height: 22, borderRadius: R.sm, flexShrink: 0,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: on ? t.accent : 'transparent',
                borderWidth: on ? 0 : 1.5, borderColor: t.border,
              }}>
                {on ? <Icon name="check" size={14} color="#FFFFFF" /> : null}
              </View>
              <View style={{ flex: 1, gap: S.xs }}>
                <Text style={{ fontFamily: FONT.body, fontSize: 15, color: on ? t.text1 : t.text3 }}>
                  {e.title}
                </Text>
                <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
                  {formatEventDescription(e)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ height: 1, backgroundColor: t.border, marginHorizontal: S.lg }} />

      {/* Os mesmos três níveis do «Agendar evento». A importação era o único
          sítio da app onde não se podia dizer «só os adultos» — e é onde entram
          de uma vez os eventos de trabalho de quem importa a agenda. */}
      <View style={{ gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.lg }}>
        <Label t={t}>Quem vê</Label>
        {VISIBILIDADES.map(v => (
          <Opcao key={v.chave} t={t} titulo={v.rotulo} detalhe={v.detalhe}
            selected={visibilidade === v.chave}
            onPress={() => setVisibilidade(v.chave)} />
        ))}
      </View>

      {/* Ações */}
      <View style={{ flexDirection: 'row', gap: S.md, paddingHorizontal: S.lg, paddingBottom: S.lg }}>
        <Pressable onPress={onIgnore} accessibilityRole="button" accessibilityLabel="Agora não"
          style={({ pressed }) => ({
            flex: 1, minHeight: 44, borderRadius: R.card, borderWidth: 1, borderColor: t.border,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: pressed ? t.subtle : 'transparent',
          })}>
          <Text style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: '500', color: t.text3 }}>
            Agora não
          </Text>
        </Pressable>

        <Pressable onPress={handleImport} disabled={!n}
          accessibilityRole="button" accessibilityState={{ disabled: !n }}
          accessibilityLabel={`Adicionar ${n} evento${n === 1 ? '' : 's'}`}
          style={({ pressed }) => ({
            flex: 1.4, minHeight: 44, borderRadius: R.card,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: n ? t.state.infoBg : t.subtle,
            opacity: pressed ? 0.85 : 1,
          })}>
          <Text numberOfLines={1} style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: '700',
            color: n ? t.accent : t.text3 }}>
            Adicionar {n} evento{n === 1 ? '' : 's'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
