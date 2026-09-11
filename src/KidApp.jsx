import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from './store';
import { buildTheme, onChrome, S, R, FONT, SCHEMES, corDoMembro, chromeDaCrianca, elev, LARGURA_APP } from './theme';
import { EUR, parseKey, pad2, plural } from './format';
import Icon from './Icon';
import { Card, SectionTitle, Pill, Empty, Label, Primary, Tile, Row, Avatar, avatarDe, Linha, Choice } from './ui';
import Sheet from './Sheet';
import EscolherAvatar from './sheets/EscolherAvatar';
import EscolhaDeEsquema from './EsquemaDeCor';
import Figura from './Avatares';

// A folha «O meu perfil» — o que é da criança e só dela: o avatar (figura e
// cor), o esquema de cor, e o PIN com que entra.
//
// 10/09/2026 — o dono da casa: «as crianças também podem escolher esquema de
// cor e avatar». As duas escolhas são EXACTAMENTE as dos adultos — a mesma
// folha de avatar e as mesmas seis bolas — e sobem pelos mesmos caminhos: a
// figura e a cor pela rota `/api/membro/aspeto`, que escreve no próprio membro
// autenticado, e o esquema pela linha de `preferencias` da criança, cuja regra
// é `membro = @request.auth.id`. Nada de novo no servidor. A fotografia da
// conta Google fica de fora: a criança não tem conta (§8 da segurança).
function FolhaDoPerfil({ t, kid, onClose }) {
  const { s, membros: MEMBROS, mudarPreferencia } = useStore();
  const [aEscolherAvatar, setAEscolherAvatar] = useState(false);
  const [aMudarPin, setAMudarPin] = useState(false);
  const scheme = s.schemeByUser[kid] ?? 0;

  return (
    <Sheet t={t} title="O meu perfil" sub={`Como ${kid} aparece, e o PIN com que entra`} onClose={onClose}>
      <View style={{ gap: S.xl }}>
        <View>
          <SectionTitle t={t}>Aparência</SectionTitle>
          <Row t={t} icon="user" title="Avatar" sub="A figura e a cor com que aparece na casa"
            right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
              <Avatar {...avatarDe(kid, MEMBROS[kid], t.text3)} size={28} />
              <Icon name="caretRight" size={18} color={t.text3} />
            </View>}
            onPress={() => setAEscolherAvatar(true)} last />
        </View>

        <View style={{ gap: S.md }}>
          <SectionTitle t={t}>Cor do perfil</SectionTitle>
          <EscolhaDeEsquema t={t} escolhido={scheme}
            onEscolher={(i) => mudarPreferencia(kid, { esquema: i })} />
          <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
            {SCHEMES[scheme].name}. Vale só para {kid} — os outros membros mantêm o que escolheram.
          </Text>
        </View>

        <View>
          <SectionTitle t={t}>Entrada</SectionTitle>
          <Row t={t} icon="idcard" title="O meu PIN" sub="Mudar o PIN sabendo o atual"
            right={<Icon name="caretRight" size={18} color={t.text3} />}
            onPress={() => setAMudarPin(true)} last />
        </View>
      </View>

      {/* As folhas empilhadas vivem DENTRO desta, como no Perfil dos adultos:
          o rodapé continua por baixo de todas (INVARIANTE #1). */}
      {aEscolherAvatar ? (
        <Sheet t={t} title="Avatar" sub={`Como ${kid} aparece na casa`}
          onClose={() => setAEscolherAvatar(false)}>
          <EscolherAvatar t={t} user={kid} comFotografia={false}
            onFeito={() => setAEscolherAvatar(false)} />
        </Sheet>
      ) : null}
      {aMudarPin ? <FolhaDoPin t={t} kid={kid} onClose={() => setAMudarPin(false)} /> : null}
    </Sheet>
  );
}

