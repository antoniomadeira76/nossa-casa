import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT, MEMBER_COLOR } from '../theme';
import { MEMBERS } from '../data';
import { Card, SectionTitle, Empty, AddButton, Label, Primary, Avatar } from '../ui';
import Icon from '../Icon';
import Sheet from '../Sheet';

export default function Saude({ t, user, onClose }) {
  const { s, set } = useStore();
  const [sheet, setSheet] = useState(null);
  const [form, setForm] = useState({ member: 'Léo', date: '', note: '', specialty: '' });
  const [expanded, setExpanded] = useState(null);

  const canSeeHealth = (member) => {
    const isAdult = !MEMBERS[member]?.kid;
    return isAdult ? member === user : true; // Adults see only their own; kids' records visible to all
  };

  const health = s.health || [];
  const visible = health.filter(h => canSeeHealth(h.member));

  const byMember = {};
  visible.forEach(h => {
    if (!byMember[h.member]) byMember[h.member] = [];
    byMember[h.member].push(h);
  });

  Object.keys(byMember).forEach(m => {
    byMember[m].sort((a, b) => new Date(b.date) - new Date(a.date));
  });

  const handleSave = () => {
    if (!form.date || !form.note.trim()) return;
    const id = 'hlth-' + Date.now();
    set(s => ({
      health: [...(s.health || []), {
        id,
        member: form.member,
        date: form.date,
        specialty: form.specialty,
        note: form.note,
      }],
    }));
    setSheet(null);
    setForm({ member: 'Léo', date: '', note: '', specialty: '' });
  };

  return (
    <>
      {Object.keys(byMember).length === 0 ? (
        <Empty t={t} icon="heartPulse" title="Sem registos de saúde." hint="Comece a registar consultas e exames." />
      ) : (
        Object.keys(byMember).map(member => (
          <View key={member}>
            <SectionTitle t={t}>{member}</SectionTitle>
            <View style={{ gap: S.md }}>
              {byMember[member].map(h => (
                <Card
                  key={h.id}
                  t={t}
                  onPress={() => setExpanded(expanded === h.id ? null : h.id)}
                  style={{ borderLeftWidth: 3, borderLeftColor: MEMBER_COLOR[member] || t.accent }}
                >
                  <View style={{ gap: S.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                      <Icon name="heartPulse" size={20} color={MEMBER_COLOR[member] || t.accent} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>
                          {h.specialty || 'Consulta geral'}
                        </Text>
                        <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
                          {new Date(h.date + 'T00:00').toLocaleDateString('pt-PT')}
                        </Text>
                      </View>
                      <Icon name={expanded === h.id ? 'chevronUp' : 'chevronDown'} size={20} color={t.text3} />
                    </View>

                    {expanded === h.id ? (
                      <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: t.text3, lineHeight: 18 }}>
                        {h.note}
                      </Text>
                    ) : null}
                  </View>
                </Card>
              ))}
            </View>
          </View>
        ))
      )}

      <AddButton t={t} label="registar episódio" onPress={() => setSheet('novo')} />

      {sheet === 'novo' ? (
        <Sheet t={t} title="Novo Episódio" sub="Consulta, exame ou prescrição"
          onClose={() => setSheet(null)}>
          <View style={{ gap: S.lg }}>
            <View style={{ gap: S.sm }}>
              <Label t={t}>Membro</Label>
              <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
                {['Rita', 'Tomás', 'Léo', 'Mia'].map(name => (
                  <Pressable
                    key={name}
                    onPress={() => setForm(f => ({ ...f, member: name }))}
                    style={{
                      paddingHorizontal: S.md, minHeight: 36, borderRadius: R.pill,
                      borderWidth: 2,
                      borderColor: form.member === name ? MEMBER_COLOR[name] : t.border,
                      backgroundColor: form.member === name ? 'rgba(0,0,0,0.02)' : 'transparent',
                      justifyContent: 'center',
                    }}>
                    <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: form.member === name ? MEMBER_COLOR[name] : t.text3 }}>
                      {name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={{ gap: S.sm }}>
              <Label t={t}>Data</Label>
              <TextInput
                value={form.date}
                onChangeText={(v) => setForm(f => ({ ...f, date: v }))}
                placeholder="dd/mm/aaaa"
                style={{
                  minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body,
                  fontSize: 15, color: t.text2, borderRadius: R.row, borderWidth: 1,
                  borderColor: t.border, backgroundColor: t.card,
                }}
              />
            </View>

            <View style={{ gap: S.sm }}>
              <Label t={t}>Especialidade</Label>
              <TextInput
                value={form.specialty}
                onChangeText={(v) => setForm(f => ({ ...f, specialty: v }))}
                placeholder="Ex: Pediatria"
                style={{
                  minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body,
                  fontSize: 15, color: t.text2, borderRadius: R.row, borderWidth: 1,
                  borderColor: t.border, backgroundColor: t.card,
                }}
              />
            </View>

            <View style={{ gap: S.sm }}>
              <Label t={t}>Notas</Label>
              <TextInput
                value={form.note}
                onChangeText={(v) => setForm(f => ({ ...f, note: v }))}
                placeholder="Diagnóstico, tratamento, observações..."
                multiline
                numberOfLines={4}
                style={{
                  minHeight: 100, paddingHorizontal: S.md, paddingVertical: S.md,
                  fontFamily: FONT.body, fontSize: 14, color: t.text2,
                  borderRadius: R.row, borderWidth: 1, borderColor: t.border, backgroundColor: t.card,
                  textAlignVertical: 'top',
                }}
              />
            </View>

            <Primary t={t} label="Guardar" onPress={handleSave} disabled={!form.date || !form.note.trim()} />
          </View>
        </Sheet>
      ) : null}
    </>
  );
}
