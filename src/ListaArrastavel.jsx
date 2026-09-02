import React, { useRef, useState } from 'react';
import { View, Animated, PanResponder, Platform } from 'react-native';

/**
 * Uma lista que se reordena com o dedo, dentro de fronteiras.
 *
 * ── Porque é a pressão longa que arma, e não o arrasto ───────────────────────
 *
 * ⚠ A lista vive dentro de um scroll vertical. Um arrasto vertical que armasse
 * logo roubava o scroll: a pessoa tentava percorrer o ecrã e em vez disso
 * andava com uma tarefa para cima e para baixo. A pressão longa separa as duas
 * intenções sem acrescentar alvo nenhum ao cartão — que é o outro caminho
 * possível (uma alça) e seria o SEXTO alvo numa linha que já tem cinco, contra
 * o erro #6 da lista do CLAUDE.md.
 *
 * O toque curto continua a ser o toque curto: quem arma é o `onLongPress` do
 * próprio `Pressable` do cartão, e este componente só toma conta do dedo DEPOIS
 * de estar armado — `onMoveShouldSetPanResponder` devolve falso enquanto não
 * estiver. Sem isso, o responsável apanhava o toque antes do `Pressable` e
 * marcar uma tarefa deixava de funcionar.
 *
 * ── Porque não há página para virar ──────────────────────────────────────────
 *
 * ⚠ A ideia era a paginação virar sozinha ao chegar à borda. Não vira, e não é
 * por preguiça: a página a mudar debaixo do dedo tira o cartão de onde ele
 * está, e a alternativa — arrastá-lo à força para a página nova — parte a
 * própria ideia de página no meio do gesto.
 *
 * O que se faz em vez disso é mais simples e não precisa de nada aqui:
 * arrasta-se o que está na página, e quem grava trata do resto. O
 * `reordenarTarefas` da loja percorre o grupo INTEIRO e põe as arrastadas nos
 * lugares que eram delas, deixando as das outras páginas onde estavam — é a
 * mesma volta que faz a vista filtrada por membro funcionar. Uma reordenação na
 * página 1 não desarruma a 2.
 *
 * O `aoArmar` fica para quem quiser saber que o gesto começou (travar um
 * scroll, esconder um botão). Não é preciso para a ordem sair certa.
 *
 * ── As alturas medem-se, não se assumem ──────────────────────────────────────
 *
 * Um título de tarefa parte em duas linhas, e então o cartão tem outra altura.
 * Cada linha diz a sua pelo `onLayout`; o passo entre duas é a altura da que se
 * atravessa mais o espaçamento. Assumir uma altura fixa fazia o cartão saltar
 * dois lugares onde o dedo andou um.
 */
// ── A geometria, à parte e pura ──────────────────────────────────────────────
//
// O gesto em si só se verifica a arrastar num navegador. Isto — as fronteiras,
// o salto e a ordem que sai — é aritmética, e aritmética prova-se.

// O primeiro e o último índice do grupo de `i`, à volta dele.
export const limitesDoGrupo = (itens, i, grupoDe) => {
  if (!itens || !itens[i]) return [i, i];
  const g = grupoDe(itens[i]);
  let min = i, max = i;
  while (min - 1 >= 0 && grupoDe(itens[min - 1]) === g) min -= 1;
  while (max + 1 < itens.length && grupoDe(itens[max + 1]) === g) max += 1;
  return [min, max];
};

// Onde é que o cartão vai cair, dado o quanto o dedo andou. Preso às
// fronteiras: é isto que impede uma normal de ir para o meio das urgentes.
export const destinoDoArrasto = (i, dy, passo, min, max) => {
  const salto = Math.round(dy / (passo || 1));
  return Math.max(min, Math.min(max, i + salto));
};

// Os identificadores do grupo, na ordem que fica.
export const grupoReordenado = (itens, i, destino, grupoDe) => {
  const [min, max] = limitesDoGrupo(itens, i, grupoDe);
  const ids = itens.slice(min, max + 1).map(x => x.id);
  const [movida] = ids.splice(i - min, 1);
  ids.splice(destino - min, 0, movida);
  return ids;
};

