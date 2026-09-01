import React from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { S, R, FONT, elev , LARGURA_APP } from '../theme';
import { EUR } from '../format';
import { Card, Label, Primary, Tile } from '../ui';
import Icon from '../Icon';

// Validação antes de fechar a conta. Vivia dentro do Compras.jsx, ao lado do
// modo de loja; saiu com ele.
export default function Carrinho({ t, doneItems, items, cart, pago, user, store, who, onClose, onConfirm }) {
  const noStock = items.filter(i => !doneItems.includes(i));
  const hasWarnings = noStock.length > 0;

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      {/* Dentro da coluna da app — ver o comentário no `Sheet.jsx`. */}
      <View style={{ flex: 1, justifyContent: 'flex-end',
        width: '100%', maxWidth: LARGURA_APP, marginHorizontal: 'auto' }}>
        <Pressable onPress={onClose} accessibilityLabel="Fechar"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} />
        <View style={{
          backgroundColor: t.surface, borderTopLeftRadius: R.card, borderTopRightRadius: R.card,
          maxHeight: '85%', paddingHorizontal: 16, paddingTop: 20, ...elev(2),
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: S.lg }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: '500', color: t.text1 }}>Carrinho</Text>
              <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>{store} · {who}</Text>
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar"
              hitSlop={8} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="close" size={22} color={t.text3} />
            </Pressable>
          </View>

          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: S.lg, paddingBottom: S.md }}>
            {/* Artigos Comprados */}
            <View style={{ gap: S.md }}>
              <Label t={t}>Artigos Confirmados ({doneItems.length})</Label>
              <Card t={t} pad={false} style={{ paddingHorizontal: 16 }}>
                {doneItems.map((i, idx, arr) => (
                  <View key={i.id} style={{
                    minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12,
                    borderBottomWidth: idx === arr.length - 1 ? 0 : 1, borderBottomColor: t.divider
                  }}>
                    <Icon name="checkCircle" size={20} color={t.state.ok} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text numberOfLines={1} style={{ fontFamily: FONT.body, fontSize: 14, color: t.text2 }}>{i.label}</Text>
                    </View>
                    <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.text2 }}>
                      {EUR(pago ? pago(i) : (i.real !== undefined ? i.real : i.est))}
                    </Text>
                  </View>
                ))}
              </Card>
            </View>

            {/* Total */}
            <View style={{ gap: S.sm }}>
              <Label t={t}>Total da Despesa</Label>
              <Text style={{ fontFamily: FONT.display, fontSize: 28, color: t.text2 }}>{EUR(cart)}</Text>
            </View>

            {/* Aviso se faltam artigos */}
            {hasWarnings ? (
              <Tile t={t} kind="warn" icon="exclamation">
                {noStock.length} artigo{noStock.length !== 1 ? 's' : ''} ainda não {noStock.length !== 1 ? 'foram' : 'foi'} confirmado{noStock.length !== 1 ? 's' : ''}. Tem a certeza que quer fechar?
              </Tile>
            ) : null}

            {/* Artigos sem stock */}
            {noStock.length > 0 ? (
              <View style={{ gap: S.md }}>
                <Label t={t}>Artigos Pendentes ({noStock.length})</Label>
                <Card t={t} pad={false} style={{ paddingHorizontal: 16 }}>
                  {noStock.slice(0, 5).map((i, idx, arr) => (
                    <View key={i.id} style={{
                      minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12,
                      borderBottomWidth: idx === Math.min(4, arr.length - 1) ? 0 : 1, borderBottomColor: t.divider
                    }}>
                      <Icon name="infoCircle" size={20} color={t.text3} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text numberOfLines={1} style={{ fontFamily: FONT.body, fontSize: 14, color: t.text2 }}>{i.label}</Text>
                      </View>
                      <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: t.text3 }}>
                        ~ {EUR(i.est)}
                      </Text>
                    </View>
                  ))}
                </Card>
                {noStock.length > 5 ? (
                  <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3, textAlign: 'center' }}>
                    +{noStock.length - 5} artigo{noStock.length - 5 !== 1 ? 's' : ''} pendente{noStock.length - 5 !== 1 ? 's' : ''}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </ScrollView>

          <View style={{ paddingTop: 14, paddingBottom: 30, gap: S.md }}>
            <Primary t={t} label="Fechar Conta e Registar" icon="check"
              onPress={onConfirm} />
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cancelar"
              style={({ pressed }) => ({
                minHeight: 44, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center',
                backgroundColor: t.border, opacity: pressed ? 0.7 : 1,
              })}>
              <Text style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: '700', color: t.text2 }}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

