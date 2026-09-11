import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { Label, Primary, Tile } from '../ui';

// Um prato novo para a ementa: o nome e os ingredientes, um por linha.
//
// ── Porque não há corredor por ingrediente aqui ─────────────────────────────
//
// Escolher um corredor para cada uma de oito linhas numa folha é oito vezes o
// mesmo gesto. O corredor decide-se sozinho: se a casa já teve um artigo com
// esse nome, é o corredor dele; senão é o primeiro. Quando o ingrediente entra
// na lista é um artigo normal, e o lápis dele muda o corredor como a qualquer
// outro. (11/09/2026 — a terceira das dez funcionalidades.)
export default function NovoPrato({ t, onClose, onCriado }) {
  const { criarPrato, allItems, seccoes } = useStore();
  const [nome, setNome] = useState('');
  const [linhas, setLinhas] = useState('');
  const [erro, setErro] = useState(null);

  const ingredientes = linhas.split('\n').map(l => l.trim()).filter(Boolean);
  const pronto = nome.trim() && ingredientes.length > 0;

  // O corredor de um ingrediente: o do artigo com o mesmo nome, se a casa já o
  // teve; senão o primeiro.
  const corredorDe = (rotulo) => {
    const chave = rotulo.toLowerCase();
    const igual = allItems().find(i => String(i.label || '').toLowerCase() === chave);
    return igual ? igual.s : (seccoes[0] || null);
  };

  const guardar = () => {
    const r = criarPrato(nome, ingredientes.map(rotulo => ({ rotulo, s: corredorDe(rotulo) })));
    if (typeof r === 'string') { setErro(r); return; }
    onCriado(r.id);
  };

  const campo = {
    minHeight: 44, paddingHorizontal: S.md, paddingVertical: S.md, fontFamily: FONT.body, fontSize: 15,
    color: t.text1, borderRadius: R.row, borderWidth: 1, borderColor: t.border, backgroundColor: t.card,
  };

  return (
    <View style={{ gap: S.lg }}>
      <View style={{ gap: S.sm }}>
        <Label t={t}>Prato</Label>
        <TextInput value={nome} onChangeText={(v) => { setErro(null); setNome(v); }} maxLength={60}
          placeholder="Ex: Frango no forno" placeholderTextColor={t.text3}
          accessibilityLabel="Nome do prato" style={campo} />
      </View>
      <View style={{ gap: S.sm }}>
        <Label t={t}>Ingredientes, um por linha</Label>
        <TextInput value={linhas} onChangeText={(v) => { setErro(null); setLinhas(v); }} multiline
          numberOfLines={5} textAlignVertical="top"
          placeholder={'Frango inteiro\nBatata · 2 kg\nLimão'} placeholderTextColor={t.text3}
          accessibilityLabel="Ingredientes, um por linha" style={{ ...campo, minHeight: 120 }} />
        <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
          {ingredientes.length
            ? `${ingredientes.length} ${ingredientes.length === 1 ? 'ingrediente' : 'ingredientes'}. O corredor de cada um decide-se pelo que a casa já comprou; muda-se depois, no lápis do artigo.`
            : 'O corredor de cada ingrediente decide-se pelo que a casa já comprou.'}
        </Text>
      </View>
      {erro ? <Tile t={t} kind="warn">{erro}</Tile> : null}
      <Primary comum t={t} label="Guardar prato" disabled={!pronto} onPress={guardar} />
    </View>
  );
}
