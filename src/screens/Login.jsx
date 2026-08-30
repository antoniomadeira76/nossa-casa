import React, { useState } from 'react';
import { View, Text, Pressable, ImageBackground } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { S, R, FONT, elev, MEMBER_COLOR } from '../theme';
import Icon, { Marca, GoogleG as G } from '../Icon';
import { MEMBERS, FEM } from '../data';
import { useStore } from '../store';
import { Pill } from '../ui';

export default function Login({ t, onEnter }) {
  const { s, pinError, verificarPin } = useStore();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState('login');   // login | contas | criancas | pin
  const [kid, setKid] = useState(null);
  const [pin, setPin] = useState('');
  const [tries, setTries] = useState(0);
  const [blocked, setBlocked] = useState(0);

  const glass = {
    backgroundColor: 'rgba(0,21,41,0.55)', borderRadius: R.card,
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 30, gap: S.lg,
  };

  const submitPin = (p) => {
    if (blocked > Date.now()) return;
    if (verificarPin(kid, p)) { setTries(0); onEnter(kid); return; }
    const n = tries + 1;
    setTries(n); setPin('');
    if (n >= 5) { setBlocked(Date.now() + 60000); setTries(0); }
  };

  // Com a tecla OK, o PIN só é submetido quando a criança o diz. Submetia-se
  // sozinho ao quarto dígito: um engano no último algarismo gastava uma
  // tentativa das cinco sem hipótese de o corrigir.
  const press = (k) => {
    if (k === '←') return setPin(p => p.slice(0, -1));
    if (k === 'OK') return pin.length === 4 && submitPin(pin);
    if (pin.length >= 4) return;
    setPin(pin + k);
  };

  return (
    <ImageBackground source={require('../../assets/login-bg.png')} resizeMode="cover" style={{ flex: 1, backgroundColor: t.chrome }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' }} />
      <Marca size={320} opacity={0.14} style={{ position: 'absolute', top: 100, alignSelf: 'center' }} />

      <View style={{ position: 'absolute', top: insets.top + 30, left: 16, gap: 4 }}>
        <Text style={{ fontFamily: FONT.display, fontSize: 32, fontWeight: '500', color: '#FFFFFF', letterSpacing: 0.25 }}>Nossa Casa</Text>
        <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>Família Bengui · agenda, tarefas e dinheiro</Text>
      </View>

      <View style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 14) }}>
        {step === 'login' ? (
          <>
          <View style={glass}>
            <Text style={{ fontFamily: FONT.display, fontSize: 24, fontWeight: '500', color: '#FFFFFF' }}>Bem-vindo</Text>
            <Text style={{ fontFamily: FONT.body, fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.8)' }}>
              {/* «acessar» é do Brasil — em Portugal é «aceder». O protótipo
                  tem o mesmo erro (docs/referencia/01-entrar.png), mas o
                  registo da língua é invariante do CLAUDE.md, não uma medida
                  de desenho onde o protótipo ganha. */}
              Entre com a sua Conta Google para aceder à casa partilhada.
            </Text>
            <Pressable onPress={() => setStep('contas')} accessibilityRole="button" accessibilityLabel="Continuar com Google"
              style={({ pressed }) => ({ minHeight: 56, borderRadius: R.pill, backgroundColor: pressed ? '#FAFAFA' : '#FFFFFF',
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, ...elev(3) })}>
              <G />
              <Text style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: '700', color: '#262626', letterSpacing: 0.4 }}>Continuar com Google</Text>
            </Pressable>
            <Text style={{ fontFamily: FONT.ui, fontSize: 12, lineHeight: 19, color: 'rgba(255,255,255,0.62)' }}>
              Ao continuar, a Nossa Casa recebe o seu nome e endereço de e-mail. Nenhum dado bancário é partilhado com a Google.
            </Text>
            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
            <Pressable onPress={() => setStep('criancas')} accessibilityRole="button" accessibilityLabel="Entrar como criança"
              style={{ minHeight: 48, borderRadius: R.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)',
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <Icon name="smile" size={20} color="#FFFFFF" />
              <Text style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: '500', color: '#FFFFFF', letterSpacing: 0.4 }}>Entrar como Criança</Text>
            </Pressable>
          </View>

          {/* A referência 01 tem esta linha por baixo do cartão, e faltava.
              É o que diz a alguém que abriu a app sem convite o que fazer a
              seguir — sem ela o ecrã é uma porta fechada sem indicação. */}
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, lineHeight: 19,
            color: 'rgba(255,255,255,0.62)', paddingHorizontal: 4 }}>
            Ainda não faz parte desta casa? Peça o convite ao administrador da família.
          </Text>
          </>
        ) : step === 'contas' ? (
          <View style={glass}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <G size={20} />
              <Text style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: '500', color: '#FFFFFF' }}>Escolher uma conta</Text>
            </View>
            {['Rita', 'Tomás'].map(n => (
              <Pressable key={n} onPress={() => onEnter(n)} accessibilityRole="button" accessibilityLabel={n}
                style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: R.card, padding: 14,
                  minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 40, height: 40, borderRadius: R.pill, backgroundColor: t.chrome, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: FONT.display, fontSize: 17, fontWeight: '500', color: '#FFFFFF' }}>{MEMBERS[n].initial}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: FONT.body, fontSize: 16, color: '#262626' }}>{n} Bengui</Text>
                  <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 12, color: '#6A7282' }}>{MEMBERS[n].email}</Text>
                </View>
                {/* Pastilha contornada, como na referência 02 — e com a
                    concordância certa: dizia «Administração» para a Rita. */}
                <Pill label={s.roles[n] === 'admin' ? (FEM(n) ? 'Administradora' : 'Administrador') : 'Adulto'}
                  fg="#6A7282" bg="transparent" border="#D6DBE4" />
              </Pressable>
            ))}
            {/* A referência 02 tem esta entrada: quem chega com outra conta
                não fica sem saída no ecrã das duas que já existem. */}
            <Pressable onPress={() => setStep('login')} accessibilityRole="button"
              accessibilityLabel="Usar outra conta Google"
              style={{ minHeight: 56, borderRadius: R.card, borderWidth: 1, borderStyle: 'dashed',
                borderColor: 'rgba(255,255,255,0.4)', flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 14, gap: 14 }}>
              <View style={{ width: 40, height: 40, borderRadius: R.pill, borderWidth: 1,
                borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.5)',
                alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="plus" size={18} color="#FFFFFF" />
              </View>
              <Text style={{ fontFamily: FONT.body, fontSize: 15, color: '#FFFFFF' }}>
                Usar outra conta Google
              </Text>
            </Pressable>
            <Pressable onPress={() => setStep('login')} accessibilityRole="button" accessibilityLabel="Voltar"
              style={{ minHeight: 44, borderRadius: R.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '500', color: '#FFFFFF' }}>Voltar</Text>
            </Pressable>
          </View>
        ) : step === 'criancas' ? (
          <View style={glass}>
            <Text style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: '500', color: '#FFFFFF' }}>Quem está a entrar?</Text>
            <Text style={{ fontFamily: FONT.body, fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.8)' }}>
              Escolha o seu nome e introduza o PIN de 4 dígitos.
            </Text>
            {['Léo', 'Mia'].map(n => {
              const hasPin = !!s.pins[n];
              return (
                <Pressable key={n} onPress={() => { if (hasPin) { setKid(n); setPin(''); setStep('pin'); } }}
                  accessibilityRole="button" accessibilityLabel={n} accessibilityState={{ disabled: !hasPin }}
                  style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: R.card, padding: 14,
                    minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 14, opacity: hasPin ? 1 : 0.55 }}>
                  <View style={{ width: 40, height: 40, borderRadius: R.pill,
                    backgroundColor: n === 'Léo' ? '#1890FF' : '#011B58', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: FONT.display, fontSize: 17, fontWeight: '500', color: '#FFFFFF' }}>{MEMBERS[n].initial}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontFamily: FONT.body, fontSize: 16, color: '#262626' }}>{n}</Text>
                    <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: '#6A7282' }}>
                      {hasPin ? 'Perfil de criança' : 'Ainda sem PIN — pedir a um adulto'}
                    </Text>
                  </View>
                  {hasPin ? <Icon name="caretRight" size={22} color="#6A7282" /> : null}
                </Pressable>
              );
            })}
            <Pressable onPress={() => setStep('login')} accessibilityRole="button" accessibilityLabel="Voltar"
              style={{ minHeight: 44, borderRadius: R.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '500', color: '#FFFFFF' }}>Voltar</Text>
            </Pressable>
          </View>
        ) : (
          <View style={glass}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 44, height: 44, borderRadius: R.pill,
                backgroundColor: MEMBER_COLOR[kid] || t.chrome,
                alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: '500', color: '#FFFFFF' }}>
                  {(MEMBERS[kid] || { initial: '?' }).initial}
                </Text>
              </View>
              <View style={{ gap: 2 }}>
                <Text style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: '500', color: '#FFFFFF' }}>Olá, {kid}</Text>
                <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, color: 'rgba(255,255,255,0.7)' }}>PIN de 4 dígitos</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 14, justifyContent: 'center' }}>
              {[0, 1, 2, 3].map(i => (
                <View key={i} style={{ width: 16, height: 16, borderRadius: R.pill, borderWidth: 2,
                  borderColor: 'rgba(255,255,255,0.6)', backgroundColor: pin.length > i ? '#FFFFFF' : 'transparent' }} />
              ))}
            </View>
            {blocked > Date.now() ? (
              <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: '#FF8A8C', textAlign: 'center' }}>
                Demasiadas tentativas. Tente dentro de um minuto.
              </Text>
            ) : tries > 0 ? (
              <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: '#FFB27A', textAlign: 'center' }}>
                PIN incorreto. Faltam {5 - tries} tentativas.
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {/* A tecla OK existe na referência 27. Sem ela o PIN submete-se
                  sozinho ao quarto dígito, e um engano no último algarismo
                  gasta uma tentativa das cinco sem hipótese de o corrigir. */}
              {['1','2','3','4','5','6','7','8','9','←','0','OK'].map((k, i) => (
                <Pressable key={i} onPress={() => press(k)} accessibilityRole="button" accessibilityLabel={k === '←' ? 'Apagar' : k}
                  style={{ width: '30%', minHeight: 52, borderRadius: R.row, borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.28)', backgroundColor: 'rgba(12,22,38,0.75)',
                    alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: FONT.display, fontSize: k === 'OK' ? 16 : 20,
                    fontWeight: '500', color: '#FFFFFF' }}>{k}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => setStep('criancas')} accessibilityRole="button" accessibilityLabel="Trocar de perfil"
              style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.7)' }}>Trocar de perfil</Text>
            </Pressable>
          </View>
        )}
      </View>
    </ImageBackground>
  );
}