// A criança muda o SEU PIN, sabendo o atual (09/09/2026 — «as crianças podem
// alterar o PIN»). A reposição sem o atual continua a ser de quem administra,
// na Gestão. Três campos e um botão: o que uma criança de sete anos consegue
// fazer sozinha, e o servidor confere tudo outra vez.
function FolhaDoPin({ t, kid, onClose }) {
  const { mudarMeuPin } = useStore();
  const [atual, setAtual] = useState('');
  const [novo, setNovo] = useState('');
  const [outraVez, setOutraVez] = useState('');
  const [erro, setErro] = useState(null);
  const [feito, setFeito] = useState(false);
  const [aGuardar, setAGuardar] = useState(false);

  const campo = {
    marginTop: S.sm, paddingHorizontal: S.md, paddingVertical: S.md, minHeight: 44,
    borderWidth: 1, borderColor: t.border, borderRadius: R.row, backgroundColor: t.card,
    fontFamily: FONT.ui, fontSize: 16, color: t.text1, letterSpacing: 4,
  };
  const pronto = /^\d{4}$/.test(atual) && /^\d{4}$/.test(novo) && /^\d{4}$/.test(outraVez);

  const guardar = async () => {
    if (novo !== outraVez) { setErro('O PIN novo não está igual nas duas caixas.'); return; }
    setAGuardar(true);
    const e = await mudarMeuPin(kid, atual, novo);
    setAGuardar(false);
    if (e) { setErro(e); return; }
    setErro(null); setFeito(true);
  };

  return (
    <Sheet t={t} title="O meu PIN" sub="Quatro dígitos, só seus" onClose={onClose}
      action={feito
        ? <Primary t={t} comum label="Fechar" onPress={onClose} />
        : <Primary t={t} comum label={aGuardar ? 'A guardar…' : 'Guardar o PIN novo'}
            disabled={!pronto || aGuardar} onPress={guardar} />}>
      {feito ? (
        <Tile t={t} kind="info">O PIN mudou. Da próxima vez que entrar, use o novo.</Tile>
      ) : (
        <View style={{ gap: S.lg }}>
          <View>
            <Label t={t}>PIN atual</Label>
            <TextInput value={atual} onChangeText={setAtual} keyboardType="numeric" maxLength={4}
              secureTextEntry placeholder="••••" placeholderTextColor={t.text3}
              accessibilityLabel="PIN atual" style={campo} />
          </View>
          <View>
            <Label t={t}>PIN novo</Label>
            <TextInput value={novo} onChangeText={setNovo} keyboardType="numeric" maxLength={4}
              secureTextEntry placeholder="••••" placeholderTextColor={t.text3}
              accessibilityLabel="PIN novo" style={campo} />
          </View>
          <View>
            <Label t={t}>PIN novo, outra vez</Label>
            <TextInput value={outraVez} onChangeText={setOutraVez} keyboardType="numeric" maxLength={4}
              secureTextEntry placeholder="••••" placeholderTextColor={t.text3}
              accessibilityLabel="PIN novo, outra vez" style={campo} />
          </View>
          <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
            Não pode ter os quatro dígitos iguais nem ser uma sequência. Se se esquecer do PIN,
            um adulto define outro na Gestão da Casa.
          </Text>
          {erro ? <Tile t={t} kind="warn">{erro}</Tile> : null}
        </View>
      )}
    </Sheet>
  );
}

// dkey → dd/mm, para a linha do movimento
const dayShort = (k) => {
  const p = parseKey(k);
  return p ? `${pad2(p.d)}/${pad2(p.m + 1)}` : null;
};

// Ícone de tarefa: traço aberto, 1,75 de espessura, grelha de 24
const TaskIcon = ({ size = 32, color = '#67769B' }) => (
  <Icon name="checkSquare" size={size} color={color} />
);

// Linha de tarefa da criança
function KidTaskRow({ t, task, kid, onPress }) {
  const { s } = useStore();
  // Três estados: por fazer, «a confirmar» (a criança marcou, um adulto ainda
  // não deu por feita) e feita (confirmada). A criança marca e desmarca a sua;
  // o que um adulto já confirmou não se desfaz daqui — e o servidor também
  // não deixaria.
  const isDone = !!s.done[task.id];
  const isPending = !isDone && !!s.pending[task.id];

  return (
    <Pressable onPress={isDone ? undefined : onPress} disabled={isDone}
      accessibilityRole="button"
      accessibilityLabel={task.title}
      accessibilityState={{ checked: isDone ? true : isPending ? 'mixed' : false, disabled: isDone }}
      style={({ pressed }) => ({
        minHeight: 64, paddingHorizontal: 16, paddingVertical: 12,
        flexDirection: 'row', alignItems: 'center', gap: 16,
        borderBottomWidth: 1, borderBottomColor: t.divider,
        opacity: isDone ? 0.6 : 1,
        backgroundColor: pressed ? t.subtle : 'transparent',
      })}>

      <View style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
        <TaskIcon size={28} color={isDone ? t.state.ok : isPending ? t.state.info : t.slate} />
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <Text numberOfLines={2} style={{
          fontFamily: FONT.body, fontSize: 17, fontWeight: isDone ? '400' : '500',
          color: isDone ? t.text3 : t.text2,
          textDecorationLine: isDone ? 'line-through' : 'none',
        }}>{task.title}</Text>
        {isPending ? <Text numberOfLines={1} style={{
          fontFamily: FONT.ui, fontSize: 12, color: t.state.infoTexto,
        }}>A confirmar por um adulto</Text>
        : task.meta ? <Text numberOfLines={1} style={{
          fontFamily: FONT.ui, fontSize: 12, color: t.text3,
        }}>{task.meta}</Text> : null}
      </View>

      {useStore().pontosNasTarefas && task.pts > 0 ? (
        <Pill label={`${task.pts} pt`} fg={t.text2} bg={t.subtle} border={t.border} />
      ) : null}
    </Pressable>
  );
}

