import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useStore } from '../store';
import { MEMBERS } from '../data';
import { MEMBER_COLOR, S, R, elev, FONT } from '../theme';
import { dayLabel } from '../format';
import Icon from '../Icon';
import { SectionTitle, Tap, Avatar, AddButton, Empty, usePaged, Pager } from '../ui';

// Quem vê a ficha de quem. Em produção isto é imposto no servidor.
export const canSeeHealth = (viewer, subject, roles) =>
  viewer === subject || roles[subject] === 'crianca';

export default function Saude({ t, me, onBack, onOpen }) {
  const { s, allEvents } = useStore();
  const nomes = Object.keys(MEMBERS).filter(n => canSeeHealth(me, n, s.roles));
  const eps = (n) => (s.health || []).filter(h => h.who === n);

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <View style={{ backgroundColor: t.chrome, paddingTop: 56, paddingHorizontal: 16,
        paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...elev(3) }}>
        <Tap onPress={onBack} label="Voltar"><Icon name="arrowLeft" size={22} color="#FFFFFF" /></Tap>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: '500', color: '#FFFFFF', letterSpacing: 0.25 }}>Saúde da Família</Text>
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: 'rgba(255,255,255,.65)' }}>{nomes.length} fichas visíveis para si</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ padding: 16, gap: S.xl }}>
        <View>
          <SectionTitle t={t}>Fichas</SectionTitle>
          <View style={{ gap: S.md }}>
            {nomes.map(n => {
              const lista = eps(n);
              const ultimo = lista.slice().sort((a, b) => (b.key || '').localeCompare(a.key || ''))[0];
              return (
                <Pressable key={n} onPress={() => onOpen(n)} accessibilityRole="button"
                  accessibilityLabel={`Ficha de ${n}`}
                  style={({ pressed }) => ({ backgroundColor: t.card, borderWidth: 1, borderColor: t.border,
                    borderRadius: R.card, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14,
                    opacity: pressed ? 0.8 : 1, ...elev(1) })}>
                  <Avatar initial={MEMBERS[n].initial} color={MEMBER_COLOR[n]} size={40} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ fontFamily: FONT.body, fontSize: 16, color: t.text1 }}>{n}</Text>
                    <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
                      {lista.length === 0 ? 'Sem episódios registados'
                        : `${lista.length} episódio${lista.length > 1 ? 's' : ''}${ultimo ? ' · último ' + dayLabel(ultimo.key).split(' · ').pop() : ''}`}
                    </Text>
                  </View>
                  <Icon name="caretRight" size={20} color={t.text3} />
                </Pressable>
              );
            })}
          </View>
        </View>

        {nomes.length < Object.keys(MEMBERS).length ? (
          <View style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: R.card,
            borderWidth: 1, borderColor: t.state.info, backgroundColor: t.tileInfo }}>
            <Icon name="lock" size={20} color={t.state.info} />
            <Text style={{ flex: 1, fontFamily: FONT.body, fontSize: 14.5, lineHeight: 21, color: t.text2 }}>
              As fichas dos outros adultos não lhe são visíveis. As das crianças são visíveis a todos os adultos.
            </Text>
          </View>
        ) : null}

        <AddButton t={t} label="Marcar consulta" onPress={() => onOpen('nova')} />
      </ScrollView>
    </View>
  );
}
