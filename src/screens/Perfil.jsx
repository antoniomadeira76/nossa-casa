import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { SCHEMES, S, R, FONT, elev, MEMBER_COLOR } from '../theme';
import { EUR, plural } from '../format';
import { MEMBERS, FEM } from '../data';
import { Card, SectionTitle, Label, Row, Pill, Primary, Toggle, Segmented, Tap, Avatar } from '../ui';
import Icon from '../Icon';
import Sheet from '../Sheet';

// O aspeto por extenso, para a frase que diz o que está escolhido.
const MODO_LABEL = { claro: 'Claro', escuro: 'Escuro', sistema: 'Segue o dispositivo' };

const ROLE_LABEL = (r, name) => {
  const fem = FEM(name);
  return r === 'admin' ? (fem ? 'administradora' : 'administrador') : r === 'adulto' ? 'adulto' : 'criança';
};

export default function Perfil({ t, user, onClose, onSignOut, onSaude, onDoc, onGestao }) {
  const st = useStore();
  const { s, set, isAdmin, resetDemo, startBlank, canSeeHealth, healthOf, receitasAExpirar } = st;

  // A referência 09 mostra a contagem de consultas e um aviso das receitas na
  // própria linha da Saúde. Passa pelo canSeeHealth como tudo o resto.
  const consultas = Object.keys(MEMBERS)
    .filter(m => canSeeHealth(m, user))
    .reduce((a, m) => a + healthOf(m, user).length, 0);
  const receitas = receitasAExpirar(user).length;

  const admin = isAdmin(user);
  const mode = s.themeByUser[user] || 'claro';
  const scheme = s.schemeByUser[user] ?? 0;

  return (
    <Sheet t={t} title={`${user} Bengui`} sub={MEMBERS[user].email || ROLE_LABEL(s.roles[user], user)}
      onClose={onClose}
      leading={<Avatar initial={MEMBERS[user].initial} color={MEMBER_COLOR[user]} size={40} />}
      headerRight={
        <Tap onPress={onSignOut} label="Terminar sessão">
          <Icon name="logout" size={22} color={t.text3} />
        </Tap>
      }>
      {/* As duas secções das referências 09 e 24: o que é da casa primeiro,
          o que é só deste perfil depois. Não havia títulos nenhuns, e as
          entradas da casa estavam por baixo do Aspeto. */}
      <View>
        <SectionTitle t={t}>A Casa</SectionTitle>
        <Card t={t} pad={false} style={{ paddingHorizontal: 16 }}>
          {admin ? (
            <Row t={t} icon="houseGear" title="Gestão da Casa"
              sub="Rendimento, envelopes, semanada, membros"
              onPress={() => { onClose(); onGestao?.(); }} />
          ) : null}
          <Row t={t} icon="heartPulse" title="Saúde da Família"
            sub={plural(consultas, 'consulta marcada', 'consultas marcadas')}
            right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
              {receitas ? (
                <Pill label={plural(receitas, 'receita a expirar', 'receitas a expirar')}
                  fg={t.state.warnDeep} bg={t.state.warnBg} border={t.state.warn} />
              ) : null}
              <Icon name="caretRight" size={18} color={t.text3} />
            </View>}
            onPress={() => { onClose(); onSaude?.(); }} last />
        </Card>
      </View>

      <SectionTitle t={t}>O Meu Perfil</SectionTitle>

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
                {/* Dois tons: a cor de ação e a do cabeçalho. Um esquema são
                    as duas, e uma bolinha só não distingue os que partilham
                    o acento. */}
                <View style={{ width: 34, height: 34, borderRadius: R.pill, overflow: 'hidden',
                  flexDirection: 'row', borderWidth: on ? 2 : 0, borderColor: t.state.ok }}>
                  <View style={{ flex: 1, backgroundColor: sc.accent }} />
                  <View style={{ flex: 1, backgroundColor: sc.chrome }} />
                </View>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
          {MODO_LABEL[mode]} · {SCHEMES[scheme].name}. Vale só para este perfil — os outros
          membros mantêm o que escolheram.
        </Text>
      </View>

      {/* Avisos: os dados estão em s.notif desde sempre e nada os mostrava.
          A referência 24 tem este bloco entre o Aspeto e os Dados. */}
      <View style={{ gap: S.md }}>
        <Label t={t}>Avisos</Label>
        <Card t={t} style={{ gap: S.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
            <Text style={{ flex: 1, fontFamily: FONT.body, fontSize: 14.5, lineHeight: 22, color: t.text2 }}>
              Um resumo por dia às {s.notif.hour}, avisando{' '}
              {plural(s.notif.lead, 'dia', 'dias')} antes de cada prazo.
            </Text>
            <Toggle t={t} on={s.notif.digest} label="Resumo diário"
              onPress={() => set(x => ({ notif: { ...x.notif, digest: !x.notif.digest } }))} />
          </View>
        </Card>
      </View>

      <View style={{ height: 1, backgroundColor: t.divider }} />

      <Card t={t} pad={false} style={{ paddingHorizontal: 16 }}>
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
