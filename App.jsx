import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, useColorScheme, StatusBar, Modal } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import { Roboto_500Medium, Roboto_400Regular } from '@expo-google-fonts/roboto';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { StoreProvider, useStore } from './src/store';
import { buildTheme, onChrome, chromeLine, S, R, FONT, elev } from './src/theme';
import Icon, { Marca } from './src/Icon';
import { FEM, DE } from './src/data';
import { EUR, dayLabel, TODAY, TODAY_KEY, warrantyDaysLeft, semanaDeHoje, plural } from './src/format';
import Login from './src/screens/Login';
import Inicio from './src/screens/Inicio';
import Dinheiro from './src/screens/Dinheiro';
import Tarefas from './src/screens/Tarefas';
import Compras from './src/screens/Compras';
import ModoCompras from './src/screens/ModoCompras';
import Agenda from './src/screens/Agenda';
import Equipamentos from './src/screens/Equipamentos';
import Saude from './src/screens/Saude';
import Gestao from './src/screens/Gestao';
import Documentacao from './src/screens/Documentacao';
import FichaSaude from './src/screens/FichaSaude';
import Perfil from './src/screens/Perfil';
import KidApp from './src/KidApp';
import GoogleCalendarImportModal from './src/modals/GoogleCalendarImportModal';
import Confirm from './src/Confirm';
import { APP_VERSION } from './src/registo-app';
import * as servidor from './src/pocketbase';

const TODAY_ANO = TODAY.y;

// A lista que o ecrã mostra quando não há agenda da Google ligada. Está aqui,
// e não dentro do JSX, para ser óbvio que é demonstração e não dados.
const EVENTOS_DE_DEMONSTRACAO = [
  { id: 'gcal-1', title: 'Reunião de equipa', date: 'd2026-08-28', time: '14:00', isRecurring: false, description: '' },
  { id: 'gcal-2', title: 'Almoço com a mãe', date: 'd2026-08-29', time: '12:30', isRecurring: false, description: 'Restaurante Taberna' },
  { id: 'gcal-3', title: 'Chamada com o cliente', date: 'd2026-08-30', time: '10:00', isRecurring: true, description: 'Reunião semanal' },
];

// Os subtítulos vêm da semana e do mês da app, não escritos à mão. O da
// Agenda dizia «20 – 26 de agosto» — a semana a começar em hoje — onde a
// referência 08 diz «17 – 23»; o do Dinheiro não existia; os das Tarefas e
// das Compras não começavam por «Semana de 17/08» como nas referências 06 e 07.
const TABS = [
  { key: 'inicio',   label: 'Início',   icon: 'home',        title: 'Nossa Casa',
    sub: (ctx) => `Família ${ctx.casa} · ${plural(ctx.nMembros, 'membro', 'membros')}` },
  { key: 'dinheiro', label: 'Dinheiro', icon: 'wallet',      title: 'Dinheiro',
    sub: (ctx) => `Conta conjunta · ${ctx.mes} de ${TODAY_ANO}` },
  { key: 'tarefas',  label: 'Tarefas',  icon: 'checkSquare', title: 'Tarefas',
    sub: (ctx) => `${ctx.semana.curta} · rotinas e tarefas` },
  { key: 'compras',  label: 'Compras',  icon: 'fileDone',    title: 'Lista de Compras',
    sub: (ctx) => `${ctx.semana.curta} · partilhada com 2 adultos` },
  { key: 'agenda',   label: 'Agenda',   icon: 'calendar',    title: 'Agenda',
    sub: (ctx) => ctx.semana.intervalo },
];

