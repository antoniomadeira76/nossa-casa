import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT, elev } from '../theme';
import { EUR } from '../format';
import { SECTIONS } from '../data';
import { Card, Label, Bar, Primary, AddButton, usePaged, Pager } from '../ui';
import Icon from '../Icon';
import Sheet from '../Sheet';
import NovoArtigo from '../sheets/NovoArtigo';
import Carrinho from '../sheets/Carrinho';

// Modo de loja. Vivia dentro do Compras.jsx e num `<Modal>` — que no
// react-native-web sai da raiz da app e tapava o rodapé: `elementFromPoint`
// no meio do rodapé devolvia este painel, ou seja os separadores não se
// conseguiam tocar. A docs/referencia/10-modo-compras.png mostra o rodapé
// visível e o separador «Compras» aceso.
//
// Agora é uma vista de ecrã inteiro como as outras: o App põe o cabeçalho
// (seta de voltar, título, loja) e o rodapé, e isto é só o conteúdo.
export default function ModoCompras({ t, user, onClose }) {
  const { s, set, allItems } = useStore();
  const [step, setStep] = useState(-1);            // -1 = Todos
  const [novoArtigo, setNovoArtigo] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const items = allItems();
  const stateOf = (i) => s.status[i.id] || (i.real ? 'done' : 'open');
  const doneItems = items.filter(i => stateOf(i) === 'done');
  const semStock = items.filter(i => stateOf(i) === 'sem-stock');
  const porConfirmar = items.filter(i => stateOf(i) === 'open');
  const cart = doneItems.reduce((a, i) => a + (i.real || i.est), 0);
  const estimate = items.reduce((a, i) => a + i.est, 0);
  const merc = 550 + (s.envMove['Mercearia'] || 0) - (s.monthZero ? 0 : 412);

  const inStep = step === -1 ? items : items.filter(i => i.s === step);
  const pg = usePaged(inStep, 10);

  // Um artigo tem três estados nesta lista, não dois. «Sem stock» não é o
  // mesmo que «por comprar»: quem está na loja já lá foi ver.
  const marcar = (id, estado) => set(x => ({
    status: { ...x.status, [id]: (x.status[id] || 'open') === estado ? 'open' : estado },
  }));

  const tabs = [{ i: -1, label: 'Todos' }, ...SECTIONS.map((n, i) => ({ i, label: n.split(' ')[0] }))];
  const pctCart = merc > 0 ? (cart / merc) * 100 : 0;
  const barColor = pctCart > 100 ? t.state.err : pctCart > 80 ? t.state.warn : t.state.info;

  return (
    <>
      {/* A loja e a ordem por que se percorre — o que a referência mostra
          por cima dos separadores de corredor. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
        <Icon name="storefront" size={20} color={t.slate} />
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: FONT.ui, fontSize: 12.5, color: t.text2 }}>
          {s.stores[s.shopPlan.store]} · ordem do corredor
        </Text>
      </View>

      {/* separadores por corredor */}
      <View style={{ flexDirection: 'row', gap: S.md }}>
        {tabs.map(x => {
          const on = step === x.i;
          const limpo = x.i >= 0 && items.filter(i => i.s === x.i).every(i => stateOf(i) !== 'open');
          return (
            <Pressable key={x.i} onPress={() => setStep(x.i)} accessibilityRole="tab"
              accessibilityLabel={x.label} accessibilityState={{ selected: on }}
              style={{ flex: 1, minHeight: 44, gap: 6, justifyContent: 'center' }}>
              <View style={{ height: 4, borderRadius: R.pill,
                backgroundColor: on ? t.accent : limpo ? t.state.ok : t.border }} />
              <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11, textAlign: 'center',
                fontWeight: on || limpo ? '600' : '400',
                color: on ? t.accent : limpo ? t.state.okDeep : t.text3 }}>{x.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Card t={t} style={{ gap: S.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Label t={t}>Total no carrinho</Label>
            <Text style={{ fontFamily: FONT.display, fontSize: 28, color: t.text2 }}>{EUR(cart)}</Text>
          </View>
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3, textAlign: 'right' }}>
            estimativa {EUR(estimate)}{'\n'}envelope {EUR(merc)}
          </Text>
        </View>
        <Bar t={t} pct={pctCart} color={barColor} />
        <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
          {doneItems.length} de {items.length} artigos confirmados
          {porConfirmar.length ? ` · ${porConfirmar.length} por confirmar` : ''}
          {semStock.length ? ` · ${semStock.length} sem stock` : ''}
        </Text>
      </Card>

      <View style={{ gap: S.md }}>
        <Text style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: '700', color: t.slate }}>
          {step === -1 ? `Toda a lista · ${items.length} artigos` : `${SECTIONS[step]} · ${inStep.length} artigos`}
        </Text>

        {pg.slice.map(i => {
          const estado = stateOf(i);
          const feito = estado === 'done';
          const sem = estado === 'sem-stock';
          return (
            <View key={i.id} style={{
              minHeight: 64, borderRadius: R.card, padding: 16, flexDirection: 'row',
              alignItems: 'center', gap: 14, borderWidth: feito ? 2 : 1,
              borderColor: feito ? t.state.okBorder : sem ? t.state.warn : t.border,
              backgroundColor: feito ? t.state.okBg : sem ? t.state.warnBg : t.card, ...elev(1),
            }}>
              <Icon name={feito ? 'checkCircle' : sem ? 'closeCircle' : 'infoCircle'} size={30}
                color={feito ? t.state.ok : sem ? t.state.warnDeep : t.text3} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontFamily: FONT.body, fontSize: 16, color: t.text2 }}>{i.label}</Text>
                <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
                  {feito ? `Confirmado · ${EUR(i.real || i.est)}`
                    : sem ? 'Sem stock na loja'
                    : `estimativa ${EUR(i.est)}`}
                </Text>
              </View>

              {/* Duas acções por linha, como na referência. Cada uma no seu
                  alvo de 44 — uma pastilha tocável dentro de uma linha
                  tocável obrigava a adivinhar onde se tinha tocado. */}
              <View style={{ gap: 2 }}>
                <Pressable onPress={() => marcar(i.id, 'done')} accessibilityRole="button"
                  accessibilityLabel={`${feito ? 'Desconfirmar' : 'Confirmar'} ${i.label}`}
                  style={{ minHeight: 44, minWidth: 88, alignItems: 'flex-end', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '700',
                    color: feito ? t.text3 : t.accent, letterSpacing: 0.4 }}>
                    {feito ? 'Desfazer' : 'Confirmar'}
                  </Text>
                </Pressable>
                {!feito ? (
                  <Pressable onPress={() => marcar(i.id, 'sem-stock')} accessibilityRole="button"
                    accessibilityLabel={`${sem ? 'Repor' : 'Marcar sem stock'} ${i.label}`}
                    style={{ minHeight: 44, minWidth: 88, alignItems: 'flex-end', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, fontWeight: '600',
                      color: sem ? t.state.warnDeep : t.text3 }}>
                      {sem ? 'Repor' : 'Sem stock'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}

        <Pager t={t} pg={pg} />
        <AddButton t={t} label="acrescentar artigo à lista" onPress={() => setNovoArtigo(true)} />
      </View>

      {/* A acção final vai no fim da lista, não numa barra fixa: a barra
          ficava colada por cima do rodapé, e a referência não a tem. */}
      {step === -1 || step >= SECTIONS.length - 1 ? (
        <Primary t={t} label="Fechar Conta e Registar Despesa" onPress={() => setCartOpen(true)} />
      ) : (
        <Primary t={t} label="Secção seguinte" icon="caretRight"
          onPress={() => setStep(x => Math.min(SECTIONS.length - 1, x + 1))} />
      )}

      {novoArtigo ? (
        <Sheet t={t} title="Novo Artigo" sub="Acrescentar à lista de compras"
          onClose={() => setNovoArtigo(false)}>
          <NovoArtigo t={t} user={user} onDone={() => setNovoArtigo(false)} />
        </Sheet>
      ) : null}

      {cartOpen ? (
        <Carrinho t={t} doneItems={doneItems} items={items} cart={cart}
          user={user} store={s.stores[s.shopPlan.store]} who={s.shopPlan.who}
          onClose={() => setCartOpen(false)}
          onConfirm={() => {
            set(x => ({
              registered: x.registered + cart,
              acertoMovs: [],
              shopHistory: [{
                at: Date.now(), store: x.stores[x.shopPlan.store], who: x.shopPlan.who,
                total: cart, items: doneItems.length,
              }, ...x.shopHistory].slice(0, 10),
            }));
            setCartOpen(false);
            onClose();
          }} />
      ) : null}
    </>
  );
}
