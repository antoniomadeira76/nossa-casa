import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useStore } from '../store';
import { S, FONT, R } from '../theme';
import { SectionTitle, Linha, Primary, Empty, Label, Choice, Avatar, avatarDe } from '../ui';
import Sheet from '../Sheet';
import { EUR, plural, TODAY_KEY, dmyDeChave } from '../format';
import { documentoDoExtracto, nomeDoFicheiroDoExtracto, diaCurto } from '../extracto-do-mes';
import PreVisualizarPDF from '../PreVisualizarPDF';

/**
 * O EXTRACTO DO MÊS — cada movimento de dinheiro da casa, por ordem do tempo.
 *
 * 17/09/2026. Ele pediu «um histórico de despesas mensais… registar cada
 * movimento monetário que se faz, quando e quem o faz… funciona como um
 * extracto», mostrei cinco desenhos em `design/cinco-extractos-do-mes.dc.html`
 * e mandou implementar o que eu recomendava: o 1 — extracto de banco, por ordem
 * do tempo, com o saldo corrente — com o cabeçalho do 4 — entrou, saiu, sobrou.
 *
 * ⚠ O selector de meses vive AQUI, e não num arquivo à parte. Os meses
 * anteriores estavam em Documentação › Nesta casa, o que dava dois caminhos para
 * a mesma coisa; assim o arquivo inteiro é uma fila de pastilhas no topo desta
 * folha, e o mês fechado abre-se onde se lê o aberto.
 *
 * ⚠ Nenhum número é escrito em lado nenhum: tudo é derivado das linhas que já
 * existem (`extracto-do-mes.js`). Um extracto gravado ao fechar o mês seria um
 * saldo escrito — o INVARIANTE #2 ao contrário.
 *
 * Só adultos chegam aqui — é o dinheiro da casa (INVARIANTE #3) —, e a app da
 * criança não tem porta para esta folha.
 */
