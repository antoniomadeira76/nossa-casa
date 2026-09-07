import React from 'react';
import { View, Text, TextInput, Pressable, Image, Platform } from 'react-native';
import { S, R, elev, FONT, corDoMembro, comAlfa } from './theme';
import { EUR } from './format';
import Icon from './Icon';
import Figura from './Avatares';
import { visibilidadeDe } from './store';

// ── Campo de valor: escreve-se, e os −/+ ajustam ─────────────────────────────
//
// Toque no meio para escrever; os botões dos lados servem para acertar sem
// teclado. Serve rendimento, limites, valor do ponto e despesas.
//
// ⚠ Vivia dentro do `Dinheiro.jsx`, e o próprio comentário dele dizia que
// servia «rendimento, limites, valor do ponto e despesas» — mas o valor do
// ponto, na Gestão, era um `<Text>` entre dois botões. Não se podia escrever
// lá: para pôr o ponto a 0,35 € eram sete toques, e para o pôr a 1,00 €, vinte.
// Um controlo partilhado que vive dentro de um ecrã acaba por ser copiado à
// mão no ecrã do lado, e a cópia fica pior. Passa a viver aqui.
//
// ⚠ E os passos ARREDONDAM aos cêntimos. Com passo de 0,05, três toques no
// menos davam `0.09999999999999999` — o binário a fazer o que o binário faz.
// A Gestão tinha um `+(x).toFixed(2)` à mão à volta de cada botão; agora é do
// campo, e quem o usar não tem de se lembrar.
const aosCentimos = (n) => Math.round(n * 100) / 100;

export function NumField({ t, value, onChange, step = 5, min = 0, max = 99999, suffix = true }) {
  const [txt, setTxt] = React.useState(null);
  const commit = () => {
    if (txt === null) return;
    const v = Number(String(txt).replace(',', '.'));
    setTxt(null);
    if (!isFinite(v)) return;
    onChange(aosCentimos(Math.min(max, Math.max(min, v))));
  };
  const Botao = ({ rotulo, sinal, para }) => (
    <Pressable onPress={() => onChange(para)} accessibilityRole="button"
      accessibilityLabel={rotulo}
      style={{ width: 44, height: 44, borderRadius: R.row, borderWidth: 1, borderColor: t.border,
        alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: FONT.display, fontSize: 19, color: t.accent }}>{sinal}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
      <Botao rotulo={`Menos ${step}`} sinal="−" para={aosCentimos(Math.max(min, value - step))} />
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
      <Botao rotulo={`Mais ${step}`} sinal="+" para={aosCentimos(Math.min(max, value + step))} />
    </View>
  );
}

// Cartão: um enchimento só, 14/16, herdado do protótipo
export const Card = ({ t, children, style, pad = true }) => (
  <View style={[{
    backgroundColor: t.card, borderRadius: R.card,
    paddingVertical: pad ? 14 : 0, paddingHorizontal: pad ? 16 : 0,
    ...elev(1),
  }, style]}>{children}</View>
);

// Título de secção — slate, nunca preto, e 8 px acima do que rotula
export const SectionTitle = ({ t, children, right }) => (
  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: S.md, marginBottom: S.md }}>
    <Text style={{ flex: 1, fontFamily: FONT.display, fontSize: 20, fontWeight: '700',
      color: t.titulo || t.slate, letterSpacing: 0.1 }}>{children}</Text>
    {right}
  </View>
);

export const Label = ({ t, children }) => (
  <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.slate }}>{children}</Text>
);

// Pastilha de estado: não se toca. Para escolher, use Choice.
export const Pill = ({ label, fg, bg, border }) => (
  <View style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: R.pill,
    borderWidth: 1, borderColor: border, backgroundColor: bg }}>
    <Text style={{ fontFamily: FONT.ui, fontSize: 11, fontWeight: '600', color: fg }}>{label}</Text>
  </View>
);

