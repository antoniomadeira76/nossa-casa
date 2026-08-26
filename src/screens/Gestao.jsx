import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { EUR } from '../format';
import { Card, SectionTitle, Label, Primary } from '../ui';
import Icon from '../Icon';

export default function Gestao({ t, user, onClose }) {
  const { s, set, isAdmin, budget, spent } = useStore();
  const [tab, setTab] = useState('base');

  if (!isAdmin(user)) {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, justifyContent: 'center', alignItems: 'center' }}>
        <Icon name="lock" size={48} color={t.text3} style={{ marginBottom: S.xl }} />
        <Text style={{ fontFamily: FONT.display, fontSize: 18, color: t.text2, textAlign: 'center', marginBottom: S.md }}>
          Acesso restrito
        </Text>
        <Text style={{ fontFamily: FONT.ui, fontSize: 14, color: t.text3, textAlign: 'center' }}>
          Apenas administradores podem aceder à gestão da casa.
        </Text>
        <Pressable onPress={onClose} style={{ marginTop: S.xl, paddingHorizontal: S.lg, paddingVertical: S.md, backgroundColor: t.accent, borderRadius: R.row }}>
          <Text style={{ fontFamily: FONT.display, fontSize: 14, color: '#FFFFFF' }}>Fechar</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: S.xl }}>
      <View style={{ flexDirection: 'row', gap: S.md, borderBottomWidth: 1, borderBottomColor: t.border, paddingBottom: S.md }}>
        {['base', 'membros', 'lojas', 'specs'].map(t_key => (
          <Pressable key={t_key} onPress={() => setTab(t_key)} style={{ paddingBottom: S.sm, borderBottomWidth: tab === t_key ? 2 : 0, borderBottomColor: tab === t_key ? t.accent : 'transparent' }}>
            <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: tab === t_key ? t.accent : t.text3 }}>
              {t_key === 'base' ? 'Orçamento' : t_key === 'membros' ? 'Membros' : t_key === 'lojas' ? 'Lojas' : 'Especialidades'}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'base' && (
        <View style={{ gap: S.lg }}>
          <Card t={t}>
            <View style={{ gap: S.md }}>
              <View>
                <Label t={t}>Orçamento total mensal</Label>
                <Text style={{ fontFamily: FONT.display, fontSize: 24, color: t.text2, marginTop: S.sm }}>
                  {EUR(budget)}
                </Text>
              </View>
              <View>
                <Label t={t}>Gasto até agora</Label>
                <Text style={{ fontFamily: FONT.display, fontSize: 20, color: t.text2, marginTop: S.sm }}>
                  {EUR(spent)}
                </Text>
              </View>
            </View>
          </Card>
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
            Configuração de envelopes, semanada e divisão de despesas em desenvolvimento.
          </Text>
        </View>
      )}

      {tab === 'membros' && (
        <View style={{ gap: S.md }}>
          <Card t={t}>
            <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: t.text3 }}>
              Gestão de papéis, convite de membros e PIN das crianças em desenvolvimento.
            </Text>
          </Card>
        </View>
      )}

      {tab === 'lojas' && (
        <View style={{ gap: S.md }}>
          <Card t={t}>
            <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: t.text3 }}>
              Configuração de lojas habituais em desenvolvimento.
            </Text>
          </Card>
        </View>
      )}

      {tab === 'specs' && (
        <View style={{ gap: S.md }}>
          <Card t={t}>
            <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: t.text3 }}>
              Especialidades médicas e categorias de equipamentos em desenvolvimento.
            </Text>
          </Card>
        </View>
      )}

      <Pressable onPress={onClose} style={{ padding: S.md }}>
        <Text style={{ fontFamily: FONT.display, fontSize: 14, color: t.accent, textAlign: 'center' }}>
          Fechar
        </Text>
      </Pressable>
    </ScrollView>
  );
}
