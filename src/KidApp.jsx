import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from './store';
import { buildTheme, onChrome, S, R, FONT, MEMBER_COLOR, elev } from './theme';
import { EUR } from './format';
import Icon from './Icon';
import { Card, SectionTitle, Label, Pill, Empty, Primary } from './ui';

// Ícone de tarefa: traço aberto, 1,75 de espessura, grelha de 24
const TaskIcon = ({ size = 32, color = '#67769B' }) => (
  <Icon name="checkSquare" size={size} color={color} />
);

// Linha de tarefa da criança
function KidTaskRow({ t, task, kid, onPress }) {
  const pending = useStore().s.done[task.id] ? 0 : 1;
  const isDone = useStore().s.done[task.id];

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={task.title}
      style={({ pressed }) => ({
        minHeight: 64, paddingHorizontal: 16, paddingVertical: 12,
        flexDirection: 'row', alignItems: 'center', gap: 16,
        borderBottomWidth: 1, borderBottomColor: t.divider,
        opacity: isDone ? 0.6 : 1,
        backgroundColor: pressed ? t.subtle : 'transparent',
      })}>

      <View style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
        <TaskIcon size={28} color={isDone ? t.state.ok : t.slate} />
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <Text numberOfLines={2} style={{
          fontFamily: FONT.body, fontSize: 17, fontWeight: isDone ? '400' : '500',
          color: isDone ? t.text3 : t.text2,
          textDecorationLine: isDone ? 'line-through' : 'none',
        }}>{task.title}</Text>
        {task.meta ? <Text numberOfLines={1} style={{
          fontFamily: FONT.ui, fontSize: 12, color: t.text3,
        }}>{task.meta}</Text> : null}
      </View>

      {task.pts > 0 ? (
        <Pill label={`${task.pts} pt`} fg={t.text2} bg={t.subtle} border={t.border} />
      ) : null}
    </Pressable>
  );
}

// Transação no cofre
function VaultTransaction({ t, entry }) {
  const isCredit = entry.type === 'credit';

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 12,
      minHeight: 52, paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: t.divider,
    }}>
      <View style={{
        width: 36, height: 36, borderRadius: R.pill,
        backgroundColor: isCredit ? t.state.okBg : t.subtle,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={isCredit ? 'caretUp' : 'caretDown'} size={18}
          color={isCredit ? t.state.okDeep : t.text3} />
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{
          fontFamily: FONT.body, fontSize: 15, color: t.text2,
        }}>{entry.label}</Text>
        {entry.date ? <Text style={{
          fontFamily: FONT.ui, fontSize: 12, color: t.text3,
        }}>{entry.date}</Text> : null}
      </View>

      <Text style={{
        fontFamily: FONT.display, fontSize: 15, fontWeight: '600',
        color: isCredit ? t.state.okDeep : t.text2,
      }}>
        {isCredit ? '+' : '−'}{EUR(Math.abs(entry.amount))}
      </Text>
    </View>
  );
}

