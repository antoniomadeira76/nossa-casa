import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { S, R, FONT, LARGURA_APP } from './theme';
import Icon from './Icon';

// A confirmação de QUEM VAI VER um evento, antes de o guardar.
//
// ⚠ CONHECIA DOIS NÍVEIS E A CASA TEM TRÊS (16/09/2026).
//
// Recebia `isPrivate` — um sim ou não — e dizia «Este evento será visível para
// toda a família» a tudo o que não fosse «Só eu». Com «Adultos» escolhido, que
// é o nível do meio e o que uma prenda ou uma consulta usam, a app prometia a
// família inteira e guardava outra coisa. Uma confirmação que descreve mal o
// que vai fazer é pior do que não haver confirmação nenhuma: quem a lê deixa
// de a ler da segunda vez.
//
// Agora recebe a `visibilidade` como ela é — `so-eu`, `adultos`, `familia` —,
// que é o mesmo vocabulário do `visibilidadeDe` da loja e da
// `PastilhaVisibilidade` do `ui.jsx`. Três níveis, três frases.
//
// ⚠ O ícone era `users`, e esse ícone NÃO EXISTE no conjunto: o `Icon` devolve
// um SVG vazio a um nome desconhecido, sem erro — o diálogo abria com um buraco
// onde devia estar o símbolo. `lock` é privado (sentido exclusivo, e é o que a
// app já usa); `eye` é «quem vê», que é a pergunta deste diálogo.
const NIVEIS = {
  'so-eu': {
    rotulo: 'Só eu',
    icone: 'lock',
    frase: 'Este evento fica visível apenas para si. Nem o outro adulto o vê.',
  },
  adultos: {
    rotulo: 'Adultos',
    icone: 'eye',
    frase: 'Este evento fica visível aos adultos desta casa. As crianças não o veem.',
  },
  familia: {
    rotulo: 'Família',
    icone: 'eye',
    frase: 'Este evento fica visível a toda a família, crianças incluídas.',
  },
};

export default function ConfirmShare({ t, visibilidade = 'so-eu', onConfirm, onCancel }) {
  const n = NIVEIS[visibilidade] || NIVEIS['so-eu'];

  return (
    <Modal transparent animationType="fade" onRequestClose={onCancel}>
      {/* Dentro da coluna da app — ver o comentário no `Sheet.jsx`. */}
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        width: '100%', maxWidth: LARGURA_APP, marginHorizontal: 'auto',
        alignItems: 'center', justifyContent: 'center', padding: S.lg }}>
        <View style={{ backgroundColor: t.surface, borderRadius: R.card, padding: S.xl, gap: S.lg, maxWidth: 320 }}>
          <View style={{ alignItems: 'center', gap: S.md }}>
            <Icon name={n.icone} size={32} color={t.titulo} />
            <Text style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: '500', color: t.text1, textAlign: 'center' }}>
              Guardar como {n.rotulo}
            </Text>
            <Text style={{ fontFamily: FONT.ui, fontSize: 13, lineHeight: 20, color: t.text3, textAlign: 'center' }}>
              {n.frase}
            </Text>
          </View>

          {/* ⚠ Os dois botões não tinham papel nem rótulo de voz: um leitor de
              ecrã lia «Cancelar» e «Guardar» sem saber que eram botões, e o de
              confirmar dizia «Guardar» sem dizer guardar COMO — que é a única
              coisa que este diálogo pergunta. */}
          <View style={{ flexDirection: 'row', gap: S.md }}>
            <Pressable onPress={onCancel}
              accessibilityRole="button" accessibilityLabel="Cancelar, voltar a escolher quem vê"
              style={({ pressed }) => ({
                flex: 1, minHeight: 44, borderRadius: R.row, borderWidth: 1, borderColor: t.border,
                alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1,
              })}>
              <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '500', color: t.text2 }}>
                Cancelar
              </Text>
            </Pressable>

            <Pressable onPress={onConfirm}
              accessibilityRole="button" accessibilityLabel={`Guardar o evento como ${n.rotulo}`}
              style={({ pressed }) => ({
                flex: 1, minHeight: 44, borderRadius: R.row, backgroundColor: t.accent,
                alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1,
              })}>
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
