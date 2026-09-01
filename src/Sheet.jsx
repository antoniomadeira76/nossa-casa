import React from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { S, R, FONT, elev, LARGURA_APP } from './theme';
import Icon from './Icon';

// Folha inferior: cabeçalho fixo, meio a rolar, ação fixa em baixo.
// Para a folha nunca tapar o rodapé, para nos 86 px acima do fundo.
export default function Sheet({ t, title, sub, onClose, children, action, headerRight, leading }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      {/* ⚠ A folha corre DENTRO da coluna da app.
          O <Modal> do react-native-web sai da raiz e vai para o topo do DOM —
          é o que o faz escapar ao `maxWidth` da coluna. No monitor, uma folha
          abria de ponta a ponta da janela sobre uma app de 460 px de largura.
          O escurecido também: escurecia a fotografia à volta, que não é da app.
          A largura vem do tema, para não haver dois 460 a divergir. */}
      <View style={{ flex: 1, justifyContent: 'flex-end',
        width: '100%', maxWidth: LARGURA_APP, marginHorizontal: 'auto' }}>
        <Pressable onPress={onClose} accessibilityLabel="Fechar"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} />
        <View style={{
          marginBottom: 86 - Math.max(insets.bottom, 10) > 0 ? 86 : 0,
          backgroundColor: t.surface, borderTopLeftRadius: R.card, borderTopRightRadius: R.card,
          maxHeight: '82%', paddingHorizontal: 16, paddingTop: 20, ...elev(2),
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: S.lg }}>
            {leading}
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: '500', color: t.text1 }}>{title}</Text>
              {sub ? <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>{sub}</Text> : null}
            </View>
            {headerRight}
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar"
              hitSlop={8} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="close" size={22} color={t.text3} />
            </Pressable>
          </View>

          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: S.lg, paddingBottom: S.md }}>
            {children}
          </ScrollView>

          {action ? <View style={{ paddingTop: 14, paddingBottom: 30 }}>{action}</View>
                  : <View style={{ height: 24 }} />}
        </View>
      </View>
    </Modal>
  );
}
