import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import CampoData from '../CampoData';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { TODAY, pad2, plural, warrantyDaysLeft, daysUntil, EUR, chaveDeDMY, dmyDeChave, TODAY_KEY } from '../format';
import { Card, SectionTitle, Empty, AddButton, Label, Choice, Primary, Pill } from '../ui';
import Icon from '../Icon';
import Sheet from '../Sheet';
import FichaEquipamento from '../sheets/FichaEquipamento';

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
  const [ficha, setFicha] = useState(null);   // equipamento cuja ficha está aberta
  const [form, setForm] = useState({ name: '', bought: '', warranty: 365, cat: CATS[0] });

  const eq = allEquip();

  const byWarranty = warrantyDaysLeft;

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

  // Uma lista só, «Registados», como na referência 11 — não três secções por
  // estado de garantia. O estado vai na pastilha à direita e na borda, que é
  // onde se lê sem ter de perceber em que secção se está.
  const estadoDe = (e) => {
    const d = byWarranty(e);
    if (d < 0) return { label: 'Fora de Garantia', cor: t.state.err, fundo: t.state.errBg, texto: t.state.errDeep };
    if (d <= 90) return { label: 'Garantia a Expirar', cor: t.state.warn, fundo: t.state.warnBg, texto: t.state.warnDeep };
    return { label: 'Em Garantia', cor: t.state.ok, fundo: t.state.okBg, texto: t.state.okDeep };
  };

  const valor = eq.reduce((a, e) => a + (e.price || 0), 0);
  const aExpirar = eq.filter(e => { const d = byWarranty(e); return d >= 0 && d <= 90; }).length;
  const expiradas = eq.filter(e => byWarranty(e) < 0).length;
  // A manutenção mais próxima que ainda não passou.
  const proxima = eq.map(e => e.maintDate).filter(Boolean)
    .map(v => ({ v, dias: daysUntil(v) }))
    .filter(x => x.dias !== null && x.dias >= 0)
    .sort((a, b) => a.dias - b.dias)[0];

  return (
    <>
      {/* O resumo que a referência tem no topo e faltava por inteiro. */}
      <Card t={t} style={{ gap: S.lg }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: S.lg }}>
          {[['Equipamentos', String(eq.length), t.text2],
            ['Valor registado', EUR(valor), t.text2],
            ['Garantias a expirar', String(aExpirar), aExpirar ? t.state.warnDeep : t.text2],
            ['Garantias expiradas', String(expiradas), expiradas ? t.state.errDeep : t.text2]].map(([rot, val, cor]) => (
            <View key={rot} style={{ width: '50%', gap: 2 }}>
              <Label t={t}>{rot}</Label>
              <Text style={{ fontFamily: FONT.display, fontSize: 21, color: cor }}>{val}</Text>
            </View>
          ))}
        </View>
        {proxima ? (
          <View style={{ gap: 2 }}>
            <Label t={t}>Próxima manutenção</Label>
            <Text style={{ fontFamily: FONT.display, fontSize: 21, color: t.text2 }}>{proxima.v}</Text>
          </View>
        ) : null}
      </Card>

      {eq.length ? (
        <View>
          <SectionTitle t={t}>Registados</SectionTitle>
          <View style={{ gap: S.md }}>
            {eq.map(e => {
              const est = estadoDe(e);
              return (
                <Card key={e.id} t={t} style={{ borderWidth: 1, borderColor: est.cor }}>
                  <Pressable onPress={() => setFicha(e.id)} accessibilityRole="button"
                    accessibilityLabel={e.name}
                    style={{ gap: S.md, minHeight: 52, justifyContent: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={{ fontFamily: FONT.body, fontSize: 15, fontWeight: '600', color: t.text2 }}>
                          {e.name}
                        </Text>
                        <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
                          {[e.bought && `Comprado a ${e.bought}`, e.price && EUR(e.price)]
                            .filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                      <Pill label={est.label} fg={est.texto} bg={est.fundo} border={est.cor} />
                    </View>
                    {/* A manutenção seguinte, com relógio, como na referência.
                        Estava nos dados desde sempre e não aparecia. */}
                    {e.maint ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md,
                        borderTopWidth: 1, borderTopColor: t.divider, paddingTop: S.md }}>
                        <Icon name="clock" size={16} color={t.text3} />
                        <Text numberOfLines={1} style={{ flex: 1, fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
                          {e.maint}{e.maintDate ? ` · ${e.maintDate}` : ''}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                </Card>
              );
            })}
          </View>
        </View>
      ) : (
        <Empty t={t} icon="houseGear" title="Sem equipamentos registados." hint="Comece a registar os aparelhos da casa." />
      )}

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
              {/* Uma compra não é no futuro. O limite poupa a correção. */}
              <CampoData t={t} valor={chaveDeDMY(form.bought)} maximo={TODAY_KEY}
                onChange={(k) => setForm(f => ({ ...f, bought: dmyDeChave(k) }))} />
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

      {ficha ? (
        <FichaEquipamento t={t} equip={eq.find(x => x.id === ficha)} onClose={() => setFicha(null)} />
      ) : null}
    </>
  );
}
