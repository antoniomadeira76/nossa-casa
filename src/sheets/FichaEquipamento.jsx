import React from 'react';
import { View, Text } from 'react-native';
import { S, R, FONT } from '../theme';
import { EUR, plural, warrantyDaysLeft } from '../format';
import { Label, Row, Empty } from '../ui';
import Icon from '../Icon';
import Sheet from '../Sheet';

// Estado da garantia: a mesma regra de três estados da lista, para a ficha
// e a lista nunca discordarem.
const estado = (t, dias) => {
  if (dias <= 0) return { texto: `Terminou há ${plural(Math.abs(dias), 'dia', 'dias')}`,
    cor: t.state.err, fundo: t.tileErr, tom: t.state.errDeep, rotulo: 'Fora de garantia' };
  if (dias <= 90) return { texto: `Faltam ${plural(dias, 'dia', 'dias')}`,
    cor: t.state.warn, fundo: t.tileWarn, tom: t.state.warnDeep, rotulo: 'A expirar' };
  return { texto: `Faltam ${plural(dias, 'dia', 'dias')}`,
    cor: t.state.ok, fundo: t.state.okBg, tom: t.state.okDeep, rotulo: 'Em garantia' };
};

// A ficha de um equipamento: garantia, compra e manutenção.
export default function FichaEquipamento({ t, equip, onClose }) {
  const dias = warrantyDaysLeft(equip);
  const e = estado(t, dias);

  return (
    <Sheet t={t} title={equip.name} sub={equip.cat} onClose={onClose}
      leading={<Icon name="houseGear" size={26} color={t.slate} />}>

      {/* Garantia */}
      <View style={{ borderRadius: R.card, borderWidth: 1, borderColor: e.cor,
        backgroundColor: e.fundo, padding: 16, gap: S.sm }}>
        <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.slate }}>
          {e.rotulo}
        </Text>
        <Text style={{ fontFamily: FONT.display, fontSize: 24, color: e.tom }}>{e.texto}</Text>
        {equip.warrantyEnd ? (
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
            {dias > 0 ? 'Termina a' : 'Terminou a'} {equip.warrantyEnd}
          </Text>
        ) : null}
      </View>

      {/* Compra */}
      <View>
        <Label t={t}>Compra</Label>
        <View style={{ marginTop: S.sm }}>
          <Row t={t} title="Data" value={equip.bought || '—'} right={<View />} />
          <Row t={t} title="Loja" value={equip.shop || '—'} right={<View />} />
          <Row t={t} title="Preço" value={typeof equip.price === 'number' ? EUR(equip.price) : '—'}
            right={<View />} last />
        </View>
      </View>

      {/* Manutenção */}
      <View>
        <Label t={t}>Manutenção</Label>
        <View style={{ marginTop: S.sm }}>
          {equip.maint ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 }}>
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
          ) : (
            <Empty t={t} icon="refresh" title="Sem manutenção marcada." />
          )}
        </View>
      </View>
    </Sheet>
  );
}
