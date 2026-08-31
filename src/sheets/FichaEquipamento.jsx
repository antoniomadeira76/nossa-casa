import React, { useState } from 'react';
import { View, Text, Pressable, Image, TextInput } from 'react-native';
import CampoData from '../CampoData';
import * as ImagePicker from 'expo-image-picker';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { EUR, plural, warrantyDaysLeft, chaveDeDMY, dmyDeChave, TODAY_KEY } from '../format';
import { Label, Primary } from '../ui';
import Icon from '../Icon';
import Sheet from '../Sheet';
import Confirm from '../Confirm';

// Estado da garantia: a mesma regra de três estados da lista, para a ficha e a
// lista nunca discordarem.
const estado = (t, dias, fim) => {
  if (dias <= 0) return { titulo: 'Fora de Garantia', tom: t.state.errDeep,
    cor: t.state.err, fundo: t.tileErr,
    linha: `Terminou há ${plural(Math.abs(dias), 'dia', 'dias')}${fim ? ` · terminou a ${fim}.` : '.'}` };
  if (dias <= 90) return { titulo: 'Garantia a Expirar', tom: t.state.warnDeep,
    cor: t.state.warn, fundo: t.tileWarn,
    linha: `Faltam ${plural(dias, 'dia', 'dias')}${fim ? ` · termina a ${fim}.` : '.'}` };
  return { titulo: 'Em Garantia', tom: t.state.okDeep,
    cor: t.state.okBorder, fundo: t.state.okBg,
    linha: `Faltam ${plural(dias, 'dia', 'dias')}${fim ? ` · termina a ${fim}.` : '.'}` };
};

// Os dois anexos que um equipamento leva. `campo` é onde a imagem fica guardada.
const ANEXOS = [
  { campo: 'fatura', icone: 'fileDone', titulo: 'Fatura de compra' },
  { campo: 'foto',   icone: 'camera',   titulo: 'Equipamento e n.º de série' },
];

