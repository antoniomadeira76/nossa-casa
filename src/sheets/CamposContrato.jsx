import React from 'react';
import { View, Text, TextInput } from 'react-native';
import CampoData from '../CampoData';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { Label } from '../ui';
import { EscolherPessoa } from '../FiltroDeMembros';
import { chaveDeDMY, dmyDeChave } from '../format';

/**
 * Os campos de um contrato — nome, fornecedor, quando renova, fidelização até,
 * quem trata. Partilhados pela folha de criar e pela ficha, como os da conta
 * fixa: cinco campos escritos uma vez.
 *
 * `form` é `{ nome, fornecedor, renovaEm, fidelizacaoAte, responsavel }`, com as
 * datas em `dd/mm/aaaa` — a forma em que a loja e o servidor as trocam. A
 * validação é da loja (`validarContrato`); o ecrã mostra a frase que ela devolver.
 */
export default function CamposContrato({ t, form, onChange }) {
  const { adultos, membros: MEMBROS } = useStore();
  const muda = (k) => (v) => onChange({ ...form, [k]: v });
  // `campo`, com os 44 px: é o nome que o guarda `todo-campo-tem-44` reconhece
  // como estilo partilhado de um `<TextInput>`, o mesmo da Gestão.
  const campo = {
    minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body,
    fontSize: 15, color: t.text2, borderRadius: R.row, borderWidth: 1,
    borderColor: t.border, backgroundColor: t.card,
  };

  return (
    <>
      <View style={{ gap: S.sm }}>
        <Label t={t}>Contrato</Label>
        <TextInput accessibilityLabel="Nome do contrato"
          value={form.nome} onChangeText={muda('nome')}
          placeholder="Ex: Seguro do carro, Internet, Inspeção"
          placeholderTextColor={t.text3} maxLength={60} style={campo} />
      </View>

      <View style={{ gap: S.sm }}>
        <Label t={t}>Fornecedor (opcional)</Label>
        <TextInput accessibilityLabel="Fornecedor"
          value={form.fornecedor} onChangeText={muda('fornecedor')}
          placeholder="Ex: Fidelidade, MEO"
          placeholderTextColor={t.text3} maxLength={60} style={campo} />
      </View>

      {/* As duas datas, lado a lado: são a mesma pergunta — até quando —, e
          eram dois blocos de largura inteira (15/09/2026, opção E de
          `design/formularios-das-folhas.dc.html`). */}
      <View style={{ flexDirection: 'row', gap: S.md, alignItems: 'flex-start' }}>
        <View style={{ flex: 1, minWidth: 0, gap: S.sm }}>
          <Label t={t}>Renova a</Label>
          {/* Sem mínimo: um contrato cuja renovação já passou é precisamente o
              que se quer ver a vermelho, e não uma data que a app recusa. */}
          <CampoData t={t} valor={chaveDeDMY(form.renovaEm)}
            onChange={(k) => muda('renovaEm')(dmyDeChave(k))} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: S.sm }}>
          <Label t={t}>Fidelização até</Label>
          <CampoData t={t} valor={chaveDeDMY(form.fidelizacaoAte)}
            onChange={(k) => muda('fidelizacaoAte')(dmyDeChave(k))} />
        </View>
      </View>
      <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3, marginTop: -S.md }}>
        As duas datas são opcionais.
      </Text>

      <View style={{ gap: S.sm }}>
        <Label t={t}>Quem trata</Label>
        {/* A bola de cada pessoa, como nos filtros (15/09/2026); «A casa» é
            a pastilha de texto, como o «Todos». */}
        <EscolherPessoa t={t} membros={adultos} valor={form.responsavel || null} MEMBERS={MEMBROS}
          opcional="A casa" onEscolher={(n) => muda('responsavel')(n)} />
      </View>
    </>
  );
}
