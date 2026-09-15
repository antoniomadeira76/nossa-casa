import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { S, R, FONT, corSobre } from './theme';
import { Avatar, avatarDe } from './ui';
import Icon from './Icon';

// ── A pessoa é a sua bola ────────────────────────────────────────────────────
//
// Nasceu nas Tarefas (12/09/2026, opção A de `design/filtro-de-membros.dc.html`):
// eram seis pastilhas com o nome e embrulhavam — 355 px dão para quatro, e as
// outras caíam para uma segunda linha que parecia um acidente. Cada membro é a
// sua bola, a mesma que cada linha já mostra, num alvo de 44; o escolhido ganha
// um anel do acento, e o NOME passa para o título da secção.
//
// Em 13/09/2026 a Saúde ainda tinha as pastilhas com o nome (com cinco membros
// a «Mia» e o «Léo» ficavam com 39 px), e o dono da casa pediu «como o segundo
// print»: passou a ser ESTE componente nos dois ecrãs — um desenho, um sítio.
//
// O NOME por baixo de cada bola (13/09/2026, opção B de
// `design/nome-no-filtro.dc.html`): ele perguntou «há alguma hipótese de saber o
// nome da pessoa?». Uma palavra a 10 px, cortada com «…» num nome composto, numa
// coluna de 52; o escolhido em `actFg`. É rótulo de ícone, não texto para ler —
// o nome inteiro vai para o título da secção quando se toca (opção A).
//
// ⚠ 15/09/2026 — «deve ser coerente com o design da app e ter os avatares como
// os outros filtros»: a folha de marcar consulta tinha pastilhas de texto
// («Léo · António · Mia»), a de gerir tarefa um `Segmented` com nomes, as contas
// fixas e os contratos `Choice` com nomes, e as folhas de criar tinham ainda uma
// QUARTA forma (a `PastilhaMembro` do ui.jsx, com ponto de cor e marca redonda
// ou quadrada). Passam todas por `EscolherPessoa`, em baixo: a mesma bola do
// filtro, sem o «Todos». Regra: escolher uma pessoa nesta app é tocar na bola
// dela — filtrar ou escolher, uma forma.

// Uma bola tocável: 52 de largo com o nome, alvo de 44, anel do acento quando
// escolhida. `varios` marca com um visto no canto em vez de só o anel — é a
// única pista de que se podem escolher mais do que uma.
function BolaDeMembro({ t, nome, MEMBERS, on, varios, rotulo, onPress }) {
  // ⚠ A marca de «escolhido» é o ESQUEMA DE QUEM ESTÁ A USAR A APP, e não a cor
  // do membro da bola (15/09/2026: «a cor é consoante o perfil do user em
  // uso»). Cheguei a pintá-la com a cor de cada pessoa e ele recusou: a cor do
  // membro vive na BOLA — é o avatar que diz de quem é —, e o que a app pinta
  // com o acento é o que ESTA pessoa escolheu ao tocar. A Rita com violeta e o
  // Tomás com cião veem a mesma fila marcada de maneiras diferentes, e cada um
  // vê a sua. `actFg` no nome, que é texto de 11 px e pede 4,5; `accent` no
  // anel e no disco, que são objetos gráficos.
  const cor = t.accent;
  return (
    // ⚠ `aria-checked`/`aria-pressed` ALÉM do `accessibilityState` (15/09/2026):
    // o react-native-web 0.21 não conhece o `accessibilityState` — deita-o fora
    // em silêncio (ver `createDOMProps`, que só reencaminha `aria-*`), e no
    // navegador a bola escolhida não se anunciava como escolhida. O
    // `accessibilityState` fica para o iOS e o Android. E o atributo segue o
    // papel: `checkbox` leva `checked`, um botão que alterna leva `pressed`.
    <Pressable onPress={onPress} accessibilityRole={varios ? 'checkbox' : 'button'}
      accessibilityLabel={rotulo} accessibilityState={{ selected: on, checked: varios ? on : undefined }}
      aria-checked={varios ? on : undefined} aria-pressed={varios ? undefined : on}
      style={{ width: 52, minHeight: 44, alignItems: 'center', justifyContent: 'flex-start' }}>
      {/* O anel é um círculo à volta de um círculo — redondo por forma, como o
          próprio avatar; o alvo é o Pressable de 44 (52 de largo com o nome),
          sem raio. */}
      <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 40, height: 40, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center',
          borderWidth: 2, borderColor: on ? cor : 'transparent' }}>
          <Avatar {...avatarDe(nome, MEMBERS[nome], t.text3)} size={32} />
        </View>
        {/* ⚠ A marca desenha-se SEMPRE que se podem escolher várias, cheia ou
            vazia — é a única pista de que esta fila aceita mais do que uma
            pessoa. Só a desenhar quando escolhida, uma fila ainda por tocar
            era indistinguível de uma de escolha única. (É o que a
            `PastilhaMembro` fazia com a marca quadrada.) */}
        {varios ? (
          <View style={{ position: 'absolute', right: 0, bottom: 0, width: 16, height: 16, borderRadius: R.pill,
            borderWidth: 2, borderColor: on ? cor : t.border,
            backgroundColor: on ? cor : t.surface, alignItems: 'center', justifyContent: 'center' }}>
            {/* Branco ou preto conforme a cor que ficou por baixo — a mesma
                regra da inicial de um avatar. */}
            {on ? <Icon name="check" size={9} color={corSobre(cor)} /> : null}
          </View>
        ) : null}
      </View>
      <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11, lineHeight: 12, marginTop: -2,
        maxWidth: 52, color: on ? t.actFg : t.text3, fontWeight: on ? '600' : '400' }}>{nome}</Text>
    </Pressable>
  );
}

