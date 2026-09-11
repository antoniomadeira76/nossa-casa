import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useStore } from '../store';
import { S, FONT } from '../theme';
import { Primary } from '../ui';
import { EUR } from '../format';
import CamposContaFixa from './CamposContaFixa';

/**
 * Criar uma conta fixa — a renda, a luz, a internet.
 *
 * A conta nasce POR PAGAR: só a definição fica aqui. Marcar como paga, no
 * Dinheiro ou na folha da conta, é o que regista a despesa do mês no envelope
 * (INVARIANTE #2 — «paga» é uma despesa que existe, não um campo).
 *
 * 12/09/2026 — a quarta das dez funcionalidades.
 */
export default function NovaContaFixa({ t, onClose }) {
  const { criarContaFixa, envelopes } = useStore();
  const [form, setForm] = useState({
    nome: '', valor: 50, dia: 1,
    // O primeiro envelope da casa já escolhido — a escolha que a app faria em
    // silêncio vê-se, e muda-se (a lição do corredor do artigo novo).
    envelope: envelopes.length ? envelopes[0].name : null,
    quemPaga: null,
  });
  const [erro, setErro] = useState(null);

  const nome = form.nome.trim();
  const pronto = !!nome && form.valor > 0 && !!form.envelope;
  const guardar = () => {
    const r = criarContaFixa(form);
    if (typeof r === 'string') { setErro(r); return; }
    onClose();
  };

  return (
    <View style={{ gap: S.lg }}>
      <CamposContaFixa t={t} form={form} onChange={(f) => { setErro(null); setForm(f); }} />

      {erro ? (
        <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, lineHeight: 19, color: t.state.errTexto }}>
          {erro}
        </Text>
      ) : null}

      {/* A consequência dita no botão: a conta entra por pagar, e é o «Marcar
          como paga» de cada mês que põe a despesa no envelope. */}
      <Primary comum t={t} label="Criar conta fixa"
        sub={!nome ? 'Escreva o nome da conta'
          : !(form.valor > 0) ? 'Escreva o valor'
            : !form.envelope ? 'Escolha um envelope'
              : `${EUR(form.valor)} todo o dia ${form.dia} · entra por pagar`}
        disabled={!pronto}
        onPress={guardar} />
    </View>
  );
}
