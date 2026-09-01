import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT, corDoMembro } from '../theme';
import { EUR, warrantyDaysLeft, MONTHS } from '../format';
import { ENV_BASE, GOALS, EQUIP } from '../data';
import { Card, SectionTitle, Label, Pill, Row, Bar, Primary, AddButton, Segmented, Toggle, Empty, usePaged, Pager, Tap, Opcao } from '../ui';
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

// Envelopes em grelha de dois, com o valor livre por baixo do nome — é assim
// nas duas listas da referência 19. Eram oito linhas de largura total, 48 px
// cada: a folha não cabia e o campo do valor ficava cortado a meio pelo botão.
// A lista de reforçar também não dizia quanto havia livre em cada um.
function GrelhaEnvelopes({ t, envelopes, livre, escolhido, onEscolher }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }}>
      {envelopes.map((e, i) => {
        const on = escolhido === i;
        return (
          <Pressable key={e.name} onPress={() => onEscolher(i)}
            accessibilityRole="button" accessibilityLabel={`${e.name} · livre ${EUR(livre(i))}`}
            accessibilityState={{ selected: on }}
            style={{ width: '47%', minHeight: 56, borderRadius: R.row, borderWidth: 1,
              paddingHorizontal: 12, justifyContent: 'center', gap: 2,
              borderColor: on ? t.chrome : t.border,
              backgroundColor: on ? t.chrome : t.subtle }}>
            <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600',
              color: on ? '#FFFFFF' : t.text2 }}>{e.name}</Text>
            <Text style={{ fontFamily: FONT.ui, fontSize: 11.5,
              color: on ? 'rgba(255,255,255,0.7)' : t.text3 }}>livre {EUR(livre(i))}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function Dinheiro({ t, user, onEquip }) {
  const st = useStore();
  const { s, set, envelopes, budget, spent, remaining, allEquip, isAdmin, membros: MEMBERS, adultos, criancas, acerto, acertado, pagarAcerto, oNome, aoNome } = st;
  const [sheet, setSheet] = useState(null);
  const [mv, setMv] = useState({ from: 0, to: 3, amount: 0 });
  const [exp, setExp] = useState({ amount: 0, env: 0, payer: user, split: true });
  const [settle, setSettle] = useState({ mode: 'all', customAmount: 0 });
  const [openMonth, setOpenMonth] = useState({ envelopes: {} });

  const admin = isAdmin(user);
  const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  // Quanto falta acertar, e entre quem. Vem da loja: era 86,5 escrito aqui e
  // outra vez no Início, com os nomes «Tomás» e «Rita» no meio do texto.
  const settleBase = acerto ? acerto.valor : 0;
  // O que sobra do rendimento depois de atribuir os envelopes — a segunda
  // metade da frase da referência 05.
  const semEnvelope = Math.max(0, (s.rendimento || 0) - budget);
  // Os meses vêm do `format.js`, onde já viviam. Uma segunda lista escrita à
  // mão aqui era um sítio a mais para divergir — e divergiu: esta tinha os
  // acentos certos e ninguém garantia que continuasse.
  const proximoMes = MONTHS[(MONTHS.indexOf(s.monthName) + 1) % 12];

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

    pagarAcerto(amount, settle.mode === 'all' ? 'Acerto total'
      : settle.mode === 'half' ? 'Metade' : 'Valor à escolha');
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
      // Era `'Setembro'` escrito à mão, com um TODO em inglês ao lado.
      // Abrir o mês em março punha a app a dizer «Orçamento de Setembro» em
      // quatro ecrãs, e o `proximoMes` daí em diante contava a partir do mês
      // errado. É o mês SEGUINTE ao que está aberto, que é o que o botão diz.
      monthName: proximoMes,
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
      acertoMovs: [],
      paidPts: Object.fromEntries(criancas.map(n => [n, 0])),
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
        {envelopes.length === 0 ? (
          <Empty t={t} icon="wallet" title="Sem envelopes."
            hint="Crie-os na Gestão da Casa e abra o mês para os alimentar." />
        ) : (
        <Card t={t} style={{ gap: S.lg }}>
          {envPg.slice.map((e, i) => {
            const tight = e.limit > 0 && e.used / e.limit >= 0.94;
            return (
              <View key={e.name} style={{ gap: S.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: S.md }}>
                  <Text style={{ flex: 1, fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>{e.name}</Text>
                  <Text style={{ fontFamily: FONT.ui, fontSize: 13,
                    color: tight ? t.state.errDeep : t.text3 }}>{EUR(e.used)} / {EUR(e.limit)}</Text>
                </View>
                <Bar t={t} pct={e.limit > 0 ? (e.used / e.limit) * 100 : 0} color={e.color} height={6} />
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
        )}
      </View>

      <View>
        <SectionTitle t={t}>Contas entre Nós</SectionTitle>
        <Card t={t} style={{ gap: S.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: FONT.body, fontSize: 16, color: t.text1 }}>
                {acertado ? 'Está tudo acertado'
                  : `${oNome(acerto.devedor)} deve ${aoNome(acerto.credor)} ${EUR(settleBase)}`}
              </Text>
              <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
                {s.clearedSeeds ? 'Sem valores pendentes entre os dois.'
                  : acerto && acerto.pago > 0 ? 'Último acerto hoje' : '14 despesas partilhadas este mês'}
              </Text>
            </View>
            <Pill label={acertado ? 'Concluído' : 'A Decorrer'}
              fg={acertado ? t.state.okDeep : t.state.info}
              bg={acertado ? t.state.okBg : t.state.infoBg}
              border={acertado ? t.state.okBorder : t.state.info} />
          </View>
          <Primary t={t} disabled={acertado}
            label={acertado ? 'Contas Acertadas' : 'Acertar Contas'}
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
        {s.clearedSeeds ? (
          <Empty t={t} icon="bank" title="Sem metas definidas."
            hint="Uma meta é um objetivo com valor e prazo, alimentado pelo que sobra dos envelopes." />
        ) : (
        <Card t={t} style={{ gap: S.lg }}>
          {GOALS.map(g => (
            <View key={g.name} style={{ gap: S.md }}>
              <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>{g.name}</Text>
              <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
                {EUR(g.at)} de {EUR(g.of)} · {g.when}
              </Text>
              {/* O progresso de uma meta não é um estado — é do esquema. */}
              <Bar t={t} pct={(g.at / g.of) * 100} color={t.accent} height={6} />
            </View>
          ))}
        </Card>
        )}
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
                  {acerto ? `${oNome(acerto.devedor)} deve ${aoNome(acerto.credor)} este valor.` : ''}
                </Text>
              </View>

              <View style={{ gap: S.md }}>
                <Label t={t}>Opções de Pagamento</Label>
                {/* Era este bloco escrito à mão, três vezes seguidas, 60 linhas.
                    O padrão é agora `Opcao` no ui.jsx — e é o mesmo que a folha
                    de exportar a saúde usa, em vez de inventar outro. */}
                <View style={{ flexDirection: 'column', gap: S.md }}>
                  {[
                    ['all', 'Tudo', EUR(settleBase)],
                    ['half', 'Metade', EUR(settleBase / 2)],
                    ['custom', 'Valor Personalizado', null],
                  ].map(([modo, titulo, detalhe]) => (
                    <Opcao key={modo} t={t} titulo={titulo} detalhe={detalhe}
                      selected={settle.mode === modo}
                      onPress={() => setSettle({ ...settle, mode: modo })} />
                  ))}
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
              label={over ? 'Valor Indisponível' : mv.amount <= 0 ? 'Escreva um valor' : 'Confirmar Movimento'}
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
              <GrelhaEnvelopes t={t} envelopes={ENV_BASE} livre={freeOf} escolhido={mv.from}
                onEscolher={(i) => setMv(m => ({ ...m, from: i, to: m.to === i ? m.from : m.to }))} />
            </View>
            <View style={{ gap: S.md }}>
              <Label t={t}>Reforçar</Label>
              <GrelhaEnvelopes t={t} envelopes={ENV_BASE} livre={freeOf} escolhido={mv.to}
                onEscolher={(i) => setMv(m => ({ ...m, to: i, from: m.from === i ? m.to : m.from }))} />
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
                acertoMovs: [],
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
              options={adultos.map(n => ({ value: n, label: n }))}
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