// Escolha vertical exclusiva: pastilha de rádio, título, e uma linha de
// detalhe por baixo. É o idioma que o Dinheiro já usava nas «Opções de
// Pagamento» — estava escrito à mão, três vezes seguidas, no meio do ecrã.
//
// Não confundir com `Choice`, que é a pastilha pequena para escolhas curtas em
// linha. Uma escolha com frases dentro não cabe numa pastilha, e empilhar
// pastilhas de largura inteira faz três botões primários a competirem entre si
// — foi o que fiz na folha de exportação à primeira.
// É a bola que marca a escolha, não a linha. A linha inteira pintada de
// `chrome` fazia a opção escolhida gritar mais alto do que a pergunta, e três
// delas empilhadas — uma cheia, duas vazias — liam-se como um bloco a competir
// com o resto da folha. O contorno muda de cor, o fundo fica quieto, e o texto
// não tem de trocar de cor com ele.
export const Opcao = ({ t, titulo, detalhe, selected, onPress, disabled }) => (
  <Pressable onPress={disabled ? undefined : onPress}
    accessibilityRole="button" accessibilityLabel={titulo}
    accessibilityState={{ selected: !!selected, disabled: !!disabled }}
    style={({ pressed }) => ({
      minHeight: 48, borderRadius: R.row, paddingHorizontal: 14, paddingVertical: S.md,
      borderWidth: 1, borderColor: selected ? t.accent : t.border,
      backgroundColor: pressed ? t.subtle : t.card,
      flexDirection: 'row', alignItems: 'center', gap: S.md,
      opacity: disabled ? 0.4 : 1,
    })}>
    {/* Anel por fora, disco por dentro — a bola de rádio de sempre. */}
    <View style={{ width: 20, height: 20, borderRadius: R.pill, borderWidth: 2,
      borderColor: selected ? t.accent : t.border,
      alignItems: 'center', justifyContent: 'center' }}>
      {selected ? (
        <View style={{ width: 10, height: 10, borderRadius: R.pill, backgroundColor: t.accent }} />
      ) : null}
    </View>
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ fontFamily: FONT.ui, fontSize: 13,
        fontWeight: selected ? '600' : '400', color: t.text2 }}>{titulo}</Text>
      {detalhe ? (
        <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>{detalhe}</Text>
      ) : null}
    </View>
  </Pressable>
);

// Chip de escolha: tocável, 44 de alvo, cor de ação lida do tema.
// Só fora de linhas tocáveis — uma linha, um destino.
export const Choice = ({ t, label, selected, onPress }) => (
  <Pressable onPress={onPress} accessibilityRole="button"
    accessibilityLabel={label} accessibilityState={{ selected: !!selected }}
    style={({ pressed }) => ({
      minHeight: 44, paddingHorizontal: S.lg, borderRadius: R.row, borderWidth: 1,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: selected ? t.accent : t.card,
      borderColor: selected ? t.accent : t.border,
      opacity: pressed ? 0.85 : 1,
    })}>
    <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600',
      color: selected ? '#FFFFFF' : t.text2 }}>{label}</Text>
  </Pressable>
);

// Escolher um membro: grelha de dois por linha, com o ponto de cor de cada
// um — é assim nas referências 18, 19 e 20. Estava uma fila de quatro
// pastilhas sem ponto: os nomes cabiam à justa e nada dizia de quem era a
// cor que a linha do evento ou da tarefa depois mostra.
// Uma pastilha de membro. O ponto de cor à esquerda é a identidade; a marca à
// direita é a escolha. Duas coisas diferentes em dois sítios diferentes —
// antes a escolha era a linha inteira pintada, e o ponto de cor desaparecia
// contra o fundo escuro no preciso momento em que a pessoa estava escolhida.
//
// A FORMA da marca diz quantos se podem escolher, e é a única pista que o faz:
// redonda quer dizer um, quadrada quer dizer vários. Sem isso, duas listas com
// o mesmo aspeto comportam-se de maneiras diferentes e ninguém sabe porquê até
// tentar.
const PastilhaMembro = ({ t, nome, cor, on, varios, onPress }) => (
  <Pressable onPress={onPress}
    accessibilityRole={varios ? 'checkbox' : 'button'} accessibilityLabel={nome}
    accessibilityState={{ selected: on, checked: varios ? on : undefined }}
    style={({ pressed }) => ({
      width: '47%', minHeight: 48, borderRadius: R.row, borderWidth: 1,
      paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
      borderColor: on ? t.accent : t.border,
      backgroundColor: pressed ? t.subtle : t.card,
    })}>
    <View style={{ width: 9, height: 9, borderRadius: R.pill,
      backgroundColor: corDoMembro(nome, cor) || t.text3 }} />
    <Text style={{ flex: 1, fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>{nome}</Text>
    <View style={{
      width: 18, height: 18, borderRadius: varios ? R.sm : R.pill, borderWidth: 2,
      alignItems: 'center', justifyContent: 'center',
      borderColor: on ? t.accent : t.border,
      backgroundColor: on && varios ? t.accent : 'transparent',
    }}>
      {on ? (varios
        ? <Icon name="check" size={11} color="#FFFFFF" />
        : <View style={{ width: 9, height: 9, borderRadius: R.pill, backgroundColor: t.accent }} />
      ) : null}
    </View>
  </Pressable>
);

// `cores` é o mapa nome → cor escolhida. Opcional: sem ele, a cor sai do
// nome como sempre saiu, e nada rebenta em quem ainda não o passa.
export const EscolherMembro = ({ t, valor, onEscolher, membros, cores = {} }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }}>
    {membros.map(nome => (
      <PastilhaMembro key={nome} t={t} nome={nome} cor={cores[nome]} on={valor === nome}
        onPress={() => onEscolher(nome)} />
    ))}
  </View>
);