export default function ExtractoDoMes({ t, extractos, inicial, user, onClose }) {
  const { nomeDaCasa, membros } = useStore();
  const lista = extractos || [];
  const [qual, setQual] = useState(() => {
    const i = lista.findIndex(e => e.inicio === (inicial && inicial.inicio));
    return i >= 0 ? i : 0;
  });
  // O documento a pré-visualizar, ou `null`. Carregar em «Exportar em PDF»
  // MOSTRA-O primeiro (17/09/2026) — quem exporta o dinheiro da casa vê o que
  // vai sair antes de o mandar para fora, e ainda pode fechar a folha.
  const [aVer, setAVer] = useState(null);
  const e = lista[qual] || null;

  const preVisualizar = () => setAVer({
    nome: nomeDoFicheiroDoExtracto(e),
    html: documentoDoExtracto({ extracto: e, casa: nomeDaCasa, hoje: TODAY_KEY, quemImprime: user, t }),
  });

  if (!e) {
    return (
      <Sheet t={t} title="Extracto" sub="Cada movimento de dinheiro da casa" onClose={onClose}>
        {/* ⚠ Diz PORQUÊ, e não só que está vazio. Sem o servidor da casa a
            responder, a app corre local e guarda as somas do mês — não as
            linhas de cada despesa —, e sem linhas não há extracto. Um ecrã
            vazio sem explicação manda a pessoa procurar o defeito no sítio
            errado; já aconteceu com o «a Google está mal configurada». */}
        <Empty t={t} icon="fileText" title="Ainda não há movimentos"
          hint="O extracto é feito das linhas da base de dados da casa — cada despesa, cada semanada, cada acerto. Sem o servidor da casa a responder, a app corre local e não as guarda." />
      </Sheet>
    );
  }

  // ── O cabeçalho: entrou, saiu, sobrou ──────────────────────────────────────
  //
  // Os três números do desenho 4, por cima da lista do desenho 1. São a SOMA DA
  // LISTA que está por baixo — nunca uma contagem ao lado dela.
  const numero = (rotulo, valor, cor) => (
    <View style={{ flex: 1, gap: 2 }}>
      <Label t={t}>{rotulo}</Label>
      <Text numberOfLines={1} style={{ fontFamily: FONT.display, fontSize: 17, fontWeight: '600', color: cor }}>
        {EUR(valor)}
      </Text>
    </View>
  );

  // ── Uma linha de movimento ────────────────────────────────────────────────
  //
  // Dia · bola de quem · o que foi (com o detalhe por baixo) · valor, e o saldo
  // corrente em pequeno debaixo do valor. O saldo ficava numa quinta coluna no
  // desenho, e a 355 px de largura útil não cabia sem espremer o nome — por
  // baixo do valor ocupa a altura que a linha já tem.
  //
  // ⚠ Um movimento NEUTRO — um acerto entre os adultos, uma transferência entre
  // envelopes — mostra um traço em vez do saldo. O dinheiro mudou de mão ou de
  // gaveta e a casa ficou com o mesmo; repetir o saldo anterior dava a entender
  // que a linha o tinha mudado.
  const movimento = (m, ultimo) => {
    const entra = !m.neutro && m.valor >= 0;
    return (
      <Linha key={m.chave} t={t} last={ultimo} style={{ paddingVertical: S.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
          {/* ⚠ 42, e não 34. Medido no navegador com a letra da app: «02/09»
              a 11,5 px ocupa 32,8 px no Inter — um píxel e dois décimos de
              folga numa coluna de 34, e a data partia em duas linhas («02/0» /
              «9»), o que desalinhava a linha toda. 42 dá nove píxeis de folga.

              E o `numberOfLines` com o `flexShrink: 0` são o travão: assim a
              data não parte nem é espremida por um título comprido ao lado,
              aconteça o que acontecer à largura da folha. */}
          <Text numberOfLines={1} style={{ width: 42, flexShrink: 0,
            fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
            {diaCurto(m.data)}
          </Text>
          {m.quem
            ? <Avatar {...avatarDe(m.quem, membros[m.quem], t.text3)} size={22} />
            : <View style={{ width: 22, height: 22, borderRadius: R.pill, borderWidth: 1, borderColor: t.border }} />}
          <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
            <Text numberOfLines={1} style={{ fontFamily: FONT.body, fontSize: 14.5, color: t.text2 }}>
              {m.titulo}
            </Text>
            <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11, color: t.text3 }}>
              {[m.quem, m.detalhe].filter(Boolean).join(' · ') || 'a casa'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 1 }}>
            <Text style={{ fontFamily: FONT.ui, fontSize: 14.5,
              color: entra ? t.state.okTexto : m.neutro ? t.text3 : t.text2 }}>
              {m.neutro ? EUR(Math.abs(m.valor)) : `${m.valor < 0 ? '−' : '+'}${EUR(Math.abs(m.valor))}`}
            </Text>
            <Text style={{ fontFamily: FONT.ui, fontSize: 11, color: t.text3 }}>
              {m.neutro ? '—' : EUR(m.saldo)}
            </Text>
          </View>
        </View>
      </Linha>
    );
  };

  return (
    <Sheet t={t} title={`Extracto de ${e.nome}`}
      sub={e.aberto ? 'Mês em curso · até hoje' : `Mês fechado${e.fechadoEm ? ` a ${dmyDeChave(e.fechadoEm)}` : ''}`}
      onClose={onClose}
      action={<Primary t={t} comum icon="printer" label="Exportar em PDF"
        sub={plural(e.movimentos.length, 'movimento', 'movimentos')} onPress={preVisualizar} />}>
      <View style={{ gap: S.xl }}>

        {/* ── Virar a página: os outros meses, numa fila que rola ────────────
            Só aparece com mais do que um mês — uma fila de uma pastilha só é
            uma pastilha que não escolhe nada.

            ⚠ O ÍNDICE do arquivo é a lista em Documentação › Nesta casa; isto é
            a navegação de dentro do documento, para se passar de setembro a
            agosto sem sair. Duas coisas diferentes, e por isso com nomes
            diferentes. */}
        {lista.length > 1 ? (
          <View>
            <SectionTitle t={t}>Outro Mês</SectionTitle>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: S.sm, paddingVertical: S.xs, paddingHorizontal: S.xs }}>
              {lista.map((x, i) => (
                <Choice key={x.inicio} t={t} label={x.nome.replace(' de ', ' ')}
                  selected={i === qual} onPress={() => { setQual(i); setAVer(null); }} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View>
          <SectionTitle t={t}>O Mês</SectionTitle>
          <Linha t={t} last>
            <View style={{ flexDirection: 'row', gap: S.md, paddingHorizontal: S.xs, paddingVertical: S.xs }}>
              {numero('Entrou', e.entrou, t.state.okTexto)}
              {numero('Saiu', e.saiu, t.text2)}
              {numero('Sobrou', e.sobrou, e.sobrou >= 0 ? t.state.okTexto : t.state.errTexto)}
            </View>
          </Linha>
        </View>

        <View>
          <SectionTitle t={t}
            right={<Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
              {plural(e.movimentos.length, 'movimento', 'movimentos')}
            </Text>}>
            Movimentos
          </SectionTitle>
          {e.movimentos.length > 0
            ? e.movimentos.map((m, i) => movimento(m, i === e.movimentos.length - 1))
            : <Empty t={t} icon="wallet" title="Nenhum movimento neste mês" />}
        </View>

        {aVer ? (
          <PreVisualizarPDF t={t} nome={aVer.nome} html={aVer.html}
            titulo={`Extracto de ${e.nome}`} sub="É isto que sai em PDF"
            onFechar={() => setAVer(null)} />
        ) : null}
      </View>
    </Sheet>
  );
}