// Uma parcela do cofre. O sinal vem do próprio movimento.
function VaultTransaction({ t, entry }) {
  const isCredit = entry.delta >= 0;
  const day = entry.day ? dayShort(entry.day) : null;

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 12,
      minHeight: 52, paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: t.divider,
    }}>
      <View style={{
        width: 36, height: 36, borderRadius: R.pill,
        backgroundColor: isCredit ? t.state.okBg : t.subtle,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={isCredit ? 'caretUp' : 'caretDown'} size={18}
          color={isCredit ? t.state.okTexto : t.text3} />
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{
          fontFamily: FONT.body, fontSize: 15, color: t.text2,
        }}>{entry.label}</Text>
        {day ? <Text style={{
          fontFamily: FONT.ui, fontSize: 12, color: t.text3,
        }}>{day}</Text> : null}
      </View>

      <Text style={{
        fontFamily: FONT.display, fontSize: 15, fontWeight: '600',
        color: isCredit ? t.state.okTexto : t.text2,
      }}>
        {isCredit ? '+' : '−'}{EUR(Math.abs(entry.delta))}
      </Text>
    </View>
  );
}

// Vista de Tarefas
function KidTasksView({ t, kid, tasks }) {
  const st = useStore();
  // `done` vive dentro de `s`, não à cabeça da loja. Desestruturado assim
  // ficava undefined e `done[x.id]` rebentava no primeiro id — «Cannot read
  // properties of undefined (reading 'lixo')». O modo criança inteiro era um
  // ecrã branco, e nada no ecrã dizia porquê: o erro fica só na consola.
  // As outras três leituras neste ficheiro já usavam `s.done`.
  const { s } = st;
  const done = s.done;

  const tasksByKid = tasks.filter(x => x.who === kid);
  const todayTasks = tasksByKid.filter(x => !done[x.id]);
  // Os pontos ganhos na semana, que é o mesmo número que o cabeçalho mostra
  // como «por pagar». Contava a soma das tarefas ainda por fazer: dava 5 onde
  // a referência 28 mostra 14, e descia à medida que a criança trabalhava —
  // exactamente ao contrário do que um contador de pontos deve fazer.
  const weekPts = st.kidPts[kid] || 0;

  return (
    <ScrollView style={{ flex: 1, minHeight: 0 }}
      contentContainerStyle={{ paddingBottom: S.xl }}>

      {/* Cartão de resumo */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: S.md }}>
        <View style={{ flexDirection: 'row', gap: S.md }}>
          <View style={{
            flex: 1, backgroundColor: t.card, borderRadius: R.card,
            borderWidth: 1, borderColor: t.border,
            paddingHorizontal: 16, paddingVertical: 14, gap: 8,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{
              fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.text3,
            }}>Por fazer hoje</Text>
            <Text style={{
              fontFamily: FONT.display, fontSize: 26, fontWeight: '600', color: t.text2,
            }}>{todayTasks.length}</Text>
          </View>

          {/* Sem pontos, o cartão sai e o «Por fazer hoje» fica com a
              largura toda — em vez de um número vazio ao lado dele. */}
          {st.pontosNasTarefas ? (
          <View style={{
            flex: 1, backgroundColor: t.card, borderRadius: R.card,
            borderWidth: 1, borderColor: t.border,
            paddingHorizontal: 16, paddingVertical: 14, gap: 8,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{
              fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.text3,
            }}>Pontos da semana</Text>
            <Text style={{
              fontFamily: FONT.display, fontSize: 26, fontWeight: '600', color: t.text2,
            }}>{weekPts}</Text>
          </View>
          ) : null}
        </View>
      </View>

      {/* Lista de tarefas */}
      <View style={{ marginTop: S.xl, gap: S.md }}>
        <View style={{ paddingHorizontal: 16 }}>
          <SectionTitle t={t}>As Minhas Tarefas</SectionTitle>
        </View>
        {tasksByKid.length > 0 ? (
          /* Linhas planas, sem cartão — desenho C (09/09/2026). A linha já
             traz a sua divisória. */
          <View style={{ marginHorizontal: 16 }}>
            {tasksByKid.map((task, idx) => (
              <KidTaskRow
                key={task.id}
                t={t}
                task={task}
                kid={kid}
                // ⚠ Pela loja, como CRIANÇA: a tarefa fica «a confirmar», não
                // feita — é um adulto que a dá por feita, e são os pontos dele
                // que contam (`docs/funcionalidades.md` §3.12). Escrevia `done`
                // directamente: a criança confirmava-se a si própria, e nada
                // subia ao servidor. Apanhado em 10/09/2026.
                onPress={() => st.tapTask(task.id, true)}
              />
            ))}
          </View>
        ) : (
          <Empty t={t} icon="checkSquare" title="Sem tarefas agora" sub="Bom trabalho!" />
        )}
      </View>
    </ScrollView>
  );
}

// ── As Compras da criança ────────────────────────────────────────────────────
//
// 11/09/2026 — a documentação dizia «a lista é de todos: as crianças também
// pedem artigos», e a app da criança não tinha lista nenhuma. Passa a ter: a
// lista da casa, corredor a corredor, e «Pedir um artigo». SEM preços — o modo
// criança não mostra dinheiro da casa — e SEM as prendas: um artigo «só adultos» não
// chega sequer ao telemóvel dela (INVARIANTE #3, na regra de leitura do
// servidor). O filtro daqui é para a demonstração sem servidor e para o que já
// estivesse gravado neste aparelho.
function FolhaPedirArtigo({ t, kid, onClose }) {
  const { criarArtigo, seccoes } = useStore();
  const [rotulo, setRotulo] = useState('');
  const [seccao, setSeccao] = useState(seccoes[0] || null);
  const pronto = !!rotulo.trim();
  const pedir = () => {
    if (!pronto) return;
    // Pela loja, como tudo o resto: é ela que o manda ao servidor, com o
    // `pedido_por` da criança. A visibilidade é sempre «familia» — a criança
    // não esconde artigos aos adultos.
    criarArtigo({ label: rotulo, section: seccao || seccoes[0], est: 0, staple: false, by: kid, vis: 'familia' });
    onClose();
  };
  return (
    <Sheet t={t} title="Pedir um artigo" sub="Entra na lista da casa, com o seu nome" onClose={onClose}
      action={<Primary t={t} comum label="Pedir" disabled={!pronto} onPress={pedir} />}>
      <View style={{ gap: S.lg }}>
        <View style={{ gap: S.sm }}>
          <Label t={t}>Artigo</Label>
          <TextInput value={rotulo} onChangeText={setRotulo} maxLength={60}
            placeholder="Ex: Iogurtes de morango" placeholderTextColor={t.text3}
            accessibilityLabel="Nome do artigo"
            style={{ minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body, fontSize: 16,
              color: t.text1, borderRadius: R.row, borderWidth: 1, borderColor: t.border, backgroundColor: t.card }} />
        </View>
        <View style={{ gap: S.sm }}>
          <Label t={t}>Corredor</Label>
          <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
            {seccoes.map(sec => (
              <Choice key={sec} t={t} label={sec} selected={seccao === sec} onPress={() => setSeccao(sec)} />
            ))}
          </View>
        </View>
      </View>
    </Sheet>
  );
}

function KidComprasView({ t, kid }) {
  const st = useStore();
  const { s, allItems, seccoes } = st;
  const [aPedir, setAPedir] = useState(false);
  const visiveis = allItems().filter(i => i.vis !== 'adultos');
  const stateOf = (i) => s.status[i.id] || (i.real ? 'done' : 'open');

  return (
    <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ paddingBottom: S.xl }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <Primary t={t} comum label="Pedir um artigo" onPress={() => setAPedir(true)} />
      </View>

      {seccoes.map(sec => {
        const rows = visiveis.filter(i => i.s === sec);
        if (!rows.length) return null;
        return (
          <View key={sec} style={{ marginTop: S.xl, gap: S.md }}>
            <View style={{ paddingHorizontal: 16 }}>
              <SectionTitle t={t}>{sec}</SectionTitle>
            </View>
            <View style={{ marginHorizontal: 16 }}>
              {rows.map(i => {
                const done = stateOf(i) === 'done';
                return (
                  <Linha key={i.id} t={t}
                    faixa={done ? t.state.okBorder : undefined}
                    tinta={done ? t.state.okBg : undefined}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
                      <Icon name={done ? 'checkCircle' : 'infoCircle'} size={24} color={done ? t.state.ok : t.text3} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text numberOfLines={2} style={{ fontFamily: FONT.body, fontSize: 16, color: done ? t.text3 : t.text2,
                          textDecorationLine: done ? 'line-through' : 'none' }}>{i.label}</Text>
                        {i.by ? <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>{i.by}</Text> : null}
                      </View>
                    </View>
                  </Linha>
                );
              })}
            </View>
          </View>
        );
      })}

      {!visiveis.length ? (
        <View style={{ paddingHorizontal: 16, paddingTop: S.xl }}>
          <Empty t={t} icon="storefront" title="A lista está vazia" hint="Peça o primeiro artigo." />
        </View>
      ) : null}

      {aPedir ? <FolhaPedirArtigo t={t} kid={kid} onClose={() => setAPedir(false)} /> : null}
    </ScrollView>
  );
}

