import { dkey, TODAY, TODAY_KEY, TOMORROW_KEY, chaveRelativa, dmyRelativo,
         diaEMesRelativo, ddmmRelativo, mesEAnoRelativo } from './format';

// `fem` é o género gramatical, e está aqui porque é uma propriedade da pessoa
// — não uma coisa que se adivinhe do nome. Havia três sítios a fazer
// `nome === 'Rita' || nome === 'Mia'` e um deles esquecia-se: a ficha da Mia
// dizia «Saúde do Mia».
export const MEMBERS = {
  'Rita':  { initial: 'R', email: 'rita.bengui@gmail.com', kid: false, fem: true },
  'Tomás': { initial: 'T', email: 'tomas.bengui@gmail.com', kid: false, fem: false },
  'Léo':   { initial: 'L', email: null, kid: true, fem: false },
  'Mia':   { initial: 'M', email: null, kid: true, fem: true },
};

// «de» contraído com o artigo: «Saúde da Mia», «Saúde do Léo».
export const DE = (nome) => (MEMBERS[nome] && MEMBERS[nome].fem ? 'da' : 'do');
// Concordância de adjetivo: administradora / administrador.
export const FEM = (nome) => !!(MEMBERS[nome] && MEMBERS[nome].fem);

export const ROLES = { 'Rita': 'admin', 'Tomás': 'adulto', 'Léo': 'crianca', 'Mia': 'crianca' };

export const SECTIONS = ['Frutas & Legumes', 'Frescos', 'Mercearia', 'Casa'];

export const ENV_BASE = [
  { name: 'Mercearia',         used: 412, limit: 550, color: '#1890FF' },
  { name: 'Crianças & escola', used: 318, limit: 340, color: '#FAAD14' },
  { name: 'Casa & contas',     used: 486, limit: 700, color: '#1890FF' },
  { name: 'Sair & lazer',      used: 171, limit: 180, color: '#FF4D4F' },
];

// urg: 0 urgente · 1 normal · 2 sem pressa
export const TASKS = [
  { id: 'lixo',    title: 'Pôr o lixo na rua',          who: 'Léo',   meta: 'Rotina de quinta · 20:30', pts: 3, today: true, recur: 'Dias de semana', urg: 0, due: TODAY_KEY,    dueTime: '20:30' },
  { id: 'mesa',    title: 'Levantar a mesa do jantar',  who: 'Mia',   meta: 'Rotina diária',            pts: 2, today: true, done: true, recur: 'Todos os dias', urg: 1 },
  { id: 'mochila', title: 'Arrumar a mochila da escola',who: 'Léo',   meta: 'Dias de semana · 21:00',   pts: 2, today: true, recur: 'Dias de semana', urg: 1, due: TODAY_KEY,    dueTime: '21:00' },
  { id: 'roupa',   title: 'Máquina de roupa + estender',who: 'Tomás', meta: 'Terça e sábado',           pts: 0, today: true, recur: 'Uma vez', urg: 0, due: TODAY_KEY, dueTime: '18:00' },
  { id: 'plantas', title: 'Regar as plantas da varanda',who: 'Mia',   meta: 'Quarta e domingo',         pts: 2, recur: 'Uma vez', urg: 2, due: TOMORROW_KEY, dueTime: '19:00' },
  { id: 'meds',    title: 'Vitamina D das crianças',    who: 'Rita',  meta: 'Rotina diária · manhã',    pts: 0, done: true, recur: 'Todos os dias', urg: 1 },
];

