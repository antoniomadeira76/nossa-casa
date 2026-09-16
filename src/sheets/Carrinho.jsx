import React from 'react';
import { View, Text } from 'react-native';
import { S, FONT } from '../theme';
import { EUR, plural } from '../format';
import { Label, Primary, Tile, MarcaDeEstado } from '../ui';
import Sheet from '../Sheet';

// Validação antes de fechar a conta. Vivia dentro do Compras.jsx, ao lado do
// modo de loja; saiu com ele.
// ⚠ O `destino` vem de fora, e é de propósito: o envelope onde a despesa cai é
// escolhido por quem chama o `onConfirm`. Escrevê-lo aqui outra vez era uma
// segunda porta para a mesma decisão — a classe de defeito que já apagou o
// acerto de contas três vezes.
//
// ⚠ ERA UM `<Modal>` ESCRITO À MÃO, e tapava o rodapé (16/09/2026).
//
// O `Sheet` da app reserva 86 px acima do fundo exactamente para o rodapé
// continuar à vista — é o INVARIANTE #1, e o modo de loja já tinha saído de um
// `<Modal>` pela mesma razão, com a explicação escrita no Compras.jsx. Esta
// folha ficou para trás: copiava a moldura do `Sheet` linha a linha (o véu, a
// coluna da app, o cabeçalho, o botão de fechar) e esquecia-se da margem.
//
// Passa a ser a `Sheet`, e com ela vêm de borla o cabeçalho igual ao das outras
// vinte e três folhas, o botão principal no rodapé fixo, e a margem do rodapé
// da app. O que aqui fica é só o conteúdo.
export default function Carrinho({ t, doneItems, items, cart, pago, user, store, who, destino, onClose, onConfirm }) {
  const noStock = items.filter(i => !doneItems.includes(i));
  const hasWarnings = noStock.length > 0;

  return (
    <Sheet t={t} title="Carrinho" sub={`${store} · ${who}`} onClose={onClose}
      action={
        // ACENTO: é dinheiro entre pessoas. Fechar a conta escreve uma despesa
        // na conta conjunta, paga por quem foi às compras — e aparece no acerto
        // de contas entre os dois adultos. A linha por baixo diz para onde vai,
        // que é o que a folha não dizia: mostrava o total e ficava calada
        // quanto ao destino.
        // ⚠ O «Cancelar» saiu: a folha já fecha pelo X do cabeçalho e pelo véu,
        // como as outras vinte e três. Era um terceiro caminho para o mesmo
        // sítio, e o único desenhado com o `t.border` como fundo de botão.
        <Primary t={t} label="Fechar conta e registar" icon="check"
          sub={destino ? `${EUR(cart)} em ${destino}, por ${who || user}` : null}
          onPress={onConfirm} />
      }>
      {/* Artigos comprados */}
      <View style={{ gap: S.md }}>
        <Label t={t}>Artigos Confirmados ({doneItems.length})</Label>
        <View style={{ paddingHorizontal: S.xs }}>
          {doneItems.map((i, idx, arr) => (
            <View key={i.id} style={{
              minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12,
              borderBottomWidth: idx === arr.length - 1 ? 0 : 1, borderBottomColor: t.divider,
            }}>
              {/* ⚠ A marca partilhada, e não um visto verde escrito à mão.
                  Duas secções abaixo, nesta mesma folha, os pendentes já usavam
                  a `MarcaDeEstado`: o mesmo ecrã tinha o visto a verde em cima
                  e a cruz do tema em baixo. E o ecrã anterior — o Modo Compras
                  — mostrava os MESMOS artigos com o visto na cor do perfil. */}
              <MarcaDeEstado t={t} estado="marcado" size={20} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text numberOfLines={1} style={{ fontFamily: FONT.body, fontSize: 14, color: t.text2 }}>{i.label}</Text>
              </View>
              <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.text2 }}>
                {EUR(pago ? pago(i) : (i.real !== undefined ? i.real : i.est))}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Total */}
      <View style={{ gap: S.sm }}>
        <Label t={t}>Total da Despesa</Label>
        <Text style={{ fontFamily: FONT.display, fontSize: 28, color: t.text2 }}>{EUR(cart)}</Text>
      </View>

      {/* Aviso se faltam artigos.
          ⚠ Pelo `plural`, e não por três «s» condicionais na mesma frase. */}
      {hasWarnings ? (
        <Tile t={t} kind="warn" icon="exclamation">
          {noStock.length === 1
            ? '1 artigo ainda não foi confirmado. Tem a certeza que quer fechar?'
            : `${noStock.length} artigos ainda não foram confirmados. Tem a certeza que quer fechar?`}
        </Tile>
      ) : null}

      {/* Artigos sem stock */}
      {noStock.length > 0 ? (
        <View style={{ gap: S.md }}>
          <Label t={t}>Artigos Pendentes ({noStock.length})</Label>
          <View style={{ paddingHorizontal: S.xs }}>
            {noStock.slice(0, 5).map((i, idx, arr) => (
              <View key={i.id} style={{
                minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12,
                borderBottomWidth: idx === Math.min(4, arr.length - 1) ? 0 : 1, borderBottomColor: t.divider,
              }}>
                {/* Estes são os artigos SEM STOCK — a cruz âmbar, como no
                    modo compras. Levavam um «i», que dizia «informação». */}
                <MarcaDeEstado t={t} estado="sem" size={20} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text numberOfLines={1} style={{ fontFamily: FONT.body, fontSize: 14, color: t.text2 }}>{i.label}</Text>
                </View>
                <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: t.text3 }}>
                  ~ {EUR(i.est)}
                </Text>
              </View>
            ))}
          </View>
          {noStock.length > 5 ? (
            <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3, textAlign: 'center' }}>
              +{plural(noStock.length - 5, 'artigo pendente', 'artigos pendentes')}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Sheet>
  );
}
