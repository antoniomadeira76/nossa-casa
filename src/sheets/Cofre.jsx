import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT, corDoMembro } from '../theme';
import { EUR, WD, plural } from '../format';
import { SectionTitle, Avatar, Empty, avatarDe } from '../ui';
import Icon from '../Icon';
import Sheet from '../Sheet';

// Cada tipo de movimento tem o seu ícone, e nenhum é reaproveitado:
// smile é o bónus da criança, e só isso.
const KIND = {
  semanada: { icon: 'checkCircle', tone: 'ok' },
  bonus:    { icon: 'smile',       tone: 'ok' },
  retirada: { icon: 'closeCircle', tone: 'err' },
};

function Movimento({ t, m }) {
  const { icon, tone } = KIND[m.kind] || KIND.semanada;
  const up = m.delta >= 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52,
      paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: t.divider }}>
      <Icon name={icon} size={22} color={up ? t.state.okDeep : t.state.errDeep} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>{m.label}</Text>
        {m.sub ? (
          <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>{m.sub}</Text>
        ) : null}
      </View>
      <Text style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: '600',
        color: up ? t.state.okDeep : t.state.errDeep }}>
        {up ? '+' : '−'} {EUR(Math.abs(m.delta))}
      </Text>
    </View>
  );
}

// O cofre de uma criança, como o adulto o vê: saldo, as parcelas que o
// compõem, e as duas ações que acrescentam parcelas novas.
export default function Cofre({ t, kid, onClose }) {
  const st = useStore();
  const { s, vaultOf, vaultMoves, vaultAdd, kidPts } = st;

  const saldo = vaultOf(kid);
  const moves = vaultMoves(kid);
  const pts = (kidPts[kid] ?? 0) - (s.paidPts[kid] ?? 0);
  const porPagar = pts * s.pointValue;
  const bonus = 1;

  const pagarSemanada = () => {
    if (porPagar <= 0) return;
    vaultAdd(kid, porPagar, 'semanada', 'Semanada desta semana', `${plural(pts, 'ponto', 'pontos')}`);
    st.set(x => ({ paidPts: { ...x.paidPts, [kid]: (x.paidPts[kid] ?? 0) + pts } }));
  };

  const darBonus = () => vaultAdd(kid, bonus, 'bonus', 'Bónus', 'atribuído por si');

  const Acao = ({ label, icon, onPress, disabled, filled }) => (
    <Pressable onPress={disabled ? undefined : onPress} accessibilityRole="button"
      accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => ({
        minHeight: 48, borderRadius: R.card, borderWidth: 1,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S.md,
        backgroundColor: disabled ? t.subtle : filled ? t.state.infoBg : t.surface,
        borderColor: disabled ? t.border : filled ? t.state.infoBg : t.border,
        opacity: pressed ? 0.85 : 1,
      })}>
      {icon ? <Icon name={icon} size={20} color={disabled ? t.text3 : t.accent} /> : null}
      <Text style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: '700',
        color: disabled ? t.text3 : t.accent }}>{label}</Text>
    </Pressable>
  );

  return (
    <Sheet t={t} onClose={onClose}
      title={`Cofre ${st.deNome(kid)} ${kid}`}
      sub={`1 pt = ${EUR(s.pointValue)} · pago ${WD[s.payDay].toLowerCase()}s`}
      leading={<Avatar {...avatarDe(kid, st.membros[kid], t.text3)} size={40} />}
      action={
        <View style={{ gap: S.md }}>
          <Acao filled label={`Pagar Semanada · ${EUR(porPagar)}`}
            onPress={pagarSemanada} disabled={porPagar <= 0} />
          <Acao label={`Dar Bónus de ${EUR(bonus)}`} icon="smile" onPress={darBonus} />
        </View>
      }>

      {/* Saldo */}
      <View style={{ borderRadius: R.card, borderWidth: 1, borderColor: t.state.okBorder,
        backgroundColor: t.state.okBg, padding: 16, gap: S.sm }}>
        <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.slate }}>
          Saldo no cofre
        </Text>
        <Text style={{ fontFamily: FONT.display, fontSize: 32, color: t.text1 }}>{EUR(saldo)}</Text>
        <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
          {porPagar > 0
            ? `Mais ${EUR(porPagar)} por pagar desta semana (${plural(pts, 'pt', 'pt')}).`
            : 'Não há pontos por pagar esta semana.'}
        </Text>
      </View>

      {/* Movimentos */}
      <View>
        <SectionTitle t={t}>Movimentos</SectionTitle>
        {moves.length === 0 ? (
          <Empty t={t} icon="wallet" title="Ainda sem movimentos."
            hint="Pagar a semanada ou dar um bónus acrescenta o primeiro." />
        ) : (
          <View>{moves.map(m => <Movimento key={m.id} t={t} m={m} />)}</View>
        )}
      </View>
    </Sheet>
  );
}
