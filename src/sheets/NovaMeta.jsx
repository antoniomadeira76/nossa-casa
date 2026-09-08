import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { Label, NumField, Primary } from '../ui';
import { EUR } from '../format';

/**
 * Criar uma meta da família.
 *
 * ── Porque é que isto não existia ────────────────────────────────────────────
 *
 * A coleção `metas` está no servidor desde o primeiro dia, com regras e tudo. O
 * cliente nunca lhe escreveu: a lista da app era a constante `GOALS` do
 * `data.js`, desenhada e mais nada. Uma meta que a Rita quisesse criar não
 * existia em sítio nenhum — nem no telemóvel dela.
 *
 * ⚠ Uma meta é em EUROS. Quanto se quer juntar é um valor, não uma fracção do
 * rendimento: a barra mostra o progresso, e todos os números se dizem em euros.
 *
 * ⚠ E o que já está juntado NÃO se escreve aqui. Uma meta nasce a zero e sobe
 * por movimentos (INVARIANTE #2) — um campo «já juntei 1 920 €» era um saldo
 * escrito, e dois telemóveis a reforçar a mesma meta anulavam-se. Quem quiser
 * lançar o que já tinha de lado faz um reforço na folha de gestão, com motivo.
 */
export default function NovaMeta({ t, user, onClose }) {
  const { criarMeta } = useStore();
  const [form, setForm] = useState({ name: '', of: 500, when: '' });
  const [erro, setErro] = useState(null);

  const nome = form.name.trim();
  const guardar = () => {
    const msg = criarMeta(nome, form.of, form.when);
    if (msg) { setErro(msg); return; }
    onClose();
  };

  return (
    <View style={{ gap: S.lg }}>
      <View style={{ gap: S.sm }}>
        <Label t={t}>Meta</Label>
        <TextInput
          value={form.name}
          onChangeText={(v) => { setErro(null); setForm(f => ({ ...f, name: v })); }}
          placeholder="Ex: Férias no Algarve"
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
        <Label t={t}>Quanto quer juntar</Label>
        {/* O passo é de 50 €, o mesmo do reforço rápido do cartão. */}
        <NumField t={t} value={form.of} step={50} min={0} max={999999}
          onChange={(v) => { setErro(null); setForm(f => ({ ...f, of: v })); }} />
      </View>

      <View style={{ gap: S.sm }}>
        <Label t={t}>Para quando (opcional)</Label>
        <TextInput
          value={form.when}
          onChangeText={(v) => setForm(f => ({ ...f, when: v }))}
          placeholder="Ex: julho de 2027 · ou deixe em branco"
          placeholderTextColor={t.text3}
          maxLength={40}
          style={{
            minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body,
            fontSize: 15, color: t.text2, borderRadius: R.row, borderWidth: 1,
            borderColor: t.border, backgroundColor: t.card,
          }}
        />
      </View>

      {erro ? (
        <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, lineHeight: 19, color: t.state.errDeep }}>
          {erro}
        </Text>
      ) : null}

      {/* A consequência dita dentro do botão: a meta nasce a zero, e é o
          reforço que lhe põe dinheiro. Sem esta frase, quem cria uma meta de
          3 000 € espera vê-la a 3 000 €. */}
      <Primary comum t={t} label="Criar meta"
        sub={!nome ? 'Escreva um nome para a meta'
          : !(form.of > 0) ? 'Escreva quanto quer juntar'
            : `Nasce a 0,00 € de ${EUR(form.of)}`}
        disabled={!nome || !(form.of > 0)}
        onPress={guardar} />
    </View>
  );
}
