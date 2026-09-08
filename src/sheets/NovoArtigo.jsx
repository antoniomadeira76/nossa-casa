import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { Label, Choice, Toggle, Primary } from '../ui';

export default function NovoArtigo({ t, user, onClose }) {
  const { criarArtigo, seccoes } = useStore();
  const [form, setForm] = useState({
    label: '',
    // ⚠ O primeiro corredor já ESCOLHIDO, como no protótipo (`itemDraft.s: 0`).
    // Nascia a `null` e «o primeiro é o predefinido» ficava só no código: a
    // folha abria com as quatro pastilhas brancas e o botão desactivado — nem
    // uma cor do perfil à vista, e o dono da casa perguntou porquê. A escolha
    // que a loja ia fazer em silêncio passa a estar visível, e muda-se.
    section: seccoes[0] || null,
    staple: false,
    est: 0,
  });

  const handleSave = () => {
    if (!form.label.trim()) return;

    // ⚠ Pelo `criarArtigo` da loja, que também o manda para o servidor. Isto
    // era um `set` direto, e o artigo ficava só neste telefone — numa lista de
    // compras que é, por natureza, de duas pessoas.
    criarArtigo({
      label: form.label,
      // Sem escolha, vai para o primeiro corredor — que é onde a lista começa.
      section: form.section || seccoes[0],
      est: form.est || 0,
      staple: form.staple,
      by: user,
    });

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
          {/* ⚠ As secções da CASA. E a escolha guarda o NOME — o formulário
              guardava o índice, e a partir do momento em que a casa pode
              reordenar as secções um índice deixa de apontar para a mesma. */}
          {seccoes.map((sec) => (
            <Choice
              key={sec}
              t={t}
              label={sec}
              selected={form.section === sec}
              onPress={() => setForm(f => ({ ...f, section: sec }))}
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

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12,
        borderWidth: 1, borderColor: t.border, borderRadius: R.card, padding: 14 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>Artigo habitual</Text>
          <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
            {form.staple ? 'Volta à lista todas as semanas.' : 'Entra só desta vez.'}
          </Text>
        </View>
        <Toggle t={t} on={form.staple} label="Artigo habitual"
          onPress={() => setForm(f => ({ ...f, staple: !f.staple }))} />
      </View>

      <Primary comum
        t={t}
        label="Guardar artigo"
        disabled={!canSave}
        onPress={handleSave}
      />
    </View>
  );
}
