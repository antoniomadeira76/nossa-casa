import React, { useState } from 'react';
import { View, Text, Pressable, Image, ScrollView } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT, PALETA_MEMBROS, corDoMembro } from '../theme';
import Figura, { GRUPOS, figurasDoGrupo, nomeDaFigura } from '../Avatares';
import Icon from '../Icon';
import { Empty, Tile } from '../ui';

// A escolha do avatar: uma figura, uma cor, ou a fotografia da conta Google.
//
// ── O que um avatar tem de fazer nesta app ──────────────────────────────────
//
// Dizer QUEM, num ponto pequeno ao lado de um evento, de uma tarefa, de uma
// despesa. Por isso a escolha tem duas metades que trabalham juntas: a FIGURA
// distingue de perto, a COR distingue de longe — no ponto do calendário e no
// filtro da agenda não há espaço para desenho nenhum, e a cor é tudo o que
// resta.
//
// ⚠ Daí a cor de outro membro não se poder escolher. Duas iguais na mesma casa
// deixam o ponto do calendário sem dizer nada — que é a única coisa que ele faz.
//
// As figuras são desenhadas para isto e vivem no `Avatares.jsx`, à parte dos
// ícones: os do `Icon.jsx` têm significado exclusivo, e um cadeado a servir de
// cara de alguém gasta o «privado» em todo o lado onde ele aparece a sério.

const BOLA = 52;   // dentro de um alvo de 60 — o INVARIANTE #5 pede 44

// Uma etiqueta de secção. Segue o esquema, como todos os títulos da app.
const Etiqueta = ({ t, children }) => (
  <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.slate,
    letterSpacing: 0.4, textTransform: 'uppercase' }}>{children}</Text>
);

