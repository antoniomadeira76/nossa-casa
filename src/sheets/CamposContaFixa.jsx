import React from 'react';
import { View, TextInput } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { Label, NumField, Choice } from '../ui';

/**
 * Os campos de uma conta fixa — nome, valor, dia do mês, envelope, quem paga.
 *
 * Partilhados pela folha de criar e pela de gerir: eram os mesmos cinco campos
 * escritos duas vezes, e a folha das metas já paga esse preço (o `NovaMeta` e
 * o `GerirMeta` têm o mesmo formulário copiado). Aqui vive uma vez.
 *
 * `form` é `{ nome, valor, dia, envelope, quemPaga }`; `onChange` recebe o
 * formulário inteiro. A validação é da loja (`validarConta`), não daqui — o
 * ecrã mostra a frase que ela devolver.
 */
export default function CamposContaFixa({ t, form, onChange }) {
  const { envelopes, adultos } = useStore();
  const campo = (k) => (v) => onChange({ ...form, [k]: v });

  return (
    <>
      <View style={{ gap: S.sm }}>
        <Label t={t}>Conta</Label>
        <TextInput accessibilityLabel="Nome da conta"
          value={form.nome}
          onChangeText={campo('nome')}
          placeholder="Ex: Renda, EDP, Internet"
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
        <Label t={t}>Valor</Label>
        <NumField t={t} value={form.valor} step={5} min={0} max={99999}
          onChange={campo('valor')} />
      </View>

      <View style={{ gap: S.sm }}>
        <Label t={t}>Dia do mês em que vence</Label>
        {/* Sem o «€»: é um dia, não um valor. E arredonda-se — o campo aceita
            «15,5» e um dia é inteiro; a loja recusaria, mas é melhor não deixar
            escrever o que não pode ficar. */}
        <NumField t={t} value={form.dia} step={1} min={1} max={31} suffix={false}
          onChange={(v) => campo('dia')(Math.round(v))} />
      </View>

      <View style={{ gap: S.sm }}>
        <Label t={t}>Envelope</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
          {envelopes.map(e => (
            <Choice key={e.name} t={t} label={e.name}
              selected={form.envelope === e.name}
              onPress={() => campo('envelope')(e.name)} />
          ))}
        </View>
      </View>

      <View style={{ gap: S.sm }}>
        <Label t={t}>Quem paga</Label>
        {/* «Quem marcar»: a despesa fica em nome de quem tocar em «Marcar como
            paga». Com um nome escolhido, fica sempre nesse — a renda sai da
            conta do Tomás, marque quem marcar. */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
          <Choice t={t} label="Quem marcar" selected={!form.quemPaga}
            onPress={() => campo('quemPaga')(null)} />
          {adultos.map(n => (
            <Choice key={n} t={t} label={n} selected={form.quemPaga === n}
              onPress={() => campo('quemPaga')(n)} />
          ))}
        </View>
      </View>
    </>
  );
}