// O mesmo, para escolher mais do que um. `valor` é uma lista, e tocar numa
// pastilha já escolhida tira-a — que é o que uma pessoa espera de uma marca
// e o que não se consegue fazer com a de escolha única.
export const EscolherMembros = ({ t, valor = [], onEscolher, membros, cores = {} }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }}>
    {membros.map(nome => {
      const on = valor.includes(nome);
      return (
        <PastilhaMembro key={nome} t={t} nome={nome} cor={cores[nome]} on={on} varios
          onPress={() => onEscolher(on ? valor.filter(x => x !== nome) : [...valor, nome])} />
      );
    })}
  </View>
);

// A visibilidade de um evento, em pastilha. Estava escrita à mão em dois
// ecrãs — com dois estados, e a cor a repetir-se em quatro props de cada vez.
// Três estados agora, e a cor diz o alcance: família em info, adultos em
// aviso, só eu em cinzento.
export const PastilhaVisibilidade = ({ t, evento }) => {
  const v = visibilidadeDe(evento);
  const cfg = v === 'familia' ? { rotulo: 'Família', fg: t.state.info, bg: t.state.infoBg, bd: t.state.info }
    : v === 'adultos' ? { rotulo: 'Adultos', fg: t.state.warnDeep, bg: t.state.warnBg, bd: t.state.warn }
    : { rotulo: 'Só eu', fg: t.text3, bg: t.subtle, bd: t.border };
  return <Pill label={cfg.rotulo} fg={cfg.fg} bg={cfg.bg} border={cfg.bd} />;
};

// Alvo de toque nunca abaixo de 44
export const Tap = ({ onPress, label, children, style, size = 44 }) => (
  <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
    hitSlop={6}
    style={({ pressed }) => [{
      minWidth: size, minHeight: size, alignItems: 'center', justifyContent: 'center',
      opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }],
    }, style]}>{children}</Pressable>
);

// Linha de definição: o padrão da app — valor à direita, chevron
// `iconColor` é opcional e cai em t.slate — o «Precisa de Si» colore o ícone
// pela urgência da linha, o resto da app quer sempre a mesma cor.
// `leading` é para quando o que vem à esquerda não é um ícone — um avatar, na
// lista de membros da referência 14. Sem isto a linha aceitava a prop e
// ignorava-a em silêncio, que é como um avatar desaparece sem erro nenhum.
export const Row = ({ t, icon, iconColor, leading, title, sub, value, onPress, last, right }) => (
  <Pressable onPress={onPress} accessibilityRole={onPress ? 'button' : undefined}
    accessibilityLabel={onPress ? title : undefined}
    style={({ pressed }) => ({
      minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12,
      borderBottomWidth: last ? 0 : 1, borderBottomColor: t.divider,
      opacity: pressed ? 0.7 : 1,
    })}>
    {leading || null}
    {icon ? <Icon name={icon} size={20} color={iconColor || t.slate} /> : null}
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>{title}</Text>
      {sub ? <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>{sub}</Text> : null}
    </View>
    {value ? <Text style={{ fontFamily: FONT.ui, fontSize: 13.5, fontWeight: '600', color: t.text2 }}>{value}</Text> : null}
    {right !== undefined ? right : (onPress ? <Icon name="caretRight" size={18} color={t.text3} /> : null)}
  </Pressable>
);

