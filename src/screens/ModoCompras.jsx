import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT, elev } from '../theme';
import { EUR, plural } from '../format';
import { Card, Label, Bar, Primary, usePaged, Pager, Linha, MarcaDeEstado, SectionTitle, Empty, NumField, BotaoCompacto } from '../ui';
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
  // O que se está a escrever no campo do preço, por artigo, antes de assentar.
  // A loja recebe-o no `aoTerminar`; aqui fica o que os dedos ainda estão a
  // compor. Ver o guarda `editar-muda-o-titulo`.
  const [rascunhoDoPreco, setRascunhoDoPreco] = useState({});
  // Qual o artigo com o editor de preço aberto. Um de cada vez: trinta campos
  // abertos ao mesmo tempo são um formulário, e na loja ninguém preenche um.
  const [precoAberto, setPrecoAberto] = useState(null);
  // O grupo dos apanhados começa fechado — o que já se resolveu não tem de
  // estar à vista.
  const [verApanhados, setVerApanhados] = useState(false);

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

  // ── Quanto é que este artigo saiu acima ou abaixo do esperado ─────────────
  //
  // É a razão pela qual se escreve o preço na loja, e a linha antiga não a
  // dizia: mostrava o campo e ficava calada quanto ao que ele significava
  // (16/09/2026, opção D de `design/campos-e-botoes.dc.html`).
  //
  // Devolve `null` — e não «0,00 €» — quando não há nada a dizer: sem preço
  // escrito, sem estimativa, ou com os dois iguais ao cêntimo. Um zero é uma
  // afirmação, e aqui a app não tem nada a afirmar.
  const diferenca = (i) => {
    const escrito = s.precoPago[i.id];
    if (escrito === undefined || escrito === null || escrito === '') return null;
    const pagoAgora = Number(escrito);
    const esperado = precoDe(i, loja).valor;
    if (!Number.isFinite(pagoAgora) || !esperado) return null;
    const delta = Math.round((pagoAgora - esperado) * 100) / 100;
    if (delta === 0) return null;
    return {
      acima: delta > 0,
      texto: `${delta > 0 ? '+' : '−'}${EUR(Math.abs(delta))} ${delta > 0 ? 'acima' : 'abaixo'}`,
    };
  };

  // O corredor a seguir a este, pelo nome — é o que o botão anuncia. Com
  // `step` a null («Toda a lista») não há seguinte: o botão de baixo passa a
  // ser o de fechar a conta.
  const seguinte = step === null ? null
    : seccoes[Math.min(seccoes.length - 1, seccoes.indexOf(step) + 1)];

  const cart = doneItems.reduce((a, i) => a + pago(i), 0);
  const estimate = items.reduce((a, i) => a + i.est, 0);
  const mercearia = envelopes.find(e => e.name === 'Mercearia');
  const merc = mercearia ? mercearia.limit - mercearia.used : 0;

  // ⚠ O `step` é o NOME do corredor, não o índice. Era um número, e a casa
  // passou a poder reordenar as secções — um índice deixaria de apontar para o
  // mesmo sítio à primeira mudança.
  const inStep = step === null ? items : items.filter(i => i.s === step);
  // ⚠ A lista de cima é só O QUE FALTA (17/09/2026, desenho 7). O apanhado vai
  // para o grupo fechado do fim, e a lista encolhe à medida que se compra.
  const porFazer = inStep.filter(i => stateOf(i) !== 'done');
  const apanhados = inStep.filter(i => stateOf(i) === 'done');
  const pg = usePaged(porFazer, 10);

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
  const barColor = pctCart > 100 ? t.state.err : pctCart > 80 ? t.state.warnTexto : t.titulo;

  // ── Os preços que a app já conhece deste artigo ───────────────────────────
  //
  // 17/09/2026, desenho 4 de `design/dez-linhas-da-loja.dc.html`. Na loja, com
  // o carrinho numa mão, não se quer ESCREVER — quer-se confirmar. A app já
  // sabe o que a casa pagou aqui e noutra loja, e o que está escrito na lista:
  // oferece esses, e o teclado fica para o caso que foge à regra.
  //
  // Sem repetidos e sem zeros: dois botões com o mesmo número não são duas
  // escolhas, e «0,00 €» é uma afirmação que a app não pode fazer.
  const sugestoesDe = (i) => {
    const p = precoDe(i, loja);
    const vistos = new Set();
    return [
      p.origem === 'loja' ? { v: p.valor, de: 'aqui' } : null,
      p.origem === 'outra-loja' ? { v: p.valor, de: p.loja } : null,
      i.est ? { v: i.est, de: 'na lista' } : null,
    ].filter(x => {
      if (!x || !x.v) return false;
      const c = Math.round(x.v * 100);
      if (vistos.has(c)) return false;
      vistos.add(c);
      return true;
    });
  };

  // ── A linha de um artigo ──────────────────────────────────────────────────
  //
  // É a mesma para a lista de cima e para o grupo dos apanhados, e por isso
  // vive numa função: duas cópias divergiriam à primeira correção.
  //
  // ⚠ O PREÇO É UM NÚMERO QUE SE TOCA, e não um campo sempre aberto
  // (17/09/2026, desenho 3). Cinzento é o que a app estima, escuro é o que se
  // pagou; tocar abre o editor por baixo, com as sugestões. Um campo por artigo
  // numa lista de trinta é um formulário, e ninguém preenche um formulário a
  // empurrar um carrinho.
  const LinhaDoArtigo = (i) => {
    const estado = stateOf(i);
    const feito = estado === 'done';
    const sem = estado === 'sem-stock';
    const escrito = s.precoPago[i.id] !== undefined;
    const aEditar = precoAberto === i.id;
    const sugestoes = sugestoesDe(i);
    return (
      /* Linha plana, sem cartão — desenho C (09/09/2026), com os 64 px que a
         loja exige (INVARIANTE #5). O estado é a faixa: verde apanhado, âmbar
         sem stock. ⚠ A linha sem stock era pintada com o `warnBg` — o tijolo
         âmbar OPACO e claro nos dois aspetos — e levava por cima `text2`, que
         no escuro é claro: «Papel de cozinha» ficava a 1,26. Um tijolo `xBg` só
         aceita `xDeep`; a linha fica na página e o estado na faixa. */
      <Linha key={i.id} t={t} style={{ minHeight: 64, paddingVertical: S.md, gap: 10 }}
        faixa={feito ? t.state.okBorder : sem ? t.state.warn : undefined}
        tinta={feito ? t.state.okBg : undefined}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {/* ⚠ A MARCA passa a ser o botão de marcar (17/09/2026). Era um
              desenho sem toque, e ao lado dele um «Confirmar» escrito. Tocar no
              círculo para marcar é o que toda a gente já tenta fazer primeiro —
              e liberta a direita da linha para o preço. */}
          <Pressable onPress={() => marcar(i.id, 'done')} accessibilityRole="checkbox"
            accessibilityLabel={i.label}
            accessibilityState={{ checked: feito }} aria-checked={feito}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -7 }}>
            <MarcaDeEstado t={t} size={30} estado={feito ? 'marcado' : sem ? 'sem' : 'por-marcar'} />
          </Pressable>

          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ fontFamily: FONT.body, fontSize: 16, color: t.text2 }}>{i.label}</Text>
            {/* O que a app SABE, e de onde. Uma estimativa sem origem não ajuda
                a decidir se vale a pena verificar a prateleira. */}
            <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11.5,
              color: sem ? t.state.warnTexto : t.text3 }}>
              {sem ? 'Sem stock na loja' : legendaDoPreco(i)}
            </Text>
          </View>

          {/* ⚠ Um só controlo à direita, e não dois empilhados. Marcado, é o
              PREÇO; por marcar, é o «sem stock»; sem stock, é o «repor». */}
          {feito ? (
            <Pressable onPress={() => setPrecoAberto(x => (x === i.id ? null : i.id))}
              accessibilityRole="button"
              accessibilityLabel={escrito
                ? `Alterar o preço de ${i.label}, ${EUR(s.precoPago[i.id])}`
                : `Escrever o preço pago por ${i.label}`}
              accessibilityState={{ expanded: aEditar }} aria-expanded={aEditar}
              style={{ minHeight: 44, minWidth: 80, alignItems: 'flex-end', justifyContent: 'center', gap: 2 }}>
              <Text style={{ fontFamily: FONT.display, fontSize: 17,
                fontWeight: escrito ? '600' : '400',
                color: escrito ? t.text2 : t.text3 }}>
                {precoDe(i, loja).valor || escrito ? EUR(pago(i)) : '—'}
              </Text>
              {diferenca(i) ? (
                <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11, fontWeight: '600',
                  color: diferenca(i).acima ? t.state.warnTexto : t.state.okTexto }}>
                  {diferenca(i).texto}
                </Text>
              ) : null}
            </Pressable>
          ) : (
            <Pressable onPress={() => marcar(i.id, 'sem-stock')} accessibilityRole="button"
              accessibilityLabel={`${sem ? 'Repor' : 'Marcar sem stock'} ${i.label}`}
              style={{ minHeight: 44, minWidth: 80, alignItems: 'flex-end', justifyContent: 'center' }}>
              <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, fontWeight: '600',
                color: sem ? t.state.warnTexto : t.text3 }}>
                {sem ? 'Repor' : 'Sem stock'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* ── O editor do preço, só do artigo que se tocou ──────────────────
            As sugestões primeiro (um toque resolve o caso normal) e o campo a
            seguir, para o que foge. Fecha ao escolher. */}
        {aEditar ? (
          <View style={{ gap: S.md, paddingLeft: 44, paddingTop: S.sm }}>
            {sugestoes.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }}>
                {sugestoes.map(sg => (
                  <Pressable key={`${sg.v}-${sg.de}`} accessibilityRole="button"
                    accessibilityLabel={`Pagou ${EUR(sg.v)}, ${sg.de}`}
                    onPress={() => { definirPrecoPago(i.id, sg.v); setPrecoAberto(null); }}
                    // ⚠ , e não : nesta app TUDO o que se toca tem o mesmo
                      // canto, e um cilindro entre dois botões de canto 6 lê-se como
                      // peça de outra app. Guarda: .
                      style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: R.row,
                      borderWidth: 1, borderColor: t.actBrd, backgroundColor: t.actBg,
                      alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '600', color: t.actFg }}>
                      {EUR(sg.v)}
                    </Text>
                    <Text style={{ fontFamily: FONT.ui, fontSize: 11, color: t.actFg }}>{sg.de}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
              {/* ⚠ O valor vai para a loja no `aoTerminar`, não no `onChange`:
                  a cada tecla, «2,49» passava pela loja como 2, 24, 2,49.
                  Regra de 15/09/2026. */}
              <NumField t={t} estreito compacto vazio
                value={rascunhoDoPreco[i.id] ?? s.precoPago[i.id]}
                step={0.1} min={0} max={9999}
                rotulo={`Preço pago por ${i.label}`}
                placeholder={precoDe(i, loja).valor ? EUR(precoDe(i, loja).valor) : undefined}
                onChange={(v) => setRascunhoDoPreco(r => ({ ...r, [i.id]: v }))}
                aoTerminar={(v) => definirPrecoPago(i.id, v)} />
              <Pressable onPress={() => setPrecoAberto(null)} accessibilityRole="button"
                accessibilityLabel="Fechar o preço"
                style={{ minHeight: 44, paddingHorizontal: S.md, justifyContent: 'center' }}>
                <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.actFg }}>Pronto</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </Linha>
    );
  };

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

      {/* separadores por corredor
          ⚠ Eram `flex: 1` num `View`: com quatro corredores davam 80 px cada,
          com oito da casa simulada davam 40 — abaixo dos 44 do INVARIANTE #5 e
          com os nomes cortados a «Fresc…». Até cinco separadores repartem a
          largura; a partir daí a fila ROLA, cada um com 72 de mínimo
          (13/09/2026). */}
      {(() => {
        const rolam = tabs.length > 5;
        const Fila = rolam ? ScrollView : View;
        const propsDaFila = rolam
          ? { horizontal: true, showsHorizontalScrollIndicator: false, contentContainerStyle: { flexDirection: 'row', gap: S.md } }
          : { style: { flexDirection: 'row', gap: S.md } };
        return (
      <Fila {...propsDaFila}>
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
              // E quem não vê a barra também tem de saber: o estado vai no
              // rótulo, que era só o nome do corredor.
              accessibilityLabel={limpo ? `${x.label} · despachado` : x.label}
              accessibilityState={{ selected: on }} aria-selected={on}
              style={rolam
                ? { minWidth: 72, paddingHorizontal: S.xs, minHeight: 44, gap: 6, justifyContent: 'center' }
                : { flex: 1, minHeight: 44, gap: 6, justifyContent: 'center' }}>
              {/* ⚠ A BARRA NÃO PODE SER O ÚNICO SINAL (16/09/2026 — ele
                  perguntou «porque é que umas linhas estão a verde e outras a
                  cinza?», e a app não tinha como lhe responder).

                  Três estados numa barra de 4 px, sem palavra e sem legenda, e
                  as cores não chegavam: o `state.ok` mede 2,27:1 contra a
                  superfície nos seis esquemas e o `border` 1,41, onde um objeto
                  gráfico pede 3. Pior, a distância entre o acento e o verde
                  desce a 2,04 em dois dos esquemas: «estou aqui» e «já está»
                  ficavam a parecer-se.

                  Agora a barra leva tokens que se veem — `titulo` para o
                  corredor aberto, `okTexto` para o despachado — e o corredor
                  despachado ganha um VISTO ao lado do nome. Cor e palavra,
                  nunca só cor. */}
              <View style={{ height: 4, borderRadius: R.pill,
                backgroundColor: on ? t.titulo : limpo ? t.state.okTexto : t.text3 }} />
              {limpo && !on ? (
                <View style={{ position: 'absolute', top: 10, right: 2 }}>
                  <Icon name="check" size={11} color={t.state.okTexto} />
                </View>
              ) : null}
              <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11, textAlign: 'center',
                fontWeight: on || limpo ? '600' : '400',
                color: on ? t.actFg : limpo ? t.state.okTexto : t.text3 }}>{x.label}</Text>
            </Pressable>
          );
        })}
      </Fila>
        );
      })()}
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
        {/* ⚠ O `SectionTitle` da app, e não um título escrito à mão a 18 px em
            slate (16/09/2026). Era o único título de secção da app fora do
            componente — 18 px a 700 onde os outros vinte e tal têm 13 em
            `actFg` com a régua por baixo (desenho C, 09/09/2026). A contagem
            passa para a ranhura da direita, que é onde o resto da app a põe.

            ⚠ E o `plural`: era «artigos» escrito à mão, e um corredor com um
            artigo só dizia «Mercearia · 1 artigos». */}
        <SectionTitle t={t}
          right={<Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
            {plural(step === null ? items.length : inStep.length, 'artigo', 'artigos')}
          </Text>}>
          {step === null ? 'Toda a lista' : step}
        </SectionTitle>

        {/* ⚠ Um corredor pode estar VAZIO, e até agora ficava um título de
            secção com nada por baixo. A lista da casa muda enquanto se compra —
            um artigo movido de corredor esvazia o anterior —, e quem está na
            loja precisa de saber se não há nada ali ou se a app não carregou. */}
        {porFazer.length === 0 ? (
          // ⚠ Olha para o que FALTA, não para o corredor inteiro: com tudo
          // apanhado a lista de cima fica vazia, e é aí que vale a pena dizer
          // que este corredor está despachado. Dizer «nada em Frescos» com
          // cinco artigos no grupo de baixo seria mentira.
          <Empty t={t} icon="fileDone"
            title={apanhados.length
              ? (step === null ? 'Está tudo apanhado.' : `${step} está despachado.`)
              : (step === null ? 'Não há nada na lista desta ida.' : `Nada em ${step}.`)}
            hint={apanhados.length
              ? 'Toque em «já apanhados» para rever os preços, ou siga para o corredor seguinte.'
              : 'Toque em «acrescentar artigo» para juntar o que faltar.'} />
        ) : null}

        {pg.slice.map(i => LinhaDoArtigo(i))}

        <Pager t={t} pg={pg} />

        {/* ── O QUE JÁ SE APANHOU, num grupo fechado ──────────────────────────
            17/09/2026, desenho 7 de `design/dez-linhas-da-loja.dc.html`.

            Um artigo marcado sai da lista de cima e vem para aqui. A lista
            encolhe à medida que se compra, e no fim fica vazia — que é a melhor
            coisa que uma lista de compras pode fazer. Antes ficavam todos
            misturados, e num corredor de doze artigos a meio das compras era
            preciso ler a coluna dos vistos para saber o que faltava.

            Fechado por omissão: o que já se resolveu não tem de estar à vista.
            O total ao lado é a soma do que está cá dentro, e não uma contagem
            à parte — abre-se para rever um preço. */}
        {apanhados.length ? (
          <View style={{ gap: S.md }}>
            <Pressable onPress={() => setVerApanhados(v => !v)} accessibilityRole="button"
              accessibilityLabel={`${verApanhados ? 'Fechar' : 'Abrir'} os artigos já apanhados`}
              accessibilityState={{ expanded: verApanhados }} aria-expanded={verApanhados}
              style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: S.md }}>
              <Text style={{ flex: 1, fontFamily: FONT.ui, fontSize: 12, fontWeight: '600',
                letterSpacing: 0.4, textTransform: 'uppercase', color: t.slate }}>
                {`Já apanhados · ${apanhados.length}`}
              </Text>
              <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '600', color: t.state.okTexto }}>
                {EUR(apanhados.reduce((a, i) => a + pago(i), 0))}
              </Text>
              <Icon name={verApanhados ? 'caretUp' : 'caretDown'} size={18} color={t.text3} />
            </Pressable>
            {verApanhados ? apanhados.map(i => LinhaDoArtigo(i)) : null}
          </View>
        ) : null}

        <Pager t={t} pg={pg} />
        {/* ⚠ Uma PASTILHA, e não um botão de largura inteira (16/09/2026,
            opção C de `design/campos-e-botoes.dc.html`). Dois botões de 48 px
            empilhados no fim da lista comiam uma quinta parte do ecrã para
            duas ações, e este usa-se uma vez por corredor, se tanto. O
            «à lista» sai do rótulo: a lista está por cima dele. */}
        <View style={{ flexDirection: 'row' }}>
          {/* ⚠ `largura="conteudo"`: sem isto o `BotaoCompacto` leva `flex: 1`
              e volta a esticar-se de ponta a ponta — que era o que se queria
              tirar. Medido no ecrã dele, depois de eu já o ter «encolhido». */}
          <BotaoCompacto t={t} label="acrescentar artigo" tom="contorno"
            largura="conteudo" onPress={() => setNovoArtigo(true)} />
        </View>
      </View>
      </ScrollView>

      {/* ── A acção do corredor, FIXA em baixo ───────────────────────────────
          16/09/2026, opção C. Vivia no fim da lista e era preciso rolar trinta
          artigos para lá chegar; a barra de ação existe na app desde 15/09 e só
          as Tarefas a usavam.

          ⚠ Aqui é desenhada à mão e não pelo `useAcaoDoEcra`: esta vista é dona
          da sua COLUNA (`coluna: true` no App.jsx), portanto corre FORA do
          `ScrollView` onde vive o `AcaoDoEcra.Provider`. O hook devolveria o
          elemento para se desenhar no lugar, que é o que aqui se faz — mas
          então mais vale dizê-lo por extenso do que parecer que funciona.

          Fica ACIMA do rodapé, dentro da coluna desta vista: o rodapé continua
          a ser o último filho da raiz (INVARIANTE #1).

          Os dois botões são COMUNS, e por razões diferentes. O «corredor
          seguinte» é navegação. O «Fechar conta» não fecha conta nenhuma: abre
          o carrinho, onde está o botão que fecha — e é esse que leva o acento.
          Um passo intermédio pintado como decisão final ensina a família a
          carregar sem ler.

          ⚠ E o botão DIZ PARA ONDE VAI. Era «Secção seguinte», e quem está na
          loja precisa de saber para que lado andar antes de tocar. */}
      <View style={{ flexGrow: 0, flexShrink: 0, paddingHorizontal: 16,
        paddingTop: S.md, paddingBottom: S.md, backgroundColor: t.page,
        borderTopWidth: 1, borderTopColor: t.divider }}>
        {step === null || seccoes.indexOf(step) >= seccoes.length - 1 ? (
          <Primary t={t} comum label="Fechar conta e registar despesa"
            sub={cart > 0 ? `${EUR(cart)} · ${plural(doneItems.length, 'artigo', 'artigos')}` : null}
            onPress={() => setCartOpen(true)} />
        ) : (
          <Primary t={t} comum label={`Corredor seguinte · ${seguinte}`} icon="caretRight"
            onPress={() => setStep(seguinte)} />
        )}
      </View>

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
                // ⚠ Pelo `lojaDoPlano` da loja, que lê o NOME e o índice das
                // casas antigas (15/09/2026). Aqui lia-se o índice à mão, e uma
                // loja apagada punha a linha do histórico na loja errada.
                at: Date.now(), store: loja || null,
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
