import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { Label, Pill, Toggle, Primary } from '../ui';
import { SECTIONS } from '../data';

export default function NovoArtigo({ t, user, onClose }) {
  const { set } = useStore();
  const [form, setForm] = useState({
    label: '',
    section: 0,
    staple: false,
    est: 0,
  });

  const handleSave = () => {
    if (!form.label.trim()) return;

    const id = 'art-' + Date.now();
    const item = {
      id,
      s: form.section,
      label: form.label,
      est: form.est || 0,
      staple: form.staple,
      by: `Adicionado por ${user} · ${new Date().toLocaleDateString('pt-PT')}`,
    };

    set(s => ({
      newItems: [...(s.newItems || []), item],
    }));

    onClose();
  };

  const canSave = form.label.trim();

  return (
    <View style={{ gap: S.lg }}>
      <View style={{ gap: S.sm }}>
        <Label t={t}>Artigo</Label>
        <TextInput
          value={form.label}
          onChangeText={(v) => setForm(f => ({ ...f, label: v }))}
          placeholder="Ex: Leite meio-gordo · 1 L"
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
        <Label t={t}>Secção</Label>
        <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
          {SECTIONS.map((sec, idx) => (
            <Pill
              key={sec}
              t={t}
              label={sec}
              selected={form.section === idx}
              onPress={() => setForm(f => ({ ...f, section: idx }))}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: S.sm }}>
        <Label t={t}>Preço estimado (€)</Label>
        <TextInput
          value={String(form.est)}
          onChangeText={(v) => setForm(f => ({ ...f, est: parseFloat(v) || 0 }))}
          placeholder="0,00"
          keyboardType="decimal-pad"
          style={{
            minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body,
            fontSize: 15, color: t.text2, borderRadius: R.row, borderWidth: 1,
            borderColor: t.border, backgroundColor: t.card,
          }}
        />
      </View>

      <Toggle
        t={t}
        label="Artigo habitual (semanal)"
        value={form.staple}
        onChange={(v) => setForm(f => ({ ...f, staple: v }))}
      />

      <Primary
        t={t}
        label="Guardar artigo"
        disabled={!canSave}
        onPress={handleSave}
      />
    </View>
  );
}
