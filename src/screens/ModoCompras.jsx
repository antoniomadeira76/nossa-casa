import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT, elev } from '../theme';
import { EUR, plural } from '../format';
import { Card, SectionTitle, Empty, NumField, MarcaDeEstado, MARCA } from '../ui';
import Icon from '../Icon';
import Sheet from '../Sheet';
import NovoArtigo from '../sheets/NovoArtigo';
import Carrinho from '../sheets/Carrinho';
import { ATRASO_PARA_PEGAR } from '../ListaArrastavel';

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

  const items = allItems();
  const stateOf = (i) => s.status[i.id] || (i.real ? 'done' : 'open');
  const doneItems = items.filter(i => stateOf(i) === 'done');
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
  const mercearia = envelopes.find(e => e.name === 'Mercearia');
  const merc = mercearia ? mercearia.limit - mercearia.used : 0;

  // ⚠ O `step` é o NOME do corredor, não o índice. Era um número, e a casa
  // passou a poder reordenar as secções — um índice deixaria de apontar para o
  // mesmo sítio à primeira mudança.
  const inStep = step === null ? items : items.filter(i => i.s === step);
  // O que ainda falta apanhar — alimenta a contagem decrescente do topo.
  const porFazer = inStep.filter(i => stateOf(i) !== 'done');

  // ── Os grupos do talão ────────────────────────────────────────────────────
  //
  // Com um corredor escolhido é um grupo sem cabeçalho — o cabeçalho já está no
  // título da secção. Com «Toda a lista», um grupo por corredor, pela ORDEM DA
  // CASA: é a ordem por que se anda na loja, e um talão de trinta linhas sem
  // cabeçalhos é uma parede. Corredores vazios não entram.
  //
  // ⚠ A PAGINAÇÃO SAIU. A regra da casa (15/09/2026) é que a lista não se
  // pagina «a não ser que não caiba no ecrã» — e com o talão a 48 px por linha
  // já cabe: uma ida de vinte artigos são 960 px de lista, que se rolam de uma
  // vez. Paginar de dez em dez obrigava a virar a página a meio de um corredor,
  // que na loja é onde menos se quer estar a procurar um botão.
  // ⚠ OS GRUPOS SAEM DOS ARTIGOS, e não da lista de corredores da casa.
  //
  // À primeira escrita fiz o contrário — percorrer `seccoes` e filtrar os
  // artigos de cada uma — e o talão apareceu VAZIO: cabeçalho a dizer «4
  // artigos», soma a dizer «0 de 4», e nem uma linha. O `i.s` de um artigo
  // vindo do servidor não bate à letra com o nome na lista da casa, e um
  // `filter` que não encontra nada não dá erro — dá uma lista vazia.
  //
  // É EXACTAMENTE o defeito que o guarda `o-artigo-tem-a-forma-da-loja` existe
  // para apanhar, e apanhou-o. Agrupar pelos artigos não pode perder nenhum:
  // cada um entra no seu grupo, e a ORDEM é a da casa, com o que não bater a
  // ficar no fim em vez de desaparecer.
  const gruposDoTalao = (() => {
    if (step !== null) return [{ nome: null, artigos: inStep }];
    const porNome = new Map();
    for (const i of items) {
      const nome = i.s || '';
      if (!porNome.has(nome)) porNome.set(nome, []);
      porNome.get(nome).push(i);
    }
    const ordem = (nome) => {
      const k = seccoes.indexOf(nome);
      return k === -1 ? seccoes.length : k;
    };
    return [...porNome.entries()]
      .sort((a, b) => ordem(a[0]) - ordem(b[0]))
      .map(([nome, artigos]) => ({ nome: nome || 'Sem corredor', artigos }));
  })();

  // Um artigo tem três estados nesta lista, não dois. «Sem stock» não é o
  // mesmo que «por comprar»: quem está na loja já lá foi ver.
  // ⚠ Pelo `marcarArtigo` da loja. Isto reescrevia o mapa `status` por
  // inteiro, e dois adultos a dividir os corredores anulavam o trabalho um do
  // outro — o esquema da coleção `artigos` já avisava.
  const marcar = (id, estado) => marcarArtigo(id, estado);

  const tabs = [{ i: null, label: 'Todos' }, ...seccoes.map(n => ({ i: n, label: n.split(' ')[0] }))];
  const pctCart = merc > 0 ? (cart / merc) * 100 : 0;

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

  // ── A linha de um artigo, em TALÃO ────────────────────────────────────────
  //
  // 17/09/2026, desenho 1 de `design/cinco-fora-da-caixa.dc.html`. Ele, sobre o
  // que aqui estava: «continua muito mau». E tinha razão — o problema nunca foi
  // o campo nem o botão, foi a DENSIDADE. Cinco artigos ocupavam o ecrã todo,
  // cada um num bloco verde de 64 px, todos com o mesmo peso visual. Num
  // supermercado quer-se ver doze de uma vez e saber num relance o que falta.
  //
  // Agora a lista é um TALÃO: nome à esquerda, preço à direita em algarismos de
  // largura fixa, uma linha fina a separar, e a soma no fim. Toda a gente já
  // sabe ler isto — é a forma que uma app de dinheiro devia ter desde o
  // princípio, e é a mesma coluna de euros que o Dinheiro já usa.
  //
  // ⚠ O ESTADO É TIPOGRÁFICO, e não um bloco de cor. Apanhado: visto e o preço
  // a escuro e a negrito. Por apanhar: sem visto, o nome e a estimativa em
  // cinzento, com o «~» a dizer que é um palpite. Sem stock: cruz âmbar e a
  // palavra no lugar do preço. Sem faixas, sem tintas, sem cinco blocos verdes
  // iguais a gritar ao mesmo tempo.
  //
  // ⚠ 48 PX, E NÃO OS 64 QUE O CLAUDE.md PEDE PARA A LOJA.
  //
  // Os 64 nasceram de uma linha que tinha, do lado direito, DOIS botões de
  // texto empilhados de 88 × 44 — «Confirmar» e «Sem stock» — e era preciso
  // acertar num deles com o carrinho na mão. Hoje a linha tem dois alvos e mais
  // nenhum: o nome, que ocupa a largura toda e marca, e o preço, encostado à
  // direita. Um alvo largo de 48 acerta-se melhor do que um de 64 dividido em
  // duas zonas de 44. O mínimo da app (44) continua respeitado com folga.
  // Está aqui escrito para quem quiser voltar atrás saber o que se trocou.
  const LinhaDoArtigo = (i, ultima) => {
    const estado = stateOf(i);
    const feito = estado === 'done';
    const sem = estado === 'sem-stock';
    const escrito = s.precoPago[i.id] !== undefined;
    const aEditar = precoAberto === i.id;
    const sugestoes = sugestoesDe(i);
    const estimado = precoDe(i, loja).valor;
    return (
      // ⚠ A LINHA MARCADA LEVA A FAIXA E A TINTA DAS TAREFAS (17/09/2026: «no
      // modo compras, quando se seleciona um artigo, deve aparecer a
      // configuração em anexo, deve ter o mesmo design», com o print de uma
      // tarefa feita — faixa verde à esquerda, fundo verde claro).
      //
      // O talão nasceu sem faixas nem tintas, de propósito: cinco blocos verdes
      // iguais a gritar ao mesmo tempo eram metade do problema de densidade que
      // ele mandou resolver. Mas a faixa de 3 px com a tinta a 12 % não é um
      // bloco — é o que as Tarefas, o Início e a Saúde já usam para dizer «esta
      // está feita», e a loja era o único sítio onde o apanhado não o dizia com
      // o mesmo desenho.
      //
      // Fica numa LINHA SÓ. A tarefa do print tem duas — título e «António ·
      // feita» — e trazer a segunda para cá devolvia a altura que o talão
      // ganhou. Quem apanhou o artigo lê-se no carrinho, ao fechar a conta.
      //
      // ⚠ A faixa é ABSOLUTA, e não uma borda esquerda: uma borda empurra o
      // conteúdo 3 px e a coluna dos vistos ficava aos degraus, linha sim linha
      // não. É o defeito que a `Linha` do `ui.jsx` levou a corrigir em 16/09.
      // A margem negativa leva a tinta e a faixa até ao BORDO DO CARTÃO — o
      // cartão tem 14 de enchimento, e uma tinta que parasse lá dentro lia-se
      // como um retângulo solto em vez de uma linha marcada.
      <View key={i.id} style={{ marginHorizontal: -14, paddingHorizontal: 14,
        borderBottomWidth: ultima && !aEditar ? 0 : 1, borderBottomColor: t.divider,
        backgroundColor: feito ? t.state.okBg : 'transparent' }}>
        {feito || sem ? (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
            backgroundColor: feito ? t.state.okBorder : t.state.warn }} />
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48 }}>
          {/* O NOME é o alvo de marcar, e ocupa a largura toda até ao preço.
              ⚠ A pressão longa marca «sem stock». Um gesto que não se anuncia
              não existe — por isso a linha de dicas por baixo do título da
              secção não é decoração, é parte do desenho. */}
          <Pressable onPress={() => marcar(i.id, 'done')}
            onLongPress={() => marcar(i.id, 'sem-stock')} delayLongPress={ATRASO_PARA_PEGAR}
            accessibilityRole="checkbox" accessibilityLabel={i.label}
            accessibilityHint="Mantenha premido para marcar que não há na loja"
            accessibilityState={{ checked: feito }} aria-checked={feito}
            style={{ flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {/* ⚠ A MARCA DA APP, a 20 (17/09/2026: «põe o visto com o mesmo
                visual que este das tarefas»).
                Aqui esteve um visto solto de 14 px — a ideia era que num talão
                a marca fosse uma nota à margem. Tinha um buraco: um visto solto
                não tem contrário. A linha por apanhar mostrava espaço vazio, e
                numa lista de compras as linhas que interessam são justamente
                essas — o olho tem de contar a ausência de uma coisa em vez da
                presença de outra.
                A `MarcaDeEstado` traz o círculo vazio de volta, que diz «isto
                ainda falta» e diz onde tocar; e é a mesma marca dos outros seis
                ecrãs, em vez de um sétimo idioma só para a loja.
                ⚠ 20, e não os 30 que esta linha teve: metade do peso dos
                blocos vinha daí. */}
            <MarcaDeEstado t={t} size={MARCA}
              estado={feito ? 'marcado' : sem ? 'sem' : 'por-marcar'} />
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: FONT.body, fontSize: 15,
              color: sem ? t.state.warnTexto : feito ? t.text2 : t.text3 }}>
              {i.label}
            </Text>
          </Pressable>

          {/* O PREÇO, encostado à direita, com os algarismos de largura fixa
              para a coluna se ler de cima a baixo. Cinzento com «~» é o que a
              app estima; escuro e a negrito é o que se pagou; «—» é o que ela
              não sabe, porque «0,00 €» seria uma afirmação. */}
          <Pressable onPress={() => setPrecoAberto(x => (x === i.id ? null : i.id))}
            accessibilityRole="button"
            accessibilityLabel={escrito
              ? `Alterar o preço de ${i.label}, ${EUR(s.precoPago[i.id])}`
              : `Escrever o preço pago por ${i.label}`}
            accessibilityState={{ expanded: aEditar }} aria-expanded={aEditar}
            style={{ minHeight: 48, minWidth: 86, paddingLeft: S.md,
              alignItems: 'flex-end', justifyContent: 'center' }}>
            {sem ? (
              <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.state.warnTexto }}>
                sem stock
              </Text>
            ) : escrito || estimado ? (
              <Text style={{ fontFamily: FONT.display, fontSize: 15,
                fontWeight: escrito ? '600' : '400',
                color: escrito ? t.text2 : t.text3 }}>
                {escrito ? EUR(s.precoPago[i.id]) : `~ ${EUR(estimado)}`}
              </Text>
            ) : (
              // ⚠ O LÁPIS DA APP, e não um travessão (17/09/2026: «passa o traço
              // para um lápis como já está no resto da app»).
              //
              // O «—» dizia a verdade — a app não sabe o preço deste artigo —
              // mas não dizia o que fazer com isso, e numa casa sem histórico a
              // coluna inteira era uma fila de travessões. O lápis é o mesmo
              // que a lista de compras, as tarefas e a saúde usam para «isto
              // altera-se aqui», e resolve de caminho a única coisa que faltava
              // a este desenho: nada dizia que o número se tocava.
              <Icon name="edit" size={18} color={t.text3} />
            )}
            {diferenca(i) ? (
              <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11, fontWeight: '600',
                color: diferenca(i).acima ? t.state.warnTexto : t.state.okTexto }}>
                {diferenca(i).texto}
              </Text>
            ) : null}
          </Pressable>
        </View>

        {/* O editor do preço, só do artigo que se tocou: as sugestões primeiro,
            porque na loja não se quer escrever — quer-se confirmar. */}
        {aEditar ? (
          <View style={{ gap: S.md, paddingLeft: 26, paddingBottom: S.md }}>
            {sugestoes.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }}>
                {sugestoes.map(sg => (
                  <Pressable key={`${sg.v}-${sg.de}`} accessibilityRole="button"
                    accessibilityLabel={`Pagou ${EUR(sg.v)}, ${sg.de}`}
                    onPress={() => { definirPrecoPago(i.id, sg.v); setPrecoAberto(null); }}
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
              {/* O valor vai para a loja no `aoTerminar`, não no `onChange`: a
                  cada tecla, «2,49» passava pela loja como 2, 24, 2,49.
                  Regra de 15/09/2026. */}
              <NumField t={t} estreito compacto vazio
                value={rascunhoDoPreco[i.id] ?? s.precoPago[i.id]}
                step={0.1} min={0} max={9999}
                rotulo={`Preço pago por ${i.label}`}
                placeholder={estimado ? EUR(estimado) : undefined}
                onChange={(v) => setRascunhoDoPreco(r => ({ ...r, [i.id]: v }))}
                aoTerminar={(v) => definirPrecoPago(i.id, v)} />
              {/* ⚠ O «não há» SAIU daqui (17/09/2026, ele: «o que é o não há?»).
                  Marcava o artigo como sem stock, e estava mal em três frentes.
                  Contradizia a própria linha: este editor só abre depois de se
                  tocar no preço, e o preço só existe depois de o artigo estar
                  marcado como apanhado — oferecia-se «não havia» de uma coisa
                  que se acabara de dizer que se trouxe. Não dizia o que fazia:
                  duas palavras soltas entre um campo de preço e um «Pronto»
                  leem-se como «sem preço». E era um terceiro caminho para a
                  mesma coisa, que já se faz com pressão longa no nome e que a
                  linha de dicas por cima da lista anuncia.
                  O sítio do «sem stock» é a LINHA, antes de se marcar. */}
              <Pressable onPress={() => setPrecoAberto(null)} accessibilityRole="button"
                accessibilityLabel="Fechar o preço"
                style={{ minHeight: 44, paddingHorizontal: S.md, justifyContent: 'center', marginLeft: 'auto' }}>
                <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.actFg }}>Pronto</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
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
      {/* ⚠ Sem a barra de rolar, pela mesma razão do `Sheet.jsx` (15/09/2026):
          na web a barra vive DENTRO do enchimento e come ~15 px ao conteúdo, e
          o talão ficava mais estreito do que a barra fixa do fundo. Foi assim
          que a coluna dos euros do talão deixou de bater certo com o carrinho
          lá em baixo. No telemóvel nunca há barra; assim a web fica igual. */}
      <ScrollView style={{ flex: 1, minHeight: 0 }} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: S.xl, paddingBottom: S.xl }}>
      {/* ── A CONTAGEM DECRESCENTE ──────────────────────────────────────────
          17/09/2026, desenho 3 de `design/cinco-fora-da-caixa.dc.html`.

          Era um cartão com quatro números — total, estimativa, envelope e uma
          frase de contagem — a ocupar o terço de cima do ecrã. Quatro números
          ao mesmo peso não respondem a nada; a pergunta que se faz num corredor
          é uma só, e é «falta muito?».

          Agora é o número dos que FALTAM, grande, com o carrinho na linha de
          baixo, e os traços por corredor a encher à medida que se despacham. O
          que se perde — a estimativa da lista inteira — reaparece no carrinho,
          que é onde se decide fechar a conta.

          ⚠ O envelope FICA, mas só quando aperta. Era um número permanente que
          ninguém lia; agora é um aviso que aparece acima dos 80 %, e aí é a
          única coisa no ecrã com a cor de estado. */}
      <Card t={t} style={{ gap: S.md, alignItems: 'center' }}>
        <Text style={{ fontFamily: FONT.display, fontSize: 32, fontWeight: '600',
          // ⚠ `actFg` e não `titulo`: isto é TEXTO em cor de ação, e o `titulo`
          // é para objetos gráficos — ícones, anéis, barras. A regra está no
          // CLAUDE.md e o guarda é o `texto-pequeno-le-se-nos-doze-temas`.
          letterSpacing: -0.5, color: porFazer.length ? t.actFg : t.state.okTexto }}>
          {porFazer.length || 'Tudo'}
        </Text>
        <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, color: t.text3, textAlign: 'center' }}>
          {porFazer.length
            ? `${plural(porFazer.length, 'artigo por apanhar', 'artigos por apanhar')} · ${EUR(cart)} no carrinho`
            : `apanhado · ${EUR(cart)} no carrinho`}
        </Text>

        {/* ⚠ OS TRAÇOS POR CORREDOR SAÍRAM DAQUI (17/09/2026), com a gaveta.
            Viveram um dia neste cartão. Com os segmentos a entrarem na barra do
            fundo, o mesmo facto — quantos corredores estão despachados — ficava
            em TRÊS sítios do mesmo ecrã: nos separadores de cima, aqui, e em
            baixo. Ficam onde o polegar está e onde servem de botão.
            Este cartão fica com o que faz melhor: o número que falta e o
            carrinho. */}

        {/* ⚠ O envelope só quando aperta — e com a cor que o estado pede. */}
        {merc > 0 && pctCart > 80 ? (
          <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, fontWeight: '600', textAlign: 'center',
            color: pctCart > 100 ? t.state.errTexto : t.state.warnTexto }}>
            {pctCart > 100
              ? `O carrinho passou o envelope Mercearia em ${EUR(cart - merc)}.`
              : `Restam ${EUR(merc - cart)} no envelope Mercearia.`}
          </Text>
        ) : null}
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
            {plural(inStep.length, 'artigo', 'artigos')}
          </Text>}>
          {step === null ? 'Toda a lista' : step}
        </SectionTitle>

        {/* ⚠ A DICA DOS GESTOS não é decoração. A linha do talão não tem
            botões escritos — marca-se tocando no nome, escreve-se o preço
            tocando no preço, e a pressão longa diz «não há». Um gesto que não
            se anuncia não existe, e esta é a frase que o anuncia. */}
        {inStep.length ? (
          <Text style={{ fontFamily: FONT.ui, fontSize: 11, lineHeight: 17, color: t.text3, marginTop: -S.sm }}>
            Toque no nome para marcar · no preço para o escrever · mantenha premido para «não há»
          </Text>
        ) : null}

        {inStep.length === 0 ? (
          // ⚠ Olha para o que FALTA e para o que existe: sem nada no corredor é
          // uma coisa, com tudo apanhado é outra, e as duas frases são
          // diferentes. Dizer «nada em Frescos» com cinco artigos já apanhados
          // seria mentira.
          <Empty t={t} icon="fileDone"
            title={step === null ? 'Não há nada na lista desta ida.' : `Nada em ${step}.`}
            hint="Toque no «+» da barra de baixo para juntar o que faltar." />
        ) : porFazer.length === 0 ? (
          <Empty t={t} icon="fileDone"
            title={step === null ? 'Está tudo apanhado.' : `${step} está despachado.`}
            hint="Os preços ficam à vista no talão, se quiser rever algum." />
        ) : null}

        {/* ── O TALÃO ────────────────────────────────────────────────────────
            17/09/2026, desenho 1 de `design/cinco-fora-da-caixa.dc.html`.

            Um cartão só, com todas as linhas lá dentro e uma régua a separar.
            Com «Toda a lista» escolhida, agrupa por corredor — é a ordem por
            que se anda na loja, e um talão sem cabeçalhos é uma parede.

            ⚠ O apanhado JÁ NÃO SAI da lista para um grupo fechado (o desenho 7,
            que esteve aqui meio dia). No talão não é preciso: o estado lê-se no
            peso da letra, e tirar metade das linhas para uma gaveta obrigava a
            abri-la para rever um preço. Uma lista só, densa, com tudo à vista. */}
        {inStep.length ? (
          <Card t={t} pad={false} style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
            {gruposDoTalao.map((g, gi) => (
              <View key={g.nome || 'tudo'}>
                {g.nome ? (
                  <Text style={{ fontFamily: FONT.ui, fontSize: 11, fontWeight: '700',
                    letterSpacing: 0.7, textTransform: 'uppercase', color: t.slate,
                    marginTop: gi === 0 ? 0 : S.md, marginBottom: 2 }}>
                    {g.nome}
                  </Text>
                ) : null}
                {g.artigos.map((i, k) => LinhaDoArtigo(i, k === g.artigos.length - 1))}
              </View>
            ))}

            {/* A SOMA, com a régua dupla do talão. É a soma do que está neste
                cartão — não uma contagem ao lado que possa discordar dele. */}
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: S.md,
              borderTopWidth: 2, borderTopColor: t.text1, marginTop: S.md, paddingTop: S.md }}>
              <Text style={{ flex: 1, fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
                {`No carrinho · ${inStep.filter(i => stateOf(i) === 'done').length} de ${inStep.length}`}
              </Text>
              <Text style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: '600', color: t.text1 }}>
                {EUR(inStep.filter(i => stateOf(i) === 'done').reduce((a, i) => a + pago(i), 0))}
              </Text>
            </View>
          </Card>
        ) : null}

        {/* ⚠ O «ACRESCENTAR ARTIGO» SAIU DAQUI (17/09/2026), com a gaveta.
            Era uma pastilha no fim da lista, e foi para o «+» da barra do
            fundo, onde está sempre à mão sem se rolar. Duas portas para a mesma
            folha, uma delas a precisar de scroll, não são duas portas — é uma
            porta e um desvio. */}
      </View>
      </ScrollView>

      {/* ── O FUNDO: o percurso à esquerda, o carrinho à direita ─────────────
          17/09/2026, desenho 2 de `design/cinco-fundos-da-loja.dc.html` com a
          arrumação que ele pediu: «usa a 2 mas o "No carrinho" fica do lado
          direito e o segmento no lado esquerdo, seguido do "+"».

          O que aqui estava era um botão de largura inteira — «Corredor seguinte
          · Frescos» ou «Fechar conta» — com uma pastilha fantasma de
          «acrescentar artigo» a flutuar por cima dele. Dois pesos, dois
          alinhamentos, um vão a separá-los, e com o rodapé da app por baixo
          davam TRÊS faixas horizontais empilhadas no fundo do ecrã.

          Agora é uma fila só, com três coisas e três alvos:

            [ segmentos + «seguinte · X» ]  [ + ]        [ No carrinho · 14,25 € ]

          ⚠ OS SEGMENTOS SÃO O BOTÃO. Não são um indicador ao lado de um botão:
          a faixa inteira é o alvo, e tocar nela avança para o corredor
          seguinte. Uma coisa que mostra o progresso e faz andar é melhor do que
          duas coisas ao lado uma da outra, e a linha por baixo diz para onde
          vai — quem está na loja precisa de saber o lado antes de tocar.

          ⚠ E O CARRINHO ABRE COM UM TOQUE, não com um arrasto. O desenho tinha
          um puxador, e um puxador promete um gesto de arrastar que esta app não
          tem em lado nenhum. Prometer um gesto que não existe é o mesmo defeito
          de não anunciar o que existe, visto do outro lado. A seta para cima diz
          «isto abre», que é verdade.

          Fica ACIMA do rodapé, dentro da coluna desta vista: o rodapé continua a
          ser o último filho da raiz (INVARIANTE #1). */}
      <View style={{ flexGrow: 0, flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: S.md,
        // ⚠ 16 — o mesmo enchimento da LISTA, para a barra bater certo com a
        // BORDA DO CARTÃO do talão e não com o texto lá dentro («alinhado pela
        // linha da caixa acima e não pelo texto»). Cheguei a pôr 30 (16 + 14,
        // o enchimento do cartão) e isso alinhava com os euros; o que ele quer
        // é a coluna do cartão.
        //
        // Isto só bate certo porque a barra de rolar da web deixou de comer
        // largura à lista — ver o `showsVerticalScrollIndicator` lá em cima.
        // Com ela, o cartão ficava 15 px mais estreito do que a barra.
        paddingHorizontal: 16, paddingTop: S.md, paddingBottom: S.md,
        backgroundColor: t.page, borderTopWidth: 1, borderTopColor: t.divider }}>

        {/* O PERCURSO, que também é o botão de avançar. No último corredor (ou
            em «Toda a lista») não há seguinte: fica só o desenho, sem toque. */}
        {(() => {
          const segmentos = (
            <>
              <View style={{ flexDirection: 'row', gap: 2 }}>
                {seccoes.map(nome => {
                  const naSeccao = items.filter(i => i.s === nome);
                  const limpo = naSeccao.length > 0 && naSeccao.every(i => stateOf(i) !== 'open');
                  const aqui = nome === step;
                  return (
                    <View key={nome} style={{ flex: 1, height: 6, borderRadius: R.pill,
                      backgroundColor: aqui ? t.titulo : limpo ? t.state.okTexto : t.border }} />
                  );
                })}
              </View>
              <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11.5, fontWeight: '600',
                color: seguinte ? t.actFg : t.text3 }}>
                {/* ⚠ Pelo `plural`: numa ida de um artigo só, «1 de 1
                    apanhados» era o que aqui estava. */}
                {seguinte ? `seguinte · ${seguinte}`
                  : `${doneItems.length} de ${plural(items.length, 'apanhado', 'apanhados')}`}
              </Text>
            </>
          );
          return seguinte ? (
            <Pressable onPress={() => setStep(seguinte)} accessibilityRole="button"
              accessibilityLabel={`Corredor seguinte · ${seguinte}`}
              style={{ flex: 1, minHeight: 44, justifyContent: 'center', gap: 5 }}>
              {segmentos}
            </Pressable>
          ) : (
            <View style={{ flex: 1, minHeight: 44, justifyContent: 'center', gap: 5 }}>{segmentos}</View>
          );
        })()}

        {/* O «+», a seguir ao percurso, como ele pediu. */}
        <Pressable onPress={() => setNovoArtigo(true)} accessibilityRole="button"
          accessibilityLabel="Acrescentar artigo à lista"
          style={{ width: 44, height: 44, borderRadius: R.row, borderWidth: 1, borderColor: t.border,
            alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="plus" size={20} color={t.actFg} />
        </Pressable>

        {/* O CARRINHO, à direita. Um toque abre a folha que já existe — a mesma
            que fecha a conta —, e é lá que vive o botão com o acento cheio: um
            passo intermédio pintado como decisão final ensina a família a
            carregar sem ler. */}
        <Pressable onPress={() => setCartOpen(true)} accessibilityRole="button"
          accessibilityLabel={`Abrir o carrinho · ${plural(doneItems.length, 'artigo', 'artigos')}, ${EUR(cart)}`}
          style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: S.sm,
            paddingLeft: S.md, paddingRight: S.sm, borderRadius: R.row,
            borderWidth: 1, borderColor: t.actBrd, backgroundColor: t.actBg }}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: FONT.ui, fontSize: 11, color: t.actFg }}>No carrinho</Text>
            <Text style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: '600', color: t.actFg }}>
              {EUR(cart)}
            </Text>
          </View>
          <Icon name="caretUp" size={18} color={t.actFg} />
        </Pressable>
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
