import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { Label, Choice, Toggle, Primary, EscolherMembro } from '../ui';
import Icon from '../Icon';
import ConfirmShare from '../ConfirmShare';
import { parseKey } from '../format';

export default function NovoEvento({ t, user, onClose, preFillDay }) {
  const { set, s } = useStore();
  const [form, setForm] = useState({
    title: '',
    date: null,
    time: '10:00',
    responsible: user,
    private: false,
  });
  const [confirming, setConfirming] = useState(false);

  // Pre-fill date if provided
  useEffect(() => {
    if (preFillDay) {
      const parsed = parseKey(preFillDay);
      if (parsed) {
        const dateStr = `${parsed.y}-${String(parsed.m + 1).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
        setForm(f => ({ ...f, date: dateStr }));
      }
    }
  }, [preFillDay]);

  const handleSave = () => {
    if (!form.title.trim() || !form.date) return;
    setConfirming(true);
  };

  const handleConfirm = () => {
    const id = 'evt-' + Date.now();
    const event = {
      id,
      title: form.title,
      date: form.date,
      time: form.time,
      responsible: form.responsible,
      owner: user,
      shared: !form.private,
      manual: true,
    };

    set(s => ({
      added: [...(s.added || []), event],
    }));

    setConfirming(false);
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
        <EscolherMembro t={t} membros={['Rita', 'Tomás', 'Léo', 'Mia']}
          valor={form.responsible}
          onEscolher={(name) => setForm(f => ({ ...f, responsible: name }))} />
      </View>

      {/* «Partilhar com a família», ligado — como na referência 18. Estava
          rotulado «Privado» com a legenda «Visível para toda a família»: o
          rótulo nomeia um estado e a legenda descreve o oposto, e quem lê tem
          de adivinhar qual dos dois o interruptor liga. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14,
        borderWidth: 1, borderColor: t.border, borderRadius: R.card, padding: 14 }}>
        <Icon name="home" size={22} color={t.slate} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>
            Partilhar com a família
          </Text>
          <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
            {form.private
              ? 'Fica só para si — mais ninguém o vê na Agenda.'
              : 'Fica visível para os 4 membros da casa e entra na Agenda de todos.'}
          </Text>
        </View>
        <Toggle t={t} on={!form.private} label="Partilhar com a família"
          onPress={() => setForm(f => ({ ...f, private: !f.private }))} />
      </View>

      <Primary
        t={t}
        label="Guardar evento"
        disabled={!canSave}
        onPress={handleSave}
      />

      {confirming ? (
        <ConfirmShare
          t={t}
          type="evento"
          isPrivate={form.private}
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </View>
  );
}