export default function EscolherAvatar({ t, user, onFeito }) {
  const { membros: MEMBROS, definirAvatar } = useStore();
  const eu = MEMBROS[user] || {};
  const [erro, setErro] = useState(null);
  const [aGuardar, setAGuardar] = useState(false);

  const foto = eu.avatar || null;
  const usarFoto = !!eu.usarFoto && !!foto;
  const cor = corDoMembro(user, eu.cor);
  const figura = eu.figura || null;
  const inicial = eu.initial || user.charAt(0).toUpperCase();

  // As cores de toda a gente MENOS a minha — as que não posso escolher.
  const ocupadas = new Map(Object.entries(MEMBROS)
    .filter(([n]) => n !== user)
    .map(([n, m]) => [String(corDoMembro(n, m.cor)).toUpperCase(), n]));

  const guardar = async (campos) => {
    setErro(null);
    setAGuardar(true);
    const e = await definirAvatar(user, campos);
    setAGuardar(false);
    if (e) setErro(e);
  };

  // O avatar como ele fica — a mesma ordem de decisão do componente `Avatar`,
  // para que a pré-visualização não possa mentir sobre o resultado.
  const Previa = ({ size }) => (
    <View style={{ width: size, height: size, borderRadius: R.pill, overflow: 'hidden',
      backgroundColor: cor, alignItems: 'center', justifyContent: 'center' }}>
      {usarFoto ? <Image source={{ uri: foto }} accessibilityIgnoresInvertColors
        style={{ width: size, height: size }} />
        : figura ? <Figura nome={figura} size={size * 0.66} color="#FFFFFF" />
        : <Text style={{ fontFamily: FONT.ui, fontSize: size * 0.46, fontWeight: '700', color: '#FFFFFF' }}>
            {inicial}
          </Text>}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ gap: S.xl, paddingBottom: S.lg }}>
      <View style={{ alignItems: 'center', gap: S.md }}>
        <Previa size={72} />
        <Text style={{ fontFamily: FONT.body, fontSize: 13, lineHeight: 20, color: t.text3,
          textAlign: 'center' }}>
          É assim que {user} aparece nas linhas, no filtro da agenda e nos pontos do calendário.
        </Text>
      </View>

      {/* ── As figuras ─────────────────────────────────────────────────── */}
      {GRUPOS.map(grupo => (
        <View key={grupo} style={{ gap: S.md }}>
          <Etiqueta t={t}>{grupo}</Etiqueta>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }}>
            {figurasDoGrupo(grupo).map(k => {
              const escolhida = !usarFoto && figura === k;
              return (
                <Pressable key={k} disabled={aGuardar}
                  onPress={() => guardar({ figura: k, usarFoto: false })}
                  accessibilityRole="button" accessibilityLabel={nomeDaFigura(k)}
                  accessibilityState={{ selected: escolhida }}
                  style={{ width: 60, height: 60, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: BOLA, height: BOLA, borderRadius: R.pill,
                    backgroundColor: cor, alignItems: 'center', justifyContent: 'center',
                    borderWidth: escolhida ? 3 : 0, borderColor: t.state.ok }}>
                    <Figura nome={k} size={30} color="#FFFFFF" />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      {/* ── A inicial, que é o que estava antes de haver figuras ────────── */}
      <View style={{ gap: S.md }}>
        <Etiqueta t={t}>Sem figura</Etiqueta>
        <Pressable disabled={aGuardar} onPress={() => guardar({ figura: '', usarFoto: false })}
          accessibilityRole="button" accessibilityLabel="A minha inicial"
          accessibilityState={{ selected: !usarFoto && !figura }}
          style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: S.lg,
            paddingHorizontal: S.lg, borderRadius: R.card,
            borderWidth: (!usarFoto && !figura) ? 2 : 1,
            borderColor: (!usarFoto && !figura) ? t.accent : t.border, backgroundColor: t.card }}>
          <View style={{ width: BOLA, height: BOLA, borderRadius: R.pill, backgroundColor: cor,
            alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: FONT.ui, fontSize: 22, fontWeight: '700', color: '#FFFFFF' }}>
              {inicial}
            </Text>
          </View>
          <Text style={{ flex: 1, fontFamily: FONT.display, fontSize: 14.5, color: t.text1 }}>
            A minha inicial
          </Text>
          {(!usarFoto && !figura) ? <Icon name="check" size={20} color={t.accent} /> : null}
        </Pressable>
      </View>

      {/* ── A cor ──────────────────────────────────────────────────────── */}
      <View style={{ gap: S.md }}>
        <Etiqueta t={t}>A cor</Etiqueta>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }}>
          {PALETA_MEMBROS.map(c => {
            const dono = ocupadas.get(c.toUpperCase());
            const escolhida = cor.toUpperCase() === c.toUpperCase();
            return (
              <Pressable key={c} disabled={!!dono || aGuardar}
                onPress={() => guardar({ cor: c })}
                accessibilityRole="button"
                accessibilityLabel={dono ? `Cor de ${dono}, indisponível` : `Cor ${c}`}
                accessibilityState={{ selected: escolhida, disabled: !!dono }}
                style={{ width: 60, height: 60, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 44, height: 44, borderRadius: R.pill, backgroundColor: c,
                  alignItems: 'center', justifyContent: 'center', opacity: dono ? 0.28 : 1,
                  borderWidth: escolhida ? 3 : 0, borderColor: t.state.ok }}>
                  {figura ? <Figura nome={figura} size={24} color="#FFFFFF" /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
        {ocupadas.size ? (
          <Text style={{ fontFamily: FONT.body, fontSize: 12.5, lineHeight: 19, color: t.text3 }}>
            As esbatidas já são de outros membros da casa. Duas pessoas com a mesma cor
            deixariam o ponto do calendário sem dizer de quem é cada evento.
          </Text>
        ) : null}
      </View>

      {/* ── A fotografia da conta ──────────────────────────────────────── */}
      <View style={{ gap: S.md }}>
        <Etiqueta t={t}>Fotografia da conta</Etiqueta>
        {foto ? (
          <Pressable onPress={() => guardar({ usarFoto: !usarFoto })} disabled={aGuardar}
            accessibilityRole="button" accessibilityLabel="Usar a fotografia da conta Google"
            accessibilityState={{ selected: usarFoto }}
            style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: S.lg,
              paddingHorizontal: S.lg, borderRadius: R.card, borderWidth: usarFoto ? 2 : 1,
              borderColor: usarFoto ? t.accent : t.border, backgroundColor: t.card }}>
            <Image source={{ uri: foto }} accessibilityIgnoresInvertColors
              style={{ width: BOLA, height: BOLA, borderRadius: R.pill }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONT.display, fontSize: 14.5, color: t.text1 }}>
                A minha fotografia
              </Text>
              <Text style={{ fontFamily: FONT.body, fontSize: 12.5, color: t.text3 }}>
                {usarFoto ? 'A ser usada' : 'Tocar para usar'}
              </Text>
            </View>
            {usarFoto ? <Icon name="check" size={20} color={t.accent} /> : null}
          </Pressable>
        ) : (
          // ⚠ Esta frase dizia «Aparece aqui depois de entrar com a conta
          // Google» — a quem já tinha entrado com a conta Google. Mandava
          // fazer o que já estava feito, e não explicava nada.
          //
          // A fotografia só chega no INSTANTE da entrada, no `meta.avatarURL`
          // que a Google devolve nesse momento. Uma sessão anterior a este
          // campo existir nunca a escreveu, e não há como a ir buscar depois:
          // o token que a app tem é o da agenda, e pede `calendar.events` e
          // mais nada. Alargar o âmbito de uma autorização de AGENDA para
          // apanhar uma fotografia seria pedir mais acesso do que o preciso.
          //
          // Portanto o remédio é o que aqui está escrito, e é verdade.
          <Empty t={t} icon="user"
            title="Ainda não há fotografia guardada."
            hint="Ela vem da Google no momento da entrada — termine a sessão e volte a entrar com a conta Google para a trazer." />
        )}
      </View>

      {/* O erro é um Tile de erro — a forma dos avisos desta app, e não uma
          caixa desenhada aqui. Um aviso com outro aspeto lê-se como sendo de
          outro sítio. */}
      {erro ? <Tile t={t} kind="err" icon="warning">{erro}</Tile> : null}
    </ScrollView>
  );
}
