import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { dayLabel, plural, TODAY_KEY, parseKey } from '../format';
import { MEMBERS, DE } from '../data';
import { Card, SectionTitle, Empty, Pill } from '../ui';
import Icon from '../Icon';

// Dias que faltam até uma data, contra o TODAY da app.
const daysUntil = (day) => {
  const a = parseKey(day), b = parseKey(TODAY_KEY);
  if (!a || !b) return null;
  return Math.round((Date.UTC(a.y, a.m, a.d) - Date.UTC(b.y, b.m, b.d)) / 86400000);
};

const whenLabel = (h) => {
  const d = dayLabel(h.day).replace('Hoje · ', 'Hoje, ');
  return h.time ? `${d} às ${h.time}` : d;
};

// A ficha de um membro: a próxima consulta em destaque, as consultas todas,
// e o arquivo clínico. Quem pode ver isto decide-se no store, não aqui.
export default function FichaSaude({ t, member, user, onBack, onMarcar }) {
  const { healthOf, docsOf, nextHealth } = useStore();

  const consultas = healthOf(member, user);
  const docs = docsOf(member, user);
  const proxima = nextHealth(member, user);
  const propria = member === user;

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      {/* Cabeçalho da ficha */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 16, paddingVertical: 14, backgroundColor: t.chrome }}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Voltar"
          hitSlop={8} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrowLeft" size={22} color="#FFFFFF" />
        </Pressable>
        <Icon name="heartPulse" size={24} color="#FFFFFF" />
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={1} style={{ fontFamily: FONT.display, fontSize: 19,
            fontWeight: '500', color: '#FFFFFF' }}>
            {propria ? 'A minha ficha' : `Saúde ${DE(member)} ${member}`}
          </Text>
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
            {propria ? 'Privada — mais ninguém a vê' : 'Visível aos adultos da casa'}
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1, minHeight: 0 }}
        contentContainerStyle={{ padding: 16, gap: S.lg, paddingBottom: S.empty }}>

        {/* Próxima consulta */}
        {proxima ? (
          <Card t={t} style={{ borderLeftWidth: 4, borderLeftColor: t.state.info,
            backgroundColor: t.state.infoBg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Icon name="calendar" size={22} color={t.state.info} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>
                  {proxima.specialty}{proxima.doctor ? ` · ${proxima.doctor}` : ''}
                </Text>
                <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.state.info }}>
                  {whenLabel(proxima)}
                  {daysUntil(proxima.day) > 0
                    ? ` · faltam ${plural(daysUntil(proxima.day), 'dia', 'dias')}` : ''}
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        {/* Consultas */}
        <View>
          <SectionTitle t={t} right={onMarcar ? (
            <Pressable onPress={onMarcar} accessibilityRole="button" accessibilityLabel="Marcar consulta"
              style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: S.lg, borderRadius: R.card,
                flexDirection: 'row', alignItems: 'center', gap: S.sm,
                backgroundColor: pressed ? t.card : t.subtle, borderWidth: 1, borderColor: t.border })}>
              <Icon name="plus" size={16} color={t.accent} />
              <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.accent }}>Marcar</Text>
            </Pressable>
          ) : null}>
            Consultas
          </SectionTitle>
          {consultas.length === 0 ? (
            <Empty t={t} icon="heartPulse" title="Sem consultas registadas."
              hint="Use Marcar consulta para registar a primeira." />
          ) : (
            <View style={{ gap: S.md }}>
              {consultas.map(h => {
                const anexos = docs.filter(d => d.healthId === h.id).length;
                const futura = h.day >= TODAY_KEY;
                return (
                  <Card key={h.id} t={t} style={futura ? {
                    borderColor: t.state.info, backgroundColor: t.state.infoBg } : null}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Icon name="calendar" size={20}
                        color={futura ? t.state.info : t.text3} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>
                          {h.specialty}
                        </Text>
                        <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
                          {whenLabel(h)}{h.doctor ? ` · ${h.doctor}` : ''}
                        </Text>
                      </View>
                      {anexos > 0 ? (
                        <Pill label={plural(anexos, 'anexo', 'anexos')}
                          fg={t.text3} bg={t.subtle} border={t.border} />
                      ) : null}
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </View>

        {/* Arquivo clínico */}
        <View>
          <SectionTitle t={t} right={docs.length ? (
            <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
              {plural(docs.length, 'documento', 'documentos')}
            </Text>
          ) : null}>
            Arquivo clínico
          </SectionTitle>
          {docs.length === 0 ? (
            <Empty t={t} icon="fileText" title="Sem documentos." />
          ) : (
            <View style={{ gap: S.md }}>
              {docs.map(d => {
                const h = consultas.find(x => x.id === d.healthId);
                return (
                  <Card key={d.id} t={t}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Icon name="fileText" size={20} color={t.text3} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>{d.title}</Text>
                        <Text numberOfLines={2} style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
                          {[d.kind, h && `de ${h.specialty}`, h && h.doctor, h && whenLabel(h)]
                            .filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
