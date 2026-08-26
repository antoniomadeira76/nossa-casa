import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { SCHEMES, S, R, FONT, elev, MEMBER_COLOR } from '../theme';
import { EUR } from '../format';
import { MEMBERS } from '../data';
import { Card, Label, Row, Pill, Primary, Toggle, Segmented, Tap } from '../ui';
import Icon from '../Icon';
import Sheet from '../Sheet';

const ROLE_LABEL = (r, name) => {
  const fem = name === 'Rita' || name === 'Mia';
  return r === 'admin' ? (fem ? 'administradora' : 'administrador') : r === 'adulto' ? 'adulto' : 'criança';
};

export default function Perfil({ t, user, onClose, onSignOut }) {
  const st = useStore();
  const { s, set, isAdmin, canChangeRole, setRole, setPin, resetDemo, startBlank } = st;
  const [tab, setTab] = useState(null);         // null | gestao | membro
  const [member, setMember] = useState(null);
  const [pin, setPin_] = useState('');
  const [pinErr, setPinErr] = useState(null);

  const admin = isAdmin(user);
  const mode = s.themeByUser[user] || 'claro';
  const scheme = s.schemeByUser[user] ?? 0;

  if (tab === 'membro' && member) {
    const r = s.roles[member];
    const hasPin = !!s.pins[member];
    return (
      <Sheet t={t} title={member} sub={`${ROLE_LABEL(r, member)}${MEMBERS[member].email ? ' · ' + MEMBERS[member].email : ''}`}
        onClose={() => { setTab('gestao'); setMember(null); setPin_(''); setPinErr(null); }}>
        <Card t={t} pad={false} style={{ paddingHorizontal: 16 }}>
          <Row t={t} title="Papel na casa" sub={ROLE_LABEL(r, member)} last={!MEMBERS[member].kid}
            right={<Pill label={ROLE_LABEL(r, member)} fg={t.text3} bg={t.subtle} border={t.border} />} />
          {MEMBERS[member].kid ? (
            <Row t={t} title="PIN de entrada" last
              sub={hasPin ? 'PIN definido' : 'Ainda sem PIN — não consegue entrar'} />
          ) : null}
        </Card>

        {admin && r === 'crianca' ? (
          <View style={{ gap: S.md }}>
            <Label t={t}>Definir PIN de 4 dígitos</Label>
            <TextInput value={pin} onChangeText={(v) => { setPin_(v.replace(/\D/g, '').slice(0, 4)); setPinErr(null); }}
              keyboardType="number-pad" maxLength={4} secureTextEntry
              accessibilityLabel="PIN de 4 dígitos"
              style={{ minHeight: 48, borderRadius: R.row, borderWidth: 1, borderColor: pinErr ? t.state.err : t.border,
                paddingHorizontal: 14, fontFamily: FONT.display, fontSize: 18, color: t.text1, letterSpacing: 8 }} />
            {pinErr ? <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.state.errDeep }}>{pinErr}</Text> : null}
            <Primary t={t} label={hasPin ? 'Alterar PIN' : 'Definir PIN'} disabled={pin.length !== 4}
              onPress={() => { const e = setPin(member, pin); if (e) setPinErr(e); else { setPin_(''); setPinErr(null); } }} />
            <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
              Não pode ter os quatro dígitos iguais, ser uma sequência, nem repetir o PIN de outro membro.
            </Text>
          </View>
        ) : null}

        {admin && r !== 'crianca' ? (
          <View style={{ gap: S.md }}>
            <Label t={t}>Papel</Label>
            <Segmented t={t} small value={r}
              options={[{ value: 'adulto', label: 'Adulto' }, { value: 'admin', label: 'Administração' }]}
              onChange={(v) => canChangeRole(r, v) && setRole(member, v)} />
            <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
              Um adulto não pode voltar a ser criança, e a casa não pode ficar sem administração.
            </Text>
          </View>
        ) : null}
      </Sheet>
    );
  }

  if (tab === 'gestao') {
    return (
      <Sheet t={t} title="Gestão da Casa" sub={`${user} · ${ROLE_LABEL(s.roles[user], user)}`}
        onClose={() => setTab(null)}>
        <View style={{ gap: S.md }}>
          <Label t={t}>Semanada</Label>
          <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>Quanto vale um ponto</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
            <Tap label="Menos 0,05 €" onPress={() => set(x => ({ pointValue: Math.max(0.01, +(x.pointValue - 0.05).toFixed(2)) }))}
              style={{ borderWidth: 1, borderColor: t.border, borderRadius: R.row }}>
              <Text style={{ fontFamily: FONT.display, fontSize: 19, color: t.accent }}>−</Text>
            </Tap>
            <Text style={{ flex: 1, textAlign: 'center', fontFamily: FONT.display, fontSize: 18, color: t.text2 }}>
              {EUR(s.pointValue)}
            </Text>
            <Tap label="Mais 0,05 €" onPress={() => set(x => ({ pointValue: Math.min(5, +(x.pointValue + 0.05).toFixed(2)) }))}
              style={{ borderWidth: 1, borderColor: t.border, borderRadius: R.row }}>
              <Text style={{ fontFamily: FONT.display, fontSize: 19, color: t.accent }}>+</Text>
            </Tap>
          </View>
          <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
            Os {st.kidPts['Léo'] - s.paidPts['Léo']} pontos por pagar do Léo valem {EUR((st.kidPts['Léo'] - s.paidPts['Léo']) * s.pointValue)}.
          </Text>

          <Label t={t}>Pagar às</Label>
          <Segmented t={t} small value={s.payDay}
            options={['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map((d, i) => ({ value: i, label: d }))}
            onChange={(v) => set({ payDay: v })} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: t.subtle,
          borderWidth: 1, borderColor: t.border, borderRadius: R.card, padding: 14 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>Dividir a meias</Text>
            <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
              {s.splitHalf ? 'Cada despesa partilhada divide-se a meias entre os dois adultos.'
                : 'Cada despesa fica a cargo de quem paga.'}
            </Text>
          </View>
          <Toggle t={t} on={s.splitHalf} label="Dividir a meias"
            onPress={() => set(x => ({ splitHalf: !x.splitHalf }))} />
        </View>

        <View style={{ gap: S.md }}>
          <Label t={t}>Membros e PIN</Label>
          <Card t={t} pad={false} style={{ paddingHorizontal: 16 }}>
            {Object.keys(MEMBERS).map((n, i, arr) => (
              <Row key={n} t={t} last={i === arr.length - 1}
                title={n}
                sub={MEMBERS[n].kid ? (s.pins[n] ? 'PIN definido' : 'sem PIN') : MEMBERS[n].email}
                onPress={() => { setMember(n); setTab('membro'); }}
                right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                  <Pill label={ROLE_LABEL(s.roles[n], n)} fg={t.text3} bg={t.subtle} border={t.border} />
                  <Icon name="caretRight" size={18} color={t.text3} />
                </View>} />
            ))}
          </Card>
        </View>
      </Sheet>
    );
  }

  return (
    <Sheet t={t} title={`${user} Bengui`} sub={MEMBERS[user].email || ROLE_LABEL(s.roles[user], user)}
      onClose={onClose}
      headerRight={
        <Tap onPress={onSignOut} label="Terminar sessão">
          <Icon name="logout" size={22} color={t.text3} />
        </Tap>
      }>
      {/* Aspeto e cor são a mesma pergunta — um bloco só */}
      <View style={{ gap: S.md }}>
        <Label t={t}>Aspeto</Label>
        <View style={{ flexDirection: 'row', gap: S.md }}>
          {[{ k: 'claro', icon: 'sun', label: 'Claro' },
            { k: 'escuro', icon: 'moon', label: 'Escuro' },
            { k: 'sistema', icon: 'refresh', label: 'Sistema' }].map(o => {
            const on = mode === o.k;
            return (
              <Pressable key={o.k} onPress={() => set(x => ({ themeByUser: { ...x.themeByUser, [user]: o.k } }))}
                accessibilityRole="button" accessibilityLabel={`Aspeto ${o.label}`} accessibilityState={{ selected: on }}
                style={{ width: 44, height: 44, borderRadius: R.row, borderWidth: 1,
                  borderColor: on ? t.chrome : t.border, backgroundColor: on ? t.chrome : 'transparent',
                  alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={o.icon} size={20} color={on ? '#FFFFFF' : t.text2} />
              </Pressable>
            );
          })}
        </View>
        <View style={{ height: 1, backgroundColor: t.divider }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, flexWrap: 'wrap' }}>
          {SCHEMES.map((sc, i) => {
            const on = scheme === i;
            return (
              <Pressable key={sc.name} onPress={() => set(x => ({ schemeByUser: { ...x.schemeByUser, [user]: i } }))}
                accessibilityRole="button" accessibilityLabel={`Esquema ${sc.name}`} accessibilityState={{ selected: on }}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 30, height: 30, borderRadius: R.pill, backgroundColor: sc.accent,
                  borderWidth: on ? 2 : 0, borderColor: t.state.ok }} />
              </Pressable>
            );
          })}
        </View>
        <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
          Sol, lua ou dispositivo em cima, as cores abaixo. Vale só para o perfil ligado.
        </Text>
      </View>

      <View style={{ height: 1, backgroundColor: t.divider }} />

      <Card t={t} pad={false} style={{ paddingHorizontal: 16 }}>
        {admin ? (
          <Row t={t} icon="houseGear" title="Gestão da Casa"
            sub="Rendimento, envelopes, semanada, membros" onPress={() => setTab('gestao')} />
        ) : null}
        <Row t={t} icon="heartPulse" title="Saúde"
          sub="Consultas, exames e receitas de cada membro" onPress={() => {}} />
        <Row t={t} icon="lock" title="Guardado neste dispositivo"
          sub="Os dados desta casa não saem daqui" />
        <Row t={t} icon="fileText" title="Documentação" sub="O que a app faz, versão a versão" onPress={() => {}} last />
      </Card>

      {admin ? (
        <View style={{ gap: S.md }}>
          <Pressable onPress={resetDemo} accessibilityRole="button" accessibilityLabel="Repor dados de demonstração"
            style={{ minHeight: 44, borderRadius: R.pill, borderWidth: 2, borderColor: t.accent,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icon name="refresh" size={18} color={t.accent} />
            <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '700', color: t.accent }}>
              Repor Dados de Demonstração
            </Text>
          </Pressable>
          <Pressable onPress={startBlank} accessibilityRole="button" accessibilityLabel="Começar de zero"
            style={{ minHeight: 44, borderRadius: R.pill, borderWidth: 1, borderColor: t.border,
              alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '500', color: t.text2 }}>
              Começar de Zero (casa nova)
            </Text>
          </Pressable>
        </View>
      ) : null}
    </Sheet>
  );
}
