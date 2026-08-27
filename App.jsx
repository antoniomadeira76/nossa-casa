import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, useColorScheme, StatusBar, Modal } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import { Roboto_500Medium, Roboto_400Regular } from '@expo-google-fonts/roboto';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
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
import Equipamentos from './src/screens/Equipamentos';
import Saude from './src/screens/Saude';
import Gestao from './src/screens/Gestao';
import Documentacao from './src/screens/Documentacao';
import Perfil from './src/screens/Perfil';
import KidApp from './src/KidApp';
import GoogleCalendarImportModal from './src/modals/GoogleCalendarImportModal';

const TABS = [
  { key: 'inicio',   label: 'Início',   icon: 'home',        title: 'Nossa Casa',        sub: 'Família Bengui · 4 membros' },
  { key: 'dinheiro', label: 'Dinheiro', icon: 'wallet',      title: 'Dinheiro',          sub: null },
  { key: 'tarefas',  label: 'Tarefas',  icon: 'checkSquare', title: 'Tarefas',           sub: 'Rotinas e tarefas da casa' },
  { key: 'compras',  label: 'Compras',  icon: 'fileDone',    title: 'Lista de Compras',  sub: 'Partilhada com 2 adultos' },
  { key: 'agenda',   label: 'Agenda',   icon: 'calendar',    title: 'Agenda',            sub: '20 – 26 de agosto de 2026' },
];

