// O registo da casa, preparado para se LER — puro, sem React.
//
// 14/09/2026, `design/registo-da-casa.dc.html`: o registo «Nesta casa» passa a
// ter a linha da Agenda (hora · bola de quem · título com o detalhe por baixo ·
// pastilha da área · seta) e os dias como secções. Cada entrada do registo é
// uma frase só («Meta criada: Bicicleta da Mia · 550,00 €»); aqui parte-se em
// título e detalhe, dobram-se as repetições seguidas e agrupa-se por dia. Tudo
// o que decide o que se mostra vive aqui, provado; o ecrã só desenha.
import { WD, dkey, dayLabel, pad2 } from './format';

// O título é o texto até ao primeiro « · » ou «: »; o resto é o detalhe. Sem
// separador, o texto inteiro é o título.
export function tituloEDetalhe(texto) {
  const s = String(texto == null ? '' : texto).trim();
  const m = s.match(/^(.+?)(?:\s·\s|:\s)(.+)$/);
  return m ? { titulo: m[1].trim(), detalhe: m[2].trim() } : { titulo: s, detalhe: '' };
}

const chaveDoDia = (at) => {
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? null : dkey(d.getFullYear(), d.getMonth(), d.getDate());
};

export const horaDe = (at) => {
  if (!at) return '';
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? '' : `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

// Entradas IGUAIS seguidas (o mesmo texto, a mesma pessoa), até 36 horas de
// distância entre a primeira e a última, ficam uma só: «4 vezes entre sábado e
// domingo». A lista vem do mais recente para o mais antigo, e a dobra respeita
// essa ordem — a entrada que fica é a mais recente, com `vezes`, `de`, `ate` e
// as `originais` para quem quiser abrir.
const JANELA_DA_DOBRA = 36 * 60 * 60 * 1000;
export function dobrarRepeticoes(linhas) {
  const saida = [];
  for (const r of linhas || []) {
    const u = saida[saida.length - 1];
    const igual = u && u.t === r.t && (u.quem || null) === (r.quem || null)
      && r.at && u.ate && (u.ate - r.at) <= JANELA_DA_DOBRA;
    if (igual) {
      u.vezes += 1;
      u.de = Math.min(u.de, r.at);
      u.originais.push(r);
    } else {
      saida.push({ ...r, vezes: 1, de: r.at || 0, ate: r.at || 0, originais: [r] });
    }
  }
  return saida;
}

const nomeDoDia = (at) => {
  const d = new Date(at);
  return WD[(d.getDay() + 6) % 7].toLowerCase();
};

// «4 vezes entre sábado e domingo», ou «3 vezes» se tudo no mesmo dia.
export function descricaoDasVezes(linha) {
  if (!linha || !(linha.vezes > 1)) return '';
  const mesmoDia = chaveDoDia(linha.de) === chaveDoDia(linha.ate);
  if (mesmoDia) return `${linha.vezes} vezes`;
  return `${linha.vezes} vezes entre ${nomeDoDia(linha.de)} e ${nomeDoDia(linha.ate)}`;
}

// O detalhe que vai por baixo do título: quem fez, e o resto da frase (ou as
// vezes, quando é uma dobra). Sem quem (um registo escrito antes de haver casa
// ligada), fica só o resto.
export function detalheDaLinha(linha) {
  const { detalhe } = tituloEDetalhe(linha.t);
  const partes = [linha.quem || null, linha.vezes > 1 ? descricaoDasVezes(linha) : detalhe || null].filter(Boolean);
  return partes.join(' · ');
}

// Grupos por dia, na ordem em que as linhas vêm (mais recente primeiro), com o
// rótulo da Agenda («Hoje · Segunda, 14/09»). Sem data, um grupo «Sem data».
export function agruparPorDia(linhas) {
  const grupos = [];
  for (const r of linhas || []) {
    const chave = r.at ? chaveDoDia(r.at) : null;
    const rotulo = chave ? dayLabel(chave) : 'Sem data';
    const u = grupos[grupos.length - 1];
    if (u && u.chave === chave) u.linhas.push(r);
    else grupos.push({ chave, rotulo, linhas: [r] });
  }
  return grupos;
}
