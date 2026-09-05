import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { Card, SectionTitle, Pill, Segmented, Empty, Pager, usePaged } from '../ui';
import { plural, pad2 } from '../format';
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
        <Icon name={g.icon || 'fileText'} size={20} color={t.accent} />
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
            <Icon name="check" size={15} color={t.state.okDeep} />
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
            accessibilityState={{ expanded: aberto }}
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

export default function Documentacao({ t }) {
  const { s } = useStore();
  const [aba, setAba] = useState('novidades');

  const corDo = (k) => ({
    novo:      { fg: t.state.okDeep,   bg: t.state.okBg,   br: t.state.okBorder },
    alterado:  { fg: t.state.info,     bg: t.state.infoBg, br: t.state.info },
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
  const daCasa = [...(s.registo || [])].sort((a, b) => (b.at || 0) - (a.at || 0));
  const pgCasa = usePaged(daCasa, 5);

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
            Histórico da Casa
          </SectionTitle>

          {daCasa.length ? (
            <Card t={t} style={{ gap: S.sm }}>
              <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
                Mais recente primeiro
              </Text>
              <View style={{ height: 1, backgroundColor: t.divider }} />
              {pgCasa.slice.map((r, i) => (
                // ⚠ Um ícone só, o mesmo em todas as linhas, e é uma decisão.
                //
                // O protótipo dá um ícone por tipo de acontecimento; as nossas
                // entradas são texto e mais nada — não trazem tipo. Adivinhá-lo
                // pelas palavras dava o ícone ERRADO de vez em quando, e cada
                // ícone desta app tem um significado exclusivo: um `smile` numa
                // linha que fala de dinheiro mente mais do que um ícone neutro
                // não diz. Quando as entradas ganharem tipo, ganham ícone.
                <View key={r.id || `${r.at}-${i}`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: S.md,
                    minHeight: 44, paddingVertical: S.md }}>
                  <Icon name="fileText" size={20} color={t.text3} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontFamily: FONT.body, fontSize: 14.5, lineHeight: 21, color: t.text2 }}>
                      {r.t}
                    </Text>
                  </View>
                  <View style={{ gap: 2, alignItems: 'flex-end' }}>
                    {/* Quem fez. Só existe com servidor: um registo escrito
                        neste telefone antes de haver casa ligada não sabe de
                        quem é, e inventar um nome era pior do que não o dizer. */}
                    {r.quem ? (
                      <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.text2 }}>
                        {r.quem}
                      </Text>
                    ) : null}
                    <Text style={{ fontFamily: FONT.ui, fontSize: 11, color: t.text3 }}>
                      {quando(r.at)}
                    </Text>
                  </View>
                </View>
              ))}
              <Pager t={t} pg={pgCasa} />
            </Card>
          ) : (
            // As palavras são as do protótipo.
            <Empty t={t} icon="fileText" title="Ainda sem registos."
              hint="Tudo o que a família fizer na app fica aqui: tarefas, despesas, compras, agenda e equipamentos." />
          )}
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
    </>
  );
}
