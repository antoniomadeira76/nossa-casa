import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, FlatList } from 'react-native';
import CampoData from '../CampoData';
import { useStore } from '../store';
import { S, R, FONT, corDoMembro, STATE } from '../theme';
import { DE } from '../data';
import { Card, SectionTitle, Empty, AddButton, Label, Primary, Pill, Tile, Avatar } from '../ui';
import Icon from '../Icon';
import Sheet from '../Sheet';
import { pad2, plural, dayLabel, daysUntil, chaveDeDMY, dmyDeChave, TODAY_KEY } from '../format';

export default function Saude({ t, user, onClose, onAbrirFicha, marcarPara, onMarcado }) {
  const st = useStore();
  const { s, set, addHealthNote, addRecipe, setRecipeDecision, setHealthDecision, addSpecialty, removeSpecialty, renameSpecialty, membros: MEMBERS, membrosDaCasa } = st;
  const [membroDaFolha, setMembroDaFolha] = useState(null);  // pré-selecção ao marcar

  // Quem toca em «marcar consulta» dentro de uma ficha volta para aqui com o
  // membro em mão. Sem isto a folha abria no valor por omissão, e vir da
  // ficha da Mia propunha o Léo.
  useEffect(() => {
    if (!marcarPara) return;
    setMembroDaFolha(marcarPara);
    setSheet('consulta');
    onMarcado?.();
  }, [marcarPara]);
  const [sheet, setSheet] = useState(null);
  const [expandedRecord, setExpandedRecord] = useState(null);
  const [expandedNote, setExpandedNote] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [memberFilter, setMemberFilter] = useState(null);
  const [newNoteForm, setNewNoteForm] = useState({ text: '' });
  const [recipeForm, setRecipeForm] = useState({ name: '', dosage: '', quantity: '', unit: '', expiresAt: '' });

  // A visibilidade vem da loja. Havia aqui uma cópia própria, e era mais
  // permissiva: devolvia true para qualquer criança sem verificar se quem vê é
  // adulto. Hoje não dava fuga porque só adultos chegam a este ecrã, mas é o
  // INVARIANTE #3 escrito duas vezes, e a segunda mais fraca. Agora há uma
  // regra só, pura e com seis provas em __tests__.
  const podeVer = (member) => st.canSeeHealth(member, user);

  // allHealth(), não s.health: as sementes são código e só o que o utilizador
  // acrescenta é que se grava. Ler só o gravado deixava este ecrã a dizer «Sem
  // registos de saúde.» enquanto o cartão do membro, que lê pela loja, dizia
  // «1 consulta» duas linhas acima.
  const visibleRecords = st.allHealth().filter(h => podeVer(h.member));

  // Determina o que precisa de decisão (topo do acordeão)
  const needsDecision = visibleRecords.filter(h => {
    const decision = s.healthDecisions[h.id];
    return !decision || decision.status !== 'resolvido';
  });

  // Por data descendente. Ordenava com `new Date(h.date)` sobre o texto do
  // formulário — «28/08/2026» dá Invalid Date, e a ordenação era o acaso.
  // As chaves comparam-se como texto e ficam por ordem.
  const porData = (a, b) => String(b.day || '').localeCompare(String(a.day || ''));
  const decisionsSorted = [
    ...needsDecision.sort(porData),
    ...visibleRecords.filter(h => !needsDecision.includes(h)).sort(porData),
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

  // Era um cálculo próprio, com `new Date(2026, 7, 27)` escrito à mão: uma
  // terceira ideia de «hoje», sete dias à frente do TODAY da app. Uma receita
  // a expirar passava por válida durante essa semana. Agora conta como tudo
  // o resto — ver daysUntil em format.js.
  const getRecipeExpiration = (expiresAt) => daysUntil(expiresAt) ?? 0;

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
        style={{ borderLeftWidth: 3, borderLeftColor: corDoMembro(record.member) || t.accent }}
      >
        <View style={{ gap: S.md }}>
          {/* Header da consulta */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
            <Icon name="heartPulse" size={20} color={corDoMembro(record.member) || t.accent} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: FONT.body, fontSize: 15, fontWeight: '500', color: t.text1 }}>
                {record.specialty}
              </Text>
              <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
                {record.member} · {dayLabel(record.day)}{record.time ? ` às ${record.time}` : ''}
              </Text>
            </View>
            {needsDec && (
              <Pill label="Ação" bg={STATE.warnBg} fg={STATE.warn} border={STATE.warn} />
            )}
            <Icon name={expanded ? 'caretUp' : 'caretDown'} size={20} color={t.text3} />
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
                      <CampoData t={t} valor={chaveDeDMY(recipeForm.expiresAt)}
                        placeholder="Validade (dd/mm/aaaa)"
                        onChange={(k) => setRecipeForm(f => ({ ...f, expiresAt: dmyDeChave(k) }))} />
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
                      onPress={() => setHealthDecision(record.id, 'seguimento', 'pendente', 'A aguardar resultado')}
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

  // Uma ficha por membro, como manda o desenho. Quem a pode abrir vem do
  // store; a lista só mostra as que o utilizador pode ver.
  const fichas = Object.keys(MEMBERS).filter(m => st.canSeeHealth(m, user));

  const folha = sheet === 'consulta'
    ? <MarcarConsulta t={t} user={user} membro={membroDaFolha} onClose={() => setSheet(null)} />
    : null;

  return (
    <>
      <View style={{ gap: S.md }}>
        <Tile t={t} kind="err" icon="lock">
          A sua ficha é privada — nem o outro adulto a vê. As fichas das crianças
          são visíveis aos adultos e invisíveis às próprias.
        </Tile>

        <View>
          <SectionTitle t={t}>Fichas</SectionTitle>
          {fichas.length === 0 ? (
            <Empty t={t} icon="heartPulse" title="Não há fichas que possa ver."
              hint="A sua ficha é privada; as das crianças são visíveis aos adultos." />
          ) : null}
          <View style={{ gap: S.md }}>
            {fichas.map(m => {
              const n = st.healthOf(m, user).length;
              const d = st.docsOf(m, user).length;
              const prox = st.nextHealth(m, user);
              return (
                <Card key={m} t={t} style={{ borderLeftWidth: 3, borderLeftColor: corDoMembro(m) }}>
                  <Pressable onPress={() => onAbrirFicha(m)} accessibilityRole="button"
                    accessibilityLabel={m === user ? 'A minha ficha' : `Saúde ${DE(m)} ${m}`}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 }}>
                    <Avatar initial={MEMBERS[m].initial} color={corDoMembro(m)} size={40} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontFamily: FONT.body, fontSize: 15.5, color: t.text1 }}>
                        {m === user ? 'A minha ficha' : m}
                      </Text>
                      <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
                        {m === user ? 'Privada' : 'Visível aos adultos'}
                        {' · '}
                        {plural(n, 'consulta', 'consultas')} · {plural(d, 'documento', 'documentos')}
                      </Text>
                      {prox ? (
                        <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.state.info }}>
                          A seguir: {prox.specialty} · {dayLabel(prox.day).replace('Hoje · ', 'Hoje, ')}
                        </Text>
                      ) : null}
                    </View>
                    <Icon name="caretRight" size={18} color={t.text3} />
                  </Pressable>
                </Card>
              );
            })}
          </View>
        </View>

        {/* Botão Marcar Consulta */}
        <AddButton t={t} label="marcar consulta" onPress={() => { setMembroDaFolha(null); setSheet('consulta'); }} />

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
              {membrosDaCasa.map(member => (
                <Pressable
                  key={member}
                  onPress={() => setMemberFilter(memberFilter === member ? null : member)}
                  style={{
                    paddingHorizontal: S.md, minHeight: 32, borderRadius: R.pill,
                    borderWidth: 1, borderColor: memberFilter === member ? corDoMembro(member) : t.border,
                    backgroundColor: memberFilter === member ? 'rgba(0,0,0,0.02)' : 'transparent',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: memberFilter === member ? corDoMembro(member) : t.text3 }}>
                    {member}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Registos acrescentados aqui. As consultas vivem nas fichas acima —
            mostrar «sem registos» por baixo de fichas que contam consultas
            era o ecrã a contradizer-se. */}
        {filtered.length === 0 ? null : (
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
      {folha}
    </>
  );
}

// `membro` é quem estava aberto quando se tocou em «marcar consulta». Vinha
// por um setForm num estado que esta folha não lê — tem o seu próprio form —
// portanto abrir a partir da ficha da Mia propunha o Léo, que é o valor por
// omissão. Agora vem por prop.
function MarcarConsulta({ t, user, membro, onClose }) {
  const { s, set, addSpecialty, removeSpecialty, renameSpecialty, membrosDaCasa, criancas } = useStore();
  const [tab, setTab] = useState('nova');
  const [form, setForm] = useState({ member: membro || criancas[0] || membrosDaCasa[0], date: '', time: '', specialty: '' });
  const [newSpecialty, setNewSpecialty] = useState('');
  const [editingSpecialty, setEditingSpecialty] = useState(null);

  const handleSaveConsultation = () => {
    if (!chaveDeDMY(form.date) || !form.specialty) return;
    // Criar evento na agenda com tag "Saúde"
    set(s => ({
      added: [...(s.added || []), {
        id: 'ev-' + Date.now(),
        day: chaveDeDMY(form.date),
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
    <Sheet t={t} title="Marcar Consulta" sub="Marcar consultas e gerir especialidades" onClose={onClose}>
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
                {membrosDaCasa.map(name => (
                  <Pressable
                    key={name}
                    onPress={() => setForm(f => ({ ...f, member: name }))}
                    style={{
                      paddingHorizontal: S.md, minHeight: 36, borderRadius: R.pill,
                      borderWidth: 2,
                      borderColor: form.member === name ? corDoMembro(name) : t.border,
                      backgroundColor: form.member === name ? 'rgba(0,0,0,0.02)' : 'transparent',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{
                      fontFamily: FONT.ui, fontSize: 12, color: form.member === name ? corDoMembro(name) : t.text3,
                    }}>
                      {name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={{ gap: S.sm }}>
              <Label t={t}>Data</Label>
              <CampoData t={t} valor={chaveDeDMY(form.date)}
                onChange={(k) => setForm(f => ({ ...f, date: dmyDeChave(k) }))} />
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
