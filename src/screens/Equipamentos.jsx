import React, { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { EUR } from '../format';
import { Card, SectionTitle, Empty, AddButton, Label, Pill, Primary } from '../ui';
import Icon from '../Icon';
import Sheet from '../Sheet';

export default function Equipamentos({ t, user, onClose }) {
  const { s, set, allEquip, isAdmin } = useStore();
  const [sheet, setSheet] = useState(null);
  const [form, setForm] = useState({ name: '', purchase: '', warranty: 365, category: 0 });

  const eq = allEquip();
  const today = Math.floor(Date.now() / 86400000) * 86400000;

  const byWarranty = (e) => {
    const warranty = (e.warrantyDays || 365) * 86400000 + (e.purchaseAt || today);
    const daysLeft = Math.floor((warranty - today) / 86400000);
    return daysLeft;
  };

  const inWarranty = eq.filter(e => byWarranty(e) > 90);
  const expiring = eq.filter(e => {
    const d = byWarranty(e);
    return d > 0 && d <= 90;
  });
  const expired = eq.filter(e => byWarranty(e) <= 0);

  const handleSave = () => {
    if (!form.name.trim()) return;
    const id = 'eq-' + Date.now();
    set(s => ({
      newEquip: [...(s.newEquip || []), {
        id,
        name: form.name,
        category: form.category,
        purchase: form.purchase,
        warrantyDays: form.warranty,
        purchaseAt: today,
      }],
    }));
    setSheet(null);
    setForm({ name: '', purchase: '', warranty: 365, category: 0 });
  };

  const Section = ({ title, items, color }) => (
    items.length ? (
      <View>
        <SectionTitle t={t}>{title}</SectionTitle>
        <View style={{ gap: S.md }}>
          {items.map(e => (
            <Card key={e.id} t={t} style={{ borderLeftWidth: 4, borderLeftColor: color }}>
              <View style={{ gap: S.sm }}>
                <Text style={{ fontFamily: FONT.body, fontSize: 15, fontWeight: '600', color: t.text2 }}>
                  {e.name}
                </Text>
                <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
                  {e.category} · {e.purchase || 'Data desconhecida'}
                </Text>
                <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: color }}>
                  {Math.floor(byWarranty(e))} dias de garantia
                </Text>
              </View>
            </Card>
          ))}
        </View>
      </View>
    ) : null
  );

  return (
    <>
      <Section title="Em Garantia" items={inWarranty} color={t.state.ok} />
      <Section title="A Expirar (90 dias)" items={expiring} color={t.state.warn} />
      <Section title="Fora de Garantia" items={expired} color={t.state.err} />

      {eq.length === 0 ? (
        <Empty t={t} icon="houseGear" title="Sem equipamentos registados." hint="Comece a registar os aparelhos da casa." />
      ) : null}

      <AddButton t={t} label="registar equipamento" onPress={() => setSheet('novo')} />

      {sheet === 'novo' ? (
        <Sheet t={t} title="Novo Equipamento" sub="Registar com data e garantia"
          onClose={() => setSheet(null)}>
          <View style={{ gap: S.lg }}>
            <View style={{ gap: S.sm }}>
              <Label t={t}>Nome</Label>
              <TextInput
                value={form.name}
                onChangeText={(v) => setForm(f => ({ ...f, name: v }))}
                placeholder="Ex: Frigorífico LG"
                placeholderTextColor={t.text3}
                style={{
                  minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body,
                  fontSize: 15, color: t.text2, borderRadius: R.row, borderWidth: 1,
                  borderColor: t.border, backgroundColor: t.card,
                }}
              />
            </View>

            <View style={{ gap: S.sm }}>
              <Label t={t}>Data de compra</Label>
              <TextInput
                value={form.purchase}
                onChangeText={(v) => setForm(f => ({ ...f, purchase: v }))}
                placeholder="dd/mm/aaaa"
                style={{
                  minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body,
                  fontSize: 15, color: t.text2, borderRadius: R.row, borderWidth: 1,
                  borderColor: t.border, backgroundColor: t.card,
                }}
              />
            </View>

            <View style={{ gap: S.sm }}>
              <Label t={t}>Garantia (dias)</Label>
              <TextInput
                value={String(form.warranty)}
                onChangeText={(v) => setForm(f => ({ ...f, warranty: parseInt(v) || 365 }))}
                keyboardType="number-pad"
                style={{
                  minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body,
                  fontSize: 15, color: t.text2, borderRadius: R.row, borderWidth: 1,
                  borderColor: t.border, backgroundColor: t.card,
                }}
              />
            </View>

            <Primary t={t} label="Guardar" onPress={handleSave} disabled={!form.name.trim()} />
          </View>
        </Sheet>
      ) : null}
    </>
  );
}
