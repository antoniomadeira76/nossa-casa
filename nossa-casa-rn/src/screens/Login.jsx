import React, { useState } from 'react';
import { View, Text, Pressable, ImageBackground } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { S, R, FONT, elev } from '../theme';
import Icon, { Marca } from '../Icon';
import { MEMBERS } from '../data';
import { useStore } from '../store';

const G = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24">
    <Path fill="#4285F4" d="M23 12.2c0-.8-.1-1.6-.2-2.3H12v4.5h6.2c-.3 1.4-1.1 2.6-2.3 3.4v2.8h3.7C21.7 18.6 23 15.7 23 12.2z" />
    <Path fill="#34A853" d="M12 23.5c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.6H2.1v2.9C3.9 21 7.7 23.5 12 23.5z" />
    <Path fill="#FBBC05" d="M5.8 14.5c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V7H2.1C1.4 8.5 1 10.2 1 12.2s.4 3.7 1.1 5.2l3.7-2.9z" />
    <Path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.3 1.7l3.2-3.2C17.5 2 15 1 12 1 7.7 1 3.9 3.4 2.1 7l3.7 2.9c.9-2.7 3.3-4.5 6.2-4.5z" />
  </Svg>
);

export default function Login({ t, onEnter, onKid }) {
  const { s, pinError } = useStore();
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
    if (s.pins[kid] && p === s.pins[kid]) { setTries(0); onEnter(kid); return; }
    const n = tries + 1;
    setTries(n); setPin('');
    if (n >= 5) { setBlocked(Date.now() + 60000); setTries(0); }
  };

  const press = (k) => {
    if (k === '←') return setPin(p => p.slice(0, -1));
    if (pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 4) setTimeout(() => submitPin(next), 120);
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
          <View style={glass}>
            <Text style={{ fontFamily: FONT.display, fontSize: 24, fontWeight: '500', color: '#FFFFFF' }}>Bem-vindo</Text>
            <Text style={{ fontFamily: FONT.body, fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.8)' }}>
              Entre com a sua Conta Google para acessar a casa partilhada.
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
        ) : step === 'contas' ? (
          <View style={glass}>
            <Text style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: '500', color: '#FFFFFF' }}>Escolher uma conta</Text>
            {['Rita', 'Tomás'].map(n => (
              <Pressable key={n} onPress={() => onEnter(n)} accessibilityRole="button" accessibilityLabel={n}
                style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: R.card, padding: 14,
                  minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 40, height: 40, borderRadius: R.pill, backgroundColor: t.chrome, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: FONT.display, fontSize: 17, fontWeight: '500', color: '#FFFFFF' }}>{MEMBERS[n].initial}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: FONT.body, fontSize: 16, color: '#262626' }}>{n} Bengui</Text>
                  <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: '#6A7282' }}>{MEMBERS[n].email}</Text>
                </View>
                <Text style={{ fontFamily: FONT.ui, fontSize: 11, fontWeight: '600', color: '#6A7282' }}>
                  {s.roles[n] === 'admin' ? 'Administração' : 'Adulto'}
                </Text>
              </Pressable>
            ))}
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
            <Text style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: '500', color: '#FFFFFF' }}>Olá, {kid}</Text>
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
              {['1','2','3','4','5','6','7','8','9','←','0',''].map((k, i) => k === '' ? <View key={i} style={{ width: '30%' }} /> : (
                <Pressable key={i} onPress={() => press(k)} accessibilityRole="button" accessibilityLabel={k === '←' ? 'Apagar' : k}
                  style={{ width: '30%', minHeight: 52, borderRadius: R.row, borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(255,255,255,0.16)',
                    alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: '500', color: '#FFFFFF' }}>{k}</Text>
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