// ── O objetivo do cofre ──────────────────────────────────────────────────────
//
// «Bicicleta, 120 €»: a criança escolhe para que junta, e vê a barra a
// encher com a semanada e os bónus. (11/09/2026 — a segunda das dez
// funcionalidades.) O juntado é o saldo do cofre; esta folha só guarda o nome
// e o alvo, pela loja.
function FolhaDoObjetivo({ t, kid, atual, onClose }) {
  const { definirObjetivo, apagarObjetivo } = useStore();
  const [nome, setNome] = useState(atual?.nome || '');
  const [alvo, setAlvo] = useState(atual ? String(atual.alvo).replace('.', ',') : '');
  const [erro, setErro] = useState(null);
  const guardar = () => {
    const e = definirObjetivo(kid, { nome, alvo });
    if (e) { setErro(e); return; }
    onClose();
  };
  const campo = {
    minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body, fontSize: 16,
    color: t.text1, borderRadius: R.row, borderWidth: 1, borderColor: t.border, backgroundColor: t.card,
  };
  return (
    <Sheet t={t} title={atual ? 'Mudar o objetivo' : 'O meu objetivo'} sub="Para que está a juntar?" onClose={onClose}
      action={<Primary t={t} comum label={atual ? 'Guardar' : 'Começar a juntar'} disabled={!nome.trim() || !alvo} onPress={guardar} />}>
      <View style={{ gap: S.lg }}>
        <View style={{ gap: S.sm }}>
          <Label t={t}>O que quer</Label>
          <TextInput value={nome} onChangeText={(v) => { setErro(null); setNome(v); }} maxLength={60}
            placeholder="Ex: Bicicleta" placeholderTextColor={t.text3} accessibilityLabel="Nome do objetivo" style={campo} />
        </View>
        <View style={{ gap: S.sm }}>
          <Label t={t}>Quanto custa (€)</Label>
          <TextInput value={alvo} onChangeText={(v) => { setErro(null); setAlvo(v); }} keyboardType="decimal-pad" maxLength={8}
            placeholder="120,00" placeholderTextColor={t.text3} accessibilityLabel="Valor do objetivo em euros" style={campo} />
        </View>
        {erro ? <Tile t={t} kind="warn">{erro}</Tile> : null}
        {atual ? (
          <Pressable onPress={() => { apagarObjetivo(kid); onClose(); }} accessibilityRole="button"
            accessibilityLabel="Deixar de ter objetivo"
            style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.text3 }}>Deixar de ter objetivo</Text>
          </Pressable>
        ) : null}
      </View>
    </Sheet>
  );
}

