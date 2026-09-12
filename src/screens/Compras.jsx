import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';

import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { EUR, dayLabel, parseKey, WD, WD_SHORT, plural, dkey, semanaDeHoje, pad2 } from '../format';
import { Card, SectionTitle, Linha, Label, AddButton, usePaged, Tap, Tile, Avatar, avatarDe, Pill, Row } from '../ui';
import PartilharLista from '../sheets/PartilharLista';
import Icon, { Marca } from '../Icon';
import Sheet from '../Sheet';
import Confirm from '../Confirm';
import ListaArrastavel, { ATRASO_PARA_PEGAR } from '../ListaArrastavel';
import NovoArtigo from '../sheets/NovoArtigo';
import GerirArtigo from '../sheets/GerirArtigo';
import JantarDoDia from '../sheets/JantarDoDia';
import NovoPrato from '../sheets/NovoPrato';

// A lista partilhada. O modo de loja saiu daqui para ModoCompras.jsx: era um
// <Modal>, que no react-native-web escapa à raiz da app e tapava o rodapé.
// «Compras de domingo» — o dia por extenso, minúsculo, como na referência.
const diaDaSemana = (k) => {
  const o = parseKey(k);
  return o ? WD[(new Date(o.y, o.m, o.d).getDay() + 6) % 7].toLowerCase() : '';
};