export default function FichaEquipamento({ t, equip, onClose }) {
  const { editEquip, removeEquip } = useStore();
  const [remover, setRemover] = useState(false);
  const [manut, setManut] = useState(null);   // rascunho da manutenção

  const dias = warrantyDaysLeft(equip);
  const e = estado(t, dias, equip.warrantyEnd);

  const escolherImagem = async (campo) => {
    const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!r.canceled && r.assets && r.assets[0]) editEquip(equip.id, { [campo]: r.assets[0].uri });
  };

  // Botão de ação: preenchido para a ação principal, contorno para as outras.
  const Acao = ({ label, icone, onPress, preenchido, perigo, desativado, porque }) => {
    const tom = perigo ? t.state.err : t.accent;
    return (
      <View style={{ gap: 4 }}>
        <Pressable onPress={desativado ? undefined : onPress} accessibilityRole="button"
          accessibilityLabel={label} accessibilityState={{ disabled: !!desativado }}
          style={({ pressed }) => ({
            minHeight: 48, borderRadius: R.card, borderWidth: 1,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S.md,
            backgroundColor: desativado ? t.subtle : preenchido ? t.state.infoBg : t.surface,
            borderColor: desativado ? t.border : preenchido ? t.state.infoBg : tom,
            opacity: pressed ? 0.85 : 1,
          })}>
          <Icon name={icone} size={20} color={desativado ? t.text3 : tom} />
          <Text style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: '700',
            color: desativado ? t.text3 : tom }}>{label}</Text>
        </Pressable>
        {desativado && porque ? (
          <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3, textAlign: 'center' }}>
            {porque}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <>
      <Sheet t={t} title={equip.name} sub={equip.cat} onClose={onClose}
        action={
          <View style={{ gap: S.md }}>
            <Acao preenchido label="Agendar Manutenção" icone="calendar"
              onPress={() => setManut({ maint: equip.maint || '', maintDate: equip.maintDate || '' })} />
            <Acao label="Exportar Fatura" icone="printer"
              desativado={!equip.fatura}
              porque={!equip.fatura ? 'Ainda não há fatura para exportar.' : null}
              onPress={() => {}} />
            <Acao perigo label="Remover Equipamento" icone="trash" onPress={() => setRemover(true)} />
          </View>
        }>

        {/* Garantia */}
        <View style={{ borderRadius: R.card, borderWidth: 1, borderColor: e.cor,
          backgroundColor: e.fundo, padding: 16, gap: S.sm }}>
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.slate }}>
            Garantia
          </Text>
          <Text style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: '500', color: e.tom }}>
            {e.titulo}
          </Text>
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>{e.linha}</Text>
        </View>

        {/* Fotografias */}
        <View>
          <Label t={t}>Fotografias</Label>
          <View style={{ gap: S.md, marginTop: S.sm }}>
            {ANEXOS.map(a => {
              const uri = equip[a.campo];
              return (
                <Pressable key={a.campo} onPress={() => escolherImagem(a.campo)}
                  accessibilityRole="button"
                  accessibilityLabel={`${uri ? 'Substituir' : 'Adicionar'} — ${a.titulo}`}
                  style={({ pressed }) => ({
                    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60,
                    padding: 12, borderRadius: R.card, borderWidth: 1, borderColor: t.border,
                    backgroundColor: pressed ? t.subtle : t.card,
                  })}>
                  <View style={{ width: 40, height: 40, borderRadius: R.row, overflow: 'hidden',
                    backgroundColor: t.subtle, borderWidth: 1, borderColor: t.border,
                    alignItems: 'center', justifyContent: 'center' }}>
                    {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
                         : <Icon name={a.icone} size={20} color={t.text3} />}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>{a.titulo}</Text>
                    <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
                      {uri ? 'Guardada' : 'Por adicionar'}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.accent }}>
                    {uri ? 'Substituir' : 'Adicionar'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Compra */}
        <View style={{ borderRadius: R.card, backgroundColor: t.subtle, paddingHorizontal: 14 }}>
          {/* Duas linhas, como na referência. A loja fica de fora de propósito. */}
          {[['Preço de compra', typeof equip.price === 'number' ? EUR(equip.price) : '—'],
            ['Data de compra', equip.bought || '—']].map(([k, v], i, arr) => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48,
              borderBottomWidth: i === arr.length - 1 ? 0 : 1, borderBottomColor: t.divider }}>
              <Text style={{ flex: 1, fontFamily: FONT.ui, fontSize: 13, color: t.text3 }}>{k}</Text>
              <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 13.5, fontWeight: '600', color: t.text2 }}>{v}</Text>
            </View>
          ))}
        </View>

        {/* Manutenção marcada, se houver */}
        {equip.maint ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="refresh" size={20} color={t.slate} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>{equip.maint}</Text>
              {equip.maintDate ? (
                <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
                  a fazer até {equip.maintDate}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}
      </Sheet>

      {/* Agendar manutenção */}
      {manut ? (
        <Sheet t={t} title="Agendar Manutenção" sub={equip.name} onClose={() => setManut(null)}
          action={<Primary t={t} label="Guardar" disabled={!manut.maint.trim()}
            onPress={() => { editEquip(equip.id, manut); setManut(null); }} />}>
          <View style={{ gap: S.sm }}>
            <Label t={t}>O que é preciso fazer</Label>
            <TextInput value={manut.maint}
              onChangeText={(v) => setManut(m => ({ ...m, maint: v }))}
              placeholder="Ex: Revisão anual obrigatória" placeholderTextColor={t.text3}
              style={{ minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body, fontSize: 15,
                color: t.text2, borderRadius: R.row, borderWidth: 1, borderColor: t.border,
                backgroundColor: t.card }} />
          </View>
          <View style={{ gap: S.sm }}>
            <Label t={t}>A fazer até</Label>
            {/* Uma manutenção é no futuro. */}
            <CampoData t={t} valor={chaveDeDMY(manut.maintDate)} minimo={TODAY_KEY}
              onChange={(k) => setManut(m => ({ ...m, maintDate: dmyDeChave(k) }))} />
          </View>
        </Sheet>
      ) : null}

      {/* Remover — não se desfaz, portanto confirma-se */}
      {remover ? (
        <Confirm t={t} destructive icon="trash"
          title="Remover equipamento?"
          message={`${equip.name} sai da lista, e com ele a garantia e a manutenção que lhe estão marcadas.`}
          confirmLabel="Remover"
          onCancel={() => setRemover(false)}
          onConfirm={() => { removeEquip(equip.id); setRemover(false); onClose(); }} />
      ) : null}
    </>
  );
}