// Controlo segmentado: um contorno para o grupo, divisórias por dentro
// Aceita ['Uma vez', ...] ou [{value, label}, ...]. Passar strings cruas dava
// três segmentos em branco, todos «selecionados» por undefined === undefined.
export const Segmented = ({ t, options, value, onChange, small }) => (
  <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: t.border,
    borderRadius: R.row, overflow: 'hidden' }}>
    {options.map((raw, i) => {
      const o = typeof raw === 'string' ? { value: raw, label: raw } : raw;
      const on = value === o.value;
      return (
        <Pressable key={o.value} onPress={() => onChange(o.value)}
          accessibilityRole="button" accessibilityLabel={o.label}
          accessibilityState={{ selected: on }}
          // ⚠ O `small` valia 38 de altura, e era o ÚNICO efeito que tinha.
          //
          // Media 38 na Gestão, nas Tarefas e no Dinheiro — abaixo dos 44 do
          // INVARIANTE #5, nos três. Medido no navegador, não deduzido.
          //
          // Agora o `small` mexe no TIPO e não no alvo: o controlo continua a
          // ler-se como mais leve, e a mão continua a ter 44 onde tocar. É a
          // mesma decisão do interruptor — o alvo cresce, o desenho não.
          style={{
            flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center',
            backgroundColor: on ? t.chrome : 'transparent',
            borderLeftWidth: i === 0 ? 0 : 1, borderLeftColor: t.border,
          }}>
          <Text style={{ fontFamily: FONT.ui, fontSize: small ? 12 : 13,
            fontWeight: on ? '600' : '400', color: on ? '#FFFFFF' : t.text2 }}>{o.label}</Text>
        </Pressable>
      );
    })}
  </View>
);

// ⚠ O alvo tem 44 de altura; o desenho continua a ter 27.
//
// Media 46×27 e contava com o `hitSlop={10}` para chegar aos 44. O `hitSlop`
// funciona no telemóvel e o react-native-web IGNORA-O — no navegador o alvo
// era mesmo 27, e o INVARIANTE #5 não abre excepção para um interruptor.
//
// Medido no Perfil, com todos os alvos do ecrã: era o único abaixo de 44.
export const Toggle = ({ t, on, onPress, label }) => (
  <Pressable onPress={onPress} accessibilityRole="switch" accessibilityState={{ checked: on }}
    accessibilityLabel={label} hitSlop={10}
    style={{ minWidth: 46, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' }}>
    <View style={{ width: 46, height: 27, borderRadius: R.pill, padding: 3,
      backgroundColor: on ? t.chrome : t.border,
      alignItems: on ? 'flex-end' : 'flex-start', justifyContent: 'center' }}>
      <View style={{ width: 21, height: 21, borderRadius: R.pill, backgroundColor: '#FFFFFF', ...elev(1) }} />
    </View>
  </Pressable>
);

// Botão principal: pílula, cor de ação
// A ação principal, em dois pesos.
//
// ⚠ `comum` é o peso do que se desfaz; sem ele, o botão leva a COR DE AÇÃO, e
// essa passa a querer dizer uma coisa: **isto não se desfaz**.
//
// A regra, escrita para não derivar: leva o acento o que mexe em dinheiro
// ENTRE PESSOAS, o que APAGA, e o que FECHA um período. Tudo o resto —
// criar, guardar, anexar, agendar — é comum.
//
// O que isto resolve: o acento estava em todos os botões, e por isso não
// distinguia nenhum. Contado no ecrã, eram um a três fundos de acento por
// separador, todos com o mesmo peso — a ação que acerta contas entre dois
// adultos ao lado da que anexa um ficheiro.
//
// ⚠ E o `sub` diz a CONSEQUÊNCIA dentro do próprio botão — «83,67 € para a
// Rita». Numa app de dinheiro isso vale mais do que qualquer cor: quem carrega
// não tem de se lembrar do que leu duas linhas acima.
// ⚠ E o rótulo DESACTIVADO não é o mesmo rótulo com menos brilho.
//
// Era branco sobre o `border`: 1,41:1 no claro. Ilegível — a palavra estava lá
// e não se lia. Com o `comum` a pintar o rótulo de `page` ficou 1,26:1, ainda
// pior, e foi assim que se viu: um botão cinzento com um fantasma escrito.
//
// E são exactamente estes os rótulos que mais precisam de ser lidos, porque um
// botão desactivado é o que diz o que FALTA — «Escreva um valor», «Valor
// Indisponível». O `text3` dá 3,43 no claro e 3,89–4,61 no escuro: apagado
// como convém a um botão que não responde, e legível como convém a uma frase
// que explica porquê.
const rotuloDo = (t, { disabled, comum }) =>
  (disabled ? t.text3 : comum ? t.page : '#FFFFFF');

export const Primary = ({ t, label, sub, icon, onPress, disabled, comum }) => (
  <Pressable onPress={disabled ? undefined : onPress} accessibilityRole="button"
    accessibilityLabel={sub ? `${label} — ${sub}` : label}
    accessibilityState={{ disabled: !!disabled }}
    style={({ pressed }) => ({
      minHeight: sub ? 56 : 48, borderRadius: R.row, flexDirection: 'row',
      alignItems: 'center', justifyContent: 'center', gap: 8,
      // O tom do texto no comum, o acento no que não se desfaz. `text1` sobre
      // a página dá 13:1 no claro e 15:1 no escuro — nunca é o elo fraco.
      backgroundColor: disabled ? t.border : comum ? t.text1 : t.accent,
      opacity: pressed ? 0.9 : 1, ...(disabled ? {} : elev(3)),
    })}>
    {icon ? <Icon name={icon} size={20} color={rotuloDo(t, { disabled, comum })} /> : null}
    <View style={{ alignItems: 'center', gap: 1 }}>
      <Text style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: '700',
        color: rotuloDo(t, { disabled, comum }), letterSpacing: 0.4 }}>{label}</Text>
      {sub ? (
        // O alfa afasta a consequência do rótulo sem lhe mudar a cor. ⚠ Mas
        // não se aplica ao desactivado: ali o `text3` já está no limite, e
        // 82 % dele sobre o cinzento deixava de se ler outra vez.
        <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, fontWeight: '500',
          color: rotuloDo(t, { disabled, comum }), opacity: disabled ? 1 : 0.82 }}>{sub}</Text>
      ) : null}
    </View>
  </Pressable>
);

