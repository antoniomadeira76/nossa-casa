import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useStore } from '../store';
import { S, FONT, corDoMembro } from '../theme';
import { EUR, plural, evTime, TODAY_KEY, dayLabel, agoraNaApp, subtituloDaTarefa } from '../format';

import { Card, SectionTitle, Label, Pill, Row, Bar, Tile, Avatar, Empty, usePaged, Pager, PastilhaVisibilidade, avatarDe } from '../ui';
import Icon from '../Icon';

export default function Inicio({ t, user, go, onSaude, onEquip, onFicha, onAbrir,
                                 agendaPorLigar, onLigarAgenda }) {
  const st = useStore();
  const { s, allTasks, allEvents, envelopes, budget, spent, remaining, dueOf, isRecurring,
          garantiasAExpirar, receitasAExpirar, consultasProximas, membros: MEMBERS,
          acerto, acertado, artigo, oNome, aoNome, podeVerEvento } = st;

  // Era `const hour = 9`, e a app dizia «Bom dia» às onze da noite.
  const hora = agoraNaApp().getHours();
  const greet = hora < 13 ? 'Bom dia' : hora < 20 ? 'Boa tarde' : 'Boa noite';

  const tasks = allTasks();
  const toConfirm = tasks.filter(x => s.pending[x.id]);
  const overdue = tasks.filter(x => x.today && !s.done[x.id] && !s.pending[x.id]);
  const tight = envelopes.filter(e => e.limit > 0 && e.used / e.limit >= 0.94);
  const settleBase = acerto ? acerto.valor : 0;

  // Precisa de si — só o que exige decisão, por ordem de urgência.
  //
  // A ordem e os ícones vêm do protótipo (`design/Nossa Casa App.dc.html`,
  // onde a lista se monta). Faltavam três entradas: garantias, receitas e
  // consultas próximas. O ecrã tinha três linhas onde a referência tem cinco,
  // e um equipamento a sair da garantia não aparecia em lado nenhum até
  // alguém abrir os Equipamentos de propósito.
  //
  // `idcard` é o ícone das duas primeiras: neste sistema quer dizer «papel com
  // prazo» — a garantia e a receita. Não é reutilização com outro sentido.
  const needs = [];

  // A agenda da Google por ligar.
  //
  // Vem primeiro de propósito. Com a autorização a viver no servidor, ligar a
  // agenda passou a ser um passo único — e um passo único que não se vê é um
  // passo que não se dá: entrar pela Google deixou de trazer a agenda, e o
  // ecrã não dizia porquê. Quem tinha a agenda a funcionar via-a desaparecer
  // sem uma palavra.
  //
  // Só aparece a quem TEM sessão no servidor e ainda não ligou — quem decide
  // isso é o App, que conhece a camada do servidor. Este ecrã não a importa:
  // um ecrã de apresentação que fala com a rede não se monta num teste sem
  // que alguém tenha de a simular primeiro.
  if (agendaPorLigar) needs.push({ icon: 'calendar', color: t.state.info,
    title: 'Agenda da Google por ligar',
    sub: 'Liga-se uma vez; depois os eventos vêm sozinhos',
    go: () => onLigarAgenda?.() });
  if (toConfirm.length) needs.push({ icon: 'clock', color: t.text3,
    title: plural(toConfirm.length, 'tarefa a confirmar', 'tarefas a confirmar'),
    sub: [...new Set(toConfirm.map(x => x.who))].join(', '), go: () => go('tarefas') });
  if (!acertado) needs.push({ icon: 'wallet', color: t.text3,
    title: 'Contas por acertar', sub: `${oNome(acerto.devedor)} deve ${EUR(settleBase)}`, go: () => go('dinheiro') });
  tight.forEach(e => needs.push({ icon: 'warning', color: t.state.err,
    title: `Envelope ${e.name} no limite`, sub: `${EUR(Math.max(0, e.limit - e.used))} disponíveis`, go: () => go('dinheiro') }));
  garantiasAExpirar().forEach(e => needs.push({ icon: 'idcard', color: t.state.warn,
    title: `Garantia a expirar · ${String(e.name).split(' ').slice(0, 2).join(' ')}`,
    sub: e.dias === 0 ? 'termina hoje' : `${e.dias === 1 ? 'Falta' : 'Faltam'} ${plural(e.dias, 'dia', 'dias')}`,
    // A ficha DESTE equipamento, e não a lista onde é preciso voltar a
    // procurá-lo. Uma linha que diz «Frigorífico» e abre uma lista de doze
    // obriga a fazer a busca outra vez, depois de a app já a ter feito.
    go: () => onEquip(e.id) }));
  receitasAExpirar(user).forEach(d => needs.push({ icon: 'idcard', color: t.state.warn,
    title: `Receita a expirar · ${d.member}`,
    sub: `${d.title} · ${d.dias < 0 ? `Expirou há ${plural(-d.dias, 'dia', 'dias')}`
      : d.dias === 0 ? 'Expira hoje'
      : `${d.dias === 1 ? 'Falta' : 'Faltam'} ${plural(d.dias, 'dia', 'dias')}`}`,
    go: () => (onFicha ? onFicha(d.member) : onSaude()) }));
  consultasProximas(user).forEach(c => needs.push({ icon: 'heartPulse', color: t.state.info,
    title: `Consulta · ${c.member}`,
    sub: `${c.specialty} · ${dayLabel(c.day)} às ${c.time}`,
    go: () => (onFicha ? onFicha(c.member) : onSaude()) }));
  if (overdue.length) needs.push({ icon: 'checkSquare', color: t.text3,
    title: plural(overdue.length, 'tarefa por fazer hoje', 'tarefas por fazer hoje'),
    sub: [...new Set(overdue.map(x => x.who))].join(', '), go: () => go('tarefas') });

  const needsPg = usePaged(needs, 5);
  const today = allEvents().filter(e => e.day === TODAY_KEY && podeVerEvento(e, user))
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const todayTasks = tasks.filter(x => x.today);
  // Sem orçamento definido, não há percentagem a mostrar. `0/0` é NaN, e NaN
  // não rebenta — escreve «NaN %» no ecrã, que é pior do que rebentar.
  const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;

  return (
    <>
      {/* A saudação, a data e os três números vivem no cabeçalho — ver
          docs/referencia/04-inicio.png. Estavam aqui também, e a app
          cumprimentava duas vezes.

          ── Os dois atalhos saíram, e é uma DECISÃO ────────────────────────

          ⚠ Isto afasta-se do protótipo. As referências 04 e 22 mostram aqui
          dois botões, «Compras» e «Tarefas», o primeiro destacado e o segundo
          neutro. O CLAUDE.md diz que quando o protótipo e o código discordam
          o protótipo ganha — portanto quem vier comparar vai encontrar uma
          falta e vai querer repô-la. Não reponha: o dono da casa decidiu
          tirá-los em 02/09/2026, e a razão é medida.

          O `onPress` deles era `go('compras')` e `go('tarefas')` — o MESMO
          dos separadores do rodapé, que estão sempre visíveis 580 px abaixo.
          Sem contagem, sem filtro, sem estado: não levavam a uma vista
          diferente, levavam à mesma. Ocupavam 76 px (52 de altura mais o
          espaçamento) no topo do Início, ACIMA do «Precisa de Si», que é a
          razão de existir deste ecrã — o primeiro ecrã da app abria com dois
          botões que não diziam nada e empurrava para baixo o que diz tudo.

          E a ênfase não podia adaptar-se: o destaque do «Compras» era uma
          constante, não mudava por haver compras marcadas para hoje nem
          tarefas atrasadas. Decoração fixa onde parecia sinal.

          Se um dia voltarem, que voltem como AÇÕES — «Nova tarefa» e
          «Acrescentar à lista» — que poupam dois passos. Um atalho ganha o
          seu lugar quando poupa um passo, e navegar para onde o rodapé já
          leva poupa zero. */}
      {/* A secção fica SEMPRE. Desaparecer quando não há nada faz a app
          parecer meia carregada — e tira a única coisa que diz que se olhou e
          está tudo em ordem. É a mesma escolha que o acerto de contas já fazia
          com «Não há contas a acertar nesta casa.». */}
      <View>
        <SectionTitle t={t}>Precisa de Si</SectionTitle>
        {needs.length === 0 ? (
          <Empty t={t} icon="checkCircle" title="Nada à sua espera."
            hint="As tarefas de hoje, os prazos e as contas estão em dia." />
        ) : (
          <View style={{ gap: S.md }}>
            {needsPg.slice.map((n, i) => (
              <Card key={i} t={t} style={{ borderLeftWidth: 4, borderLeftColor: n.color }}>
                <Row t={t} title={n.title} sub={n.sub} onPress={n.go} last
                  icon={n.icon} iconColor={n.color}
                  right={<Icon name="caretRight" size={18} color={t.text3} />} />
              </Card>
            ))}
            <Pager t={t} pg={needsPg} />
          </View>
        )}
      </View>

      <View>
        <SectionTitle t={t}>Agenda de Hoje</SectionTitle>
        {today.length === 0 ? (
          <Empty t={t} icon="calendar" title="Nada agendado para hoje."
            hint="Use Agendar Evento na Agenda para acrescentar o primeiro." />
        ) : (
          <View style={{ gap: S.md }}>
            {today.map(e => (
              <Card key={e.id} t={t}>
                <Pressable
                  onPress={() => (onAbrir ? onAbrir('agenda', e.id) : go('agenda'))}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir ${e.title}`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
                  <Text style={{ width: 42, fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.text3 }}>
                    {evTime(e.time)}
                  </Text>
                  <Avatar {...avatarDe(e.owner, MEMBERS[e.owner], t.text3)} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text numberOfLines={2} style={{ fontFamily: FONT.body, fontSize: 15.5, color: t.text2 }}>{e.title}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>{e.who}</Text>
                  </View>
                  <PastilhaVisibilidade t={t} evento={e} />
                </Pressable>
              </Card>
            ))}
          </View>
        )}
      </View>

      <View>
        <SectionTitle t={t}>Tarefas de Hoje</SectionTitle>
        {todayTasks.length === 0 ? (
          <Empty t={t} icon="checkSquare" title="Nada para hoje."
            hint="As tarefas de hoje aparecem aqui. Use Nova Tarefa nas Tarefas." />
        ) : (
        <View style={{ gap: S.md }}>
          {todayTasks.map((x, i) => {
            const done = !!s.done[x.id], pend = !!s.pending[x.id];
            const d = dueOf(x);
            const rec = isRecurring(x);
            return (
              <Card key={x.id} t={t} style={{
                borderWidth: done ? 2 : 1,
                borderColor: done ? t.state.okBorder : pend ? t.state.info : t.border,
                backgroundColor: done ? t.state.okBg : t.card,
              }}>
                <Row t={t} last
                  onPress={() => (onAbrir ? onAbrir('tarefas', x.id) : go('tarefas'))}
                  title={x.title}
                  sub={done && rec ? 'feita hoje · volta amanhã'
                    : pend ? 'Feito — a aguardar confirmação'
                    : subtituloDaTarefa(x, d)}
                  right={<>
                    {x.pts > 0 && !done ? <Pill label={`${x.pts} pt`} fg={t.state.warnDeep} bg={t.state.warnBg} border={t.state.warn} /> : null}
                  </>}
                  icon={done ? 'checkCircle' : pend ? 'clock' : 'infoCircle'} />
              </Card>
            );
          })}
        </View>
        )}
      </View>

      <View>
        <SectionTitle t={t}>Orçamento de {s.monthName}</SectionTitle>
        <Card t={t} style={{ gap: S.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Label t={t}>Disponível</Label>
              <Text style={{ fontFamily: FONT.display, fontSize: 28, color: t.text2 }}>{EUR(remaining)}</Text>
            </View>
            <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3, textAlign: 'right' }}>
              de {EUR(budget)}{'\n'}orçamento
            </Text>
          </View>
          <Bar t={t} pct={pct} color={t.accent} />
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
            {pct} % do orçamento de {s.monthName} usado até agora.
          </Text>
        </Card>
      </View>

      <Tile t={t} kind={acertado ? 'info' : 'warn'}>
        {acertado
          ? acerto ? `As contas entre ${artigo(acerto.credor)} ${acerto.credor} e ${artigo(acerto.devedor)} ${acerto.devedor} estão acertadas.`
            : 'Não há contas a acertar nesta casa.'
          : `${oNome(acerto.devedor)} deve ${aoNome(acerto.credor)} ${EUR(settleBase)} de despesas partilhadas.`}
      </Tile>

    </>
  );
}
