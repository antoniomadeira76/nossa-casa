import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useStore } from '../store';
import { S, FONT } from '../theme';
import { Primary } from '../ui';
import { useAcaoDaFolha } from '../Sheet';
import CamposContrato from './CamposContrato';

/**
 * Acrescentar um contrato — o seguro do carro, a internet, a inspeção.
 *
 * O documento (a apólice, o contrato assinado) junta-se depois, na ficha: a
 * folha de criar pede o que se sabe de cor, e a fotografia pede-se quando se
 * tem o papel à frente. 12/09/2026 — a quinta das dez funcionalidades.
 */
export default function NovoContrato({ t, onClose }) {
  const { criarContrato } = useStore();
  const [form, setForm] = useState({ nome: '', fornecedor: '', renovaEm: '', fidelizacaoAte: '', responsavel: null });
  const [erro, setErro] = useState(null);

  const nome = form.nome.trim();
  const guardar = () => {
    const r = criarContrato(form);
    if (typeof r === 'string') { setErro(r); return; }
    onClose();
  };

  return (
    <View style={{ gap: S.lg }}>
      <CamposContrato t={t} form={form} onChange={(f) => { setErro(null); setForm(f); }} />

      {erro ? (
        <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, lineHeight: 19, color: t.state.errTexto }}>
          {erro}
        </Text>
      ) : null}

      {/* O botão principal vai para o rodapé FIXO da folha (`useAcaoDaFolha`,
          14/09/2026): estava no fim do conteúdo, só visível depois de rolar. */}
      {useAcaoDaFolha(<Primary comum t={t} label="Acrescentar contrato"
        sub={!nome ? 'Escreva o nome do contrato'
          : form.renovaEm ? `Avisa 30 dias antes de ${form.renovaEm}`
            : 'Sem data de renovação, não há aviso'}
        disabled={!nome} onPress={guardar} />)}
    </View>
  );
}
