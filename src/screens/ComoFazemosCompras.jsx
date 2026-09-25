import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { dayLabel, parseKey, chaveDeDMY, dmyDeChave } from '../format';
import { Card, SectionTitle, Label, Row, Tap, Avatar, avatarDe, Tile, Empty,
         BotaoCompacto, AddButton, Linha, Toggle } from '../ui';
import { ListaDeEscolha } from '../CampoDeEscolha';
import { EscolherPessoa } from '../FiltroDeMembros';
import Icon from '../Icon';
import Sheet from '../Sheet';
import Confirm from '../Confirm';
import CampoData from '../CampoData';
import { ICONES_DE_CORREDOR, ICONE_POR_ESCOLHER, rotuloDoIcone } from '../icone-do-corredor';
import ListaArrastavel from '../ListaArrastavel';

// ── Como esta casa faz compras ───────────────────────────────────────────────
//
// O plano da ida, as lojas e os corredores num sítio só. É o desenho E de
// `design/ida-as-compras.dc.html`.
//
// ── Porque é um ecrã, e não três cantos ──────────────────────────────────────
//
// As três coisas respondem à MESMA pergunta — como é que esta família faz
// compras — e estavam espalhadas: o plano num cartão do Compras cujo «Alterar»
// só mudava quem vai, as lojas no fundo da Gestão, e os corredores em sítio
// nenhum (eram quatro nomes fixos no `data.js`).
//
// ⚠ E os corredores só fazem sentido com ORDEM. Uma secção não é um rótulo: é
// o lugar dela no percurso da loja, e é por essa ordem que o Modo Compras leva
// a pessoa de corredor em corredor. Uma lista sem ordem não diz por onde se
// anda — e foi isso que fez este ecrã existir em vez de um canto emprestado.
export default function ComoFazemosCompras({ t, user, onClose }) {
  const st = useStore();
  const {
    s, membros: MEMBERS, adultos, mudarPlanoDeCompras, mudarListaDaCasa,
    lojaDoPlano, diaDoPlano, seccoes, criarSeccao, alterarSeccao, apagarSeccao,
    reordenarSeccoes, allItems, escolherIconeDaSeccao, iconesNosCorredores,
    mudarRegraDaCasa,
  } = st;

  const [folha, setFolha] = useState(null);      // 'quem' | 'quando' | 'onde' | 'loja' | 'seccao'
  const [texto, setTexto] = useState('');
  const [aEditar, setAEditar] = useState(null);  // o nome que se está a renomear
  // O ícone que a pessoa tocou nesta folha, ou `null` enquanto não tocar em
  // nenhum — e `null` quer dizer «deixa o nome sugerir», que não é o mesmo
  // que escolher o que ele sugeriria.
  const [escolhaDoIcone, setEscolhaDoIcone] = useState(null);
  const [erro, setErro] = useState(null);
  const [aApagar, setAApagar] = useState(null);  // { tipo, nome }

  const plano = s.shopPlan || {};
  const quem = MEMBERS[plano.who] ? plano.who : null;
  const dia = diaDoPlano();
  const loja = lojaDoPlano();
  const lojas = s.stores || [];

  // Quantos artigos há em cada corredor — é o que diz se apagar um custa
  // alguma coisa, e a pergunta de apagar tem de o dizer ANTES.
  const artigos = allItems();
  const quantos = (nome) => artigos.filter(a => a.s === nome).length;

  // ⚠ O `escolhaDoIcone` limpa-se aqui com o resto. Sem isto, abrir o
  // corredor seguinte trazia o ícone tocado no anterior já marcado — e
  // guardava-o sem ninguém ter escolhido nada.
  const fechar = () => { setFolha(null); setTexto(''); setAEditar(null); setErro(null); setEscolhaDoIcone(null); };

  // O ícone que a folha está a mostrar, e de quem é cada um dos doze.
  // ⚠ O `donos` é calculado com a casa COMO ESTÁ — sem o corredor que se
  // está a criar, que ainda não existe. É o que faz o aviso dizer a verdade.
  const donos = st.donoDosIcones();
  const iconeActual = escolhaDoIcone
    || (aEditar ? st.iconeDaSeccao(aEditar) : ICONE_POR_ESCOLHER);

  const guardarSeccao = () => {
    const msg = aEditar ? alterarSeccao(aEditar, texto) : criarSeccao(texto);
    if (msg) { setErro(msg); return; }
    // ⚠ O ícone grava-se DEPOIS e com o nome NOVO — o `alterarSeccao` pode ter
    // acabado de renomear o corredor, e uma escolha guardada contra o nome
    // antigo ficava órfã no mapa: o corredor voltava à adivinha e o mapa
    // guardava para sempre uma entrada de um corredor que já não existe.
    //
    // E só se grava se a pessoa TOCOU na grelha. Sem toque, o corredor fica à
    // solta e o nome continua a mandar.
    if (escolhaDoIcone) escolherIconeDaSeccao(String(texto || '').trim(), escolhaDoIcone);
    fechar();
  };

  return (
    <>
      {/* ── A ida marcada ───────────────────────────────────────────────────
          Três linhas, cada uma com um destino — o erro #6 do CLAUDE.md. O
          «Alterar» que aqui havia mudava só quem vai, e as outras duas coisas
          não se mudavam de sítio nenhum. */}
      <View>
        <SectionTitle t={t}>A Próxima Ida</SectionTitle>
        {/* Linhas planas, sem cartão — desenho C (09/09/2026). */}
        <View style={{ paddingHorizontal: S.xs }}>
          <Row t={t} icon="user" title={quem || 'Por escolher'} sub="quem vai às compras"
            leading={quem ? <Avatar {...avatarDe(quem, MEMBERS[quem], t.text3)} size={28} /> : null}
            onPress={() => setFolha('quem')} last={false} />
          {/* ⚠ A hora aparece só quando existe. Sem este `filter`, a linha
              ficava «Quarta, 09/09 · » com o separador pendurado — que é o
              defeito que a linha do plano já teve e que custou uma pergunta. */}
          <Row t={t} icon="calendar"
            title={dia ? [dayLabel(dia), plano.time].filter(Boolean).join(' · ') : 'Por marcar'}
            sub="quando" onPress={() => setFolha('quando')} last={false} />
          <Row t={t} icon="storefront" title={loja || 'Por escolher'} sub="onde"
            onPress={() => setFolha('onde')} last />
        </View>
      </View>

      {/* ── As lojas ────────────────────────────────────────────────────── */}
      <View>
        <SectionTitle t={t} right={
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
            {lojas.length}
          </Text>
        }>Lojas</SectionTitle>
        {lojas.length === 0 ? (
          <Empty t={t} icon="storefront" title="Sem lojas."
            hint="Acrescente onde esta casa costuma fazer compras — é entre elas que a app compara preços." />
        ) : (
          <View style={{ paddingHorizontal: S.xs }}>
            {lojas.map((nome, i) => (
              <Row key={nome} t={t} icon="storefront" title={nome}
                sub={nome === loja ? 'a loja desta ida' : undefined}
                onPress={() => { setAEditar(nome); setTexto(nome); setErro(null); setFolha('loja'); }}
                last={i === lojas.length - 1} />
            ))}
          </View>
        )}
        <AddButton t={t} label="acrescentar loja"
          onPress={() => { setAEditar(null); setTexto(''); setErro(null); setFolha('loja'); }} />
      </View>

      {/* ── Os corredores ───────────────────────────────────────────────────
          ⚠ A ordem é o dado, e por isso arrastam-se — como as tarefas, e com o
          mesmo componente. A pressão longa é que arma o gesto: uma alça seria
          um segundo alvo na linha, contra o erro #6. */}
      <View>
        <SectionTitle t={t}>Corredores da Loja</SectionTitle>
        <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18,
          color: t.text3, marginTop: -S.md, marginBottom: S.md }}>
          É por esta ordem que o Modo Compras leva a lista. Mantenha premido para mudar.
        </Text>

        {/* ── Sem ícones ──────────────────────────────────────────────────────
            25/09/2026: «deve haver uma opção slider a dizer sem ícones».

            ⚠ Desligar NÃO apaga nada, e é a mesma promessa do interruptor dos
            pontos: as escolhas ficam no `iconesDeSeccao` e no `seccoes.icone`
            do servidor, e voltar a ligar traz cada corredor com o ícone que
            tinha. É isso que a frase por baixo do interruptor promete.

            ⚠ E é uma regra da CASA, não deste telefone: os ícones são uma
            decisão de quem administra — cada um é único e escolhido à mão — e
            uma casa onde um adulto vê ícones e o outro não tinha duas leituras
            do mesmo corredor. Sobe pelo `mudarRegraDaCasa`. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: t.subtle,
          borderWidth: 1, borderColor: t.border, borderRadius: R.card, padding: 14,
          marginBottom: S.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>Sem ícones</Text>
            <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
              {iconesNosCorredores
                ? 'Cada corredor mostra o ícone que lhe escolheram, aqui e nos títulos da lista de compras.'
                : 'Os corredores ficam só com o nome. As escolhas não se perdem — voltam todas se ligar outra vez.'}
            </Text>
          </View>
          <Toggle t={t} on={!iconesNosCorredores} label="Sem ícones"
            onPress={() => mudarRegraDaCasa({ iconesDesligados: iconesNosCorredores })} />
        </View>

        <ListaArrastavel
          itens={seccoes.map(n => ({ id: n }))}
          grupoDe={() => 'corredores'}
          espaco={0}
          aoLargar={(ids) => reordenarSeccoes(ids)}
          render={(x, { arrastando, armar }) => {
            const n = quantos(x.id);
            return (
              <Linha key={x.id} t={t}
                faixa={arrastando ? t.accent : undefined}
                tinta={arrastando ? t.subtle : undefined}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Pressable
                    onPress={() => { setAEditar(x.id); setTexto(x.id); setErro(null); setFolha('seccao'); }}
                    onLongPress={() => armar(x.id)} delayLongPress={220}
                    accessibilityRole="button"
                    accessibilityLabel={`Corredor ${x.id}`}
                    accessibilityHint="Mantenha premido para mudar a ordem"
                    style={{ flex: 1, minHeight: 56, flexDirection: 'row',
                      alignItems: 'center', gap: 12 }}>
                    <Icon name="grip" size={18} color={t.text3} />
                    {/* ⚠ O ícone do corredor, aqui e no título da lista de compras
                        (25/09/2026). É esta lista a «secção com todos os ícones»: cada
                        corredor mostra o seu, e tocar na linha abre a folha onde se
                        troca. NÃO se fez um segundo ecrã só para os ícones — seria
                        outra porta para a mesma decisão, que é a classe de defeito
                        que o `duas-portas-para-a-mesma-decisao` guarda. */}
                    {/* ⚠ E o `null` do «sem ícones» NÃO se desenha. Um nome
                        que o `Icon.jsx` não conhece devolve um SVG VAZIO do
                        tamanho pedido, sem erro nenhum: a linha ficava com um
                        buraco de 19 px à esquerda do nome, e com o nome
                        desalinhado do resto da app. */}
                    {st.iconeDaSeccao(x.id)
                      ? <Icon name={st.iconeDaSeccao(x.id)} size={19} color={t.titulo} />
                      : null}
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>{x.id}</Text>
                      <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
                        {n === 1 ? '1 artigo' : `${n} artigos`}
                      </Text>
                    </View>
                  </Pressable>
                  <Tap label={`Apagar o corredor ${x.id}`}
                    onPress={() => setAApagar({ tipo: 'seccao', nome: x.id })}>
                    <Icon name="trash" size={17} color={t.state.err} />
                  </Tap>
                </View>
              </Linha>
            );
          }} />
        <View style={{ height: S.md }} />
        <AddButton t={t} label="acrescentar corredor"
          onPress={() => { setAEditar(null); setTexto(''); setErro(null); setFolha('seccao'); }} />
      </View>

      {/* ── Quem vai ─────────────────────────────────────────────────────── */}
      {folha === 'quem' ? (
        <Sheet t={t} title="Quem Vai às Compras" sub="Só os adultos da casa"
          onClose={fechar}>
          {/* A bola de cada pessoa, como nos filtros (15/09/2026). */}
          <EscolherPessoa t={t} valor={quem} membros={adultos} MEMBERS={MEMBERS}
            onEscolher={(n) => { mudarPlanoDeCompras({ who: n }); fechar(); }} />
        </Sheet>
      ) : null}

      {/* ── Quando ───────────────────────────────────────────────────────────
          O dia e a hora num controlo só, que é o que o `CampoData` já faz. */}
      {folha === 'quando' ? (
        <Sheet t={t} title="Quando" sub="O dia e a hora da ida"
          onClose={fechar}
          action={<BotaoCompacto t={t} tom="comum" label="Guardar" onPress={fechar} />}>
          <CampoData t={t}
            valor={dia}
            onChange={(k) => mudarPlanoDeCompras({ day: k })}
            hora={plano.time || ''}
            onHora={(h) => mudarPlanoDeCompras({ time: h || null })} />
        </Sheet>
      ) : null}

      {/* ── Onde ─────────────────────────────────────────────────────────── */}
      {folha === 'onde' ? (
        <Sheet t={t} title="Onde" sub="A loja desta ida" onClose={fechar}>
          {lojas.length === 0 ? (
            <Tile t={t} kind="info">
              Esta casa ainda não tem lojas. Acrescente uma primeiro.
            </Tile>
          ) : (
            // ⚠ A LISTA, e não pastilhas em fila (25/09/2026, opção B de
            // `design/escolher-corredor.dc.html`). Os nomes das lojas são
            // longos — «Pingo Doce da Ajuda», «Mercado de Alcântara» — e
            // partiam a fila mais depressa do que os corredores.
            //
            // ⚠ E é a `ListaDeEscolha` e não o `CampoDeEscolha`: a linha que
            // abre JÁ existe, é a «onde» do plano da ida, lá em cima. Um campo
            // aqui dentro era abrir uma folha a partir de uma folha para
            // escolher a mesma coisa. O que se unifica é o desenho da escolha,
            // não o número de camadas.
            <ListaDeEscolha t={t} nomeDaLista="lojas"
              valor={loja}
              opcoes={lojas.map(nome => ({ valor: nome, titulo: nome, icone: 'storefront' }))}
              aoEscolher={(nome) => { mudarPlanoDeCompras({ store: nome }); fechar(); }} />
          )}
        </Sheet>
      ) : null}

      {/* ── Uma loja: criar ou renomear ──────────────────────────────────── */}
      {folha === 'loja' ? (
        <Sheet t={t} title={aEditar ? 'Editar Loja' : 'Nova Loja'} sub={aEditar || undefined}
          onClose={fechar}
          action={
            <BotaoCompacto t={t} tom="comum" label="Guardar" disabled={!texto.trim()}
              onPress={() => {
                const n = texto.trim();
                if (!n) return;
                if (aEditar) {
                  // ⚠ Renomear TROCA no sítio — o `mudarListaDaCasa` lê a
                  // posição para distinguir renomear de apagar-e-criar, e uma
                  // loja apagada leva atrás as listas que a referem.
                  mudarListaDaCasa('stores', lojas.map(v => (v === aEditar ? n : v)));
                } else if (!lojas.includes(n)) {
                  mudarListaDaCasa('stores', [...lojas, n]);
                }
                fechar();
              }} />
          }>
          <View style={{ gap: S.md }}>
            <Label t={t}>Nome</Label>
            <TextInput value={texto} onChangeText={setTexto}
              placeholder="Ex: Continente de Belém" placeholderTextColor={t.text3}
              accessibilityLabel="Nome da loja"
              style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: R.row,
                borderWidth: 1, borderColor: t.border, fontFamily: FONT.body,
                fontSize: 15, color: t.text1, backgroundColor: t.card }} />
            {aEditar ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`Apagar a loja ${aEditar}`}
                onPress={() => { setFolha(null); setAApagar({ tipo: 'loja', nome: aEditar }); }}
                style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: FONT.display, fontSize: 14, color: t.state.errTexto }}>
                  Apagar esta loja
                </Text>
              </Pressable>
            ) : null}
          </View>
        </Sheet>
      ) : null}

      {/* ── Um corredor: criar ou renomear ───────────────────────────────── */}
      {folha === 'seccao' ? (
        <Sheet t={t} title={aEditar ? 'Editar Corredor' : 'Novo Corredor'} sub={aEditar || undefined}
          onClose={fechar}
          action={
            <BotaoCompacto t={t} tom="comum" label="Guardar" disabled={!texto.trim()}
              onPress={guardarSeccao} />
          }>
          <View style={{ gap: S.md }}>
            <Label t={t}>Nome</Label>
            <TextInput value={texto} onChangeText={(v) => { setTexto(v); setErro(null); }}
              placeholder="Ex: Congelados" placeholderTextColor={t.text3}
              accessibilityLabel="Nome do corredor"
              style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: R.row,
                borderWidth: 1, borderColor: t.border, fontFamily: FONT.body,
                fontSize: 15, color: t.text1, backgroundColor: t.card }} />
            {erro ? <Tile t={t} kind="err">{erro}</Tile> : null}
            {aEditar ? (
              <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
                Mudar o nome leva os {quantos(aEditar)} artigos deste corredor com ele.
              </Text>
            ) : null}

            {/* ── O ícone ────────────────────────────────────────────────────
                25/09/2026, desenho 3 com a 2 por trás. O nome SUGERE — quem
                escreve «Padaria» vê o pão já marcado, sem fazer nada — e quem
                discordar troca num toque. A sugestão acompanha o que se vai
                escrevendo, para a escolha se ver antes de guardar.

                ⚠ Enquanto ninguém tocar na grelha, o corredor fica À SOLTA:
                não se grava escolha nenhuma, e o ícone continua a vir do nome.
                É a diferença entre «ainda não escolhi» e «escolhi isto» — e é
                o que faz mudar o nome de «Zona B» para «Padaria» passar a
                mostrar o pão, em vez de ficar preso à caixa de antes.

                ⚠ E com a casa «sem ícones» a grelha SAI (25/09/2026). Deixá-la
                aqui era oferecer uma escolha que não se vê em lado nenhum — e
                pior, uma escolha que se guardava em silêncio: a pessoa
                escolhia o pão, guardava, e o corredor continuava sem nada. */}
            {iconesNosCorredores ? (
            <View style={{ gap: S.sm }}>
              <Label t={t}>Ícone</Label>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }}>
                {ICONES_DE_CORREDOR.map((nome) => {
                  const on = nome === iconeActual;
                  // ⚠ De quem é este ícone, se não for deste corredor. Escolher
                  // um que já é de outro TIRA-LHO — e isso diz-se antes, não
                  // depois: o outro corredor recebe o primeiro livre e a marca
                  // dele muda sem ninguém ter pedido.
                  const dono = donos[nome];
                  const deOutro = !!dono && dono !== (aEditar || texto.trim());
                  return (
                    <Pressable key={nome} onPress={() => { if (!deOutro) setEscolhaDoIcone(nome); }}
                      disabled={deOutro}
                      accessibilityRole="button" accessibilityState={{ selected: on, disabled: deOutro }}
                      aria-pressed={on} aria-disabled={deOutro}
                      accessibilityLabel={`${rotuloDoIcone(nome)}${deOutro ? ` · agora é de ${dono}` : ''}`}
                      style={{ width: 66, alignItems: 'center', gap: 3,
                        opacity: deOutro && !on ? 0.4 : 1 }}>
                      {/* ⚠ O alvo continua a ser 44 × 44 — o INVARIANTE #5 não
                          tem excepções. O rótulo vai POR BAIXO, fora do
                          quadrado: enfiá-lo lá dentro deixava o ícone a 12 px,
                          que é menos do que um pictograma precisa para se ler. */}
                      <View style={{ width: 44, height: 44, borderRadius: R.row, borderWidth: 1,
                        alignItems: 'center', justifyContent: 'center',
                        borderColor: on ? t.actBrd : t.border,
                        backgroundColor: on ? t.actBg : t.subtle }}>
                        <Icon name={nome} size={21} color={on ? t.actFg : t.text3} />
                      </View>
                      {/* 11 e não 10: a escala `LETRA` do tema começa nos 11, e
                          o guarda `a-coerencia-do-desenho` chumba um tamanho
                          inventado. Se 11 não coubesse, o que mudava era a
                          largura da célula, não a escala. */}
                      <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11,
                        color: on ? t.actFg : t.text3 }}>
                        {rotuloDoIcone(nome)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
                {iconeActual === ICONE_POR_ESCOLHER
                  ? 'Este corredor ainda não tem ícone. Escolha um — a app não escolhe por si.'
                  : `«${rotuloDoIcone(iconeActual)}», escolhido por si. Fica assim mesmo que mude o nome do corredor.`}
              </Text>
              <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
                Cada corredor tem um ícone diferente. Os esbatidos já são de outro
                corredor — liberte-o lá primeiro se o quiser aqui.
              </Text>
            </View>
            ) : (
              <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
                Esta casa está sem ícones nos corredores. O interruptor está em
                «Corredores da Loja», e as escolhas que já fez continuam lá.
              </Text>
            )}
          </View>
        </Sheet>
      ) : null}

      {/* ── Apagar ───────────────────────────────────────────────────────────
          ⚠ A pergunta diz o que acontece aos artigos ANTES de acontecer. Uma
          confirmação que não diz o preço é uma confirmação que não confirma
          nada. */}
      {aApagar ? (
        <Confirm t={t} destructive icon="trash"
          title={`Apagar «${aApagar.nome}»?`}
          message={aApagar.tipo === 'seccao'
            ? (quantos(aApagar.nome) > 0
              ? `Os ${quantos(aApagar.nome)} artigos deste corredor passam para «${seccoes.find(v => v !== aApagar.nome)}». Nenhum se perde.`
              : 'Este corredor está vazio.')
            : 'A loja sai da lista. Os preços que a casa já registou nela ficam — a comparação entre lojas não se perde.'}
          confirmLabel="Apagar"
          onConfirm={() => {
            if (aApagar.tipo === 'seccao') {
              const msg = apagarSeccao(aApagar.nome);
              if (msg) { setAApagar(null); setErro(msg); setFolha('seccao'); return; }
            } else {
              mudarListaDaCasa('stores', lojas.filter(v => v !== aApagar.nome));
            }
            setAApagar(null);
            fechar();
          }}
          onCancel={() => setAApagar(null)} />
      ) : null}
    </>
  );
}
