import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { Label, Primary } from '../ui';
import { useAcaoDaFolha } from '../Sheet';
import Icon from '../Icon';
import { EUR, dmyDeChave } from '../format';
import { estadoDaConta } from '../contas-fixas';
import CamposContaFixa from './CamposContaFixa';

/**
 * Gerir uma conta fixa: marcar como paga, alterar, apagar.
 *
 * ── A ordem das secções é a ordem do uso ─────────────────────────────────────
 *
 * Pagar vem primeiro porque é o que se faz todos os meses; alterar o valor é
 * raro (a renda sobe uma vez por ano), e apagar é uma vez na vida. O apagar
 * fica em baixo, separado por uma linha — é a ordem da folha das metas.
 *
 * ⚠ «Marcar como paga» regista uma despesa NORMAL no envelope da conta, em
 * nome de quem paga. Não há um campo «paga» a escrever (INVARIANTE #2): o
 * estado é a despesa deste mês existir, e a segunda do mês colide no servidor.
 * Por isso o botão desliga-se depois de paga — não há segunda vez a dar.
 *
 * `conta` vem de `contasDoMes()`: traz `paga`, `vence` e `dias`.
 */
export default function GerirContaFixa({ t, conta, user, onApagar, onClose }) {
  const { alterarContaFixa, pagarContaFixa } = useStore();
  const [form, setForm] = useState({
    nome: conta.nome, valor: conta.valor, dia: conta.dia,
    envelope: conta.envelope, quemPaga: conta.quemPaga || null,
  });
  const [erro, setErro] = useState(null);

  const estado = estadoDaConta(conta);
  const pagador = conta.quemPaga || user;
  const mudou = form.nome.trim() !== conta.nome
    || Number(form.valor) !== Number(conta.valor)
    || Number(form.dia) !== Number(conta.dia)
    || form.envelope !== conta.envelope
    || (form.quemPaga || null) !== (conta.quemPaga || null);

  const pagar = () => {
    const msg = pagarContaFixa(conta.id, user);
    if (msg) { setErro(msg); return; }
    onClose();
  };

  const guardar = () => {
    const msg = alterarContaFixa(conta.id, form);
    if (msg) { setErro(msg); return; }
    onClose();
  };

  return (
    <View style={{ gap: S.lg }}>
      {/* ── Este mês ─────────────────────────────────────────────────────── */}
      <View style={{ gap: S.sm }}>
        <Label t={t}>Este mês</Label>
        <Text style={{ fontFamily: FONT.body, fontSize: 14.5, lineHeight: 21, color: t.text2 }}>
          {conta.paga
            ? 'Paga. A despesa já está no envelope.'
            : `Vence a ${dmyDeChave(conta.vence)}${estado ? ` · ${estado.texto}` : ''}.`}
        </Text>
        {/* Botão comum: acrescenta uma despesa, não fecha nem apaga nada. */}
        <Primary comum t={t}
          label={conta.paga ? 'Paga este mês' : 'Marcar como paga'}
          sub={conta.paga ? 'Volta a poder marcar-se no mês que vem'
            : `${EUR(conta.valor)} em ${conta.envelope} · ${pagador} paga`}
          disabled={conta.paga}
          onPress={pagar} />
      </View>

      {/* ── Alterar ──────────────────────────────────────────────────────── */}
      <CamposContaFixa t={t} form={form} onChange={(f) => { setErro(null); setForm(f); }} />

      {erro ? (
        <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, lineHeight: 19, color: t.state.errTexto }}>
          {erro}
        </Text>
      ) : null}

      {/* O que já foi pago não muda: as despesas dos meses passados ficam com
          o valor que tinham. Mudar a conta muda os meses que vêm. */}
      {/* O botão principal vai para o rodapé FIXO da folha (`useAcaoDaFolha`,
          14/09/2026): estava no fim do conteúdo, só visível depois de rolar. */}
      {useAcaoDaFolha(<Primary comum t={t} label="Guardar alterações"
        sub={!form.nome.trim() ? 'Escreva o nome da conta'
          : !mudou ? 'Nada mudou'
            : 'Vale a partir de agora; o que já foi pago fica como está'}
        disabled={!form.nome.trim() || !mudou} onPress={guardar} />)}

      {/* ── Apagar ─────────────────────────────────────────────────────────
          Em baixo, depois de tudo o que se ajusta, e separado por uma linha. */}
      <View style={{ height: 1, backgroundColor: t.divider }} />
      <Pressable onPress={onApagar}
        accessibilityRole="button" accessibilityLabel={`Apagar a conta ${conta.nome}`}
        style={{ minHeight: 44, borderRadius: R.row, borderWidth: 1, borderColor: t.state.err,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Icon name="trash" size={18} color={t.state.errTexto} />
        <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '500', color: t.state.errTexto }}>
          Apagar conta
        </Text>
      </Pressable>
    </View>
  );
}
