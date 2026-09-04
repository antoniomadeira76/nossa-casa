import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, FlatList, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import CampoData from '../CampoData';
import { useStore } from '../store';
import { S, R, FONT, corDoMembro, STATE } from '../theme';
import { DE } from '../data';
import { Card, SectionTitle, Empty, AddButton, Label, Primary, Pill, Tile, Tap, Avatar, avatarDe } from '../ui';
import Icon from '../Icon';
import Sheet from '../Sheet';
import { pad2, plural, dayLabel, daysUntil, chaveDeDMY, dmyDeChave, TODAY_KEY } from '../format';

export default function Saude({ t, user, onClose, onAbrirFicha, marcarPara, onMarcado }) {
  const st = useStore();
  const { s, set, addHealthNote, addRecipe, setRecipeDecision, setHealthDecision, addSpecialty, removeSpecialty, addHealthDoc, arquivarConsulta, membros: MEMBERS, membrosDaCasa } = st;
  const [membroDaFolha, setMembroDaFolha] = useState(null);  // pré-selecção ao marcar

  const [sheet, setSheet] = useState(null);

  // ── O rascunho da consulta vive AQUI, e não dentro da folha ────────────────
  //
  // ⚠ Estava dentro do `MarcarConsulta`, com um `useState` próprio. Enquanto as
  // especialidades eram uma aba dessa mesma folha, isso chegava — a folha nunca
  // desmontava. Agora «Gerir» abre uma folha IRMÃ, e a de marcar sai do ecrã:
  // um formulário meio preenchido perdia-se a caminho de acrescentar a
  // especialidade que faltava, que é precisamente quando se lá vai.
  //
  // É o que o protótipo faz — o `consDraft` dele está no estado do pai —, e é
  // também o que permite que criar uma especialidade a deixe já escolhida no
  // rascunho ao voltar.
  const marcaveis = membrosDaCasa.filter(n => st.canSeeHealth(n, user));
  const rascunhoVazio = (membro) => ({
    member: membro || st.criancas[0] || marcaveis[0],
    date: '', time: '', specialty: '', doctor: '', nota: '',
  });
  const [consulta, setConsulta] = useState(() => rascunhoVazio(null));

  const abrirMarcacao = (membro) => {
    setMembroDaFolha(membro || null);
    setConsulta(rascunhoVazio(membro));
    setSheet('consulta');
  };

  // Quem toca em «marcar consulta» dentro de uma ficha volta para aqui com o
  // membro em mão. Sem isto a folha abria no valor por omissão, e vir da
  // ficha da Mia propunha o Léo.
  useEffect(() => {
    if (!marcarPara) return;
    abrirMarcacao(marcarPara);
    onMarcado?.();
  }, [marcarPara]);
  const [expandedRecord, setExpandedRecord] = useState(null);
  const [expandedNote, setExpandedNote] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [memberFilter, setMemberFilter] = useState(null);
  // Um rascunho de nota POR consulta, não um só para todas — ver `handleAddNote`.
  const [newNoteForm, setNewNoteForm] = useState({});
  const [recipeForm, setRecipeForm] = useState({ name: '', dosage: '', quantity: '', unit: '', expiresAt: '' });
  // A folha «Anexar»: de que consulta, e o que se está a escrever.
  const [anexoDe, setAnexoDe] = useState(null);
  const [anexoForm, setAnexoForm] = useState({ kind: 'Exame', title: '', expires: '', foto: null });

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

  // ⚠ As arquivadas saem daqui. Arquivar não apaga, mas uma consulta
  // arquivada não «precisa de ação» — se ficasse, arquivar não fazia nada ao
  // que o ecrã mostra em primeiro lugar, que é o único sítio onde se nota.
  // ⚠ `eArquivada` e não `arquivada`: o `RecordCard` tem um `arquivada`
  // BOOLEANO, e dois nomes iguais com tipos diferentes no mesmo ficheiro é
  // onde alguém escreve `if (arquivada)` sobre uma função e passa sempre.
  const eArquivada = (h) => st.estaArquivada(h.id);
  const activas = visibleRecords.filter(h => !eArquivada(h));
  const arquivadas = visibleRecords.filter(eArquivada).sort((x, y) => String(y.day||'').localeCompare(String(x.day||'')));

  // Determina o que precisa de decisão (topo do acordeão)
  const needsDecision = activas.filter(h => {
    const decision = s.healthDecisions[h.id];
    return !decision || decision.status !== 'resolvido';
  });

  // Por data descendente. Ordenava com `new Date(h.date)` sobre o texto do
  // formulário — «28/08/2026» dá Invalid Date, e a ordenação era o acaso.
  // As chaves comparam-se como texto e ficam por ordem.
  const porData = (a, b) => String(b.day || '').localeCompare(String(a.day || ''));
  const decisionsSorted = [
    ...needsDecision.sort(porData),
    ...activas.filter(h => !needsDecision.includes(h)).sort(porData),
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

  // ── As notas: sempre à mão, e alteráveis ──────────────────────────────────
  //
  // ⚠ O rascunho é POR CONSULTA. Era um só — `newNoteForm.text` — e enquanto o
  // campo estava escondido atrás de um «Adicionar nota» isso passava. Com o
  // campo sempre visível, o que se escrevesse numa consulta aparecia na outra
  // ao mudar de cartão.
  const [notaEmEdicao, setNotaEmEdicao] = useState(null);   // { healthId, notaId }
  const [textoEmEdicao, setTextoEmEdicao] = useState('');
  const [erroDaNota, setErroDaNota] = useState(null);

  const rascunhoDe = (healthId) => (newNoteForm[healthId] || '');

  const handleAddNote = (healthId) => {
    const erro = addHealthNote(healthId, user, rascunhoDe(healthId));
    if (erro) return setErroDaNota(erro);
    setNewNoteForm(f => ({ ...f, [healthId]: '' }));
    setErroDaNota(null);
  };

  const comecarAEditar = (healthId, nota) => {
    setNotaEmEdicao({ healthId, notaId: nota.id });
    setTextoEmEdicao(nota.text);
    setErroDaNota(null);
  };

  const pararDeEditar = () => {
    setNotaEmEdicao(null);
    setTextoEmEdicao('');
    setErroDaNota(null);
  };

  const guardarAEdicao = () => {
    const { healthId, notaId } = notaEmEdicao;
    const erro = st.editarNotaSaude(healthId, notaId, textoEmEdicao, user);
    if (erro) return setErroDaNota(erro);
    pararDeEditar();
  };

  const apagarNota = (healthId, notaId) => {
    const erro = st.apagarNotaSaude(healthId, notaId, user);
    if (erro) return setErroDaNota(erro);
    if (notaEmEdicao && notaEmEdicao.notaId === notaId) pararDeEditar();
    setErroDaNota(null);
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

  // O mesmo caminho que a fatura de um equipamento usa (FichaEquipamento.jsx),
  // para não haver dois modos de escolher uma imagem nesta app.
  const escolherFotoDoAnexo = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!r.canceled && r.assets && r.assets[0]) {
      setAnexoForm(f => ({ ...f, foto: r.assets[0].uri }));
    }
  };

  const RecordCard = ({ record }) => {
    const expanded = expandedRecord === record.id;
    const notes = s.healthNotes[record.id] || [];
    const recipes = s.healthRecipes[record.id] || [];
    const decision = s.healthDecisions[record.id];
    const needsDec = !decision || decision.status !== 'resolvido';
    const anexos = st.docsDaConsulta(record.id);
    const arquivada = st.estaArquivada(record.id);

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
                {notes.map(note => {
                  const aEditar = notaEmEdicao
                    && notaEmEdicao.healthId === record.id
                    && notaEmEdicao.notaId === note.id;
                  // ⚠ Só quem escreveu. Uma nota é o relato de uma pessoa
                  // sobre o que ouviu na consulta; o outro adulto reescrevê-la
                  // em silêncio é pior do que não a poder corrigir. A loja
                  // recusa de qualquer modo — isto é só não oferecer o alvo.
                  const minha = note.author === user;
                  return (
                    <View key={note.id} style={{ gap: 4, padding: S.md,
                      backgroundColor: t.subtle, borderRadius: R.row,
                      borderWidth: aEditar ? 1 : 0, borderColor: t.accent }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
                        <Text style={{ flex: 1, fontFamily: FONT.ui, fontSize: 11, color: t.text3, fontWeight: '600' }}>
                          {note.author} · {note.date.split('T')[0]}
                          {note.editadaEm ? ' · alterada' : ''}
                        </Text>
                        {minha && !aEditar ? (
                          <>
                            <Tap label={`Alterar a nota de ${note.author}`}
                              onPress={() => comecarAEditar(record.id, note)}>
                              <Icon name="edit" size={16} color={t.text3} />
                            </Tap>
                            <Tap label={`Apagar a nota de ${note.author}`}
                              onPress={() => apagarNota(record.id, note.id)}>
                              <Icon name="trash" size={16} color={STATE.err} />
                            </Tap>
                          </>
                        ) : null}
                      </View>

                      {aEditar ? (
                        // Altera-se no lugar, sem folha nem diálogo: o texto
                        // fica onde estava e o resto da consulta continua à
                        // vista.
                        <View style={{ gap: S.md }}>
                          <TextInput
                            value={textoEmEdicao}
                            onChangeText={(v) => { setTextoEmEdicao(v); setErroDaNota(null); }}
                            accessibilityLabel="Texto da nota"
                            placeholder="Escrever nota…"
                            placeholderTextColor={t.text3}
                            multiline
                            style={{ minHeight: 80, paddingHorizontal: S.md, paddingVertical: S.md,
                              fontFamily: FONT.body, fontSize: 13, color: t.text2,
                              borderRadius: R.row, borderWidth: 1, borderColor: t.border,
                              backgroundColor: t.card, textAlignVertical: 'top' }}
                          />
                          <View style={{ flexDirection: 'row', gap: S.sm }}>
                            <Pressable accessibilityRole="button" accessibilityLabel="Guardar a alteração"
                              onPress={guardarAEdicao}
                              disabled={!textoEmEdicao.trim()}
                              style={{ flex: 1, minHeight: 44, minWidth: 44, borderRadius: R.row,
                                backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center',
                                opacity: !textoEmEdicao.trim() ? 0.5 : 1 }}>
                              <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: '#FFFFFF' }}>
                                Guardar
                              </Text>
                            </Pressable>
                            <Pressable accessibilityRole="button" accessibilityLabel="Cancelar a alteração"
                              onPress={pararDeEditar}
                              style={{ minHeight: 44, minWidth: 44, paddingHorizontal: S.md, borderRadius: R.row,
                                borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.text2 }}>
                                Cancelar
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : (
                        <Text style={{ fontFamily: FONT.body, fontSize: 13, color: t.text2, lineHeight: 18 }}>
                          {note.text}
                        </Text>
                      )}
                    </View>
                  );
                })}

                {/* ── O campo, sempre presente ────────────────────────────────
                    ⚠ Estava atrás de um «Adicionar nota» que o revelava. Uma
                    nota escreve-se na sala de espera e corrige-se depois — dois
                    toques para começar a escrever é um a mais. É também o que o
                    protótipo faz: campo e `+` numa linha, sempre à vista. */}
                <View style={{ flexDirection: 'row', gap: S.sm, alignItems: 'flex-start' }}>
                  <TextInput
                    value={rascunhoDe(record.id)}
                    onChangeText={(v) => { setNewNoteForm(f => ({ ...f, [record.id]: v })); setErroDaNota(null); }}
                    accessibilityLabel="Acrescentar uma nota"
                    placeholder="Acrescentar uma nota…"
                    placeholderTextColor={t.text3}
                    multiline
                    style={{ flex: 1, minHeight: 44, paddingHorizontal: S.md, paddingVertical: S.md,
                      fontFamily: FONT.body, fontSize: 13, color: t.text2,
                      borderRadius: R.row, borderWidth: 1, borderColor: t.border,
                      backgroundColor: t.card, textAlignVertical: 'top' }}
                  />
                  <Pressable accessibilityRole="button" accessibilityLabel="Guardar nota"
                    onPress={() => handleAddNote(record.id)}
                    disabled={!rascunhoDe(record.id).trim()}
                    style={{ minHeight: 44, minWidth: 44, borderRadius: R.row,
                      backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center',
                      opacity: !rascunhoDe(record.id).trim() ? 0.5 : 1 }}>
                    <Icon name="plus" size={19} color="#FFFFFF" />
                  </Pressable>
                </View>

                {erroDaNota ? (
                  <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.state.errDeep }}>
                    {erroDaNota}
                  </Text>
                ) : null}
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

              {/* ── Os anexos desta consulta ──────────────────────────────
                  No protótipo isto vive numa folha «Gerir consulta» que abre
                  da consulta. Aqui vive DENTRO do cartão expandido, onde as
                  notas já estavam.

                  ⚠ É uma divergência de estrutura, não de conteúdo, e é
                  deliberada: uma folha por consulta obrigava a um segundo alvo
                  na linha, e a linha já é o alvo que abre o cartão (erro #6 do
                  CLAUDE.md, «uma linha, um destino»). O conteúdo é o do
                  protótipo — anexos, anexar, arquivar. */}
              <View style={{ gap: S.sm, paddingTop: S.md, borderTopWidth: 1, borderTopColor: t.divider }}>
                <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.slate }}>
                  Anexos desta consulta ({anexos.length})
                </Text>
                {anexos.length === 0 ? (
                  <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
                    Sem anexos. Junte o exame, a receita ou o relatório.
                  </Text>
                ) : anexos.map(d => (
                  <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md,
                    paddingHorizontal: S.md, paddingVertical: S.sm,
                    backgroundColor: t.subtle, borderRadius: R.row }}>
                    <Icon name={d.kind === 'Receita' ? 'fileText' : 'fileDone'} size={18} color={t.text3} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: FONT.body, fontSize: 14, color: t.text2 }}>{d.title}</Text>
                      <Text style={{ fontFamily: FONT.ui, fontSize: 11, color: t.text3 }}>
                        {d.kind}{d.expires ? ` · válida até ${dayLabel(d.expires).replace('Hoje · ', '')}` : ''}
                      </Text>
                    </View>
                    {/* ⚠ A app diz onde a fotografia está, e não finge. O anexo
                        não pode ir pela fila de escritas, portanto o
                        carregamento é direto e pode falhar — e falha quando não
                        há rede ou quando a consulta ainda não chegou ao
                        servidor, porque um anexo é uma relação para ela.
                        Sem esta pastilha, uma fotografia que ficou só no
                        telemóvel parecia estar guardada em casa. */}
                    {d.foto && d.porSubir ? (
                      <Pill label="só aqui" bg={STATE.warnBg} fg={STATE.warn} border={STATE.warn} />
                    ) : null}
                  </View>
                ))}

                <AddButton t={t} label="Anexar Exame ou Receita"
                  onPress={() => { setAnexoDe(record.id); setAnexoForm({ kind: 'Exame', title: '', expires: '', foto: null }); }} />

                {/* ── Arquivar ──────────────────────────────────────────
                    Arquivar NÃO apaga, e a frase do protótipo diz-o. É por
                    isso que é um sinalizador e não uma remoção: o `healthGone`
                    é que apaga, e é outra coisa. */}
                <Pressable accessibilityRole="button"
                  accessibilityLabel={`${arquivada ? 'Desarquivar' : 'Arquivar'} a consulta de ${record.specialty}`}
                  onPress={() => arquivarConsulta(record.id, !arquivada)}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center',
                    justifyContent: 'center', gap: S.md, minHeight: 44, borderRadius: R.row,
                    borderWidth: 1, borderColor: t.border,
                    backgroundColor: pressed ? t.subtle : 'transparent' })}>
                  <Icon name="fileDone" size={18} color={t.text3} />
                  <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.text2 }}>
                    {arquivada ? 'Desarquivar Consulta' : 'Arquivar Consulta'}
                  </Text>
                </Pressable>
                <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 17, color: t.text3 }}>
                  Arquivar não apaga nada — os anexos ficam ligados e a consulta volta com um toque.
                </Text>
              </View>
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

  // ── Duas folhas IRMÃS, nunca uma dentro da outra ───────────────────────────
  //
  // ⚠ A `Sheet` é um `Modal`. Encaixar outro por cima põe o rodapé em risco, e
  // o INVARIANTE #1 já quebrou três vezes neste projeto. Por isso «Gerir» TROCA
  // a folha em vez de empilhar — é também o que o protótipo faz, onde `sheet` é
  // um valor só. Fechar as especialidades volta a marcar, com o rascunho como
  // ficou, porque ele vive uma camada acima das duas.
  const folha = sheet === 'consulta'
    ? <MarcarConsulta t={t} user={user} form={consulta} setForm={setConsulta}
        marcaveis={marcaveis}
        onGerirEspecialidades={() => setSheet('especialidades')}
        onClose={() => setSheet(null)} />
    : sheet === 'especialidades'
    ? <GerirEspecialidades t={t} form={consulta} setForm={setConsulta}
        onClose={() => setSheet('consulta')} />
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
        <AddButton t={t} label="marcar consulta" onPress={() => abrirMarcacao(null)} />

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

            {filtered.filter(h => !needsDecision.includes(h)).length > 0 && (
              <View>
                <SectionTitle t={t}>Arquivo clínico</SectionTitle>
                <View style={{ gap: S.md }}>
                  {filtered.filter(h => !needsDecision.includes(h)).map(record => (
                    <RecordCard key={record.id} record={record} />
                  ))}
                </View>
              </View>
            )}

            {/* ── As arquivadas ────────────────────────────────────────────
                Uma terceira secção, e não um esconderijo: arquivar não apaga,
                portanto a consulta tem de continuar a chegar-se. Sem esta
                secção, arquivar era o mesmo que perder — e a frase do
                protótipo promete que «volta com um toque». */}
            {arquivadas.length > 0 && (
              <View>
                <SectionTitle t={t}>Arquivadas ({arquivadas.length})</SectionTitle>
                <View style={{ gap: S.md }}>
                  {arquivadas.map(record => (
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

      {/* ── A folha «Anexar» ────────────────────────────────────────────────
          Tipo, nome, e a validade só se for receita. É o que o protótipo
          mostra, menos uma coisa: a FOTOGRAFIA do documento.

          ⚠ A fotografia não está aqui e não é esquecimento. Um ficheiro
          clínico de menor entra em `anexos`, e é dessa peça que os cinco
          pontos do db/postgres/README.md mais falam. Sem ficheiro, um
          documento é um título e um tipo — e isso já dá conteúdo ao arquivo
          clínico, que até hoje só podia mostrar as sementes. */}
      {anexoDe && (
        <Sheet t={t} title="Anexar" sub="Exame, receita ou relatório"
          onClose={() => setAnexoDe(null)}
          action={
            <Primary t={t} label="Anexar" disabled={!anexoForm.title.trim()}
              onPress={() => {
                const consulta = st.allHealth().find(h => h.id === anexoDe);
                if (!consulta) return setAnexoDe(null);
                addHealthDoc(anexoDe, consulta.member, {
                  kind: anexoForm.kind,
                  title: anexoForm.title,
                  expires: anexoForm.expires || null,
                  foto: anexoForm.foto || null,
                });
                setAnexoDe(null);
              }} />
          }>
          <View style={{ gap: S.lg }}>
            <View style={{ gap: S.sm }}>
              <Label t={t}>Tipo</Label>
              <View style={{ flexDirection: 'row', gap: S.sm }}>
                {[['Exame', 'fileDone'], ['Receita', 'fileText'], ['Relatório', 'fileAdd']].map(([k, icone]) => {
                  const escolhido = anexoForm.kind === k;
                  return (
                    <Pressable key={k} accessibilityRole="button" accessibilityLabel={k}
                      accessibilityState={{ selected: escolhido }}
                      onPress={() => setAnexoForm(f => ({ ...f, kind: k,
                        // Só as receitas têm prazo. Trocar de tipo tem de
                        // limpar a validade, senão um exame ficava com data e
                        // aparecia no «Precisa de Si» como receita a expirar.
                        expires: k === 'Receita' ? f.expires : '' }))}
                      style={({ pressed }) => ({
                        flex: 1, minHeight: 44, borderRadius: R.row, borderWidth: 1,
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S.sm,
                        borderColor: escolhido ? t.accent : t.border,
                        backgroundColor: escolhido ? t.subtle : pressed ? t.subtle : 'transparent',
                      })}>
                      <Icon name={icone} size={18} color={escolhido ? t.accent : t.text3} />
                      <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600',
                        color: escolhido ? t.accent : t.text3 }}>{k}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={{ gap: S.sm }}>
              <Label t={t}>Nome</Label>
              <TextInput
                value={anexoForm.title}
                onChangeText={(v) => setAnexoForm(f => ({ ...f, title: v }))}
                placeholder="Análises de sangue, receita do ferro…"
                placeholderTextColor={t.text3}
                accessibilityLabel="Nome do documento"
                style={{ minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body,
                  fontSize: 15, color: t.text2, borderRadius: R.row, borderWidth: 1,
                  borderColor: t.border, backgroundColor: t.card }}
              />
            </View>

            {/* A validade só aparece para receitas — é ela que põe a linha no
                «Precisa de Si» do Início, 30 dias antes. */}
            {anexoForm.kind === 'Receita' && (
              <View style={{ gap: S.sm }}>
                <Label t={t}>Validade da receita</Label>
                <CampoData t={t} valor={anexoForm.expires || null}
                  onChange={(k) => setAnexoForm(f => ({ ...f, expires: k || '' }))} />
              </View>
            )}

            {/* ── A fotografia do documento ─────────────────────────────
                O mesmo caminho que a fatura de um equipamento usa — o
                `expo-image-picker`, que já é dependência — para não haver dois
                modos de escolher uma imagem nesta app.

                ⚠ A fotografia fica no dispositivo primeiro e SÓ DEPOIS tenta
                subir. Um anexo não pode ir pela fila de escritas (ela
                serializa em JSON e um ficheiro não é JSON), portanto o
                carregamento é direto e pode falhar. Guardar antes de tentar é
                o que impede a fotografia de se perder por não haver rede.

                E sobe pelas mesmas condições do resto da saúde: só para um
                servidor que viva na casa. Quem decide é o `recusaSaude`. */}
            <View style={{ gap: S.sm }}>
              <Label t={t}>Fotografia do documento</Label>
              {anexoForm.foto ? (
                <View style={{ gap: S.sm }}>
                  <Image source={{ uri: anexoForm.foto }}
                    style={{ width: '100%', height: 160, borderRadius: R.row,
                      borderWidth: 1, borderColor: t.border }}
                    resizeMode="cover" />
                  <Pressable accessibilityRole="button" accessibilityLabel="Tirar a fotografia"
                    onPress={() => setAnexoForm(f => ({ ...f, foto: null }))}
                    style={({ pressed }) => ({ minHeight: 44, borderRadius: R.row,
                      borderWidth: 1, borderColor: t.border, alignItems: 'center',
                      justifyContent: 'center', backgroundColor: pressed ? t.subtle : 'transparent' })}>
                    <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.text2 }}>
                      Tirar a fotografia
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable accessibilityRole="button" accessibilityLabel="Fotografar o documento"
                  onPress={escolherFotoDoAnexo}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center',
                    justifyContent: 'center', gap: S.md, minHeight: 44, borderRadius: R.row,
                    borderWidth: 1, borderStyle: 'dashed', borderColor: t.border,
                    backgroundColor: pressed ? t.subtle : 'transparent' })}>
                  <Icon name="camera" size={19} color={t.text3} />
                  <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.text2 }}>
                    Fotografe o exame ou a receita
                  </Text>
                </Pressable>
              )}
            </View>

            <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 17, color: t.text3 }}>
              O documento fica ligado a esta consulta. A fotografia guarda-se no
              dispositivo e sobe para o servidor da casa — nunca para fora dela.
            </Text>
          </View>
        </Sheet>
      )}
    </>
  );
}