export const ITEMS = [
  { id: 'maca',   s: 0, label: 'Maçã reineta · 1,5 kg',     est: 3.40, by: `Adicionado por Rita · ${ddmmRelativo(-1)}` },
  { id: 'cen',    s: 0, label: 'Cenoura · 1 kg',            est: 1.20, staple: true, by: 'Artigo habitual · semanal' },
  { id: 'ban',    s: 0, label: 'Banana · 1 kg',             est: 1.85, real: 1.85, by: `Comprado por Tomás · ${ddmmRelativo(-1)}` },
  { id: 'leite',  s: 1, label: 'Leite meio-gordo · 6 un.',  est: 5.10, staple: true, by: 'Artigo habitual · semanal' },
  { id: 'iog',    s: 1, label: 'Iogurtes das crianças · 8', est: 4.60, by: `Adicionado pela Mia · ${ddmmRelativo(0)}` },
  { id: 'queijo', s: 1, label: 'Queijo flamengo fatiado',   est: 3.20, staple: true, by: 'Artigo habitual' },
  { id: 'mant',   s: 1, label: 'Manteiga sem sal',          est: 2.50, by: `Adicionado por Rita · ${ddmmRelativo(0)}` },
  { id: 'arroz',  s: 2, label: 'Arroz agulha · 1 kg',       est: 1.30, staple: true, by: 'Artigo habitual' },
  { id: 'massa',  s: 2, label: 'Massa espirais · 500 g',    est: 0.95, by: `Adicionado por Tomás · ${ddmmRelativo(0)}` },
  { id: 'cafe',   s: 2, label: 'Café moído · 250 g',        est: 3.80, staple: true, by: 'Artigo habitual' },
  { id: 'pao',    s: 2, label: 'Pão de forma',              est: 1.60, by: 'Adicionado por Rita · há 3 min' },
  { id: 'papel',  s: 3, label: 'Papel de cozinha · 6 rolos',est: 4.20, staple: true, by: 'Artigo habitual' },
  { id: 'det',    s: 3, label: 'Detergente da louça',       est: 2.30, staple: true, by: 'Artigo habitual' },
];

export const EVENTS = [
  { id: 'e1', day: TODAY_KEY,    time: '08:40', title: 'Levar o Léo à escola',    who: 'Tomás · Escola Básica do Restelo', owner: 'Tomás', shared: true },
  { id: 'e2', day: TODAY_KEY,    time: '15:30', title: 'Ballet da Mia',           who: 'Rita · até às 16:30',              owner: 'Rita',  shared: true },
  { id: 'e3', day: TODAY_KEY,    time: '18:00', title: 'Consulta do dentista',    who: 'Tomás · Dr.ª Neves',               owner: 'Tomás', shared: false },
  { id: 'e4', day: TOMORROW_KEY, time: '09:00', title: 'Reunião de pais — 2.º ano', who: 'Rita e Tomás',                   owner: 'Rita',  shared: true },
  { id: 'e5', day: TOMORROW_KEY, time: '17:00', title: 'Natação do Léo',          who: 'Rita · Léo',                       owner: 'Léo',   shared: true },
  { id: 'e6', day: chaveRelativa(3), time: '10:30', title: 'Compras da semana',  who: 'Tomás · lista com 13 artigos',     owner: 'Tomás', shared: true },
  { id: 'e7', day: chaveRelativa(3), time: '16:00', title: 'Anos da Clara — festa', who: 'Mia · levar prenda',            owner: 'Mia',   shared: true },
];

export const EQUIP = [
  { id: 'maq',  name: 'Máquina de lavar roupa Bosch', cat: 'Eletrodomésticos', bought: dmyRelativo(-526), shop: 'Worten · Colombo',        price: 549,  warrantyEnd: dmyRelativo(203),   daysLeft: 203,   maint: 'Limpeza do filtro',           maintDate: dmyRelativo(26) },
  { id: 'frig', name: 'Frigorífico Samsung RB34',     cat: 'Eletrodomésticos', bought: dmyRelativo(-1051), shop: 'El Corte Inglés',         price: 899,  warrantyEnd: dmyRelativo(44),    daysLeft: 44,    maint: 'Substituição do filtro de água', maintDate: dmyRelativo(39) },
  { id: 'cald', name: 'Caldeira Vulcano 24 kW',       cat: 'Aquecimento',      bought: dmyRelativo(-1736), shop: 'Instalador Aquatérmica',  price: 1250, warrantyEnd: dmyRelativo(-1007), daysLeft: -1007, maint: 'Revisão anual obrigatória',   maintDate: dmyRelativo(74) },
  { id: 'dell', name: 'Portátil Dell da Rita',        cat: 'Informática',      bought: dmyRelativo(-212), shop: 'Dell Online',             price: 1099, warrantyEnd: dmyRelativo(517),   daysLeft: 517,   maint: '',                            maintDate: '' },
];

export const GOALS = [
  { name: 'Férias no Algarve', at: 1920, of: 3000, when: mesEAnoRelativo(345) },
  { name: 'Carro novo',        at: 6600, of: 30000, when: 'sem prazo' },
];