export default function Compras({ t, user, onModoCompras, onIda }) {
  const st = useStore();
  const { s, set, allItems, envelopes, membros: MEMBERS, precoDe, compararLojas, removerArtigo, marcarArtigo, mudarPlanoDeCompras, seccoes, ementaNaCasa } = st;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [aApagar, setAApagar] = useState(null);
  const [gerir, setGerir] = useState(null);   // id do artigo com a folha aberta
  // A ementa: o dia cuja folha está aberta, e se a folha do prato novo está por cima.
  const [jantar, setJantar] = useState(null);
  const [novoPrato, setNovoPrato] = useState(false);
  const [aApagarPrato, setAApagarPrato] = useState(null);
  // Se a semana está aberta aos sete dias, ou só aos jantares marcados.
  const [semanaToda, setSemanaToda] = useState(false);

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
  // A folha de partilhar a lista com quem não tem a app (12/09/2026).
  const [aPartilhar, setAPartilhar] = useState(false);

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
          {/* O envelope da Mercearia só quando a casa o TEM: sem ele, lia-se
              «0,00 €» a verde — um número inventado com ar de dado. */}
          {[['Artigos na lista', String(items.length)],
            ['Por comprar', String(items.filter(i => stateOf(i) === 'open').length)],
            ['Estimativa', EUR(estimate)],
            ...(mercearia ? [['Envelope Mercearia', EUR(merc)]] : [])].map(([k, v]) => (
            <View key={k} style={{ width: '50%', gap: 2, paddingBottom: S.lg }}>
              <Label t={t}>{k}</Label>
              <Text style={{ fontFamily: FONT.display, fontSize: 20,
                color: k === 'Envelope Mercearia' ? t.state.okTexto : t.text2 }}>{v}</Text>
            </View>
          ))}
        </View>
        {/* Quantos artigos a estimativa já conhece. Um total baixo porque se
            conhece pouco lê-se como uma lista barata, e não é. */}
        {conhecidos > 0 ? (
          <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3, marginTop: -S.md }}>
            {`${plural(conhecidos, 'artigo com preço', 'artigos com preço')} de ${items.length}, do que já se comprou${loja ? ` no ${loja}` : ''}.`}
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
        {/* ── Partilhar com quem não tem a app ──────────────────────────────
            «Manda-me a lista»: um endereço só de leitura, válido uma hora,
            com os rótulos e os corredores e mais nada — sem prendas «só
            adultos», sem preços, sem nomes (12/09/2026, a nona das dez). Uma
            linha, um destino: abre a folha, que pede o endereço ao servidor. */}
        <View style={{ height: 1, backgroundColor: t.divider }} />
        <Row t={t} icon="share" title="Partilhar a lista"
          sub="Um endereço só de leitura, válido uma hora, para quem não tem a app"
          right={<Icon name="caretRight" size={18} color={t.text3} />}
          onPress={() => setAPartilhar(true)} last />
      </Card>
      )}

      {aPartilhar ? <PartilharLista t={t} user={user} onClose={() => setAPartilhar(false)} /> : null}

      {/* A ementa da semana — sete jantares, um prato por dia. A linha do dia
          abre a folha onde se escolhe o prato e se põe na lista o que falta.
          (11/09/2026 — a terceira das dez funcionalidades.)

          ⚠ E é OPCIONAL, desde 12/09/2026, de duas maneiras (A e C de
          `design/ementa-opcional.dc.html`, escolhidas pelo dono da casa ao ver
          sete linhas de «Sem jantar marcado»):
            A — a casa desliga-a na Gestão (`ementaNaCasa`), e a secção sai.
            C — ligada, mostra só os dias com jantar; sem nenhum, é UMA linha,
                «Planear a semana», que abre os sete dias. Quem já os abriu
                pode voltar a dobrá-los. */}
      {ementaNaCasa ? (() => {
        const semana = semanaDeHoje();
        const dias = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(semana.seg); d.setDate(semana.seg.getDate() + i);
          const k = dkey(d.getFullYear(), d.getMonth(), d.getDate());
          return { d, i, k, prato: (s.pratos || []).find(p => p.id === (s.ementa || {})[k]) || null };
        });
        const comJantar = dias.filter(x => x.prato);
        const visiveis = semanaToda ? dias : comJantar;
        const intervalo = <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>{semana.intervalo}</Text>;
        return (
          <View>
            <SectionTitle t={t} right={intervalo}>Ementa da Semana</SectionTitle>
            {comJantar.length === 0 && !semanaToda ? (
              <Linha t={t} last>
                <Pressable onPress={() => setSemanaToda(true)} accessibilityRole="button"
                  accessibilityLabel="Planear a semana"
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12,
                    minHeight: 44, opacity: pressed ? 0.7 : 1 })}>
                  {/* Sem «esta semana»: com o «Planear» e a seta à direita, a
                      frase inteira cortava em «esta sema…» nos 355 px — medido
                      no navegador como António. A semana já está no título. */}
                  <Text numberOfLines={1} style={{ flex: 1, fontFamily: FONT.body, fontSize: 15.5, color: t.text3 }}>
                    Sem jantares marcados
                  </Text>
                  <Text style={{ fontFamily: FONT.display, fontSize: 13, fontWeight: '700', color: t.actFg }}>Planear</Text>
                  <Icon name="caretRight" size={18} color={t.text3} />
                </Pressable>
              </Linha>
            ) : (
            <View style={{ paddingHorizontal: S.xs }}>
              {visiveis.map(({ d, i, k, prato }, n) => (
                <Linha key={k} t={t} last={n === visiveis.length - 1}>
                  <Pressable onPress={() => setJantar(k)} accessibilityRole="button"
                    accessibilityLabel={`Jantar de ${WD[i]}`}
                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12,
                      minHeight: 44, opacity: pressed ? 0.7 : 1 })}>
                    <View style={{ width: 44, gap: 1 }}>
                      <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.text2 }}>{WD_SHORT[i]}</Text>
                      <Text style={{ fontFamily: FONT.ui, fontSize: 11, color: t.text3 }}>{`${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`}</Text>
                    </View>
                    <Text numberOfLines={1} style={{ flex: 1, fontFamily: FONT.body, fontSize: 15.5,
                      color: prato ? t.text2 : t.text3 }}>{prato ? prato.nome : 'Sem jantar marcado'}</Text>
                    <Icon name="caretRight" size={18} color={t.text3} />
                  </Pressable>
                </Linha>
              ))}
              {/* Dobrar ou abrir a semana. Texto de 12,5 px em `actFg` — o
                  único tom do esquema que se lê como texto pequeno. */}
              <Pressable onPress={() => setSemanaToda(v => !v)} accessibilityRole="button"
                accessibilityLabel={semanaToda ? 'Mostrar só os jantares marcados' : 'Mostrar a semana toda'}
                style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: S.sm }}>
                <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, fontWeight: '600', color: t.actFg }}>
                  {semanaToda ? 'mostrar só os jantares marcados' : 'mostrar a semana toda'}
                </Text>
              </Pressable>
            </View>
            )}
          </View>
        );
      })() : null}

      {jantar ? (() => {
        const o = parseKey(jantar);
        const titulo = o ? `${WD[(new Date(o.y, o.m, o.d).getDay() + 6) % 7]}, ${pad2(o.d)}/${pad2(o.m + 1)}` : '';
        return (
          <Sheet t={t} title={`Jantar de ${titulo}`} sub="Escolha o prato e ponha na lista o que falta"
            onClose={() => setJantar(null)}>
            <JantarDoDia t={t} user={user} dia={jantar} titulo="Prato"
              onNovoPrato={() => setNovoPrato(true)}
              onApagarPrato={(p) => setAApagarPrato(p)}
              onClose={() => setJantar(null)} />
            {novoPrato ? (
              <Sheet t={t} title="Novo Prato" sub="O nome e os ingredientes" onClose={() => setNovoPrato(false)}>
                <NovoPrato t={t} onClose={() => setNovoPrato(false)}
                  onCriado={(id) => { st.marcarJantar(jantar, id); setNovoPrato(false); }} />
              </Sheet>
            ) : null}
            {aApagarPrato ? (
              <Confirm t={t} destructive icon="trash"
                title={`Apagar «${aApagarPrato.nome}»?`}
                message="O prato sai da casa e os dias que o tinham ficam sem jantar. Os artigos que já entraram na lista ficam."
                confirmLabel="Apagar"
                onConfirm={() => { st.apagarPrato(aApagarPrato.id); setAApagarPrato(null); }}
                onCancel={() => setAApagarPrato(null)} />
            ) : null}
          </Sheet>
        );
      })() : null}

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
          {/* Só se a loja mais barata ainda existir na casa: o `indexOf` de uma
              loja que saiu dava −1, e o plano ficava a apontar para nada. */}
          {comparacao.loja !== loja && s.stores.includes(comparacao.loja) ? (
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
              espaco={0}
              aoLargar={(ids) => st.reordenarArtigos(ids)}
              render={(i, { arrastando, armar }) => {
                const done = stateOf(i) === 'done';
                return (
                  <Linha key={i.id} t={t}
                    // Linha plana (desenho C, 09/09/2026): o estado que era a
                    // borda do cartão passa a faixa e tinta — verde apanhado,
                    // o acento enquanto se arrasta.
                    faixa={arrastando ? t.accent : done ? t.state.okBorder : undefined}
                    tinta={arrastando ? t.subtle : done ? t.state.okBg : undefined}>
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
                          {/* Uma prenda: a criança não recebe esta linha do
                              servidor. A pastilha diz-o a quem a vê, para
                              ninguém a ler em voz alta à mesa. */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
                            {i.vis === 'adultos' ? (
                              <Pill label="Só adultos" fg={t.state.infoTexto} bg={t.state.tileInfo} border={t.state.info} />
                            ) : null}
                            <Text numberOfLines={1} style={{ flex: 1, fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>{i.by}</Text>
                          </View>
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
                  </Linha>
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
          {/* Linhas planas, sem cartão — desenho C (09/09/2026). */}
          <View style={{ paddingHorizontal: S.xs }}>
            {/* ⚠ Cada linha era um botão «Repetir compra» com o `onPress`
                VAZIO — um botão que prometia e não fazia, com seta e tudo.
                O histórico não guarda os artigos de cada ida, logo não há o
                que repetir: a linha é só de leitura, sem seta, e diz o que
                sabe (a loja e quem foi podem vir vazios do servidor).
                Revisão de 13/09/2026. */}
            {s.shopHistory.slice(0, 10).map((h, i, arr) => (
              <View key={h.at}
                style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12,
                  borderBottomWidth: i === Math.min(9, arr.length - 1) ? 0 : 1, borderBottomColor: t.divider }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>{h.store || 'Ida às compras'}</Text>
                  <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
                    {`${h.who ? `${h.who} · ` : ''}${plural(h.items || 0, 'artigo', 'artigos')} · ${new Date(h.at).toLocaleDateString('pt-PT')}`}
                  </Text>
                </View>
                <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.text2 }}>{EUR(h.total)}</Text>
              </View>
            ))}
          </View>
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