function Shell() {
  const { s, set, importGoogleEvents } = useStore();
  const sysDark = useColorScheme() === 'dark';
  const [user, setUser] = useState(null);      // nome do membro ligado
  const [tab, setTab] = useState('inicio');
  const [kidTab, setKidTab] = useState('tarefas');  // aba na KidApp
  const [perfil, setPerfil] = useState(false);
  const [saude, setSaude] = useState(false);
  const [equip, setEquip] = useState(false);
  const [gestao, setGestao] = useState(false);
  const [doc, setDoc] = useState(false);
  const [googleImport, setGoogleImport] = useState(false);
  const [booting, setBooting] = useState(true);
  const [fontsReady, setFontsReady] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      try {
        await Font.loadAsync({
          Roboto: Roboto_400Regular,
          'Roboto-500': Roboto_500Medium,
          Inter: Inter_400Regular,
          'Inter-600': Inter_600SemiBold,
        });
      } catch (e) {
        console.warn('Font loading failed, using system fonts:', e.message);
      }
      setFontsReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!fontsReady) return;
    const id = setTimeout(() => setBooting(false), 600);
    return () => clearTimeout(id);
  }, [fontsReady]);

  // Mostrar modal de importação do Google Calendar quando o utilizador faz login
  // por primeira vez ou quando existem novos eventos para importar
  useEffect(() => {
    if (!user || MEMBERS[user].kid) return;

    // Mock events para demonstração — substituir por autenticação real do Google Calendar
    const hasSeenImport = s.googleCalendarImported && Object.keys(s.googleCalendarImported).length > 0;
    if (!hasSeenImport) {
      // Mostrar modal com sample events na primeira vez
      // Em produção, estes viriam de uma autenticação real do Google Calendar
      setGoogleImport(true);
    }
  }, [user, s.googleCalendarImported]);

  const mode = (user && s.themeByUser[user]) || 'claro';
  const dark = mode === 'escuro' || (mode === 'sistema' && sysDark);
  const t = buildTheme(user ? (s.schemeByUser[user] ?? 0) : 0, dark);
  const onC = onChrome(t.chrome);

  if (booting || !fontsReady) {
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

  // Renderizar KidApp se o utilizador for uma criança
  if (MEMBERS[user].kid) {
    return <KidApp kid={user} kidTab={kidTab} setKidTab={setKidTab} onLogout={() => setUser(null)} />;
  }

  const meta = TABS.find(x => x.key === tab);
  const Screen = { dinheiro: Dinheiro, tarefas: Tarefas, compras: Compras, agenda: Agenda }[tab];

  // Header dinâmico para Início; fixo para outros ecrãs
  const isHome = tab === 'inicio';
  const hour = new Date().getHours();
  const greet = hour < 13 ? 'Bom dia' : hour < 20 ? 'Boa tarde' : 'Boa noite';
  const today = new Date().toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: '2-digit' })
    .replace(/^\w/, c => c.toUpperCase());

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

      {/* cabeçalho — minHeight garante que nunca colapsa (INVARIANTE #1) */}
      <View style={{
        flex: 0, minHeight: 80, backgroundColor: t.chrome, overflow: 'hidden',
        paddingTop: insets.top + 10, paddingBottom: 24, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', gap: 12, ...elev(3),
      }}>
        <Marca size={120} mono opacity={0.10}
          style={{ position: 'absolute', top: insets.top + 4, right: -24 }} />

        {isHome ? (
          // Header dinâmico para Início — exatamente como no mockup do iPhone
          <>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: FONT.display, fontSize: 24, fontWeight: '600',
                color: '#FFFFFF', letterSpacing: 0.3 }}>{greet}, {user}</Text>
              <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '400', color: onC }}>{today}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Pesquisar"
              style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 4 }}>
              <Icon name="search" size={24} color="#FFFFFF" />
            </Pressable>
          </>
        ) : (
          // Header fixo para outros ecrãs
          <>
            <Icon name={meta.icon} size={26} color="#FFFFFF" />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: '500',
                color: '#FFFFFF', letterSpacing: 0.25 }}>{meta.title}</Text>
              {meta.sub ? <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 12, color: onC }}>{meta.sub}</Text> : null}
            </View>
          </>
        )}

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

      {/* área de scroll com modals overlay */}
      <View style={{ flex: 1, position: 'relative' }}>
        <ScrollView style={{ flex: 1, minHeight: 0 }}
          contentContainerStyle={{ padding: 16, gap: S.xl, paddingBottom: S.xl }}>
          {tab === 'inicio' ? <Inicio t={t} user={user} go={setTab} onSaude={() => setSaude(true)} onEquip={() => setEquip(true)} onGestao={() => setGestao(true)} onDoc={() => setDoc(true)} /> : <Screen t={t} user={user} go={setTab} />}
        </ScrollView>

        {/* Modals como overlay com scrim semi-transparente */}
        {(saude || equip || gestao || doc) && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
            {saude && (
              <View style={{ maxHeight: '85vh', width: '100%', maxWidth: 500, backgroundColor: t.page, borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
                <Pressable onPress={() => setSaude(false)} style={{ position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: t.chrome, alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                  <Icon name="close" size={20} color="#FFFFFF" />
                </Pressable>
                <Saude t={t} user={user} onClose={() => setSaude(false)} />
              </View>
            )}
            {equip && (
              <View style={{ maxHeight: '85vh', width: '100%', maxWidth: 500, backgroundColor: t.page, borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
                <Pressable onPress={() => setEquip(false)} style={{ position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: t.chrome, alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                  <Icon name="close" size={20} color="#FFFFFF" />
                </Pressable>
                <Equipamentos t={t} user={user} onClose={() => setEquip(false)} />
              </View>
            )}
            {gestao && (
              <View style={{ maxHeight: '85vh', width: '100%', maxWidth: 500, backgroundColor: t.page, borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
                <Pressable onPress={() => setGestao(false)} style={{ position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: t.chrome, alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                  <Icon name="close" size={20} color="#FFFFFF" />
                </Pressable>
                <Gestao t={t} user={user} onClose={() => setGestao(false)} />
              </View>
            )}
            {doc && (
              <View style={{ maxHeight: '85vh', width: '100%', maxWidth: 500, backgroundColor: t.page, borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
                <Pressable onPress={() => setDoc(false)} style={{ position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: t.chrome, alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                  <Icon name="close" size={20} color="#FFFFFF" />
                </Pressable>
                <Documentacao t={t} onClose={() => setDoc(false)} />
              </View>
            )}
          </View>
        )}
      </View>

      {/* rodapé — último filho da raiz, sempre (INVARIANTE #1) */}
      <View style={{
        flex: 0, minHeight: 60, backgroundColor: t.chrome, flexDirection: 'row',
        paddingTop: 6, paddingBottom: Math.max(insets.bottom, 10), paddingHorizontal: 4,
        zIndex: 100,
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

      {/* Perfil sheet */}
      {perfil ? <Perfil t={t} user={user} onClose={() => setPerfil(false)}
        onSignOut={() => { setPerfil(false); setUser(null); }} /> : null}

      {/* Google Calendar Import Modal */}
      {googleImport && user && !MEMBERS[user].kid && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <GoogleCalendarImportModal
            t={t}
            events={[
              { id: 'gcal-1', title: 'Reunião de equipa', date: 'd2026-08-28', time: '14:00', isRecurring: false, description: '' },
              { id: 'gcal-2', title: 'Almoço com a mãe', date: 'd2026-08-29', time: '12:30', isRecurring: false, description: 'Restaurante Taberna' },
              { id: 'gcal-3', title: 'Chamada com o cliente', date: 'd2026-08-30', time: '10:00', isRecurring: true, description: 'Reunião semanal' },
            ]}
            user={user}
            onImportAll={(events) => {
              importGoogleEvents(events, user, true);
              setGoogleImport(false);
            }}
            onImportPrivate={(events) => {
              importGoogleEvents(events, user, false);
              setGoogleImport(false);
            }}
            onIgnore={() => {
              // Marcar como ignorado para não mostrar novamente
              set(x => ({
                googleCalendarImported: {
                  ...x.googleCalendarImported,
                  'gcal-1': true,
                  'gcal-2': true,
                  'gcal-3': true,
                },
              }));
              setGoogleImport(false);
            }}
            onClose={() => setGoogleImport(false)}
          />
        </View>
      )}
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
