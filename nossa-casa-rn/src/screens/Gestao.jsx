import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { useStore } from '../store';
import { MEMBERS, ENV_BASE } from '../data';
import { EUR, WD } from '../format';
import { MEMBER_COLOR, S, R, elev, FONT } from '../theme';
import Icon from '../Icon';
import { Card, SectionTitle, Row, Label, Segmented, Toggle, Tap, Avatar, Pill } from '../ui';

// Um número escrevível com −/+ — o mesmo controlo em todo o lado
const NumField = ({ t, value, onChange, step = 5, min = 0, max = 99999, fmt = EUR }) => {
  const [edit, setEdit] = useState(null);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
      <Tap onPress={() => onChange(Math.max(min, value - step))} label="Menos" size={34}
        style={{ borderWidth: 1, borderColor: t.border, borderRadius: R.row }}>
        <Text style={{ fontFamily: FONT.display, fontSize: 17, color: t.accent }}>−</Text>
      </Tap>
      {edit === null ? (
        <Pressable onPress={() => setEdit(String(value))} accessibilityRole="button"
          accessibilityLabel="Escrever o valor"
          style={{ minWidth: 90, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontFamily: FONT.ui, fontSize: 15, fontWeight: '600', color: t.text2 }}>{fmt(value)}</Text>
        </Pressable>
      ) : (
        <TextInput value={edit} onChangeText={setEdit} keyboardType="decimal-pad" autoFocus
          onBlur={() => {
            const n = parseFloat(String(edit).replace(',', '.'));
            if (!isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
            setEdit(null);
          }}
          style={{ minWidth: 90, minHeight: 44, textAlign: 'center', borderWidth: 1,
            borderColor: t.state.info, borderRadius: R.row, fontFamily: FONT.ui,
            fontSize: 15, color: t.text1, backgroundColor: t.surface }} />
      )}
      <Tap onPress={() => onChange(Math.min(max, value + step))} label="Mais" size={34}
        style={{ borderWidth: 1, borderColor: t.border, borderRadius: R.row }}>
        <Text style={{ fontFamily: FONT.display, fontSize: 17, color: t.accent }}>+</Text>
      </Tap>
    </View>
  );
};

export default function Gestao({ t, me, onBack, onOpen }) {
  const { s, set, isAdmin, envelopes } = useStore();
  if (!isAdmin(me)) return null;   // a Gestão não existe para quem não é administrador

  const renda = s.renda ?? 3200;
  const atribuido = envelopes.reduce((a, e) => a + e.limit, 0);

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <View style={{ backgroundColor: t.chrome, paddingTop: 56, paddingHorizontal: 16,
        paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...elev(3) }}>
        <Tap onPress={onBack} label="Voltar"><Icon name="arrowLeft" size={22} color="#FFFFFF" /></Tap>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: '500', color: '#FFFFFF', letterSpacing: 0.25 }}>Gestão da Casa</Text>
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: 'rgba(255,255,255,.65)' }}>
            {me} · {s.roles[me] === 'admin' ? (MEMBERS[me] && me === 'Rita' ? 'administradora' : 'administrador') : 'adulto'}
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ padding: 16, gap: S.xl }}>
        <View>
          <SectionTitle t={t}>Orçamento</SectionTitle>
          <Card t={t} style={{ gap: S.lg }}>
            <View style={{ gap: S.md }}>
              <Label t={t}>Rendimento mensal previsto</Label>
              <NumField t={t} value={renda} step={50} min={0} max={99999}
                onChange={(v) => set({ renda: v })} />
            </View>
            <View style={{ height: 1, backgroundColor: t.divider }} />
            <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
              Atribuído aos envelopes: {EUR(atribuido)} · sobra {EUR(renda - atribuido)} para as metas.
            </Text>
          </Card>
        </View>

        <View>
          <SectionTitle t={t}>Semanada</SectionTitle>
          <Card t={t} style={{ gap: S.lg }}>
            <View style={{ gap: S.md }}>
              <Label t={t}>Quanto vale um ponto</Label>
              <NumField t={t} value={s.pointValue} step={0.05} min={0.01} max={5}
                onChange={(v) => set({ pointValue: Math.round(v * 100) / 100 })} />
            </View>
            <View style={{ gap: S.md }}>
              <Label t={t}>Pagar às</Label>
              <Segmented t={t} small value={s.payDay}
                onChange={(v) => set({ payDay: v })}
                options={WD.map((d, i) => ({ value: i, label: d.slice(0, 3) }))} />
            </View>
            <View style={{ height: 1, backgroundColor: t.divider }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>Dividir despesas a meias</Text>
                <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 17, color: t.text3 }}>
                  {s.splitHalf ? 'Cada despesa partilhada divide-se pelos dois adultos.'
                    : 'Quem paga assume a despesa por inteiro.'}
                </Text>
              </View>
              <Toggle t={t} on={s.splitHalf} label="Dividir a meias"
                onPress={() => set(x => ({ splitHalf: !x.splitHalf }))} />
            </View>
          </Card>
        </View>

        <View>
          <SectionTitle t={t}>A Casa</SectionTitle>
          <Card t={t} pad={false} style={{ paddingHorizontal: 16 }}>
            <Row t={t} icon="user" title="Membros e PIN"
              sub={`${Object.keys(MEMBERS).length} membros · ${Object.keys(s.pins).length} com PIN definido`}
              onPress={() => onOpen('membros')} />
            <Row t={t} icon="bank" title="Lojas" sub={`${s.stores.length} supermercados`}
              onPress={() => onOpen('lojas')} />
            <Row t={t} icon="fileDone" title="Categorias de equipamento"
              sub={`${s.equipCats.length} categorias`} onPress={() => onOpen('cats')} />
            <Row t={t} icon="heartPulse" title="Especialidades médicas"
              sub={`${s.specialities.length} especialidades`} onPress={() => onOpen('esp')} last />
          </Card>
        </View>

        <View>
          <SectionTitle t={t}>Membros</SectionTitle>
          <Card t={t} pad={false} style={{ paddingHorizontal: 16 }}>
            {Object.keys(MEMBERS).map((n, i, arr) => {
              const r = s.roles[n];
              const fem = n === 'Rita';
              const label = r === 'admin' ? (fem ? 'Administradora' : 'Administrador')
                : r === 'adulto' ? 'Adulto' : 'Criança';
              return (
                <Pressable key={n} onPress={() => onOpen('membro:' + n)} accessibilityRole="button"
                  accessibilityLabel={`${n}, ${label}`}
                  style={({ pressed }) => ({ minHeight: 52, flexDirection: 'row', alignItems: 'center',
                    gap: 12, borderBottomWidth: i === arr.length - 1 ? 0 : 1,
                    borderBottomColor: t.divider, opacity: pressed ? 0.7 : 1 })}>
                  <Avatar initial={MEMBERS[n].initial} color={MEMBER_COLOR[n]} size={32} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>{n}</Text>
                    <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
                      {MEMBERS[n].email || (s.pins[n] ? 'PIN definido' : 'sem PIN')}
                    </Text>
                  </View>
                  <Pill label={label} fg={t.text3} bg={t.subtle} border={t.border} />
                  <Icon name="caretRight" size={18} color={t.text3} />
                </Pressable>
              );
            })}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
