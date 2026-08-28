import React from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { S, R, FONT, elev } from './theme';
import Icon from './Icon';

// Folha inferior: cabeçalho fixo, meio a rolar, ação fixa em baixo.
// Para a folha nunca tapar o rodapé, para nos 86 px acima do fundo.
export default function Sheet({ t, title, sub, onClose, children, action, headerRight, leading }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
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