// Fichas de saúde. Uma consulta é um episódio: especialidade, médico, quando,
// e os anexos que lhe pertencem. Os documentos soltos ficam no arquivo clínico.
// As datas são deslocamentos em relação a hoje, não datas escritas: ver
// `chaveRelativa` em `format.js`. Eram explícitas, e quando o «hoje» deixou de
// estar preso a 20/08/2026 ficaram todas no passado.
export const HEALTH = [
  { id: 'h1', member: 'Mia',   specialty: 'Dentista',       doctor: 'Dr. Cardoso',
    day: chaveRelativa(8),  time: '10:00' },   // daqui a 8 dias
  { id: 'h2', member: 'Léo',   specialty: 'Pediatria',      doctor: 'Dr.ª Neves',
    day: chaveRelativa(-12), time: '16:30' },  // já passou
  { id: 'h3', member: 'Léo',   specialty: 'Oftalmologia',   doctor: 'Dr. Sequeira',
    day: chaveRelativa(29), time: '09:15' },   // daqui a um mês
  { id: 'h4', member: 'Rita',  specialty: 'Medicina geral', doctor: 'Dr.ª Pinto',
    day: chaveRelativa(-40), time: '11:00' },  // já passou, há mais tempo
];

// Arquivo clínico: documentos, ligados ou não a uma consulta.
export const HEALTH_DOCS = [
  { id: 'd1', member: 'Mia', healthId: 'h1', title: 'Plano ortodôntico', kind: 'Relatório' },
  { id: 'd2', member: 'Léo', healthId: 'h2', title: 'Análises ao sangue', kind: 'Resultado' },
  // Uma receita tem prazo, e é isso que a põe no «Precisa de Si» do Início.
  // Sem esta semente, a linha da referência não tinha dados por trás.
  { id: 'd3', member: 'Léo', healthId: 'h2', title: 'Ferro — 3 meses', kind: 'Receita',
    expires: chaveRelativa(21) },   // faltam 21 dias — é o que a põe no «Precisa de Si»
];

// Movimentos iniciais dos cofres. Vivem aqui, como as tarefas e os
// equipamentos: as sementes são código, e só o que o utilizador acrescenta é
// que se grava. Persistir as sementes fazia com que mudá-las não tivesse
// efeito em quem já tinha a app aberta.
export const VAULT = [
  { id: 'vm-l0', kid: 'Léo', delta: 8.30, kind: 'semanada', day: chaveRelativa(-18),
    label: 'Semanadas anteriores', sub: `até ${diaEMesRelativo(-18)}` },
  { id: 'vm-l1', kid: 'Léo', delta: -2.50, kind: 'retirada', day: chaveRelativa(-11),
    label: 'Retirada — cromos', sub: 'autorizado pelo Tomás' },
  { id: 'vm-l2', kid: 'Léo', delta: 5.00, kind: 'bonus', day: chaveRelativa(-6),
    label: 'Bónus — boletim escolar', sub: 'Rita' },
  { id: 'vm-l3', kid: 'Léo', delta: 1.60, kind: 'semanada', day: chaveRelativa(-3),
    label: `Semanada de ${diaEMesRelativo(-10)} a ${diaEMesRelativo(-4)}`,
    sub: `16 pt · pago a ${ddmmRelativo(-3)}` },
  { id: 'vm-m0', kid: 'Mia', delta: 7.40, kind: 'semanada', day: chaveRelativa(-18),
    label: 'Semanadas anteriores', sub: `até ${diaEMesRelativo(-18)}` },
  { id: 'vm-m1', kid: 'Mia', delta: -1.00, kind: 'retirada', day: chaveRelativa(-9),
    label: 'Retirada — gelado', sub: 'autorizado pela Rita' },
  { id: 'vm-m2', kid: 'Mia', delta: 1.40, kind: 'bonus', day: chaveRelativa(-7),
    label: 'Bónus — arrumou o quarto', sub: 'Tomás' },
  { id: 'vm-m3', kid: 'Mia', delta: 1.10, kind: 'semanada', day: chaveRelativa(-3),
    label: `Semanada de ${diaEMesRelativo(-10)} a ${diaEMesRelativo(-4)}`,
    sub: `11 pt · pago a ${ddmmRelativo(-3)}` },
];
