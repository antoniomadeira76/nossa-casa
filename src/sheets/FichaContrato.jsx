import React, { useState } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { Label, Primary, Pill } from '../ui';
import Icon from '../Icon';
import Sheet from '../Sheet';
import Confirm from '../Confirm';
import { estadoDoContrato, linhaDoContrato } from '../contratos';
import CamposContrato from './CamposContrato';

/**
 * A ficha de um contrato: o estado da renovação, o documento, os campos, e
 * remover — a mesma ficha dos equipamentos, com os dados de um contrato.
 *
 * ⚠ O documento e os campos são duas escritas à MESMA linha do servidor, e
 * por isso vão por dois botões: escolher a imagem escreve só o ficheiro;
 * «Guardar alterações» escreve só os campos. Duas no mesmo tique é a classe
 * 27 — a primeira perdia-se em silêncio.
 *
 * `contrato` vem de `contratosDaCasa()`: traz `dias` e `diasFidelizacao`.
 */
export default function FichaContrato({ t, contrato, onClose }) {
  const { alterarContrato, apagarContrato } = useStore();
  const [form, setForm] = useState({
    nome: contrato.nome || '', fornecedor: contrato.fornecedor || '',
    renovaEm: contrato.renovaEm || '', fidelizacaoAte: contrato.fidelizacaoAte || '',
    responsavel: contrato.responsavel || null,
  });
  const [erro, setErro] = useState(null);
  const [remover, setRemover] = useState(false);

  const estado = estadoDoContrato(contrato);
  const imagem = contrato.ficheiroLocal || contrato.ficheiro || null;
  const mudou = form.nome.trim() !== (contrato.nome || '')
    || form.fornecedor.trim() !== (contrato.fornecedor || '')
    || form.renovaEm !== (contrato.renovaEm || '')
    || form.fidelizacaoAte !== (contrato.fidelizacaoAte || '')
    || (form.responsavel || null) !== (contrato.responsavel || null);

  // O mesmo caminho que a fatura de um equipamento e o anexo de saúde usam,
  // para não haver dois modos de escolher uma imagem nesta app.
  const escolherDocumento = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!r.canceled && r.assets && r.assets[0]) {
      const msg = alterarContrato(contrato.id, { ficheiro: r.assets[0].uri });
      if (msg) setErro(msg);
    }
  };

  const guardar = () => {
    const msg = alterarContrato(contrato.id, form);
    if (msg) { setErro(msg); return; }
    onClose();
  };

  // O tom da caixa do estado: os três papéis de cada estado (CLAUDE.md). O
  // `err` e o `ok` são tintas com alfa e levam `xTexto`; o `warn` é o tijolo
  // opaco e leva `warnDeep`.
  const caixa = !estado
    ? { cor: t.state.okBorder, fundo: t.state.okBg, texto: t.state.okTexto,
        titulo: contrato.renovaEm ? 'Em dia' : 'Sem data de renovação' }
    : estado.tom === 'err'
      ? { cor: t.state.err, fundo: t.state.errBg, texto: t.state.errTexto, titulo: 'Renovação passada' }
      : { cor: t.state.warn, fundo: t.state.warnBg, texto: t.state.warnDeep, titulo: 'Renova em breve' };

  return (
    <>
      <Sheet t={t} title={contrato.nome} sub={contrato.fornecedor || 'Contrato'} onClose={onClose}
        action={
          <Pressable onPress={() => setRemover(true)} accessibilityRole="button"
            accessibilityLabel={`Remover o contrato ${contrato.nome}`}
            style={({ pressed }) => ({
              minHeight: 48, borderRadius: R.row, borderWidth: 1, borderColor: t.state.err,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S.md,
              backgroundColor: t.surface, opacity: pressed ? 0.85 : 1,
            })}>
            <Icon name="trash" size={20} color={t.state.err} />
            <Text style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: '700', color: t.state.errTexto }}>
              Remover Contrato
            </Text>
          </Pressable>
        }>

        {/* ── A renovação ─────────────────────────────────────────────── */}
        <View style={{ borderRadius: R.card, borderWidth: 1, borderColor: caixa.cor,
          backgroundColor: caixa.fundo, padding: 16, gap: S.sm }}>
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.slate }}>
            Renovação
          </Text>
          <Text style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: '500', color: caixa.texto }}>
            {caixa.titulo}
          </Text>
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
            {linhaDoContrato(contrato) || 'Sem datas nem responsável.'}
            {estado ? ` · ${estado.texto}` : ''}
          </Text>
        </View>

        {/* ── O documento ─────────────────────────────────────────────── */}
        <View>
          <Label t={t}>Documento</Label>
          <Pressable onPress={escolherDocumento} accessibilityRole="button"
            accessibilityLabel={`${imagem ? 'Substituir' : 'Adicionar'} — Documento do contrato`}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, marginTop: S.sm,
              padding: 12, borderRadius: R.row, borderWidth: 1, borderColor: t.border,
              backgroundColor: pressed ? t.subtle : t.card,
            })}>
            <View style={{ width: 40, height: 40, borderRadius: R.row, overflow: 'hidden',
              backgroundColor: t.subtle, borderWidth: 1, borderColor: t.border,
              alignItems: 'center', justifyContent: 'center' }}>
              {imagem ? <Image source={{ uri: imagem }} style={{ width: '100%', height: '100%' }} />
                      : <Icon name="fileText" size={20} color={t.text3} />}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>A apólice ou o contrato</Text>
              <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
                {imagem ? 'Guardado' : 'Por adicionar'}
              </Text>
            </View>
            {/* Um documento que ainda só existe neste telemóvel diz «só aqui»,
                em vez de parecer guardado em casa — como o anexo de saúde. */}
            {imagem && contrato.porSubir ? (
              <Pill label="só aqui" fg={t.state.warnDeep} bg={t.state.warnBg} border={t.state.warn} />
            ) : null}
            <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.actFg }}>
              {imagem ? 'Substituir' : 'Adicionar'}
            </Text>
          </Pressable>
        </View>

        {/* ── Alterar ─────────────────────────────────────────────────── */}
        <CamposContrato t={t} form={form} onChange={(f) => { setErro(null); setForm(f); }} />

        {erro ? (
          <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, lineHeight: 19, color: t.state.errTexto }}>
            {erro}
          </Text>
        ) : null}

        <Primary comum t={t} label="Guardar alterações"
          sub={!form.nome.trim() ? 'Escreva o nome do contrato' : !mudou ? 'Nada mudou' : 'O contrato fica como escreveu'}
          disabled={!form.nome.trim() || !mudou} onPress={guardar} />
      </Sheet>

      {remover ? (
        <Confirm t={t} destructive icon="trash"
          title={`Remover «${contrato.nome}»?`}
          message="O contrato sai da lista, e com ele o documento e o aviso de renovação. Não se desfaz."
          confirmLabel="Remover"
          onCancel={() => setRemover(false)}
          onConfirm={() => { apagarContrato(contrato.id); setRemover(false); onClose(); }} />
      ) : null}
    </>
  );
}
