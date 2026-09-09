import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT, elev } from '../theme';
import { EUR, plural } from '../format';
import { Card, Label, Bar, Primary, AddButton, usePaged, Pager, Linha } from '../ui';
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
// O envelope onde a conta das compras cai. ⚠ Num sítio SÓ: o carrinho anuncia
// este destino ao pé do botão e o `registarDespesa` escreve nele, e as duas
// coisas têm de dizer o mesmo. Duas cópias do nome é a classe de defeito que já
// pôs a grelha de envelopes a mostrar uma lista e a confirmação a aplicar outra.
const ENVELOPE_DAS_COMPRAS = 'Mercearia';

export default function ModoCompras({ t, user, onClose }) {
  const { s, set, allItems, envelopes, precoDe, definirPrecoPago, registarPrecos,
          lojaDoPlano, marcarArtigo, registarDespesa, fecharIdaAsCompras, seccoes } = useStore();
  const [step, setStep] = useState(null);          // null = Todos
  const [novoArtigo, setNovoArtigo] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const items = allItems();
  const stateOf = (i) => s.status[i.id] || (i.real ? 'done' : 'open');
  const doneItems = items.filter(i => stateOf(i) === 'done');
  const semStock = items.filter(i => stateOf(i) === 'sem-stock');
  const porConfirmar = items.filter(i => stateOf(i) === 'open');
  const loja = lojaDoPlano();

  // O que se paga por um artigo: o que se escreveu agora, senão o que se pagou
  // da última vez nesta loja, senão o que está na lista.
  const pago = (i) => (s.precoPago[i.id] !== undefined ? s.precoPago[i.id]
    : (i.real !== undefined ? i.real : precoDe(i, loja).valor));

  const legendaDoPreco = (i) => {
    const escrito = s.precoPago[i.id];
    if (escrito !== undefined) return `Confirmado · ${EUR(escrito)}`;
    const p = precoDe(i, loja);
    if (p.origem === 'loja') {
      return [EUR(p.valor), 'da última vez aqui',
        p.vezes > 1 ? `· ${p.vezes} compras` : null].filter(Boolean).join(' ');
    }
    if (p.origem === 'outra-loja') return `${EUR(p.valor)} no ${p.loja} — aqui ainda não se sabe`;
    return `estimativa ${EUR(p.valor)}`;
  };

  const cart = doneItems.reduce((a, i) => a + pago(i), 0);
  const estimate = items.reduce((a, i) => a + i.est, 0);
  const mercearia = envelopes.find(e => e.name === 'Mercearia');
  const merc = mercearia ? mercearia.limit - mercearia.used : 0;

  // ⚠ O `step` é o NOME do corredor, não o índice. Era um número, e a casa
  // passou a poder reordenar as secções — um índice deixaria de apontar para o
  // mesmo sítio à primeira mudança.
  const inStep = step === null ? items : items.filter(i => i.s === step);
  const pg = usePaged(inStep, 10);

  // Um artigo tem três estados nesta lista, não dois. «Sem stock» não é o
  // mesmo que «por comprar»: quem está na loja já lá foi ver.
  // ⚠ Pelo `marcarArtigo` da loja. Isto reescrevia o mapa `status` por
  // inteiro, e dois adultos a dividir os corredores anulavam o trabalho um do
  // outro — o esquema da coleção `artigos` já avisava.
  const marcar = (id, estado) => marcarArtigo(id, estado);

  const tabs = [{ i: null, label: 'Todos' }, ...seccoes.map(n => ({ i: n, label: n.split(' ')[0] }))];
  const pctCart = merc > 0 ? (cart / merc) * 100 : 0;
  // A barra do carrinho: vermelha acima do limite, âmbar perto dele, e do
  // ESQUEMA no caso normal — que não é um estado, é o progresso da compra.
  const barColor = pctCart > 100 ? t.state.err : pctCart > 80 ? t.state.warn : t.accent;

  return (
    // ⚠ Esta vista é dona da sua COLUNA (`coluna: true` no registo do App.jsx):
    // a loja e os separadores por corredor em `flex: 0`, parados, e um
    // ScrollView próprio para o resto. Dentro do ScrollView único da app a
    // barra rolava com a lista — a sonda do varrimento de 08/09/2026 encontrou
    // os cinco separadores 564 px acima do ecrã, e para mudar de corredor era
    // voltar ao topo. No protótipo (bloco «isLoja») a barra é `flex:none` por
    // cima de um `overflow:auto`. O cabeçalho e o rodapé são do App e não se
    // mexem (INVARIANTE #1).
    <View style={{ flex: 1, minHeight: 0 }}>
      {/* ── O que fica parado: a loja e os corredores ─────────────────── */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, gap: S.md,
        backgroundColor: t.surface, borderBottomWidth: 1, borderBottomColor: t.divider }}>
      {/* A loja e a ordem por que se percorre — o que a referência mostra
          por cima dos separadores de corredor. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
        <Icon name="storefront" size={20} color={t.slate} />
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: FONT.ui, fontSize: 12.5, color: t.text2 }}>
          {loja || 'Loja por escolher'} · ordem do corredor
        </Text>
      </View>

      {/* separadores por corredor */}
      <View style={{ flexDirection: 'row', gap: S.md }}>
        {tabs.map(x => {
          const on = step === x.i;
          // ⚠ Uma secção VAZIA não está «despachada».
          //
          // Era só `.every(...)`, e num array vazio o `every` é verdadeiro por
          // vacuidade: com a lista a zero, as quatro secções apareciam todas a
          // verde — «Frutas», «Frescos», «Mercearia», «Casa», todas
          // despachadas, sem nunca ter havido nada para despachar. Um ecrã
          // cheio de verde a dizer que se fez o que não havia que fazer.
          const naSeccao = items.filter(i => i.s === x.i);
          const limpo = x.i !== null && naSeccao.length > 0
            && naSeccao.every(i => stateOf(i) !== 'open');
          return (
            <Pressable key={x.i} onPress={() => setStep(x.i)} accessibilityRole="tab"
              accessibilityLabel={x.label} accessibilityState={{ selected: on }}
              style={{ flex: 1, minHeight: 44, gap: 6, justifyContent: 'center' }}>
              <View style={{ height: 4, borderRadius: R.pill,
                backgroundColor: on ? t.accent : limpo ? t.state.ok : t.border }} />
              <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11, textAlign: 'center',
                fontWeight: on || limpo ? '600' : '400',
                color: on ? t.actFg : limpo ? t.state.okTexto : t.text3 }}>{x.label}</Text>
            </Pressable>
          );
        })}
      </View>
      </View>

      {/* ── O que rola: o carrinho, os artigos, o paginador e o botão ───────
          O mesmo enchimento e o mesmo espaço do ScrollView da app, para a
          lista ler igual à de qualquer outro ecrã. */}
      <ScrollView style={{ flex: 1, minHeight: 0 }}
        contentContainerStyle={{ padding: 16, gap: S.xl, paddingBottom: S.xl }}>
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
          {/* «0 de 1 artigos confirmados» numa lista de um só. O `plural` conta
              pelo TOTAL, que é a palavra a que «artigos» pertence. */}
          {doneItems.length} de {plural(items.length, 'artigo confirmado', 'artigos confirmados')}
          {porConfirmar.length ? ` · ${porConfirmar.length} por confirmar` : ''}
          {semStock.length ? ` · ${plural(semStock.length, 'sem stock', 'sem stock')}` : ''}
        </Text>
      </Card>

      <View style={{ gap: S.md }}>
        <Text style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: '700', color: t.slate }}>
          {/* ⚠ Era «artigos» escrito à mão, e um corredor com um artigo só dizia
              «Mercearia · 1 artigos». Visto ao percorrer os quatro corredores
              depois de eles voltarem a ter artigos — dois dos quatro tinham um.
              O `plural` do `format.js` existe para isto e estava a três linhas
              de distância, usado no ecrã das Compras. */}
          {step === null ? `Toda a lista · ${plural(items.length, 'artigo', 'artigos')}`
            : `${step} · ${plural(inStep.length, 'artigo', 'artigos')}`}
        </Text>

        {pg.slice.map(i => {
          const estado = stateOf(i);
          const feito = estado === 'done';
          const sem = estado === 'sem-stock';
          return (
            /* Linha plana, sem cartão — desenho C (09/09/2026), com os 64 px
               que a loja exige (INVARIANTE #5). O estado é a faixa: verde
               apanhado, âmbar sem stock. ⚠ A linha sem stock era pintada com o
               `warnBg` — o tijolo âmbar OPACO e claro nos dois aspetos — e levava
               por cima `text2`/`text3`, que no escuro são claros: «Papel de
               cozinha» ficava a 1,26. Um tijolo `xBg` só aceita `xDeep`; a
               linha fica na página e o estado na faixa. */
            <Linha key={i.id} t={t} style={{ minHeight: 64, paddingVertical: S.md, gap: 12 }}
              faixa={feito ? t.state.okBorder : sem ? t.state.warn : undefined}
              tinta={feito ? t.state.okBg : undefined}>
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Icon name={feito ? 'checkCircle' : sem ? 'closeCircle' : 'infoCircle'} size={30}
                color={feito ? t.state.ok : sem ? t.state.warn : t.text3} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontFamily: FONT.body, fontSize: 16, color: t.text2 }}>{i.label}</Text>
                {/* O que a app SABE, e de onde. Uma estimativa sem origem não
                    ajuda a decidir se vale a pena verificar a prateleira. */}
                <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: sem ? t.state.warnTexto : t.text3 }}>
                  {sem ? 'Sem stock na loja' : legendaDoPreco(i)}
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
                    // ⚠ `actFg`, não `accent`: 14 px é texto pequeno, e sobre a
                    // linha sem stock (âmbar) o acento Cião dava 4,49 (09/09/2026).
                    color: feito ? t.text3 : t.actFg, letterSpacing: 0.4 }}>
                    {feito ? 'Desfazer' : 'Confirmar'}
                  </Text>
                </Pressable>
                {!feito ? (
                  <Pressable onPress={() => marcar(i.id, 'sem-stock')} accessibilityRole="button"
                    accessibilityLabel={`${sem ? 'Repor' : 'Marcar sem stock'} ${i.label}`}
                    style={{ minHeight: 44, minWidth: 88, alignItems: 'flex-end', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, fontWeight: '600',
                      // `warnTexto`: já não há tijolo por baixo, é a página.
                      color: sem ? t.state.warnTexto : t.text3 }}>
                      {sem ? 'Repor' : 'Sem stock'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
             </View>

             {/* O preço escreve-se AQUI, no corredor, com o artigo na mão e a
                 prateleira à frente. É o único momento em que se sabe.

                 Aparece ao confirmar e não antes: um campo por artigo numa
                 lista de trinta é um formulário, e ninguém preenche um
                 formulário a empurrar um carrinho. */}
             {feito ? (
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md,
                 borderTopWidth: 1, borderTopColor: t.state.okBorder, paddingTop: 12 }}>
                 <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, color: t.text2 }}>
                   Preço pago
                 </Text>
                 <TextInput
                   value={s.precoPago[i.id] !== undefined ? String(s.precoPago[i.id]).replace('.', ',') : ''}
                   onChangeText={(v) => definirPrecoPago(i.id, v)}
                   placeholder={String((precoDe(i, loja).valor || 0).toFixed(2)).replace('.', ',')}
                   placeholderTextColor={t.text3}
                   keyboardType="decimal-pad"
                   accessibilityLabel={`Preço pago por ${i.label}`}
                   style={{ flex: 1, minHeight: 44, paddingHorizontal: S.md, borderRadius: R.row,
                     borderWidth: 1, borderColor: t.border, backgroundColor: t.card,
                     fontFamily: FONT.body, fontSize: 16, color: t.text1 }}
                 />
                 <Text style={{ fontFamily: FONT.display, fontSize: 16, color: t.text3 }}>€</Text>
               </View>
             ) : null}
            </Linha>
          );
        })}

        <Pager t={t} pg={pg} />
        <AddButton t={t} label="acrescentar artigo à lista" onPress={() => setNovoArtigo(true)} />
      </View>

      {/* A acção final vai no fim da lista, não numa barra fixa: a barra
          ficava colada por cima do rodapé, e a referência não a tem.

          Os dois são COMUNS, e por razões diferentes. O «Secção seguinte» é
          navegação. O «Fechar Conta» não fecha conta nenhuma: abre o carrinho,
          onde está o botão que fecha — e é esse que leva o acento. Um passo
          intermédio pintado como decisão final ensina a família a carregar sem
          ler. A linha por baixo diz o que vai encontrar lá dentro. */}
      {step === null || seccoes.indexOf(step) >= seccoes.length - 1 ? (
        <Primary t={t} comum label="Fechar Conta e Registar Despesa"
          sub={cart > 0 ? `${EUR(cart)} · ${plural(doneItems.length, 'artigo', 'artigos')}` : null}
          onPress={() => setCartOpen(true)} />
      ) : (
        <Primary t={t} comum label="Secção seguinte" icon="caretRight"
          onPress={() => setStep(x => seccoes[Math.min(seccoes.length - 1, seccoes.indexOf(x) + 1)])} />
      )}
      </ScrollView>

      {novoArtigo ? (
        <Sheet t={t} title="Novo Artigo" sub="Acrescentar à lista de compras"
          onClose={() => setNovoArtigo(false)}>
          <NovoArtigo t={t} user={user} onDone={() => setNovoArtigo(false)} />
        </Sheet>
      ) : null}

      {cartOpen ? (
        <Carrinho t={t} doneItems={doneItems} items={items} cart={cart} pago={pago}
          user={user} store={loja} who={(s.shopPlan || {}).who}
          destino={ENVELOPE_DAS_COMPRAS}
          onClose={() => setCartOpen(false)}
          onConfirm={() => {
            // Os preços escritos no corredor viram histórico aqui, com a loja
            // e o dia. É o que faz a próxima ida saber quanto custou a banana.
            registarPrecos(doneItems, loja);
            // ⚠ Aqui havia também `acertoMovs: []`, e não tinha nada que ver
            // com fechar uma conta de compras: apagava os pagamentos do acerto
            // entre os dois adultos. Quem tivesse acertado contas nessa semana
            // via a dívida VOLTAR por ter ido ao supermercado.
            set(x => ({
              shopHistory: [{
                // Sem ida marcada, a linha do histórico fica com quem fechou a
                // conta — e não rebenta a fechá-la.
                at: Date.now(), store: (x.stores || [])[(x.shopPlan || {}).store] || null,
                who: (x.shopPlan || {}).who || user,
                total: cart, items: doneItems.length,
              }, ...x.shopHistory].slice(0, 10),
            }));
            // ⚠ A conta fechada é uma DESPESA, e sobe como tal. Isto somava ao
            // `registered` local e mais nada: a compra do sábado não aparecia
            // no orçamento do outro adulto.
            registarDespesa({
              // ⚠ Sem ida marcada, quem paga é quem está a fechar a conta. Isto
              // era `s.shopPlan.who` cru: entre duas idas o `shopPlan` é nulo, e
              // fechar a conta rebentava em vez de registar a despesa.
              envelope: ENVELOPE_DAS_COMPRAS, valor: cart, pagador: (s.shopPlan || {}).who || user,
              descricao: loja ? `Compras · ${loja}` : 'Compras',
            });
            // E a ida fecha-se no servidor: a lista deixa de ser a aberta, e a
            // próxima nasce vazia sem ninguém apagar nada.
            fecharIdaAsCompras(cart);
            setCartOpen(false);
            onClose();
          }} />
      ) : null}
    </View>
  );
}