// Uma pastilha de texto ao lado das bolas: o «Todos» do filtro, o «Quem marcar»
// da conta fixa, «A casa» do contrato. Alvo de 44 (tinha 40: era o único alvo
// abaixo dos 44 do INVARIANTE #5, e o primeiro que a mão encontra).
function PastilhaDeTexto({ t, rotulo, on, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      accessibilityLabel={rotulo} accessibilityState={{ selected: on }} aria-pressed={on}
      style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: R.row, borderWidth: 1,
        borderColor: on ? t.accent : t.border, backgroundColor: on ? t.accent : 'transparent',
        alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: on ? '#FFFFFF' : t.text2 }}>{rotulo}</Text>
    </Pressable>
  );
}

// ── O filtro por membro: «Todos» e um AVATAR por pessoa ─────────────────────
//
// `escolhido` é o nome do membro ou «Todos»; tocar no escolhido volta a «Todos».
// `rotuloDe(nome)` é o que o leitor de ecrã diz de cada bola — cada ecrã diz o
// seu («Mostrar só as tarefas do Léo», «Mostrar só a saúde do Léo»).
export default function FiltroDeMembros({ t, membros, escolhido, onEscolher, rotuloDe, MEMBERS }) {
  const todos = escolhido === 'Todos' || !escolhido;
  return (
    <View style={{ flexDirection: 'row', gap: S.md, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <PastilhaDeTexto t={t} rotulo="Todos" on={todos} onPress={() => onEscolher('Todos')} />
      {membros.map(n => {
        const on = escolhido === n;
        return (
          <BolaDeMembro key={n} t={t} nome={n} MEMBERS={MEMBERS} on={on} rotulo={rotuloDe(n)}
            onPress={() => onEscolher(on ? 'Todos' : n)} />
        );
      })}
    </View>
  );
}

// ── Escolher uma pessoa (ou várias) — a mesma bola, sem o «Todos» ───────────
//
// `valor` é um nome (ou `null`); com `varios`, uma lista de nomes, e tocar
// numa bola escolhida tira-a. `opcional` é a pastilha de texto que representa
// «ninguém em particular» («Quem marcar», «A casa»): escolhida quando `valor`
// está vazio, e tocar nela chama `onEscolher(null)`. Sem `opcional`, tocar na
// bola já escolhida não a tira — a consulta é sempre de alguém.
// `rotuloDe(nome)` é o que o leitor de ecrã diz; por omissão, o nome.
export function EscolherPessoa({ t, membros, valor, onEscolher, MEMBERS = {}, rotuloDe = (n) => n, varios = false, opcional = null }) {
  const escolhidos = varios ? (valor || []) : (valor ? [valor] : []);
  return (
    <View style={{ flexDirection: 'row', gap: S.md, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {opcional ? (
        <PastilhaDeTexto t={t} rotulo={opcional} on={escolhidos.length === 0} onPress={() => onEscolher(varios ? [] : null)} />
      ) : null}
      {membros.map(n => {
        const on = escolhidos.includes(n);
        return (
          <BolaDeMembro key={n} t={t} nome={n} MEMBERS={MEMBERS} on={on} varios={varios} rotulo={rotuloDe(n)}
            onPress={() => {
              if (varios) onEscolher(on ? escolhidos.filter(x => x !== n) : [...escolhidos, n]);
              else if (on && opcional) onEscolher(null);
              else onEscolher(n);
            }} />
        );
      })}
    </View>
  );
}