// A frase do ritmo: quanto falta, e quantas semanadas ao ritmo de agora.
// ⚠ Até um ano, conta-se em semanadas; acima disso diz-se «mais de um ano».
// Medido com a casa a sério: 118,80 € a 0,30 € por semana davam «396
// semanadas», que é verdade e é a frase mais desanimadora que se pode dizer a
// uma criança de sete anos. O número certo, dito de outra maneira.
const fraseDoObjetivo = (falta, semanada) => {
  if (falta <= 0) return 'Já tem o suficiente!';
  if (!(semanada > 0)) return `Faltam ${EUR(falta)}.`;
  const semanas = Math.ceil(falta / semanada);
  if (semanas > 52) return `Faltam ${EUR(falta)} · mais de um ano ao ritmo de agora.`;
  return `Faltam ${EUR(falta)} · ${plural(semanas, 'semanada', 'semanadas')} ao ritmo de agora.`;
};

// Vista do Cofre
function KidVaultView({ t, kid }) {
  const st = useStore();
  const { s, set } = st;
  const [requested, setRequested] = useState(false);
  const [aMudarObjetivo, setAMudarObjetivo] = useState(false);
  const objetivo = (s.objetivosCofre || {})[kid] || null;

  // O saldo é a soma dos movimentos, e a lista mostra as mesmas parcelas —
  // não uma lista à parte, que dantes contradizia o total.
  const moves = st.vaultMoves(kid);
  const balance = st.vaultOf(kid);
  const pending = (st.kidPts[kid] ?? 0) - (s.paidPts[kid] ?? 0);
  const pendingEur = pending * s.pointValue;

  return (
    <ScrollView style={{ flex: 1, minHeight: 0 }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, gap: S.lg, paddingBottom: S.xl }}>

      {/* Saldo. Na referência 29 é um cartão verde com o número em texto
          normal, alinhado à esquerda — não um número verde centrado num
          cartão branco. O verde é do cartão, não do algarismo: assim o
          dinheiro lê-se como dinheiro e não como um estado de sucesso. */}
      <Card t={t} style={{ gap: S.sm, backgroundColor: t.state.okBg,
        borderColor: t.state.okBorder }}>
        <Text style={{
          fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.text3,
        }}>O meu cofre</Text>
        <Text style={{
          fontFamily: FONT.display, fontSize: 38, fontWeight: '400',
          color: t.text1, lineHeight: 46,
        }}>{EUR(balance)}</Text>
        {/* ⚠ E só se os pontos valerem euros. A 0 € isto prometia «Mais
            0,00 € quando a semanada for paga», que é uma promessa vazia dita a
            uma criança. */}
        {st.pontosNasTarefas && pending > 0 && s.pointValue > 0 ? (
          <Text style={{
            fontFamily: FONT.ui, fontSize: 12.5, color: t.text3,
          }}>Mais {EUR(pendingEur)} quando a semanada for paga.</Text>
        ) : null}
      </Card>

      {/* O objetivo: para que está a juntar. A barra é o saldo contra o alvo,
          e a frase diz quantas semanadas faltam ao ritmo de agora — uma
          semanada é o que os pontos por pagar valem hoje. */}
      <View style={{ gap: S.md }}>
        <SectionTitle t={t}>O meu objetivo</SectionTitle>
        {objetivo ? (
          <Card t={t} style={{ gap: S.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: S.md }}>
              <Text style={{ flex: 1, fontFamily: FONT.display, fontSize: 17, fontWeight: '500', color: t.text1 }}
                numberOfLines={1}>{objetivo.nome}</Text>
              <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: t.text3 }}>
                {EUR(Math.max(0, balance))} de {EUR(objetivo.alvo)}
              </Text>
            </View>
            {/* A barra são duas parcelas em `flex` — a cheia e a que falta —
                e não uma largura em percentagem: dinheiro nesta app nunca se
                diz em percentagem, nem numa largura. O valor lido em voz é o inteiro. */}
            {(() => {
              const cheio = Math.min(1, Math.max(0, balance) / objetivo.alvo);
              const inteiro = Math.round(cheio * 100);
              return (
                <View style={{ height: 8, borderRadius: R.pill, backgroundColor: t.subtle, overflow: 'hidden', flexDirection: 'row' }}
                  accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: inteiro }}>
                  <View style={{ flex: inteiro, backgroundColor: t.state.ok }} />
                  <View style={{ flex: 100 - inteiro }} />
                </View>
              );
            })()}
            <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
              {fraseDoObjetivo(objetivo.alvo - balance, st.pontosNasTarefas ? pendingEur : 0)}
            </Text>
            <Pressable onPress={() => setAMudarObjetivo(true)} accessibilityRole="button" accessibilityLabel="Mudar o objetivo"
              style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.actFg }}>Mudar o objetivo</Text>
            </Pressable>
          </Card>
        ) : (
          <Pressable onPress={() => setAMudarObjetivo(true)} accessibilityRole="button" accessibilityLabel="Escolher um objetivo"
            style={({ pressed }) => ({
              minHeight: 52, borderRadius: R.row, borderWidth: 1.5, borderColor: t.accent, borderStyle: 'dashed',
              backgroundColor: pressed ? t.subtle : 'transparent',
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
            })}>
            <Icon name="smile" size={20} color={t.titulo} />
            <Text style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: '700', color: t.actFg }}>Escolher um objetivo</Text>
          </Pressable>
        )}
      </View>

      {aMudarObjetivo ? <FolhaDoObjetivo t={t} kid={kid} atual={objetivo} onClose={() => setAMudarObjetivo(false)} /> : null}

      {/* Secção de Movimentos */}
      <View>
        <SectionTitle t={t}>Movimentos</SectionTitle>
        <View>
          {moves.length > 0 ? moves.map(m => (
            <VaultTransaction key={m.id} t={t} entry={m} />
          )) : (
            <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
              <Text style={{
                fontFamily: FONT.body, fontSize: 15, color: t.text3, textAlign: 'center',
              }}>Sem movimentos ainda</Text>
            </View>
          )}
        </View>
      </View>

      {/* Botão de pedido */}
      <View style={{ gap: S.md }}>
        {!requested ? (
          /* Contornado com o smile, como na referência: é um pedido a um
             adulto, não a ação principal do ecrã — o cheio disputava a
             atenção com o próprio saldo. */
          <Pressable onPress={() => setRequested(true)} accessibilityRole="button"
            accessibilityLabel="Pedir para usar o dinheiro"
            style={({ pressed }) => ({
              minHeight: 52, borderRadius: R.row, borderWidth: 1.5, borderColor: t.accent,
              backgroundColor: pressed ? t.subtle : 'transparent',
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
            })}>
            <Icon name="smile" size={20} color={t.titulo} />
            <Text style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: '700',
              color: t.actFg, letterSpacing: 0.3 }}>Pedir para Usar o Dinheiro</Text>
          </Pressable>
        ) : (
          <>
            <Pressable accessibilityRole="button" disabled
              accessibilityLabel="Pedido a aguardar autorização" style={{
              minHeight: 52, borderRadius: R.row, borderWidth: 1,
              borderColor: t.border, backgroundColor: t.subtle,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{
                fontFamily: FONT.display, fontSize: 15, fontWeight: '700',
                color: t.text3,
              }}>Pedido a Aguardar Autorização</Text>
            </Pressable>

            <Card t={t} style={{ backgroundColor: t.tileInfo, borderLeftWidth: 4, borderLeftColor: t.state.info }}>
              <Text style={{
                fontFamily: FONT.body, fontSize: 14, lineHeight: 21, color: t.text2,
              }}>Pedido enviado. A Rita ou o Tomás têm de autorizar antes de poder usar o dinheiro.</Text>
            </Card>
          </>
        )}
      </View>
    </ScrollView>
  );
}