// Abas de navegação
function KidTabs({ t, active, onPress, kid }) {
  const tabs = [
    { key: 'tarefas', label: 'Tarefas', icon: 'checkSquare' },
    { key: 'cofre', label: 'O Meu Cofre', icon: 'wallet' },
  ];

  return (
    <View style={{
      flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: t.divider,
      backgroundColor: t.card,
    }}>
      {tabs.map((tab) => {
        const on = active === tab.key;
        return (
          <Pressable key={tab.key} onPress={() => onPress(tab.key)}
            accessibilityRole="tab" accessibilityLabel={tab.label}
            accessibilityState={{ selected: on }}
            style={{
              flex: 1, minHeight: 48, flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 4,
              borderBottomWidth: on ? 2 : 0,
              borderBottomColor: on ? t.accent : 'transparent',
              backgroundColor: on ? t.surface : 'transparent',
            }}>
            <Icon name={tab.icon} size={22} color={on ? t.accent : t.text3} />
            <Text style={{
              fontFamily: FONT.ui, fontSize: 12, fontWeight: on ? '600' : '500',
              color: on ? t.accent : t.text3,
            }}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Vista de Tarefas
function KidTasksView({ t, kid, tasks }) {
  const st = useStore();
  const { done, s } = st;

  const tasksByKid = tasks.filter(x => x.who === kid);
  const todayTasks = tasksByKid.filter(x => !done[x.id]);
  const weekPts = tasksByKid.reduce((sum, x) => sum + (done[x.id] ? 0 : x.pts), 0);

  return (
    <ScrollView style={{ flex: 1, minHeight: 0 }}
      contentContainerStyle={{ paddingBottom: S.xl }}>

      {/* Cartão de resumo */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: S.md }}>
        <View style={{ flexDirection: 'row', gap: S.md }}>
          <View style={{
            flex: 1, backgroundColor: t.card, borderRadius: R.card,
            borderWidth: 1, borderColor: t.border,
            paddingHorizontal: 16, paddingVertical: 14, gap: 8,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{
              fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.text3,
            }}>Por fazer hoje</Text>
            <Text style={{
              fontFamily: FONT.display, fontSize: 26, fontWeight: '600', color: t.text2,
            }}>{todayTasks.length}</Text>
          </View>

          <View style={{
            flex: 1, backgroundColor: t.card, borderRadius: R.card,
            borderWidth: 1, borderColor: t.border,
            paddingHorizontal: 16, paddingVertical: 14, gap: 8,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{
              fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.text3,
            }}>Pontos da semana</Text>
            <Text style={{
              fontFamily: FONT.display, fontSize: 26, fontWeight: '600', color: t.text2,
            }}>{weekPts}</Text>
          </View>
        </View>
      </View>

      {/* Lista de tarefas */}
      <View style={{ marginTop: S.xl }}>
        {tasksByKid.length > 0 ? (
          <Card t={t} pad={false} style={{ marginHorizontal: 16 }}>
            {tasksByKid.map((task, idx) => (
              <KidTaskRow
                key={task.id}
                t={t}
                task={task}
                kid={kid}
                onPress={() => st.set(s => ({ done: { ...s.done, [task.id]: !s.done[task.id] } }))}
              />
            ))}
          </Card>
        ) : (
          <Empty t={t} icon="checkSquare" title="Sem tarefas agora" sub="Bom trabalho!" />
        )}
      </View>
    </ScrollView>
  );
}

// Vista do Cofre
function KidVaultView({ t, kid }) {
  const st = useStore();
  const { s, set } = st;
  const [requested, setRequested] = useState(false);

  const balance = s.vault[kid] ?? 0;
  const pending = (st.kidPts[kid] ?? 0) - (s.paidPts[kid] ?? 0);
  const pendingEur = pending * s.pointValue;

  // Transações simuladas — em produção viriam do servidor
  const transactions = [
    { type: 'credit', label: 'Pontos pagos pela Rita', date: '18/08', amount: 2.40 },
    { type: 'credit', label: 'Bónus da semana', date: '15/08', amount: 1.50 },
    { type: 'debit', label: 'Compra em loja', date: '12/08', amount: 5.00 },
  ];

  return (
    <ScrollView style={{ flex: 1, minHeight: 0 }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, gap: S.lg, paddingBottom: S.xl }}>

      {/* Saldo */}
      <Card t={t} style={{ gap: S.lg, alignItems: 'center' }}>
        <Text style={{
          fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.text3,
        }}>Saldo no Cofre</Text>
        <Text style={{
          fontFamily: FONT.display, fontSize: 38, fontWeight: '600',
          color: t.state.okDeep, lineHeight: 46,
        }}>{EUR(balance)}</Text>
        {pending > 0 ? (
          <Text style={{
            fontFamily: FONT.ui, fontSize: 12, color: t.text3,
          }}>{EUR(pendingEur)} por receber</Text>
        ) : null}
      </Card>

      {/* Secção de Movimentos */}
      <View>
        <SectionTitle t={t}>Movimentos</SectionTitle>
        <Card t={t} pad={false}>
          {transactions.length > 0 ? transactions.map((entry, idx) => (
            <VaultTransaction key={idx} t={t} entry={entry} />
          )) : (
            <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
              <Text style={{
                fontFamily: FONT.body, fontSize: 15, color: t.text3, textAlign: 'center',
              }}>Sem movimentos ainda</Text>
            </View>
          )}
        </Card>
      </View>

      {/* Botão de pedido */}
      <View style={{ gap: S.md }}>
        {!requested ? (
          <Primary t={t} label="Pedir para Usar o Dinheiro" onPress={() => setRequested(true)} />
        ) : (
          <>
            <Pressable disabled style={{
              minHeight: 52, borderRadius: R.card, borderWidth: 1,
              borderColor: t.border, backgroundColor: t.subtle,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{
                fontFamily: FONT.display, fontSize: 15, fontWeight: '700',
                color: t.text3,
              }}>Pedido a Aguardar Autorização</Text>
            </Pressable>

            <Card t={t} style={{ backgroundColor: t.tileInfo, borderLeftWidth: 4, borderLeftColor: t.state.info }}>
              <Text style={{
                fontFamily: FONT.body, fontSize: 14, lineHeight: 21, color: t.text2,
              }}>Pedido enviado. A Rita ou o Tomás têm de autorizar antes de poder usar o dinheiro.</Text>
            </Card>
          </>
        )}
      </View>
    </ScrollView>
  );
}

// Componente principal
export default function KidApp({ kid, kidTab, setKidTab, onLogout }) {
  const st = useStore();
  const { s, set, allTasks } = st;
  const sysDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();

  // Cor da criança
  const kidColor = MEMBER_COLOR[kid];

  // Tema: versão escura do tema geral, com fundo na cor da criança
  const mode = (s.themeByUser[kid]) || 'claro';
  const dark = mode === 'escuro' || (mode === 'sistema' && sysDark);
  const t = buildTheme(0, dark);
  const onC = onChrome(kidColor);
  const tasks = allTasks();

  return (
    <View style={{ flex: 1, backgroundColor: t.page }}>

      {/* Cabeçalho */}
      <View style={{
        flex: 0, backgroundColor: kidColor, overflow: 'hidden',
        paddingTop: insets.top + 10, paddingBottom: 14, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', gap: 12, ...elev(3),
      }}>
        <View style={{
          width: 40, height: 40, borderRadius: R.pill,
          backgroundColor: 'rgba(255,255,255,0.22)',
          borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{
            fontFamily: FONT.display, fontSize: 17, fontWeight: '500',
            color: '#FFFFFF',
          }}>{kid.charAt(0)}</Text>
        </View>

        <View style={{ flex: 1, gap: 1 }}>
          <Text style={{
            fontFamily: FONT.display, fontSize: 18, fontWeight: '500',
            color: '#FFFFFF',
          }}>Olá, {kid}</Text>
          <Text numberOfLines={1} style={{
            fontFamily: FONT.ui, fontSize: 12, color: onC,
          }}>
            {(() => {
              const p = (st.kidPts[kid] ?? 0) - (s.paidPts[kid] ?? 0);
              return `${p} pt${p !== 1 ? 's' : ''} por pagar · ${EUR(s.vault[kid] ?? 0)} no cofre`;
            })()}
          </Text>
        </View>

        <Pressable onPress={onLogout} accessibilityRole="button"
          accessibilityLabel="Terminar sessão"
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="logout" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Abas */}
      <KidTabs t={t} active={kidTab} onPress={setKidTab} kid={kid} />

      {/* Conteúdo */}
      <View style={{ flex: 1, minHeight: 0 }}>
        {kidTab === 'tarefas' ? (
          <KidTasksView t={t} kid={kid} tasks={tasks} />
        ) : (
          <KidVaultView t={t} kid={kid} />
        )}
      </View>

      {/* Rodapé — dois separadores */}
      <View style={{
        flex: 0, backgroundColor: kidColor, flexDirection: 'row',
        paddingTop: 6, paddingBottom: Math.max(insets.bottom, 10), paddingHorizontal: 4,
      }}>
        {[
          { key: 'tarefas', label: 'Tarefas', icon: 'checkSquare' },
          { key: 'cofre', label: 'O Meu Cofre', icon: 'wallet' },
        ].map(x => {
          const on = kidTab === x.key;
          return (
            <Pressable key={x.key} onPress={() => setKidTab(x.key)}
              accessibilityRole="tab" accessibilityLabel={x.label}
              accessibilityState={{ selected: on }}
              style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Icon name={x.icon} size={24} color={on ? '#FFFFFF' : onC} />
              <Text style={{
                fontFamily: FONT.ui, fontSize: 11, fontWeight: '600',
                color: on ? '#FFFFFF' : onC,
              }}>{x.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
