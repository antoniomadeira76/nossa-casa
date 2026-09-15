import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { EUR, WD, plural } from '../format';
import { SectionTitle, Avatar, Empty, avatarDe, NumField, Primary, Label } from '../ui';
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
      <Icon name={icon} size={22} color={up ? t.state.okTexto : t.state.errTexto} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>{m.label}</Text>
        {m.sub ? (
          <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>{m.sub}</Text>
        ) : null}
      </View>
      <Text style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: '600',
        color: up ? t.state.okTexto : t.state.errTexto }}>
        {up ? '+' : '−'} {EUR(Math.abs(m.delta))}
      </Text>
    </View>
  );
}

// O cofre de uma criança, como o adulto o vê: saldo, as parcelas que o
// compõem, e as duas ações que acrescentam parcelas novas.
export default function Cofre({ t, kid, onClose }) {
  const st = useStore();
  const { s, vaultOf, vaultMoves, vaultAdd, kidPts, pontosNasTarefas } = st;

  const saldo = vaultOf(kid);
  const moves = vaultMoves(kid);
  const pts = (kidPts[kid] ?? 0) - (s.paidPts[kid] ?? 0);
  const porPagar = pts * s.pointValue;
  // ⚠ O bónus era 1,00 € fixo, escrito no botão (15/09/2026: «dar bónus tem de
  // ser um campo em que se pode pôr o valor»). Agora é o campo de número da
  // app, com o botão a dizer o que acontece — a mesma forma do reforço de uma
  // meta, que é a outra coisa nesta app que acrescenta dinheiro a uma conta.
  const [bonus, setBonus] = useState(1);

  // ⚠ Os pontos pagos vão NO movimento, e não num campo à parte.
  //
  // Isto era `vaultAdd(...)` seguido de `paidPts[kid] += pts` — um saldo
  // escrito neste telefone. A linha do cofre chegava ao outro adulto e o
  // `paidPts` não: o ecrã dele continuava a dizer que havia pontos por pagar, e
  // a semanada era paga duas vezes. Ver `provar-pontos-pagos.mjs`.
  const pagarSemanada = () => {
    if (porPagar <= 0) return;
    vaultAdd(kid, porPagar, 'semanada', 'Semanada desta semana',
      `${plural(pts, 'ponto', 'pontos')}`, undefined, pts);
  };

  const darBonus = () => {
    if (!(bonus > 0)) return;
    vaultAdd(kid, bonus, 'bonus', 'Bónus', 'atribuído por si');
  };
  // O botão do bónus. No RODAPÉ leva a consequência dentro dele; na linha do
  // campo é curto, porque a consequência fica na legenda por baixo.
  const botaoDoBonus = (
    <Primary comum t={t} label={`Dar ${EUR(bonus)} de bónus`}
      sub={bonus > 0 ? `O cofre fica com ${EUR(saldo + bonus)}` : 'Escreva um valor acima de zero'}
      disabled={!(bonus > 0)} onPress={darBonus} />
  );

  const Acao = ({ label, icon, onPress, disabled, filled }) => (
    <Pressable onPress={disabled ? undefined : onPress} disabled={!!disabled} accessibilityRole="button"
      accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => ({
        minHeight: 48, borderRadius: R.row, borderWidth: 1,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S.md,
        // ⚠ `actBg`/`actBrd`, os tokens do botão comum — e não o `infoBg`, um
        // tijolo OPACO e claro nos dois aspetos: no escuro «Pagar Semanada» em
        // `actFg` clareado por cima dele dava 2,23 (09/09/2026).
        backgroundColor: disabled ? t.subtle : filled ? t.actBg : t.surface,
        borderColor: disabled ? t.border : filled ? t.actBrd : t.border,
        opacity: pressed ? 0.85 : 1,
      })}>
      {icon ? <Icon name={icon} size={20} color={disabled ? t.text3 : t.accent} /> : null}
      <Text style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: '700',
        color: disabled ? t.text3 : t.actFg }}>{label}</Text>
    </Pressable>
  );

  return (
    <Sheet t={t} onClose={onClose}
      title={`Cofre ${st.deNome(kid)} ${kid}`}
      // ⚠ Sem pontos não há câmbio a anunciar, e a 0 € o câmbio não diz
      // nada. Um cofre sem semanada continua a ser um cofre: os bónus não são
      // pontos, e é por isso que esta folha não desaparece toda.
      sub={!pontosNasTarefas ? 'Bónus e movimentos'
        : s.pointValue > 0 ? `1 pt = ${EUR(s.pointValue)} · pago ${WD[s.payDay].toLowerCase()}s`
        : `Pontos sem valor em euros · pago ${WD[s.payDay].toLowerCase()}s`}
      leading={<Avatar {...avatarDe(kid, st.membros[kid], t.text3)} size={40} />}
      action={
        <View style={{ gap: S.md }}>
          {/* ⚠ Sem nada por pagar, o botão DIZ isso — não mostra um valor.
              Mostrava `EUR(porPagar)` cru, e `porPagar` pode ser NEGATIVO:
              basta terem sido pagos mais pontos do que os que estão
              confirmados, o que acontece quando uma confirmação é retirada
              depois de a semanada sair. O cofre dizia «Pagar Semanada ·
              −1,00 €» — o botão desactivado, portanto nada rebentava, e um
              número impossível num ecrã de dinheiro à espera de que alguém
              reparasse. Foi assim que se viu, a olhar. */}
          {/* Com pontos, a ação do rodapé é pagar a semanada; sem eles, o
              cofre só tem uma ação — dar o bónus —, e é essa que fica aqui. O
              campo do valor está no corpo, nos dois casos. */}
          {pontosNasTarefas ? (
            <Acao filled
              label={porPagar > 0 ? `Pagar semanada · ${EUR(porPagar)}` : 'Nada por pagar'}
              onPress={pagarSemanada} disabled={porPagar <= 0} />
          ) : botaoDoBonus}
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

      {/* ── Dar um bónus ───────────────────────────────────────────────────
          O valor escreve-se; o botão diz em quanto fica o cofre. O ícone do
          bónus é o `smile`, e é só dele nesta app — vive na linha do movimento
          que isto cria. */}
      <View style={{ gap: S.sm }}>
        <SectionTitle t={t}>Dar um Bónus</SectionTitle>
        {/* ⚠ O valor e o botão na MESMA linha (opção A de
            `design/campo-de-valor.dc.html`): a caixa tinha 251 px para quatro
            caracteres, e o botão vinha por baixo — 126 px de altura para dizer
            «1 €». A caixa passa a ter a largura do que lá cabe, e a
            consequência desce para a legenda. */}
        <View style={{ flexDirection: 'row', gap: S.md, alignItems: 'center' }}>
          <NumField t={t} estreito value={bonus} step={0.5} min={0} max={999}
            rotulo="Valor do bónus em euros" onChange={setBonus} />
          {pontosNasTarefas ? (
            <View style={{ flex: 1, minWidth: 0 }}>
              <Primary comum t={t} label="Dar bónus"
                disabled={!(bonus > 0)} onPress={darBonus} />
            </View>
          ) : null}
        </View>
        <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
          {bonus > 0 ? `O cofre fica com ${EUR(saldo + bonus)}. ` : ''}
          Um bónus não são pontos: entra como uma parcela à parte e não mexe na semanada.
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