// `membro` é quem estava aberto quando se tocou em «marcar consulta». Vinha
// por um setForm num estado que esta folha não lê — tem o seu próprio form —
// portanto abrir a partir da ficha da Mia propunha o Léo, que é o valor por
// omissão. Agora vem por prop.
// O rascunho (`form`/`setForm`) e a lista de quem se pode marcar vêm de cima:
// esta folha sai do ecrã quando se vai gerir as especialidades, e o que estiver
// escrito tem de sobreviver à ida.
function MarcarConsulta({ t, user, form, setForm, marcaveis, onGerirEspecialidades, onClose }) {
  const st = useStore();
  const { s, set, addHealthRecord, membros: MEMBERS, oNome } = st;

  // A lista da especialidade está aberta? Só isto vive dentro da folha: é
  // estado de interface e não faz falta nenhuma à volta das especialidades.
  const [escolhendoEsp, setEscolhendoEsp] = useState(false);

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
    <Sheet t={t} title="Marcar Consulta"
      sub={form.member ? `Para ${form.member}` : 'Uma consulta e o evento na agenda'}
      onClose={onClose}>
      <View style={{ gap: S.lg }}>
        {/* ⚠ Aqui havia uma faixa de abas — «Nova Consulta» e «Especialidades»
            — E o «Gerir», os dois a levar ao mesmo sítio. Duas portas para a
            mesma coisa é o defeito que os atalhos do Início tinham. O
            protótipo não tem abas nesta folha: tem UM «Gerir», que abre uma
            folha própria.

            ⚠ E o «Gerir» é AQUI, ao lado do título. Movi-o uma vez para junto
            do campo da especialidade, com a prosa do registo do protótipo por
            fundamento — «o Gerir ao lado do campo». A marcação diz outra
            coisa, e é ela o protótipo: linha 3821, na mesma fila que «A
            consulta». Quando as duas discordam, ganha o que está desenhado. */}
        <View style={{ gap: S.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
              <Text style={{ flex: 1, fontFamily: FONT.display, fontSize: 16,
                fontWeight: '600', color: t.titulo || t.slate }}>
                A consulta
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Gerir especialidades"
                onPress={onGerirEspecialidades}
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

            {/* ── Dia e hora, UM controlo ──────────────────────────────────
                Eram dois: um `CampoData` e um campo de texto com placeholder
                «hh:mm». A hora escrevia-se à mão, e nada impedia «25:99» de
                ser gravado — o `handleSaveConsultation` só exigia a data.
                Agora o calendário traz a hora por baixo, e a legenda diz a
                frase inteira: «Hoje, Quinta, 03/09 às 09:00». */}
            <View style={{ gap: S.sm }}>
              <Label t={t}>Dia e hora</Label>
              <CampoData t={t} valor={chaveDeDMY(form.date)}
                onChange={(k) => setForm(f => ({ ...f, date: dmyDeChave(k) }))}
                hora={form.time}
                onHora={(v) => setForm(f => ({ ...f, time: v }))} />
            </View>

            {/* ── A especialidade: uma linha que abre ──────────────────────
                Eram pastilhas em fila, com quebra de linha. Com quatro
                especialidades cabiam; com dez ocupavam meia folha e empurravam
                o botão de marcar para fora do ecrã. O protótipo tem UMA linha
                com o valor escolhido e um chevron, que abre a lista por baixo.

                ⚠ A linha tem 44 e não os 52 do protótipo, e a etiqueta vive
                FORA da caixa. É a forma dos dois campos que se seguem — médico
                e nota — nesta mesma folha. Lá a etiqueta é interna, e daí os
                52; copiar só este ficava a destoar dos vizinhos, que é pior do
                que divergir por inteiro. */}
            <View style={{ gap: S.sm }}>
              <Label t={t}>Especialidade</Label>
              {!(s.specialities || []).length ? (
                <Empty t={t} icon="heartPulse" title="Sem especialidades."
                  hint="Toque em Gerir para criar a primeira." />
              ) : (
                <View style={{ borderWidth: 1, borderColor: t.border,
                  borderRadius: R.row, backgroundColor: t.card, overflow: 'hidden' }}>
                  <Pressable accessibilityRole="button"
                    accessibilityLabel="Escolher a especialidade"
                    accessibilityState={{ expanded: escolhendoEsp }}
                    onPress={() => setEscolhendoEsp(v => !v)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: S.md,
                      minHeight: 44, paddingHorizontal: S.md }}>
                    <Icon name="heartPulse" size={19} color={t.text3} />
                    <Text numberOfLines={1} style={{ flex: 1, fontFamily: FONT.body, fontSize: 15,
                      color: form.specialty ? t.text2 : t.text3 }}>
                      {form.specialty || 'Escolher a especialidade'}
                    </Text>
                    <Icon name={escolhendoEsp ? 'caretUp' : 'caretDown'} size={18} color={t.text3} />
                  </Pressable>

                  {escolhendoEsp ? (
                    <View>
                      {(s.specialities || []).map(spec => (
                        // Uma linha, um destino (erro #6): tocar escolhe e
                        // fecha. Sem nada mais tocável lá dentro.
                        <Pressable accessibilityRole="button"
                          key={spec}
                          accessibilityLabel={spec}
                          accessibilityState={{ selected: form.specialty === spec }}
                          onPress={() => { setForm(f => ({ ...f, specialty: spec })); setEscolhendoEsp(false); }}
                          // ⚠ `divider` e não `subtle`. Medido no navegador:
                          // o `subtle` é #FAFAFA sobre uma caixa #FCFCFD —
                          // contraste 1,02, ou seja linha nenhuma. O
                          // `divider` é #F0F2F5, que é o cinza que o
                          // protótipo usa aqui, e no modo escuro iguala a
                          // borda. Escolhi a ficha uma casa acima da certa.
                          style={{ flexDirection: 'row', alignItems: 'center', gap: S.md,
                            minHeight: 44, paddingHorizontal: S.md,
                            borderTopWidth: 1, borderTopColor: t.divider,
                            backgroundColor: form.specialty === spec ? t.subtle : 'transparent' }}>
                          <Text numberOfLines={1} style={{ flex: 1, fontFamily: FONT.ui, fontSize: 13,
                            color: form.specialty === spec ? t.accent : t.text2 }}>
                            {spec}
                          </Text>
                          {form.specialty === spec ? (
                            <Icon name="check" size={16} color={t.accent} />
                          ) : null}
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              )}
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
        </View>
    </Sheet>
  );
}

// ── As especialidades, no único sítio onde se gerem ──────────────────────────
//
// Folha própria e IRMÃ da de marcar — nunca uma dentro da outra, porque a
// `Sheet` é um `Modal` e empilhá-los põe o rodapé em risco (INVARIANTE #1).
// Fechar volta a marcar consulta, com o rascunho como ficou.
//
// Um campo faz dois trabalhos: acrescentar e renomear. Tocar em «Renomear»
// numa linha traz o nome para o campo e o botão muda de frase.
function GerirEspecialidades({ t, form, setForm, onClose }) {
  const st = useStore();
  const { s, addSpecialty, removeSpecialty, renameSpecialty, consultasDaEspecialidade } = st;

  const [nome, setNome] = useState('');
  const [aRenomear, setARenomear] = useState(null);
  const [erro, setErro] = useState(null);

  const lista = s.specialities || [];

  const guardar = () => {
    const n = nome.trim();
    if (!n) return;
    if (aRenomear) {
      const e = renameSpecialty(aRenomear, n);
      if (e) return setErro(e);
      // O rascunho segue o nome novo, senão a consulta que se estava a marcar
      // ficava com uma especialidade que já não está na lista.
      setForm(f => (f.specialty === aRenomear ? { ...f, specialty: n } : f));
      setARenomear(null);
    } else {
      const e = addSpecialty(n);
      if (e) return setErro(e);
      // Criada, fica JÁ escolhida no rascunho — é o que o protótipo faz, e é a
      // razão por que se veio aqui: faltava esta ao marcar.
      setForm(f => ({ ...f, specialty: n }));
    }
    setNome('');
    setErro(null);
  };

  const apagar = (esp) => {
    const e = removeSpecialty(esp);
    if (e) return setErro(e);
    // Apagada a que estava escolhida, o rascunho fica sem especialidade — e o
    // botão de marcar desliga-se sozinho, que é o correto.
    setForm(f => (f.specialty === esp ? { ...f, specialty: '' } : f));
    if (aRenomear === esp) { setARenomear(null); setNome(''); }
    setErro(null);
  };

  return (
    <Sheet t={t} title="Especialidades" sub={`${lista.length} na lista`}
      onClose={onClose}>
      <View style={{ gap: S.lg }}>
        <View style={{ gap: S.sm }}>
          {!lista.length ? (
            <Empty t={t} icon="heartPulse" title="Sem especialidades."
              hint="São as que aparecem ao marcar uma consulta." />
          ) : null}
          {lista.map(esp => {
            const usadas = consultasDaEspecialidade(esp);
            const aEditar = aRenomear === esp;
            return (
              // ⚠ A linha NÃO é tocável, e no protótipo é: lá a linha inteira
              // renomeia e o apagar vive por dentro dela, num alvo de ~28 px.
              // São os dois defeitos já documentados — o INVARIANTE #5 (44) e o
              // erro #6 do CLAUDE.md (pílula tocável dentro de linha tocável).
              // As invariantes não cedem a medidas do protótipo: aqui há duas
              // ações, com 44 cada uma, e nenhuma linha a competir com elas.
              <View key={esp} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md,
                paddingHorizontal: S.md, paddingVertical: S.sm, minHeight: 56,
                borderRadius: R.row, borderWidth: 1,
                borderColor: aEditar ? t.accent : t.border }}>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text numberOfLines={1} style={{ fontFamily: FONT.body, fontSize: 14, color: t.text2 }}>
                    {esp}
                  </Text>
                  {/* A conta que decide se ela se pode apagar, dita antes de
                      alguém tentar. Sem isto o «Em uso» aparecia sem razão. */}
                  <Text style={{ fontFamily: FONT.ui, fontSize: 11, color: t.text3 }}>
                    {usadas ? plural(usadas, 'consulta', 'consultas') : 'sem consultas'}
                  </Text>
                </View>
                <Tap label={aEditar ? `A renomear ${esp}` : `Renomear ${esp}`}
                  onPress={() => { setARenomear(esp); setNome(esp); setErro(null); }}>
                  <Icon name="edit" size={18} color={aEditar ? t.accent : t.text3} />
                </Tap>
                {usadas ? (
                  // Em uso: diz-se, e não se oferece. Um alvo que não faz nada
                  // é pior do que nenhum — daí ser texto e não um `Tap`.
                  <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600',
                    color: t.text3, paddingHorizontal: S.sm }}>
                    Em uso
                  </Text>
                ) : (
                  <Tap label={`Apagar ${esp}`} onPress={() => apagar(esp)}>
                    <Icon name="trash" size={18} color={STATE.err} />
                  </Tap>
                )}
              </View>
            );
          })}
        </View>

        <View style={{ height: 1, backgroundColor: t.border }} />

        <View style={{ gap: S.sm }}>
          <Label t={t}>{aRenomear ? `Renomear «${aRenomear}»` : 'Nova especialidade'}</Label>
          <View style={{ flexDirection: 'row', gap: S.sm }}>
            <TextInput
              value={nome}
              onChangeText={(v) => { setNome(v); setErro(null); }}
              placeholder="Ex.: Fisioterapia"
              placeholderTextColor={t.text3}
              style={{
                flex: 1, minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body,
                fontSize: 14, color: t.text2, borderRadius: R.row, borderWidth: 1,
                borderColor: erro ? t.state.err : t.border, backgroundColor: t.card,
              }}
            />
            {aRenomear ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Cancelar edição"
                onPress={() => { setARenomear(null); setNome(''); setErro(null); }}
                style={{ paddingHorizontal: S.md, minWidth: 44, minHeight: 44, borderRadius: R.row,
                  borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={20} color={t.text3} />
              </Pressable>
            ) : null}
          </View>
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, lineHeight: 18, color: t.text3 }}>
            Uma especialidade só se apaga quando não tem consultas. Renomear
            acompanha as consultas e o título do evento na agenda.
          </Text>
          {erro ? (
            <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.state.errDeep }}>
              {erro}
            </Text>
          ) : null}
        </View>

        <Primary t={t} label={aRenomear ? 'Guardar Nome' : 'Criar Especialidade'}
          onPress={guardar} disabled={!nome.trim()} />
      </View>
    </Sheet>
  );
}
