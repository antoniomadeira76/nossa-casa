import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT, corDoMembro } from '../theme';
import { dayLabel, parseKey, chaveDeDMY, dmyDeChave } from '../format';
import { Card, SectionTitle, Label, Row, Tap, Avatar, avatarDe, Tile, Empty,
         BotaoCompacto, EscolherMembro, AddButton, Choice, Linha } from '../ui';
import Icon from '../Icon';
import Sheet from '../Sheet';
import Confirm from '../Confirm';
import CampoData from '../CampoData';
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
    reordenarSeccoes, allItems,
  } = st;

  const [folha, setFolha] = useState(null);      // 'quem' | 'quando' | 'onde' | 'loja' | 'seccao'
  const [texto, setTexto] = useState('');
  const [aEditar, setAEditar] = useState(null);  // o nome que se está a renomear
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

  const fechar = () => { setFolha(null); setTexto(''); setAEditar(null); setErro(null); };

  const guardarSeccao = () => {
    const msg = aEditar ? alterarSeccao(aEditar, texto) : criarSeccao(texto);
    if (msg) { setErro(msg); return; }
    fechar();
  };

  return (
    <>
      {/* ── A ida marcada ───────────────────────────────────────────────────
          Três linhas, cada uma com um destino — o erro #6 do CLAUDE.md. O
          «Alterar» que aqui havia mudava só quem vai, e as outras duas coisas
          não se mudavam de sítio nenhum. */}
      <View>
        <SectionTitle t={t}>A próxima ida</SectionTitle>
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
        <SectionTitle t={t}>Corredores da loja</SectionTitle>
        <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18,
          color: t.text3, marginTop: -S.md, marginBottom: S.md }}>
          É por esta ordem que o Modo Compras leva a lista. Mantenha premido para mudar.
        </Text>
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
        <Sheet t={t} title="Quem vai às compras" sub="Só os adultos da casa"
          onClose={fechar}>
          <EscolherMembro t={t} valor={quem} membros={adultos}
            cores={Object.fromEntries(adultos.map(n => [n, corDoMembro(n, MEMBERS[n]?.cor)]))}
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
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
              {lojas.map((nome, i) => (
                <Choice key={nome} t={t} label={nome} selected={nome === loja}
                  onPress={() => { mudarPlanoDeCompras({ store: i }); fechar(); }} />
              ))}
            </View>
          )}
        </Sheet>
      ) : null}

      {/* ── Uma loja: criar ou renomear ──────────────────────────────────── */}
      {folha === 'loja' ? (
        <Sheet t={t} title={aEditar ? 'Editar loja' : 'Nova loja'} sub={aEditar || undefined}
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
        <Sheet t={t} title={aEditar ? 'Editar corredor' : 'Novo corredor'} sub={aEditar || undefined}
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
