import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { useStore, VISIBILIDADES } from '../store';
import CampoData from '../CampoData';
import { S, R, FONT } from '../theme';
import { Label, Primary, EscolherMembro, Opcao } from '../ui';
import Icon from '../Icon';
import ConfirmShare from '../ConfirmShare';
import { parseKey } from '../format';

export default function NovoEvento({ t, user, onClose, preFillDay }) {
  const { set, s, membrosDaCasa } = useStore();
  const [form, setForm] = useState({
    title: '',
    day: null,
    time: '10:00',
    responsible: user,
    visibilidade: 'familia',
  });
  const [confirming, setConfirming] = useState(false);

  // Pre-fill date if provided
  useEffect(() => {
    if (preFillDay) {
      const parsed = parseKey(preFillDay);
      if (parsed) {
        setForm(f => ({ ...f, day: preFillDay }));
      }
    }
  }, [preFillDay]);

  const handleSave = () => {
    if (!form.title.trim() || !form.day) return;
    setConfirming(true);
  };

  const handleConfirm = () => {
    const id = 'evt-' + Date.now();
    // O campo é `day`, e a chave é `d2026-08-21`. Isto escrevia
    // `date: '2026-08-21'` — nome diferente e formato diferente do que a app
    // lê. O evento gravava-se e não aparecia em lado nenhum: nem na Agenda,
    // nem no Início, nem na grelha do mês. Guardar parecia não fazer nada, e
    // fazia — só que num campo que ninguém consulta.
    const event = {
      id,
      title: form.title,
      day: form.day,
      time: form.time,
      // `who` é a linha que a Agenda mostra por baixo do título.
      who: form.responsible,
      responsible: form.responsible,
      owner: user,
      visibilidade: form.visibilidade,
      manual: true,
    };

    set(s => ({
      added: [...(s.added || []), event],
    }));

    setConfirming(false);
    onClose();
  };

  const canSave = form.title.trim() && form.day;

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
        {/* Era um botão cujo manipulador não fazia nada e trazia um comentário
            a prometer um calendário para mais tarde. Um controlo que parece
            tocável e não faz nada, a meio do caminho de marcar um evento.
            Agora escreve-se a data ou escolhe-se no calendário. */}
        <CampoData t={t} valor={form.day}
          onChange={(chave) => setForm(f => ({ ...f, day: chave }))} />
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
        <EscolherMembro t={t} membros={membrosDaCasa}
          valor={form.responsible}
          onEscolher={(name) => setForm(f => ({ ...f, responsible: name }))} />
      </View>

      {/* Três níveis, e não um interruptor. «Partilhar» ligado ou desligado
          eram a casa toda ou mais ninguém, e faltava o do meio — que é o que
          uma família precisa mais vezes: uma consulta, uma reunião na escola,
          uma conta a pagar. Coisas que os dois adultos têm de saber e que não
          têm de aparecer na agenda de uma criança de sete anos. */}
      <View style={{ gap: S.md }}>
        <Label t={t}>Quem vê</Label>
        {VISIBILIDADES.map(v => (
          <Opcao key={v.chave} t={t} titulo={v.rotulo} detalhe={v.detalhe}
            selected={form.visibilidade === v.chave}
            onPress={() => setForm(f => ({ ...f, visibilidade: v.chave }))} />
        ))}
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
          isPrivate={form.visibilidade === 'so-eu'}
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </View>
  );
}