// Ação secundária: contorno tracejado, minúsculas — o padrão "acrescentar"
// ── O par «abrir / fechar» de um mês ────────────────────────────────────────
//
// Metade da largura cada, 44 de alvo, um cheio e um de contorno.
//
// ⚠ Vive AQUI, e não dentro de um ecrã, porque o par existe em DOIS: o cartão
// do mês na Gestão e a secção «Administração» do Dinheiro. Estavam desenhados à
// mão nos dois, com cores diferentes — e o do Dinheiro tinha o rótulo de 13 px
// na cor do acento e em âmbar, o que dá 2,12:1 no Cinza escuro e 3,17 no âmbar
// claro. Catorze de vinte e quatro pares abaixo dos 4,5 que 13 px pedem.
//
// As cores daqui foram MEDIDAS nos doze temas: o cheio leva branco sobre o
// acento (4,62 no pior caso, o Cião claro) e o de contorno leva `text2` sobre o
// cartão (9,65). Ver `design/abrir-fechar-mes.dc.html`.
export function BotaoDoMes({ t, label, cheio, disabled, onPress }) {
  const fundo = disabled ? t.border : cheio ? t.accent : 'transparent';
  const cor = disabled ? t.text3 : cheio ? '#FFFFFF' : t.text2;
  return (
    <Pressable onPress={disabled ? undefined : onPress}
      accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 44,                       // INVARIANTE #5
        borderRadius: R.row,               // o canto de tudo o que se toca
        borderWidth: cheio ? 0 : 1,
        borderColor: disabled ? t.border : t.border,
        backgroundColor: fundo,
        alignItems: 'center', justifyContent: 'center',
        opacity: pressed ? 0.85 : 1,
      })}>
      {/* ⚠ Uma linha só. «Fechar Setembro» a 13,5 px cabe nos 155 px que sobram
          de metade da largura útil; «Fechar Fevereiro» é o pior caso e cabe
          também. Sem isto, um mês longo partia o botão em dois e a coluna dos
          dois deixava de ter a mesma altura. */}
      <Text numberOfLines={1} style={{ fontFamily: FONT.display, fontSize: 13.5,
        fontWeight: '700', color: cor, paddingHorizontal: 8 }}>{label}</Text>
    </Pressable>
  );
}


