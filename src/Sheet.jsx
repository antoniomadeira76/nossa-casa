import React from 'react';
import { View, Text, Pressable, Modal, ScrollView, Platform } from 'react-native';

// ⚠ Na WEB a folha abre sem animação. O `animationType="slide"` do
// react-native-web arranca com `translateY(100%)` e espera pelo fim de uma
// animação CSS para o tirar; com uma folha aberta por cima de outra (o avatar
// sobre o Perfil) esse fim não chegava e a segunda folha ficava PRESA fora do
// ecrã, a 794 px, invisível e a bloquear a de baixo. Medido duas vezes em
// 09/09/2026, no varrimento no escuro. No telemóvel a animação é nativa e não
// tem este problema — fica.
export const ANIMACAO_DA_FOLHA = Platform.OS === 'web' ? 'none' : 'slide';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { S, R, FONT, elev, LARGURA_APP } from './theme';
import Icon from './Icon';

// ── O botão principal, fixo em baixo, vindo de DENTRO da folha ──────────────
//
// 14/09/2026, a segunda revisão de coerência: treze folhas tinham o botão
// principal no fim do conteúdo, só visível depois de rolar, e treze tinham-no
// fixo no `action`. O corpo da folha é quem sabe o que o botão faz e quando
// está desativado; o `Sheet` é quem tem o sítio fixo. Este contexto liga os
// dois: o corpo chama `useAcaoDaFolha` com o botão e ele aparece no rodapé
// da folha, sempre à vista. Fora de uma folha (nas provas, ou numa vista
// que não é folha) o hook devolve o próprio elemento, para se desenhar no
// lugar onde estava.
const AcaoDaFolha = React.createContext(null);
export function useAcaoDaFolha(elemento) {
  const registar = React.useContext(AcaoDaFolha);
  // Sem lista de dependências de propósito: o botão muda com o estado do corpo
  // (o rótulo, o `disabled`, a linha de consequência) e tem de acompanhar cada
  // desenho. Não entra em ciclo: o `Sheet` que recebe o elemento não volta a
  // desenhar o corpo, porque os `children` dele são o mesmo objeto.
  React.useEffect(() => {
    if (!registar) return undefined;
    registar(elemento);
    return () => registar(null);
  });
  return registar ? null : elemento;
}

// Folha inferior: cabeçalho fixo, meio a rolar, ação fixa em baixo.
// Para a folha nunca tapar o rodapé, para nos 86 px acima do fundo.
export default function Sheet({ t, title, sub, onClose, children, action, headerRight, leading }) {
  const insets = useSafeAreaInsets();
  const [acaoDoFilho, setAcaoDoFilho] = React.useState(null);
  const acao = action || acaoDoFilho;
  return (
    <Modal transparent animationType={ANIMACAO_DA_FOLHA} onRequestClose={onClose} statusBarTranslucent>
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

          {/* ⚠ Sem a barra de rolar (15/09/2026: «o botão do rodapé não está
              alinhado com os outros»): na web a barra vive DENTRO dos 16 px de
              enchimento e come ~12 px ao conteúdo, e os campos ficavam mais
              estreitos do que o botão fixo do rodapé. No telemóvel nunca há
              barra; assim a web fica igual. */}
          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: S.lg, paddingBottom: S.md }}
            showsVerticalScrollIndicator={false}>
            <AcaoDaFolha.Provider value={setAcaoDoFilho}>
              {children}
            </AcaoDaFolha.Provider>
          </ScrollView>

          {acao ? <View style={{ paddingTop: 14, paddingBottom: 30 }}>{acao}</View>
                : <View style={{ height: 24 }} />}
        </View>
      </View>
    </Modal>
  );
}
