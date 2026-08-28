import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { S, R, FONT } from './theme';
import Icon from './Icon';

export default function ConfirmShare({ t, type, isPrivate, onConfirm, onCancel }) {
  const label = isPrivate ? 'Privado' : 'Partilhado';
  const icon = isPrivate ? 'lock' : 'users';
  const msg = isPrivate
    ? 'Este evento será visível apenas para si.'
    : 'Este evento será visível para toda a família.';

  return (
    <Modal transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: S.lg }}>
        <View style={{ backgroundColor: t.surface, borderRadius: R.card, padding: S.xl, gap: S.lg, maxWidth: 320 }}>
          <View style={{ alignItems: 'center', gap: S.md }}>
            <Icon name={icon} size={32} color={t.accent} />
            <Text style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: '500', color: t.text1, textAlign: 'center' }}>
              Confirmar como {label}
            </Text>
            <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: t.text3, textAlign: 'center' }}>
              {msg}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: S.md }}>
            <Pressable
              onPress={onCancel}
              style={{
                flex: 1, minHeight: 44, borderRadius: R.row, borderWidth: 1, borderColor: t.border,
                alignItems: 'center', justifyContent: 'center',
              }}>
              <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '500', color: t.text2 }}>
                Cancelar
              </Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              style={{
                flex: 1, minHeight: 44, borderRadius: R.row, backgroundColor: t.accent,
                alignItems: 'center', justifyContent: 'center',
              }}>
              <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '500', color: '#FFFFFF' }}>
                Guardar
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
