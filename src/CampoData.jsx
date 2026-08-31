import React, { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { S, R, FONT } from './theme';
import { MONTHS, WD_SHORT, TODAY, dkey, parseKey, chaveDeDMY, dmyDeChave, dayLabel } from './format';
import { Tap } from './ui';
import Icon from './Icon';

// Um campo de data: escreve-se, ou escolhe-se no calendário.
//
// As duas coisas, e não uma. Quem sabe a data escreve-a mais depressa do que
// navega até ela — uma garantia de 2027 são catorze toques na seta do mês. E
// quem não sabe («a consulta é na terça a seguir») não a consegue escrever sem
// primeiro ir a um calendário noutro sítio.
//
// Antes disto havia os dois males: campos de texto sozinhos na Saúde e nos
// Equipamentos, e no «Agendar Evento» um botão que abria um calendário que não
// existia — `onPress={() => {/* será implementado com date picker */}}`. Um
// controlo que parece tocável e não faz nada é o defeito que o CLAUDE.md manda
// não repetir, e estava no meio do caminho de marcar um evento.
//
// O valor entra e sai em chave (`d2026-08-20`), que é como a app guarda datas.
// O que se escreve é dd/mm/aaaa, que é como se lê em português.

// O que se mostra na caixa: `dmyDeChave` vive no format.js, com o inverso.
const paraTexto = dmyDeChave;

// Barras automáticas: escreve-se 15092026 e sai 15/09/2026. Sem isto, um campo
// de data obriga a três toques em teclas que num teclado numérico de telemóvel
// nem sequer estão à vista.
const comBarras = (texto) => {
  const so = String(texto).replace(/\D/g, '').slice(0, 8);
  if (so.length <= 2) return so;
  if (so.length <= 4) return `${so.slice(0, 2)}/${so.slice(2)}`;
  return `${so.slice(0, 2)}/${so.slice(2, 4)}/${so.slice(4)}`;
};

// A grelha do mês, de segunda a domingo. É a mesma forma que a Agenda usa —
// mesmos dias da semana, mesma ordem, mesmo destaque de hoje.
const grelhaDoMes = (y, m) => {
  const primeiro = new Date(y, m, 1);
  const dias = new Date(y, m + 1, 0).getDate();
  // getDay(): 0 = domingo. A semana desta app começa à segunda.
  const desloca = (primeiro.getDay() + 6) % 7;
  const celulas = [...Array(desloca).fill(null),
    ...Array.from({ length: dias }, (_, i) => i + 1)];
  while (celulas.length % 7) celulas.push(null);
  const linhas = [];
  for (let i = 0; i < celulas.length; i += 7) linhas.push(celulas.slice(i, i + 7));
  return linhas;
};

export default function CampoData({ t, valor, onChange, placeholder = 'dd/mm/aaaa', minimo, maximo }) {
  const [texto, setTexto] = useState(paraTexto(valor));
  const [aberto, setAberto] = useState(false);
  const inicial = parseKey(valor) || TODAY;
  const [ym, setYm] = useState({ y: inicial.y, m: inicial.m });

  // O texto é a fonte enquanto se escreve; a chave só muda quando o que está
  // escrito é uma data inteira e possível. Assim escrever «15/0» não apaga o
  // que já lá estava, e «31/02/2026» não passa a 3 de março em silêncio.
  const escrever = (bruto) => {
    const v = comBarras(bruto);
    setTexto(v);
    const chave = chaveDeDMY(v);
    if (chave && diaValido(v)) onChange(chave);
    else if (v === '') onChange(null);
  };

  // `chaveDeDMY` aceita 31 em qualquer mês. Fevereiro não tem 31 dias, e uma
  // data que a app aceita e o calendário não mostra é uma data que ninguém
  // consegue corrigir.
  const diaValido = (v) => {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
    if (!m) return false;
    const [d, mes, ano] = [+m[1], +m[2], +m[3]];
    return d <= new Date(ano, mes, 0).getDate();
  };

  const escolher = (dia, mes = ym) => {
    const chave = dkey(mes.y, mes.m, dia);
    setTexto(paraTexto(chave));
    onChange(chave);
    setAberto(false);
  };

  const escritoMasInvalido = texto.length === 10 && !diaValido(texto);
  const foraDoIntervalo = (chave) =>
    (minimo && chave < minimo) || (maximo && chave > maximo);

  // O que a caixa diz por baixo. Um campo de data tem três estados que valem a
  // pena distinguir, e antes tinha um: silêncio, ou vermelho.
  const legenda = escritoMasInvalido ? { texto: 'Esse dia não existe nesse mês.', cor: t.state.err }
    : valor ? { texto: dayLabel(valor).replace('Hoje · ', 'Hoje, '), cor: t.text3 }
    : { texto: 'Escreva a data, ou toque no calendário.', cor: t.text3 };

  return (
    <View style={{ gap: S.md }}>
      {/* A caixa e o botão são uma coisa só: um contorno à volta dos dois, com
          uma divisória pelo meio. Estavam separados por um espaço, e liam-se
          como um campo e um botão sem relação — o botão parecia poder abrir
          outra coisa qualquer. */}
      <View style={{ flexDirection: 'row', alignItems: 'stretch',
        borderWidth: 1, borderRadius: R.row, overflow: 'hidden',
        borderColor: escritoMasInvalido ? t.state.err : aberto ? t.accent : t.border,
        backgroundColor: t.card }}>
        <TextInput
          value={texto}
          onChangeText={escrever}
          placeholder={placeholder}
          placeholderTextColor={t.text3}
          keyboardType="numeric"
          maxLength={10}
          accessibilityLabel="Data, em dia, mês e ano"
          style={{
            flex: 1, minHeight: 44, paddingHorizontal: S.md,
            fontFamily: FONT.body, fontSize: 15.5, color: t.text1,
          }}
        />
        <View style={{ width: 1, backgroundColor: t.border }} />
        <Pressable onPress={() => setAberto(a => !a)}
          accessibilityRole="button"
          accessibilityLabel={aberto ? 'Fechar o calendário' : 'Escolher no calendário'}
          accessibilityState={{ expanded: aberto }}
          style={({ pressed }) => ({
            width: 46, alignItems: 'center', justifyContent: 'center',
            backgroundColor: aberto ? t.subtle : pressed ? t.subtle : 'transparent',
          })}>
          <Icon name="calendar" size={19} color={aberto ? t.accent : t.text3} />
        </Pressable>
      </View>

      <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: legenda.cor }}>
        {legenda.texto}
      </Text>

      {aberto ? (
        <View style={{ gap: S.md, borderWidth: 1, borderColor: t.border,
          borderRadius: R.card, backgroundColor: t.card, padding: 14 }}>
          {/* O cabeçalho: mês e ano ao centro, setas nas pontas com 44 de alvo.
              Tinham 4 de raio e liam-se como duas caixas soltas. */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Tap label="Mês anterior"
              onPress={() => setYm(v => (v.m === 0 ? { y: v.y - 1, m: 11 } : { ...v, m: v.m - 1 }))}
              style={{ borderRadius: R.row }}>
              <Icon name="caretLeft" size={18} color={t.text2} />
            </Tap>
            <Text style={{ flex: 1, textAlign: 'center', fontFamily: FONT.display,
              fontSize: 15, fontWeight: '600', color: t.text1 }}>
              {MONTHS[ym.m]} {ym.y}
            </Text>
            <Tap label="Mês seguinte"
              onPress={() => setYm(v => (v.m === 11 ? { y: v.y + 1, m: 0 } : { ...v, m: v.m + 1 }))}
              style={{ borderRadius: R.row }}>
              <Icon name="caretRight" size={18} color={t.text2} />
            </Tap>
          </View>

          <View style={{ flexDirection: 'row' }}>
            {WD_SHORT.map(w => (
              <Text key={w} style={{ flex: 1, textAlign: 'center', fontFamily: FONT.ui,
                fontSize: 11, fontWeight: '600', color: t.slate }}>{w}</Text>
            ))}
          </View>

          <View style={{ gap: S.xs }}>
            {grelhaDoMes(ym.y, ym.m).map((linha, li) => (
              <View key={li} style={{ flexDirection: 'row' }}>
                {linha.map((dia, di) => {
                  if (!dia) return <View key={di} style={{ flex: 1, height: 44 }} />;
                  const chave = dkey(ym.y, ym.m, dia);
                  const hoje = ym.y === TODAY.y && ym.m === TODAY.m && dia === TODAY.d;
                  const escolhido = chave === valor;
                  const fora = foraDoIntervalo(chave);
                  return (
                    <Pressable key={di} onPress={() => { if (!fora) escolher(dia); }}
                      accessibilityRole="button"
                      accessibilityLabel={`${dia} de ${MONTHS[ym.m].toLowerCase()} de ${ym.y}`}
                      accessibilityState={{ selected: escolhido, disabled: fora }}
                      style={({ pressed }) => ({
                        flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center',
                        opacity: fora ? 0.25 : (pressed ? 0.6 : 1),
                      })}>
                      {/* O dia escolhido é um disco cheio na cor de ação; hoje é
                          um contorno. Antes o escolhido levava um contorno de 2
                          e hoje um fundo `chrome` — dois destaques do mesmo
                          peso, e o olho não sabia qual era a resposta. */}
                      <View style={{
                        width: 36, height: 36, borderRadius: R.pill,
                        alignItems: 'center', justifyContent: 'center',
                        backgroundColor: escolhido ? t.accent : 'transparent',
                        borderWidth: hoje && !escolhido ? 1 : 0, borderColor: t.accent,
                      }}>
                        <Text style={{ fontFamily: FONT.ui, fontSize: 14.5,
                          fontWeight: escolhido || hoje ? '600' : '400',
                          color: escolhido ? '#FFFFFF' : hoje ? t.accent : t.text2 }}>
                          {dia}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Hoje a um toque. Numa app de casa a data que mais se escolhe é a
              de agora, e chegar-lhe obrigava a navegar de volta se já se tivesse
              saído do mês. */}
          <Pressable onPress={() => { setYm({ y: TODAY.y, m: TODAY.m }); escolher(TODAY.d, TODAY); }}
            accessibilityRole="button" accessibilityLabel="Escolher hoje"
            style={({ pressed }) => ({ minHeight: 44, alignItems: 'center', justifyContent: 'center',
              borderTopWidth: 1, borderTopColor: t.divider, opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.accent }}>
              Hoje
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
