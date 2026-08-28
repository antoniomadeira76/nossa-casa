import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { S, R, FONT, elev } from './theme';
import Icon from './Icon';

// Diálogo de confirmação. `destructive` pinta a ação de vermelho e deixa-a
// em contorno — o peso do preenchimento fica para as ações que constroem.
export default function Confirm({
  t, icon = 'warning', title, message,
  confirmLabel, cancelLabel = 'Cancelar',
  destructive, onConfirm, onCancel,
}) {
  const tone = destructive ? t.state.err : t.accent;
  return (
    <Modal transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center', justifyContent: 'center', padding: S.xl }}>
        <View style={{ width: '100%', maxWidth: 360, backgroundColor: t.surface,
          borderRadius: R.card, padding: S.xl, gap: S.lg, ...elev(3) }}>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name={icon} size={24} color={tone} />
            <Text style={{ flex: 1, fontFamily: FONT.display, fontSize: 18,
              fontWeight: '500', color: t.text1 }}>{title}</Text>
          </View>

          <Text style={{ fontFamily: FONT.body, fontSize: 15, lineHeight: 22, color: t.text2 }}>
            {message}
          </Text>

          <View style={{ flexDirection: 'row', gap: S.md }}>
            <Pressable onPress={onCancel} accessibilityRole="button" accessibilityLabel={cancelLabel}
              style={({ pressed }) => ({
                flex: 1, minHeight: 44, borderRadius: R.card, borderWidth: 1, borderColor: t.border,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: pressed ? t.subtle : t.surface,
              })}>
              <Text style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: '500', color: t.text2 }}>
                {cancelLabel}
              </Text>
            </Pressable>

            <Pressable onPress={onConfirm} accessibilityRole="button" accessibilityLabel={confirmLabel}
              style={({ pressed }) => ({
                flex: 1, minHeight: 44, borderRadius: R.card, borderWidth: 1, borderColor: tone,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: pressed ? t.subtle : t.surface,
              })}>
              <Text numberOfLines={1} style={{ fontFamily: FONT.display, fontSize: 15,
                fontWeight: '700', color: tone }}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
