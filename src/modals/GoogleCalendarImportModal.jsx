import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Switch } from 'react-native';
import { S, R, FONT } from '../theme';
import Icon from '../Icon';
import { evTime, pad2, parseKey } from '../format';

// Helper para formatar data para display (dd/mm)
const formatDateForDisplay = (dateKey) => {
  if (!dateKey) return 'Data indisponível';
  const parsed = parseKey(dateKey);
  if (!parsed) return dateKey;
  return `${pad2(parsed.d)}/${pad2(parsed.m + 1)}`;
};

// Helper para formatar descrição do evento
const formatEventDescription = (event) => {
  const parts = [];
  if (event.date) parts.push(formatDateForDisplay(event.date));
  if (event.time) parts.push(event.time);
  if (event.description) parts.push(event.description);
  return parts.join(' · ');
};

export default function GoogleCalendarImportModal({ t, events, user, onImportAll, onImportPrivate, onIgnore, onClose }) {
  const [selected, setSelected] = useState({});
  const [shared, setShared] = useState(false);
  const [recurringEnabled, setRecurringEnabled] = useState(false);

  // Cor fixa para checkboxes (azul navy, não accent)
  const checkboxColor = '#1f3a93';

  // Separar eventos recorrentes e não recorrentes
  const { recurring, nonRecurring } = useMemo(() => {
    return {
      recurring: events.filter(e => e.isRecurring),
      nonRecurring: events.filter(e => !e.isRecurring),
    };
  }, [events]);

  // Determinar quais eventos mostrar
  const visibleEvents = useMemo(() => {
    return recurringEnabled ? [...nonRecurring, ...recurring] : nonRecurring;
  }, [nonRecurring, recurring, recurringEnabled]);

  // Inicializar seleção (todos selecionados por padrão)
  useMemo(() => {
    const newSelected = {};
    nonRecurring.forEach(e => { newSelected[e.id] = true; });
    setSelected(newSelected);
  }, [nonRecurring]);

  const toggleEvent = (eventId) => {
    setSelected(prev => ({ ...prev, [eventId]: !prev[eventId] }));
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const selectedEvents = visibleEvents.filter(e => selected[e.id]);

  const handleImport = () => {
    if (shared) {
      onImportAll(selectedEvents);
    } else {
      onImportPrivate(selectedEvents);
    }
  };

  return (
    <View style={{ maxHeight: '80vh', backgroundColor: t.page, borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden', flexDirection: 'column', position: 'relative' }}>
      {/* Close Button */}
      <Pressable onPress={onClose} style={{ position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: 16, backgroundColor: t.chrome, alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        <Icon name="close" size={18} color="#FFFFFF" />
      </Pressable>

      {/* Cabeçalho */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 18, paddingTop: 24, gap: 2, borderBottomWidth: 1, borderBottomColor: t.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: '600', color: t.text1 }}>
            {visibleEvents.length} evento{visibleEvents.length !== 1 ? 's' : ''} novo{visibleEvents.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>
          Escolha os que quer na Nossa Casa.
        </Text>
      </View>

      {/* Conteúdo scrollável */}
      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 14, gap: S.lg }}>
        {/* Toggle para eventos recorrentes */}
        {recurring.length > 0 && (
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: FONT.body, fontSize: 15, fontWeight: '500', color: t.text1 }}>
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
              />
            </View>
          </View>
        )}

        {/* Lista de eventos com checkboxes */}
        {visibleEvents.length > 0 && (
          <View style={{ gap: S.md }}>
            <Text style={{ fontFamily: FONT.ui, fontSize: 11, fontWeight: '600', color: t.text3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Eventos a importar
            </Text>
            {visibleEvents.map((event) => (
              <Pressable key={event.id} onPress={() => toggleEvent(event.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12,
                  backgroundColor: t.card, borderRadius: R.card, borderWidth: 1.5,
                  borderColor: selected[event.id] ? checkboxColor : t.border }}>
                {/* Checkbox */}
                <View style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: selected[event.id] ? checkboxColor : 'transparent',
                  borderWidth: selected[event.id] ? 0 : 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {selected[event.id] && <Icon name="check" size={14} color="#FFFFFF" />}
                </View>
                {/* Conteúdo */}
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontFamily: FONT.body, fontSize: 14, fontWeight: '500', color: t.text1 }}>
                    {event.title}
                  </Text>
                  <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
                    {formatEventDescription(event)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Partilhar com a família */}
      {visibleEvents.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: t.border, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: FONT.body, fontSize: 14, fontWeight: '500', color: t.text1 }}>
              Partilhar com a família
            </Text>
            <Switch
              value={shared}
              onValueChange={setShared}
              trackColor={{ false: t.border, true: t.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
            {shared ? 'Visíveis para toda a família' : 'Ficam visíveis apenas para si'}
          </Text>
        </View>
      )}

      {/* Botões */}
      {visibleEvents.length > 0 && selectedCount > 0 && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 14, gap: S.md, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Pressable onPress={onIgnore} style={{ flex: 1, minHeight: 44, borderRadius: R.pill,
            alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '500', color: t.text3 }}>
              Agora não
            </Text>
          </Pressable>

          <Pressable onPress={handleImport} style={{ flex: 1, minHeight: 44, borderRadius: R.pill,
            backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>
              Adicionar {selectedCount}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
