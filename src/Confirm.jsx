import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { S, R, FONT, elev, LARGURA_APP } from './theme';
import Icon from './Icon';

// Diálogo de confirmação.
//
// ⚠ O botão de confirmar é CHEIO, e a razão é medida, não estética.
//
// O comentário que aqui estava dizia: «`destructive` pinta a ação de vermelho e
// deixa-a em contorno — o peso do preenchimento fica para as ações que
// constroem». Bem intencionado, e era o que tornava este diálogo ilegível:
// o rótulo tem 15 px a 700, que é texto pequeno e pede 4,5:1, e em contorno a
// cor do texto era o próprio tom. Medido nos doze temas, sobre a superfície:
//
//   accent    2,12 a 7,56  →  falha em SEIS (os escuros todos)
//   err       3,27 a 5,32  →  falha em SETE, e é a variante destrutiva —
//                             a que apaga uma tarefa, um artigo, uma consulta
//
// Cheio, com branco por cima, passa nos doze sem excepção: 4,62 a 7,56 no
// acento, 5,79 no `errDeep`. Zero falhas.
//
// ⚠ E o vermelho é o `errDeep`, não o `err`: o `err` (#FF4D4F) só dá 3,27 com
// branco. O `err` fica para o contorno e o ícone, que são objetos gráficos.
export default function Confirm({
  t, icon = 'warning', title, message,
  confirmLabel, cancelLabel = 'Cancelar',
  destructive, onConfirm, onCancel,
}) {
  // O tom do ícone e do contorno — objeto gráfico, 3:1.
  const tone = destructive ? t.state.err : t.accent;
  // E o tom do PREENCHIMENTO, que tem de aguentar branco por cima.
  const cheio = destructive ? t.state.errDeep : t.accent;
  return (
    <Modal transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      {/* Dentro da coluna da app: o <Modal> escapa à raiz no
          react-native-web, e o escurecido apanhava a janela toda. */}
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        width: '100%', maxWidth: LARGURA_APP, marginHorizontal: 'auto', alignItems: 'center', justifyContent: 'center', padding: S.xl }}>
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
                flex: 1, minHeight: 44, borderRadius: R.row, borderWidth: 1, borderColor: t.border,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: pressed ? t.subtle : t.surface,
              })}>
              <Text style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: '500', color: t.text2 }}>
                {cancelLabel}
              </Text>
            </Pressable>

            <Pressable onPress={onConfirm} accessibilityRole="button" accessibilityLabel={confirmLabel}
              style={({ pressed }) => ({
                flex: 1, minHeight: 44, borderRadius: R.row,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: cheio, opacity: pressed ? 0.85 : 1,
              })}>
              <Text numberOfLines={1} style={{ fontFamily: FONT.display, fontSize: 15,
                fontWeight: '700', color: '#FFFFFF' }}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
