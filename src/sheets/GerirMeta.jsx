import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { Label, NumField, Primary, Bar } from '../ui';
import Icon from '../Icon';
import { EUR, dayLabel } from '../format';

/**
 * Gerir uma meta: reforçar, alterar, ver de onde veio o dinheiro, apagar.
 *
 * ── A ordem das secções é a ordem do uso ─────────────────────────────────────
 *
 * O reforço vem primeiro porque é o que se faz todos os meses; alterar o alvo é
 * raro, e apagar é uma vez na vida. O apagar fica em baixo, separado por uma
 * linha — quem vem reforçar não passa por ele a caminho. É a ordem da folha das
 * Tarefas.
 *
 * ⚠ Tudo em EUROS, incluindo o que se retira. O que está juntado é a SOMA dos
 * movimentos (INVARIANTE #2): retirar não corrige um total, lança um movimento
 * negativo — a linha do servidor não se edita nem se apaga, como nas despesas.
 */
export default function GerirMeta({ t, meta, user, onApagar, onClose }) {
  const { alterarMeta, reforcarMeta, movimentosDaMeta } = useStore();
  const [reforco, setReforco] = useState(50);
  const [motivo, setMotivo] = useState('');
  const [form, setForm] = useState({ name: meta.name, of: meta.of, when: meta.when || '' });
  const [erro, setErro] = useState(null);

  const movs = movimentosDaMeta(meta.id);
  const falta = Math.max(0, meta.of - meta.at);
  const nome = form.name.trim();
  const mudou = nome !== meta.name
    || Number(form.of) !== Number(meta.of)
    || form.when !== (meta.when || '');

  const lancar = (sinal) => {
    const msg = reforcarMeta(meta.id, sinal * reforco, motivo, user);
    if (msg) { setErro(msg); return; }
    setMotivo('');
    onClose();
  };

  const guardar = () => {
    const msg = alterarMeta(meta.id, { name: nome, of: form.of, when: form.when });
    if (msg) { setErro(msg); return; }
    onClose();
  };

  return (
    <View style={{ gap: S.lg }}>
      {/* Onde a meta está, em euros. A barra é o progresso; os números são o
          que a família precisa de saber para decidir quanto reforçar. */}
      <View style={{ gap: S.sm }}>
        <Bar t={t} pct={meta.of > 0 ? (meta.at / meta.of) * 100 : 0} color={t.accent} height={6} />
        <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, color: t.text3 }}>
          {[`${EUR(meta.at)} de ${EUR(meta.of)}`,
            falta > 0 ? `faltam ${EUR(falta)}` : 'meta alcançada',
            meta.when].filter(Boolean).join(' · ')}
        </Text>
      </View>

      {/* ── Reforçar ────────────────────────────────────────────────────── */}
      <View style={{ gap: S.sm }}>
        <Label t={t}>Reforçar ou retirar</Label>
        <NumField t={t} value={reforco} step={50} min={0} max={999999}
          onChange={(v) => { setErro(null); setReforco(v); }} />
        <TextInput accessibilityLabel="Motivo do movimento"
          value={motivo}
          onChangeText={setMotivo}
          placeholder="De onde veio (opcional)"
          placeholderTextColor={t.text3}
          maxLength={60}
          style={{
            minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body,
            fontSize: 15, color: t.text2, borderRadius: R.row, borderWidth: 1,
            borderColor: t.border, backgroundColor: t.card,
          }}
        />
        <View style={{ flexDirection: 'row', gap: S.md }}>
          {/* ⚠ O acento fica no que PÕE dinheiro na meta, que é a acção
              consequente; retirar é a de desistir e leva contorno. E o
              retirar diz-se por palavras — «retirar» e não «− 50 €» —, senão
              um menos pequeno num botão pequeno é a diferença entre juntar e
              tirar 50 €. */}
          <View style={{ flex: 1 }}>
            <Primary t={t} label={`+ ${EUR(reforco)}`}
              sub={`Fica em ${EUR(meta.at + reforco)}`}
              disabled={!(reforco > 0)}
              onPress={() => lancar(1)} />
          </View>
          <Pressable onPress={() => lancar(-1)}
            disabled={!(reforco > 0) || meta.at <= 0}
            accessibilityRole="button"
            accessibilityLabel={`Retirar ${EUR(reforco)} desta meta`}
            style={{ minHeight: 56, paddingHorizontal: 14, borderRadius: R.row, borderWidth: 1,
              borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '500',
              color: (reforco > 0 && meta.at > 0) ? t.text2 : t.text3 }}>
              retirar
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ── De onde veio o dinheiro ─────────────────────────────────────────
          ⚠ Isto é o que faz o total ser verificável em vez de ser uma
          afirmação: o juntado é a soma DESTA lista, e quem duvidar conta. */}
      {movs.length ? (
        <View style={{ gap: S.sm }}>
          <Label t={t}>De onde veio</Label>
          <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: R.card }}>
            {movs.slice(0, 6).map((mv, i, arr) => (
              <View key={mv.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md,
                minHeight: 44, paddingHorizontal: 14,
                borderBottomWidth: i === arr.length - 1 ? 0 : 1, borderBottomColor: t.divider }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text numberOfLines={1} style={{ fontFamily: FONT.body, fontSize: 14, color: t.text2 }}>
                    {mv.label || (mv.delta > 0 ? 'Reforço' : 'Retirada')}
                  </Text>
                  <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
                    {[dayLabel(mv.day), mv.por].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600',
                  color: mv.delta > 0 ? t.state.okTexto : t.state.errTexto }}>
                  {mv.delta > 0 ? '+ ' : '− '}{EUR(Math.abs(mv.delta))}
                </Text>
              </View>
            ))}
          </View>
          {movs.length > 6 ? (
            <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
              e mais {movs.length - 6}, que somam {EUR(movs.slice(6).reduce((n, mv) => n + mv.delta, 0))}.
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* ── Alterar a meta ─────────────────────────────────────────────────── */}
      <View style={{ gap: S.sm }}>
        <Label t={t}>Nome</Label>
        <TextInput accessibilityLabel="Nome da meta"
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
        <NumField t={t} value={form.of} step={50} min={0} max={999999}
          onChange={(v) => { setErro(null); setForm(f => ({ ...f, of: v })); }} />
      </View>

      <View style={{ gap: S.sm }}>
        <Label t={t}>Para quando (opcional)</Label>
        <TextInput accessibilityLabel="Para quando"
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
        <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, lineHeight: 19, color: t.state.errTexto }}>
          {erro}
        </Text>
      ) : null}

      <Primary comum t={t} label="Guardar alterações"
        sub={!nome ? 'Escreva um nome para a meta'
          : !mudou ? 'Nada mudou'
            : Number(form.of) !== Number(meta.of) ? `Passa a juntar até ${EUR(form.of)}`
              : 'A meta fica com o nome novo'}
        disabled={!nome || !mudou} onPress={guardar} />

      {/* ── Apagar ─────────────────────────────────────────────────────────
          Em baixo, depois de tudo o que se ajusta, e separado por uma linha. */}
      <View style={{ height: 1, backgroundColor: t.divider }} />
      <Pressable onPress={onApagar}
        accessibilityRole="button" accessibilityLabel={`Apagar a meta ${meta.name}`}
        style={{ minHeight: 44, borderRadius: R.row, borderWidth: 1, borderColor: t.state.err,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Icon name="trash" size={18} color={t.state.errTexto} />
        <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '500', color: t.state.errTexto }}>
          Apagar meta
        </Text>
      </Pressable>
    </View>
  );
}
