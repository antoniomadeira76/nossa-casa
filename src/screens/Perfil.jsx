import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { SCHEMES, S, R, FONT, elev, MEMBER_COLOR } from '../theme';
import { EUR } from '../format';
import { MEMBERS, FEM } from '../data';
import { Card, Label, Row, Pill, Primary, Toggle, Segmented, Tap } from '../ui';
import Icon from '../Icon';
import Sheet from '../Sheet';

const ROLE_LABEL = (r, name) => {
  const fem = FEM(name);
  return r === 'admin' ? (fem ? 'administradora' : 'administrador') : r === 'adulto' ? 'adulto' : 'criança';
};

export default function Perfil({ t, user, onClose, onSignOut, onSaude, onDoc, onGestao }) {
  const st = useStore();
  const { s, set, isAdmin, resetDemo, startBlank } = st;

  const admin = isAdmin(user);
  const mode = s.themeByUser[user] || 'claro';
  const scheme = s.schemeByUser[user] ?? 0;

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
            sub="Rendimento, envelopes, semanada, membros"
            onPress={() => { onClose(); onGestao?.(); }} />
        ) : null}
        <Row t={t} icon="heartPulse" title="Saúde"
          sub="Consultas, exames e receitas de cada membro"
          onPress={() => { onClose(); onSaude?.(); }} />
        <Row t={t} icon="lock" title="Guardado neste dispositivo"
          sub="Os dados desta casa não saem daqui" />
        <Row t={t} icon="fileText" title="Documentação" sub="O que a app faz, versão a versão"
          onPress={() => { onClose(); onDoc?.(); }} last />
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
