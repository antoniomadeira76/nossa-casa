import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';

import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { EUR, dayLabel, parseKey, WD, plural } from '../format';
import { Card, SectionTitle, Label, AddButton, usePaged, Tap, Tile, Avatar, avatarDe } from '../ui';
import Icon, { Marca } from '../Icon';
import Sheet from '../Sheet';
import Confirm from '../Confirm';
import ListaArrastavel, { ATRASO_PARA_PEGAR } from '../ListaArrastavel';
import NovoArtigo from '../sheets/NovoArtigo';
import GerirArtigo from '../sheets/GerirArtigo';

// A lista partilhada. O modo de loja saiu daqui para ModoCompras.jsx: era um
// <Modal>, que no react-native-web escapa à raiz da app e tapava o rodapé.
// «Compras de domingo» — o dia por extenso, minúsculo, como na referência.
const diaDaSemana = (k) => {
  const o = parseKey(k);
  return o ? WD[(new Date(o.y, o.m, o.d).getDay() + 6) % 7].toLowerCase() : '';
};

export default function Compras({ t, user, onModoCompras, onIda }) {
  const st = useStore();
  const { s, set, allItems, envelopes, membros: MEMBERS, precoDe, compararLojas, removerArtigo, marcarArtigo, mudarPlanoDeCompras, seccoes } = st;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [aApagar, setAApagar] = useState(null);
  const [gerir, setGerir] = useState(null);   // id do artigo com a folha aberta

  // ── Dois adultos na mesma loja ────────────────────────────────────────────
  //
  // Enquanto este ecrã estiver aberto, o que o outro telemóvel marcar aparece
  // aqui sozinho. É a única área da app onde duas pessoas estão na mesma coisa
  // ao mesmo tempo — um nos frescos, o outro na mercearia — e é a única que
  // leva subscrição: em todo o resto, ler ao abrir chega.
  //
  // A subscrição fecha-se ao sair. Deixá-la aberta era uma ligação por ecrã
  // visitado, e bateria a arder por causa de uma lista que ninguém está a ver.
  useEffect(() => {
    st.seguirCompras(true);
    return () => st.seguirCompras(false);
  }, []);

  const items = allItems();
  const stateOf = (i) => s.status[i.id] || (i.real ? 'done' : 'open');
  // O artigo que está a ser apagado — a pergunta tem de continuar a saber de
  // qual fala depois de a lista já não o ter.
  const aApagarArtigo = items.find(i => i.id === aApagar);
  const aGerir = items.find(i => i.id === gerir);
  const doneItems = items.filter(i => stateOf(i) === 'done');
  const loja = st.lojaDoPlano();

  // A estimativa passa a usar o que a casa PAGOU nesta loja, e cai no que
  // está escrito só para o que ainda não se comprou. É o ganho de todos os
  // dias: um número que se aproxima da conta em vez de ser um palpite fixo.
  const estimate = items.reduce((a, i) => a + precoDe(i, loja).valor, 0);
  // Quantos artigos é que a estimativa já conhece — sem isto, um total baixo
  // porque se conhece pouco lê-se como uma lista barata.
  const conhecidos = items.filter(i => precoDe(i, loja).origem !== 'escrito').length;

  // A comparação entre lojas. Devolve `null` enquanto não houver o que dizer,
  // e é isso que a faz não aparecer no primeiro dia.
  const comparacao = compararLojas(items);
  const mercearia = envelopes.find(e => e.name === 'Mercearia');
  const merc = mercearia ? mercearia.limit - mercearia.used : 0;

  // Quem faz as compras tem de viver na casa. O plano guardava «Tomás» das
  // sementes, e continuava a nomeá-lo numa casa onde ele já não está — com o
  // avatar a «?», que é a guarda a funcionar e a pergunta a ficar por
  // responder. Sem ninguém válido, não se nomeia ninguém.
  // ⚠ PODE NÃO HAVER IDA MARCADA, e o ecrã tem de se ler à mesma.
  //
  // Isto era `s.shopPlan.who` cru, e o `puxarCasa` devolve `shopPlan: null`
  // sempre que não há lista aberta — que é o estado normal entre duas idas, e
  // o de uma casa acabada de abrir. Tocar em «Compras» dava ecrã BRANCO:
  // «Cannot read properties of null (reading 'who')».
  //
  // A loja guarda-o em cinco sítios (`(s.shopPlan || {})`, `s.shopPlan ? …`);
  // o ecrã não guardava em nenhum. Apanhado a percorrer os cinco separadores
  // com a casa vazia — nenhuma das 1385 provas o via, porque todas correm com
  // uma ida às compras marcada.
  const plano = s.shopPlan || {};
  const planoDe = MEMBERS[plano.who] ? plano.who : null;

  // Quem fica com as compras se alguém tocar em «Alterar»: o adulto seguinte,
  // à roda. ⚠ Os adultos vêm do QUADRO da casa, e não de uma lista escrita
  // aqui — é a classe de defeito que já escondeu as fichas das crianças ao
  // administrador. Com um adulto só, não há a quem passar: fica `null` e o
  // botão desliga-se em vez de mentir.
  const adultos = Object.keys(MEMBERS).filter(n => !MEMBERS[n].kid);
  const proximoComprador = adultos.length > 1
    ? adultos[(Math.max(0, adultos.indexOf(planoDe)) + 1) % adultos.length]
    : null;
  // O dia vem derivado: o gravado se ainda estiver para vir, senão o próximo
  // domingo. Ler `s.shopPlan.day` cru punha aqui datas de há duas semanas.
  const diaDoPlano = st.diaDoPlano();

  const listPg = usePaged(items, 5);

  // Pelo `marcarArtigo` da loja, que altera a LINHA do artigo no servidor.
  const toggle = (id) => marcarArtigo(id, 'done');

  return (
    <>
      {/* Sem nada na lista, o cartão do topo não se mostra.
          Eram quatro contadores a zero e um plano para uma ida às compras que
          não tem o que comprar — «Compras de domingo · António · loja por
          escolher», com uma lista vazia por baixo. Um aviso diz a mesma coisa
          numa linha, e diz-lhe a verdade.

          O plano volta assim que houver um artigo: ele existe, não se apagou —
          é o cartão que espera por ter o que anunciar. */}
      {items.length === 0 ? (
        <Tile t={t} kind="info">
          Não há nada na lista de compras desta casa.
        </Tile>
      ) : (
      <Card t={t} style={{ gap: S.lg }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {[['Artigos na lista', String(items.length)],
            ['Por comprar', String(items.filter(i => stateOf(i) === 'open').length)],
            ['Estimativa', EUR(estimate)],
            ['Envelope Mercearia', EUR(merc)]].map(([k, v], i) => (
            <View key={k} style={{ width: '50%', gap: 2, paddingBottom: S.lg }}>
              <Label t={t}>{k}</Label>
              <Text style={{ fontFamily: FONT.display, fontSize: 20,
                color: i === 3 ? t.state.okTexto : t.text2 }}>{v}</Text>
            </View>
          ))}
        </View>
        {/* Quantos artigos a estimativa já conhece. Um total baixo porque se
            conhece pouco lê-se como uma lista barata, e não é. */}
        {conhecidos > 0 ? (
          <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3, marginTop: -S.md }}>
            {plural(conhecidos, 'artigo com preço', 'artigos com preço')} de {items.length},
            {' '}do que já se comprou {loja ? `no ${loja}` : ''}.
          </Text>
        ) : null}

        <View style={{ height: 1, backgroundColor: t.divider }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar {...avatarDe(planoDe, MEMBERS[planoDe], t.text3)} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>
              {diaDoPlano ? `Compras de ${diaDaSemana(diaDoPlano)}` : 'Compras'}{planoDe ? ` · ${planoDe}` : ''}
            </Text>
            <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
              {/* Sem loja escolhida não se escreve « · undefined». Uma casa
                  nova não tem lojas, e a linha tem de ler-se de qualquer forma.

                  ⚠ E havia aqui um `{plano.time || ''}` no meio, com um « · »
                  de cada lado. O `time` só existia na semente da demonstração
                  — o servidor devolve o plano inteiro sem ele —, e numa casa
                  ligada a linha lia-se «Quarta, 09/09 ·  · Pingo Doce do
                  Restelo». Dois separadores com nada entre eles. O campo saiu
                  também da semente: uma ida às compras tem dia, não hora. */}
              {diaDoPlano ? `${dayLabel(diaDoPlano)}` : ''}{loja ? `${diaDoPlano ? ' · ' : ''}${loja}` : ' · loja por escolher'}
            </Text>
          </View>
          {/* ⚠ Este botão não tinha `onPress`. Dizia «Alterar», com a cor de
              ação, e tocá-lo não fazia nada — «andaime sem obra» do lado do
              ecrã. Passa quem vai às compras ao adulto seguinte, que é o que o
              rótulo promete, e diz qual antes de o fazer.

              E tinha `minHeight: 44` sem `minWidth`: a palavra media 42 px de
              largura. O INVARIANTE #5 é nas duas medidas. */}
          {/* ⚠ Levava as compras ao adulto seguinte, e mais nada — o dia, a
              hora e a loja não se mudavam de sítio nenhum. Agora abre o ecrã
              «Como fazemos compras», onde as três estão juntas com as lojas e
              os corredores. Desenho E de `design/ida-as-compras.dc.html`. */}
          <Pressable accessibilityRole="button"
            accessibilityLabel="Alterar a ida às compras"
            accessibilityHint="Quem vai, o dia e a hora, e a loja"
            onPress={onIda}
            style={{ minHeight: 44, minWidth: 44, paddingHorizontal: S.sm, justifyContent: 'center' }}>
            <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '700',
              color: t.actFg }}>Alterar</Text>
          </Pressable>
        </View>
      </Card>
      )}

      {/* Onde a lista sai mais barata.
          Só aparece quando há o que dizer: a comparação faz-se sobre os
          artigos conhecidos em AMBAS as lojas, e abaixo de três cala-se. Nas
          primeiras semanas não se vê nada, e é o correto — um conselho errado
          sobre onde ir ao sábado custa uma viagem.

          E leva uma ação: um conselho que não se pode seguir é meio conselho.
          Trocar a loja do plano é o passo que se dá a seguir a ler isto. */}
      {comparacao ? (
        <Card t={t} style={{ gap: S.md, borderLeftWidth: 4, borderLeftColor: t.state.ok }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="storefront" size={22} color={t.state.okTexto} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>
                Esta lista sai {EUR(comparacao.poupanca)} mais barata no {comparacao.loja}
              </Text>
              <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
                Contra o {comparacao.contra}, sobre{' '}
                {plural(comparacao.sobre, 'artigo que já comprou', 'artigos que já comprou')} nas
                duas — de {comparacao.deQuantos} na lista.
              </Text>
            </View>
          </View>
          {comparacao.loja !== loja ? (
            <Pressable
              onPress={() => mudarPlanoDeCompras({ store: s.stores.indexOf(comparacao.loja) })}
              accessibilityRole="button"
              accessibilityLabel={`Passar as compras para o ${comparacao.loja}`}
              style={({ pressed }) => ({ minHeight: 44, borderRadius: R.row, borderWidth: 1,
                borderColor: t.border, alignItems: 'center', justifyContent: 'center',
                backgroundColor: pressed ? t.subtle : 'transparent' })}>
              <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '600', color: t.actFg }}>
                Passar as compras para o {comparacao.loja}
              </Text>
            </Pressable>
          ) : null}
        </Card>
      ) : null}

      {/* ⚠ As secções da CASA, e não a constante do `data.js`. E a comparação
          é pelo NOME: o `i.s` guardava um índice, e a partir do momento em que
          a casa pode reordenar as secções um índice aponta para outra coisa. */}
      {seccoes.map((sec) => {
        const rows = items.filter(i => i.s === sec);
        if (!rows.length) return null;
        return (
          <View key={sec}>
            <SectionTitle t={t} right={
              <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>{plural(rows.length, 'artigo', 'artigos')}</Text>
            }>{sec}</SectionTitle>
            {/* ⚠ A ordem dentro do corredor é a que a mão dá. A pressão longa
                arma o arrasto e o artigo nunca sai do seu corredor — o
                corredor manda nos grupos, como a urgência manda nos das
                tarefas, e mudar de corredor faz-se na folha de gestão, com o
                nome do corredor à vista.

                Uma `ListaArrastavel` por corredor, e não uma para a lista
                toda: as secções são blocos com título pelo meio, e um só
                responsável ao longo de todos eles media o passo por cima dos
                títulos. Com uma por corredor, o `grupoDe` é constante e as
                fronteiras são as do bloco. */}
            <ListaArrastavel
              itens={rows}
              grupoDe={() => sec}
              espaco={S.md}
              aoLargar={(ids) => st.reordenarArtigos(ids)}
              render={(i, { arrastando, armar }) => {
                const done = stateOf(i) === 'done';
                return (
                  <Card key={i.id} t={t} style={{
                    borderWidth: arrastando ? 2 : done ? 2 : 1,
                    borderColor: arrastando ? t.accent : done ? t.state.okBorder : t.border,
                    backgroundColor: done ? t.state.okBg : t.card,
                  }}>
                    {/* A LINHA alterna apanhado/por apanhar; o lápis abre a
                        gestão. É o mesmo idioma das Tarefas, e o caixote saiu
                        daqui para dentro da folha: com o lápis a chegar, a
                        linha ficava com três alvos, e o erro #6 do CLAUDE.md
                        é exactamente esse — uma linha, um destino.

                        ⚠ É o `onLongPress` DESTA linha que arma o arrasto.
                        Não há alça, como nas tarefas e pela mesma razão: uma
                        alça era um terceiro alvo. O toque curto continua a
                        marcar o artigo — a `ListaArrastavel` só toma conta do
                        dedo depois de estar armada. */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                      <Pressable onPress={() => toggle(i.id)} accessibilityRole="button"
                        onLongPress={() => armar(i.id)} delayLongPress={ATRASO_PARA_PEGAR}
                        accessibilityLabel={i.label}
                        accessibilityHint="Mantenha premido para mudar a ordem dentro do corredor"
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
                        <Icon name={done ? 'checkCircle' : 'infoCircle'} size={24} color={done ? t.state.ok : t.text3} />
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text numberOfLines={2} style={{ fontFamily: FONT.body, fontSize: 15.5, color: t.text2 }}>{i.label}</Text>
                          <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>{i.by}</Text>
                        </View>
                        <Text style={{ fontFamily: FONT.ui, fontSize: 13,
                          fontWeight: done ? '600' : '400', color: done ? t.state.okTexto : t.text3 }}>
                          {done ? EUR(i.real || i.est) : `~ ${EUR(i.est)}`}
                        </Text>
                      </Pressable>
                      <Tap onPress={() => setGerir(i.id)} label={`Gerir ${i.label}`} size={44}>
                        <Icon name="edit" size={20} color={t.text3} />
                      </Tap>
                    </View>
                  </Card>
                );
              }}
            />
          </View>
        );
      })}

      {/* ⚠ Um artigo apagado não desapaga o que a casa aprendeu sobre o preço
          dele: o histórico é indexado pelo RÓTULO e não pelo id. A pergunta
          diz isso, para ninguém hesitar a arrumar a lista com medo de perder
          a comparação entre lojas. */}
      {aApagarArtigo ? (
        <Confirm t={t} destructive icon="trash"
          title={`Apagar «${aApagarArtigo.label}»?`}
          message="O artigo sai da lista. Os preços que a casa já registou para ele ficam — a comparação entre lojas não se perde."
          confirmLabel="Apagar"
          onConfirm={() => { removerArtigo(aApagar); setAApagar(null); setGerir(null); }}
          onCancel={() => setAApagar(null)} />
      ) : null}

      {/* Alterar o artigo: o rótulo, o corredor, a estimativa, o habitual — os
          mesmos quatro campos com que ele foi criado. Havia criar e apagar, e
          mais nada: mudar o nome era apagar e voltar a escrever, e com isso
          perdia-se o lugar dele no corredor e o estado desta ida. */}
      {aGerir ? (
        <Sheet t={t} title={aGerir.label} sub={`Corredor · ${aGerir.s}`}
          onClose={() => setGerir(null)}>
          <GerirArtigo t={t} artigo={aGerir}
            onApagar={() => setAApagar(aGerir.id)}
            onClose={() => setGerir(null)} />
        </Sheet>
      ) : null}

      <AddButton t={t} label="acrescentar artigo" onPress={() => setSheetOpen(true)} />
      <AddButton t={t} label="iniciar compras na loja" onPress={onModoCompras} />

      {s.shopHistory.length ? (
        <View>
          <SectionTitle t={t}>Histórico de Compras</SectionTitle>
          <Card t={t} pad={false} style={{ paddingHorizontal: 16 }}>
            {s.shopHistory.slice(0, 10).map((h, i, arr) => (
              <Pressable key={h.at} onPress={() => {
                // Repetir esta lista: readd items from the purchase
                // This would require storing items per purchase in shopHistory
                // For now, showing the feature intent
              }} accessibilityRole="button" accessibilityLabel={`Repetir compra em ${h.store}`}
                style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12,
                  borderBottomWidth: i === Math.min(9, arr.length - 1) ? 0 : 1, borderBottomColor: t.divider }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>{h.store}</Text>
                  <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
                    {h.who} · {h.items} artigos · {new Date(h.at).toLocaleDateString('pt-PT')}
                  </Text>
                </View>
                <View style={{ gap: 8, alignItems: 'flex-end' }}>
                  <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.text2 }}>{EUR(h.total)}</Text>
                  <Icon name="caretRight" size={16} color={t.text3} />
                </View>
              </Pressable>
            ))}
          </Card>
        </View>
      ) : null}

      {sheetOpen ? (
        <Sheet t={t} title="Novo Artigo" sub="Acrescentar à lista de compras"
          onClose={() => setSheetOpen(false)}>
          <NovoArtigo t={t} user={user} onClose={() => setSheetOpen(false)} />
        </Sheet>
      ) : null}
    </>
  );
}

// Carrinho: validação antes de fechar e registar despesa