// Componente principal
export default function KidApp({ kid, kidTab, setKidTab, onLogout }) {
  const st = useStore();
  const { s, set, allTasks } = st;
  const sysDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();

  // Cor da criança — fica na BOLA do avatar, escurecida até a inicial branca
  // se ler por cima (`chromeDaCrianca`; o #1890FF do Léo dava 3,24 com o
  // branco, medido em 09/09/2026). É ela que diz quem entrou.
  //
  // ⚠ O cabeçalho e o rodapé levavam esta cor, e não o `chrome` do esquema: a
  // criança mudava de esquema e o cabeçalho ficava azul. O dono da casa
  // perguntou porquê em 10/09/2026 e decidiu: seguem o esquema, como nos
  // adultos, e a cor do membro fica na bola.
  const kidColor = corDoMembro(kid);
  const bola = chromeDaCrianca(kidColor);

  // Tema: o da PRÓPRIA criança — esquema e aspeto da linha dela em
  // `preferencias`, que o servidor devolve a quem entra e o `puxarCasa` põe em
  // `schemeByUser[kid]` e `themeByUser[kid]`.
  //
  // ⚠ Era `buildTheme(0, dark)`: o aspeto seguia a criança e o esquema ficava
  // preso no Violeta, fosse qual fosse o `esquema_cor` guardado. Uma preferência
  // que o servidor guarda, o `store` lê e o ecrã ignora é a forma de
  // «escrita que não se lê de volta» aplicada ao tema — deu-se por ela em
  // 10/09/2026, ao tentar varrer o modo criança nos seis esquemas e ver o
  // título «As Minhas Tarefas» em Violeta com o servidor a dizer Cião.
  const mode = (s.themeByUser[kid]) || 'claro';
  const dark = mode === 'escuro' || (mode === 'sistema' && sysDark);
  const t = buildTheme(s.schemeByUser[kid] ?? 0, dark);
  const onC = onChrome(t.chrome);
  const tasks = allTasks();
  const [perfil, setPerfil] = useState(false);

  // ⚠ A coluna vive na PRÓPRIA raiz, como no App.jsx — um <View> a mais em
  // volta dela é o erro #1 do CLAUDE.md. Sem isto a app da criança ia de ponta
  // a ponta do monitor enquanto a dos adultos vivia numa coluna de 460.
  return (
    <View style={{ flex: 1, backgroundColor: t.page,
      width: '100%', maxWidth: LARGURA_APP, marginHorizontal: 'auto' }}>

      {/* Cabeçalho */}
      <View style={{
        flexGrow: 0, flexShrink: 0, flexBasis: 'auto',
        backgroundColor: t.chrome, overflow: 'hidden',
        paddingTop: insets.top + 10, paddingBottom: 14, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', gap: 12, ...elev(3),
      }}>
        {/* A bola leva a cor do MEMBRO escurecida e a inicial branca — é a
            única coisa no cabeçalho que diz quem entrou, agora que o fundo é o
            do esquema. O anel branco de 2 px separa-a do cabeçalho quando os
            dois são da mesma família (o azul do Léo sobre o Céu). Era branca com
            a inicial na cor do cabeçalho; antes disso, branco a 22 %: 2,51.

            E é ELA que abre «O meu perfil» — o mesmo gesto do avatar dos
            adultos, que abre o Perfil. Abria só «O meu PIN» até 10/09/2026; o
            PIN passou a ser uma das linhas da folha. Alvo de 44 à volta da bola
            de 40. */}
        <Pressable onPress={() => setPerfil(true)} accessibilityRole="button"
          accessibilityLabel="O meu perfil" accessibilityHint="O avatar, a cor do perfil e o PIN"
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{
            width: 40, height: 40, borderRadius: R.pill,
            backgroundColor: bola,
            borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            {/* A figura escolhida, se houver — senão a inicial. Sem isto a
                criança escolhia uma figura em «O meu perfil» e o seu próprio
                cabeçalho continuava a mostrar a letra (provado em 10/09/2026). */}
            {st.membros[kid]?.figura ? (
              <Figura nome={st.membros[kid].figura} size={24} color="#FFFFFF" />
            ) : (
              <Text style={{
                fontFamily: FONT.display, fontSize: 17, fontWeight: '500',
                color: '#FFFFFF',
              }}>{kid.charAt(0)}</Text>
            )}
          </View>
        </Pressable>

        <View style={{ flex: 1, gap: 1 }}>
          <Text style={{
            fontFamily: FONT.display, fontSize: 18, fontWeight: '500',
            color: '#FFFFFF',
          }}>Olá, {kid}</Text>
          <Text numberOfLines={1} style={{
            fontFamily: FONT.ui, fontSize: 12, color: onC,
          }}>
            {(() => {
              const noCofre = `${EUR(st.vaultOf(kid))} no cofre`;
              if (!st.pontosNasTarefas) return noCofre;
              const p = (st.kidPts[kid] ?? 0) - (s.paidPts[kid] ?? 0);
              return `${plural(p, 'ponto', 'pontos')} por pagar · ${noCofre}`;
            })()}
          </Text>
        </View>

        <Pressable onPress={onLogout} accessibilityRole="button"
          accessibilityLabel="Terminar sessão"
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="logout" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Conteúdo */}
      <View style={{ flex: 1, minHeight: 0 }}>
        {kidTab === 'tarefas' ? (
          <KidTasksView t={t} kid={kid} tasks={tasks} />
        ) : kidTab === 'compras' ? (
          <KidComprasView t={t} kid={kid} />
        ) : (
          <KidVaultView t={t} kid={kid} />
        )}
      </View>

      {/* Rodapé — três separadores (as Compras entraram em 11/09/2026) */}
      <View style={{
        flexGrow: 0, flexShrink: 0, flexBasis: 'auto',
        backgroundColor: t.chrome, flexDirection: 'row',
        paddingTop: 6, paddingBottom: Math.max(insets.bottom, 10), paddingHorizontal: 4,
      }}>
        {[
          { key: 'tarefas', label: 'Tarefas', icon: 'checkSquare' },
          { key: 'compras', label: 'Compras', icon: 'storefront' },
          { key: 'cofre', label: 'O Meu Cofre', icon: 'bank' },
        ].map(x => {
          const on = kidTab === x.key;
          return (
            <Pressable key={x.key} onPress={() => setKidTab(x.key)}
              accessibilityRole="tab" accessibilityLabel={x.label}
              accessibilityState={{ selected: on }}
              style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Icon name={x.icon} size={24} color={on ? '#FFFFFF' : onC} />
              <Text style={{
                fontFamily: FONT.ui, fontSize: 11, fontWeight: '600',
                color: on ? '#FFFFFF' : onC,
              }}>{x.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* A folha vive DENTRO da raiz, com o rodapé por baixo dela (INVARIANTE #1). */}
      {perfil ? <FolhaDoPerfil t={t} kid={kid} onClose={() => setPerfil(false)} /> : null}
    </View>
  );
}
