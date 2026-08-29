import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT, MEMBER_COLOR } from '../theme';
import { EUR, warrantyDaysLeft } from '../format';
import { ENV_BASE, GOALS, EQUIP, MEMBERS } from '../data';
import { Card, SectionTitle, Label, Pill, Row, Bar, Primary, AddButton, Segmented, Toggle, Empty, usePaged, Pager, Tap } from '../ui';
import Icon from '../Icon';
import Sheet from '../Sheet';

// Campo de valor: toque para escrever, −/+ para ajustar. O mesmo controlo
// serve rendimento, limites, valor do ponto e despesas.
export function NumField({ t, value, onChange, step = 5, min = 0, max = 99999, suffix = true }) {
  const [txt, setTxt] = useState(null);
  const commit = () => {
    if (txt === null) return;
    const v = Number(String(txt).replace(',', '.'));
    setTxt(null);
    if (!isFinite(v)) return;
    onChange(Math.min(max, Math.max(min, v)));
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
      <Pressable onPress={() => onChange(Math.max(min, value - step))} accessibilityRole="button"
        accessibilityLabel={`Menos ${step}`}
        style={{ width: 44, height: 44, borderRadius: R.row, borderWidth: 1, borderColor: t.border,
          alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: FONT.display, fontSize: 19, color: t.accent }}>−</Text>
      </Pressable>
      <TextInput
        value={txt !== null ? String(txt) : (suffix ? EUR(value) : String(value))}
        onFocus={() => setTxt(String(value).replace('.', ','))}
        onChangeText={setTxt}
        onBlur={commit}
        onSubmitEditing={commit}
        keyboardType="decimal-pad"
        accessibilityLabel="Valor"
        style={{ flex: 1, minHeight: 44, textAlign: 'center', fontFamily: FONT.display,
          fontSize: 18, color: t.text2, borderRadius: R.row, borderWidth: 1, borderColor: t.border }} />
      <Pressable onPress={() => onChange(Math.min(max, value + step))} accessibilityRole="button"
        accessibilityLabel={`Mais ${step}`}
        style={{ width: 44, height: 44, borderRadius: R.row, borderWidth: 1, borderColor: t.border,
          alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: FONT.display, fontSize: 19, color: t.accent }}>+</Text>
      </Pressable>
    </View>
  );
}

