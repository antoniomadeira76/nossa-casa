import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Modal } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT, MEMBER_COLOR } from '../theme';
import { EUR } from '../format';
import { Card, SectionTitle, Label, Primary, AddButton, Row, Tap, Avatar, Tile } from '../ui';
import Icon from '../Icon';
import Sheet from '../Sheet';
import { MEMBERS, ENV_BASE } from '../data';

export default function Gestao({ t, user, onClose }) {
  const { s, set, isAdmin, budget, spent, envelopes, pinError, setPin, canChangeRole, setRole } = useStore();
  const [tab, setTab] = useState('orcamento');
  const [sheetOpen, setSheetOpen] = useState(null);
  const [modal, setModal] = useState(null);
  const [input, setInput] = useState('');
  const [limitInput, setLimitInput] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedEnvelope, setSelectedEnvelope] = useState(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);

  // Validar com pinError, que só lê. setPin grava — chamá-lo aqui comprometia
  // o PIN a meio da escrita, antes de se tocar em Guardar.
  const pinMsg = input ? pinError(selectedMember, input) : null;

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

  const renderBudgetTab = () => (
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
          <View>
            <Label t={t}>Disponível</Label>
            <Text style={{ fontFamily: FONT.display, fontSize: 20, color: budget - spent >= 0 ? t.state.ok : t.state.err, marginTop: S.sm }}>
              {EUR(budget - spent)}
            </Text>
          </View>
        </View>
      </Card>

      <View style={{ gap: S.md }}>
        <Primary t={t} label="Abrir Mês" icon="calendar" onPress={() => setModal('openMonth')} />
        <Primary t={t} label="Fechar Mês" icon="checkSquare" onPress={() => setModal('closeMonth')} />
      </View>

      {envelopes && envelopes.length > 0 && (
        <View style={{ gap: S.md }}>
          <SectionTitle t={t}>Envelopes</SectionTitle>
          {envelopes.map((env, i) => {
            const pct = env.limit > 0 ? Math.round((env.used / env.limit) * 100) : 0;
            const over = env.used > env.limit;
            return (
              <Card key={env.name} t={t}>
                <View style={{ gap: S.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>{env.name}</Text>
                    <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: over ? t.state.err : t.text3 }}>
                      {pct}%
                    </Text>
                  </View>
                  <View style={{ height: 6, borderRadius: R.pill, backgroundColor: t.page, overflow: 'hidden' }}>
                    <View style={{
                      width: `${Math.min(100, pct)}%`,
                      height: '100%',
                      borderRadius: R.pill,
                      backgroundColor: over ? t.state.err : t.accent,
                    }} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
                      {EUR(env.used)} de {EUR(env.limit)}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderShopsTab = () => (
    <View style={{ gap: S.md }}>
      <SectionTitle t={t}>Lojas</SectionTitle>
      {s.stores && s.stores.map((shop, i) => (
        <Card key={i} t={t} pad={false}>
          <Row t={t} icon="storefront" title={shop} last
            onPress={() => {
              setSelectedEnvelope(i);
              setInput(shop);
              setSheetOpen('editShop');
            }}
            right={<Icon name="caretRight" size={18} color={t.text3} />}
          />
        </Card>
      ))}
      <AddButton t={t} label="adicionar loja" onPress={() => {
        setInput('');
        setSheetOpen('newShop');
      }} />
    </View>
  );

  const renderMembersTab = () => (
    <View style={{ gap: S.md }}>
      <SectionTitle t={t}>Membros da casa</SectionTitle>
      {Object.entries(MEMBERS).map(([name, info]) => {
        const role = s.roles[name] || 'crianca';
        const hasPin = s.pins[name];
        return (
          <Card key={name} t={t} pad={false}>
            <View style={{ gap: S.md }}>
              <Row t={t} icon="user" title={name} sub={info.email || ''} last
                onPress={() => {}}
                right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                  <Avatar initial={info.initial} color={MEMBER_COLOR[name]} size={32} />
                  <Icon name="caretRight" size={18} color={t.text3} />
                </View>}
              />
              <View style={{ paddingHorizontal: 16, gap: S.sm }}>
                <Tap label={`Alterar PIN de ${name}`} onPress={() => {
                  setSelectedMember(name);
                  setInput('');
                  setSheetOpen('editPin');
                }} style={{ paddingVertical: S.md, borderTopWidth: 1, borderTopColor: t.divider }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                      <Icon name="lock" size={18} color={t.text3} />
                      <View style={{ gap: 2 }}>
                        <Text style={{ fontFamily: FONT.body, fontSize: 14, color: t.text2 }}>PIN</Text>
                        <Text style={{ fontFamily: FONT.ui, fontSize: 11, color: t.text3 }}>
                          {hasPin ? 'Alterado' : 'Sem PIN'}
                        </Text>
                      </View>
                    </View>
                    <Icon name="caretRight" size={16} color={t.text3} />
                  </View>
                </Tap>

                {role !== 'crianca' && (
                  <Tap label={`Alterar papel de ${name}`} onPress={() => {
                    setSelectedMember(name);
                    setModal('changeRole');
                  }} style={{ paddingVertical: S.md, borderTopWidth: 1, borderTopColor: t.divider }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                        <Icon name="idcard" size={18} color={t.text3} />
                        <View style={{ gap: 2 }}>
                          <Text style={{ fontFamily: FONT.body, fontSize: 14, color: t.text2 }}>Papel</Text>
                          <Text style={{ fontFamily: FONT.ui, fontSize: 11, color: t.text3 }}>
                            {role === 'admin' ? 'Administrador' : 'Adulto'}
                          </Text>
                        </View>
                      </View>
                      <Icon name="caretRight" size={16} color={t.text3} />
                    </View>
                  </Tap>
                )}
              </View>
            </View>
          </Card>
        );
      })}
    </View>
  );

  const renderEnvelopesTab = () => (
    <View style={{ gap: S.md }}>
      <SectionTitle t={t}>Envelopes orçamentais</SectionTitle>
      {envelopes && envelopes.map((env) => (
        <Card key={env.name} t={t} pad={false}>
          <Tap label={`Editar ${env.name}`} onPress={() => {
            setSelectedEnvelope(env.name);
            setInput(env.name);
            setLimitInput(String(env.limit));
            setSheetOpen('editEnvelope');
          }} style={{ padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
              <View style={{ gap: 2 }}>
                <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>{env.name}</Text>
                <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
                  Limite: {EUR(env.limit)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.text2 }}>
                  {EUR(env.used)}
                </Text>
                <Text style={{ fontFamily: FONT.ui, fontSize: 11, color: t.text3 }}>
                  {EUR(env.limit - env.used)} livre
                </Text>
              </View>
              <Icon name="caretRight" size={18} color={t.text3} style={{ marginLeft: S.md }} />
            </View>
          </Tap>
        </Card>
      ))}

      <AddButton t={t} label="Criar novo envelope" onPress={() => {
        setInput('');
        setSheetOpen('newEnvelope');
      }} />

      {envelopes && envelopes.length > 1 && (
        <Pressable onPress={() => setSheetOpen('transferEnvelopes')}
          style={({ pressed }) => ({
            minHeight: 48, borderRadius: R.row, borderWidth: 1, borderColor: t.border,
            alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}>
          <Text style={{ fontFamily: FONT.display, fontSize: 14, color: t.text2 }}>Transferir entre envelopes</Text>
        </Pressable>
      )}
    </View>
  );

  const renderSpecialtiesTab = () => (
    <View style={{ gap: S.md }}>
      <SectionTitle t={t}>Especialidades médicas</SectionTitle>
      {s.specialities && s.specialities.map((spec) => (
        <Card key={spec} t={t} pad={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, padding: 14 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>{spec}</Text>
            </View>
            <Tap label={`Editar ${spec}`} onPress={() => {
              setSelectedSpecialty(spec);
              setInput(spec);
              setSheetOpen('editSpecialty');
            }} size={40}>
              <Icon name="edit" size={18} color={t.text3} />
            </Tap>
            <Tap label={`Apagar ${spec}`} onPress={() => {
              setSelectedSpecialty(spec);
              setModal('deleteSpecialty');
            }} size={40}>
              <Icon name="trash" size={18} color={t.state.err} />
            </Tap>
          </View>
        </Card>
      ))}

      <AddButton t={t} label="Criar especialidade" onPress={() => {
        setInput('');
        setSheetOpen('newSpecialty');
      }} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.page }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: S.xl }}>
        <View style={{ flexDirection: 'row', gap: S.md, borderBottomWidth: 1, borderBottomColor: t.border, paddingBottom: S.md }}>
          {[
            { key: 'orcamento', label: 'Orçamento' },
            { key: 'membros', label: 'Membros' },
            { key: 'envelopes', label: 'Envelopes' },
            { key: 'lojas', label: 'Lojas' },
            { key: 'especialidades', label: 'Especialidades' },
          ].map(({ key, label }) => (
            <Pressable key={key} onPress={() => setTab(key)}
              style={{ paddingBottom: S.sm, borderBottomWidth: tab === key ? 2 : 0, borderBottomColor: tab === key ? t.accent : 'transparent' }}>
              <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: tab === key ? t.accent : t.text3 }}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'orcamento' && renderBudgetTab()}
        {tab === 'membros' && renderMembersTab()}
        {tab === 'envelopes' && renderEnvelopesTab()}
        {tab === 'lojas' && renderShopsTab()}
        {tab === 'especialidades' && renderSpecialtiesTab()}

        <Pressable onPress={onClose} style={{ paddingVertical: S.lg }}>
          <Text style={{ fontFamily: FONT.display, fontSize: 14, color: t.accent, textAlign: 'center' }}>
            Fechar
          </Text>
        </Pressable>
      </ScrollView>

      {sheetOpen === 'editPin' && (
        <Sheet t={t} title="Alterar PIN" sub={`PIN de ${selectedMember}`}
          onClose={() => {
            setSheetOpen(null);
            setSelectedMember(null);
            setInput('');
          }}
          action={
            <Primary t={t} label="Guardar" disabled={!input || !!pinMsg}
              onPress={() => {
                if (setPin(selectedMember, input)) return;
                setSheetOpen(null);
                setSelectedMember(null);
                setInput('');
              }} />
          }>
          <View style={{ gap: S.md }}>
            <View>
              <Label t={t}>PIN de 4 dígitos</Label>
              <TextInput
                placeholder="0000"
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                value={input}
                onChangeText={setInput}
                style={{
                  marginTop: S.sm,
                  paddingHorizontal: S.md,
                  paddingVertical: S.md,
                  borderRadius: R.row,
                  borderWidth: 1,
                  borderColor: t.border,
                  fontFamily: FONT.body,
                  fontSize: 16,
                  color: t.text1,
                }}
              />
            </View>
            {pinMsg ? <Tile t={t} kind="warn">{pinMsg}</Tile> : null}
          </View>
        </Sheet>
      )}

      {sheetOpen === 'editEnvelope' && (
        <Sheet t={t} title="Editar envelope" sub={selectedEnvelope}
          onClose={() => {
            setSheetOpen(null);
            setSelectedEnvelope(null);
            setInput('');
            setLimitInput('');
          }}
          action={
            <Primary t={t} label="Guardar" onPress={() => {
              if (input.trim() && limitInput.trim()) {
                const newLimit = parseFloat(limitInput.replace(',', '.'));
                if (isNaN(newLimit) || newLimit <= 0) return;

                set(s => {
                  const oldName = selectedEnvelope;
                  const newName = input.trim();
                  const newLimits = { ...s.monthLimits };
                  if (newLimits[oldName] !== undefined) {
                    newLimits[newName] = newLimit;
                    delete newLimits[oldName];
                  }
                  const newMoves = { ...s.envMove };
                  if (newMoves[oldName] !== undefined) {
                    newMoves[newName] = newMoves[oldName];
                    delete newMoves[oldName];
                  }
                  return { monthLimits: newLimits, envMove: newMoves };
                });
                setSheetOpen(null);
                setSelectedEnvelope(null);
                setInput('');
                setLimitInput('');
              }
            }} />
          }>
          <View style={{ gap: S.md }}>
            <View>
              <Label t={t}>Nome do envelope</Label>
              <TextInput
                placeholder="Nome"
                value={input}
                onChangeText={setInput}
                style={{
                  marginTop: S.sm,
                  paddingHorizontal: S.md,
                  paddingVertical: S.md,
                  borderRadius: R.row,
                  borderWidth: 1,
                  borderColor: t.border,
                  fontFamily: FONT.body,
                  fontSize: 15,
                  color: t.text1,
                }}
              />
            </View>
            <View>
              <Label t={t}>Limite mensal (€)</Label>
              <TextInput
                placeholder="0,00"
                keyboardType="decimal-pad"
                value={limitInput}
                onChangeText={setLimitInput}
                style={{
                  marginTop: S.sm,
                  paddingHorizontal: S.md,
                  paddingVertical: S.md,
                  borderRadius: R.row,
                  borderWidth: 1,
                  borderColor: t.border,
                  fontFamily: FONT.body,
                  fontSize: 15,
                  color: t.text1,
                }}
              />
            </View>
          </View>
        </Sheet>
      )}

      {sheetOpen === 'newEnvelope' && (
        <Sheet t={t} title="Criar envelope"
          onClose={() => {
            setSheetOpen(null);
            setInput('');
          }}
          action={
            <Primary t={t} label="Criar" onPress={() => {
              if (input.trim()) {
                set(s => ({
                  monthLimits: { ...(s.monthLimits || {}), [input.trim()]: 500 },
                }));
                setSheetOpen(null);
                setInput('');
              }
            }} />
          }>
          <View style={{ gap: S.md }}>
            <View>
              <Label t={t}>Nome do envelope</Label>
              <TextInput
                placeholder="Ex: Entretenimento"
                value={input}
                onChangeText={setInput}
                style={{
                  marginTop: S.sm,
                  paddingHorizontal: S.md,
                  paddingVertical: S.md,
                  borderRadius: R.row,
                  borderWidth: 1,
                  borderColor: t.border,
                  fontFamily: FONT.body,
                  fontSize: 16,
                  color: t.text1,
                }}
              />
            </View>
          </View>
        </Sheet>
      )}

      {sheetOpen === 'newSpecialty' && (
        <Sheet t={t} title="Criar especialidade"
          onClose={() => {
            setSheetOpen(null);
            setInput('');
          }}
          action={
            <Primary t={t} label="Criar" onPress={() => {
              if (input.trim()) {
                set(s => ({
                  specialities: [...(s.specialities || []), input.trim()],
                }));
                setSheetOpen(null);
                setInput('');
              }
            }} />
          }>
          <View style={{ gap: S.md }}>
            <View>
              <Label t={t}>Nome da especialidade</Label>
              <TextInput
                placeholder="Ex: Cardiologia"
                value={input}
                onChangeText={setInput}
                style={{
                  marginTop: S.sm,
                  paddingHorizontal: S.md,
                  paddingVertical: S.md,
                  borderRadius: R.row,
                  borderWidth: 1,
                  borderColor: t.border,
                  fontFamily: FONT.body,
                  fontSize: 16,
                  color: t.text1,
                }}
              />
            </View>
          </View>
        </Sheet>
      )}

      {sheetOpen === 'editSpecialty' && (
        <Sheet t={t} title="Editar especialidade" sub={selectedSpecialty}
          onClose={() => {
            setSheetOpen(null);
            setSelectedSpecialty(null);
            setInput('');
          }}
          action={
            <Primary t={t} label="Guardar" onPress={() => {
              if (input.trim()) {
                set(s => ({
                  specialities: (s.specialities || []).map(x => x === selectedSpecialty ? input.trim() : x),
                }));
                setSheetOpen(null);
                setSelectedSpecialty(null);
                setInput('');
              }
            }} />
          }>
          <View style={{ gap: S.md }}>
            <View>
              <Label t={t}>Nome da especialidade</Label>
              <TextInput
                placeholder="Ex: Cardiologia"
                value={input}
                onChangeText={setInput}
                style={{
                  marginTop: S.sm,
                  paddingHorizontal: S.md,
                  paddingVertical: S.md,
                  borderRadius: R.row,
                  borderWidth: 1,
                  borderColor: t.border,
                  fontFamily: FONT.body,
                  fontSize: 16,
                  color: t.text1,
                }}
              />
            </View>
          </View>
        </Sheet>
      )}

      {modal === 'changeRole' && (
        <Modal transparent animationType="fade" onRequestClose={() => setModal(null)}>
          <Pressable onPress={() => setModal(null)}
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <Pressable style={{ backgroundColor: t.surface, borderRadius: R.card, padding: S.lg, gap: S.lg }}>
              <Text style={{ fontFamily: FONT.display, fontSize: 18, color: t.text1, textAlign: 'center' }}>
                Alterar papel
              </Text>
              <Text style={{ fontFamily: FONT.body, fontSize: 14, color: t.text2, textAlign: 'center' }}>
                {selectedMember}
              </Text>

              <View style={{ gap: S.md }}>
                {['adulto', 'admin'].map(role => {
                  const label = role === 'admin' ? 'Administrador' : 'Adulto';
                  const current = s.roles[selectedMember] === role;
                  return (
                    <Pressable key={role} onPress={() => {
                      if (canChangeRole(s.roles[selectedMember], role)) {
                        setRole(selectedMember, role);
                      }
                      setModal(null);
                    }}
                      style={({ pressed }) => ({
                        padding: S.md,
                        borderRadius: R.row,
                        borderWidth: 2,
                        borderColor: current ? t.accent : t.border,
                        backgroundColor: current ? t.chrome : 'transparent',
                        opacity: pressed ? 0.8 : 1,
                      })}>
                      <Text style={{ fontFamily: FONT.body, fontSize: 15, color: current ? '#FFFFFF' : t.text2, textAlign: 'center' }}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable onPress={() => setModal(null)}
                style={({ pressed }) => ({
                  padding: S.md,
                  opacity: pressed ? 0.7 : 1,
                })}>
                <Text style={{ fontFamily: FONT.display, fontSize: 14, color: t.accent, textAlign: 'center' }}>
                  Fechar
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {modal === 'deleteSpecialty' && (
        <Modal transparent animationType="fade" onRequestClose={() => setModal(null)}>
          <Pressable onPress={() => setModal(null)}
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <Pressable style={{ backgroundColor: t.surface, borderRadius: R.card, padding: S.lg, gap: S.lg }}>
              <Text style={{ fontFamily: FONT.display, fontSize: 18, color: t.text1, textAlign: 'center' }}>
                Apagar especialidade?
              </Text>
              <Text style={{ fontFamily: FONT.body, fontSize: 14, color: t.text2, textAlign: 'center' }}>
                {selectedSpecialty}
              </Text>

              <View style={{ flexDirection: 'row', gap: S.md }}>
                <Pressable onPress={() => setModal(null)} style={{ flex: 1 }}>
                  <View style={{ padding: S.md, borderRadius: R.row, borderWidth: 1, borderColor: t.border }}>
                    <Text style={{ fontFamily: FONT.display, fontSize: 14, color: t.text2, textAlign: 'center' }}>
                      Cancelar
                    </Text>
                  </View>
                </Pressable>
                <Pressable onPress={() => {
                  set(s => ({
                    specialities: (s.specialities || []).filter(x => x !== selectedSpecialty),
                  }));
                  setModal(null);
                  setSelectedSpecialty(null);
                }} style={{ flex: 1 }}>
                  <View style={{ padding: S.md, borderRadius: R.row, backgroundColor: t.state.err }}>
                    <Text style={{ fontFamily: FONT.display, fontSize: 14, color: '#FFFFFF', textAlign: 'center' }}>
                      Apagar
                    </Text>
                  </View>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {modal === 'openMonth' && (
        <Modal transparent animationType="fade" onRequestClose={() => setModal(null)}>
          <Pressable onPress={() => setModal(null)}
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <Pressable style={{ backgroundColor: t.surface, borderRadius: R.card, padding: S.lg, gap: S.lg, maxWidth: 320 }}>
              <Text style={{ fontFamily: FONT.display, fontSize: 18, color: t.text1, textAlign: 'center' }}>
                Abrir novo mês?
              </Text>
              <Text style={{ fontFamily: FONT.body, fontSize: 14, color: t.text2, textAlign: 'center' }}>
                Distribuir rendimento pelos envelopes e resetar gastos.
              </Text>

              <View style={{ flexDirection: 'row', gap: S.md }}>
                <Pressable onPress={() => setModal(null)} style={{ flex: 1 }}>
                  <View style={{ padding: S.md, borderRadius: R.row, borderWidth: 1, borderColor: t.border }}>
                    <Text style={{ fontFamily: FONT.display, fontSize: 14, color: t.text2, textAlign: 'center' }}>
                      Cancelar
                    </Text>
                  </View>
                </Pressable>
                <Pressable onPress={() => {
                  set(s => ({
                    monthZero: false,
                    registered: 0,
                  }));
                  setModal(null);
                }} style={{ flex: 1 }}>
                  <View style={{ padding: S.md, borderRadius: R.row, backgroundColor: t.accent }}>
                    <Text style={{ fontFamily: FONT.display, fontSize: 14, color: '#FFFFFF', textAlign: 'center' }}>
                      Abrir
                    </Text>
                  </View>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {modal === 'closeMonth' && (
        <Modal transparent animationType="fade" onRequestClose={() => setModal(null)}>
          <Pressable onPress={() => setModal(null)}
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <Pressable style={{ backgroundColor: t.surface, borderRadius: R.card, padding: S.lg, gap: S.lg, maxWidth: 320 }}>
              <Text style={{ fontFamily: FONT.display, fontSize: 18, color: t.text1, textAlign: 'center' }}>
                Fechar mês?
              </Text>
              <Text style={{ fontFamily: FONT.body, fontSize: 14, color: t.text2, textAlign: 'center' }}>
                Arquivar movimentos e aplicar 30% das metas aos cofres das crianças.
              </Text>

              <View style={{ flexDirection: 'row', gap: S.md }}>
                <Pressable onPress={() => setModal(null)} style={{ flex: 1 }}>
                  <View style={{ padding: S.md, borderRadius: R.row, borderWidth: 1, borderColor: t.border }}>
                    <Text style={{ fontFamily: FONT.display, fontSize: 14, color: t.text2, textAlign: 'center' }}>
                      Cancelar
                    </Text>
                  </View>
                </Pressable>
                <Pressable onPress={() => {
                  set(s => ({
                    monthZero: true,
                    registered: 0,
                  }));
                  setModal(null);
                }} style={{ flex: 1 }}>
                  <View style={{ padding: S.md, borderRadius: R.row, backgroundColor: t.accent }}>
                    <Text style={{ fontFamily: FONT.display, fontSize: 14, color: '#FFFFFF', textAlign: 'center' }}>
                      Fechar
                    </Text>
                  </View>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {sheetOpen === 'newShop' && (
        <Sheet t={t} title="Adicionar Loja" sub="Nova loja"
          onClose={() => {
            setSheetOpen(null);
            setInput('');
          }}
          action={
            <Primary t={t} label="Adicionar" onPress={() => {
              if (input.trim()) {
                set(s => ({
                  stores: [...s.stores, input.trim()],
                }));
                setSheetOpen(null);
                setInput('');
              }
            }} disabled={!input.trim()} />
          }>
          <View style={{ gap: S.md }}>
            <View>
              <Label t={t}>Nome da loja</Label>
              <TextInput
                placeholder="Ex: Continente"
                value={input}
                onChangeText={setInput}
                style={{
                  marginTop: S.sm,
                  paddingHorizontal: S.md,
                  paddingVertical: S.md,
                  borderRadius: R.row,
                  borderWidth: 1,
                  borderColor: t.border,
                  fontFamily: FONT.body,
                  fontSize: 15,
                  color: t.text1,
                }}
              />
            </View>
          </View>
        </Sheet>
      )}

      {sheetOpen === 'editShop' && (
        <Sheet t={t} title="Editar Loja" sub={s.stores[selectedEnvelope]}
          onClose={() => {
            setSheetOpen(null);
            setSelectedEnvelope(null);
            setInput('');
          }}
          action={
            <View style={{ gap: S.md }}>
              <Primary t={t} label="Renomear" onPress={() => {
                if (input.trim()) {
                  set(s => ({
                    stores: s.stores.map((shop, i) => i === selectedEnvelope ? input.trim() : shop),
                  }));
                  setSheetOpen(null);
                  setSelectedEnvelope(null);
                  setInput('');
                }
              }} disabled={!input.trim() || input === s.stores[selectedEnvelope]} />
              <Pressable onPress={() => setModal('confirmDeleteShop')}
                style={{ paddingVertical: S.md, alignItems: 'center' }}>
                <Text style={{ fontFamily: FONT.body, fontSize: 14, color: t.state.err }}>Apagar loja</Text>
              </Pressable>
            </View>
          }>
          <View style={{ gap: S.md }}>
            <View>
              <Label t={t}>Nome da loja</Label>
              <TextInput
                placeholder="Nome da loja"
                value={input}
                onChangeText={setInput}
                style={{
                  marginTop: S.sm,
                  paddingHorizontal: S.md,
                  paddingVertical: S.md,
                  borderRadius: R.row,
                  borderWidth: 1,
                  borderColor: t.border,
                  fontFamily: FONT.body,
                  fontSize: 15,
                  color: t.text1,
                }}
              />
            </View>
          </View>
        </Sheet>
      )}

      {modal === 'confirmDeleteShop' && (
        <Modal transparent animationType="fade" onRequestClose={() => setModal(null)}>
          <Pressable onPress={() => setModal(null)}
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <Pressable style={{ backgroundColor: t.surface, borderRadius: R.card, padding: S.lg, gap: S.lg, maxWidth: 300 }}>
              <Text style={{ fontFamily: FONT.display, fontSize: 18, color: t.text1, textAlign: 'center' }}>
                Apagar loja?
              </Text>
              <Text style={{ fontFamily: FONT.body, fontSize: 14, color: t.text2, textAlign: 'center' }}>
                {s.stores[selectedEnvelope]}
              </Text>
              <View style={{ flexDirection: 'row', gap: S.md }}>
                <Pressable onPress={() => setModal(null)} style={{ flex: 1, paddingVertical: S.md, borderRadius: R.row, backgroundColor: t.border }}>
                  <Text style={{ fontFamily: FONT.display, fontSize: 14, color: t.text2, textAlign: 'center' }}>Cancelar</Text>
                </Pressable>
                <Pressable onPress={() => {
                  set(s => ({
                    stores: s.stores.filter((_, i) => i !== selectedEnvelope),
                  }));
                  setModal(null);
                  setSheetOpen(null);
                  setSelectedEnvelope(null);
                }} style={{ flex: 1, paddingVertical: S.md, borderRadius: R.row, backgroundColor: t.state.err }}>
                  <Text style={{ fontFamily: FONT.display, fontSize: 14, color: '#FFFFFF', textAlign: 'center' }}>Apagar</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}
