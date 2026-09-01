import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, useColorScheme, StatusBar, Modal, Image } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import { Roboto_500Medium, Roboto_400Regular } from '@expo-google-fonts/roboto';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { StoreProvider, useStore } from './src/store';
import { buildTheme, onChrome, chromeLine, S, R, FONT, elev, LARGURA_APP } from './src/theme';
import Icon, { Marca } from './src/Icon';
import { AvatarDeCabecalho } from './src/ui';
import { FEM, DE } from './src/data';
import { EUR, dayLabel, TODAY, TODAY_KEY, warrantyDaysLeft, semanaDeHoje, plural,
         chaveRelativa } from './src/format';
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

// A imagem do ecrã de entrada, reaproveitada como fundo à volta da coluna no
// monitor. É a mesma que o `Login.jsx` usa — uma só imagem, um só sítio de onde
// vem, e a app fica assente no mesmo sítio onde se entra nela.
const FUNDO_DA_ENTRADA = require('./assets/login-bg.png');

// A lista que o ecrã mostra quando não há agenda da Google ligada. Está aqui,
// e não dentro do JSX, para ser óbvio que é demonstração e não dados.
// Um evento da Google, na forma que o resto da app fala.
//
// A camada da Google devolve `titulo/dia/hora/recorrente/local` — nomes em
// português, como tudo em `src/pocketbase.js`. O aviso de importação e o
// `importGoogleEvents` falam `title/date/time/isRecurring/location`, que é a
// forma dos eventos de demonstração abaixo.
//
// Enquanto o aviso só via a demonstração, ninguém notou. Com a agenda ligada,
// o modal lia `e.title` num objecto que tinha `titulo` e mostrava uma LINHA EM
// BRANCO: uma caixa com uma marca de seleção, sem nome, sem data, a perguntar
// se a pessoa a quer na casa. Traduz-se aqui, na fronteira, para haver uma
// forma só a partir deste ponto.
const daGoogle = (e) => ({
  id: e.id,
  title: e.titulo,
  // `dia` vem sem prefixo e a app lê chaves com `d`. O `importGoogleEvents`
  // aceita as duas, mas o modal formata a data e precisa da chave.
  date: /^d/.test(String(e.dia)) ? e.dia : `d${e.dia}`,
  time: e.hora || '',
  isRecurring: !!e.recorrente,
  // `description` e não `location`: é o nome que o aviso lê para a terceira
  // parte da linha «data · hora · local». Um nome quase certo não mostra nada.
  description: e.local || '',
});

