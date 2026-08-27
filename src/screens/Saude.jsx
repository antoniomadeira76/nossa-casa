import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, FlatList } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT, MEMBER_COLOR, STATE } from '../theme';
import { MEMBERS } from '../data';
import { Card, SectionTitle, Empty, AddButton, Label, Primary, Pill } from '../ui';
import Icon from '../Icon';
import Sheet from '../Sheet';
import { pad2 } from '../format';

export default function Saude({ t, user, onClose }) {
  const { s, set, addHealthRecord, addHealthNote, addRecipe, setRecipeDecision, setHealthDecision, addSpecialty, removeSpecialty, renameSpecialty } = useStore();
  const [sheet, setSheet] = useState(null);
  const [expandedRecord, setExpandedRecord] = useState(null);
  const [expandedNote, setExpandedNote] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [memberFilter, setMemberFilter] = useState(null);
  const [form, setForm] = useState({ member: 'Léo', date: '', specialty: '', note: '' });
  const [newNoteForm, setNewNoteForm] = useState({ text: '' });
  const [recipeForm, setRecipeForm] = useState({ name: '', dosage: '', quantity: '', unit: '', expiresAt: '' });

  const canSeeHealth = (member) => {
    const isAdult = !MEMBERS[member]?.kid;
    return isAdult ? member === user : true; // Adults see only their own; children's records visible to all adults
  };

  const health = s.health || [];
  const visibleRecords = health.filter(h => canSeeHealth(h.member));

  // Determina o que precisa de decisão (topo do acordeão)
  const needsDecision = visibleRecords.filter(h => {
    const decision = s.healthDecisions[h.id];
    return !decision || decision.status !== 'resolvido';
  });

  const decisionsSorted = [
    ...needsDecision.sort((a, b) => new Date(b.date) - new Date(a.date)),
    ...visibleRecords.filter(h => !needsDecision.includes(h)).sort((a, b) => new Date(b.date) - new Date(a.date)),
  ];

  // Filtrar com base em search e member
  const filtered = decisionsSorted.filter(h => {
    if (memberFilter && h.member !== memberFilter) return false;
    if (searchText) {
      const search = searchText.toLowerCase();
      return (
        h.specialty?.toLowerCase().includes(search) ||
        h.member?.toLowerCase().includes(search) ||
        (s.healthNotes[h.id] || []).some(n => n.text.toLowerCase().includes(search)) ||
        (s.healthRecipes[h.id] || []).some(r => r.name.toLowerCase().includes(search))
      );
    }
    return true;
  });

  // Mostrar archive quando > 5 registos
  const showArchive = visibleRecords.length > 5;

  const handleSaveRecord = () => {
    if (!form.date || !form.specialty.trim()) return;
    addHealthRecord(form.member, form.date, form.specialty);
    setSheet(null);
    setForm({ member: 'Léo', date: '', specialty: '', note: '' });
  };

  const handleAddNote = (healthId) => {
    if (!newNoteForm.text.trim()) return;
    addHealthNote(healthId, user, newNoteForm.text);
    setNewNoteForm({ text: '' });
    setExpandedNote(null);
  };

  const handleAddRecipe = (healthId) => {
    if (!recipeForm.name.trim() || !recipeForm.expiresAt.trim()) return;
    addRecipe(healthId, recipeForm.name, recipeForm.dosage, recipeForm.quantity, recipeForm.unit, recipeForm.expiresAt);
    setRecipeForm({ name: '', dosage: '', quantity: '', unit: '', expiresAt: '' });
  };

  const getRecipeExpiration = (expiresAt) => {
    const [d, m, y] = expiresAt.split('/');
    const expDate = new Date(y, m - 1, d);
    const today = new Date(2026, 7, 27);
    const daysLeft = Math.floor((expDate - today) / 86400000);
    return daysLeft;
  };

  const RecordCard = ({ record }) => {
    const expanded = expandedRecord === record.id;
    const notes = s.healthNotes[record.id] || [];
    const recipes = s.healthRecipes[record.id] || [];
    const decision = s.healthDecisions[record.id];
    const needsDec = !decision || decision.status !== 'resolvido';

    const recipeWarnings = recipes.filter(r => {
      const days = getRecipeExpiration(r.expiresAt);
      return days >= 0 && days <= 30;
    });

    return (
      <Card
        t={t}
        onPress={() => setExpandedRecord(expanded ? null : record.id)}
        style={{ borderLeftWidth: 3, borderLeftColor: MEMBER_COLOR[record.member] || t.accent }}
      >
        <View style={{ gap: S.md }}>
          {/* Header da consulta */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
            <Icon name="heartPulse" size={20} color={MEMBER_COLOR[record.member] || t.accent} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: FONT.body, fontSize: 15, fontWeight: '500', color: t.text1 }}>
                {record.specialty}
              </Text>
              <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
                {record.member} · {record.date}
              </Text>
            </View>
            {needsDec && (
              <Pill label="Ação" bg={STATE.warnBg} fg={STATE.warn} border={STATE.warn} />
            )}
            <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={20} color={t.text3} />
          </View>

          {/* Conteúdo expandido */}
          {expanded && (
            <View style={{ gap: S.md, paddingTop: S.md, borderTopWidth: 1, borderTopColor: t.border }}>
              {/* Receitas com aviso de expiração */}
              {recipes.length > 0 && (
                <View style={{ gap: S.sm }}>
                  <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.slate }}>
                    Receitas ({recipes.length})
                  </Text>
                  {recipes.map(recipe => {
                    const daysLeft = getRecipeExpiration(recipe.expiresAt);
                    const isWarning = daysLeft >= 0 && daysLeft <= 30;
                    const isExpired = daysLeft < 0;

                    return (
                      <View key={recipe.id} style={{ gap: S.sm, padding: S.md, backgroundColor: t.subtle, borderRadius: R.row }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: S.md }}>
                          <View style={{ flex: 1, gap: 4 }}>
                            <Text style={{ fontFamily: FONT.body, fontSize: 14, color: t.text2 }}>
                              {recipe.name}
                            </Text>
                            {recipe.dosage && (
                              <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
                                Dose: {recipe.dosage} · {recipe.quantity} {recipe.unit}
                              </Text>
                            )}
                            <Text style={{
                              fontFamily: FONT.ui, fontSize: 11, color: isExpired ? STATE.err : isWarning ? STATE.warn : t.text3,
                              fontWeight: isWarning || isExpired ? '600' : '400',
                            }}>
                              {isExpired
                                ? `Expirou em ${recipe.expiresAt}`
                                : isWarning
                                ? `Expira em ${recipe.expiresAt} (${daysLeft} dias)`
                                : `Expira em ${recipe.expiresAt}`}
                            </Text>
                          </View>
                          {!recipe.decision && (
                            <Pressable
                              onPress={() => setRecipeDecision(record.id, recipe.id, 'guardada')}
                              style={{ paddingHorizontal: S.md, paddingVertical: S.sm, backgroundColor: t.accent, borderRadius: R.row, minHeight: 32, justifyContent: 'center' }}
                            >
                              <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: '#FFFFFF' }}>
                                Guardada
                              </Text>
                            </Pressable>
                          )}
                          {recipe.decision && (
                            <Pill label={recipe.decision} bg={STATE.okBg} fg={STATE.ok} border={STATE.ok} />
                          )}
                        </View>
                      </View>
                    );
                  })}

                  {/* Botão para adicionar receita */}
                  <Pressable
                    onPress={() => setExpandedNote(expandedNote === `rx-${record.id}` ? null : `rx-${record.id}`)}
                    style={{ paddingVertical: S.sm, paddingHorizontal: S.md, gap: S.sm, flexDirection: 'row', alignItems: 'center' }}
                  >
                    <Icon name="plus" size={16} color={t.accent} />
                    <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.accent }}>
                      Adicionar receita
                    </Text>
                  </Pressable>

                  {expandedNote === `rx-${record.id}` && (
                    <View style={{ gap: S.md, padding: S.md, backgroundColor: t.card, borderRadius: R.row }}>
                      <TextInput
                        value={recipeForm.name}
                        onChangeText={(v) => setRecipeForm(f => ({ ...f, name: v }))}
                        placeholder="Nome da receita"
                        placeholderTextColor={t.text3}
                        style={{
                          minHeight: 40, paddingHorizontal: S.md, fontFamily: FONT.body,
                          fontSize: 14, color: t.text2, borderRadius: R.row, borderWidth: 1,
                          borderColor: t.border, backgroundColor: t.surface,
                        }}
                      />
                      <View style={{ flexDirection: 'row', gap: S.sm }}>
                        <TextInput
                          value={recipeForm.dosage}
                          onChangeText={(v) => setRecipeForm(f => ({ ...f, dosage: v }))}
                          placeholder="Dose"
                          placeholderTextColor={t.text3}
                          style={{
                            flex: 1, minHeight: 40, paddingHorizontal: S.md, fontFamily: FONT.body,
                            fontSize: 14, color: t.text2, borderRadius: R.row, borderWidth: 1,
                            borderColor: t.border, backgroundColor: t.surface,
                          }}
                        />
                        <TextInput
                          value={recipeForm.quantity}
                          onChangeText={(v) => setRecipeForm(f => ({ ...f, quantity: v }))}
                          placeholder="Qtd"
                          placeholderTextColor={t.text3}
                          style={{
                            flex: 0.6, minHeight: 40, paddingHorizontal: S.md, fontFamily: FONT.body,
                            fontSize: 14, color: t.text2, borderRadius: R.row, borderWidth: 1,
                            borderColor: t.border, backgroundColor: t.surface,
                          }}
                        />
                        <TextInput
                          value={recipeForm.unit}
                          onChangeText={(v) => setRecipeForm(f => ({ ...f, unit: v }))}
                          placeholder="Unid"
                          placeholderTextColor={t.text3}
                          style={{
                            flex: 0.6, minHeight: 40, paddingHorizontal: S.md, fontFamily: FONT.body,
                            fontSize: 14, color: t.text2, borderRadius: R.row, borderWidth: 1,
                            borderColor: t.border, backgroundColor: t.surface,
                          }}
                        />
                      </View>
                      <TextInput
                        value={recipeForm.expiresAt}
                        onChangeText={(v) => setRecipeForm(f => ({ ...f, expiresAt: v }))}
                        placeholder="Data de expiração (dd/mm/aaaa)"
                        placeholderTextColor={t.text3}
                        style={{
                          minHeight: 40, paddingHorizontal: S.md, fontFamily: FONT.body,
                          fontSize: 14, color: t.text2, borderRadius: R.row, borderWidth: 1,
                          borderColor: t.border, backgroundColor: t.surface,
                        }}
                      />
                      <Pressable
                        onPress={() => handleAddRecipe(record.id)}
                        disabled={!recipeForm.name.trim() || !recipeForm.expiresAt.trim()}
                        style={{
                          paddingHorizontal: S.md, paddingVertical: S.sm, backgroundColor: t.accent,
                          borderRadius: R.row, minHeight: 40, justifyContent: 'center',
                          opacity: !recipeForm.name.trim() || !recipeForm.expiresAt.trim() ? 0.5 : 1,
                        }}
                      >
                        <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: '#FFFFFF', textAlign: 'center' }}>
                          Guardar receita
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              )}

              {/* Notas do episódio */}
              <View style={{ gap: S.sm }}>
                <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.slate }}>
                  Notas do episódio ({notes.length})
                </Text>
                {notes.length === 0 && (
                  <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
                    Sem notas ainda.
                  </Text>
                )}
                {notes.map(note => (
                  <View key={note.id} style={{ gap: 4, padding: S.md, backgroundColor: t.subtle, borderRadius: R.row }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Text style={{ fontFamily: FONT.ui, fontSize: 11, color: t.text3, fontWeight: '600' }}>
                        {note.author} · {note.date.split('T')[0]}
                      </Text>
                    </View>
                    <Text style={{ fontFamily: FONT.body, fontSize: 13, color: t.text2, lineHeight: 18 }}>
                      {note.text}
                    </Text>
                  </View>
                ))}

                {/* Adicionar nota */}
                <Pressable
                  onPress={() => setExpandedNote(expandedNote === `note-${record.id}` ? null : `note-${record.id}`)}
                  style={{ paddingVertical: S.sm, paddingHorizontal: S.md, gap: S.sm, flexDirection: 'row', alignItems: 'center' }}
                >
                  <Icon name="plus" size={16} color={t.accent} />
                  <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.accent }}>
                    Adicionar nota
                  </Text>
                </Pressable>

                {expandedNote === `note-${record.id}` && (
                  <View style={{ gap: S.md }}>
                    <TextInput
                      value={newNoteForm.text}
                      onChangeText={(v) => setNewNoteForm({ text: v })}
                      placeholder="Escrever nota..."
                      placeholderTextColor={t.text3}
                      multiline
                      numberOfLines={3}
                      style={{
                        minHeight: 80, paddingHorizontal: S.md, paddingVertical: S.md,
                        fontFamily: FONT.body, fontSize: 13, color: t.text2,
                        borderRadius: R.row, borderWidth: 1, borderColor: t.border,
                        backgroundColor: t.card, textAlignVertical: 'top',
                      }}
                    />
                    <Pressable
                      onPress={() => handleAddNote(record.id)}
                      disabled={!newNoteForm.text.trim()}
                      style={{
                        paddingHorizontal: S.md, paddingVertical: S.sm, backgroundColor: t.accent,
                        borderRadius: R.row, minHeight: 40, justifyContent: 'center',
                        opacity: !newNoteForm.text.trim() ? 0.5 : 1,
                      }}
                    >
                      <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: '#FFFFFF', textAlign: 'center' }}>
                        Guardar nota
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Decisão/Ação necessária */}
              {needsDec && (
                <View style={{ gap: S.md, padding: S.md, backgroundColor: t.card, borderRadius: R.row, borderLeftWidth: 3, borderLeftColor: STATE.warn }}>
                  <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: STATE.warn }}>
                    Precisa de ação
                  </Text>
                  <View style={{ flexDirection: 'row', gap: S.sm }}>
                    <Pressable
                      onPress={() => setHealthDecision(record.id, 'acompanhamento', 'resolvido', 'Consulta marcada')}
                      style={{ flex: 1, paddingHorizontal: S.md, paddingVertical: S.sm, backgroundColor: t.accent, borderRadius: R.row, minHeight: 36, justifyContent: 'center' }}
                    >
                      <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: '#FFFFFF', textAlign: 'center' }}>
                        Resolvida
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setHealthDecision(record.id, 'seguimento', 'pendente', 'Aguardando resultado')}
                      style={{ flex: 1, paddingHorizontal: S.md, paddingVertical: S.sm, borderWidth: 1, borderColor: t.border, borderRadius: R.row, minHeight: 36, justifyContent: 'center' }}
                    >
                      <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.text2, textAlign: 'center' }}>
                        Pendente
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </Card>
    );
  };

  return (
    <>
      <View style={{ gap: S.md }}>
        {/* Botão Marcar Consulta */}
        <AddButton t={t} label="marcar consulta" onPress={() => setSheet('consulta')} />

        {/* Searchbar */}
        {showArchive && (
          <View style={{ gap: S.sm }}>
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Procurar por especialidade..."
              placeholderTextColor={t.text3}
              style={{
                minHeight: 40, paddingHorizontal: S.md, fontFamily: FONT.body,
                fontSize: 14, color: t.text2, borderRadius: R.row, borderWidth: 1,
                borderColor: t.border, backgroundColor: t.card,
              }}
            />

            {/* Member filter pills */}
            <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
              <Pressable
                onPress={() => setMemberFilter(null)}
                style={{
                  paddingHorizontal: S.md, minHeight: 32, borderRadius: R.pill,
                  borderWidth: 1, borderColor: !memberFilter ? t.accent : t.border,
                  backgroundColor: !memberFilter ? 'rgba(0,0,0,0.02)' : 'transparent',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: !memberFilter ? t.accent : t.text3 }}>
                  Todos
                </Text>
              </Pressable>
              {['Rita', 'Tomás', 'Léo', 'Mia'].map(member => (
                <Pressable
                  key={member}
                  onPress={() => setMemberFilter(memberFilter === member ? null : member)}
                  style={{
                    paddingHorizontal: S.md, minHeight: 32, borderRadius: R.pill,
                    borderWidth: 1, borderColor: memberFilter === member ? MEMBER_COLOR[member] : t.border,
                    backgroundColor: memberFilter === member ? 'rgba(0,0,0,0.02)' : 'transparent',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: memberFilter === member ? MEMBER_COLOR[member] : t.text3 }}>
                    {member}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Records */}
        {filtered.length === 0 ? (
          <Empty t={t} icon="heartPulse" title="Sem registos de saúde." hint="Comece a registar consultas e exames." />
        ) : (
          <View style={{ gap: S.md }}>
            {needsDecision.length > 0 && (
              <View>
                <SectionTitle t={t}>Precisa de ação ({needsDecision.length})</SectionTitle>
                <View style={{ gap: S.md }}>
                  {filtered.filter(h => needsDecision.includes(h)).map(record => (
                    <RecordCard key={record.id} record={record} />
                  ))}
                </View>
              </View>
            )}

            {filtered.length - needsDecision.length > 0 && (
              <View>
                <SectionTitle t={t}>Arquivo clínico</SectionTitle>
                <View style={{ gap: S.md }}>
                  {filtered.filter(h => !needsDecision.includes(h)).map(record => (
                    <RecordCard key={record.id} record={record} />
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Sheet: Marcar Consulta */}
      {sheet === 'consulta' ? (
        <MarcarConsulta t={t} user={user} onClose={() => setSheet(null)} />
      ) : null}
    </>
  );
}

function MarcarConsulta({ t, user, onClose }) {
  const { s, set, addSpecialty, removeSpecialty, renameSpecialty } = useStore();
  const [tab, setTab] = useState('nova');
  const [form, setForm] = useState({ member: 'Léo', date: '', time: '', specialty: '' });
  const [newSpecialty, setNewSpecialty] = useState('');
  const [editingSpecialty, setEditingSpecialty] = useState(null);

  const handleSaveConsultation = () => {
    if (!form.date || !form.specialty) return;
    // Criar evento na agenda com tag "Saúde"
    set(s => ({
      added: [...(s.added || []), {
        id: 'ev-' + Date.now(),
        day: `d${form.date.split('/')[2]}-${form.date.split('/')[1]}-${form.date.split('/')[0]}`,
        time: form.time || '10:00',
        title: `Consulta ${form.specialty}`,
        who: `${form.member} · Consulta de saúde`,
        owner: user,
        shared: true,
        tag: 'Saúde',
      }],
    }));
    onClose();
  };

  return (
    <Sheet t={t} title="Marcar Consulta" sub="Agende e gerencie especialidades" onClose={onClose}>
      <View style={{ gap: S.lg }}>
        {/* Tabs */}
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          <Pressable
            onPress={() => setTab('nova')}
            style={{
              flex: 1, paddingVertical: S.md, borderBottomWidth: 2,
              borderBottomColor: tab === 'nova' ? t.accent : 'transparent',
            }}
          >
            <Text style={{
              fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: tab === 'nova' ? t.accent : t.text3,
              textAlign: 'center',
            }}>
              Nova Consulta
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('especialidades')}
            style={{
              flex: 1, paddingVertical: S.md, borderBottomWidth: 2,
              borderBottomColor: tab === 'especialidades' ? t.accent : 'transparent',
            }}
          >
            <Text style={{
              fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: tab === 'especialidades' ? t.accent : t.text3,
              textAlign: 'center',
            }}>
              Especialidades
            </Text>
          </Pressable>
        </View>

        {/* Nova Consulta Tab */}
        {tab === 'nova' && (
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
                    }}
                  >
                    <Text style={{
                      fontFamily: FONT.ui, fontSize: 12, color: form.member === name ? MEMBER_COLOR[name] : t.text3,
                    }}>
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
              <Label t={t}>Hora</Label>
              <TextInput
                value={form.time}
                onChangeText={(v) => setForm(f => ({ ...f, time: v }))}
                placeholder="hh:mm"
                style={{
                  minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body,
                  fontSize: 15, color: t.text2, borderRadius: R.row, borderWidth: 1,
                  borderColor: t.border, backgroundColor: t.card,
                }}
              />
            </View>

            <View style={{ gap: S.sm }}>
              <Label t={t}>Especialidade</Label>
              <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
                {(s.specialities || []).map(spec => (
                  <Pressable
                    key={spec}
                    onPress={() => setForm(f => ({ ...f, specialty: spec }))}
                    style={{
                      paddingHorizontal: S.md, minHeight: 36, borderRadius: R.pill,
                      borderWidth: 1,
                      borderColor: form.specialty === spec ? t.accent : t.border,
                      backgroundColor: form.specialty === spec ? 'rgba(0,0,0,0.02)' : 'transparent',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{
                      fontFamily: FONT.ui, fontSize: 12, color: form.specialty === spec ? t.accent : t.text3,
                    }}>
                      {spec}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Primary t={t} label="Marcar Consulta" onPress={handleSaveConsultation} disabled={!form.date || !form.specialty} />
          </View>
        )}

        {/* Especialidades Tab */}
        {tab === 'especialidades' && (
          <View style={{ gap: S.lg }}>
            <View style={{ gap: S.sm }}>
              <Label t={t}>Adicionar especialidade</Label>
              <View style={{ flexDirection: 'row', gap: S.sm }}>
                <TextInput
                  value={newSpecialty}
                  onChangeText={setNewSpecialty}
                  placeholder="Ex: Cardiologia"
                  placeholderTextColor={t.text3}
                  style={{
                    flex: 1, minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body,
                    fontSize: 14, color: t.text2, borderRadius: R.row, borderWidth: 1,
                    borderColor: t.border, backgroundColor: t.card,
                  }}
                />
                <Pressable
                  onPress={() => {
                    if (newSpecialty.trim()) {
                      addSpecialty(newSpecialty.trim());
                      setNewSpecialty('');
                    }
                  }}
                  disabled={!newSpecialty.trim()}
                  style={{
                    paddingHorizontal: S.md, minHeight: 44, borderRadius: R.row, backgroundColor: t.accent,
                    justifyContent: 'center', opacity: !newSpecialty.trim() ? 0.5 : 1,
                  }}
                >
                  <Icon name="plus" size={20} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>

            <View style={{ gap: S.md }}>
              <Label t={t}>Especialidades</Label>
              {(s.specialities || []).map(spec => (
                <View key={spec} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.md, paddingVertical: S.sm, backgroundColor: t.subtle, borderRadius: R.row }}>
                  <Text style={{ flex: 1, fontFamily: FONT.body, fontSize: 14, color: t.text2 }}>
                    {spec}
                  </Text>
                  <Pressable
                    onPress={() => removeSpecialty(spec)}
                    hitSlop={8}
                    style={{ padding: S.sm }}
                  >
                    <Icon name="trash" size={18} color={STATE.err} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </Sheet>
  );
}
