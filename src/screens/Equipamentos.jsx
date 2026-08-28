import React, { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { TODAY, pad2, plural } from '../format';
import { Card, SectionTitle, Empty, AddButton, Label, Choice, Primary } from '../ui';
import Sheet from '../Sheet';

// dd/mm/aaaa → milissegundos UTC. É o formato em que as datas são guardadas.
const parseDMY = (s) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s || ''));
  return m ? Date.UTC(+m[3], +m[2] - 1, +m[1]) : null;
};
const fmtDMY = (ms) => {
  const d = new Date(ms);
  return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
};

const CATS = ['Eletrodomésticos', 'Aquecimento', 'Informática', 'Outros'];

// Um número negativo de «dias de garantia» não se lê. Diga-se o que aconteceu.
const warrantyLabel = (days) => {
  if (days <= 0) return `Garantia terminou há ${plural(Math.abs(days), 'dia', 'dias')}`;
  return `Faltam ${plural(days, 'dia', 'dias')} de garantia`;
};
export default function Equipamentos({ t }) {
  const { set, allEquip } = useStore();
  const [sheet, setSheet] = useState(null);
  const [form, setForm] = useState({ name: '', bought: '', warranty: 365, cat: CATS[0] });

  const eq = allEquip();

  // Dias até ao fim da garantia, contra o TODAY da app — não contra o relógio,
  // senão os equipamentos discordam do resto dos ecrãs.
  const byWarranty = (e) => {
    const end = parseDMY(e.warrantyEnd);
    if (!end) return typeof e.daysLeft === 'number' ? e.daysLeft : 0;
    const now = Date.UTC(TODAY.y, TODAY.m, TODAY.d);
    return Math.round((end - now) / 86400000);
  };

  const inWarranty = eq.filter(e => byWarranty(e) > 90);
  const expiring = eq.filter(e => {
    const d = byWarranty(e);
    return d > 0 && d <= 90;
  });
  const expired = eq.filter(e => byWarranty(e) <= 0);

  // Gravar na mesma forma das sementes (cat/bought/warrantyEnd). Guardar uma
  // forma diferente era o que fazia a lista mostrar «undefined».
  const handleSave = () => {
    if (!form.name.trim()) return;
    const boughtMs = parseDMY(form.bought) ?? Date.UTC(TODAY.y, TODAY.m, TODAY.d);
    set(x => ({
      newEquip: [...(x.newEquip || []), {
        id: 'eq-' + Date.now(),
        name: form.name.trim(),
        cat: form.cat,
        bought: fmtDMY(boughtMs),
        warrantyEnd: fmtDMY(boughtMs + (form.warranty || 365) * 86400000),
      }],
    }));
    setSheet(null);
    setForm({ name: '', bought: '', warranty: 365, cat: CATS[0] });
  };

  const Section = ({ title, items, color, text }) => (
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
                  {[e.cat, e.bought && `comprado a ${e.bought}`].filter(Boolean).join(' · ')}
                </Text>
                <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: text }}>
                  {warrantyLabel(byWarranty(e))}
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
      {/* Barra na cor viva, texto no tom profundo — o vivo não contrasta sobre cartão claro */}
      <Section title="Em Garantia" items={inWarranty} color={t.state.ok} text={t.state.okDeep} />
      <Section title="A Expirar (90 dias)" items={expiring} color={t.state.warn} text={t.state.warnDeep} />
      <Section title="Fora de Garantia" items={expired} color={t.state.err} text={t.state.errDeep} />

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
              <Label t={t}>Categoria</Label>
              <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
                {CATS.map(c => (
                  <Choice key={c} t={t} label={c} selected={form.cat === c}
                    onPress={() => setForm(f => ({ ...f, cat: c }))} />
                ))}
              </View>
            </View>

            <View style={{ gap: S.sm }}>
              <Label t={t}>Data de compra</Label>
              <TextInput
                value={form.bought}
                onChangeText={(v) => setForm(f => ({ ...f, bought: v }))}
                placeholder="dd/mm/aaaa"
                placeholderTextColor={t.text3}
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
