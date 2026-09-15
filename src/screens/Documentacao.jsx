import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import FiltroDeMembros from '../FiltroDeMembros';
import { Card, SectionTitle, Pill, Segmented, Empty, Pager, usePaged, Choice, Label, Row, Linha as LinhaPlana, Avatar, avatarDe } from '../ui';
import { tituloEDetalhe, detalheDaLinha, dobrarRepeticoes, agruparPorDia, horaDe } from '../registo-da-casa';
import RetratoDoMes from '../sheets/RetratoDoMes';
import { plural, pad2, EUR } from '../format';
import Icon from '../Icon';
import { REGISTO_APP, TIPOS, AREAS, AMBITO } from '../registo-app';

// Documentação: as novidades da app, versão a versão, e o «Como funciona» por
// área — as duas geradas do mesmo registo.
//
// Este ecrã mostrava `s.registo`, que é o histórico das alterações que a
// FAMÍLIA faz à casa. A referência 17 mostra outra coisa — o que mudou na app.
// São duas funcionalidades com o mesmo nome, e este ecrã é a segunda.
//
// ⚠ «e está sempre vazio: nada o escreve» dizia esta linha, e era verdade
// quando a escrevi. Deixou de ser: catorze sítios do `store.jsx` acrescentam-lhe
// linhas, e desde 05/09/2026 sobem para a coleção `registo`, com o `quem`.
//
// ── E agora as duas vivem aqui, em abas separadas ────────────────────────────
//
// São mesmo duas coisas: as «Novidades» são o que mudou na APP, escritas à mão
// por quem a faz; o «Nesta casa» é o que a FAMÍLIA fez. Partilham o ecrã e não
// se misturam — um separador entre elas é mais barato do que dois ecrãs, e o
// nome do ecrã serve as duas.
//
// ⚠ O desenho da terceira aba é o do protótipo, que já tinha isto pensado como
// folha «Histórico da Casa» (linha 3168): linha com ícone à esquerda, texto e
// data ao meio, quem fez à direita, «mais recente primeiro», estado vazio com
// as palavras dele, e paginação acima de cinco. O sítio é o que o dono da casa
// pediu; o desenho é o que estava desenhado.
// Uma área do «Como funciona»: o nome, o que faz, e — dobrado — o que mudou.
//
// ⚠ É um acordeão, como no protótipo (linha 3120): doze áreas abertas de uma
// vez eram um ecrã de rolar sem fim, e quem procura uma quer VER a lista das
// doze antes de escolher.
//
// ⚠ E o que faz está SEMPRE à vista; só o que mudou é que se dobra. Ao
// contrário, o ecrã voltava a ser um registo de alterações com uma descrição
// escondida lá dentro — que é o defeito que isto veio corrigir.
const AreaAberta = ({ t, g, corDo }) => {
  const [aberto, setAberto] = useState(false);
  const temMudancas = g.itens.length > 0;

  return (
    <Card t={t} style={{ gap: S.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
        <Icon name={g.icon || 'fileText'} size={20} color={t.titulo} />
        <Text style={{ flex: 1, fontFamily: FONT.display, fontSize: 17,
          fontWeight: '600', color: t.text1 }}>
          {g.area}
        </Text>
      </View>

      {g.o ? (
        <Text style={{ fontFamily: FONT.body, fontSize: 14.5, lineHeight: 22, color: t.text2 }}>
          {g.o}
        </Text>
      ) : null}

      {g.faz.map((linha, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: S.md }}>
          {/* O visto é o do protótipo, e aqui quer dizer «isto a app faz» —
              não «isto está feito». É o único sítio da app onde aparece com
              este sentido, e por isso não colide com nenhum outro. */}
          <View style={{ paddingTop: 3 }}>
            <Icon name="check" size={15} color={t.state.okTexto} />
          </View>
          <Text style={{ flex: 1, fontFamily: FONT.body, fontSize: 14, lineHeight: 21, color: t.text2 }}>
            {linha}
          </Text>
        </View>
      ))}

      {temMudancas ? (
        <>
          <View style={{ height: 1, backgroundColor: t.divider }} />
          <Pressable onPress={() => setAberto(v => !v)} accessibilityRole="button"
            accessibilityLabel={`O que mudou em ${g.area}`}
            accessibilityState={{ expanded: aberto }} aria-expanded={aberto}
            style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: S.md }}>
            <Text style={{ flex: 1, fontFamily: FONT.ui, fontSize: 12.5, fontWeight: '600', color: t.text3 }}>
              {plural(g.itens.length, 'alteração desde então', 'alterações desde então')}
            </Text>
            <Icon name={aberto ? 'caretUp' : 'caretDown'} size={16} color={t.text3} />
          </Pressable>

          {aberto ? g.itens.map((r, i) => {
            const c = corDo(r.k);
            return (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: S.md }}>
                <View style={{ minWidth: 74 }}>
                  <Pill label={TIPOS[r.k] || r.k} fg={c.fg} bg={c.bg} border={c.br} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, lineHeight: 19, color: t.text3 }}>
                    {r.t}
                  </Text>
                  <Text style={{ fontFamily: FONT.ui, fontSize: 11, color: t.text3 }}>
                    versão {r.v}
                  </Text>
                </View>
              </View>
            );
          }) : null}
        </>
      ) : null}
    </Card>
  );
};

