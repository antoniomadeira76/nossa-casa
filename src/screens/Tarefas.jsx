import React, { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { subtituloDaTarefa, legendaDaTarefa, plural, TODAY_KEY } from '../format';

import { SectionTitle, Linha, Label, Pill, Avatar, Empty, AddButton, Primary, Segmented, Toggle, usePaged, Pager, Tap, avatarDe, BotaoCompacto, NumField, MarcaDeEstado, MARCA } from '../ui';
import Icon from '../Icon';
import Sheet from '../Sheet';
import Confirm from '../Confirm';
import ListaArrastavel, { ATRASO_PARA_PEGAR } from '../ListaArrastavel';
import NovaTarefa from '../sheets/NovaTarefa';
import FiltroDeMembros, { EscolherPessoa } from '../FiltroDeMembros';
import { useAcaoDoEcra } from '../AcaoDoEcra';

// Urgência: a caixa do número leva a cor, e a lista ordena-se por ela.
// A forma acompanha a cor — cheia, tracejada, contorno — para não depender do matiz.
const URG = [
  // ⚠ `#CE0002` (o `errDeep`) e não `#FF4D4F`: a caixa é CHEIA e leva o número
  // a branco, e branco sobre #FF4D4F dá 3,27 — a 11 px pede 4,5. Sobre #CE0002
  // dá 5,79, e é o mesmo par do botão destrutivo do `Confirm`.
  // ⚠ Tokens do tema, não cores escritas (revisão de 14/09/2026): eram
  // `#CE0002`, `#FAAD14` e `#D9D9D9` à mão, e no modo escuro a borda cinzenta
  // do «Sem pressa» ficava a mesma sobre a página escura. `errDeep` é o par
  // do botão destrutivo do `Confirm` (branco por cima dá 5,79 a 11 px).
  { key: 0, label: 'Urgente',    fill: true,  cor: (t) => t.state.errDeep, dash: false },
  // ⚠ As duas CONTORNADAS levam tokens de TEXTO, e não a cor-base nem a
  // borda (16/09/2026). A caixa cheia do «Urgente» leva branco por cima e
  // aguenta o `errDeep`; as outras duas são só um traço de 1,5 sobre a página,
  // e aí o `warn` mede 1,77:1 e o `border` 1,32 — a caixa do «Sem pressa» era
  // um contorno que quase não existia, com o número lá dentro a boiar.
  { key: 1, label: 'Normal',     fill: false, cor: (t) => t.state.warnTexto, dash: true },
  { key: 2, label: 'Sem pressa', fill: false, cor: (t) => t.text3, dash: false },
];

// `abrir` é o id de uma tarefa cuja folha de gestão deve estar aberta à
// chegada — é o que faz uma tarefa tocada no Início levar àquela tarefa.
export default function Tarefas({ t, user, abrir }) {
  const st = useStore();
  const { s, set, allTasks, dueOf, isRecurring, removerTarefa, membros: MEMBERS,
          membrosDaCasa, criancas, pontosNasTarefas, editarTarefa, mudarUrgencia, mudarPrazo,
          trocasDeHoje, desfazerTroca, deNome } = st;
  // As trocas de tarefas entre as crianças, de hoje — um adulto vê e anula.
  const trocas = trocasDeHoje();
  const [filter, setFilter] = useState('Todos');
  const [manage, setManage] = useState(abrir || null);
  React.useEffect(() => { if (abrir) { setManage(abrir); setRascunho({ title: null, pts: null }); } }, [abrir]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [aApagar, setAApagar] = useState(null);
  // O rascunho do TÍTULO e dos PONTOS da tarefa aberta (15/09/2026 — «quando se
  // faz editar, o título não tem opção de alterar»). `null` é «ainda não se
  // tocou»: mostra-se o da tarefa. Os outros campos aplicam-se ao toque, como
  // sempre; estes dois juntam-se e vão no «Guardar alterações» — aplicar a
  // cada tecla era uma escrita no servidor por cada letra do nome.
  const [rascunho, setRascunho] = useState({ title: null, pts: null });

  const all = allTasks();
  const shown = filter === 'Todos' ? all : all.filter(x => x.who === filter);
  const pg = usePaged(shown);
  const task = all.find(x => x.id === manage);

  // ⚠ INVARIANTE #2: os pontos de uma tarefa que JÁ RENDEU não se mudam.
  //
  // O `pontosGanhos` da loja soma `t.pts` — o valor de AGORA — sobre cada
  // marcação confirmada do livro (`feitas`) ou sobre o `done` de hoje quando
  // não há servidor. Pôr 8 numa tarefa de 5 que a criança já fez reescreve o
  // passado: os pontos dela sobem sozinhos, e baixar de 5 para 2 com os pontos
  // já pagos deixa o `kidPts - paidPts` NEGATIVO — a criança passa a dever
  // pontos à casa por uma correção de um adulto. É o mesmo defeito que o
  // apagar teve, e a resposta é a mesma: um ponto ganho não se desfaz.
  //
  // Por isso os pontos só se mudam ENQUANTO a tarefa não rendeu nada. Quem
  // quiser mudar o valor de uma tarefa que já rende cria outra — e a de antes
  // fica valendo o que valia.
  const jaRendeu = (id) => !!s.done[id]
    || Object.keys(s.feitas || {}).some(c => c.split('|')[0] === id);

  const tituloDoRascunho = task ? (rascunho.title ?? task.title) : '';
  const pontosDoRascunho = task ? (rascunho.pts ?? (task.pts || 0)) : 0;
  const rascunhoMudou = !!task && (tituloDoRascunho.trim() !== task.title || pontosDoRascunho !== (task.pts || 0));
  const fecharTarefa = () => { setManage(null); setRascunho({ title: null, pts: null }); };
  const guardarTarefa = () => {
    if (!task) return;
    if (!tituloDoRascunho.trim()) return;
    if (rascunhoMudou) {
      editarTarefa(task.id, {
        ...(tituloDoRascunho.trim() !== task.title ? { title: tituloDoRascunho.trim() } : {}),
        // ⚠ E os pontos NUNCA sobem se a tarefa já rendeu, mesmo que o
        // rascunho traga um valor — o campo está escondido, mas a guarda vive
        // aqui, que é onde a escrita acontece.
        ...(pontosDoRascunho !== (task.pts || 0) && !jaRendeu(task.id) ? { pts: pontosDoRascunho } : {}),
      });
    }
    fecharTarefa();
  };

  // A tarefa que está a ser apagada, e o que ela já rendeu.
  //
  // ⚠ Lê-se do `all` e não do `task`: a folha de gestão fecha quando se
  // confirma, e a pergunta tem de continuar a saber de que tarefa fala.
  const aApagarTarefa = all.find(x => x.id === aApagar);
  const pontosQueFicam = aApagarTarefa && s.done[aApagarTarefa.id]
    && criancas.includes(aApagarTarefa.who) ? (aApagarTarefa.pts || 0) : 0;

  return (
    <>
      {/* ── O filtro por membro: «Todos» e um AVATAR por pessoa ──────────────
          Opção A de design/filtro-de-membros.dc.html (12/09/2026). Vive em
          `FiltroDeMembros.jsx` desde 13/09/2026, porque a Saúde passou a usar o
          mesmo — um desenho, um sítio. */}
      <FiltroDeMembros t={t} membros={membrosDaCasa} escolhido={filter} onEscolher={setFilter}
        MEMBERS={MEMBERS} rotuloDe={(n) => `Mostrar só as tarefas ${deNome(n)} ${n}`} />

      {/* ⚠ A «Semanada das Crianças» SAIU daqui (10/09/2026). O dono da casa
          achou que não fazia sentido junto das tarefas, e tinha razão: o que
          liga as duas coisas é só a origem dos pontos. O valor do ponto, o
          que está por pagar, o saldo e a folha do cofre são DINHEIRO da casa
          — e a Documentação já os descrevia no Dinheiro. Vive agora lá, como
          «Cofres das Crianças». Aqui ficam só as tarefas; os pontos de cada
          uma leem-se na pastilha da linha e no filtro por membro. */}

      <View>
        {/* O nome de quem se filtra vem para aqui — a bola do filtro não o diz. */}
        <SectionTitle t={t} right={<Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>por urgência</Text>}>
          {filter === 'Todos' ? 'Rotinas e Tarefas' : `Rotinas e Tarefas · ${filter}`}
        </SectionTitle>
        {shown.length === 0 ? (
          <Empty t={t} icon="checkSquare" title="Sem tarefas nesta vista."
            hint="Use Acrescentar tarefa para criar a primeira rotina." />
        ) : (
          <View>
            {/* A ordem dentro do grupo é da mão. Ver `ListaArrastavel`: a
                pressão longa arma, o dedo move, e a tarefa nunca sai do seu
                grupo de urgência — a urgência manda nos grupos (INVARIANTE #6)
                e a mão manda dentro do seu.

                ⚠ Não há página para virar, e não é por preguiça. Arrasta-se o
                que está NESTA página, e o `reordenarTarefas` trata do resto:
                percorre o grupo inteiro e põe as arrastadas nos lugares que
                eram delas, deixando as das outras páginas onde estavam. É a
                mesma volta que faz a vista filtrada por membro funcionar, e é
                por isso que uma reordenação na página 1 não desarruma a 2. */}
            <ListaArrastavel
              itens={pg.slice}
              grupoDe={(x) => x.urgency}
              espaco={0}
              aoLargar={(ids) => st.reordenarTarefas(ids)}
              render={(x, { arrastando, armar }) => {
              const idx = shown.indexOf(x) + 1;
              const done = !!s.done[x.id], pend = !!s.pending[x.id];
              const u = URG[x.urgency] || URG[1];
              const d = dueOf(x);
              const rec = isRecurring(x);
              // A urgência vive no distintivo do número — cor E forma —, não
              // também na borda do cartão. Na referência 06 os cartões são
              // lisos e só o distintivo muda; com a urgência nos dois sítios a
              // lista fica às riscas e o distintivo deixa de ser o sinal,
              // passa a ser redundante. A borda diz só o estado: feita, ou à
              // espera de confirmação.
              return (
                <Linha key={x.id} t={t}
                  // O estado que era a borda do cartão passa a ser a faixa e a
                  // tinta da linha (desenho C, 09/09/2026): verde feita, azul à
                  // espera, o acento enquanto se arrasta.
                  // ⚠ «A aguardar confirmação» é ÂMBAR e já não azul
                  // (15/09/2026). A marca da linha passou a ser um relógio em
                  // disco âmbar, e uma faixa azul por baixo de uma marca âmbar
                  // são duas cores para um estado só. Âmbar é o que esta app usa
                  // para «falta alguém decidir», que é exactamente isto — o azul
                  // de informação é passivo. A mesma troca no Início e na app da
                  // criança, para o estado ter UMA cor.
                  faixa={arrastando ? t.accent : done ? t.state.okBorder : pend ? t.state.warn : undefined}
                  tinta={arrastando ? t.subtle : done ? t.state.okBg : undefined}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {/* ⚠ É o `onLongPress` DESTE Pressable que arma o arrasto.
                        Não há alça, e é de propósito: uma alça era o sexto
                        alvo numa linha que já tem cinco (erro #6 do
                        CLAUDE.md). O toque curto continua a marcar a tarefa —
                        a `ListaArrastavel` só toma conta do dedo depois de
                        estar armada. */}
                    <Pressable onPress={() => st.tapTask(x.id, false)} accessibilityRole="button"
                      onLongPress={() => armar(x.id)} delayLongPress={ATRASO_PARA_PEGAR}
                      // ⚠ O verbo tem de ser o que o toque FAZ. Dizia «Marcar» a uma tarefa já
                      // feita, que o toque vai DESmarcar — e acrescentava
                      // «concluída» a seguir, na mesma frase.
                      accessibilityLabel={`${done ? 'Desmarcar' : pend ? 'Confirmar' : 'Marcar'} ${x.title} · ${u.label}`}
                      accessibilityHint="Mantenha premido para mudar a ordem dentro do grupo de urgência"
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minHeight: 44 }}>
                      {/* caixa do número: cor E forma dizem a urgência */}
                      <View style={{ width: 20, height: 20, borderRadius: R.sm,
                        backgroundColor: u.fill ? u.cor(t) : 'transparent',
                        borderWidth: u.fill ? 0 : 1.5, borderStyle: u.dash ? 'dashed' : 'solid',
                        borderColor: u.cor(t), alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontFamily: FONT.ui, fontSize: 11, fontWeight: '700',
                          color: u.fill ? '#FFFFFF' : t.text2 }}>{idx}</Text>
                      </View>
                      {/* Marca de estado, entre o número e o avatar: círculo
                          vazio por fazer, relógio em disco âmbar à espera de
                          confirmação, visto do acento quando feita. Ver
                          `MarcaDeEstado` — as três alinham no mesmo diâmetro. */}
                      <MarcaDeEstado t={t} size={MARCA}
                        estado={done ? 'marcado' : pend ? 'aguarda' : 'por-marcar'} />
                      <Avatar {...avatarDe(x.who, MEMBERS[x.who], t.text3)} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text numberOfLines={2} style={{ fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>{x.title}</Text>
                        {/* ⚠ A legenda vem do `legendaDaTarefa` e já não está
                            escrita aqui: a mesma frase vivia também no Início,
                            e uma tarefa de uma vez só marcada não dizia nada de
                            estar feita em nenhum dos dois. */}
                        <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11.5,
                          color: done ? t.text3
                            : d && d.late ? t.state.errTexto : d && d.soon ? t.state.warnTexto : t.text3 }}>
                          {legendaDaTarefa(x, d, { feita: done, pendente: pend, recorrente: rec })}
                        </Text>
                      </View>
                      {/* Pastilha contornada, como na referência: o amarelo
                          cheio competia com o distintivo da urgência. */}
                      {pontosNasTarefas && x.pts > 0 && !done ? <Pill label={`${x.pts} pt`} fg={t.text2} bg={t.card} border={t.border} /> : null}
                    </Pressable>
                    <Tap onPress={() => setManage(x.id)} label={`Gerir ${x.title}`} size={44}>
                      <Icon name="edit" size={20} color={t.text3} />
                    </Tap>
                  </View>
                </Linha>
              );
              }}
            />
            <View style={{ marginTop: S.md }}>
              <Pager t={t} pg={pg} />
            </View>
          </View>
        )}
      </View>

      {/* ── As trocas de hoje ──────────────────────────────────────────────
          «O lixo pelas plantas, só hoje»: o Léo propôs, a Mia aceitou, e a
          lista de cima já mostra o avatar de quem faz cada uma hoje. Um adulto
          anula — apaga a linha, e cada tarefa volta a quem era. Só aparece
          quando há trocas (12/09/2026). */}
      {trocas.length > 0 ? (
        <View>
          <SectionTitle t={t}>Trocas de Hoje</SectionTitle>
          {trocas.map(tr => (
            <Linha key={tr.id} t={t}>
              <View style={{ gap: S.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
                  <Icon name="swap" size={20} color={tr.aceiteEm ? t.state.okTexto : t.state.infoTexto} />
                  <Text style={{ flex: 1, fontFamily: FONT.body, fontSize: 15, lineHeight: 21, color: t.text2 }}>
                    {`${tr.quemDe} e ${tr.quemPara}: «${tr.tarefaDe}» por «${tr.tarefaPara}»`}
                  </Text>
                  {tr.aceiteEm
                    ? <Pill label="aceite" fg={t.state.okTexto} bg={t.state.okBg} border={t.state.okBorder} />
                    : <Pill label="por aceitar" fg={t.state.infoDeep} bg={t.state.infoBg} border={t.state.info} />}
                </View>
                <BotaoCompacto t={t} label="Anular a troca" onPress={() => desfazerTroca(user, tr.id)} />
              </View>
            </Linha>
          ))}
        </View>
      ) : null}

      {/* ⚠ O «acrescentar» vive na barra FIXA do fundo do ecrã (15/09/2026:
          «move o botão para o fundo e assim aproveita-se mais o ecrã»). Estava
          no fim do conteúdo, depois da lista e da paginação: com oito tarefas
          era preciso rolar até ao fim para acrescentar a nona. */}
      {useAcaoDoEcra(<AddButton t={t} label="acrescentar tarefa" onPress={() => setSheetOpen(true)} />)}

      {sheetOpen ? (
        <Sheet t={t} title="Nova Tarefa" sub="Criar uma tarefa recorrente ou pontual"
          onClose={() => setSheetOpen(false)}>
          <NovaTarefa t={t} user={user} onClose={() => setSheetOpen(false)} />
        </Sheet>
      ) : null}

      {task ? (
        <Sheet t={t} title={task.title} sub={subtituloDaTarefa(task)} onClose={fecharTarefa}
          action={<Primary t={t} comum label="Guardar alterações"
            sub={!tituloDoRascunho.trim() ? 'Escreva um título para a tarefa' : rascunhoMudou ? 'O título e os pontos ficam como escreveu' : null}
            disabled={!tituloDoRascunho.trim()} onPress={guardarTarefa} />}>
          {/* ── A tarefa ─────────────────────────────────────────────────────
              ⚠ O formulário em SECÇÕES, com os campos curtos dois a dois na
              mesma linha (15/09/2026 — «consegues arranjar um layout mais
              agradável e uma organização melhor?»). Era uma coluna de sete
              blocos do mesmo peso, 629 px num corpo que mostra 430: um campo
              de dois dígitos com a largura toda, e nada a dizer que o título e
              a urgência são coisas de natureza diferente. As secções são o
              `SectionTitle` que os ecrãs já usam; os pares são a mesma fila da
              dose·quantidade·unidade da receita. Ver
              `design/formularios-das-folhas.dc.html`, opção E. */}
          <SectionTitle t={t}>A Tarefa</SectionTitle>
          <View style={{ gap: S.md }}>
            <Label t={t}>Título</Label>
            <TextInput accessibilityLabel="Título da tarefa"
              value={tituloDoRascunho}
              onChangeText={(v) => setRascunho(r => ({ ...r, title: v }))}
              placeholder="Ex: Lavar a louça"
              placeholderTextColor={t.text3}
              maxLength={60}
              style={{
                minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body,
                fontSize: 15, color: t.text2, borderRadius: R.row, borderWidth: 1,
                borderColor: t.border, backgroundColor: t.card,
              }}
            />
          </View>

          {/* Os pontos e o prazo, lado a lado: dois campos curtos. Os pontos só
              enquanto a tarefa não rendeu nada (INVARIANTE #2) e só com os
              pontos ligados; sem eles, o prazo fica com a linha toda. */}
          <View style={{ flexDirection: 'row', gap: S.md, alignItems: 'flex-start' }}>
            {pontosNasTarefas && !jaRendeu(task.id) ? (
              <View style={{ flex: 1, minWidth: 0, gap: S.md }}>
                <Label t={t}>Pontos</Label>
                {/* `compacto`: em meia linha não há largura para o «−» e o «+»
                    sem descer dos 44 px (INVARIANTE #5). */}
                <NumField t={t} compacto value={pontosDoRascunho} onChange={(v) => setRascunho(r => ({ ...r, pts: v }))}
                  step={1} min={0} max={99} suffix={false} rotulo="Pontos de bónus" />
              </View>
            ) : null}
            <View style={{ flex: 1, minWidth: 0, gap: S.md }}>
              <Label t={t}>Prazo</Label>
              <View style={{ flexDirection: 'row', gap: S.sm, alignItems: 'center' }}>
              {/* ⚠ «Sem prazo» nunca LIGAVA: o ramo que punha prazo gravava
                  `key: task.dueKey`, que era o `undefined` que acabava de
                  testar. Ligar é «hoje às 18:00»; a hora muda-se ao lado, e
                  a data pela folha da tarefa (revisão de 13/09/2026). */}
              <Pressable accessibilityRole="button"
                accessibilityLabel={task.dueKey ? 'Tirar o prazo' : 'Pôr prazo para hoje'}
                onPress={() => mudarPrazo(task.id, task.dueKey ? null : { key: TODAY_KEY, time: task.dueTime || '18:00' })}
                style={{
                  flex: 1, minHeight: 44, paddingHorizontal: S.md, borderRadius: R.row, borderWidth: 1,
                  borderColor: task.dueKey ? t.accent : t.border, backgroundColor: task.dueKey ? t.accent : t.card,
                  justifyContent: 'center',
                }}>
                <Text style={{ fontFamily: FONT.body, fontSize: 15, color: task.dueKey ? '#FFFFFF' : t.text2 }}>
                  {task.dueKey ? '✓ Com prazo' : 'Sem prazo'}
                </Text>
              </Pressable>
              {/* Ternário, e não `&&`: um campo de texto que venha vazio fica
                  como filho string do View (ver a dose da receita, na Saúde). */}
                {task.dueKey ? (
                  <TextInput accessibilityLabel="Hora do prazo"
                    value={task.dueTime || '18:00'}
                    onChangeText={(v) => mudarPrazo(task.id, { key: task.dueKey, time: v })}
                    placeholder="18:00"
                    placeholderTextColor={t.text3}
                    maxLength={5}
                    style={{
                      width: 62, minHeight: 44, paddingHorizontal: S.sm, fontFamily: FONT.ui,
                      fontSize: 15, color: t.text2, borderRadius: R.row, borderWidth: 1,
                      borderColor: t.border, backgroundColor: t.card, textAlign: 'center',
                    }}
                  />
                ) : null}
              </View>
            </View>
          </View>
          {dueOf(task) ? (
            <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, marginTop: -S.md, color: dueOf(task).late ? t.state.errTexto : dueOf(task).soon ? t.state.warnTexto : t.text3 }}>
              Prazo: {dueOf(task).text}
            </Text>
          ) : null}
          {/* Os pontos de uma tarefa que já rendeu não se mudam — e diz-se
              aqui, onde o campo estaria (INVARIANTE #2). */}
          {pontosNasTarefas && jaRendeu(task.id) ? (
            <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, marginTop: -S.md, color: t.text3 }}>
              {`Vale ${plural(task.pts || 0, 'ponto', 'pontos')}, e já foi feita — um ponto ganho não se desfaz. `
                + 'Para mudar o valor, crie uma tarefa nova.'}
            </Text>
          ) : null}

          <View style={{ gap: S.md }}>
            <Label t={t}>Urgência</Label>
            <Segmented t={t} small value={task.urgency}
              options={URG.map(u => ({ value: u.key, label: u.label }))}
              onChange={(v) => mudarUrgencia(task.id, v)} />
            <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
              {task.urgency === 0 ? 'Sobe ao topo da lista, com a caixa cheia a vermelho e borda vermelha.'
                : task.urgency === 1 ? 'Fica no meio da lista, com a caixa tracejada a âmbar e borda tracejada.'
                : 'Desce para o fim da lista, com a caixa em contorno cinzento.'}
            </Text>
          </View>

          {/* ── Quem faz ─────────────────────────────────────────────────────
              O título da secção é o rótulo: as bolas por baixo não precisam de
              um «Atribuir a» a dizer o mesmo duas vezes. */}
          <SectionTitle t={t}>Quem Faz</SectionTitle>
          <View style={{ gap: S.md }}>
            {/* A bola de cada pessoa, como no filtro lá em cima (15/09/2026):
                era um `Segmented` com os nomes. */}
            <EscolherPessoa t={t} membros={membrosDaCasa} valor={task.who} MEMBERS={MEMBERS}
              onEscolher={(v) => editarTarefa(task.id, { who: v })} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: t.subtle,
            borderWidth: 1, borderColor: t.border, borderRadius: R.card, padding: 14 }}>
            {/* ⚠  e não : a cor do CABEÇALHO sobre o cartão mede
                1,01:1 no Violeta escuro — um ícone invisível. O  é
                fundo, não tinta; um ícone em cor de ação leva . */}
            <Icon name="refresh" size={22} color={t.titulo} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>Alternar entre as crianças</Text>
              <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
                {s.rotate[task.id] ? `Alterna semanalmente. Esta semana: ${task.who}.` : 'A tarefa fica sempre com o mesmo membro.'}
              </Text>
            </View>
            <Toggle t={t} on={!!s.rotate[task.id]} label="Alternar entre as crianças"
              onPress={() => set(x => ({ rotate: { ...x.rotate, [task.id]: !x.rotate[task.id] } }))} />
          </View>

          {/* ── Apagar ──────────────────────────────────────────────────────
              Não havia. Havia `taskGone` no estado e no filtro do `allTasks`
              desde sempre, e nada o escrevia: uma tarefa criada por engano
              ficava na casa para sempre, e esta folha só oferecia urgência,
              prazo e responsável.

              Fica em baixo, depois de tudo o que se pode ajustar, e separado
              por uma linha: quem vem aqui para mudar a urgência não passa pelo
              apagar a caminho. */}
          <View style={{ height: 1, backgroundColor: t.divider }} />
          <Pressable onPress={() => setAApagar(task.id)}
            accessibilityRole="button" accessibilityLabel={`Apagar ${task.title}`}
            style={{ minHeight: 44, borderRadius: R.row, borderWidth: 1, borderColor: t.state.err,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icon name="trash" size={18} color={t.state.errTexto} />
            <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '500', color: t.state.errTexto }}>
              Apagar Tarefa
            </Text>
          </Pressable>
        </Sheet>
      ) : null}

      {/* ⚠ A pergunta diz o que a tarefa RENDEU, quando rendeu.
          Apagar uma tarefa feita não tira pontos a ninguém — ficam guardados
          num movimento aditivo (INVARIANTE #2) — e quem apaga tem de saber
          isso ANTES de decidir, senão hesita por uma razão que não existe.

          ⚠ E o confirmar fecha pelo `fecharTarefa`, que também limpa o
          rascunho: com o `setManage(null)` sozinho, o título escrito ficava em
          memória e aparecia na tarefa seguinte que se abrisse — e o «Guardar
          alterações» escrevia-o por cima dela. */}
      {aApagar && aApagarTarefa ? (
        <Confirm t={t} destructive icon="trash"
          title={`Apagar «${aApagarTarefa.title}»?`}
          message={pontosQueFicam
            ? `A tarefa sai da lista. Os ${pontosQueFicam} pontos que já rendeu ficam `
              + `com ${aApagarTarefa.who} — um ponto ganho não se desfaz. Não se desfaz.`
            : 'A tarefa sai da lista e não volta. Não se desfaz.'}
          confirmLabel="Apagar"
          onConfirm={() => { removerTarefa(aApagar); setAApagar(null); fecharTarefa(); }}
          onCancel={() => setAApagar(null)} />
      ) : null}

    </>
  );
}
