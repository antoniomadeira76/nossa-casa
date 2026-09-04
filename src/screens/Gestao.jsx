import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Modal } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT, corDoMembro, LARGURA_APP } from '../theme';
import { EUR } from '../format';
import { Card, SectionTitle, Label, Primary, AddButton, Row, Tap, Avatar, Tile, Segmented, Toggle, Pill, Choice, Empty, avatarDe } from '../ui';
import Icon from '../Icon';
import Sheet from '../Sheet';
import { ENV_BASE } from '../data';

// O estilo dos campos de texto estava copiado onze vezes neste ficheiro, cada
// uma com onze linhas iguais. Um sítio só: se o desenho do campo mudar, muda
// em todos — que era o que já devia acontecer.
const campo = (t) => ({
  marginTop: S.sm,
  paddingHorizontal: S.md,
  paddingVertical: S.md,
  minHeight: 44,                 // INVARIANTE #5
  borderRadius: R.row,
  borderWidth: 1,
  borderColor: t.border,
  fontFamily: FONT.body,
  fontSize: 16,
  color: t.text1,
});

export default function Gestao({ t, user, onClose }) {
  const { s, set, isAdmin, budget, spent, envelopes, pinError, setPin, canChangeRole, setRole,
          kidPts, pontosNasTarefas, mudarRegraDaCasa, mudarListaDaCasa,
          criarEnvelope, alterarEnvelope, apagarEnvelope, membros: MEMBERS, nomeDaCasa, podeGerirCasa,
          renomearCasa, acrescentarMembro, editarMembro, renomearMembro, removerMembro } = useStore();
  const [tab, setTab] = useState('orcamento');
  const [sheetOpen, setSheetOpen] = useState(null);
  const [modal, setModal] = useState(null);
  const [input, setInput] = useState('');
  const [limitInput, setLimitInput] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedEnvelope, setSelectedEnvelope] = useState(null);
  // O formulário do membro, e a recusa que vier do servidor. O erro é estado
  // do ecrã, não um alerta: quem tenta tirar alguém da casa e não pode tem de
  // ler porquê no sítio onde tentou.
  const [form, setForm] = useState({ nome: '', papel: 'crianca', email: '', fem: false, segredo: '' });
  const [erro, setErro] = useState(null);
  const [aGuardar, setAGuardar] = useState(false);

  // Validar com pinError, que só lê. setPin grava — chamá-lo aqui comprometia
  // o PIN a meio da escrita, antes de se tocar em Guardar.
  const pinMsg = input ? pinError(selectedMember, input) : null;

  // Estas quatro vão ao servidor e devolvem uma frase de recusa ou null. O
  // ecrã só fecha quando passou — fechar antes de saber mostrava a alteração
  // feita e deixava a casa como estava.
  const executar = async (accao, aoPassar) => {
    setAGuardar(true);
    setErro(null);
    const msg = await accao();
    setAGuardar(false);
    if (msg) { setErro(msg); return; }
    aoPassar();
  };

  const fecharMembro = () => {
    setSheetOpen(null); setModal(null); setSelectedMember(null);
    setInput(''); setErro(null);
  };

  const abrirMembro = (nome) => {
    const papel = s.roles[nome] || 'crianca';
    setSelectedMember(nome);
    setForm({ nome, papel, email: MEMBERS[nome]?.email || '', fem: !!MEMBERS[nome]?.fem, segredo: '' });
    setInput('');
    setErro(null);
    setSheetOpen('membro');
  };

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
        <Pressable accessibilityRole="button" onPress={onClose} style={{ marginTop: S.xl, paddingHorizontal: S.lg, paddingVertical: S.md, backgroundColor: t.accent, borderRadius: R.row }}>
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

      {/* Semanada e divisão das despesas — em docs/referencia/13-gestao-casa.png
          vivem aqui, não no Perfil. Estavam numa folha separada dentro do Perfil,
          e a linha «Rendimento, envelopes, semanada, membros» abria só metade
          disso. Uma casa, um sítio onde se muda as suas regras. */}
      {/* ── Semanada: e os pontos são opcionais ──────────────────────────────
          ⚠ Desligar NÃO apaga nada. Os pontos são somas de movimentos
          (INVARIANTE #2) e ficam onde estão; o que desaparece é o que se
          mostra e o que se pede ao criar uma tarefa. Voltar a ligar traz tudo
          de volta, e é isso que a frase por baixo do interruptor promete. */}
      <View style={{ gap: S.md }}>
        <SectionTitle t={t}>Semanada</SectionTitle>

        {/* ⚠ O `Toggle` desenha SÓ o interruptor — o `label` dele é o rótulo
            de acessibilidade, não texto no ecrã. Sem esta linha ao lado ficava
            um interruptor sem nome, e foi uma prova que o apanhou. É o mesmo
            arranjo do «Dividir a meias», mais abaixo neste ficheiro. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: t.subtle,
          borderWidth: 1, borderColor: t.border, borderRadius: R.card, padding: 14 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>Atribuir pontos às tarefas</Text>
            <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
              {pontosNasTarefas
                ? 'As tarefas valem pontos, e os pontos viram semanada. Desligar esconde-os — não apaga nada, e voltar a ligar traz tudo de volta.'
                : 'As tarefas não têm pontos. O que já estava contado fica guardado e volta se ligar outra vez.'}
            </Text>
          </View>
          <Toggle t={t} on={pontosNasTarefas} label="Atribuir pontos às tarefas"
            onPress={() => mudarRegraDaCasa({ pontosLigados: !pontosNasTarefas })} />
        </View>

        {pontosNasTarefas ? (
        <>
        <Label t={t}>Quanto vale um ponto</Label>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
          {/* ⚠ Mínimo 0, e não 0,01. Uma casa pode querer os pontos como
              contagem e não como dinheiro: «cinco pontos» sem euros atrás. O
              0,01 obrigava a que valessem sempre algo. */}
          <Tap label="Menos 0,05 €" onPress={() => mudarRegraDaCasa({ pointValue: Math.max(0, +(s.pointValue - 0.05).toFixed(2)) })}
            style={{ borderWidth: 1, borderColor: t.border, borderRadius: R.row }}>
            <Text style={{ fontFamily: FONT.display, fontSize: 19, color: t.accent }}>−</Text>
          </Tap>
          <Text style={{ flex: 1, textAlign: 'center', fontFamily: FONT.display, fontSize: 18, color: t.text2 }}>
            {EUR(s.pointValue)}
          </Text>
          <Tap label="Mais 0,05 €" onPress={() => mudarRegraDaCasa({ pointValue: Math.min(5, +(s.pointValue + 0.05).toFixed(2)) })}
            style={{ borderWidth: 1, borderColor: t.border, borderRadius: R.row }}>
            <Text style={{ fontFamily: FONT.display, fontSize: 19, color: t.accent }}>+</Text>
          </Tap>
        </View>
        <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
          {(() => {
            const porPagar = Object.keys(MEMBERS)
              .filter(n => MEMBERS[n].kid)
              .reduce((a, n) => a + ((kidPts?.[n] || 0) - (s.paidPts?.[n] || 0)), 0);
            // A 0 € a frase do dinheiro não diz nada — diz-se só a contagem.
            return s.pointValue > 0
              ? `Os ${porPagar} pontos por pagar valem ${EUR(porPagar * s.pointValue)}.`
              : `Há ${porPagar} pontos por pagar. A zero, os pontos contam e não valem dinheiro.`;
          })()}
        </Text>

        <Label t={t}>Pagar às</Label>
        <Segmented t={t} small value={s.payDay}
          options={['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d, i) => ({ value: i, label: d }))}
          onChange={(v) => mudarRegraDaCasa({ payDay: v })} />
        </>
        ) : null}
      </View>

      <View style={{ gap: S.md }}>
        <SectionTitle t={t}>Divisão das despesas</SectionTitle>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: t.subtle,
          borderWidth: 1, borderColor: t.border, borderRadius: R.card, padding: 14 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>Dividir a meias</Text>
            <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
              {s.splitHalf ? 'Cada despesa partilhada divide-se a meias entre os dois adultos.'
                : 'Cada despesa fica a cargo de quem paga.'}
            </Text>
          </View>
          <Toggle t={t} on={s.splitHalf} label="Dividir a meias"
            onPress={() => mudarRegraDaCasa({ splitHalf: !s.splitHalf })} />
        </View>
      </View>

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
      {!(s.stores || []).length ? (
        <Empty t={t} icon="storefront" title="Sem lojas."
          hint="Acrescente as lojas onde a casa costuma comprar." />
      ) : null}
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

  // Uma linha por membro, como na referência 14: avatar, nome, o que se muda
  // por baixo, e a pastilha do papel à direita. Eram cartões de três linhas
  // com PIN e Papel empilhados — quatro membros enchiam o ecrã, e a linha de
  // cima tinha `onPress={() => {}}`, mais um controlo morto.
  //
  // A referência diz «toque no papel para o mudar», com a pastilha como alvo.
  // Não segui essa parte: o erro nº 6 do CLAUDE.md é exatamente uma pílula
  // tocável dentro de uma linha tocável, e obriga a adivinhar onde se tocou.
  // Uma linha, um destino — e o destino tem lá dentro tudo o que se muda
  // naquele membro, incluindo o papel.
  const renderMembersTab = () => (
    <View style={{ gap: S.md }}>
      <SectionTitle t={t}>A Casa</SectionTitle>
      <Card t={t} pad={false} style={{ paddingHorizontal: 16 }}>
        <Row t={t} last icon="houseGear"
          title="Nome da família"
          sub={nomeDaCasa}
          onPress={() => { setInput(nomeDaCasa); setErro(null); setSheetOpen('nomeDaCasa'); }}
          right={<Icon name="caretRight" size={18} color={t.text3} />} />
      </Card>

      {/* Sem servidor a casa que se vê é a de demonstração, e configurar uma
          amostra não configura nada. Dizê-lo aqui, uma vez, é melhor do que
          quatro botões que não fazem nada e não explicam porquê. */}
      {!podeGerirCasa() ? (
        <Tile t={t} kind="info">
          Esta é a casa de demonstração. Ligue-se ao servidor da família para
          mudar o nome da casa ou acrescentar e remover membros.
        </Tile>
      ) : null}

      <SectionTitle t={t}>Membros e PIN</SectionTitle>
      <Card t={t} pad={false} style={{ paddingHorizontal: 16 }}>
        {Object.entries(MEMBERS).map(([name, info], i, arr) => {
          const role = s.roles[name] || 'crianca';
          const hasPin = !!s.pins[name];
          const crianca = role === 'crianca';
          const papel = crianca ? 'Criança'
            : role === 'admin' ? (info.fem ? 'Administradora' : 'Administrador') : 'Adulto';
          return (
            <Row key={name} t={t} last={i === arr.length - 1}
              leading={<Avatar {...avatarDe(name, info, t.text3)} size={40} />}
              title={name}
              sub={crianca ? (hasPin ? 'Perfil de criança · PIN definido'
                                    : 'Perfil de criança · ainda sem PIN')
                           : info.email}
              onPress={() => { abrirMembro(name); }}
              right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                {/* Contornada e na cor do papel, como na referência: um adulto
                    lê-se de relance sem se ler a palavra. */}
                <Pill label={papel} bg="transparent"
                  fg={crianca ? t.text3 : t.state.info}
                  border={crianca ? t.border : t.state.info} />
                <Icon name="caretRight" size={18} color={t.text3} />
              </View>}
              icon={undefined} />
          );
        })}
      </Card>

      <AddButton t={t} label="acrescentar membro" onPress={() => {
        setForm({ nome: '', papel: 'crianca', email: '', fem: false, segredo: '' });
        setErro(null);
        setSheetOpen('novoMembro');
      }} />

      {/* O que cada toque faz, e o que cada mudança de papel implica — a
          referência 14 explica-o aqui, e sem isso «Criança» parece um rótulo
          e não um botão. */}
      <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
        Toque num membro para lhe mudar o papel, o PIN, ou para o tirar da casa.
        Uma criança que passe a adulto precisa de conta Google própria. A casa
        nunca pode ficar sem administração, e o histórico de quem sai fica.
      </Text>
    </View>
  );

  const renderEnvelopesTab = () => (
    <View style={{ gap: S.md }}>
      <SectionTitle t={t}>Envelopes orçamentais</SectionTitle>
      {!(envelopes || []).length ? (
        <Empty t={t} icon="wallet" title="Sem envelopes."
          hint="Um envelope é uma categoria com um limite mensal." />
      ) : null}
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
        <Pressable accessibilityRole="button" onPress={() => setSheetOpen('transferEnvelopes')}
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

  // As especialidades médicas viviam aqui, numa quinta aba, E na Saúde — duas
  // interfaces sobre a mesma lista `s.specialities`. Saíram para a Saúde, que
  // é onde se usam: aparecem ao marcar uma consulta.
  //
  // ⚠ Com elas foi-se o RENOMEAR, e é bom que se tenha ido. O
  // `renameSpecialty` da loja troca o nome na lista e mais nada — os episódios
  // de `health` guardam a especialidade como texto e ficavam a apontar para um
  // nome que já não existe. Um renomear correto tem de os migrar; até o haver,
  // não há renomear nenhum, o que é melhor do que ter um que parte fichas
  // clínicas em silêncio.

  return (
    <View style={{ flex: 1, backgroundColor: t.page }}>
      <View style={{ gap: S.xl }}>
        {/* A faixa é UMA linha, contígua, e agora CABE.

            ⚠ Duas coisas que ela já não faz, e que custaram medição:

              intervalos entre abas   havia S.md, e dava OITO pixels mortos
                                      entre cada par — um toque ali não
                                      acertava em nada e a pessoa tocava outra
                                      vez sem perceber porquê
              abas estreitas          a «Lojas» tinha 31 px de largura; o
                                      INVARIANTE #5 não fala só de altura

            ── E o corte, que era real ─────────────────────────────────────

            Cortava num telemóvel a sério, não só na teoria. Medido a 402 px,
            aba a aba: Orçamento 84, Membros 75, Envelopes 80, Lojas 51,
            Especialidades 107 — a última acabava em 413 e a coluna acaba em
            386. Vinte e sete pixels por fora, comidos pelo `overflow: hidden`
            sem deixar rasto, que é o que faz isto parecer erro de desenho em
            vez de falta de espaço.

            O deslize horizontal e a quebra em duas linhas foram vistos e
            recusados. A saída foi tirar a QUINTA ABA: as especialidades
            médicas eram geridas em DOIS sítios sobre a mesma lista
            `s.specialities` — aqui e na Saúde. A faixa só tinha cinco abas por
            haver uma secção a mais, e é aí que estava a causa.

            ⚠ O enchimento é 10, e voltou a 10 depois de ter estado em 4.
            Apertá-lo foi medido e funcionava — com 4 a faixa acabava em 263
            dos 396 úteis — mas com quatro abas era apertar sem precisar: os
            133 px que sobravam iam todos para um vazio à direita, e as
            etiquetas ficavam a 8 px uma da outra, mais parecidas com uma linha
            corrida do que com quatro abas.

            Com quatro abas e 10 de enchimento: acaba em 306 dos 396 de um
            telefone de 412, 90 px de folga, e aguenta até aos 322 px. Se
            alguma vez voltar uma quinta aba, isto corta outra vez — e é a aba
            que tem de sair, não o enchimento. */}
        <View style={{ flexDirection: 'row', borderBottomWidth: 1,
          borderBottomColor: t.border, paddingBottom: S.md }}>
          {[
            { key: 'orcamento', label: 'Orçamento' },
            { key: 'membros', label: 'Membros' },
            { key: 'envelopes', label: 'Envelopes' },
            { key: 'lojas', label: 'Lojas' },
          ].map(({ key, label }) => (
            <Pressable key={key} onPress={() => setTab(key)}
              accessibilityRole="tab" accessibilityLabel={label}
              accessibilityState={{ selected: tab === key }}
              style={{ minHeight: 44, minWidth: 44, paddingHorizontal: 10,
                alignItems: 'center', justifyContent: 'flex-end', paddingBottom: S.sm,
                borderBottomWidth: tab === key ? 2 : 0,
                borderBottomColor: tab === key ? t.accent : 'transparent' }}>
              <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600',
                color: tab === key ? t.accent : t.text3 }}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'orcamento' && renderBudgetTab()}
        {tab === 'membros' && renderMembersTab()}
        {tab === 'envelopes' && renderEnvelopesTab()}
        {tab === 'lojas' && renderShopsTab()}

        <Pressable accessibilityRole="button" onPress={onClose} style={{ paddingVertical: S.lg }}>
          <Text style={{ fontFamily: FONT.display, fontSize: 14, color: t.accent, textAlign: 'center' }}>
            Fechar
          </Text>
        </Pressable>
      </View>

      {/* ── O nome da família ────────────────────────────────────────────── */}
      {sheetOpen === 'nomeDaCasa' && (
        <Sheet t={t} title="Nome da família" sub={`Agora: ${nomeDaCasa}`}
          onClose={() => { setSheetOpen(null); setInput(''); setErro(null); }}
          action={
            <Primary t={t} label={aGuardar ? 'A guardar…' : 'Guardar'}
              disabled={aGuardar || !input.trim() || input.trim() === nomeDaCasa}
              onPress={() => executar(
                () => renomearCasa(input),
                () => { setSheetOpen(null); setInput(''); })} />
          }>
          <View style={{ gap: S.md }}>
            <View>
              <Label t={t}>Como se chama esta casa</Label>
              <TextInput
                placeholder="Ex: Bengui"
                value={input}
                onChangeText={setInput}
                maxLength={40}
                style={campo(t)}
              />
            </View>
            <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
              É o nome que aparece na entrada e ao lado de cada membro.
            </Text>
            {erro ? <Tile t={t} kind="warn">{erro}</Tile> : null}
          </View>
        </Sheet>
      )}

      {/* ── Acrescentar um membro ────────────────────────────────────────── */}
      {sheetOpen === 'novoMembro' && (
        <Sheet t={t} title="Acrescentar membro" sub={`À casa ${nomeDaCasa}`}
          onClose={() => { setSheetOpen(null); setErro(null); }}
          action={
            <Primary t={t} label={aGuardar ? 'A acrescentar…' : 'Acrescentar'}
              disabled={aGuardar || !form.nome.trim()}
              onPress={() => executar(
                () => acrescentarMembro(form),
                () => setSheetOpen(null))} />
          }>
          <View style={{ gap: S.lg }}>
            <View style={{ gap: S.md }}>
              <Label t={t}>Papel</Label>
              <View style={{ flexDirection: 'row', gap: S.md }}>
                {[['crianca', 'Criança'], ['adulto', 'Adulto'], ['admin', 'Administração']].map(([v, r]) => (
                  <View key={v} style={{ flex: 1 }}>
                    <Choice t={t} label={r} selected={form.papel === v}
                      onPress={() => setForm(f => ({ ...f, papel: v, segredo: '' }))} />
                  </View>
                ))}
              </View>
              <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
                {form.papel === 'crianca'
                  ? 'Uma criança entra com um PIN de 4 dígitos e não vê o orçamento da casa.'
                  : 'Um adulto entra com a conta Google e vê o dinheiro da casa.'}
              </Text>
            </View>

            <View>
              <Label t={t}>Nome</Label>
              <TextInput placeholder="Ex: Ana" value={form.nome} maxLength={30}
                onChangeText={(v) => setForm(f => ({ ...f, nome: v }))} style={campo(t)} />
            </View>

            {/* A concordância não é um pormenor: é o que faz a app dizer «a
                Ana deve» e não «o Ana deve» em cada frase que a nomeia. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: t.subtle,
              borderWidth: 1, borderColor: t.border, borderRadius: R.card, padding: 14 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>Tratar no feminino</Text>
                <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
                  {form.fem ? `«a ${form.nome.trim() || 'Ana'}», «à ${form.nome.trim() || 'Ana'}»`
                            : `«o ${form.nome.trim() || 'Bruno'}», «ao ${form.nome.trim() || 'Bruno'}»`}
                </Text>
              </View>
              <Toggle t={t} on={form.fem} label="Tratar no feminino"
                onPress={() => setForm(f => ({ ...f, fem: !f.fem }))} />
            </View>

            {form.papel === 'crianca' ? (
              <View>
                <Label t={t}>PIN de 4 dígitos</Label>
                <TextInput placeholder="0000" keyboardType="numeric" maxLength={4} secureTextEntry
                  value={form.segredo} onChangeText={(v) => setForm(f => ({ ...f, segredo: v }))}
                  style={campo(t)} />
              </View>
            ) : (
              <>
                <View>
                  <Label t={t}>Endereço de e-mail</Label>
                  <TextInput placeholder="nome@gmail.com" keyboardType="email-address"
                    autoCapitalize="none" value={form.email}
                    onChangeText={(v) => setForm(f => ({ ...f, email: v }))} style={campo(t)} />
                </View>
                <View>
                  <Label t={t}>Palavra-passe do servidor</Label>
                  <TextInput placeholder="Pelo menos 8 caracteres" secureTextEntry
                    value={form.segredo} onChangeText={(v) => setForm(f => ({ ...f, segredo: v }))}
                    style={campo(t)} />
                  <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3, marginTop: S.sm }}>
                    É a palavra-passe da conta na casa, não a da Google. Combine-a
                    com a pessoa; ela pode mudá-la depois no Perfil.
                  </Text>
                </View>
              </>
            )}

            {erro ? <Tile t={t} kind="warn">{erro}</Tile> : null}
          </View>
        </Sheet>
      )}

      {/* ── Um membro: papel, PIN, e a saída ─────────────────────────────── */}
      {/* Era uma folha só para o PIN mais um diálogo só para o papel, e a
          linha do membro tinha de escolher qual abrir. Uma linha, um destino:
          o que se muda num membro está tudo aqui. */}
      {sheetOpen === 'membro' && selectedMember && (
        <Sheet t={t} title={selectedMember}
          sub={MEMBERS[selectedMember]?.email || 'Perfil de criança'}
          leading={<Avatar {...avatarDe(selectedMember, MEMBERS[selectedMember], t.text3)} size={40} />}
          onClose={fecharMembro}
          action={
            <View style={{ gap: S.md }}>
              {(s.roles[selectedMember] || 'crianca') === 'crianca' ? (
                <Primary t={t} label="Guardar PIN" disabled={!input || !!pinMsg}
                  onPress={() => { if (setPin(selectedMember, input)) return; fecharMembro(); }} />
              ) : null}
              <Pressable onPress={() => { setErro(null); setModal('confirmarRemocao'); }}
                accessibilityRole="button" accessibilityLabel={`Tirar ${selectedMember} da casa`}
                style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: FONT.body, fontSize: 14, color: t.state.err }}>
                  Tirar da casa
                </Text>
              </Pressable>
            </View>
          }>
          <View style={{ gap: S.lg }}>
            {/* O nome é a primeira coisa da folha porque é a que se vem cá
                mudar mais vezes — um engano de escrita, ou um nome próprio
                que a família não usa. */}
            <View>
              <Label t={t}>Nome</Label>
              <TextInput value={form.nome} maxLength={30}
                onChangeText={(v) => setForm(f => ({ ...f, nome: v }))} style={campo(t)} />
              {form.nome.trim() !== selectedMember ? (
                <View style={{ gap: S.md, marginTop: S.md }}>
                  {/* O aviso aparece ANTES de se guardar, não depois. Um PIN
                      apagado sem avisar é uma criança que não entra e não
                      percebe porquê. */}
                  {s.pins[selectedMember] ? (
                    <Tile t={t} kind="warn">
                      O PIN é apagado quando o nome muda, e terá de ser definido
                      outra vez aqui. O que está feito — tarefas, cofre, ficha de
                      saúde — acompanha o nome novo.
                    </Tile>
                  ) : null}
                  <Primary t={t} label={aGuardar ? 'A guardar…' : 'Guardar nome'}
                    disabled={aGuardar || !form.nome.trim()}
                    onPress={() => executar(
                      () => renomearMembro(selectedMember, form.nome),
                      () => setSelectedMember(form.nome.trim()))} />
                </View>
              ) : null}
            </View>

            <View style={{ gap: S.md }}>
              <Label t={t}>Papel</Label>
              <View style={{ flexDirection: 'row', gap: S.md }}>
                {[['crianca', 'Criança'], ['adulto', 'Adulto'], ['admin', 'Administração']].map(([v, r]) => {
                  const actual = (s.roles[selectedMember] || 'crianca');
                  const pode = v === actual || canChangeRole(actual, v);
                  return (
                    <View key={v} style={{ flex: 1, opacity: pode ? 1 : 0.4 }}>
                      <Choice t={t} label={r} selected={actual === v}
                        onPress={() => { if (pode && v !== actual) executar(
                          () => editarMembro(selectedMember, { papel: v }), () => {}); }} />
                    </View>
                  );
                })}
              </View>
              <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
                Uma criança pode passar a adulto — e passa a precisar de conta
                Google própria. Um adulto não volta a criança, e a casa nunca
                pode ficar sem administração.
              </Text>
            </View>

            {(s.roles[selectedMember] || 'crianca') === 'crianca' ? (
              <View>
                <Label t={t}>{s.pins[selectedMember] ? 'Alterar o PIN' : 'Definir o PIN'}</Label>
                <TextInput placeholder="0000" keyboardType="numeric" maxLength={4} secureTextEntry
                  value={input} onChangeText={setInput} style={campo(t)} />
                {pinMsg ? <View style={{ marginTop: S.md }}><Tile t={t} kind="warn">{pinMsg}</Tile></View> : null}
              </View>
            ) : null}

            {erro ? <Tile t={t} kind="warn">{erro}</Tile> : null}
          </View>
        </Sheet>
      )}

      {/* ── Tirar da casa ────────────────────────────────────────────────── */}
      {modal === 'confirmarRemocao' && selectedMember && (
        <Modal transparent animationType="fade" onRequestClose={() => setModal(null)}>
          <Pressable accessibilityRole="button" onPress={() => setModal(null)}
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', width: '100%', maxWidth: LARGURA_APP, marginHorizontal: 'auto', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <Pressable accessibilityRole="button" style={{ backgroundColor: t.surface, borderRadius: R.card, padding: S.lg, gap: S.lg, maxWidth: 320 }}>
              <Text style={{ fontFamily: FONT.display, fontSize: 18, color: t.text1, textAlign: 'center' }}>
                Tirar {selectedMember} da casa?
              </Text>
              <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, lineHeight: 19, color: t.text2, textAlign: 'center' }}>
                Deixa de entrar nesta casa e de aparecer nas tarefas, na agenda e
                no dinheiro. O que já lá está — tarefas feitas, movimentos,
                despesas — fica no histórico da casa.
              </Text>
              {erro ? <Tile t={t} kind="warn">{erro}</Tile> : null}
              <View style={{ flexDirection: 'row', gap: S.md }}>
                <Pressable onPress={() => setModal(null)} accessibilityRole="button"
                  accessibilityLabel="Cancelar" style={{ flex: 1 }}>
                  <View style={{ minHeight: 44, justifyContent: 'center', borderRadius: R.row, borderWidth: 1, borderColor: t.border }}>
                    <Text style={{ fontFamily: FONT.display, fontSize: 14, color: t.text2, textAlign: 'center' }}>
                      Cancelar
                    </Text>
                  </View>
                </Pressable>
                <Pressable disabled={aGuardar} accessibilityRole="button"
                  accessibilityLabel={`Confirmar tirar ${selectedMember} da casa`}
                  onPress={() => executar(() => removerMembro(selectedMember), fecharMembro)}
                  style={{ flex: 1 }}>
                  <View style={{ minHeight: 44, justifyContent: 'center', borderRadius: R.row, backgroundColor: t.state.err }}>
                    <Text style={{ fontFamily: FONT.display, fontSize: 14, color: '#FFFFFF', textAlign: 'center' }}>
                      {aGuardar ? 'A tirar…' : 'Tirar'}
                    </Text>
                  </View>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
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

                const oldName = selectedEnvelope;
                const newName = input.trim();
                set(s => {
                  const newLimits = { ...s.monthLimits };
                  newLimits[newName] = newLimit;
                  if (oldName !== newName) delete newLimits[oldName];
                  // ⚠ O ajuste do mês acompanha o nome. Se ficasse na chave
                  // antiga, o dinheiro movido para este envelope desaparecia
                  // do ecrã ao renomeá-lo.
                  const newMoves = { ...s.envMove };
                  if (newMoves[oldName] !== undefined && oldName !== newName) {
                    newMoves[newName] = newMoves[oldName];
                    delete newMoves[oldName];
                  }
                  return { monthLimits: newLimits, envMove: newMoves };
                });
                // E sobe: o envelope é da casa, não deste telemóvel.
                alterarEnvelope(oldName, { nome: newName, limite: newLimit });
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
                criarEnvelope(input.trim(), 500);
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

      {/* O diálogo «Alterar papel» vivia aqui, e escolher o rótulo fazia
          `FEM(name)` — `name` não existe neste âmbito. No navegador resolvia
          para o `window.name`, string vazia, e dizia sempre «Administrador»;
          em React Native seria um ReferenceError. O papel mudou-se para
          dentro da folha do membro, onde o nome está em mão. */}

      {modal === 'openMonth' && (
        <Modal transparent animationType="fade" onRequestClose={() => setModal(null)}>
          <Pressable accessibilityRole="button" onPress={() => setModal(null)}
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', width: '100%', maxWidth: LARGURA_APP, marginHorizontal: 'auto', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <Pressable accessibilityRole="button" style={{ backgroundColor: t.surface, borderRadius: R.card, padding: S.lg, gap: S.lg, maxWidth: 320 }}>
              <Text style={{ fontFamily: FONT.display, fontSize: 18, color: t.text1, textAlign: 'center' }}>
                Abrir novo mês?
              </Text>
              <Text style={{ fontFamily: FONT.body, fontSize: 14, color: t.text2, textAlign: 'center' }}>
                Distribuir rendimento pelos envelopes e resetar gastos.
              </Text>

              <View style={{ flexDirection: 'row', gap: S.md }}>
                <Pressable onPress={() => setModal(null)} accessibilityRole="button"
                  accessibilityLabel="Cancelar" style={{ flex: 1 }}>
                  <View style={{ padding: S.md, borderRadius: R.row, borderWidth: 1, borderColor: t.border }}>
                    <Text style={{ fontFamily: FONT.display, fontSize: 14, color: t.text2, textAlign: 'center' }}>
                      Cancelar
                    </Text>
                  </View>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => {
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
          <Pressable accessibilityRole="button" onPress={() => setModal(null)}
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', width: '100%', maxWidth: LARGURA_APP, marginHorizontal: 'auto', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <Pressable accessibilityRole="button" style={{ backgroundColor: t.surface, borderRadius: R.card, padding: S.lg, gap: S.lg, maxWidth: 320 }}>
              <Text style={{ fontFamily: FONT.display, fontSize: 18, color: t.text1, textAlign: 'center' }}>
                Fechar mês?
              </Text>
              <Text style={{ fontFamily: FONT.body, fontSize: 14, color: t.text2, textAlign: 'center' }}>
                Arquivar os movimentos do mês e recomeçar a contagem.
              </Text>

              <View style={{ flexDirection: 'row', gap: S.md }}>
                <Pressable onPress={() => setModal(null)} accessibilityRole="button"
                  accessibilityLabel="Cancelar" style={{ flex: 1 }}>
                  <View style={{ padding: S.md, borderRadius: R.row, borderWidth: 1, borderColor: t.border }}>
                    <Text style={{ fontFamily: FONT.display, fontSize: 14, color: t.text2, textAlign: 'center' }}>
                      Cancelar
                    </Text>
                  </View>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => {
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
                mudarListaDaCasa('stores', [...s.stores, input.trim()]);
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
                  // O renomear mantém a POSIÇÃO, e é isso que o distingue de
                  // apagar-e-criar quando a loja compara as duas listas — uma
                  // loja apagada leva atrás as listas de compras que a referem.
                  mudarListaDaCasa('stores',
                    s.stores.map((shop, i) => (i === selectedEnvelope ? input.trim() : shop)));
                  setSheetOpen(null);
                  setSelectedEnvelope(null);
                  setInput('');
                }
              }} disabled={!input.trim() || input === s.stores[selectedEnvelope]} />
              <Pressable accessibilityRole="button" onPress={() => setModal('confirmDeleteShop')}
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
          <Pressable accessibilityRole="button" onPress={() => setModal(null)}
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', width: '100%', maxWidth: LARGURA_APP, marginHorizontal: 'auto', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <Pressable accessibilityRole="button" style={{ backgroundColor: t.surface, borderRadius: R.card, padding: S.lg, gap: S.lg, maxWidth: 300 }}>
              <Text style={{ fontFamily: FONT.display, fontSize: 18, color: t.text1, textAlign: 'center' }}>
                Apagar loja?
              </Text>
              <Text style={{ fontFamily: FONT.body, fontSize: 14, color: t.text2, textAlign: 'center' }}>
                {s.stores[selectedEnvelope]}
              </Text>
              <View style={{ flexDirection: 'row', gap: S.md }}>
                <Pressable accessibilityRole="button" onPress={() => setModal(null)} style={{ flex: 1, paddingVertical: S.md, borderRadius: R.row, backgroundColor: t.border }}>
                  <Text style={{ fontFamily: FONT.display, fontSize: 14, color: t.text2, textAlign: 'center' }}>Cancelar</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => {
                  mudarListaDaCasa('stores', s.stores.filter((_, i) => i !== selectedEnvelope));
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
