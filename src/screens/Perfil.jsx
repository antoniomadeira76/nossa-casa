import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { SCHEMES, S, R, FONT, elev, corDoMembro } from '../theme';
import { EUR, plural } from '../format';
import { FEM } from '../data';
import { Card, SectionTitle, Label, Row, Pill, Primary, Toggle, Segmented, Tap, Avatar, avatarDe, mostraFotografia } from '../ui';
import Icon from '../Icon';
import { nomeDaFigura } from '../Avatares';
import Sheet from '../Sheet';
import ConfirmarAdministradores from '../sheets/ConfirmarAdministradores';
import EscolherAvatar from '../sheets/EscolherAvatar';
import * as servidor from '../pocketbase';

// O aspeto por extenso, para a frase que diz o que está escolhido.
const MODO_LABEL = { claro: 'Claro', escuro: 'Escuro', sistema: 'Segue o dispositivo' };

const ROLE_LABEL = (r, name) => {
  const fem = FEM(name);
  return r === 'admin' ? (fem ? 'administradora' : 'administrador') : r === 'adulto' ? 'adulto' : 'criança';
};

// A bola do esquema de cor, e a geometria do seu risco diagonal.
//
// BOLA  o diâmetro (dentro do alvo de 44 do INVARIANTE #5)
// CORTE o quadrado que tapa metade — maior do que a bola, para a cobrir
//       inteira depois de rodado
// RECUO onde o quadrado assenta, para a aresta passar pelo centro da bola
const BOLA = 34;
const CORTE = 60;
const RECUO = BOLA / 2 + (CORTE / 2) * (Math.SQRT1_2 - 1);
export default function Perfil({ t, user, onClose, onSignOut, onSaude, onDoc, onGestao }) {
  const st = useStore();
  const { s, set, isAdmin, resetDemo, startBlank, canSeeHealth, healthOf, receitasAExpirar, membros: MEMBERS, deDemonstracao, nomeDaCasa, mudarPreferencia } = st;

  // A referência 09 mostra a contagem de consultas e um aviso das receitas na
  // própria linha da Saúde. Passa pelo canSeeHealth como tudo o resto.
  const consultas = Object.keys(MEMBERS)
    .filter(m => canSeeHealth(m, user))
    .reduce((a, m) => a + healthOf(m, user).length, 0);
  const receitas = receitasAExpirar(user).length;

  const admin = isAdmin(user);
  const mode = s.themeByUser[user] || 'claro';
  const scheme = s.schemeByUser[user] ?? 0;

  // Qual das duas acções destrutivas está à espera de confirmação.
  //
  // As duas apagavam a casa AO TOQUE — `onPress={resetDemo}`, sem uma pergunta,
  // e lado a lado. Duas acções irreversíveis à distância de um dedo enganado.
  //
  // Agora abrem uma folha que exige a confirmação de TODOS os administradores,
  // cada um com a sua palavra-passe, verificada pelo servidor. Ver
  // `sheets/ConfirmarAdministradores.jsx`.
  const [aApagar, setAApagar] = useState(null);   // 'repor' | 'zero' | null
  const [erroAoApagar, setErroAoApagar] = useState(null);
  const [aEscolherAvatar, setAEscolherAvatar] = useState(false);

  // O subtítulo da linha do Avatar: a escolha EM CURSO, por extenso. Um «ver»
  // ou um «alterar» não diz nada que a seta já não diga; o que a pessoa quer
  // saber ao passar os olhos é o que está lá agora.
  //
  // A ordem é a mesma do `mostraFotografia`, para a linha não poder mentir
  // sobre o que a bola ao lado dela mostra.
  const COMO_APARECE = mostraFotografia(MEMBERS[user])
    ? 'A fotografia da conta Google'
    : (MEMBERS[user]?.figura && nomeDaFigura(MEMBERS[user].figura))
      || 'A sua inicial';

  // Quantos administradores tem esta casa — a frase da secção de apagar conta-os
  // em vez de prometer «todos» sem dizer quantos são.
  const nAdmins = Object.values(s.roles || {}).filter(r => r === 'admin').length;

  const APAGAR = {
    repor: {
      titulo: 'Repor Dados de Demonstração',
      aviso: 'Esta acção substitui a casa pelos dados de demonstração. '
        + 'O que esta família escreveu — eventos, tarefas, despesas, cofres — sai. Não se desfaz.',
      rotulo: 'Repor a demonstração',
      fazer: async () => { resetDemo(); },
    },
    zero: {
      titulo: 'Começar de Zero',
      aviso: 'Esta acção apaga os dados desta casa — eventos, tarefas, despesas, '
        + 'cofres, equipamentos e preços — NESTE APARELHO E NO SERVIDOR. '
        + 'Os membros e os papéis ficam. Não se desfaz.',
      rotulo: 'Apagar os dados da casa',
      // O servidor PRIMEIRO, e a loja local só depois.
      //
      // Ao contrário de tudo o resto nesta app, que é local-primeiro: se o
      // servidor recusar — sessão caducada, papel mudado entretanto — a casa
      // local fica intacta e a folha diz porquê. Limpar aqui e falhar lá
      // deixava as duas metades a discordar, e a seguinte leitura do servidor
      // trazia tudo de volta sem ninguém perceber.
      fazer: async () => {
        if (servidor.estaLigado()) await servidor.auth.limparCasaNoServidor();
        startBlank();
      },
    },
  };

  return (
    <Sheet t={t} title={`${user} ${nomeDaCasa}`} sub={MEMBERS[user]?.email || ROLE_LABEL(s.roles[user], user)}
      onClose={onClose}
      leading={
        // O avatar abre a escolha. Um alvo de 44 à volta de uma bola de 40 —
        // o INVARIANTE #5 não abre excepção para o cabeçalho de uma folha.
        <Tap onPress={() => setAEscolherAvatar(true)} label="Escolher avatar">
          <Avatar {...avatarDe(user, MEMBERS[user], t.text3)} size={40} />
        </Tap>
      }
      headerRight={
        <Tap onPress={onSignOut} label="Terminar sessão">
          <Icon name="logout" size={22} color={t.text3} />
        </Tap>
      }>
      {/* As duas secções das referências 09 e 24: o que é da casa primeiro,
          o que é só deste perfil depois. Não havia títulos nenhuns, e as
          entradas da casa estavam por baixo do Aspeto. */}
      <View>
        <SectionTitle t={t}>A Casa</SectionTitle>
        <Card t={t} pad={false} style={{ paddingHorizontal: 16 }}>
          {admin ? (
            <Row t={t} icon="houseGear" title="Gestão da Casa"
              sub="Rendimento, envelopes, semanada, membros"
              onPress={() => { onClose(); onGestao?.(); }} />
          ) : null}
          <Row t={t} icon="heartPulse" title="Saúde da Família"
            sub={plural(consultas, 'consulta marcada', 'consultas marcadas')}
            right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
              {receitas ? (
                <Pill label={plural(receitas, 'receita a expirar', 'receitas a expirar')}
                  fg={t.state.warnDeep} bg={t.state.warnBg} border={t.state.warn} />
              ) : null}
              <Icon name="caretRight" size={18} color={t.text3} />
            </View>}
            onPress={() => { onClose(); onSaude?.(); }} last />
        </Card>
      </View>

      {/* ── Aparência ──────────────────────────────────────────────────────
          Três perguntas sobre a mesma coisa — como este perfil se vê e como
          esta pessoa aparece — debaixo de um cabeçalho só.

          O AVATAR entra aqui porque não estava em lado nenhum: a escolha
          abria-se tocando na bola do cabeçalho da folha, e nada no ecrã dizia
          que aquilo era tocável. Um gesto que não se anuncia não existe. */}
      <View>
        <SectionTitle t={t}>Aparência</SectionTitle>
        <Card t={t} pad={false} style={{ paddingHorizontal: 16 }}>
          <Row t={t} icon="user" title="Avatar" sub={COMO_APARECE}
            right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
              <Avatar {...avatarDe(user, MEMBERS[user], t.text3)} size={28} />
              <Icon name="caretRight" size={18} color={t.text3} />
            </View>}
            onPress={() => setAEscolherAvatar(true)} last />
        </Card>
      </View>

      <Card t={t} style={{ gap: S.lg }}>
      <View style={{ gap: S.md }}>
        <Label t={t}>Claro ou escuro</Label>
        <View style={{ flexDirection: 'row', gap: S.md }}>
          {[{ k: 'claro', icon: 'sun', label: 'Claro' },
            { k: 'escuro', icon: 'moon', label: 'Escuro' },
            { k: 'sistema', icon: 'refresh', label: 'Sistema' }].map(o => {
            const on = mode === o.k;
            return (
              <Pressable key={o.k} onPress={() => mudarPreferencia(user, { aspeto: o.k })}
                accessibilityRole="button" accessibilityLabel={`Aspeto ${o.label}`} accessibilityState={{ selected: on }}
                style={{ width: 44, height: 44, borderRadius: R.row, borderWidth: 1,
                  borderColor: on ? t.chrome : t.border, backgroundColor: on ? t.chrome : 'transparent',
                  alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={o.icon} size={20} color={on ? '#FFFFFF' : t.text2} />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: t.divider }} />

      <View style={{ gap: S.md }}>
        <Label t={t}>Cor do perfil</Label>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, flexWrap: 'wrap' }}>
          {SCHEMES.map((sc, i) => {
            const on = scheme === i;
            return (
              <Pressable key={sc.name} onPress={() => mudarPreferencia(user, { esquema: i })}
                accessibilityRole="button" accessibilityLabel={`Esquema ${sc.name}`} accessibilityState={{ selected: on }}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                {/* Dois tons: a cor de ação e a do cabeçalho. Um esquema são
                    as duas, e uma bolinha só não distingue os que partilham
                    o acento.

                    A separação é DIAGONAL, e não a meio na vertical. Não há
                    gradientes sem biblioteca — e o sistema visual é próprio,
                    não se traz uma por causa de um risco. Faz-se com um
                    quadrado rodado 45° dentro do círculo recortado:

                      · a bola inteira é pintada de `accent`
                      · por cima, um quadrado maior do que ela, rodado 45°,
                        pintado de `chrome`
                      · o quadrado é posto de forma a que UMA das suas arestas
                        passe exactamente pelo centro da bola

                    O deslocamento não é um número adivinhado. Depois de rodar
                    45°, a aresta fica a metade do lado do centro do quadrado,
                    na diagonal — por isso o centro do quadrado tem de recuar
                    dessa distância a partir do centro da bola, e o canto
                    superior esquerdo fica em D/2 + (S/2)·(√½ − 1). */}
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
        <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
          {MODO_LABEL[mode]} · {SCHEMES[scheme].name}. Vale só para este perfil — os outros
          membros mantêm o que escolheram.
        </Text>
      </View>
      </Card>

      {/* ── Avisos ─────────────────────────────────────────────────────────
          Os dados estão em `s.notif` desde sempre e nada os mostrava. Sobe a
          cabeçalho próprio: era um `Label` de 12 px a servir de secção. */}
      <View>
        <SectionTitle t={t}>Avisos</SectionTitle>
        <Card t={t} style={{ gap: S.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
            <Text style={{ flex: 1, fontFamily: FONT.body, fontSize: 14.5, lineHeight: 22, color: t.text2 }}>
              Um resumo por dia às {s.notif.hour}, avisando{' '}
              {plural(s.notif.lead, 'dia', 'dias')} antes de cada prazo.
            </Text>
            <Toggle t={t} on={s.notif.digest} label="Resumo diário"
              onPress={() => mudarPreferencia(user, { notif: { digest: !s.notif.digest } })} />
          </View>
        </Card>
      </View>

      {/* ── A App ──────────────────────────────────────────────────────────
          Este cartão não tinha cabeçalho nenhum, e vinha depois de uma régua
          que não separava nada com nome. */}
      <View>
        <SectionTitle t={t}>A App</SectionTitle>
        <Card t={t} pad={false} style={{ paddingHorizontal: 16 }}>
          <Row t={t} icon="fileText" title="Documentação" sub="O que a app faz, versão a versão"
            onPress={() => { onClose(); onDoc?.(); }} last />
        </Card>
        {/* ⚠ Isto era uma LINHA, com ícone, título e subtítulo — igual à
            Documentação ao lado, que abre um ecrã. Uma afirmação vestida de
            navegação: parecia tocável e não era. É uma nota de rodapé, e passa
            a ter o aspeto de uma. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md,
          paddingHorizontal: 2, paddingTop: S.md }}>
          <Icon name="lock" size={14} color={t.text3} />
          <Text style={{ flex: 1, fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
            Guardado neste dispositivo — os dados desta casa não saem daqui.
          </Text>
        </View>
      </View>

      {/* ── Apagar Dados ───────────────────────────────────────────────────
          ⚠ Estes dois botões estavam soltos no fim da página, sem cabeçalho e
          sem uma palavra a dizer o que faziam. E o mais perigoso dos dois era
          o ÚNICO pintado com a cor de ação — que nesta app se lê como «este é
          o botão principal do ecrã». O que ele faz é apagar a casa.

          Agora têm secção com nome, uma frase que diz o que os espera, e a cor
          de erro do sistema em vez do acento do esquema. A cor de ação volta a
          querer dizer só uma coisa. */}
      {admin ? (
        <View>
          <SectionTitle t={t}>Apagar Dados</SectionTitle>
          <Card t={t} style={{ gap: S.lg }}>
            <Text style={{ fontFamily: FONT.body, fontSize: 13.5, lineHeight: 21, color: t.text2 }}>
              As duas acções não se desfazem, e nenhuma acontece ao toque:{' '}
              {nAdmins > 1
                ? `pedem a confirmação dos ${nAdmins} administradores desta casa.`
                : 'pedem a sua confirmação.'}
            </Text>
            <Pressable onPress={() => { setErroAoApagar(null); setAApagar('repor'); }}
              accessibilityRole="button" accessibilityLabel="Repor dados de demonstração"
              style={{ minHeight: 44, borderRadius: R.pill, borderWidth: 1, borderColor: t.state.err,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Icon name="refresh" size={18} color={t.state.errDeep} />
              <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '500', color: t.state.errDeep }}>
                Repor Dados de Demonstração
              </Text>
            </Pressable>
            <Pressable onPress={() => { setErroAoApagar(null); setAApagar('zero'); }}
              accessibilityRole="button" accessibilityLabel="Começar de zero"
              style={{ minHeight: 44, borderRadius: R.pill, borderWidth: 1, borderColor: t.state.err,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Icon name="trash" size={18} color={t.state.errDeep} />
              <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '500', color: t.state.errDeep }}>
                Começar de Zero (casa nova)
              </Text>
            </Pressable>
          </Card>
        </View>
      ) : null}

      {aEscolherAvatar ? (
        <Sheet t={t} title="Avatar" sub={`Como ${user} aparece na casa`}
          onClose={() => setAEscolherAvatar(false)}>
          <EscolherAvatar t={t} user={user} onFeito={() => setAEscolherAvatar(false)} />
        </Sheet>
      ) : null}

      {/* A confirmação dos administradores. Vive dentro da folha do Perfil, e
          não fora dela: o INVARIANTE #1 quer o rodapé como último filho da raiz
          da app, e uma folha aberta fora da árvore levava-o com ela. */}
      {aApagar ? (
        <Sheet t={t} title={APAGAR[aApagar].titulo}
          sub="Precisa de todos os administradores"
          onClose={() => setAApagar(null)}>
          <ConfirmarAdministradores
            t={t} user={user}
            titulo={APAGAR[aApagar].titulo}
            aviso={APAGAR[aApagar].aviso}
            rotuloAcao={APAGAR[aApagar].rotulo}
            erro={erroAoApagar}
            onCancelar={() => setAApagar(null)}
            onConfirmado={async () => {
              try {
                await APAGAR[aApagar].fazer();
                setAApagar(null);
                onClose();
              } catch (e) {
                // A folha fica aberta com o erro à vista. Fechá-la aqui era
                // deixar quem carregou sem saber se a casa foi ou ficou.
                setErroAoApagar(e.message || 'Não foi possível apagar.');
              }
            }} />
        </Sheet>
      ) : null}
    </Sheet>
  );
}
