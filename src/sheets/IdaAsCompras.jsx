import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useStore } from '../store';
import { S, FONT } from '../theme';
import { SectionTitle, Linha, Primary, Empty, Pill, MarcaDeEstado, MARCA } from '../ui';
import Sheet from '../Sheet';
import { EUR, plural } from '../format';

/**
 * UMA IDA ÀS COMPRAS — o que se comprou, e o que se quer repetir.
 *
 * 18/09/2026: «quando clico aqui não devia ver-se o que foi comprado para
 * validar se quero repetir ou não?». Mostrei quatro desenhos em
 * `design/ver-antes-de-repetir.dc.html` e mandou implementar o recomendado: o
 * 2 — a linha abre a folha da ida — com os vistos do 4.
 *
 * O que aqui estava era uma pergunta de VOLUME: «4 artigos entram na lista de
 * hoje», sem dizer quais. Com uma ida de trinta artigos é carregar às cegas, e
 * é o contrário do que uma confirmação serve para fazer.
 *
 * ⚠ A LINHA INTEIRA é que abre isto, e o botão «Repetir» que vivia nela saiu:
 * uma linha, um destino (erro #6 do CLAUDE.md). A linha do histórico tinha um
 * botão à direita e mais nada tocável — e era preciso acertar no botão para
 * chegar a alguma coisa.
 *
 * ⚠ E o que JÁ ESTÁ na lista de hoje aparece, trancado e com a razão à vista.
 * O `artigosQueFaltamDaIda` filtrava-o para fora e ele desaparecia sem
 * explicação: quem comprou quatro artigos e vê três pergunta-se onde está o
 * quarto. É o mesmo defeito que o extracto teve ao desaparecer sem dizer
 * porquê, um dia antes.
 */
export default function IdaAsCompras({ t, ida, user, onClose }) {
  const { artigosDaIda, repetirCompra } = useStore();
  const artigos = artigosDaIda(ida.at);
  // Os que faltam vêm marcados: quem quer tudo carrega logo no botão e nem
  // repara nos vistos; quem quer escolher, desmarca.
  const [escolhidos, setEscolhidos] = useState(
    () => new Set(artigos.filter(a => !a.jaNaLista).map(a => a.rotulo)));

  const alternar = (rotulo) => setEscolhidos((antes) => {
    const novo = new Set(antes);
    if (novo.has(rotulo)) novo.delete(rotulo); else novo.add(rotulo);
    return novo;
  });

  const quantos = escolhidos.size;
  const podeRepetir = artigos.some(a => !a.jaNaLista);
  const dia = new Date(ida.at).toLocaleDateString('pt-PT');

  const linha = (a, ultima) => {
    const marcado = escolhidos.has(a.rotulo);
    const corpo = (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 44 }}>
        <MarcaDeEstado t={t} size={MARCA} estado={a.jaNaLista ? 'sem' : marcado ? 'marcado' : 'por-marcar'} />
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: FONT.body, fontSize: 15,
          color: a.jaNaLista ? t.text3 : t.text2 }}>
          {a.rotulo}
        </Text>
        {a.jaNaLista
          ? <Pill label="já na lista" fg={t.text3} bg={t.subtle} border={t.border} />
          : a.corredor
            ? <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>{a.corredor}</Text>
            : null}
      </View>
    );
    // ⚠ O que já está na lista de hoje NÃO é tocável: marcá-lo não faria nada,
    // e um alvo que não responde é pior do que um alvo que não existe.
    return (
      <Linha key={a.rotulo} t={t} last={ultima}>
        {a.jaNaLista ? corpo : (
          <Pressable onPress={() => alternar(a.rotulo)} accessibilityRole="checkbox"
            accessibilityState={{ checked: marcado }} aria-checked={marcado}
            accessibilityLabel={`${a.rotulo}${a.corredor ? ` · ${a.corredor}` : ''}`}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            {corpo}
          </Pressable>
        )}
      </Linha>
    );
  };

  return (
    <Sheet t={t} title={ida.store || 'Ida às compras'}
      sub={`${ida.who ? `${ida.who} · ` : ''}${dia} · ${EUR(ida.total)}`}
      onClose={onClose}
      action={podeRepetir ? (
        // ⚠ `comum`: acrescentar artigos a uma lista de compras desfaz-se
        // apagando-os. O acento fica para o que não se desfaz.
        <Primary t={t} comum label={`Acrescentar ${plural(quantos, 'artigo', 'artigos')}`}
          sub={quantos > 0 ? 'à lista de hoje · os preços ficam por escrever' : 'escolha pelo menos um'}
          disabled={quantos === 0}
          onPress={() => { repetirCompra(ida.at, user, [...escolhidos]); onClose(); }} />
      ) : null}>
      <View style={{ gap: S.lg }}>
        <View>
          <SectionTitle t={t} right={
            <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
              {plural(artigos.length, 'artigo', 'artigos')}
            </Text>
          }>Artigos</SectionTitle>
          {artigos.length > 0
            ? artigos.map((a, i) => linha(a, i === artigos.length - 1))
            : (
              // Uma ida do tempo em que o histórico só guardava a contagem.
              <Empty t={t} icon="storefront" title="Esta ida não guardou os artigos"
                hint="As idas anteriores a 16/09/2026 guardavam só quantos eram." />
            )}
        </View>

        {podeRepetir ? (
          <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
            Os artigos marcados entram na lista de hoje com o corredor que
            tinham. Os preços ficam por escrever — a app estima-os pelo que a
            casa já pagou.
          </Text>
        ) : artigos.length > 0 ? (
          // ⚠ Diz PORQUÊ não há botão. Uma folha sem acção e sem explicação faz
          // a pessoa procurar o botão que não existe.
          <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
            Não há nada a repetir: todos estes artigos já estão na lista de hoje.
          </Text>
        ) : null}
      </View>
    </Sheet>
  );
}
