import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { Label, Choice, Segmented, Primary, EscolherMembro } from '../ui';
import { TODAY_KEY, dkey, pad2 } from '../format';
import Icon from '../Icon';

const RECUR_OPTS = ['Uma vez', 'Todos os dias', 'Dias de semana'];
const URG_OPTS = [
  { label: 'Urgente', value: 0 },
  { label: 'Normal', value: 1 },
  { label: 'Sem pressa', value: 2 },
];

export default function NovaTarefa({ t, user, onClose }) {
  const { set, membrosDaCasa } = useStore();
  const [form, setForm] = useState({
    title: '',
    who: user,
    recur: 'Uma vez',
    pts: 0,
    urg: 1,
    dueKey: null,
    dueTime: '18:00',
  });

  const handleSave = () => {
    if (!form.title.trim()) return;

    const id = 'tsk-' + Date.now();
    set(s => ({
      newTasks: [...(s.newTasks || []), {
        id,
        title: form.title,
        who: form.who,
        recur: form.recur,
        pts: form.pts,
      }],
      urg: { ...s.urg, [id]: form.urg },
      due: form.dueKey ? { ...s.due, [id]: { key: form.dueKey, time: form.dueTime } } : s.due,
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
        <Label t={t}>Atribuir a</Label>
        <EscolherMembro t={t} membros={membrosDaCasa}
          valor={form.who} onEscolher={(name) => setForm(f => ({ ...f, who: name }))} />
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
            <Choice
              key={opt.value}
              t={t}
              label={opt.label}
              selected={form.urg === opt.value}
              onPress={() => setForm(f => ({ ...f, urg: opt.value }))}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: S.sm }}>
        <Label t={t}>Prazo (opcional)</Label>
        <View style={{ flexDirection: 'row', gap: S.sm, alignItems: 'center' }}>
          <Pressable
            onPress={() => setForm(f => ({ ...f, dueKey: form.dueKey ? null : TODAY_KEY }))}
            style={{
              flex: 1, minHeight: 44, paddingHorizontal: S.md, borderRadius: R.row, borderWidth: 1,
              borderColor: form.dueKey ? t.chrome : t.border, backgroundColor: form.dueKey ? t.chrome : t.card,
              justifyContent: 'center',
            }}>
            <Text style={{ fontFamily: FONT.body, fontSize: 15, color: form.dueKey ? '#FFFFFF' : t.text2 }}>
              {form.dueKey ? '✓ Com prazo' : 'Sem prazo'}
            </Text>
          </Pressable>
          {form.dueKey && (
            <TextInput
              value={form.dueTime}
              onChangeText={(v) => setForm(f => ({ ...f, dueTime: v }))}
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