// Ação secundária: contorno tracejado, minúsculas — o padrão «acrescentar».
//
// ⚠ Leva a cor do PERFIL, e leva-a nos sítios certos.
//
// Era tudo neutro: contorno `border`, «+» e rótulo em `text3`. Num ecrã onde o
// título da secção e os botões seguem o esquema escolhido, o «+ agendar
// evento» era a única coisa cinzenta — e é uma ação, não uma nota de pé de
// página.
//
// ── Onde a cor entra, e onde NÃO ────────────────────────────────────────────
//
// O contorno e o «+» são OBJETOS GRÁFICOS: precisam de 3:1. O rótulo tem
// 13,5 px, que é texto pequeno, e precisa de 4,5. Medido nos doze temas:
//
//   accent   como contorno   falha 3:1 em CINCO esquemas escuros (2,12 a 2,90)
//   titulo   como contorno   3,01 no pior caso (Cinza escuro, sobre cartão) ✓
//   titulo   como rótulo     3,01 — muito abaixo dos 4,5 que 13,5 px pedem ✗
//
// Por isso o contorno e o ícone levam `titulo` — que é o token que o tema já
// tem para isto: o acento no claro, o `hover` no escuro, clareado quando não
// chega — e o rótulo fica neutro. Pôr o acento no rótulo é o defeito que os
// dois botões de mês do Dinheiro tiveram durante meses.
//
// ⚠ E o rótulo sobe de `text3` para `text2`, o que é uma correção e não um
// gosto: `text3` sobre a página dá 4,31 no Violeta claro, abaixo dos 4,5.
// O `text2` dá 8,82.
export const AddButton = ({ t, label, onPress }) => (
  <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
    style={({ pressed }) => ({
      minHeight: 44, borderRadius: R.row, borderWidth: 1, borderStyle: 'dashed',
      borderColor: t.titulo, flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', gap: 8, opacity: pressed ? 0.7 : 1,
    })}>
    <Icon name="plus" size={18} color={t.titulo} />
    <Text style={{ fontFamily: FONT.ui, fontSize: 13.5, color: t.text2 }}>{label}</Text>
  </Pressable>
);

// Avatar com a inicial — a informação não depende só da cor
// O avatar de um membro: a fotografia da conta Google, ou a inicial.
//
// A cor de fundo fica por baixo da imagem de propósito — é o que se vê
// enquanto ela carrega, e o que fica se ela não carregar. Sem isso, o avatar
// pisca a branco a cada ecrã, e uma casa sem rede ficava com buracos redondos
// onde deviam estar as pessoas.
// As propriedades do avatar de um membro, a partir do registo dele.
//
// Existe porque eram TRÊS propriedades em ONZE sítios, e porque dez deles
// chamavam `corDoMembro(nome)` sem o segundo argumento — sem a cor ESCOLHIDA.
// Quem escolhesse uma cor via-a no Perfil e em mais lado nenhum: na agenda, nas
// tarefas e nas compras continuava a aparecer a cor calculada do nome. Um sítio
// só para decidir isto é a diferença entre acrescentar uma escolha e acrescentar
// uma escolha que só funciona em metade da app.
// Se a fotografia da conta é para mostrar.
//
// ⚠ Três estados, e não dois. `usarFoto` por decidir (`undefined`) não é o
// mesmo que decidido que NÃO: quem entra com a Google e vê a sua fotografia
// aparecer teve o que pediu, e quem prefere outra coisa escolhe-a — a escolha
// explícita ganha sempre, nos dois sentidos.
//
// Estava a começar em `false`, por uma razão de privacidade que era minha e não
// de quem usa a app: a fotografia era importada, ficava guardada, e o avatar
// continuava a mostrar a inicial. Parecia avariado, e era.
export const mostraFotografia = (m) => {
  const r = m || {};
  if (!r.avatar) return false;
  if (r.usarFoto === undefined || r.usarFoto === null) return !r.figura;
  return !!r.usarFoto;
};

export const avatarDe = (nome, m, fallback) => {
  const r = m || {};
  return {
    initial: r.initial || String(nome || '?').trim().charAt(0).toUpperCase(),
    color: corDoMembro(nome, r.cor) || fallback,
    figura: r.figura || null,
    foto: mostraFotografia(r) ? r.avatar : null,
  };
};

