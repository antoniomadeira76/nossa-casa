import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, useColorScheme, StatusBar } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StoreProvider, useStore } from './src/store';
import { buildTheme, onChrome, S, R, FONT, elev } from './src/theme';
import Icon, { Marca } from './src/Icon';
import { MEMBERS } from './src/data';
import Login from './src/screens/Login';
import Inicio from './src/screens/Inicio';
import Dinheiro from './src/screens/Dinheiro';
import Tarefas from './src/screens/Tarefas';
import Compras from './src/screens/Compras';
import Agenda from './src/screens/Agenda';
import Perfil from './src/screens/Perfil';

const TABS = [
  { key: 'inicio',   label: 'Início',   icon: 'home',        title: 'Nossa Casa',        sub: 'Família Bengui · 4 membros' },
  { key: 'dinheiro', label: 'Dinheiro', icon: 'wallet',      title: 'Dinheiro',          sub: null },
  { key: 'tarefas',  label: 'Tarefas',  icon: 'checkSquare', title: 'Tarefas',           sub: 'Rotinas e tarefas da casa' },
  { key: 'compras',  label: 'Compras',  icon: 'fileDone',    title: 'Lista de Compras',  sub: 'Partilhada com 2 adultos' },
  { key: 'agenda',   label: 'Agenda',   icon: 'calendar',    title: 'Agenda',            sub: '20 – 26 de agosto de 2026' },
];

function Shell() {
  const { s, set } = useStore();
  const sysDark = useColorScheme() === 'dark';
  const [user, setUser] = useState(null);      // nome do membro ligado
  const [tab, setTab] = useState('inicio');
  const [perfil, setPerfil] = useState(false);
  const [booting, setBooting] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => { const id = setTimeout(() => setBooting(false), 900); return () => clearTimeout(id); }, []);

  const mode = (user && s.themeByUser[user]) || 'claro';
  const dark = mode === 'escuro' || (mode === 'sistema' && sysDark);
  const t = buildTheme(user ? (s.schemeByUser[user] ?? 0) : 0, dark);
  const onC = onChrome(t.chrome);

  if (booting) {
    return (
      <View style={{ flex: 1, backgroundColor: t.chrome, alignItems: 'center', justifyContent: 'center', gap: S.xl }}>
        <StatusBar barStyle="light-content" />
        <Marca size={74} />
        <View style={{ width: 120, height: 3, borderRadius: R.pill, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
          <View style={{ width: '60%', height: '100%', backgroundColor: 'rgba(255,255,255,0.6)' }} />
        </View>
      </View>
    );
  }

  if (!user) return <Login t={t} onEnter={setUser} />;

  const meta = TABS.find(x => x.key === tab);
  const Screen = { inicio: Inicio, dinheiro: Dinheiro, tarefas: Tarefas, compras: Compras, agenda: Agenda }[tab];

  // ⚠ INVARIANTE — ver CLAUDE.md
  // Cabeçalho e rodapé aparecem em TODAS as janelas. A raiz é uma coluna flex
  // com três filhos e a condição do rodapé não leva nada além de "estar na app":
  //   header  flex: none
  //   scroll  flex: 1, minHeight: 0
  //   footer  flex: none   ← último filho da raiz, sempre
  // Se um ecrã precisar de mais espaço, encolhe o conteúdo, não o rodapé.
  return (
    <View style={{ flex: 1, backgroundColor: t.page }}>
      <StatusBar barStyle="light-content" />

      {/* cabeçalho */}
      <View style={{
        flex: 0, backgroundColor: t.chrome, overflow: 'hidden',
        paddingTop: insets.top + 10, paddingBottom: 14, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', gap: 12, ...elev(3),
      }}>
        <Marca size={120} mono opacity={0.10}
          style={{ position: 'absolute', top: insets.top + 4, right: -24 }} />
        <Icon name={meta.icon} size={26} color="#FFFFFF" />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: '500',
            color: '#FFFFFF', letterSpacing: 0.25 }}>{meta.title}</Text>
          {meta.sub ? <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 12, color: onC }}>{meta.sub}</Text> : null}
        </View>
        <Pressable onPress={() => setPerfil(true)} accessibilityRole="button"
          accessibilityLabel="Perfil e ajustes"
          style={{ width: 36, height: 36, borderRadius: R.pill, backgroundColor: '#FFFFFF',
            borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
            alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: '500', color: t.chrome }}>
            {MEMBERS[user].initial}
          </Text>
        </Pressable>
      </View>

      {/* área de scroll */}
      <ScrollView style={{ flex: 1, minHeight: 0 }}
        contentContainerStyle={{ padding: 16, gap: S.xl, paddingBottom: S.xl }}>
        <Screen t={t} user={user} go={setTab} />
      </ScrollView>

      {/* rodapé — último filho da raiz, sempre */}
      <View style={{
        flex: 0, backgroundColor: t.chrome, flexDirection: 'row',
        paddingTop: 6, paddingBottom: Math.max(insets.bottom, 10), paddingHorizontal: 4,
      }}>
        {TABS.map(x => {
          const on = tab === x.key;
          return (
            <Pressable key={x.key} onPress={() => setTab(x.key)}
              accessibilityRole="tab" accessibilityLabel={x.label}
              accessibilityState={{ selected: on }}
              style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Icon name={x.icon} size={22} color={on ? '#FFFFFF' : onC} />
              <Text style={{ fontFamily: FONT.ui, fontSize: 10.5, fontWeight: '600',
                color: on ? '#FFFFFF' : onC }}>{x.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {perfil ? <Perfil t={t} user={user} onClose={() => setPerfil(false)}
        onSignOut={() => { setPerfil(false); setUser(null); }} /> : null}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider><Shell /></StoreProvider>
    </SafeAreaProvider>
  );
}
