import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { Label, Choice, Toggle, Primary } from '../ui';
import Icon from '../Icon';
import { EUR } from '../format';

/**
 * Alterar um artigo da lista de compras.
 *
 * ── Porque é que isto existe ─────────────────────────────────────────────────
 *
 * Havia criar e apagar, e mais nada. Escrever «Leite» e querer «Leite
 * meio-gordo · 6 un.» era apagar e voltar a escrever — e com isso perdia-se o
 * lugar do artigo no corredor e o que já se tinha marcado nesta ida.
 *
 * ── A forma é a da folha das Tarefas ────────────────────────────────────────
 *
 * A linha marca o artigo, o lápis abre esta folha, e o apagar vive aqui em
 * baixo, depois de tudo o que se pode ajustar e separado por uma linha: quem
 * vem mudar o corredor não passa pelo apagar a caminho.
 *
 * ⚠ E os campos são os MESMOS que a folha de criar oferece. Um artigo que se
 * cria com quatro coisas e se altera com duas obriga a apagar para mudar a
 * terceira, que é o defeito que esta folha vem resolver.
 *
 * ⚠ As alterações juntam-se num rascunho e vão de uma vez. Aplicar a cada
 * tecla era uma escrita no servidor por cada letra do nome.
 */
export default function GerirArtigo({ t, artigo, onApagar, onClose }) {
  const { alterarArtigo, seccoes } = useStore();
  const [form, setForm] = useState({
    label: artigo.label || '',
    s: artigo.s,
    est: artigo.est || 0,
    staple: !!artigo.staple,
  });
  const [erro, setErro] = useState(null);

  const rotulo = form.label.trim();
  const mudouCorredor = form.s !== artigo.s;
  const mudou = rotulo !== (artigo.label || '')
    || mudouCorredor
    || Number(form.est) !== Number(artigo.est || 0)
    || form.staple !== !!artigo.staple;

  const guardar = () => {
    const msg = alterarArtigo(artigo.id, {
      label: rotulo, s: form.s, est: Number(form.est) || 0, staple: form.staple,
    });
    if (msg) { setErro(msg); return; }
    onClose();
  };

  // ⚠ A consequência dita dentro do botão, e não numa legenda ao lado. Mudar
  // de corredor tira o artigo do lugar que a mão lhe deu, e quem toca tem de
  // saber isso ANTES — senão arrasta a lista outra vez sem entender porquê.
  const consequencia = !rotulo ? 'Escreva um nome para o artigo'
    : !mudou ? 'Nada mudou'
      : mudouCorredor ? `Passa para o fim de «${form.s}»`
        : 'Fica na lista desta ida';

  return (
    <View style={{ gap: S.lg }}>
      <View style={{ gap: S.sm }}>
        <Label t={t}>Artigo</Label>
        <TextInput
          value={form.label}
          onChangeText={(v) => { setErro(null); setForm(f => ({ ...f, label: v })); }}
          placeholder="Ex: Leite meio-gordo · 1 L"
          placeholderTextColor={t.text3}
          maxLength={60}
          style={{
            minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body,
            fontSize: 15, color: t.text2, borderRadius: R.row, borderWidth: 1,
            borderColor: t.border, backgroundColor: t.card,
          }}
        />
      </View>

      <View style={{ gap: S.sm }}>
        <Label t={t}>Corredor</Label>
        {/* ⚠ Os corredores da CASA, e a escolha guarda o NOME. Um índice
            apontava para outro corredor a cada reordenação. */}
        <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
          {seccoes.map((sec) => (
            <Choice key={sec} t={t} label={sec}
              selected={form.s === sec}
              onPress={() => { setErro(null); setForm(f => ({ ...f, s: sec })); }} />
          ))}
        </View>
      </View>

      <View style={{ gap: S.sm }}>
        <Label t={t}>Preço estimado (€)</Label>
        <TextInput
          value={String(form.est)}
          onChangeText={(v) => setForm(f => ({ ...f, est: parseFloat(String(v).replace(',', '.')) || 0 }))}
          placeholder="0,00"
          placeholderTextColor={t.text3}
          keyboardType="decimal-pad"
          style={{
            minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body,
            fontSize: 15, color: t.text2, borderRadius: R.row, borderWidth: 1,
            borderColor: t.border, backgroundColor: t.card,
          }}
        />
        {/* O que a casa estimava até agora, para se ver o que se está a mudar. */}
        <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
          Estimativa de agora: {EUR(artigo.est || 0)}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12,
        borderWidth: 1, borderColor: t.border, borderRadius: R.card, padding: 14 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>Artigo habitual</Text>
          <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
            {form.staple ? 'Volta à lista todas as semanas.' : 'Entra só desta vez.'}
          </Text>
        </View>
        <Toggle t={t} on={form.staple} label="Artigo habitual"
          onPress={() => setForm(f => ({ ...f, staple: !f.staple }))} />
      </View>

      {erro ? (
        <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, lineHeight: 19, color: t.state.errTexto }}>
          {erro}
        </Text>
      ) : null}

      <Primary comum t={t} label="Guardar alterações" sub={consequencia}
        disabled={!rotulo || !mudou} onPress={guardar} />

      {/* ── Apagar ──────────────────────────────────────────────────────────
          Em baixo, depois de tudo o que se ajusta, e separado por uma linha —
          a mesma ordem da folha das Tarefas. Saiu da LINHA da lista para
          aqui: com o lápis a chegar, a linha ficava com três alvos e o erro
          #6 do CLAUDE.md é exactamente esse. */}
      <View style={{ height: 1, backgroundColor: t.divider }} />
      <Pressable onPress={onApagar}
        accessibilityRole="button" accessibilityLabel={`Apagar ${artigo.label}`}
        style={{ minHeight: 44, borderRadius: R.row, borderWidth: 1, borderColor: t.state.err,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Icon name="trash" size={18} color={t.state.errTexto} />
        <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '500', color: t.state.errTexto }}>
          Apagar artigo
        </Text>
      </Pressable>
    </View>
  );
}
