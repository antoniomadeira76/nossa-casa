import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { Label, Pill, Toggle, Primary } from '../ui';
import Icon from '../Icon';

export default function NovoEvento({ t, user, onClose }) {
  const { set, s } = useStore();
  const [form, setForm] = useState({
    title: '',
    date: null,
    time: '10:00',
    responsible: user,
    private: false,
  });

  const handleSave = () => {
    if (!form.title.trim()) return;

    const id = 'evt-' + Date.now();
    const event = {
      id,
      title: form.title,
      date: form.date, // será um YYYY-MM-DD
      time: form.time,
      responsible: form.responsible,
      private: form.private,
      manual: true,
    };

    set(s => ({
      added: [...(s.added || []), event],
    }));

    onClose();
  };

  const canSave = form.title.trim() && form.date;

  return (
    <View style={{ gap: S.lg }}>
      <View style={{ gap: S.sm }}>
        <Label t={t}>Título do evento</Label>
        <TextInput
          value={form.title}
          onChangeText={(v) => setForm(f => ({ ...f, title: v }))}
          placeholder="Ex: Reunião com professor"
          placeholderTextColor={t.text3}
          maxLength={60}
          style={{
            minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body,
            fontSize: 15, color: t.text2, borderRadius: R.row, borderWidth: 1,
            borderColor: t.border, backgroundColor: t.card,
          }}
        />
      </View>

      <View style={{ gap: S.sm }}>
        <Label t={t}>Data</Label>
        <Pressable
          onPress={() => {/* será implementado com date picker */}}
          style={{
            minHeight: 44, paddingHorizontal: S.md, borderRadius: R.row,
            borderWidth: 1, borderColor: t.border, backgroundColor: t.card,
            justifyContent: 'center',
          }}>
          <Text style={{ fontFamily: FONT.body, fontSize: 15, color: form.date ? t.text2 : t.text3 }}>
            {form.date ? new Date(form.date + 'T00:00').toLocaleDateString('pt-PT') : 'Escolher data'}
          </Text>
        </Pressable>
      </View>

      <View style={{ gap: S.sm }}>
        <Label t={t}>Hora</Label>
        <TextInput
          value={form.time}
          onChangeText={(v) => setForm(f => ({ ...f, time: v }))}
          placeholder="HH:MM"
          keyboardType="decimal-pad"
          style={{
            minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body,
            fontSize: 15, color: t.text2, borderRadius: R.row, borderWidth: 1,
            borderColor: t.border, backgroundColor: t.card,
          }}
        />
      </View>

      <View style={{ gap: S.sm }}>
        <Label t={t}>Responsável</Label>
        <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
          {['Rita', 'Tomás', 'Léo', 'Mia'].map(name => (
            <Pill
              key={name}
              t={t}
              label={name}
              selected={form.responsible === name}
              onPress={() => setForm(f => ({ ...f, responsible: name }))}
            />
          ))}
        </View>
      </View>

      <Toggle
        t={t}
        label="Privado (só para mim)"
        value={form.private}
        onChange={(v) => setForm(f => ({ ...f, private: v }))}
      />

      <Primary
        t={t}
        label="Guardar evento"
        disabled={!canSave}
        onPress={handleSave}
      />
    </View>
  );
}