// Os eventos que o aviso de importação mostra numa casa de demonstração.
//
// Tinham as datas escritas — `d2026-08-28`, `29`, `30`. A 1 de setembro o
// aviso oferecia três eventos «novos» que já tinham passado: uma reunião na
// semana anterior, um almoço no sábado que já foi. São deslocamentos, como o
// resto das sementes.
const EVENTOS_DE_DEMONSTRACAO = [
  { id: 'gcal-1', title: 'Reunião de equipa', date: chaveRelativa(2), time: '14:00', isRecurring: false, description: '' },
  { id: 'gcal-2', title: 'Almoço com a mãe', date: chaveRelativa(3), time: '12:30', isRecurring: false, description: 'Restaurante Taberna' },
  { id: 'gcal-3', title: 'Chamada com o cliente', date: chaveRelativa(4), time: '10:00', isRecurring: true, description: 'Reunião semanal' },
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
  const { s, set, importGoogleEvents, idsGoogleDaCasa, remaining, allEvents, allTasks,
          canSeeHealth, healthOf, docsOf, allEquip, membros: MEMBERS, nomeDaCasa,
          lerDoServidor, removerEvento, eventosQueSairamDaGoogle } = useStore();
  const sysDark = useColorScheme() === 'dark';
  const [user, setUser] = useState(null);      // nome do membro ligado
  const [tab, setTab] = useState('inicio');
  // O que abrir ao chegar a um separador, vindo do Início. Limpa-se ao chegar,
  // senão voltar ao separador reabria a mesma folha para sempre.
  const [abrirNoTab, setAbrirNoTab] = useState(null);
  const [kidTab, setKidTab] = useState('tarefas');  // aba na KidApp
  const [perfil, setPerfil] = useState(false);
  const [signOut, setSignOut] = useState(false);
  const [saude, setSaude] = useState(false);
  const [equip, setEquip] = useState(false);   // true, ou o id do equipamento a abrir
  const [gestao, setGestao] = useState(false);
  const [doc, setDoc] = useState(false);
  const [loja, setLoja] = useState(false);   // modo de compras na loja
  const [ficha, setFicha] = useState(null); // membro cuja ficha de saúde está aberta
  const [marcarPara, setMarcarPara] = useState(null); // membro a pré-seleccionar ao marcar
  const [googleImport, setGoogleImport] = useState(false);
  // Abrir a folha de importação ao chegar à Agenda, vindo do Início.
  const [importarNaAgenda, setImportarNaAgenda] = useState(false);
  // Os eventos que saíram da agenda da Google e ainda estão nesta casa.
  // Guardam-se para PERGUNTAR — nunca se apagam sem resposta.
  const [saidosDaGoogle, setSaidosDaGoogle] = useState([]);
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
      // ESPERAR pela sessão gravada antes de a dar por ausente. Sem isto era
      // uma corrida: o `AsyncAuthStore` carrega o disco de forma assíncrona, e
      // quem perguntasse no instante do arranque recebia «não há sessão» com
      // uma válida a dois milissegundos de distância. Este efeito tem
      // dependências vazias — pergunta uma vez e nunca volta a tentar.
      await servidor.sessaoPronta();
      if (!vivo) return;
      const m = servidor.auth.valida() ? servidor.auth.membro() : null;
      if (!m || !vivo) return;
      await lerDoServidor();          // a casa antes do nome, para o quadro já o ter
      if (vivo) setUser(m.nome);
    })();
    return () => { vivo = false; };
  }, []);

  // A importação da agenda, ao entrar.
  //
  // ── Corria UMA VEZ na vida da casa ────────────────────────────────────────
  //
  // A guarda era «já importou alguma coisa? então não voltes a olhar», e com
  // isso o sentido Google → Nossa Casa funcionava no primeiro dia e nunca
  // mais. Um evento marcado na agenda da Google na semana seguinte não
  // aparecia aqui, e nada no ecrã dizia porquê.
  //
  // Agora olha sempre que se entra, e o que decide se o aviso abre é haver
  // eventos AINDA NÃO VISTOS — não o histórico da casa. Os dispensados ficam
  // marcados em `googleCalendarImported`, por isso o «Agora não» continua a
  // valer para aqueles e não para os que vierem depois.
  // ⚠ `MEMBERS` TEM de estar nas dependências.
  //
  // `entrar()` faz `setUser(nome)` e só DEPOIS lê a casa do servidor. O efeito
  // disparava com o nome já posto e o quadro ainda vazio, caía na primeira
  // linha — `!MEMBERS[user]` — e não voltava a correr, porque `MEMBERS` não
  // estava na lista. Resultado: entrar pela Google nunca pesquisava a agenda.
  // Só uma recarga da página o fazia, e aí já havia membros à partida.
  useEffect(() => {
    if (!user || !MEMBERS[user] || MEMBERS[user].kid) return;

    let vivo = true;
    (async () => {
      // Saber se a agenda está ligada NESTA conta, sempre que alguém entra.
      //
      // Antes só se perguntava quando a resposta era desconhecida. Se um
      // adulto saísse e o outro entrasse, ficava a resposta do primeiro — a
      // app dizia «ligada» a quem nunca a ligou, e depois falhava a cada
      // pedido sem explicar porquê.
      await servidor.google.verificar();
      if (!vivo) return;

      const jaVistos = s.googleCalendarImported || {};

      if (servidor.google.disponivel()) {
        try {
          const reais = await servidor.google.eventos({ dias: 30, max: 50 });
          if (!vivo) return;
          const nossos = idsGoogleDaCasa();
          // O que a app pôs na agenda da Google não volta como novidade.
          const novos = reais.filter(e => !jaVistos[e.id] && !nossos.has(e.id));
          if (novos.length) { setEventosGoogle(novos.map(daGoogle)); setGoogleImport(true); }

          // E o sentido inverso do apagar: o que SAIU da agenda da Google.
          // Pergunta-se — nunca se apaga sem resposta, porque quem apagou lá
          // pode querer o evento na casa mesmo assim.
          const saidos = eventosQueSairamDaGoogle(reais.map(x => x.id), 30);
          if (saidos.length) setSaidosDaGoogle(saidos);
        } catch (e) { /* autorização caducada — o botão da Agenda explica */ }
        return;
      }

      // Sem agenda ligada. Numa casa a sério não há nada para oferecer e o
      // aviso não abre: abrir uma lista de eventos inventados numa casa de
      // verdade seria pior do que não abrir nada.
      if (s.clearedSeeds) return;
      const novos = EVENTOS_DE_DEMONSTRACAO.filter(e => !jaVistos[e.id]);
      if (vivo && novos.length) { setEventosGoogle(novos); setGoogleImport(true); }
    })();
    return () => { vivo = false; };
  }, [user, MEMBERS, s.googleCalendarImported, s.clearedSeeds]);

  // Quem entrou, tal como o quadro da casa o conhece. Pode ser `undefined`
  // durante um instante: quem entra pela Google chega com um nome que a loja
  // ainda não tem, porque no arranque não havia sessão e a leitura da casa
  // voltou vazia. Ler `MEMBERS[user].kid` sem guarda rebentava a app inteira
  // aí — ecrã branco, «Cannot read properties of undefined (reading 'kid')».
  const euNaCasa = user ? MEMBERS[user] : null;

  // Entrar relê a casa: é a seguir à sessão que o servidor responde com os
  // membros a sério. Sem isto, quem entrava ficava com o seu nome e a família
  // de demonstração ao lado.
  // A linha do Início LEVA à folha de importação; não liga por conta própria.
  //
  // A primeira versão ligava aqui mesmo, e apanhava os erros num `catch` vazio
  // com um comentário a dizer que não havia onde os mostrar. O resultado é o
  // pior de todos: carregar no botão e não acontecer nada — nem a janela, nem
  // um aviso. Uma janela bloqueada pelo navegador dava exactamente isso.
  //
  // A folha da Agenda já sabe ligar E explicar: tem o botão, tem o sítio para
  // o erro, e a seguir mostra logo os eventos. Duas cópias da mesma coisa, uma
  // delas muda, é como se perde uma tarde.
  const ligarAgenda = () => { setImportarNaAgenda(true); setTab('agenda'); };

  const entrar = async (nome) => {
    // ⚠ A CASA antes do NOME, como na retoma da sessão logo acima.
    //
    // Estava ao contrário, e a diferença não era cosmética: o efeito que
    // pesquisa a agenda da Google corre quando o `user` muda, e caía logo no
    // `!MEMBERS[user]` porque o quadro ainda estava vazio. Entrar pela Google
    // nunca pesquisava a agenda — só uma recarga da página o fazia, e aí os
    // membros já estavam lá à partida.
    //
    // Nesta ordem, quem entra já encontra a casa montada: o quadro, o tema do
    // perfil e a agenda apanham-no todos no mesmo passo.
    await lerDoServidor();
    setUser(nome);
  };

  const mode = (user && s.themeByUser[user]) || 'claro';
  const dark = mode === 'escuro' || (mode === 'sistema' && sysDark);
  const t = buildTheme(user ? (s.schemeByUser[user] ?? 0) : 0, dark);

  // O que fica ao lado da coluna, no monitor.
  //
  // O `public/index.html` pinta o body de #001529 fixo, porque nasceu antes de
  // haver coluna limitada: não se via. Passou a ver-se, e uma cor lisa ao lado
  // da coluna é uma moldura que ninguém escolheu.
  //
  // Fica a MESMA imagem do ecrã de entrada, com o mesmo véu — `login-bg.png`
  // sob `rgba(0,0,0,0.6)`, como em `src/screens/Login.jsx`. A app deixa de
  // parecer uma janela a flutuar num rectângulo escuro e passa a estar assente
  // no sítio onde se entrou nela.
  //
  // O `t.chrome` fica por baixo como base: é o que se vê no instante antes de
  // a imagem carregar, e é o que fica se ela não carregar de todo.
  //
  // Em nativo não há `document` — nem há «ao lado da coluna», porque a app
  // ocupa o ecrã. O efeito não faz nada e é isso que se quer.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.backgroundColor = t.chrome;
    // ⚠ O `require` de uma imagem não devolve a mesma coisa nas duas
    // plataformas: em nativo é um número que o `resolveAssetSource` traduz;
    // no react-native-web é a própria URL, ou um objecto com ela lá dentro,
    // conforme o empacotador. Pedir só `.uri` dava `undefined` e o fundo ficava
    // uma cor lisa, sem erro nenhum a dizer porquê.
    const fonte = FUNDO_DA_ENTRADA;
    const uri = typeof fonte === 'string' ? fonte
      : (fonte && fonte.uri) ? fonte.uri
      : (fonte && fonte.default) ? fonte.default
      : (Image.resolveAssetSource ? (Image.resolveAssetSource(fonte) || {}).uri : null);
    if (uri) {
      // O véu vai num gradiente de dois pontos iguais: é a forma de escurecer
      // uma imagem de fundo em CSS sem lhe pôr um elemento por cima — e um
      // elemento por cima teria de viver na árvore da app, onde não pertence.
      document.body.style.backgroundImage =
        `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url("${uri}")`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundRepeat = 'no-repeat';
      // Fixa: sem isto a imagem acompanha o scroll do corpo e a moldura
      // parece deslizar por trás da coluna.
      document.body.style.backgroundAttachment = 'fixed';
    }
  }, [t.chrome]);
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
      render: () => <Equipamentos t={t} user={user} onClose={() => setEquip(false)}
        abrir={typeof equip === 'string' ? equip : null} />,
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
      sub: () => [s.shopPlan.who, (s.stores || [])[s.shopPlan.store], s.shopPlan.time]
        .filter(Boolean).join(' · '),
      render: () => <ModoCompras t={t} user={user} onClose={() => setLoja(false)} />,
    },
  };
  // A ficha vem primeiro: abre-se de dentro da Saúde e é ela que manda no
  // cabeçalho enquanto estiver aberta.
  const vistaAberta = ficha ? 'ficha' : saude ? 'saude' : equip ? 'equip'
    : gestao ? 'gestao' : doc ? 'doc' : loja ? 'loja' : null;
  const V = vistaAberta ? vistas[vistaAberta] : null;

  // No monitor, a coluna da app não se estica.
  //
  // Medido a 1440 px: o cartão de um evento tinha 1393 px de largura, com a
  // hora encostada à esquerda e a pastilha de visibilidade a mais de um metro
  // dela, e o rodapé de cinco separadores atravessava a janela toda. Não é um
  // desenho web — é o desenho de telemóvel esticado.
  //
  // O limite é 460: um telemóvel do tamanho do alvo (402) não nota nada, e no
  // monitor a app fica com a forma para que foi desenhada e medida. Faz-se com
  // maxWidth e margens automáticas na PRÓPRIA raiz, sem envolver nada: a raiz
  // é a coluna flex do INVARIANTE #1 e um <View> a mais em volta dela é
  // exactamente o erro #1 da lista do CLAUDE.md.
  const LARGURA_MAX = LARGURA_APP;
  // ⚠ INVARIANTE — ver CLAUDE.md
  // Cabeçalho e rodapé aparecem em TODAS as janelas. A raiz é uma coluna flex
  // com três filhos e a condição do rodapé não leva nada além de "estar na app":
  //   header  flex: none
  //   scroll  flex: 1, minHeight: 0
  //   footer  flex: none   ← último filho da raiz, sempre
  // Se um ecrã precisar de mais espaço, encolhe o conteúdo, não o rodapé.
  return (
    <View style={{ flex: 1, backgroundColor: t.page,
      width: '100%', maxWidth: LARGURA_MAX, marginHorizontal: 'auto' }}>
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

            {/* Os três números abrem o ecrã de onde vêm. Estavam a ser texto:
                o número das tarefas de hoje é a resposta curta, e o sítio onde
                se faz alguma coisa com ela é o ecrã das Tarefas. Tocar num
                número e não acontecer nada é o mesmo defeito da lupa aqui ao
                lado — a diferença é que este tem destino óbvio. */}
            <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
              {[['Disponível', EUR(remaining), 'dinheiro'],
                ['Tarefas hoje', String(tarefasHoje), 'tarefas'],
                ['Eventos', String(eventosHoje), 'agenda']].map(([rot, val, destino], i) => (
                <View key={rot} style={{ flex: 1, flexDirection: 'row' }}>
                  {/* O separador segue a luminância do cabeçalho, como o
                      subtítulo. Um alfa fixo desaparecia nos esquemas claros —
                      é o erro nº 4 da lista do CLAUDE.md. */}
                  {i > 0 ? <View style={{ width: 1, backgroundColor: chromeLine(t.chrome),
                    marginRight: 14 }} /> : null}
                  <Pressable onPress={() => setTab(destino)}
                    accessibilityRole="button" accessibilityLabel={`${rot}: ${val}`}
                    style={({ pressed }) => ({ flex: 1, minHeight: 44, justifyContent: 'center',
                      gap: 3, opacity: pressed ? 0.6 : 1 })}>
                    <Text style={{ fontFamily: FONT.ui, fontSize: 11, color: onC }}>{rot}</Text>
                    <Text style={{ fontFamily: FONT.display, fontSize: 19, fontWeight: '500',
                      color: '#FFFFFF' }}>{val}</Text>
                  </Pressable>
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
          <AvatarDeCabecalho t={t} nome={user} membro={euNaCasa} size={36} />
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
                  onSaude={() => setSaude(true)}
                  onEquip={(id) => setEquip(id || true)}
                  onFicha={(membro) => setFicha(membro)}
                  // Ir a um separador COM uma coisa em mão. Sem isto, tocar num
                  // evento do Início levava à Agenda e obrigava a procurá-lo
                  // outra vez — a app já sabia qual era.
                  onAbrir={(tabAlvo, id) => { setAbrirNoTab({ tab: tabAlvo, id }); setTab(tabAlvo); }}
                  agendaPorLigar={servidor.google.porLigar()}
                  onLigarAgenda={ligarAgenda} />
              : <Screen t={t} user={user} go={setTab} onEquip={() => setEquip(true)}
                  onModoCompras={() => setLoja(true)}
                  abrir={abrirNoTab && abrirNoTab.tab === tab ? abrirNoTab.id : null}
                  abrirImportar={tab === 'agenda' && importarNaAgenda}
                  onImportarAberto={() => setImportarNaAgenda(false)} />}
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
            <Pressable key={x.key} onPress={() => { setAbrirNoTab(null); setTab(x.key); }}
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

      {/* Apagados na agenda da Google — pergunta antes, e diz quais.

          O apagar tinha um sentido só: apagado aqui, apagado lá. Ao
          contrário não acontecia nada, e um evento apagado na Google ficava
          nesta casa a apitar à hora de uma coisa que já não existe.

          Pergunta-se, e diz-se QUAIS: apagar sozinho o que outra pessoa
          apagou noutro sítio é decidir por ela. */}
      {saidosDaGoogle.length ? (
        <Confirm t={t}
          icon="calendar"
          title={saidosDaGoogle.length === 1
            ? 'Um evento saiu da agenda da Google'
            : `${saidosDaGoogle.length} eventos saíram da agenda da Google`}
          message={
            (saidosDaGoogle.length === 1
              ? 'Já não está na agenda da Google, e continua nesta casa:\n\n'
              : 'Já não estão na agenda da Google, e continuam nesta casa:\n\n')
            + saidosDaGoogle.slice(0, 6).map(e => `· ${e.title} — ${dayLabel(e.day)}`).join('\n')
            + (saidosDaGoogle.length > 6 ? `\n· e mais ${saidosDaGoogle.length - 6}` : '')
            + '\n\nApagar também aqui? Escolhendo Manter, ficam na Nossa Casa e '
            + 'não se volta a perguntar por eles.'}
          confirmLabel={saidosDaGoogle.length === 1 ? 'Apagar aqui também' : 'Apagar todos aqui'}
          cancelLabel="Manter"
          destructive
          onConfirm={() => {
            // Só na app: na Google já não existem. Pedir a apagar outra vez
            // devolveria 410 — que o `apagarEvento` trata como sucesso, mas
            // é uma viagem à rede para nada.
            saidosDaGoogle.forEach(e => removerEvento(e.id));
            setSaidosDaGoogle([]);
          }}
          onCancel={() => {
            // «Manter» tem de ficar REGISTADO, senão a pergunta volta à
            // entrada seguinte, e à seguinte — e uma pergunta que se repete
            // ensina a responder sem ler.
            //
            // Corta-se a ligação (`idGoogle: null`), que é o que ela passou
            // a ser: o evento do lado de lá não existe, e nada há para
            // editar ou apagar lá. O evento fica na casa, como se tivesse
            // sido criado aqui.
            set(x => ({
              eventEdits: {
                ...x.eventEdits,
                ...Object.fromEntries(saidosDaGoogle.map(e => [e.id,
                  { ...(x.eventEdits[e.id] || {}), idGoogle: null }])),
              },
            }));
            setSaidosDaGoogle([]);
          }} />
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
            onImportar={(events, visibilidade) => {
              importGoogleEvents(events, user, visibilidade);
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