export default function Dinheiro({ t, user, onEquip }) {
  const st = useStore();
  const { s, set, envelopes, budget, spent, remaining, allEquip, isAdmin } = st;
  const [sheet, setSheet] = useState(null);
  const [mv, setMv] = useState({ from: 0, to: 3, amount: 0 });
  const [exp, setExp] = useState({ amount: 0, env: 0, payer: user, split: true });
  const [settle, setSettle] = useState({ mode: 'all', customAmount: 0 });
  const [openMonth, setOpenMonth] = useState({ envelopes: {} });

  const admin = isAdmin(user);
  const pct = Math.round((spent / budget) * 100);
  const settleBase = s.clearedSeeds ? 0 : 86.5;
  // O que sobra do rendimento depois de atribuir os envelopes — a segunda
  // metade da frase da referência 05.
  const semEnvelope = Math.max(0, (s.rendimento || 0) - budget);
  const MESES_SEG = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho',
    'Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const proximoMes = MESES_SEG[(MESES_SEG.indexOf(s.monthName) + 1) % 12];

  const eq = allEquip();
  const eqWarn = eq.filter(x => { const d = warrantyDaysLeft(x); return d >= 0 && d <= 90; }).length;
  const eqOut = eq.filter(x => warrantyDaysLeft(x) < 0).length;

  const freeOf = (i) => Math.max(0, envelopes[i].limit - envelopes[i].used);
  const envPg = usePaged(envelopes, 5);

  const handleSettle = () => {
    let amount = settleBase;
    if (settle.mode === 'half') {
      amount = settleBase / 2;
    } else if (settle.mode === 'custom') {
      amount = settle.customAmount;
    }

    set(x => ({
      paidPts: {
        ...x.paidPts,
        'Tomás': (x.paidPts['Tomás'] || 0) + amount,
      },
      settled: true,
    }));
    setSheet(null);
    setSettle({ mode: 'all', customAmount: 0 });
  };

  const handleOpenMonth = () => {
    // Initialize envelopes with default limits for the new month
    const envLimits = {};
    ENV_BASE.forEach(e => {
      envLimits[e.name] = e.limit + (openMonth.envelopes[e.name] || 0);
    });

    set(x => ({
      monthLimits: envLimits,
      monthZero: false,
      monthName: 'Setembro', // This should be dynamic based on current month
      registered: 0,
    }));
    setSheet(null);
  };

  // Fecha o mês: zera o registo e os pontos pagos. A regra dos 30 % do saldo
  // ainda não está decidida (o texto dizia metas aqui e cofres na Gestão), por
  // isso não se aplica nada — melhor não mover dinheiro do que movê-lo ao acaso.
  const handleCloseMonth = () => {
    set(x => ({
      registered: 0,
      settled: false,
      paidPts: { 'Léo': 0, 'Mia': 0 },
      envMove: {},
    }));
    setSheet(null);
  };

  return (
    <>
      {/* Sem título de secção — na referência 05 este cartão abre o ecrã. A
          linha da direita dizia só «de 1770,00 €»; falta-lhe o gasto, que é o
          número que explica o disponível. */}
      <Card t={t} style={{ gap: S.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Label t={t}>Disponível</Label>
            <Text style={{ fontFamily: FONT.display, fontSize: 28,
              color: remaining >= 0 ? t.state.okDeep : t.state.errDeep }}>{EUR(remaining)}</Text>
          </View>
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3, textAlign: 'right' }}>
            {EUR(spent)} gastos{'\n'}de {EUR(budget)}
          </Text>
        </View>
        <Bar t={t} pct={pct} color={t.accent} />
        <Text style={{ fontFamily: FONT.ui, fontSize: 12, lineHeight: 18, color: t.text3 }}>
          {pct} % dos {EUR(budget)} atribuídos aos envelopes.
          {semEnvelope > 0 ? ` Sobram ${EUR(semEnvelope)} sem envelope.` : ''}
        </Text>
      </Card>

      {/* Registar despesa é a acção mais frequente deste ecrã e estava no fim
          do cartão dos envelopes, como um «+ registar despesa» pequeno. Na
          referência é a primeira linha depois do saldo. */}
      <Card t={t} pad={false} style={{ paddingHorizontal: 16 }}>
        <Row t={t} icon="plus" title="Registar Despesa"
          sub="Combustível, farmácia, restaurante…"
          onPress={() => setSheet('despesa')} last />
      </Card>

      <View>
        <SectionTitle t={t}>Envelopes</SectionTitle>
        {admin ? (
          <Card t={t} pad={false} style={{ paddingHorizontal: 16, marginBottom: S.md }}>
            <Row t={t} icon="fileAdd" title={`Abrir ${proximoMes}`}
              sub="Distribuir o rendimento e reiniciar os envelopes"
              onPress={() => setSheet('openMonth')} last />
          </Card>
        ) : null}
        <Card t={t} style={{ gap: S.lg }}>
          {envPg.slice.map((e, i) => {
            const tight = e.used / e.limit >= 0.94;
            return (
              <View key={e.name} style={{ gap: S.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: S.md }}>
                  <Text style={{ flex: 1, fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>{e.name}</Text>
                  <Text style={{ fontFamily: FONT.ui, fontSize: 13,
                    color: tight ? t.state.errDeep : t.text3 }}>{EUR(e.used)} / {EUR(e.limit)}</Text>
                </View>
                <Bar t={t} pct={(e.used / e.limit) * 100} color={e.color} height={6} />
                {tight ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                    <Icon name="warning" size={16} color={t.state.warn} />
                    <Text style={{ flex: 1, fontFamily: FONT.ui, fontSize: 11.5, color: t.state.warnDeep }}>
                      Restam {EUR(e.limit - e.used)} neste envelope.
                    </Text>
                    {/* «Reforçar» leva à folha de mover dinheiro — o passo
                        seguinte óbvio quando um envelope está no limite. */}
                    <Pressable onPress={() => setSheet('mover')} accessibilityRole="button"
                      accessibilityLabel={`Reforçar o envelope ${e.name}`}
                      style={{ minHeight: 44, justifyContent: 'center' }}>
                      <Text style={{ fontFamily: FONT.display, fontSize: 13, fontWeight: '700', color: t.accent }}>
                        Reforçar
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}
          <Pager t={t} pg={envPg} />
          <View style={{ height: 1, backgroundColor: t.divider }} />
          <AddButton t={t} label="mover dinheiro entre envelopes" onPress={() => setSheet('mover')} />
        </Card>
      </View>

      <View>
        <SectionTitle t={t}>Contas entre Nós</SectionTitle>
        <Card t={t} style={{ gap: S.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: FONT.body, fontSize: 16, color: t.text1 }}>
                {s.settled || settleBase === 0 ? 'Está tudo acertado' : `O Tomás deve à Rita ${EUR(settleBase)}`}
              </Text>
              <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
                {s.clearedSeeds ? 'Sem valores pendentes entre os dois.'
                  : s.settled ? 'Último acerto hoje' : '14 despesas partilhadas este mês'}
              </Text>
            </View>
            <Pill label={s.settled || settleBase === 0 ? 'Concluído' : 'A Decorrer'}
              fg={s.settled || settleBase === 0 ? t.state.okDeep : t.state.info}
              bg={s.settled || settleBase === 0 ? t.state.okBg : t.state.infoBg}
              border={s.settled || settleBase === 0 ? t.state.okBorder : t.state.info} />
          </View>
          <Primary t={t} disabled={s.settled || settleBase === 0}
            label={s.settled || settleBase === 0 ? 'Contas Acertadas' : 'Acertar Contas'}
            onPress={() => { setSettle({ mode: 'all', customAmount: 0 }); setSheet('settle'); }} />
        </Card>
      </View>

      <View>
        <SectionTitle t={t}>Equipamentos da Casa</SectionTitle>
        <Card t={t} pad={false} style={{ paddingHorizontal: 16 }}>
          <Row t={t} icon="camera" title="Equipamentos registados"
            sub={`${eq.length} equipamentos · ${eqWarn} garantia a expirar · ${eqOut} fora de garantia`}
            onPress={onEquip} last />
        </Card>
      </View>

      <View>
        <SectionTitle t={t}>Metas da Família</SectionTitle>
        <Card t={t} style={{ gap: S.lg }}>
          {s.clearedSeeds ? (
            <Text style={{ fontFamily: FONT.body, fontSize: 15, lineHeight: 22, color: t.text3 }}>
              Sem metas definidas. Uma meta é um objetivo com valor e prazo, alimentado pelo que sobra dos envelopes.
            </Text>
          ) : GOALS.map(g => (
            <View key={g.name} style={{ gap: S.md }}>
              <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>{g.name}</Text>
              <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
                {EUR(g.at)} de {EUR(g.of)} · {g.when}
              </Text>
              <Bar t={t} pct={(g.at / g.of) * 100} color={t.state.info} height={6} />
            </View>
          ))}
        </Card>
      </View>

      {admin ? (
        <View>
          <SectionTitle t={t}>Administração</SectionTitle>
          <Card t={t} style={{ gap: S.md }}>
            <View style={{ flexDirection: 'row', gap: S.md }}>
              <Pressable
                onPress={() => { setOpenMonth({ envelopes: {} }); setSheet('openMonth'); }}
                accessibilityRole="button"
                accessibilityLabel="Abrir mês"
                style={{ flex: 1, minHeight: 48, borderRadius: R.row, borderWidth: 1, borderColor: t.accent,
                  backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.accent }}>
                  Abrir Mês
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setSheet('closeMonth')}
                accessibilityRole="button"
                accessibilityLabel="Fechar mês"
                style={{ flex: 1, minHeight: 48, borderRadius: R.row, borderWidth: 1, borderColor: t.state.warnDeep,
                  backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.state.warnDeep }}>
                  Fechar Mês
                </Text>
              </Pressable>
            </View>
          </Card>
        </View>
      ) : null}

      {/* Settle Accounts Sheet */}
      {sheet === 'settle' ? (() => {
        const settleAmount = settle.mode === 'half' ? settleBase / 2 : settle.mode === 'custom' ? settle.customAmount : settleBase;
        return (
          <Sheet t={t} title="Acertar Contas"
            sub="Registar o pagamento das despesas partilhadas"
            onClose={() => setSheet(null)}
            action={<Primary t={t} disabled={settleAmount <= 0}
              label="Confirmar Pagamento"
              onPress={handleSettle} />}>
            <View style={{ gap: S.lg }}>
              <View style={{ gap: S.md }}>
                <Label t={t}>Montante devido</Label>
                <Text style={{ fontFamily: FONT.display, fontSize: 28, color: t.text2 }}>
                  {EUR(settleBase)}
                </Text>
                <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
                  O Tomás deve à Rita este valor.
                </Text>
              </View>

              <View style={{ gap: S.md }}>
                <Label t={t}>Opções de Pagamento</Label>
                <View style={{ flexDirection: 'column', gap: S.md }}>
                  <Pressable
                    onPress={() => setSettle({ ...settle, mode: 'all' })}
                    accessibilityRole="button"
                    accessibilityLabel="Pagar tudo"
                    accessibilityState={{ selected: settle.mode === 'all' }}
                    style={{ minHeight: 48, borderRadius: R.row, borderWidth: 1, paddingHorizontal: 14,
                      borderColor: settle.mode === 'all' ? t.chrome : t.border,
                      backgroundColor: settle.mode === 'all' ? t.chrome : t.subtle,
                      flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                    <View style={{ width: 20, height: 20, borderRadius: R.pill,
                      borderWidth: 2, borderColor: settle.mode === 'all' ? '#FFFFFF' : t.border,
                      backgroundColor: settle.mode === 'all' ? '#FFFFFF' : 'transparent' }} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600',
                        color: settle.mode === 'all' ? '#FFFFFF' : t.text2 }}>Tudo</Text>
                      <Text style={{ fontFamily: FONT.ui, fontSize: 11.5,
                        color: settle.mode === 'all' ? 'rgba(255,255,255,0.7)' : t.text3 }}>
                        {EUR(settleBase)}
                      </Text>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => setSettle({ ...settle, mode: 'half' })}
                    accessibilityRole="button"
                    accessibilityLabel="Pagar metade"
                    accessibilityState={{ selected: settle.mode === 'half' }}
                    style={{ minHeight: 48, borderRadius: R.row, borderWidth: 1, paddingHorizontal: 14,
                      borderColor: settle.mode === 'half' ? t.chrome : t.border,
                      backgroundColor: settle.mode === 'half' ? t.chrome : t.subtle,
                      flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                    <View style={{ width: 20, height: 20, borderRadius: R.pill,
                      borderWidth: 2, borderColor: settle.mode === 'half' ? '#FFFFFF' : t.border,
                      backgroundColor: settle.mode === 'half' ? '#FFFFFF' : 'transparent' }} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600',
                        color: settle.mode === 'half' ? '#FFFFFF' : t.text2 }}>Metade</Text>
                      <Text style={{ fontFamily: FONT.ui, fontSize: 11.5,
                        color: settle.mode === 'half' ? 'rgba(255,255,255,0.7)' : t.text3 }}>
                        {EUR(settleBase / 2)}
                      </Text>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => setSettle({ ...settle, mode: 'custom' })}
                    accessibilityRole="button"
                    accessibilityLabel="Valor personalizado"
                    accessibilityState={{ selected: settle.mode === 'custom' }}
                    style={{ minHeight: 48, borderRadius: R.row, borderWidth: 1, paddingHorizontal: 14,
                      borderColor: settle.mode === 'custom' ? t.chrome : t.border,
                      backgroundColor: settle.mode === 'custom' ? t.chrome : t.subtle,
                      flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                    <View style={{ width: 20, height: 20, borderRadius: R.pill,
                      borderWidth: 2, borderColor: settle.mode === 'custom' ? '#FFFFFF' : t.border,
                      backgroundColor: settle.mode === 'custom' ? '#FFFFFF' : 'transparent' }} />
                    <Text style={{ flex: 1, fontFamily: FONT.ui, fontSize: 13, fontWeight: '600',
                      color: settle.mode === 'custom' ? '#FFFFFF' : t.text2 }}>Valor Personalizado</Text>
                  </Pressable>
                </View>
              </View>

              {settle.mode === 'custom' ? (
                <View style={{ gap: S.md }}>
                  <Label t={t}>Valor a pagar</Label>
                  <NumField t={t} value={settle.customAmount} step={5} min={0} max={settleBase * 2}
                    onChange={(v) => setSettle({ ...settle, customAmount: v })} />
                </View>
              ) : null}
            </View>
          </Sheet>
        );
      })() : null}

      {/* Move Money Sheet */}
      {sheet === 'mover' ? (() => {
        const free = freeOf(mv.from);
        const over = mv.amount > free;
        return (
          <Sheet t={t} title="Mover Dinheiro" sub="Redistribuir o orçamento, sem sair dinheiro da conta"
            onClose={() => setSheet(null)}
            action={<Primary t={t} disabled={over || mv.amount <= 0}
              label={over ? 'Valor Indisponível' : 'Confirmar Movimento'}
              onPress={() => {
                set(x => ({ envMove: {
                  ...x.envMove,
                  [envelopes[mv.from].name]: (x.envMove[envelopes[mv.from].name] || 0) - mv.amount,
                  [envelopes[mv.to].name]: (x.envMove[envelopes[mv.to].name] || 0) + mv.amount,
                } }));
                setSheet(null); setMv(m => ({ ...m, amount: 0 }));
              }} />}>
            <View style={{ gap: S.md }}>
              <Label t={t}>Retirar de</Label>
              {ENV_BASE.map((e, i) => (
                <Pressable key={e.name} onPress={() => setMv(m => ({ ...m, from: i, to: m.to === i ? m.from : m.to }))}
                  accessibilityRole="button" accessibilityLabel={e.name} accessibilityState={{ selected: mv.from === i }}
                  style={{ minHeight: 48, borderRadius: R.row, borderWidth: 1, paddingHorizontal: 14,
                    borderColor: mv.from === i ? t.chrome : t.border,
                    backgroundColor: mv.from === i ? t.chrome : t.subtle,
                    flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                  <Text style={{ flex: 1, fontFamily: FONT.ui, fontSize: 13, fontWeight: '600',
                    color: mv.from === i ? '#FFFFFF' : t.text2 }}>{e.name}</Text>
                  <Text style={{ fontFamily: FONT.ui, fontSize: 11.5,
                    color: mv.from === i ? 'rgba(255,255,255,0.7)' : t.text3 }}>livre {EUR(freeOf(i))}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ gap: S.md }}>
              <Label t={t}>Reforçar</Label>
              {ENV_BASE.map((e, i) => (
                <Pressable key={e.name} onPress={() => setMv(m => ({ ...m, to: i, from: m.from === i ? m.to : m.from }))}
                  accessibilityRole="button" accessibilityLabel={e.name} accessibilityState={{ selected: mv.to === i }}
                  style={{ minHeight: 48, borderRadius: R.row, borderWidth: 1, paddingHorizontal: 14,
                    borderColor: mv.to === i ? t.chrome : t.border,
                    backgroundColor: mv.to === i ? t.chrome : t.subtle,
                    flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                  <Text style={{ flex: 1, fontFamily: FONT.ui, fontSize: 13, fontWeight: '600',
                    color: mv.to === i ? '#FFFFFF' : t.text2 }}>{e.name}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ gap: S.md }}>
              <Label t={t}>Valor a mover</Label>
              <NumField t={t} value={mv.amount} step={5} min={0} max={free}
                onChange={(v) => setMv(m => ({ ...m, amount: v }))} />
              <Pressable onPress={() => setMv(m => ({ ...m, amount: free }))} accessibilityRole="button"
                accessibilityLabel="Usar o máximo disponível" style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, color: t.accent, fontWeight: '600' }}>
                  Usar o máximo · {EUR(free)}
                </Text>
              </Pressable>
              <Text style={{ fontFamily: FONT.body, fontSize: 14.5, lineHeight: 21, color: over ? t.state.errDeep : t.text2 }}>
                {over ? `Só há ${EUR(free)} livres em ${envelopes[mv.from].name}.`
                  : `O limite de ${envelopes[mv.from].name} passa a ${EUR(envelopes[mv.from].limit - mv.amount)} e o de ${envelopes[mv.to].name} a ${EUR(envelopes[mv.to].limit + mv.amount)}. Não sai dinheiro da conta.`}
              </Text>
            </View>
          </Sheet>
        );
      })() : null}

      {/* Register Expense Sheet */}
      {sheet === 'despesa' ? (
        <Sheet t={t} title="Registar Despesa" sub="Entra no envelope e na conta entre os dois"
          onClose={() => setSheet(null)}
          action={<Primary t={t} disabled={exp.amount <= 0} label="Registar Despesa"
            onPress={() => {
              set(x => ({
                registered: x.registered + (envelopes[exp.env].name === 'Mercearia' ? exp.amount : 0),
                envMove: x.envMove,
                settled: false,
              }));
              setSheet(null); setExp(e => ({ ...e, amount: 0 }));
            }} />}>
          <View style={{ gap: S.md }}>
            <Label t={t}>Valor</Label>
            <NumField t={t} value={exp.amount} step={5} min={0} max={9999}
              onChange={(v) => setExp(e => ({ ...e, amount: v }))} />
          </View>
          <View style={{ gap: S.md }}>
            <Label t={t}>Envelope</Label>
            {ENV_BASE.map((e, i) => (
              <Pressable key={e.name} onPress={() => setExp(x => ({ ...x, env: i }))}
                accessibilityRole="button" accessibilityLabel={e.name} accessibilityState={{ selected: exp.env === i }}
                style={{ minHeight: 48, borderRadius: R.row, borderWidth: 1, paddingHorizontal: 14,
                  borderColor: exp.env === i ? t.chrome : t.border,
                  backgroundColor: exp.env === i ? t.chrome : t.subtle,
                  flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                <Text style={{ flex: 1, fontFamily: FONT.ui, fontSize: 13, fontWeight: '600',
                  color: exp.env === i ? '#FFFFFF' : t.text2 }}>{e.name}</Text>
                <Text style={{ fontFamily: FONT.ui, fontSize: 11.5,
                  color: exp.env === i ? 'rgba(255,255,255,0.7)' : t.text3 }}>livre {EUR(freeOf(i))}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ gap: S.md }}>
            <Label t={t}>Quem pagou</Label>
            <Segmented t={t} small value={exp.payer}
              options={['Rita', 'Tomás'].map(n => ({ value: n, label: n }))}
              onChange={(v) => setExp(x => ({ ...x, payer: v }))} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: t.subtle,
            borderWidth: 1, borderColor: t.border, borderRadius: R.card, padding: 14 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>Dividir a meias</Text>
              <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
                {exp.split ? `Metade (${EUR(exp.amount / 2)}) entra na conta entre os dois.` : 'A despesa fica a cargo de quem pagou.'}
              </Text>
            </View>
            <Toggle t={t} on={exp.split} label="Dividir a meias"
              onPress={() => setExp(x => ({ ...x, split: !x.split }))} />
          </View>
        </Sheet>
      ) : null}

      {/* Open Month Sheet */}
      {sheet === 'openMonth' && admin ? (
        <Sheet t={t} title="Abrir Mês"
          sub="Distribuir o rendimento aos envelopes"
          onClose={() => setSheet(null)}
          action={<Primary t={t} label="Confirmar Abertura" onPress={handleOpenMonth} />}>
          <View style={{ gap: S.lg }}>
            <Text style={{ fontFamily: FONT.body, fontSize: 15, lineHeight: 22, color: t.text2 }}>
              Distribua o rendimento mensal aos envelopes. Os limites serão atualizados no início do mês.
            </Text>
            <View style={{ gap: S.md }}>
              <Label t={t}>Limites dos Envelopes</Label>
              {ENV_BASE.map((e) => (
                <View key={e.name} style={{ gap: S.md }}>
                  <Label t={t}>{e.name}</Label>
                  <NumField t={t}
                    value={openMonth.envelopes[e.name] || 0}
                    step={10}
                    min={0}
                    max={2000}
                    onChange={(v) => setOpenMonth(x => ({
                      envelopes: { ...x.envelopes, [e.name]: v }
                    }))} />
                </View>
              ))}
            </View>
          </View>
        </Sheet>
      ) : null}

      {/* Close Month Sheet */}
      {sheet === 'closeMonth' && admin ? (
        <Sheet t={t} title="Fechar Mês"
          sub="Arquivar as despesas e recomeçar a contagem"
          onClose={() => setSheet(null)}
          action={<Primary t={t} label="Confirmar Encerramento" onPress={handleCloseMonth} />}>
          <View style={{ gap: S.lg }}>
            <Text style={{ fontFamily: FONT.body, fontSize: 15, lineHeight: 22, color: t.text2 }}>
              Ao fechar o mês, o registo de despesas e os pontos pagos voltam a zero. O saldo restante não é movido.
            </Text>
            <View style={{ gap: S.md }}>
              <Label t={t}>Resumo do Mês</Label>
              <View style={{ gap: S.md }}>
                <Row t={t} title="Orçamento" value={EUR(budget)} right={<View />} last={false} />
                <Row t={t} title="Gasto" value={EUR(spent)} right={<View />} last={false} />
                <Row t={t} title="Disponível" value={EUR(remaining)} right={<View />} last={true} />
              </View>
            </View>
          </View>
        </Sheet>
      ) : null}
    </>
  );
}
