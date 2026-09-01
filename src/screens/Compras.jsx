import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { S, R, FONT, elev, corDoMembro } from '../theme';
import { EUR, dayLabel, parseKey, WD } from '../format';
import { SECTIONS } from '../data';
import { Card, SectionTitle, Label, Pill, Bar, Primary, AddButton, Empty, usePaged, Pager, Tap, Tile, Avatar } from '../ui';
import Icon, { Marca } from '../Icon';
import Sheet from '../Sheet';
import NovoArtigo from '../sheets/NovoArtigo';

// A lista partilhada. O modo de loja saiu daqui para ModoCompras.jsx: era um
// <Modal>, que no react-native-web escapa à raiz da app e tapava o rodapé.
// «Compras de domingo» — o dia por extenso, minúsculo, como na referência.
const diaDaSemana = (k) => {
  const o = parseKey(k);
  return o ? WD[(new Date(o.y, o.m, o.d).getDay() + 6) % 7].toLowerCase() : '';
};

export default function Compras({ t, user, onModoCompras }) {
  const st = useStore();
  const { s, set, allItems, envelopes, membros: MEMBERS, precoDe, compararLojas } = st;
  const [sheetOpen, setSheetOpen] = useState(false);

  const items = allItems();
  const stateOf = (i) => s.status[i.id] || (i.real ? 'done' : 'open');
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
  const planoDe = MEMBERS[s.shopPlan.who] ? s.shopPlan.who : null;
  // O dia vem derivado: o gravado se ainda estiver para vir, senão o próximo
  // domingo. Ler `s.shopPlan.day` cru punha aqui datas de há duas semanas.
  const diaDoPlano = st.diaDoPlano();

  const listPg = usePaged(items, 5);

  const toggle = (id) => set(x => ({
    status: { ...x.status, [id]: (x.status[id] || 'open') === 'done' ? 'open' : 'done' },
  }));

  return (
    <>
      <Card t={t} style={{ gap: S.lg }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {[['Artigos na lista', String(items.length)],
            ['Por comprar', String(items.filter(i => stateOf(i) === 'open').length)],
            ['Estimativa', EUR(estimate)],
            ['Envelope Mercearia', EUR(merc)]].map(([k, v], i) => (
            <View key={k} style={{ width: '50%', gap: 2, paddingBottom: S.lg }}>
              <Label t={t}>{k}</Label>
              <Text style={{ fontFamily: FONT.display, fontSize: 20,
                color: i === 3 ? t.state.okDeep : t.text2 }}>{v}</Text>
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
          <Avatar initial={(MEMBERS[planoDe] || { initial: '?' }).initial}
            color={corDoMembro(planoDe) || t.text3} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>
              {diaDoPlano ? `Compras de ${diaDaSemana(diaDoPlano)}` : 'Compras'}{planoDe ? ` · ${planoDe}` : ''}
            </Text>
            <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
              {/* Sem loja escolhida não se escreve « · undefined». Uma casa
                  nova não tem lojas, e a linha tem de ler-se de qualquer forma. */}
              {diaDoPlano ? `${dayLabel(diaDoPlano)} · ` : ''}{s.shopPlan.time}{loja ? ` · ${loja}` : ' · loja por escolher'}
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Alterar quem vai às compras"
            style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '700', color: t.accent }}>Alterar</Text>
          </Pressable>
        </View>
      </Card>

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
            <Icon name="storefront" size={22} color={t.state.okDeep} />
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
              onPress={() => set(x => ({
                shopPlan: { ...x.shopPlan, store: x.stores.indexOf(comparacao.loja) },
              }))}
              accessibilityRole="button"
              accessibilityLabel={`Passar as compras para o ${comparacao.loja}`}
              style={({ pressed }) => ({ minHeight: 44, borderRadius: R.row, borderWidth: 1,
                borderColor: t.border, alignItems: 'center', justifyContent: 'center',
                backgroundColor: pressed ? t.subtle : 'transparent' })}>
              <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '600', color: t.accent }}>
                Passar as compras para o {comparacao.loja}
              </Text>
            </Pressable>
          ) : null}
        </Card>
      ) : null}

      {SECTIONS.map((sec, si) => {
        const rows = items.filter(i => i.s === si);
        if (!rows.length) return null;
        return (
          <View key={sec}>
            <SectionTitle t={t} right={
              <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>{rows.length} artigos</Text>
            }>{sec}</SectionTitle>
            <View style={{ gap: S.md }}>
              {rows.map(i => {
                const done = stateOf(i) === 'done';
                return (
                  <Card key={i.id} t={t} style={{
                    borderWidth: done ? 2 : 1,
                    borderColor: done ? t.state.okBorder : t.border,
                    backgroundColor: done ? t.state.okBg : t.card,
                  }}>
                    <Pressable onPress={() => toggle(i.id)} accessibilityRole="button"
                      accessibilityLabel={i.label}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
                      <Icon name={done ? 'checkCircle' : 'infoCircle'} size={24} color={done ? t.state.ok : t.text3} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text numberOfLines={2} style={{ fontFamily: FONT.body, fontSize: 15.5, color: t.text2 }}>{i.label}</Text>
                        <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>{i.by}</Text>
                      </View>
                      <Text style={{ fontFamily: FONT.ui, fontSize: 13,
                        fontWeight: done ? '600' : '400', color: done ? t.state.okDeep : t.text3 }}>
                        {done ? EUR(i.real || i.est) : `~ ${EUR(i.est)}`}
                      </Text>
                    </Pressable>
                  </Card>
                );
              })}
            </View>
          </View>
        );
      })}

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