export default function ListaArrastavel({
  itens,          // [{ id }] na ordem em que estão desenhadas
  grupoDe,        // (item) => valor comparável: só se reordena dentro do grupo
  espaco = 16,    // o gap entre cartões, para o passo dar certo
  aoArmar,        // (id | null) => void — avisa quem paginará que o gesto começou
  aoLargar,       // (idsDoGrupoNaNovaOrdem) => void
  render,         // (item, { armado, arrastando }) => nó
}) {
  const [armado, setArmado] = useState(null);
  const [alvo, setAlvo] = useState(null);

  // Em `ref` porque o `PanResponder` é criado uma vez e não vê o estado novo.
  const armadoRef = useRef(null);
  const origemRef = useRef(null);
  const alvoRef = useRef(null);
  const alturas = useRef({});
  const desvio = useRef(new Animated.Value(0)).current;

  // ⚠ A lista e o `grupoDe` vivem em `ref`, e não é arrumação: o
  // `PanResponder` é criado UMA vez e fecha sobre o que existia no primeiro
  // desenho. Com os `itens` lidos da prop, o responsável ficava a ver a lista
  // do arranque — que numa casa sem tarefas está VAZIA — e ao arrastar a
  // quinta linha ia buscar `itens[4]` a um array de zero.
  //
  // Medido no navegador: «Cannot read properties of undefined (reading
  // 'urgency')», seis vezes, uma por cada gesto. O cartão movia-se com o dedo,
  // porque isso é só o `Animated.Value`, e ao largar não acontecia nada —
  // parecia que a ordem não se guardava, e o que havia era uma exceção.
  const itensRef = useRef(itens);
  const grupoRef = useRef(grupoDe);
  itensRef.current = itens;
  grupoRef.current = grupoDe;

  const indiceDe = (id) => itensRef.current.findIndex(x => x.id === id);
  const passo = (i) => {
    const item = itensRef.current[i];
    return (alturas.current[item && item.id] || 76) + espaco;
  };

  // As fronteiras do grupo de quem está a ser arrastada: o primeiro e o último
  // índice com o mesmo grupo, à volta dela.
  const limites = (i) => limitesDoGrupo(itensRef.current, i, grupoRef.current);

  const desarmar = () => {
    armadoRef.current = null; origemRef.current = null; alvoRef.current = null;
    setArmado(null); setAlvo(null); desvio.setValue(0);
    aoArmar && aoArmar(null);
  };

  const armar = (id) => {
    const i = indiceDe(id);
    if (i < 0) return;
    const [min, max] = limites(i);
    // Um grupo de um só não se reordena, e armar dava a entender que sim.
    if (min === max) return;
    armadoRef.current = id; origemRef.current = i; alvoRef.current = i;
    setArmado(id); setAlvo(i); desvio.setValue(0);
    aoArmar && aoArmar(id);
  };

  const largar = () => {
    const i = origemRef.current;
    const destino = alvoRef.current;
    if (i != null && destino != null && destino !== i) {
      aoLargar && aoLargar(grupoReordenado(itensRef.current, i, destino, grupoRef.current));
    }
    desarmar();
  };

  const responder = useRef(PanResponder.create({
    // ⚠ Falso enquanto não estiver armado: é o que deixa o toque curto chegar
    // ao `Pressable` do cartão.
    onStartShouldSetPanResponder: () => false,
    onStartShouldSetPanResponderCapture: () => false,

    // ⚠ E é na CAPTURA que este ascendente toma conta do dedo, não na subida.
    // Medido no navegador: com `onMoveShouldSetPanResponder` sozinho, a pressão
    // longa armava — a borda do cartão mudava para o acento — e o arrasto não
    // fazia nada. A razão é a negociação do responsável: quando o dedo desce, o
    // `Pressable` do cartão fica responsável, e a pergunta de subida só é feita
    // a quem NÃO é responsável. A captura desce de cima para baixo e é o único
    // sítio onde um ascendente pode tirar o dedo a um descendente que já o tem.
    onMoveShouldSetPanResponderCapture: () => armadoRef.current != null,
    onMoveShouldSetPanResponder: () => armadoRef.current != null,
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, gesto) => {
      const i = origemRef.current;
      if (i == null) return;
      desvio.setValue(gesto.dy);
      const [min, max] = limites(i);
      const destino = destinoDoArrasto(i, gesto.dy, passo(i), min, max);
      if (destino !== alvoRef.current) { alvoRef.current = destino; setAlvo(destino); }
    },
    onPanResponderRelease: largar,
    onPanResponderTerminate: largar,
  })).current;

  // Quanto é que uma linha que NÃO está a ser arrastada se afasta, para abrir o
  // buraco onde a arrastada vai cair.
  const afastamento = (j) => {
    const i = origemRef.current;
    if (i == null || alvo == null || j === i) return 0;
    if (alvo > i && j > i && j <= alvo) return -passo(j);
    if (alvo < i && j >= alvo && j < i) return passo(j);
    return 0;
  };

  return (
    <View {...responder.panHandlers}
      // ⚠ Na web o scroll do dedo é do navegador e o PanResponder não o
      // trava. Enquanto está armado, `touchAction: none` diz ao navegador
      // para não o fazer — senão a página rolava por baixo do arrasto.
      style={Platform.OS === 'web' && armado ? { touchAction: 'none' } : null}>
      {itens.map((x, j) => {
        const eEsta = armado === x.id;
        return (
          <Animated.View key={x.id}
            onLayout={(e) => { alturas.current[x.id] = e.nativeEvent.layout.height; }}
            style={{
              marginBottom: j === itens.length - 1 ? 0 : espaco,
              transform: [{ translateY: eEsta ? desvio : afastamento(j) }],
              zIndex: eEsta ? 2 : 1,
              opacity: eEsta ? 0.9 : 1,
            }}>
            {/* O `armar` vai no contexto porque quem arma é o cartão, pelo seu
                `onLongPress` — não há alça neste componente. */}
            {render(x, { armado: !!armado, arrastando: eEsta, armar })}
          </Animated.View>
        );
      })}
    </View>
  );
}

// O `onLongPress` que arma vive no cartão, e é este atraso. 400 ms é o que
// separa «tocar» de «pegar» sem obrigar a esperar.
export const ATRASO_PARA_PEGAR = 400;
