import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { S, R, FONT } from '../theme';
import { SectionTitle, Linha, Empty, Pill } from '../ui';
import Icon from '../Icon';
import { pesquisar, sugerir, realcar, MINIMO, AREAS_DA_PESQUISA } from '../pesquisa';

// Antes de haver duas letras: «Onde se procura» — as áreas, uma linha cada,
// com o ícone do rodapé, o que se procura em cada uma, e um toque leva lá
// (opção C de `design/campo-de-pesquisa.dc.html`, 13/09/2026). Era um cartão
// que repetia «Procurar na casa» e uma lista de áreas em texto corrido.
export const ONDE_SE_PROCURA = {
  Tarefas: { sub: 'título e quem faz', destino: { tab: 'tarefas' } },
  Agenda: { sub: 'evento, local e dia', destino: { tab: 'agenda' } },
  Compras: { sub: 'artigo e corredor', destino: { tab: 'compras' } },
  Dinheiro: { sub: 'despesa, conta fixa e meta', destino: { tab: 'dinheiro' } },
  Equipamentos: { sub: 'nome, marca e contrato', destino: { vista: 'equip' } },
  'Saúde': { sub: 'especialidade, médico e documento', destino: { vista: 'saude' } },
  Pessoas: { sub: 'o nome de quem vive cá', destino: { tab: 'tarefas' } },
  'Documentação': { sub: 'como funciona e novidades', destino: { vista: 'doc' } },
};

// Os resultados da pesquisa global — o que aparece no lugar do conteúdo do
// Início enquanto se escreve (opção A de `design/pesquisa-global.dc.html`,
// 13/09/2026). Agrupados por área na ordem do rodapé, linhas planas do desenho
// C, a palavra encontrada a negrito, e três pastilhas de autocompletar por
// cima. Cada linha leva ao sítio: quem sabe para onde é o App, por `onAbrir`.
//
// O ícone de cada área é o do rodapé — o mesmo significado, o mesmo desenho.
const ICONE = {
  Tarefas: 'checkSquare', Agenda: 'calendar', Compras: 'fileDone', Dinheiro: 'wallet',
  Equipamentos: 'houseGear', 'Saúde': 'heartPulse', Pessoas: 'user', 'Documentação': 'fileText',
};

// O título com o termo a negrito. Um `<Text>` com pedaços, não dois nós soltos:
// os pedaços colam-se sem espaço a mais.
function Titulo({ t, titulo, termo }) {
  return (
    <Text numberOfLines={2} style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>
      {realcar(titulo, termo).map((p, i) => (
        <Text key={i} style={p.marca ? { fontWeight: '700', color: t.actFg } : null}>{p.texto}</Text>
      ))}
    </Text>
  );
}

// A contagem do grupo, na pastilha discreta do desenho C.
const Contagem = ({ t, n }) => <Pill label={String(n)} fg={t.text3} bg={t.subtle} border={t.border} />;

// `areas`: as áreas que este utilizador vê — a criança passa só as dela.
export default function Resultados({ t, termo, itens, onAbrir, onSugerir, areas = AREAS_DA_PESQUISA }) {
  const { grupos, total, termo: limpo } = pesquisar(itens, termo);
  const sugestoes = sugerir(itens, termo);
  const curto = limpo.length < MINIMO;
  const contagem = (g) => <Contagem t={t} n={g.itens.length} />;
  const onde = areas.filter(a => ONDE_SE_PROCURA[a]);

  return (
    <View style={{ gap: S.xl }}>
      {curto ? (
        <View>
          <SectionTitle t={t}>Onde se procura</SectionTitle>
          {onde.map((a, i) => (
            <Linha key={a} t={t} last={i === onde.length - 1}>
              <Pressable onPress={() => onAbrir(ONDE_SE_PROCURA[a].destino)} accessibilityRole="button"
                accessibilityLabel={`Ir a ${a}`}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12,
                  minHeight: 44, opacity: pressed ? 0.6 : 1 })}>
                <Icon name={ICONE[a] || 'search'} size={20} color={t.titulo} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>{a}</Text>
                  <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>{ONDE_SE_PROCURA[a].sub}</Text>
                </View>
                <Icon name="caretRight" size={18} color={t.text3} />
              </Pressable>
            </Linha>
          ))}
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3, textAlign: 'center', paddingTop: S.md }}>
            Escreva pelo menos duas letras — sem acentos nem maiúsculas a contar.
          </Text>
        </View>
      ) : null}

      {/* As sugestões — pastilhas de 44, o autocompletar. Tocar numa completa o
          campo e mostra os resultados dela. */}
      {sugestoes.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }}>
          {sugestoes.map(p => (
            <Pressable key={p} onPress={() => onSugerir(p)} accessibilityRole="button"
              accessibilityLabel={`Procurar ${p}`}
              style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 14, borderRadius: R.row,
                borderWidth: 1, borderColor: t.actBrd, backgroundColor: pressed ? t.subtle : t.actBg,
                alignItems: 'center', justifyContent: 'center' })}>
              <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.actFg }}>{p}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {!curto && total === 0 ? (
        <Empty t={t} icon="search" title={`Nada encontrado para «${String(termo).trim()}»`}
          hint="Procura-se pelo título, pelo nome e pelo que está escrito nas notas — sem acentos nem maiúsculas a contar." />
      ) : null}

      {/* Um grupo só existe com resultados: `pesquisar` não devolve áreas
          vazias, por isso um título nunca fica com nada por baixo. */}
      {grupos.map(g => (
        <View key={g.area}>
          <SectionTitle t={t} right={contagem(g)}>{g.area}</SectionTitle>
          {g.itens.map((it, i) => (
            <Linha key={`${g.area}-${i}-${it.titulo}`} t={t} last={i === g.itens.length - 1}>
              <Pressable onPress={() => onAbrir(it.destino, it)} accessibilityRole="button"
                accessibilityLabel={`Abrir ${it.titulo} — ${g.area}`}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12,
                  minHeight: 44, opacity: pressed ? 0.6 : 1 })}>
                <Icon name={ICONE[g.area] || 'search'} size={20} color={t.titulo} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Titulo t={t} titulo={it.titulo} termo={termo} />
                  {it.sub ? (
                    <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>{it.sub}</Text>
                  ) : null}
                </View>
                <Icon name="caretRight" size={18} color={t.text3} />
              </Pressable>
            </Linha>
          ))}
        </View>
      ))}
    </View>
  );
}