// O avatar do CABEÇALHO — disco branco com anel, não bola da cor do membro.
//
// É outro desenho de propósito: assenta no cabeçalho colorido, e uma bola da
// cor do membro sobre o cabeçalho do esquema seriam duas cores a discutir no
// canto do ecrã. O branco é o que o separa do fundo (referência 04).
//
// ⚠ Mas é o avatar MAIS VISTO da app, e não sabia da escolha nenhuma: mostrava
// sempre a inicial, mesmo com fotografia guardada e figura escolhida. Era este
// o que aparecia nas capturas de quem perguntava porque é que o avatar não
// mudava.
//
// A fotografia enche o disco; a figura desenha-se na cor do cabeçalho, como a
// inicial que ela substitui.
export const AvatarDeCabecalho = ({ t, nome, membro, size = 36 }) => {
  const [falhou, setFalhou] = React.useState(false);
  const r = membro || {};
  const foto = mostraFotografia(r) ? r.avatar : null;
  React.useEffect(() => { setFalhou(false); }, [foto]);
  return (
    <View style={{ width: size, height: size, borderRadius: R.pill, backgroundColor: '#FFFFFF',
      borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', overflow: 'hidden',
      alignItems: 'center', justifyContent: 'center' }}>
      {foto && !falhou ? (
        <FotoDoAvatar uri={foto} size={size} onFalhar={() => setFalhou(true)} />
      ) : r.figura ? (
        <Figura nome={r.figura} size={size * 0.62} color={t.chrome} />
      ) : (
        <Text style={{ fontFamily: FONT.display, fontSize: size * 0.42, fontWeight: '500',
          color: t.chrome }}>
          {r.initial || String(nome || '?').trim().charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  );
};

// O mapa nome → cor escolhida, para os dois escolhedores de membro.
export const coresDe = (membros = {}) => Object.fromEntries(
  Object.entries(membros).map(([n, m]) => [n, (m || {}).cor]).filter(([, c]) => c));

// A fotografia da conta, desenhada.
//
// ── Porque não é só um `<Image>` ────────────────────────────────────────────
//
// A Google RECUSA a fotografia quando o pedido leva referenciador. Medido no
// navegador, contra o endereço real de uma conta:
//
//     política por omissão   erro
//     no-referrer            OK 96×96
//
// O `Image` do react-native-web (0.21.2) não expõe `referrerPolicy` — procurei
// no módulo, não existe. Na web desenha-se um `<img>` verdadeiro, que a
// aceita; no telemóvel não há referenciador nenhum e o `Image` serve.
//
// ⚠ E se a imagem falhar, NÃO fica um buraco. Foi o que aconteceu: a bola
// aparecia da cor do membro e vazia por dentro, sem inicial e sem figura —
// pior do que não ter fotografia nenhuma. Um endereço destes caduca quando a
// pessoa muda a fotografia na conta, portanto isto não é um caso de esquina.
const FotoDoAvatar = ({ uri, size, onFalhar }) => {
  if (Platform.OS === 'web') {
    return React.createElement('img', {
      src: uri,
      // A razão de tudo isto.
      referrerPolicy: 'no-referrer',
      alt: '',
      width: size, height: size,
      onError: onFalhar,
      style: { width: size, height: size, objectFit: 'cover', display: 'block' },
    });
  }
  return <Image source={{ uri }} accessibilityIgnoresInvertColors
    onError={onFalhar} style={{ width: size, height: size }} />;
};

export const Avatar = ({ initial, color, size = 24, foto, figura }) => {
  const [falhou, setFalhou] = React.useState(false);
  // Um endereço novo merece uma tentativa nova.
  React.useEffect(() => { setFalhou(false); }, [foto]);
  return (
  <View style={{ width: size, height: size, borderRadius: R.pill, backgroundColor: color,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
    {foto && !falhou ? (
      <FotoDoAvatar uri={foto} size={size} onFalhar={() => setFalhou(true)} />
    ) : figura ? (
      // A figura ocupa dois terços da bola. Cheia, encostava ao rebordo e
      // perdia a forma nos 24 px a que ela aparece numa linha de tarefa.
      <Figura nome={figura} size={size * 0.66} color="#FFFFFF" />
    ) : (
      <Text style={{ fontFamily: FONT.ui, fontSize: size * 0.46, fontWeight: '700', color: '#FFFFFF' }}>{initial}</Text>
    )}
  </View>
  );
};

export const Bar = ({ t, pct, color, height = 8 }) => (
  <View style={{ height, borderRadius: R.pill, backgroundColor: t.page, overflow: 'hidden' }}>
    <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%',
      borderRadius: R.pill, backgroundColor: color }} />
  </View>
);

// ⚠ O «info» segue o ESQUEMA; o «warn» e o «err» NÃO.
//
// Um aviso informativo — «não há nada aqui», «está tudo em dia» — não é um
// estado, é a app a falar. Ficava azul-do-sistema em cima de um cabeçalho
// violeta ou cião, e lia-se como uma peça de outra app.
//
// O aviso e o erro ficam onde estão, e é uma decisão e não um esquecimento: um
// aviso que toma a cor do esquema deixa de se distinguir do resto, e um erro em
// cião não é um erro. A cor deles é o que eles significam — a semântica não é
// decoração, e num ecrã de dinheiro isso importa.
const TILE = {
  info: { border: (t) => t.accent, bg: (t) => comAlfa(t.accent, t.dark ? 0.18 : 0.09), icon: 'infoCircle' },
  warn: { border: (t) => t.state.warn, bg: (t) => t.tileWarn, icon: 'exclamation' },
  err:  { border: (t) => t.state.err,  bg: (t) => t.tileErr,  icon: 'lock' },
};

export const Tile = ({ t, kind = 'info', icon, children }) => {
  const k = TILE[kind] || TILE.info;
  return (
    <View style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: R.card, borderWidth: 1,
      borderColor: k.border(t), backgroundColor: k.bg(t) }}>
      <Icon name={icon || k.icon} size={20} color={k.border(t)} />
      <Text style={{ flex: 1, fontFamily: FONT.body, fontSize: 14.5, lineHeight: 21, color: t.text2 }}>{children}</Text>
    </View>
  );
};

// O aviso de «não há nada aqui».
//
// ── Era uma caixa tracejada, alta e centrada ────────────────────────────────
//
// Ícone grande por cima, título ao centro, dica por baixo, contorno a
// tracejado. Ocupava cerca de 120 px para dizer uma frase, e uma app com três
// secções vazias — o que é uma casa nova — ficava com três placas a dizer que
// não havia nada, cada uma maior do que o conteúdo que substituía.
//
// Passa a ser a mesma caixa do `Tile` de informação: uma linha, ícone à
// esquerda, contorno azul. É o aviso que a app já usava para «Não há contas a
// acertar nesta casa», e é o que faz um ecrã vazio parecer arrumado em vez de
// abandonado.
//
// A API não muda — `icon`, `title`, `hint` — para os quinze sítios que o
// chamam não precisarem de saber disto.
export const Empty = ({ t, icon, title, hint }) => (
  <View style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: R.card,
    borderWidth: 1, borderColor: t.accent, backgroundColor: comAlfa(t.accent, t.dark ? 0.18 : 0.09) }}>
    <Icon name={icon || 'infoCircle'} size={20} color={t.accent} />
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ fontFamily: FONT.body, fontSize: 14.5, lineHeight: 21, color: t.text2 }}>{title}</Text>
      {/* A dica fica: é ela que diz o que fazer a seguir, e um aviso que só
          constata é meio aviso. Vai por baixo, mais pequena, e não numa
          segunda caixa. */}
      {hint ? (
        <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>{hint}</Text>
      ) : null}
    </View>
  </View>
);

