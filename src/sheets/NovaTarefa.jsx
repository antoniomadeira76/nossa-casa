import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { Label, Pill, Segmented, Primary } from '../ui';

const RECUR_OPTS = ['Uma vez', 'Todos os dias', 'Dias de semana'];
const URG_OPTS = [
  { label: 'Urgente', value: 0 },
  { label: 'Normal', value: 1 },
  { label: 'Sem pressa', value: 2 },
];

export default function NovaTarefa({ t, user, onClose }) {
  const { set } = useStore();
  const [form, setForm] = useState({
    title: '',
    who: user,
    recur: 'Uma vez',
    pts: 0,
    urg: 1,
    due: null,
  });

  const handleSave = () => {
    if (!form.title.trim()) return;

    const id = 'tsk-' + Date.now();
    const task = {
      id,
      title: form.title,
      who: form.who,
      recur: form.recur,
      pts: form.pts,
      urg: form.urg,
      due: form.due,
    };

    set(s => ({
      newTasks: [...(s.newTasks || []), task],
    }));

    onClose();
  };

  const canSave = form.title.trim();

  return (
    <View style={{ gap: S.lg }}>
      <View style={{ gap: S.sm }}>
        <Label t={t}>Título da tarefa</Label>
        <TextInput
          value={form.title}
          onChangeText={(v) => setForm(f => ({ ...f, title: v }))}
          placeholder="Ex: Lavar a louça"
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
        <Label t={t}>Responsável</Label>
        <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
          {['Rita', 'Tomás', 'Léo', 'Mia'].map(name => (
            <Pill
              key={name}
              t={t}
              label={name}
              selected={form.who === name}
              onPress={() => setForm(f => ({ ...f, who: name }))}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: S.sm }}>
        <Label t={t}>Recorrência</Label>
        <Segmented
          t={t}
          options={RECUR_OPTS}
          value={form.recur}
          onChange={(v) => setForm(f => ({ ...f, recur: v }))}
        />
      </View>

      <View style={{ gap: S.sm }}>
        <Label t={t}>Pontos de bónus</Label>
        <TextInput
          value={String(form.pts)}
          onChangeText={(v) => setForm(f => ({ ...f, pts: parseInt(v) || 0 }))}
          placeholder="0"
          keyboardType="number-pad"
          maxLength={2}
          style={{
            minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body,
            fontSize: 15, color: t.text2, borderRadius: R.row, borderWidth: 1,
            borderColor: t.border, backgroundColor: t.card,
          }}
        />
      </View>

      <View style={{ gap: S.sm }}>
        <Label t={t}>Urgência</Label>
        <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
          {URG_OPTS.map(opt => (
            <Pill
              key={opt.value}
              t={t}
              label={opt.label}
              selected={form.urg === opt.value}
              onPress={() => setForm(f => ({ ...f, urg: opt.value }))}
            />
          ))}
        </View>
      </View>

      <Primary
        t={t}
        label="Guardar tarefa"
        disabled={!canSave}
        onPress={handleSave}
      />
    </View>
  );
}
