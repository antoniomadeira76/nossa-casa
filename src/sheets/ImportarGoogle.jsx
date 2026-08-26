import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { Label, Toggle, Primary, Pill } from '../ui';
import Icon from '../Icon';

export default function ImportarGoogle({ t, user, onClose }) {
  const { set, s } = useStore();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shareAll, setShareAll] = useState(false);
  const [selected, setSelected] = useState({});

  // Simulate fetching from Google Calendar
  // In production, this would call Google Calendar API
  useEffect(() => {
    // Demo: simulate fetching events
    const mockEvents = [
      {
        id: 'gc-1',
        title: 'Reunião com professor Léo',
        date: '2026-08-28',
        time: '14:30',
        recurring: false,
        owner: user,
      },
      {
        id: 'gc-2',
        title: 'Dentista Mia',
        date: '2026-09-02',
        time: '10:00',
        recurring: false,
        owner: user,
      },
      {
        id: 'gc-3',
        title: 'Reunião de trabalho',
        date: '2026-09-05',
        time: '09:00',
        recurring: true,
        owner: user,
      },
    ];
    setEvents(mockEvents);
    // Initialize selected state - non-recurring events enabled by default
    const initialSelected = {};
    mockEvents.forEach(e => {
      initialSelected[e.id] = !e.recurring;
    });
    setSelected(initialSelected);
    setLoading(false);
  }, [user]);

  const handleImport = () => {
    const toImport = events.filter(e => selected[e.id]);
    const newEvents = toImport.map(e => ({
      id: e.id,
      title: e.title,
      day: e.date,
      time: e.time,
      shared: shareAll,
      owner: user,
      manual: false,
      source: 'google',
    }));

    set(s => ({
      added: [...(s.added || []), ...newEvents],
      importDone: { ...s.importDone, [user]: new Date().toISOString() },
    }));

    onClose();
  };

  const toggleEvent = (id) => {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <View style={{ gap: S.lg }}>
      <View style={{ gap: S.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
          <Text style={{ flex: 1, fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>
            Eventos novos encontrados: {events.length}
          </Text>
        </View>

        {loading ? (
          <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: t.text3 }}>
            A carregar do Google Calendar...
          </Text>
        ) : events.length === 0 ? (
          <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: t.text3 }}>
            Sem eventos novos.
          </Text>
        ) : (
          <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={true}>
            <View style={{ gap: S.md }}>
              {events.map(e => (
                <Pressable
                  key={e.id}
                  onPress={() => toggleEvent(e.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected[e.id] }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: S.md,
                    padding: S.md,
                    borderRadius: R.row,
                    borderWidth: 1,
                    borderColor: t.border,
                    backgroundColor: selected[e.id] ? t.subtle : 'transparent',
                  }}>
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: R.sm,
                      borderWidth: 2,
                      borderColor: selected[e.id] ? t.accent : t.border,
                      backgroundColor: selected[e.id] ? t.accent : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    {selected[e.id] ? (
                      <Icon name="check" size={14} color="#FFFFFF" />
                    ) : null}
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontFamily: FONT.body,
                        fontSize: 14,
                        fontWeight: '500',
                        color: t.text2,
                      }}>
                      {e.title}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: S.md, alignItems: 'center' }}>
                      <Text
                        style={{
                          fontFamily: FONT.ui,
                          fontSize: 12,
                          color: t.text3,
                        }}>
                        {e.date} · {e.time}
                      </Text>
                      {e.recurring && (
                        <Pill
                          label="Recorrente"
                          fg={t.state.info}
                          bg={t.state.infoBg}
                          border={t.state.info}
                        />
                      )}
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      {events.length > 0 ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.md }}>
            <Text style={{ flex: 1, fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>
              Partilhar todos os eventos
            </Text>
            <Toggle
              t={t}
              on={shareAll}
              onPress={() => setShareAll(!shareAll)}
              label="Partilhar todos com a família"
            />
          </View>
          <View style={{ gap: S.sm }}>
            <Label t={t}>
              {shareAll ? 'Partilhados com a família' : 'Apenas para mim'}
            </Label>
            <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
              {selectedCount} eventos selecionados
            </Text>
          </View>

          <Primary
            t={t}
            label={`Importar ${selectedCount} evento${selectedCount !== 1 ? 's' : ''}`}
            disabled={selectedCount === 0}
            onPress={handleImport}
          />
        </>
      ) : null}
    </View>
  );
}
