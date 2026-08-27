import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Switch } from 'react-native';
import { S, R, FONT } from '../theme';
import Icon from '../Icon';
import { Card, SectionTitle, Pill } from '../ui';
import { evTime, dkey, pad2, parseKey } from '../format';

/**
 * GoogleCalendarImportModal — modal para importar eventos do Google Calendar
 *
 * Props:
 *   - t: theme
 *   - events: array de eventos do Google Calendar a importar
 *   - user: nome do utilizador ligado
 *   - onImportAll: callback(events) quando clica "Adicionar" (para família)
 *   - onImportPrivate: callback(events) quando clica "Adicionar Só para Mim"
 *   - onIgnore: callback() quando clica "Ignorar"
 *   - onClose: callback() para fechar o modal
 */

// Helper para formatar data para display (dd/mm)
const formatDateForDisplay = (dateKey) => {
  if (!dateKey) return 'Data indisponível';
  // Esperamos format 'd2026-08-28'
  const parsed = parseKey(dateKey);
  if (!parsed) return dateKey; // fallback
  return `${pad2(parsed.d)}/${pad2(parsed.m + 1)}`;
};

export default function GoogleCalendarImportModal({ t, events, user, onImportAll, onImportPrivate, onIgnore, onClose }) {
  const [recurringEnabled, setRecurringEnabled] = useState(false);

  // Separar eventos recorrentes e não recorrentes
  const { recurring, nonRecurring } = useMemo(() => {
    return {
      recurring: events.filter(e => e.isRecurring),
      nonRecurring: events.filter(e => !e.isRecurring),
    };
  }, [events]);

  // Determinar quais eventos mostrar (recorrentes só se enabled)
  const visibleEvents = useMemo(() => {
    return recurringEnabled ? [...nonRecurring, ...recurring] : nonRecurring;
  }, [nonRecurring, recurring, recurringEnabled]);

  const handleImportAll = () => {
    onImportAll(visibleEvents);
  };

  const handleImportPrivate = () => {
    onImportPrivate(visibleEvents);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.page, borderTopLeftRadius: 12, borderTopRightRadius: 12, overflow: 'hidden', flexDirection: 'column' }}>
      {/* Cabeçalho */}
      <View style={{ backgroundColor: t.card, borderBottomWidth: 1, borderBottomColor: t.border, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ gap: 2, flex: 1 }}>
          <Text style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: '500', color: t.text1 }}>
            Importar do Google
          </Text>
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
            {visibleEvents.length} evento{visibleEvents.length !== 1 ? 's' : ''} a importar
          </Text>
        </View>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar"
          style={{ width: 36, height: 36, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={20} color={t.text3} />
        </Pressable>
      </View>

      {/* Conteúdo scrollável */}
      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ padding: 16, gap: S.lg }}>
        {/* Toggle para eventos recorrentes */}
        {recurring.length > 0 && (
          <Card t={t} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: FONT.body, fontSize: 14, color: t.text2 }}>
                Incluir eventos recorrentes
              </Text>
              <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
                {recurring.length} evento{recurring.length !== 1 ? 's' : ''} recorrente{recurring.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <Switch
              value={recurringEnabled}
              onValueChange={setRecurringEnabled}
              trackColor={{ false: t.border, true: t.accent }}
              thumbColor="#FFFFFF"
              accessibilityRole="switch"
              accessibilityLabel="Incluir eventos recorrentes"
            />
          </Card>
        )}

        {/* Lista de eventos */}
        {visibleEvents.length > 0 ? (
          <View style={{ gap: S.md }}>
            <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.text3, textTransform: 'uppercase' }}>
              Eventos a importar
            </Text>
            {visibleEvents.map((event, idx) => (
              <Card key={`${event.id}-${idx}`} t={t} style={{ gap: S.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{ width: 42, flexShrink: 0 }}>
                    <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.text3 }}>
                      {event.time ? evTime(event.time) : '—'}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text numberOfLines={2} style={{ fontFamily: FONT.body, fontSize: 14, color: t.text2 }}>
                      {event.title}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Pill label={formatDateForDisplay(event.date)}
                        fg={t.text3} bg={t.subtle} border={t.border} />
                      {event.isRecurring && (
                        <Pill label="Recorrente" fg={t.state.warn} bg={t.state.warnBg} border={t.state.warn} />
                      )}
                      <Pill label="Google Calendar" fg={t.text3} bg={t.subtle} border={t.border} />
                    </View>
                    {event.description && (
                      <Text numberOfLines={2} style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
                        {event.description}
                      </Text>
                    )}
                  </View>
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: S.xl, gap: S.md }}>
            <Icon name="calendar" size={32} color={t.text3} />
            <Text style={{ fontFamily: FONT.body, fontSize: 14, color: t.text2, textAlign: 'center' }}>
              Nenhum evento novo para importar
            </Text>
            <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3, textAlign: 'center' }}>
              Os seus eventos do Google Calendar já estão sincronizados.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Rodapé com botões */}
      {visibleEvents.length > 0 && (
        <View style={{ backgroundColor: t.card, borderTopWidth: 1, borderTopColor: t.border, padding: 16, gap: S.md }}>
          <Pressable onPress={handleImportAll} accessibilityRole="button" accessibilityLabel="Adicionar eventos para a família"
            style={({ pressed }) => ({ minHeight: 48, borderRadius: R.pill, backgroundColor: t.accent,
              alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}>
            <Text style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>
              Adicionar
            </Text>
          </Pressable>

          <Pressable onPress={handleImportPrivate} accessibilityRole="button" accessibilityLabel="Adicionar eventos só para si"
            style={({ pressed }) => ({ minHeight: 48, borderRadius: R.pill, borderWidth: 1, borderColor: t.accent,
              backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: '600', color: t.accent }}>
              Adicionar Só para Mim
            </Text>
          </Pressable>

          <Pressable onPress={onIgnore} accessibilityRole="button" accessibilityLabel="Ignorar eventos"
            style={({ pressed }) => ({ minHeight: 44, borderRadius: R.pill, backgroundColor: 'transparent',
              alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '500', color: t.text3 }}>
              Ignorar
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
