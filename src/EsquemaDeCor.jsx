import React from 'react';
import { View, Pressable } from 'react-native';
import { SCHEMES, R } from './theme';

// A escolha do esquema de cor: seis bolas, cada uma com os dois tons do esquema.
//
// Vivia dentro do Perfil dos adultos. Em 10/09/2026 o dono da casa decidiu que
// «as crianças também podem escolher esquema de cor e avatar», e a mesma escolha
// passou a viver também na folha «O meu perfil» da app da criança. Um
// componente, dois sítios — copiar as bolas para a KidApp era garantir que uma
// correção futura chegava a um lado e não ao outro.
//
// A bola do esquema, e a geometria do seu risco diagonal.
//
// BOLA  o diâmetro (dentro do alvo de 44 do INVARIANTE #5)
// CORTE o quadrado que tapa metade — maior do que a bola, para a cobrir
//       inteira depois de rodado
// RECUO onde o quadrado assenta, para a aresta passar pelo centro da bola
const BOLA = 34;
const CORTE = 60;
const RECUO = BOLA / 2 + (CORTE / 2) * (Math.SQRT1_2 - 1);

export default function EscolhaDeEsquema({ t, escolhido, onEscolher }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {SCHEMES.map((sc, i) => {
        const on = escolhido === i;
        return (
          <Pressable key={sc.name} onPress={() => onEscolher(i)}
            accessibilityRole="button" accessibilityLabel={`Esquema ${sc.name}`} accessibilityState={{ selected: on }}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            {/* Dois tons: a cor de ação e a do cabeçalho. Um esquema são as
                duas, e uma bolinha só não distingue os que partilham o acento.

                A separação é DIAGONAL, e não a meio na vertical. Não há
                gradientes sem biblioteca — e o sistema visual é próprio, não
                se traz uma por causa de um risco. Faz-se com um quadrado rodado
                45° dentro do círculo recortado:

                  · a bola inteira é pintada de `accent`
                  · por cima, um quadrado maior do que ela, rodado 45°,
                    pintado de `chrome`
                  · o quadrado é posto de forma a que UMA das suas arestas
                    passe exactamente pelo centro da bola

                O deslocamento não é um número adivinhado. Depois de rodar 45°,
                a aresta fica a metade do lado do centro do quadrado, na
                diagonal — por isso o centro do quadrado tem de recuar dessa
                distância a partir do centro da bola, e o canto superior
                esquerdo fica em D/2 + (S/2)·(√½ − 1). */}
            <View style={{ width: BOLA, height: BOLA, borderRadius: R.pill, overflow: 'hidden',
              backgroundColor: sc.accent,
              borderWidth: on ? 2 : 0, borderColor: t.state.ok }}>
              <View style={{ position: 'absolute',
                width: CORTE, height: CORTE, left: RECUO, top: RECUO,
                backgroundColor: sc.chrome, transform: [{ rotate: '45deg' }] }} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