function Shell() {
  const { s, set, importGoogleEvents, remaining, allEvents, allTasks,
          canSeeHealth, healthOf, docsOf, allEquip, membros: MEMBERS, nomeDaCasa,
          lerDoServidor } = useStore();
  const sysDark = useColorScheme() === 'dark';
  const [user, setUser] = useState(null);      // nome do membro ligado
  const [tab, setTab] = useState('inicio');
  const [kidTab, setKidTab] = useState('tarefas');  // aba na KidApp
  const [perfil, setPerfil] = useState(false);
  const [signOut, setSignOut] = useState(false);
  const [saude, setSaude] = useState(false);
  const [equip, setEquip] = useState(false);
  const [gestao, setGestao] = useState(false);
  const [doc, setDoc] = useState(false);
  const [loja, setLoja] = useState(false);   // modo de compras na loja
  const [ficha, setFicha] = useState(null); // membro cuja ficha de saúde está aberta
  const [marcarPara, setMarcarPara] = useState(null); // membro a pré-seleccionar ao marcar
  const [googleImport, setGoogleImport] = useState(false);
  // Os eventos da agenda da Google. Vazio até haver token — e havendo, vêm da
  // API a sério, não de uma lista escrita no código.
  const [eventosGoogle, setEventosGoogle] = useState(EVENTOS_DE_DEMONSTRACAO);
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

  // Retomar a sessão que já existe.
  //
  // O PocketBase guarda-a em disco e ela sobrevive a fechar a app — mas o
  // `user` é estado do React e arranca a null, portanto a app mandava toda a
  // gente para o ecrã de entrada a cada recarga. Com a Google isso é uma
  // janela de consentimento de cada vez que se abre a app, para uma sessão
  // que já estava válida ali ao lado.
  useEffect(() => {
    if (user) return;
    let vivo = true;
    (async () => {
      const m = servidor.auth.valida() ? servidor.auth.membro() : null;
      if (!m || !vivo) return;
      await lerDoServidor();          // a casa antes do nome, para o quadro já o ter
      if (vivo) setUser(m.nome);
    })();
    return () => { vivo = false; };
  }, []);

  // A importação da agenda, ao entrar. Com token da Google, os eventos vêm da
  // agenda a sério; sem ele fica a lista de demonstração, para a app continuar
  // a mostrar o ecrã sem credenciais nenhumas.
  useEffect(() => {
    if (!user || !MEMBERS[user] || MEMBERS[user].kid) return;
    const jaViu = s.googleCalendarImported && Object.keys(s.googleCalendarImported).length > 0;
    if (jaViu) return;

    let vivo = true;
    (async () => {
      if (servidor.google.disponivel()) {
        try {
          const reais = await servidor.google.eventos({ dias: 30, max: 50 });
          if (vivo && reais.length) setEventosGoogle(reais);
        } catch (e) { /* sem autorização da agenda — fica a demonstração */ }
      }
      if (vivo) setGoogleImport(true);
    })();
    return () => { vivo = false; };
  }, [user, s.googleCalendarImported]);

  // Quem entrou, tal como o quadro da casa o conhece. Pode ser `undefined`
  // durante um instante: quem entra pela Google chega com um nome que a loja
  // ainda não tem, porque no arranque não havia sessão e a leitura da casa
  // voltou vazia. Ler `MEMBERS[user].kid` sem guarda rebentava a app inteira
  // aí — ecrã branco, «Cannot read properties of undefined (reading 'kid')».
  const euNaCasa = user ? MEMBERS[user] : null;

  // Entrar relê a casa: é a seguir à sessão que o servidor responde com os
  // membros a sério. Sem isto, quem entrava ficava com o seu nome e a família
  // de demonstração ao lado.
  const entrar = async (nome) => {
    setUser(nome);
    await lerDoServidor();
  };

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

  if (!user) return <Login t={t} onEnter={entrar} />;

  // Entrou, mas não vive nesta casa.
  //
  // Acontece de verdade: alguém entra com uma conta Google cujo membro foi
  // tirado da casa entretanto, ou o servidor deixou de responder e a app ficou
  // com a família de demonstração ao lado de um nome que não é dela. Antes
  // disto a app rebentava aqui — ecrã branco, sem uma palavra sobre porquê.
  if (!euNaCasa) {
    return (
      <View style={{ flex: 1, backgroundColor: t.chrome, alignItems: 'center',
        justifyContent: 'center', paddingHorizontal: 32, gap: S.lg }}>
        <StatusBar barStyle="light-content" />
        <Icon name="lock" size={44} color="#FFFFFF" />
        <Text style={{ fontFamily: FONT.display, fontSize: 20, color: '#FFFFFF', textAlign: 'center' }}>
          {user} não faz parte desta casa
        </Text>
        <Text style={{ fontFamily: FONT.ui, fontSize: 13.5, lineHeight: 21,
          color: 'rgba(255,255,255,0.75)', textAlign: 'center' }}>
          A conta entrou, mas não está entre os membros de {nomeDaCasa}. Peça a
          quem administra a casa que a acrescente, e entre outra vez.
        </Text>
        <Pressable onPress={() => { servidor.auth.sair(); setUser(null); }}
          accessibilityRole="button" accessibilityLabel="Voltar à entrada"
          style={{ minHeight: 44, paddingHorizontal: S.xl, borderRadius: R.pill, borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.45)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: FONT.display, fontSize: 14.5, color: '#FFFFFF' }}>
            Voltar à entrada
          </Text>
        </Pressable>
      </View>
    );
  }

  // Renderizar KidApp se o utilizador for uma criança
  if (euNaCasa?.kid) {
    return <KidApp kid={user} kidTab={kidTab} setKidTab={setKidTab} onLogout={() => setUser(null)} />;
  }

  const meta = TABS.find(x => x.key === tab);
  const ctxSub = { semana: semanaDeHoje(), mes: s.monthName,
    casa: nomeDaCasa, nMembros: Object.keys(MEMBERS).length };
  const Screen = { dinheiro: Dinheiro, tarefas: Tarefas, compras: Compras, agenda: Agenda }[tab];

  // Header dinâmico para Início; fixo para outros ecrãs.
  //
  // A data vem do TODAY da app, não do relógio. O cabeçalho lia `new Date()` e
  // o conteúdo lia TODAY, portanto a app dizia «Sábado, 29/08» em cima e
  // «Quinta, 20/08» duas linhas abaixo — contradizia-se sobre que dia era.
  const isHome = tab === 'inicio';
  const greet = 'Bom dia';
  const today = dayLabel(TODAY_KEY).replace('Hoje · ', '');
  const eventosHoje = allEvents()
    .filter(e => e.day === TODAY_KEY && (e.shared || e.owner === user)).length;
  const tarefasHoje = allTasks().filter(x => x.today).length;

  // ── Vistas de ecrã inteiro ───────────────────────────────────────────────
  // Saúde, Equipamentos, Gestão e Documentação abriam como cartões centrados
  // com véu, e o cabeçalho da app ficava cortado a meio por trás — via-se
  // «82,60 €» partido ao meio. Nas referências (11, 13, 15, 17) são vistas de
  // ecrã inteiro com cabeçalho PRÓPRIO — seta de voltar, ícone, título e
  // contagem — e o rodapé da app por baixo, intacto, com o separador aceso.
  //
  // Não é uma excepção ao INVARIANTE #1: continua a haver cabeçalho e rodapé
  // em todas as janelas. O que muda é o conteúdo do cabeçalho.
  const contas = (n, s1, s2) => `${n} ${n === 1 ? s1 : s2}`;
  const vistas = {
    saude: {
      icon: 'heartPulse', titulo: 'Saúde da Família', fechar: () => setSaude(false),
      sub: () => {
        const membros = Object.keys(MEMBERS).filter(m => canSeeHealth(m, user));
        const c = membros.reduce((a, m) => a + healthOf(m, user).length, 0);
        const d = membros.reduce((a, m) => a + docsOf(m, user).length, 0);
        return `${contas(c, 'consulta', 'consultas')} · ${contas(d, 'documento', 'documentos')}`;
      },
      render: () => <Saude t={t} user={user} onClose={() => setSaude(false)}
        onAbrirFicha={setFicha}
        marcarPara={marcarPara} onMarcado={() => setMarcarPara(null)} />,
    },
    // A ficha de um membro é uma vista como as outras. Desenhava um cabeçalho
    // próprio dentro do conteúdo e ficavam dois empilhados: o «Saúde da
    // Família» da vista e o «Saúde do Léo» dela. A referência 16 substitui.
    ficha: {
      icon: 'heartPulse', fechar: () => setFicha(null),
      titulo: ficha === user ? 'A minha ficha' : `Saúde ${ficha ? DE(ficha) : 'do'} ${ficha}`,
      sub: () => (ficha === user ? 'Privada — mais ninguém a vê' : 'Visível aos adultos da casa'),
      render: () => <FichaSaude t={t} member={ficha} user={user}
        onBack={() => setFicha(null)}
        onMarcar={() => { setMarcarPara(ficha); setFicha(null); setSaude(true); }} />,
    },
    equip: {
      icon: 'houseGear', titulo: 'Equipamentos da Casa', fechar: () => setEquip(false),
      sub: () => {
        const eq = allEquip();
        const emGarantia = eq.filter(e => warrantyDaysLeft(e) >= 0).length;
        return `${contas(eq.length, 'equipamento', 'equipamentos')} · ${emGarantia} em garantia`;
      },
      render: () => <Equipamentos t={t} user={user} onClose={() => setEquip(false)} />,
    },
    gestao: {
      icon: 'sliders', titulo: 'Gestão da Casa', fechar: () => setGestao(false),
      sub: () => `${user} · ${s.roles[user] === 'admin' ? (FEM(user) ? 'administradora' : 'administrador') : 'adulto'}`,
      render: () => <Gestao t={t} user={user} onClose={() => setGestao(false)} />,
    },
    doc: {
      icon: 'fileText', titulo: 'Documentação', fechar: () => setDoc(false),
      sub: () => `Versão ${APP_VERSION}`,
      render: () => <Documentacao t={t} onClose={() => setDoc(false)} />,
    },
    loja: {
      icon: 'fileDone', titulo: 'Modo Compras', fechar: () => setLoja(false),
      sub: () => `${s.shopPlan.who} · ${s.stores[s.shopPlan.store]} · ${s.shopPlan.time}`,
      render: () => <ModoCompras t={t} user={user} onClose={() => setLoja(false)} />,
    },
  };
  // A ficha vem primeiro: abre-se de dentro da Saúde e é ela que manda no
  // cabeçalho enquanto estiver aberta.
  const vistaAberta = ficha ? 'ficha' : saude ? 'saude' : equip ? 'equip'
    : gestao ? 'gestao' : doc ? 'doc' : loja ? 'loja' : null;
  const V = vistaAberta ? vistas[vistaAberta] : null;

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

      {/* cabeçalho — minHeight garante que nunca colapsa (INVARIANTE #1)
          `flex: 0` NÃO serve aqui: o react-native-web traduz isso para
          `0 1 0%`, ou seja base zero e encolhível, e a caixa fica com a altura
          do minHeight seja qual for o conteúdo. Com os três números do Início
          isso cortava 44 px em silêncio, porque há `overflow: hidden`.
          flexGrow 0 + flexShrink 0 + basis auto é o que se quer dizer. */}
      <View style={{
        flexGrow: 0, flexShrink: 0, flexBasis: 'auto',
        minHeight: 80, backgroundColor: t.chrome, overflow: 'hidden',
        paddingTop: insets.top + 10, paddingBottom: 24, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', gap: 12, ...elev(3),
      }}>
        <Marca size={120} mono opacity={0.10}
          style={{ position: 'absolute', top: insets.top + 4, right: -24 }} />

        {V ? (
          // Vista de ecrã inteiro: o cabeçalho passa a ser o dela.
          <>
            <Pressable onPress={V.fechar} accessibilityRole="button" accessibilityLabel="Voltar"
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
                marginLeft: -10 }}>
              <Icon name="arrowLeft" size={24} color="#FFFFFF" />
            </Pressable>
            <Icon name={V.icon} size={26} color="#FFFFFF" />
            <View style={{ flex: 1, gap: 2 }}>
              <Text numberOfLines={1} style={{ fontFamily: FONT.display, fontSize: 20,
                fontWeight: '500', color: '#FFFFFF', letterSpacing: 0.25 }}>{V.titulo}</Text>
              <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 12, color: onC }}>
                {V.sub()}
              </Text>
            </View>
          </>
        ) : isHome ? (
          // Início: saudação, data, e os três números — dentro do cabeçalho,
          // como em docs/referencia/04-inicio.png. Estavam no conteúdo, numa
          // linha de texto, e a saudação aparecia duas vezes.
          <View style={{ flex: 1, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: FONT.display, fontSize: 24, fontWeight: '600',
                  color: '#FFFFFF', letterSpacing: 0.3 }}>{greet}, {user}</Text>
                <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: onC }}>{today}</Text>
              </View>
              {/* A referência tem aqui uma lupa, e em todos os cabeçalhos.
                  Não a ponho enquanto não houver pesquisa: eu próprio a tinha
                  posto neste ecrã sem `onPress`, e um controlo que parece
                  tocável e não faz nada é o defeito que passei o dia a tirar
                  do Perfil e do Dinheiro. Fica por fazer, não por esquecer. */}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
              {[['Disponível', EUR(remaining)],
                ['Tarefas hoje', String(tarefasHoje)],
                ['Eventos', String(eventosHoje)]].map(([rot, val], i) => (
                <View key={rot} style={{ flex: 1, flexDirection: 'row' }}>
                  {/* O separador segue a luminância do cabeçalho, como o
                      subtítulo. Um alfa fixo desaparecia nos esquemas claros —
                      é o erro nº 4 da lista do CLAUDE.md. */}
                  {i > 0 ? <View style={{ width: 1, backgroundColor: chromeLine(t.chrome),
                    marginRight: 14 }} /> : null}
                  <View style={{ gap: 3 }}>
                    <Text style={{ fontFamily: FONT.ui, fontSize: 11, color: onC }}>{rot}</Text>
                    <Text style={{ fontFamily: FONT.display, fontSize: 19, fontWeight: '500',
                      color: '#FFFFFF' }}>{val}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : (
          // Header fixo para outros ecrãs
          <>
            <Icon name={meta.icon} size={26} color="#FFFFFF" />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: '500',
                color: '#FFFFFF', letterSpacing: 0.25 }}>{meta.title}</Text>
              <Text numberOfLines={2} style={{ fontFamily: FONT.ui, fontSize: 12, color: onC }}>{meta.sub(ctxSub)}</Text>
            </View>
          </>
        )}

        {/* INVARIANTE #5: o círculo tem 36, como na referência 04, mas o alvo
            tem 44 — o desenho é o do protótipo e o toque é o da regra. Estava
            a ser um alvo de 36, medido no navegador. */}
        <Pressable onPress={() => setPerfil(true)} accessibilityRole="button"
          accessibilityLabel="Perfil e ajustes"
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 36, height: 36, borderRadius: R.pill, backgroundColor: '#FFFFFF',
            borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
            alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: '500', color: t.chrome }}>
              {euNaCasa.initial}
            </Text>
          </View>
        </Pressable>
      </View>

      {/* área de scroll — o mesmo sítio para os separadores e para as vistas
          de ecrã inteiro. Antes as vistas eram um cartão centrado com véu por
          cima disto, e o cabeçalho ficava cortado a meio por trás. */}
      <View style={{ flex: 1, minHeight: 0 }}>
        <ScrollView style={{ flex: 1, minHeight: 0 }}
          contentContainerStyle={{ padding: 16, gap: S.xl, paddingBottom: S.xl }}>
          {V ? V.render()
            : tab === 'inicio'
              ? <Inicio t={t} user={user} go={setTab}
                  onSaude={() => setSaude(true)} onEquip={() => setEquip(true)} />
              : <Screen t={t} user={user} go={setTab} onEquip={() => setEquip(true)}
                  onModoCompras={() => setLoja(true)} />}
        </ScrollView>
      </View>

      {/* rodapé — último filho da raiz, sempre (INVARIANTE #1) */}
      <View style={{
        flexGrow: 0, flexShrink: 0, flexBasis: 'auto',
        minHeight: 60, backgroundColor: t.chrome, flexDirection: 'row',
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
      {/* Terminar sessão pede confirmação — é uma ação que não se desfaz
          com um toque, e o perfil fica visível por trás para dar contexto. */}
      {perfil ? <Perfil t={t} user={user} onClose={() => setPerfil(false)}
        onSignOut={() => setSignOut(true)}
        onSaude={() => setSaude(true)} onDoc={() => setDoc(true)}
        onGestao={() => setGestao(true)} /> : null}

      {signOut ? (
        <Confirm t={t} destructive icon="warning"
          title="Terminar sessão?"
          message="Volta ao ecrã de entrada. Os dados da casa ficam guardados neste dispositivo."
          confirmLabel="Terminar sessão"
          onCancel={() => setSignOut(false)}
          onConfirm={() => { setSignOut(false); setPerfil(false); setUser(null); }} />
      ) : null}

      {/* Google Calendar Import Modal */}
      {googleImport && user && euNaCasa && !euNaCasa.kid && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
          paddingHorizontal: 24, paddingTop: 24, paddingBottom: 90 }}>
          <GoogleCalendarImportModal
            t={t}
            events={eventosGoogle}
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
              // Marca os que estão à frente, não três identificadores escritos
              // à mão: com eventos reais da agenda, `gcal-1..3` não existem e
              // o «Agora não» deixava de ter efeito — o ecrã voltaria a abrir.
              set(x => ({
                googleCalendarImported: {
                  ...x.googleCalendarImported,
                  ...Object.fromEntries(eventosGoogle.map(e => [e.id, true])),
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
