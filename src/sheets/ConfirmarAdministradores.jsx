import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT, corDoMembro } from '../theme';
import { Label, Primary, Tile, Avatar } from '../ui';
import Icon from '../Icon';
import * as servidor from '../pocketbase';

// Uma acção que apaga a casa precisa de TODOS os administradores.
//
// ── Porque não basta um ─────────────────────────────────────────────────────
//
// «Repor Dados de Demonstração» e «Começar de Zero» apagavam a casa AO TOQUE —
// sem uma pergunta, e lado a lado no Perfil. Duas acções irreversíveis à
// distância de um dedo enganado.
//
// Uma confirmação normal resolveria o dedo enganado, e não resolve o resto: a
// casa é de duas pessoas, e o histórico, os cofres das crianças e as contas
// entre os adultos não são de quem calha ter o telemóvel na mão. Por isso a
// acção fica bloqueada até cada administrador se autenticar aqui — como quem
// precisa de duas chaves para abrir um cofre.
//
// ── O que torna isto real e não teatro ──────────────────────────────────────
//
// A verificação é do SERVIDOR. As palavras-passe estão em bcrypt e o valor
// correto nunca chega ao dispositivo: comparar aqui seria pedir a quem quisesse
// passar por cima que abrisse a consola.
//
// E a verificação usa um cliente DESCARTÁVEL — ver `auth.confirmarCredencial`.
// Sem isso, o segundo administrador a confirmar ficava com a sessão, e quem
// continuasse a usar a app estaria a usá-la em nome dele.
//
// ⚠ Isto é a regra da INTERFACE, e uma regra de interface não é uma regra:
// basta uma consola aberta. Quem impede a sério é o servidor, que exige papel
// de administrador e só deixa mexer na própria casa — nove provas em
// `db/pocketbase/provar-limpar-casa.mjs`. Esta folha é a porta; o servidor é a
// fechadura.
export default function ConfirmarAdministradores({
  t, user, titulo, aviso, rotuloAcao, onConfirmado, onCancelar,
}) {
  const { s, membros: MEMBROS } = useStore();

  // Quem tem de confirmar: os administradores da casa. Lê-se o quadro, não se
  // adivinha — noutros sítios desta app um nome escrito à mão já custou caro.
  const administradores = Object.keys(MEMBROS).filter(n => s.roles[n] === 'admin');

  // Quem pede já está autenticado nesta sessão: contar-lhe a palavra-passe
  // outra vez seria pedir a mesma prova duas vezes no mesmo minuto.
  const [confirmados, setConfirmados] = useState(
    administradores.includes(user) ? [user] : []);
  const [escrito, setEscrito] = useState({});
  const [erro, setErro] = useState({});
  const [aVerificar, setAVerificar] = useState(null);
  const [aExecutar, setAExecutar] = useState(false);

  const faltam = administradores.filter(n => !confirmados.includes(n));
  const podeAvancar = faltam.length === 0;

  // Sem servidor não há onde verificar uma palavra-passe. A casa que se vê é a
  // de demonstração, e proteger uma amostra com uma fechadura que não fecha
  // seria pior do que não a proteger — diz-se o que se passa.
  const semServidor = !servidor.estaLigado();

  const confirmar = async (nome) => {
    const email = MEMBROS[nome] && MEMBROS[nome].email;
    if (!email) {
      setErro(e => ({ ...e, [nome]: 'Este administrador não tem e-mail na casa.' }));
      return;
    }
    setAVerificar(nome);
    setErro(e => ({ ...e, [nome]: null }));
    const membro = await servidor.auth.confirmarCredencial(email, escrito[nome] || '');
    setAVerificar(null);

    // ⚠ Não basta a credencial estar certa: tem de ser a DAQUELE administrador.
    // Sem esta verificação, um administrador podia confirmar a linha do outro
    // com a sua própria palavra-passe, e as duas chaves eram a mesma chave.
    if (!membro || membro.nome !== nome || membro.papel !== 'admin') {
      setErro(e => ({ ...e, [nome]: 'Palavra-passe errada.' }));
      return;
    }
    setEscrito(x => ({ ...x, [nome]: '' }));
    setConfirmados(c => (c.includes(nome) ? c : [...c, nome]));
  };

  const executar = async () => {
    setAExecutar(true);
    try { await onConfirmado(); } finally { setAExecutar(false); }
  };

  return (
    <View style={{ gap: S.lg }}>
      <Tile t={t} kind="err" icon="warning">{aviso}</Tile>

      {semServidor ? (
        <Tile t={t} kind="warn">
          Esta é a casa de demonstração e não há servidor onde verificar as
          palavras-passe. Numa casa a sério, esta acção precisa da confirmação
          de todos os administradores.
        </Tile>
      ) : (
        <View style={{ gap: S.md }}>
          <Label t={t}>
            {administradores.length === 1
              ? 'Precisa da sua confirmação'
              : `Precisa da confirmação dos ${administradores.length} administradores`}
          </Label>

          {administradores.map(nome => {
            const feito = confirmados.includes(nome);
            return (
              <View key={nome} style={{ gap: S.md, padding: 14, borderRadius: R.card,
                borderWidth: 1, borderColor: feito ? t.state.okBorder : t.border,
                backgroundColor: feito ? t.state.okBg : t.card }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Avatar initial={(MEMBROS[nome] || { initial: '?' }).initial}
                    color={corDoMembro(nome) || t.text3} />
                  <Text style={{ flex: 1, fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>
                    {nome}
                  </Text>
                  {feito ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Icon name="checkCircle" size={18} color={t.state.ok} />
                      <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.state.okDeep }}>
                        {nome === user ? 'já está nesta sessão' : 'confirmado'}
                      </Text>
                    </View>
                  ) : (
                    <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>
                      por confirmar
                    </Text>
                  )}
                </View>

                {!feito ? (
                  <View style={{ gap: S.md }}>
                    <TextInput
                      value={escrito[nome] || ''}
                      onChangeText={(v) => setEscrito(x => ({ ...x, [nome]: v }))}
                      placeholder={`Palavra-passe ${nome === user ? 'sua' : `d${MEMBROS[nome]?.fem ? 'a' : 'o'} ${nome}`}`}
                      placeholderTextColor={t.text3}
                      secureTextEntry
                      autoCapitalize="none"
                      accessibilityLabel={`Palavra-passe de ${nome}`}
                      style={{ minHeight: 44, borderWidth: 1, borderColor: t.border,
                        borderRadius: R.row, paddingHorizontal: 14,
                        fontFamily: FONT.body, fontSize: 15, color: t.text1,
                        backgroundColor: t.surface }} />
                    {erro[nome] ? (
                      <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.state.errDeep }}>
                        {erro[nome]}
                      </Text>
                    ) : null}
                    <Primary t={t} label={aVerificar === nome ? 'A verificar…' : 'Confirmar'}
                      disabled={!((escrito[nome] || '').length) || aVerificar === nome}
                      onPress={() => confirmar(nome)} />
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      {/* A acção destrutiva só acorda com todos confirmados. Mostrá-la
          desactivada — e não escondê-la — é o que diz que ela existe e o que
          falta para lá chegar. */}
      <Primary t={t}
        label={aExecutar ? 'A apagar…' : rotuloAcao}
        icon="trash"
        disabled={(!podeAvancar && !semServidor) || aExecutar}
        onPress={executar} />

      {!podeAvancar && !semServidor ? (
        <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
          {faltam.length === 1
            ? `Falta a confirmação ${MEMBROS[faltam[0]]?.fem ? 'da' : 'do'} ${faltam[0]}.`
            : `Faltam ${faltam.length} confirmações.`}
        </Text>
      ) : null}

      {/* Cancelar é uma saída, não uma ação: contorno, e não preenchimento.
          O `Primary` não tem essa variante — e acrescentar-lhe uma por causa
          de um botão seria alargar um componente que trinta ecrãs usam. */}
      <Pressable onPress={onCancelar} accessibilityRole="button" accessibilityLabel="Cancelar"
        style={({ pressed }) => ({ minHeight: 48, borderRadius: R.pill, borderWidth: 1,
          borderColor: t.border, alignItems: 'center', justifyContent: 'center',
          backgroundColor: pressed ? t.subtle : 'transparent' })}>
        <Text style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: '500', color: t.text2 }}>
          Cancelar
        </Text>
      </Pressable>
    </View>
  );
}