// Paginação: acima de cinco itens
export const usePaged = (list, size = 5) => {
  const [page, setPage] = React.useState(0);
  const pages = Math.max(1, Math.ceil(list.length / size));
  const p = Math.min(page, pages - 1);
  return {
    slice: list.slice(p * size, p * size + size),
    paged: list.length > size,
    label: `${list.length} no total · ${p + 1} de ${pages}`,
    prev: p > 0 ? () => setPage(p - 1) : null,
    next: p < pages - 1 ? () => setPage(p + 1) : null,
  };
};

export const Pager = ({ t, pg }) => !pg.paged ? null : (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingTop: S.md }}>
    <Text style={{ flex: 1, fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>{pg.label}</Text>
    <Tap onPress={pg.prev} label="Página anterior"
      style={{ borderWidth: 1, borderColor: t.border, borderRadius: R.sm, opacity: pg.prev ? 1 : 0.35 }}>
      <Icon name="caretLeft" size={16} color={t.text3} />
    </Tap>
    <Tap onPress={pg.next} label="Página seguinte"
      style={{ borderWidth: 1, borderColor: t.border, borderRadius: R.sm, opacity: pg.next ? 1 : 0.35 }}>
      <Icon name="caretRight" size={16} color={t.text3} />
    </Tap>
  </View>
);