// Os dois filtros do registo: por quem fez, e por onde aconteceu.
//
// ⚠ Só aparecem quando há por onde escolher. Numa casa de um membro, uma fila
// de pastilhas com uma opção não é um filtro — é ruído a ocupar o sítio do que
// se veio ler.
//
// ⚠ E está num componente à parte por uma razão medida: dentro do ecrã, o
// bloco afastava a protecção de vazio do título da secção em mais de vinte e
// seis linhas, e a prova `secoes-vazias` deixava de a ver. A prova tinha razão
// — um título e o seu conteúdo a trinta linhas de distância leem-se mal — e a
// resposta certa era encurtar, não alargar a janela dela.
//
// ⚠ Opção A de `design/filtros-do-registo.dc.html` (14/09/2026): eram duas
// filas de pastilhas dentro de um cartão — nove áreas em três linhas, ~190 px
// antes da primeira entrada, e as pessoas pelo nome. Agora: o «Quem» é o
// `FiltroDeMembros` das Tarefas e da Saúde (a bola com o nome por baixo — o
// escolhedor de pessoa desta app); o «Onde» é UMA fila que rola de lado, como
// os corredores do Modo Compras, com o ícone do rodapé de cada área, «Tudo»
// primeiro e a escolhida logo a seguir. Duas linhas fixas, sem cartão nem
// rótulos: as bolas e os ícones dizem o que cada fila é.
const ICONE_DA_AREA = {
  Tarefas: 'checkSquare', Agenda: 'calendar', Compras: 'fileDone', Dinheiro: 'wallet',
  // ⚠ `sliders`, o ícone do cabeçalho da Gestão — e não `houseGear`, que é o
  // dos Equipamentos: dois ícones iguais numa fila só de ícones eram um erro
  // de leitura garantido.
  Equipamentos: 'houseGear', 'Saúde': 'heartPulse', 'Gestão da Casa': 'sliders', Perfil: 'user',
  'Início': 'home', 'A App': 'fileText',
};
//
// ⚠ E as áreas cabem numa LINHA SÓ (14/09/2026). A fila que rolava cortava a
// última pastilha («há um botão escondido»); a grelha com o nome por baixo
// embrulhava em duas linhas («gosto da ideia mas não gosto de estar em 2
// linhas»). Fica uma linha de ÍCONES de 44, o do rodapé de cada área, a
// repartir a largura (`flex: 1`, nunca abaixo de 44): oito áreas em 355 px dão
// 44 cada. Sem pastilha «Tudo» — tocar outra vez na área escolhida desfaz o
// filtro — e o NOME da área escolhida vai para o título da secção, como a Saúde
// faz com a pessoa («Precisa de ação · Léo»).
const Filtros = ({ t, quemHa, areasHa, quem, area, mudarQuem, mudarArea, MEMBERS }) => {
  if (quemHa.length <= 1 && areasHa.length <= 1) return null;
  // `marginVertical: S.lg`: um intervalo de 16 para o título acima e para o que
  // vem abaixo — o aviso «Nada com esse filtro» ficava colado à fila de ícones
  // («a info está colada aos filtros, muda isso», 14/09/2026).
  return (
    <View style={{ gap: S.md, marginVertical: S.lg }}>
      {quemHa.length > 1 ? (
        // ⚠ O «Todos» do FiltroDeMembros devolve a PALAVRA 'Todos', não `null`
        // (é o que as Tarefas guardam). Aqui o filtro é um nome ou nada: sem
        // esta tradução, «Todos» filtrava por uma pessoa chamada Todos e o
        // registo ficava vazio («o Todos não devia mostrar isso mesmo?»).
        <FiltroDeMembros t={t} membros={quemHa} escolhido={quem || 'Todos'}
          onEscolher={(n) => mudarQuem(n === 'Todos' ? null : n)}
          MEMBERS={MEMBERS || {}} rotuloDe={(n) => `Mostrar só o que ${n} fez`} />
      ) : null}
      {areasHa.length > 1 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
          {areasHa.map(a => {
            const on = area === a;
            return (
              <Pressable key={a} onPress={() => mudarArea(on ? null : a)} accessibilityRole="button"
                accessibilityLabel={on ? `Deixar de mostrar só ${a}` : `Mostrar só ${a}`}
                accessibilityState={{ selected: on }} aria-pressed={on}
                style={({ pressed }) => ({ flex: 1, minWidth: 44, height: 44, borderRadius: R.row, borderWidth: 1,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: on ? t.accent : t.card, borderColor: on ? t.accent : t.border,
                  opacity: pressed ? 0.7 : 1 })}>
                <Icon name={ICONE_DA_AREA[a] || 'fileText'} size={20} color={on ? '#FFFFFF' : t.titulo} />
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
};

// Onde é que uma linha do registo leva, pela área dela. Nulo = não leva a lado
// nenhum, e então a linha não é tocável.
//
// ⚠ Isto é por ÁREA e não por linha, de propósito. Metade das entradas fala de
// coisas que já não existem — «a tarefa X foi apagada» — e nenhuma delas tem um
// registo para onde apontar. Levar ao ECRÃ onde a coisa aconteceu é o destino
// que se pode prometer sempre, e é o mesmo para todas as linhas da área.
const DESTINO = {
  'Início': 'inicio',
  'Dinheiro': 'dinheiro',
  'Tarefas': 'tarefas',
  'Compras': 'compras',
  'Agenda': 'agenda',
  'Saúde': 'saude',
  'Equipamentos': 'equip',
  'Gestão da Casa': 'gestao',
  // «A App» e «Documentação» não têm ecrã próprio para onde ir. «Perfil» e
  // «Entrada» também não: o Perfil é uma folha que se abre por cima de tudo, e
  // a Entrada já passou.
};

export default function Documentacao({ t, onIr, podeGerir, user }) {
  const { s, retratosDaCasa, membros: membrosDaCasa } = useStore();
  const [aba, setAba] = useState('novidades');
  // O retrato de um mês com a folha aberta (12/09/2026).
  const [retrato, setRetrato] = useState(null);
  const retratos = retratosDaCasa();
  const [filtroQuem, setFiltroQuem] = useState(null);
  const [filtroArea, setFiltroArea] = useState(null);

  const corDo = (k) => ({
    novo:      { fg: t.state.okTexto,   bg: t.state.okBg,   br: t.state.okBorder },
    alterado:  { fg: t.state.infoDeep, bg: t.state.infoBg, br: t.state.info },
    corrigido: { fg: t.state.warnDeep, bg: t.state.warnBg, br: t.state.warn },
  }[k] || { fg: t.text3, bg: t.subtle, br: t.border });

  // Por versão, da mais recente para a mais antiga. As versões comparam-se
  // número a número — «1.10» é depois de «1.9», e a ordem alfabética punha-a
  // antes.
  const ordemVersao = (a, b) => {
    const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) if ((pb[i] || 0) !== (pa[i] || 0)) return (pb[i] || 0) - (pa[i] || 0);
    return 0;
  };

  const porVersao = (() => {
    const mapa = {};
    for (const r of REGISTO_APP) (mapa[r.v] ||= { v: r.v, d: r.d, itens: [] }).itens.push(r);
    return Object.values(mapa).sort((a, b) => ordemVersao(a.v, b.v));
  })();

  // ── O «Como funciona», por área ────────────────────────────────────────────
  //
  // ⚠ A ordem é a do `AREAS`, e não alfabética. As áreas eram ordenadas pelo
  // nome — «A App» primeiro, «Tarefas» no fim —, o que punha a mecânica do
  // rodapé à frente do que a app faz. Agora seguem a ordem em que estão
  // escritas, que é a de quem chega: Início, Dinheiro, Tarefas, Compras,
  // Agenda, e o resto atrás.
  //
  // ⚠ E parte-se do `AREAS`, não do registo. Ao contrário, uma área sem
  // alterações nenhumas desaparecia do «Como funciona» — que é onde ela mais
  // precisa de estar, porque é a que ninguém conhece.
  const porArea = (() => {
    const mudancas = {};
    for (const r of REGISTO_APP) (mudancas[r.a] ||= []).push(r);
    const escritas = new Set(AREAS.map(a => a.area));
    return [
      ...AREAS.map(a => ({
        ...a,
        // ⚠ Só o que MUDOU. As entradas `novo` descrevem a funcionalidade
        // quando ela nasceu, e o `faz` já a descreve — melhor, e sem falar no
        // passado. Repetir as duas era dizer a mesma coisa por duas palavras.
        itens: (mudancas[a.area] || []).filter(r => r.k !== 'novo')
          .sort((x, y) => ordemVersao(x.v, y.v)),
      })),
      // Uma área que exista no registo e não esteja escrita aparece na mesma,
      // sem descrição. É preferível a desaparecer em silêncio — e a prova
      // `documentacao-cobre-as-areas` faz com que não aconteça.
      ...Object.keys(mudancas).filter(a => !escritas.has(a)).sort()
        .map(area => ({ area, icon: 'fileText', o: null, faz: [],
          itens: mudancas[area].sort((x, y) => ordemVersao(x.v, y.v)) })),
    ];
  })();

  const Linha = ({ r, mostrarArea }) => {
    const c = corDo(r.k);
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: S.md, paddingVertical: S.md }}>
        <View style={{ minWidth: 74 }}>
          <Pill label={TIPOS[r.k] || r.k} fg={c.fg} bg={c.bg} border={c.br} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: FONT.body, fontSize: 14.5, lineHeight: 21, color: t.text2 }}>
            {r.t}
          </Text>
          <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
            {mostrarArea ? r.a : `versão ${r.v}`}
          </Text>
        </View>
      </View>
    );
  };

  // ── O registo da casa ──────────────────────────────────────────────────────
  //
  // Mais recente primeiro. A lista já vem ordenada do servidor, mas ordena-se
  // aqui também: sem servidor ela é a local, e essa vem pela ordem em que os
  // catorze sítios a foram acrescentando.
  const todoOregisto = [...(s.registo || [])].sort((a, b) => (b.at || 0) - (a.at || 0));

  // ── Os dois filtros ────────────────────────────────────────────────────────
  //
  // ⚠ São a resposta ao que faltava mesmo. Com quarenta linhas o registo lê-se;
  // com quatrocentas, não — e a pergunta que se faz a um histórico é sempre a
  // mesma duas: «o que é que o Tomás andou a fazer?» e «o que se passou no
  // dinheiro?».
  //
  // As opções saem do que EXISTE no registo, não de uma lista fixa: uma casa
  // que nunca mexeu na Saúde não tem por que ver esse filtro.
  const quemHa = [...new Set(todoOregisto.map(r => r.quem).filter(Boolean))].sort();
  const areasHa = [...new Set(todoOregisto.map(r => r.a).filter(Boolean))].sort();

  // As repetições seguidas dobram-se ANTES de paginar: «lista partilhada» quatro
  // vezes numa noite é uma linha («4 vezes entre sábado e domingo»), não quatro.
  const daCasa = dobrarRepeticoes(todoOregisto
    .filter(r => !filtroQuem || r.quem === filtroQuem)
    .filter(r => !filtroArea || r.a === filtroArea));
  const pgCasa = usePaged(daCasa);

  // Data e hora da entrada, numa linha só à direita.
  //
  // ⚠ Havia uma segunda linha por baixo do texto com «Setembro de 2026», e
  // saiu: dizia o mesmo que o `05/09` do lado direito, em todas as linhas do
  // mês corrente. Vi-a no ecrã e não no código — três linhas por registo, duas
  // delas a dar a mesma data.
  //
  // O ANO só aparece quando não é este. Numa casa com dois anos de uso é a
  // única coisa que a data curta não diz, e é barato dizê-la só quando conta.
  const anoCorrente = new Date().getFullYear();
  const quando = (at) => {
    if (!at) return '';
    const d = new Date(at);
    if (Number.isNaN(d.getTime())) return '';
    const dia = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
    const ano = d.getFullYear() === anoCorrente ? '' : `/${d.getFullYear()}`;
    return `${dia}${ano} · ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };

  return (
    <>
      <Segmented t={t} value={aba}
        options={[{ value: 'novidades', label: 'Novidades' },
                  { value: 'como', label: 'Como funciona' },
                  { value: 'casa', label: 'Nesta casa' }]}
        onChange={setAba} />

      {aba === 'casa' ? (
        // ⚠ O título é um `SectionTitle`, como na aba «Como funciona» ao lado.
        //
        // Escrevi-o primeiro como um cabeçalho de 16 px dentro do cartão, ao
        // jeito do da Saúde, e medi 4,08:1 contra a página escura no esquema
        // Menta. A 16 px isso não chega — os 3:1 que o `t.titulo` assume valem
        // para texto GRANDE, e grande começa nos 18,66 px a negrito. O
        // `SectionTitle` são 20/700, que é texto grande a sério, e além disso é
        // o que a aba do lado já usa.
        <View>
          <SectionTitle t={t} right={daCasa.length
            ? <Pill label={plural(daCasa.length, 'registo', 'registos')}
                fg={t.text3} bg={t.subtle} border={t.border} />
            : null}>
            {/* O filtro ativo lê-se no título — a pessoa e a área — como a Saúde
                faz com «Precisa de ação · Léo»: a fila de áreas é só de ícones. */}
            {['Histórico da Casa', filtroQuem, filtroArea].filter(Boolean).join(' · ')}
          </SectionTitle>

          <Filtros t={t} quemHa={quemHa} areasHa={areasHa} MEMBERS={membrosDaCasa}
            quem={filtroQuem} area={filtroArea}
            mudarQuem={setFiltroQuem} mudarArea={setFiltroArea} />

          {daCasa.length ? (
            // ⚠ Desenho de 14/09/2026 (`design/registo-da-casa.dc.html`): sem
            // cartão, os DIAS como secções (o rótulo da Agenda), e a linha da
            // Agenda — hora · bola de quem fez · título com o detalhe por baixo
            // · pastilha da área · seta quando leva a algum lado. Era um cartão
            // com o mesmo ícone em todas as linhas, o texto a embrulhar em três
            // e a data em duas à direita: ~90 px por entrada; agora ~52.
            //
            // O que decide o que se mostra — partir a frase em título e
            // detalhe, dobrar as repetições, agrupar por dia — está em
            // `src/registo-da-casa.js`, provado. Aqui só se desenha.
            //
            // ⚠ Só é tocável quem tem para onde ir, e vê-se: a linha com
            // destino leva uma seta, a outra não. Nenhuma linha tem DOIS
            // destinos («uma linha, um destino», CLAUDE.md).
            <View>
              {agruparPorDia(pgCasa.slice).map((g) => (
                <View key={g.chave || 'sem-data'} style={{ marginBottom: S.md }}>
                  <SectionTitle t={t}>{g.rotulo}</SectionTitle>
                  {g.linhas.map((r, i) => {
                    const destino = DESTINO[r.a] || null;
                    const podeIr = destino && onIr && (destino !== 'gestao' || podeGerir);
                    const { titulo } = tituloEDetalhe(r.t);
                    const detalhe = detalheDaLinha(r);
                    const conteudo = (
                      <>
                        <Text style={{ width: 38, fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>{horaDe(r.at)}</Text>
                        <Avatar size={28} {...avatarDe(r.quem, r.quem ? membrosDaCasa[r.quem] : null, t.text3)} />
                        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                          {/* Duas linhas, como o título de um evento na Agenda: uma
                              entrada sem separador («A lista de compras foi
                              partilhada por um endereço só de leitura…») cortava
                              a meio em 355 px. */}
                          <Text numberOfLines={2} style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>{titulo}</Text>
                          {detalhe ? (
                            <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11, color: t.text3 }}>{detalhe}</Text>
                          ) : null}
                        </View>
                        {r.a ? <Pill label={r.a} fg={t.text3} bg={t.subtle} border={t.border} /> : null}
                        {podeIr ? <Icon name="caretRight" size={16} color={t.text3} /> : null}
                      </>
                    );
                    const estilo = { flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 44 };
                    const chave = r.id || `${r.at}-${i}`;
                    return (
                      <LinhaPlana key={chave} t={t} last={i === g.linhas.length - 1}>
                        {podeIr ? (
                          <Pressable onPress={() => onIr(destino)} accessibilityRole="button"
                            accessibilityLabel={`${r.t} — abrir ${r.a}`}
                            style={({ pressed }) => ({ ...estilo, opacity: pressed ? 0.6 : 1 })}>
                            {conteudo}
                          </Pressable>
                        ) : (
                          <View style={estilo}>{conteudo}</View>
                        )}
                      </LinhaPlana>
                    );
                  })}
                </View>
              ))}
              <Pager t={t} pg={pgCasa} />
            </View>
          ) : (
            // As palavras são as do protótipo — e a segunda frase muda quando o
            // vazio é do FILTRO e não da casa: dizer «ainda sem registos» a
            // quem acabou de escolher um membro era mentir sobre a razão.
            <Empty t={t} icon="fileText"
              title={todoOregisto.length ? 'Nada com esse filtro.' : 'Ainda sem registos.'}
              hint={todoOregisto.length
                ? 'Escolha «Todos» e toque outra vez na área escolhida para ver o histórico inteiro.'
                : 'Tudo o que a família fizer na app fica aqui: tarefas, despesas, compras, agenda e equipamentos.'} />
          )}

          {/* ── Os retratos dos meses ──────────────────────────────────────
              Uma página por mês, do mais recente para o mais antigo: o gasto
              por envelope, as tarefas e os pontos por criança, as compras, os
              acertos — somados das linhas do mês, e exportáveis em PDF
              (12/09/2026, a décima das dez). Só um adulto chega a este ecrã. */}
          {retratos.length > 0 ? (
            <View style={{ marginTop: S.xl }}>
              <SectionTitle t={t} right={
                <Pill label={plural(retratos.length, 'mês', 'meses')} fg={t.text3} bg={t.subtle} border={t.border} />
              }>Retratos dos Meses</SectionTitle>
              {retratos.map((r, i) => (
                <LinhaPlana key={r.idServidor || `${r.inicio}-${i}`} t={t} last={i === retratos.length - 1}>
                  <Row t={t} icon="fileText" title={r.nome}
                    sub={`${EUR(r.gasto)} gastos de ${EUR(r.orcamento)} · ${r.aberto ? 'em curso' : 'fechado'}`}
                    right={<Icon name="caretRight" size={18} color={t.text3} />}
                    onPress={() => setRetrato(r)} last />
                </LinhaPlana>
              ))}
            </View>
          ) : null}
        </View>
      ) : aba === 'novidades' ? porVersao.map(g => (
        <Card key={g.v} t={t} style={{ gap: S.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
            <Text style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: '600', color: t.text1 }}>
              {g.v}
            </Text>
            <Pill label={plural(g.itens.length, 'alteração', 'alterações')}
              fg={t.text3} bg={t.subtle} border={t.border} />
            <View style={{ flex: 1 }} />
            <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>{g.d}</Text>
          </View>
          <View style={{ height: 1, backgroundColor: t.divider }} />
          {g.itens.map((r, i) => <Linha key={i} r={r} mostrarArea />)}
        </Card>
      )) : (
        <>
          {/* O âmbito, uma vez e no topo. Não existia em lado nenhum na app: o
              ecrã dizia o que tinha MUDADO em cada área e nunca o que a app é.
              Quem abre a Documentação pela primeira vez começa por aqui. */}
          <Card t={t} style={{ gap: S.sm }}>
            <Text style={{ fontFamily: FONT.display, fontSize: 17, fontWeight: '600', color: t.text1 }}>
              Nossa Casa
            </Text>
            <Text style={{ fontFamily: FONT.body, fontSize: 14.5, lineHeight: 22, color: t.text2 }}>
              {AMBITO}
            </Text>
          </Card>
          {porArea.map(g => (
            <AreaAberta key={g.area} t={t} g={g} corDo={corDo} />
          ))}
        </>
      )}

      {retrato ? <RetratoDoMes t={t} retrato={retrato} user={user} onClose={() => setRetrato(null)} /> : null}
    </>
  );
}
