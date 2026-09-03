import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, FlatList } from 'react-native';
import CampoData from '../CampoData';
import { useStore } from '../store';
import { S, R, FONT, corDoMembro, STATE } from '../theme';
import { DE } from '../data';
import { Card, SectionTitle, Empty, AddButton, Label, Primary, Pill, Tile, Tap, Avatar, avatarDe } from '../ui';
import Icon from '../Icon';
import Sheet from '../Sheet';
import Confirm from '../Confirm';
import { pad2, plural, dayLabel, daysUntil, chaveDeDMY, dmyDeChave, TODAY_KEY } from '../format';

export default function Saude({ t, user, onClose, onAbrirFicha, marcarPara, onMarcado }) {
  const st = useStore();
  const { s, set, addHealthNote, addRecipe, setRecipeDecision, setHealthDecision, addSpecialty, removeSpecialty, membros: MEMBERS, membrosDaCasa } = st;
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
        style={{ borderLeftWidth: 3, borderLeftColor: corDoMembro(record.member, MEMBERS[record.member]?.cor) || t.accent }}
      >
        <View style={{ gap: S.md }}>
          {/* ⚠ O `Pressable` está DENTRO do cartão, e é o único sítio onde
              pode estar. O `Card` não aceita `onPress` — nem nunca aceitou —
              e ignorava-o em SILÊNCIO. Este cartão passava-lho, e o efeito era
              todo o interior ficar inalcançável: o cartão nunca expandia, a
              seta nunca mudava de sentido, e com ele ficavam por chegar os
              botões «Resolvida» e «Pendente», as notas, as receitas e a
              decisão de cada receita.
              O `setHealthDecision`, o `addHealthNote`, o `addRecipe` e o
              `setRecipeDecision` estavam todos escritos e nenhum tinha caminho
              — a mesma forma de defeito do `addHealthRecord`.
              Todos os outros ecrãs põem o `Pressable` dentro do `Card`; era a
              Saúde a única fora do idioma. Descoberto porque o dono da casa
              tocou em «Ação» e não aconteceu nada. */}
          <Pressable accessibilityRole="button"
            accessibilityLabel={`${record.specialty}, ${record.member}${needsDec ? ' · precisa de ação' : ''}`}
            accessibilityState={{ expanded }}
            accessibilityHint={expanded ? 'Toque para fechar' : 'Toque para ver notas, receitas e decidir'}
            onPress={() => setExpandedRecord(expanded ? null : record.id)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 44 }}>
            <Icon name="heartPulse" size={20} color={corDoMembro(record.member, MEMBERS[record.member]?.cor) || t.accent} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: FONT.body, fontSize: 15, fontWeight: '500', color: t.text1 }}>
                {record.specialty}
              </Text>
              <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
                {record.member} · {dayLabel(record.day)}{record.time ? ` às ${record.time}` : ''}
              </Text>
            </View>
            {/* Uma etiqueta, não um botão — e é a linha inteira que abre.
                Fazer da pastilha um alvo próprio dava duas coisas tocáveis na
                mesma linha e obrigava a adivinhar onde tocar (erro #6 do
                CLAUDE.md). */}
            {needsDec && (
              <Pill label="Ação" bg={STATE.warnBg} fg={STATE.warn} border={STATE.warn} />
            )}
            <Icon name={expanded ? 'caretUp' : 'caretDown'} size={20} color={t.text3} />
          </Pressable>

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
                            <Pressable accessibilityRole="button"
                              onPress={() => setRecipeDecision(record.id, recipe.id, 'guardada')}
                              style={{ paddingHorizontal: S.md, paddingVertical: S.sm, backgroundColor: t.accent, borderRadius: R.row, minHeight: 44, justifyContent: 'center' }}
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
                  <Pressable accessibilityRole="button"
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
                          minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body,
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
                            flex: 1, minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body,
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
                            flex: 0.6, minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body,
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
                            flex: 0.6, minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body,
                            fontSize: 14, color: t.text2, borderRadius: R.row, borderWidth: 1,
                            borderColor: t.border, backgroundColor: t.surface,
                          }}
                        />
                      </View>
                      <CampoData t={t} valor={chaveDeDMY(recipeForm.expiresAt)}
                        placeholder="Validade (dd/mm/aaaa)"
                        onChange={(k) => setRecipeForm(f => ({ ...f, expiresAt: dmyDeChave(k) }))} />
                      <Pressable accessibilityRole="button"
                        onPress={() => handleAddRecipe(record.id)}
                        disabled={!recipeForm.name.trim() || !recipeForm.expiresAt.trim()}
                        style={{
                          paddingHorizontal: S.md, paddingVertical: S.sm, backgroundColor: t.accent,
                          borderRadius: R.row, minHeight: 44, justifyContent: 'center',
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
                <Pressable accessibilityRole="button"
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
                    <Pressable accessibilityRole="button"
                      onPress={() => handleAddNote(record.id)}
                      disabled={!newNoteForm.text.trim()}
                      style={{
                        paddingHorizontal: S.md, paddingVertical: S.sm, backgroundColor: t.accent,
                        borderRadius: R.row, minHeight: 44, justifyContent: 'center',
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
                    <Pressable accessibilityRole="button"
                      onPress={() => setHealthDecision(record.id, 'acompanhamento', 'resolvido', 'Consulta marcada')}
                      style={{ flex: 1, paddingHorizontal: S.md, paddingVertical: S.sm, backgroundColor: t.accent, borderRadius: R.row, minHeight: 44, justifyContent: 'center' }}
                    >
                      <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: '#FFFFFF', textAlign: 'center' }}>
                        Resolvida
                      </Text>
                    </Pressable>
                    <Pressable accessibilityRole="button"
                      onPress={() => setHealthDecision(record.id, 'seguimento', 'pendente', 'A aguardar resultado')}
                      style={{ flex: 1, paddingHorizontal: S.md, paddingVertical: S.sm, borderWidth: 1, borderColor: t.border, borderRadius: R.row, minHeight: 44, justifyContent: 'center' }}
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

  // Nenhuma das fichas visíveis tem NADA lá dentro.
  //
  // Numa casa nova a secção mostrava uma linha por membro a dizer «0 consultas
  // · 0 documentos» — uma lista de nadas, com avatares e setas, a ocupar o
  // ecrã para dizer o que uma linha diz. Havendo uma consulta que seja, a
  // lista volta inteira: é a lista que espera por ter o que mostrar.
  const semNada = fichas.length > 0 && fichas.every(m =>
    st.healthOf(m, user).length === 0 && st.docsOf(m, user).length === 0);

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
          {semNada ? (
            <Empty t={t} icon="heartPulse" title="Ainda não há nada nas fichas desta casa."
              hint="Use Marcar Consulta para a primeira. A sua ficha é privada; as das crianças são visíveis aos adultos." />
          ) : null}
          <View style={{ gap: S.md }}>
            {(semNada ? [] : fichas).map(m => {
              const n = st.healthOf(m, user).length;
              const d = st.docsOf(m, user).length;
              const prox = st.nextHealth(m, user);
              return (
                <Card key={m} t={t} style={{ borderLeftWidth: 3, borderLeftColor: corDoMembro(m, MEMBERS[m]?.cor) }}>
                  <Pressable onPress={() => onAbrirFicha(m)} accessibilityRole="button"
                    accessibilityLabel={m === user ? 'A minha ficha' : `Saúde ${DE(m)} ${m}`}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 }}>
                    <Avatar {...avatarDe(m, MEMBERS[m], t.text3)} size={40} />
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
                minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body,
                fontSize: 14, color: t.text2, borderRadius: R.row, borderWidth: 1,
                borderColor: t.border, backgroundColor: t.card,
              }}
            />

            {/* Member filter pills */}
            <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
              <Pressable accessibilityRole="button"
                onPress={() => setMemberFilter(null)}
                style={{
                  paddingHorizontal: S.md, minHeight: 44, borderRadius: R.pill,
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
                <Pressable accessibilityRole="button"
                  key={member}
                  onPress={() => setMemberFilter(memberFilter === member ? null : member)}
                  style={{
                    paddingHorizontal: S.md, minHeight: 44, borderRadius: R.pill,
                    borderWidth: 1, borderColor: memberFilter === member ? corDoMembro(member, MEMBERS[member]?.cor) : t.border,
                    backgroundColor: memberFilter === member ? 'rgba(0,0,0,0.02)' : 'transparent',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: memberFilter === member ? corDoMembro(member, MEMBERS[member]?.cor) : t.text3 }}>
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
  // ⚠ Sem `renameSpecialty`, e de propósito: ele troca o nome na lista e não
  // toca nos episódios de `health`, que guardam a especialidade como texto.
  // Renomear deixava as consultas a apontar para um nome que já não existe.
  const st = useStore();
  const { s, set, addSpecialty, removeSpecialty, renameSpecialty, addHealthRecord,
          membrosDaCasa, criancas, membros: MEMBERS, oNome } = st;

  // ⚠ Só os membros cuja ficha quem está a marcar PODE ver. O selector
  // oferecia `membrosDaCasa` inteiro, o outro adulto incluído — e a ficha de um
  // adulto é só dele (INVARIANTE #3). A Rita marcava uma consulta ao Tomás e
  // ficava com um episódio que ela própria não vê e um evento que não lhe
  // aparece: escrevia no escuro.
  const marcaveis = membrosDaCasa.filter(n => st.canSeeHealth(n, user));
  const [tab, setTab] = useState('nova');
  const [form, setForm] = useState({ member: membro || criancas[0] || marcaveis[0],
    date: '', time: '', specialty: '', doctor: '', nota: '' });
  const [newSpecialty, setNewSpecialty] = useState('');
  // Esta lista era gerida em dois sítios — aqui e numa quinta aba da Gestão da
  // Casa. A da Gestão saiu, e com ela saiu o diálogo que PERGUNTAVA antes de
  // apagar: aqui o toque apagava logo. Passou a perguntar, porque agora é o
  // único sítio e um toque a mais não desfaz nada.
  const [aApagar, setAApagar] = useState(null);
  // Qual está a ser renomeada, e o que a loja recusou dizer em português.
  const [aRenomear, setARenomear] = useState(null);
  const [erroEsp, setErroEsp] = useState(null);

  // Marcar uma consulta cria DUAS coisas, e é o «nenhum exame órfão» do
  // TAREFAS.md: o episódio na ficha e o evento na agenda, ligados.
  //
  // ⚠ Antes criava só o evento. O `addHealthRecord` existia na loja e nada o
  // chamava: numa casa a sério a Ficha de Saúde ficava vazia para sempre, e a
  // agenda tinha uma consulta que não correspondia a episódio nenhum. O ecrã
  // dizia «Ainda não há nada nas fichas desta casa. Use Marcar Consulta para a
  // primeira» — e usar Marcar Consulta não punha lá nada.
  // Quem decide a frase do aviso — e a visibilidade do evento, mais abaixo.
  // Uma leitura, dois usos: se fossem duas, discordavam.
  const paraCrianca = !!(MEMBERS[form.member] && MEMBERS[form.member].kid);

  const handleSaveConsultation = () => {
    if (!chaveDeDMY(form.date) || !form.specialty) return;

    const id = addHealthRecord(form.member, form.date, form.specialty, form.time,
      { doctor: form.doctor, nota: form.nota });

    // ⚠ A visibilidade do evento ESPELHA a da saúde (INVARIANTE #3), e não era
    // isso que fazia. Levava `shared: true` — o campo antigo, de antes dos três
    // níveis — e o `visibilidadeDe` lê `shared: true` como «família». Ou seja:
    // a consulta do Léo aparecia na agenda da Mia, e a de um adulto aparecia ao
    // outro. O ecrã da Saúde promete o contrário, em letras, na primeira linha.
    //
    // A regra é `podeVerSaude`: a ficha de um adulto é só dele; as das crianças
    // são visíveis aos adultos e invisíveis às próprias. Traduzida para um
    // evento:
    //
    //   criança   `adultos`, e o dono é quem marca — NÃO a criança. O
    //             `podeVerEvento` devolve verdade ao dono, portanto pôr a
    //             criança como dona mostrava-lhe a própria consulta.
    //   adulto    `so-eu`, e o dono é o adulto de quem é a consulta.
    set(s => ({
      added: [...(s.added || []), {
        id: 'ev-' + Date.now(),
        day: chaveDeDMY(form.date),
        time: form.time || '10:00',
        title: `Consulta ${form.specialty}`,
        who: `${form.member} · Consulta de saúde`,
        owner: paraCrianca ? user : form.member,
        visibilidade: paraCrianca ? 'adultos' : 'so-eu',
        tag: 'Saúde',
        healthId: id,        // o episódio a que este evento pertence
      }],
    }));
    onClose();
  };

  return (
    <Sheet t={t} title="Marcar Consulta" sub="Marcar consultas e gerir especialidades" onClose={onClose}>
      <View style={{ gap: S.lg }}>
        {/* Tabs */}
        {/* ⚠ Estes dois eram `accessibilityRole="button"` SEM rótulo nenhum.
            São abas, e agora são a entrada para o único sítio onde as
            especialidades se gerem — o leitor de ecrã tem de as anunciar como
            abas, e dizer qual está escolhida. Sem rótulo também não apareciam
            em varredura nenhuma, que é como catorze alvos pequenos viveram
            escondidos neste ecrã. */}
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          <Pressable accessibilityRole="tab" accessibilityLabel="Nova Consulta"
            accessibilityState={{ selected: tab === 'nova' }}
            onPress={() => setTab('nova')}
            style={{
              flex: 1, minHeight: 44, justifyContent: 'center', borderBottomWidth: 2,
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
          <Pressable accessibilityRole="tab" accessibilityLabel="Especialidades"
            accessibilityState={{ selected: tab === 'especialidades' }}
            onPress={() => setTab('especialidades')}
            style={{
              flex: 1, minHeight: 44, justifyContent: 'center', borderBottomWidth: 2,
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
            {/* «A consulta», com o «Gerir» ao lado — é onde o protótipo o põe.
                ⚠ Por agora leva à aba «Especialidades», que continua ali em
                cima. São dois caminhos para o mesmo sítio, e é dívida
                assumida: o protótipo não tem abas nesta folha, e tirá-las é o
                trabalho de mover as especialidades para uma folha própria.
                Está no TAREFAS.md. Deixar duas portas é o mesmo defeito que os
                atalhos do Início tinham, e não fica assim para sempre. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
              <Text style={{ flex: 1, fontFamily: FONT.display, fontSize: 16,
                fontWeight: '600', color: t.titulo || t.slate }}>
                A consulta
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Gerir especialidades"
                onPress={() => setTab('especialidades')}
                style={{ minHeight: 44, minWidth: 44, paddingHorizontal: S.md,
                  borderRadius: R.row, borderWidth: 1, borderColor: t.border,
                  alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.text2 }}>
                  Gerir
                </Text>
              </Pressable>
            </View>

            <View style={{ gap: S.sm }}>
              <Label t={t}>Membro</Label>
              <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
                {marcaveis.map(name => (
                  <Pressable accessibilityRole="button"
                    key={name}
                    accessibilityLabel={name}
                    accessibilityState={{ selected: form.member === name }}
                    onPress={() => setForm(f => ({ ...f, member: name }))}
                    style={{
                      paddingHorizontal: S.md, minHeight: 44, borderRadius: R.pill,
                      borderWidth: 2,
                      borderColor: form.member === name ? corDoMembro(name, MEMBERS[name]?.cor) : t.border,
                      backgroundColor: form.member === name ? 'rgba(0,0,0,0.02)' : 'transparent',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{
                      fontFamily: FONT.ui, fontSize: 12, color: form.member === name ? corDoMembro(name, MEMBERS[name]?.cor) : t.text3,
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
                  <Pressable accessibilityRole="button"
                    key={spec}
                    accessibilityLabel={spec}
                    accessibilityState={{ selected: form.specialty === spec }}
                    onPress={() => setForm(f => ({ ...f, specialty: spec }))}
                    style={{
                      paddingHorizontal: S.md, minHeight: 44, borderRadius: R.pill,
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

            {/* ── Médico ou clínica ────────────────────────────────────────
                ⚠ O campo que faltava e que a app já lia. O `h.doctor` aparece
                em cinco sítios — a próxima consulta na ficha, cada linha do
                histórico, o detalhe de cada documento, o PDF exportado e a
                folha de exportação — e nunca havia onde o escrever. Mostrava
                «Dentista · Dr. Cardoso» para as sementes e nada para uma
                consulta a sério. */}
            <View style={{ gap: S.sm }}>
              <Label t={t}>Médico ou clínica</Label>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md,
                minHeight: 44, paddingHorizontal: S.md, borderRadius: R.row,
                borderWidth: 1, borderColor: t.border, backgroundColor: t.card }}>
                <Icon name="idcard" size={19} color={t.text3} />
                <TextInput
                  value={form.doctor}
                  onChangeText={(v) => setForm(f => ({ ...f, doctor: v }))}
                  placeholder="Dr.ª Neves, Centro de Saúde…"
                  placeholderTextColor={t.text3}
                  accessibilityLabel="Médico ou clínica"
                  style={{ flex: 1, minHeight: 44, fontFamily: FONT.body,
                    fontSize: 15, color: t.text2 }}
                />
              </View>
            </View>

            {/* ── Nota (opcional) ──────────────────────────────────────────
                A nota de quem MARCA: «jejum, levar exames anteriores». Não é o
                `healthNotes`, que são as notas escritas depois da consulta,
                cada uma com autor e data. */}
            <View style={{ gap: S.sm }}>
              <Label t={t}>Nota (opcional)</Label>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md,
                minHeight: 44, paddingHorizontal: S.md, borderRadius: R.row,
                borderWidth: 1, borderColor: t.border, backgroundColor: t.card }}>
                <Icon name="edit" size={19} color={t.text3} />
                <TextInput
                  value={form.nota}
                  onChangeText={(v) => setForm(f => ({ ...f, nota: v }))}
                  placeholder="Jejum, levar exames anteriores…"
                  placeholderTextColor={t.text3}
                  accessibilityLabel="Nota da consulta"
                  style={{ flex: 1, minHeight: 44, fontFamily: FONT.body,
                    fontSize: 15, color: t.text2 }}
                />
              </View>
            </View>

            {/* ── O aviso da privacidade ───────────────────────────────────
                O comportamento já existia e estava provado; faltava DIZÊ-LO a
                quem marca.

                ⚠ A frase não é a do protótipo tal e qual, e é de propósito. Lá
                é fixa — «entra na sua Agenda como Só eu» — porque aquela folha
                marca sempre para quem está a ver. Esta tem selector de membro,
                e a visibilidade não é a mesma: a consulta de um adulto é
                `so-eu`, a de uma criança é `adultos`. Copiar a frase fixa
                dizia «só eu» ao marcar ao Léo, quando o outro adulto a vê —
                metade das vezes seria mentira. */}
            <View style={{ flexDirection: 'row', gap: S.md, padding: S.md,
              borderRadius: R.row, backgroundColor: t.state.errBg,
              borderWidth: 1, borderColor: t.state.err }}>
              <Icon name="lock" size={19} color={t.state.err} />
              <Text style={{ flex: 1, fontFamily: FONT.body, fontSize: 13,
                lineHeight: 19, color: t.state.errDeep }}>
                {paraCrianca
                  ? `A consulta entra na Agenda como Só os adultos. ${oNome(form.member)} não a vê, nem as outras crianças.`
                  : 'A consulta entra na sua Agenda como Só eu. Ninguém mais vê o motivo.'}
              </Text>
            </View>

            {/* «Marcar e Pôr na Agenda», como no protótipo: promete as duas
                coisas que acontecem, e são duas — o episódio na ficha e o
                evento na agenda. Dizia só «Marcar Consulta». */}
            <Primary t={t} label="Marcar e Pôr na Agenda" onPress={handleSaveConsultation}
              disabled={!form.date || !form.specialty} />
          </View>
        )}

        {/* Especialidades Tab */}
        {tab === 'especialidades' && (
          <View style={{ gap: S.lg }}>
            {/* ── Um campo, dois trabalhos ────────────────────────────────
                Acrescentar e renomear partilham o campo. Tocar no lápis de uma
                linha traz o nome para aqui e o botão passa a visto; o
                «Cancelar» aparece ao lado.

                ⚠ Não é uma folha dentro de outra, e é de propósito: isto já
                está DENTRO da folha «Marcar Consulta», e a `Sheet` é um
                `Modal` — encaixar outro por cima punha o rodapé em risco
                (INVARIANTE #1, que já quebrou três vezes). O campo estava aqui
                e não custa nada.

                O renomear voltou depois de o `renameSpecialty` da loja passar
                a migrar os episódios de `health` e o título do evento da
                agenda. Antes trocava o nome na lista e mais nada, e por isso
                foi retirado. */}
            <View style={{ gap: S.sm }}>
              <Label t={t}>{aRenomear ? `Renomear «${aRenomear}»` : 'Adicionar especialidade'}</Label>
              <View style={{ flexDirection: 'row', gap: S.sm }}>
                <TextInput
                  value={newSpecialty}
                  onChangeText={(v) => { setNewSpecialty(v); setErroEsp(null); }}
                  placeholder="Ex: Cardiologia"
                  placeholderTextColor={t.text3}
                  style={{
                    flex: 1, minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body,
                    fontSize: 14, color: t.text2, borderRadius: R.row, borderWidth: 1,
                    borderColor: erroEsp ? t.state.err : t.border, backgroundColor: t.card,
                  }}
                />
                {aRenomear ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Cancelar"
                    onPress={() => { setARenomear(null); setNewSpecialty(''); setErroEsp(null); }}
                    style={{ paddingHorizontal: S.md, minWidth: 44, minHeight: 44, borderRadius: R.row,
                      borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="close" size={20} color={t.text3} />
                  </Pressable>
                ) : null}
                <Pressable accessibilityRole="button"
                  accessibilityLabel={aRenomear ? 'Guardar o nome' : 'Acrescentar especialidade'}
                  onPress={() => {
                    const nome = newSpecialty.trim();
                    if (!nome) return;
                    if (aRenomear) {
                      // A loja devolve null ou uma frase em português.
                      const erro = renameSpecialty(aRenomear, nome);
                      if (erro) return setErroEsp(erro);
                      setARenomear(null);
                    } else {
                      addSpecialty(nome);
                    }
                    setNewSpecialty('');
                    setErroEsp(null);
                  }}
                  disabled={!newSpecialty.trim()}
                  style={{
                    paddingHorizontal: S.md, minWidth: 44, minHeight: 44, borderRadius: R.row, backgroundColor: t.accent,
                    alignItems: 'center', justifyContent: 'center', opacity: !newSpecialty.trim() ? 0.5 : 1,
                  }}
                >
                  <Icon name={aRenomear ? 'check' : 'plus'} size={20} color="#FFFFFF" />
                </Pressable>
              </View>
              {erroEsp ? (
                <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.state.errDeep }}>
                  {erroEsp}
                </Text>
              ) : null}
            </View>

            <View style={{ gap: S.md }}>
              <Label t={t}>Especialidades</Label>
              {!(s.specialities || []).length ? (
                <Empty t={t} icon="heartPulse" title="Sem especialidades."
                  hint="São as que aparecem ao marcar uma consulta." />
              ) : null}
              {(s.specialities || []).map(spec => (
                <View key={spec} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.md, paddingVertical: S.sm, backgroundColor: t.subtle, borderRadius: R.row }}>
                  <Text style={{ flex: 1, fontFamily: FONT.body, fontSize: 14, color: t.text2 }}>
                    {spec}
                  </Text>
                  {/* ⚠ Era um `Pressable` com `padding: S.sm` à volta de um ícone
                      de 18 — 34 px de alvo, contra os 44 do INVARIANTE #5. E o
                      `hitSlop={8}` que o acompanhava não salvava nada: a
                      react-native-web IGNORA-O. Passou a `Tap`, que tem 44 por
                      omissão e não depende do hitSlop para os ter. */}
                  {/* O lápis traz o nome para o campo lá em cima. Duas
                      pastilhas numa linha que não é tocável — a linha não tem
                      destino próprio, portanto o erro #6 do CLAUDE.md («uma
                      linha, um destino») não se aplica: aqui há duas ações e
                      nenhuma linha a competir com elas. */}
                  <Tap label={`Renomear ${spec}`}
                    onPress={() => { setARenomear(spec); setNewSpecialty(spec); setErroEsp(null); }}>
                    <Icon name="edit" size={18} color={t.text3} />
                  </Tap>
                  <Tap label={`Apagar ${spec}`} onPress={() => setAApagar(spec)}>
                    <Icon name="trash" size={18} color={STATE.err} />
                  </Tap>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {aApagar && (
        <Confirm t={t} destructive icon="trash"
          title="Apagar especialidade?"
          message={`«${aApagar}» deixa de aparecer ao marcar uma consulta. As consultas já marcadas com ela ficam como estão.`}
          confirmLabel="Apagar" onCancel={() => setAApagar(null)}
          onConfirm={() => { removeSpecialty(aApagar); setAApagar(null); }} />
      )}
    </Sheet>
  );
}
