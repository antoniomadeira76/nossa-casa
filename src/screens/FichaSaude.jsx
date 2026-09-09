import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { dayLabel, plural, TODAY_KEY, parseKey } from '../format';

import { Card, SectionTitle, Linha, Empty, Pill } from '../ui';
import Icon from '../Icon';
import ExportarSaude from '../sheets/ExportarSaude';

// Dias que faltam até uma data, contra o TODAY da app.
const daysUntil = (day) => {
  const a = parseKey(day), b = parseKey(TODAY_KEY);
  if (!a || !b) return null;
  return Math.round((Date.UTC(a.y, a.m, a.d) - Date.UTC(b.y, b.m, b.d)) / 86400000);
};

const whenLabel = (h) => {
  const d = dayLabel(h.day).replace('Hoje · ', 'Hoje, ');
  return h.time ? `${d} às ${h.time}` : d;
};

// A ficha de um membro: a próxima consulta em destaque, as consultas todas,
// e o arquivo clínico. Quem pode ver isto decide-se no store, não aqui.
export default function FichaSaude({ t, member, user, onBack, onMarcar }) {
  const { s, healthOf, docsOf, nextHealth, membros: MEMBERS, nomeDaCasa } = useStore();

  const consultas = healthOf(member, user);
  const docs = docsOf(member, user);
  const proxima = nextHealth(member, user);
  const propria = member === user;

  // A exportação: `null` fechada, ou `{ ambito, alvo }` aberta. Abre-se de dois
  // sítios — o ícone de uma consulta, que já traz o âmbito decidido, e o botão
  // do topo, que abre em «ficha completa» e deixa mudar. Um toque para o que se
  // faz todos os meses; dois para o que se faz uma vez por ano.
  const [exportar, setExportar] = useState(null);

  return (
    <>
      <View style={{ gap: S.lg }}>

        {/* Próxima consulta */}
        {proxima ? (
          <Card t={t} style={{ borderLeftWidth: 4, borderLeftColor: t.state.info,
            // `tileInfo` (alfa, escurece no escuro), não o tijolo opaco
            // `infoBg`: o título leva `text1`, que no escuro é claro.
            backgroundColor: t.tileInfo }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Icon name="calendar" size={22} color={t.state.info} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>
                  {proxima.specialty}{proxima.doctor ? ` · ${proxima.doctor}` : ''}
                </Text>
                {/* `infoTexto`, e não `infoDeep`: o cartão passou a `tileInfo`
                    (escurece no escuro) e o «deep» dava 2,58 lá em cima. */}
                <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.state.infoTexto }}>
                  {whenLabel(proxima)}
                  {daysUntil(proxima.day) > 0
                    ? ` · faltam ${plural(daysUntil(proxima.day), 'dia', 'dias')}` : ''}
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        {/* Consultas */}
        <View>
          <SectionTitle t={t} right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
              {/* «Exportar» abre em ficha completa e deixa mudar o âmbito
                  lá dentro; o ícone de cada consulta abaixo já vem decidido. */}
              {consultas.length ? (
                <Pressable onPress={() => setExportar({ ambito: 'tudo', alvo: null })}
                  accessibilityRole="button" accessibilityLabel="Exportar ficha de saúde"
                  style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: S.lg, borderRadius: R.row,
                    flexDirection: 'row', alignItems: 'center', gap: S.sm,
                    backgroundColor: pressed ? t.card : t.subtle, borderWidth: 1, borderColor: t.border })}>
                  <Icon name="printer" size={16} color={t.text2} />
                  <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.text2 }}>Exportar</Text>
                </Pressable>
              ) : null}
              {onMarcar ? (
                <Pressable onPress={onMarcar} accessibilityRole="button" accessibilityLabel="Marcar consulta"
                  style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: S.lg, borderRadius: R.row,
                    flexDirection: 'row', alignItems: 'center', gap: S.sm,
                    backgroundColor: pressed ? t.card : t.subtle, borderWidth: 1, borderColor: t.border })}>
                  <Icon name="plus" size={16} color={t.titulo} />
                  <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.actFg }}>Marcar</Text>
                </Pressable>
              ) : null}
            </View>
          }>
            Consultas
          </SectionTitle>
          {consultas.length === 0 ? (
            <Empty t={t} icon="heartPulse" title="Sem consultas registadas."
              hint="Use Marcar consulta para registar a primeira." />
          ) : (
            <View>
              {/* Linhas planas (desenho C, 09/09/2026): a consulta futura
                  leva a faixa e a tinta azuis em vez da borda do cartão. */}
              {consultas.map((h, k) => {
                const anexos = docs.filter(d => d.healthId === h.id).length;
                const futura = h.day >= TODAY_KEY;
                return (
                  <Linha key={h.id} t={t} last={k === consultas.length - 1}
                    faixa={futura ? t.state.info : undefined}
                    // `tileInfo`, não `infoBg`: a tinta de uma linha com texto
                    // `text1`/`text3` tem de escurecer no escuro; o `infoBg` é
                    // um tijolo opaco e claro, só para texto `infoDeep`.
                    tinta={futura ? t.tileInfo : undefined}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Icon name="calendar" size={20}
                        color={futura ? t.state.info : t.text3} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>
                          {h.specialty}
                        </Text>
                        <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
                          {whenLabel(h)}{h.doctor ? ` · ${h.doctor}` : ''}
                        </Text>
                      </View>
                      {anexos > 0 ? (
                        <Pill label={plural(anexos, 'anexo', 'anexos')}
                          fg={t.text3} bg={t.subtle} border={t.border} />
                      ) : null}
                      {/* O caso comum: levar UMA consulta ao médico. Um toque,
                          sem decisões. O erro nº 6 do CLAUDE.md diz que uma
                          linha tem um destino — a linha da consulta não é
                          tocável, portanto este ícone é o único alvo dela. */}
                      <Pressable onPress={() => setExportar({ ambito: 'consulta', alvo: h.id })}
                        accessibilityRole="button"
                        accessibilityLabel={`Exportar a consulta de ${h.specialty}`}
                        style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center',
                          justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}>
                        <Icon name="printer" size={18} color={t.text3} />
                      </Pressable>
                    </View>
                  </Linha>
                );
              })}
            </View>
          )}
        </View>

        {/* Arquivo clínico */}
        <View>
          <SectionTitle t={t} right={docs.length ? (
            <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
              {plural(docs.length, 'documento', 'documentos')}
            </Text>
          ) : null}>
            Arquivo clínico
          </SectionTitle>
          {docs.length === 0 ? (
            <Empty t={t} icon="fileText" title="Sem documentos." />
          ) : (
            <View>
              {docs.map((d, k) => {
                const h = consultas.find(x => x.id === d.healthId);
                return (
                  <Linha key={d.id} t={t} last={k === docs.length - 1}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Icon name="fileText" size={20} color={t.text3} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>{d.title}</Text>
                        <Text numberOfLines={2} style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
                          {[d.kind, h && `de ${h.specialty}`, h && h.doctor, h && whenLabel(h)]
                            .filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                    </View>
                  </Linha>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {exportar ? (
        <ExportarSaude t={t} membro={member} casa={nomeDaCasa} user={user}
          consultas={consultas} docs={docs} notas={s.healthNotes || {}}
          ambitoInicial={exportar.ambito} alvoInicial={exportar.alvo}
          onClose={() => setExportar(null)} />
      ) : null}
    </>
  );
}
