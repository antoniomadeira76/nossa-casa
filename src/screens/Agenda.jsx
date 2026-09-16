import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT, corDoMembro } from '../theme';
import { MONTHS, WD_SHORT, TODAY, TODAY_KEY, dkey, dayLabel, evTime, plural } from '../format';

import { Card, SectionTitle, Linha, Avatar, Empty, AddButton, Tap, usePaged, Pager, PastilhaVisibilidade, avatarDe } from '../ui';
import Icon from '../Icon';
import Sheet from '../Sheet';
import NovoEvento from '../sheets/NovoEvento';
import ImportarGoogle from '../sheets/ImportarGoogle';

// `abrir` é o id de um evento cuja folha de edição deve estar aberta à
// chegada.
export default function Agenda({ t, user, abrir, abrirImportar, onImportarAberto }) {
  const { s, allEvents, membros: MEMBERS, podeVerEvento, podeEditarEvento, contasNaAgenda } = useStore();
  const [open, setOpen] = useState(false);
  const [ym, setYm] = useState({ y: TODAY.y, m: TODAY.m });
  const [sel, setSel] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [googleSheetOpen, setGoogleSheetOpen] = useState(false);
  const [preFillDay, setPreFillDay] = useState(null);
  const [editar, setEditar] = useState(null);   // o evento a editar, ou null

  // Chegar aqui a partir do Início para ligar a agenda da Google. A folha
  // é que sabe ligar e explicar o que correu mal; o Início só aponta.
  React.useEffect(() => {
    if (!abrirImportar) return;
    setGoogleSheetOpen(true);
    onImportarAberto?.();
  }, [abrirImportar]);

  // Chegar aqui a partir do Início, com um evento em mão.
  React.useEffect(() => {
    if (!abrir) return;
    const e = allEvents().find(x => x.id === abrir);
    if (e && podeEditarEvento(e, user)) setEditar(e);
  }, [abrir]);

  // A regra vive na loja, não aqui: dois ecrãs a escreverem o mesmo filtro
  // divergem, e um filtro de visibilidade que diverge mostra a alguém o que
  // não devia.
  //
  // E as contas fixas, no dia em que vencem — este mês e o seguinte. Não são
  // eventos: não se editam nem se apagam daqui (a conta gere-se no Dinheiro),
  // e só um adulto as recebe — a loja devolve vazio a uma criança, tal como o
  // servidor. Por isso a edição pergunta primeiro se a linha É um evento.
  const mine = [...allEvents().filter(e => podeVerEvento(e, user)), ...contasNaAgenda(user)];
  const editavel = (e) => !e.contaFixa && podeEditarEvento(e, user);

  // A Agenda começa em hoje — o passado vive na ficha de cada membro
  const keys = [...new Set([TODAY_KEY, ...mine.map(e => e.day)])].filter(k => k >= TODAY_KEY).sort();
  const pg = usePaged(keys);

  // A semana de hoje, de segunda a domingo. É o estado fechado do cartão do
  // calendário — em docs/referencia/08-agenda.png são sete colunas com a
  // contagem de eventos por dia e hoje realçado. Fechado não mostrava nada:
  // havia grelha do mês e mais nada, portanto a tira nunca chegou a existir.
  const semana = (() => {
    const hoje = new Date(TODAY.y, TODAY.m, TODAY.d);
    const segunda = new Date(hoje);
    segunda.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(segunda);
      d.setDate(segunda.getDate() + i);
      const key = dkey(d.getFullYear(), d.getMonth(), d.getDate());
      return { key, dia: d.getDate(), wd: WD_SHORT[i], n: mine.filter(e => e.day === key).length };
    });
  })();

  const grid = (() => {
    const first = new Date(ym.y, ym.m, 1);
    const shift = (first.getDay() + 6) % 7;
    const total = new Date(ym.y, ym.m + 1, 0).getDate();
    const rows = [];
    for (let r = 0; r < 6; r++) {
      const cells = [];
      let any = false;
      for (let c = 0; c < 7; c++) {
        const n = r * 7 + c - shift + 1;
        if (n < 1 || n > total) { cells.push(null); continue; }
        any = true;
        const key = dkey(ym.y, ym.m, n);
        cells.push({ n, key, evs: mine.filter(e => e.day === key) });
      }
      if (any) rows.push(cells);
    }
    return rows;
  })();

  const home = ym.y === TODAY.y && ym.m === TODAY.m;
  const selEvents = sel ? mine.filter(e => e.day === sel).sort((a, b) => (a.time || '').localeCompare(b.time || '')) : [];

  return (
    <>
      <Card t={t} style={{ gap: S.lg }}>
        <Pressable onPress={() => setOpen(v => !v)} accessibilityRole="button"
          accessibilityLabel={open ? 'Ver semana' : 'Ver mês'}
          style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: S.md }}>
          <Text style={{ flex: 1, fontFamily: FONT.display, fontSize: 17, fontWeight: '500', color: t.text1 }}>
            {MONTHS[ym.m]} de {ym.y}
          </Text>
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.actFg }}>
            {open ? 'Ver semana' : 'Ver mês'}
          </Text>
          <Icon name={open ? 'caretUp' : 'caretDown'} size={20} color={t.text3} />
        </Pressable>

        {!open ? (
          <View style={{ flexDirection: 'row', gap: S.sm }}>
            {semana.map(d => {
              const hoje = d.key === TODAY_KEY;
              const escolhido = sel === d.key;
              // ⚠ SEM NADA ESCOLHIDO, o dia marcado é HOJE. O print que ele
              // mandou («o dia deve ser marcado na agenda conforme o print»)
              // era o «Ter 15» cheio de acento — e nesse dia o 15 era hoje, com
              // a semana acabada de abrir e `sel` a null. Marcar só o escolhido
              // deixava a tira inteira apagada até alguém tocar nela, que é
              // exactamente o que ele viu a seguir: «não está consoante o que
              // pedi», com o «Qua 16» em cinzento.
              //
              // Escolher um dia passa a marca para esse; hoje fica com o
              // cinzento e o número a negro. Dois dias cheios de acento na
              // mesma tira não diziam qual era qual.
              const marcado = escolhido || (hoje && !sel);
              return (
                <Pressable key={d.key} onPress={() => setSel(escolhido ? null : d.key)}
                  accessibilityRole="button"
                  // ⚠ `plural`: o rótulo lido em voz dizia «1 eventos» (09/09/2026).
                  accessibilityLabel={`${d.wd} ${d.dia}${d.n ? ` · ${plural(d.n, 'evento', 'eventos')}` : ''}`}
                  // ⚠ Só o ESCOLHIDO se anuncia como escolhido. Era
                  // `hoje || escolhido`: com o 18 escolhido, um leitor de ecrã
                  // dizia que o 16 e o 18 estavam ambos escolhidos. Hoje é um
                  // facto do calendário, não uma escolha de quem usa — e quem
                  // não vê o ecrã não tem como desfazer a confusão.
                  accessibilityState={{ selected: marcado }} aria-pressed={marcado}
                  // ⚠ O dia escolhido leva o ACENTO CHEIO (15/09/2026: «o dia
                  // deve ser marcado na agenda conforme o print e a cor deve
                  // ser a escolhida do perfil»). Era o `subtle` com um contorno
                  // de 1 — a mesma tinta cinzenta que o dia de HOJE já usava, e
                  // um contorno de 1 px não chega para separar os dois. Agora
                  // hoje é o cinzento e o escolhido é o acento, e não há como
                  // confundi-los.
                  // ⚠ `R.row` e não `R.card`: é um TOCÁVEL, e todos os tocáveis
                  // desta app têm o mesmo canto (`o-canto-de-tudo-o-que-se-toca`).
                  style={{ flex: 1, minHeight: 64, borderRadius: R.row, paddingVertical: 6,
                    alignItems: 'center', justifyContent: 'center', gap: 2,
                    backgroundColor: marcado ? t.accent : hoje ? t.subtle : 'transparent' }}>
                  {/* ⚠ Sobre o acento vai BRANCO INTEIRO nas três linhas, e não
                      um branco com alfa por cima: um alfa fixo calibrado num
                      esquema escuro falha o contraste nos claros (é o erro #4
                      do CLAUDE.md, e já aconteceu no cabeçalho). O branco puro
                      dá 4,62 no pior dos seis. A hierarquia faz-se com o
                      tamanho e o peso, que é para o que eles servem. */}
                  <Text style={{ fontFamily: FONT.ui, fontSize: 11, fontWeight: '600',
                    color: marcado ? '#FFFFFF' : t.text3 }}>
                    {d.wd}
                  </Text>
                  <Text style={{ fontFamily: FONT.display, fontSize: 17,
                    fontWeight: hoje || marcado ? '700' : '400',
                    color: marcado ? '#FFFFFF' : hoje ? t.text1 : t.text2 }}>
                    {d.dia}
                  </Text>
                  {/* Um travessão quando não há nada: uma coluna vazia lê-se
                      como «não carregou», um travessão lê-se como «nada». */}
                  <Text style={{ fontFamily: FONT.ui, fontSize: 11,
                    color: marcado ? '#FFFFFF' : d.n ? t.actFg : t.text3 }}>{d.n || '—'}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {open ? (
          <View style={{ gap: S.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
              <Tap label="Ano anterior" onPress={() => setYm(v => ({ ...v, y: v.y - 1 }))}
                style={{ borderWidth: 1, borderColor: t.border, borderRadius: R.row }}>
                <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.text2 }}>‹‹</Text>
              </Tap>
              <Tap label="Mês anterior" onPress={() => setYm(v => v.m === 0 ? { y: v.y - 1, m: 11 } : { ...v, m: v.m - 1 })}
                style={{ borderWidth: 1, borderColor: t.border, borderRadius: R.row }}>
                <Icon name="caretLeft" size={16} color={t.text3} />
              </Tap>
              <Text style={{ flex: 1, textAlign: 'center', fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.text2 }}>
                {MONTHS[ym.m]} de {ym.y}
              </Text>
              <Tap label="Mês seguinte" onPress={() => setYm(v => v.m === 11 ? { y: v.y + 1, m: 0 } : { ...v, m: v.m + 1 })}
                style={{ borderWidth: 1, borderColor: t.border, borderRadius: R.row }}>
                <Icon name="caretRight" size={16} color={t.text3} />
              </Tap>
              <Tap label="Ano seguinte" onPress={() => setYm(v => ({ ...v, y: v.y + 1 }))}
                style={{ borderWidth: 1, borderColor: t.border, borderRadius: R.row }}>
                <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.text2 }}>››</Text>
              </Tap>
            </View>

            <View style={{ flexDirection: 'row' }}>
              {WD_SHORT.map(w => (
                <Text key={w} style={{ flex: 1, textAlign: 'center', fontFamily: FONT.ui,
                  fontSize: 11, fontWeight: '600', color: t.text3 }}>{w}</Text>
              ))}
            </View>

            {grid.map((row, ri) => (
              <View key={ri} style={{ flexDirection: 'row', gap: S.sm }}>
                {row.map((c, ci) => {
                  if (!c) return <View key={ci} style={{ flex: 1, minHeight: 46 }} />;
                  const isToday = home && c.n === TODAY.d;
                  const on = sel === c.key;
                  return (
                    <Pressable key={ci} onPress={() => {
                      setSel(on ? null : c.key);
                    }}
                      onLongPress={() => {
                        setPreFillDay(c.key);
                        setSheetOpen(true);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`${c.n} de ${MONTHS[ym.m].toLowerCase()}${c.evs.length ? ` · ${plural(c.evs.length, 'evento', 'eventos')}` : ''}`}
                      accessibilityState={{ selected: on }} aria-pressed={on}
                      // ⚠ O ACENTO CHEIO É O ESCOLHIDO, e não o dia de hoje
                      // (16/09/2026). Estava ao contrário — `isToday ? t.accent`
                      // com o escolhido a levar só um contorno de 2 —, e as
                      // duas metades do MESMO cartão diziam coisas opostas:
                      // escolhia-se o dia 18 na tira da semana, tocava-se em
                      // «Ver mês», e a cor cheia saltava para o 16 sem a
                      // escolha ter mudado. Pior: escolher HOJE não se via, com
                      // a borda do acento a desaparecer dentro do fundo do
                      // acento.
                      //
                      // Hoje passa ao tijolo do acento — a mesma solução do
                      // protótipo e a mesma do `CampoData`, que já tinha este
                      // defeito corrigido com a razão escrita lá.
                      style={{ flex: 1, minHeight: 46, borderRadius: R.row, alignItems: 'center',
                        justifyContent: 'center', gap: 4,
                        backgroundColor: on ? t.accent
                          : isToday ? t.actBg : c.evs.length ? t.subtle : 'transparent',
                        borderWidth: isToday && !on ? 1 : 0, borderColor: t.actBrd }}>
                      <Text style={{ fontFamily: FONT.ui, fontSize: 14, fontWeight: isToday || on ? '700' : '600',
                        color: on ? '#FFFFFF' : isToday ? t.actFg : t.text2 }}>{c.n}</Text>
                      <View style={{ flexDirection: 'row', gap: 3, height: 5 }}>
                        {c.evs.slice(0, 3).map(e => (
                          <View key={e.id} style={{ width: 5, height: 5, borderRadius: R.pill,
                            backgroundColor: corDoMembro(e.owner, MEMBERS[e.owner]?.cor) || t.text3 }} />
                        ))}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
              <Text style={{ flex: 1, fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
                Toque num dia para o ver.
              </Text>
              {home ? (
                <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>Mês atual</Text>
              ) : (
                <Pressable onPress={() => setYm({ y: TODAY.y, m: TODAY.m })} accessibilityRole="button"
                  accessibilityLabel="Voltar a hoje" style={{ minHeight: 44, justifyContent: 'center' }}>
                  <Text style={{ fontFamily: FONT.display, fontSize: 12.5, fontWeight: '700', color: t.actFg }}>Voltar a hoje</Text>
                </Pressable>
              )}
            </View>
          </View>
        ) : null}
      </Card>

      {sel ? (
        <Card t={t} style={{ gap: S.md }}>
          <Text style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: '500', color: t.text1 }}>
            {dayLabel(sel)}
          </Text>
          {selEvents.length === 0 ? (
            // ⚠ O vazio da app, e não uma linha de texto cinzento escrita à
            // mão. Este ecrã tem dois `<Empty>` dez linhas abaixo, com ícone,
            // título e o que fazer a seguir; este dizia só «Nada agendado
            // neste dia.» a 13 px e não dizia o passo seguinte.
            <Empty t={t} icon="calendar" title="Nada agendado neste dia."
              hint="Toque em «agendar» aqui em baixo para marcar o primeiro." />
          ) : selEvents.map(e => (
            <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
              <Text style={{ width: 42, fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.text3 }}>{evTime(e.time)}</Text>
              <Avatar {...avatarDe(e.owner, MEMBERS[e.owner], t.text3)} />
              <Text numberOfLines={2} style={{ flex: 1, fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>{e.title}</Text>
            </View>
          ))}
          {/* ⚠ Este botão tinha `onPress={() => {}}` — um controlo morto, com a
              cor do perfil, a dizer «agendar em 16/09» e a não fazer nada.
              Agora abre a folha COM O DIA já escolhido, que é o que a grelha do
              mês já fazia e o que o rótulo promete. */}
          <AddButton t={t} label={`agendar em ${sel.slice(9)}/${sel.slice(6, 8)}`}
            onPress={() => { setPreFillDay(sel); setSheetOpen(true); }} />
        </Card>
      ) : null}

      {/* legenda: uma cor por membro */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.lg }}>
        {Object.keys(MEMBERS).map(n => (
          <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: R.pill, backgroundColor: corDoMembro(n, MEMBERS[n]?.cor) }} />
            <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.text3 }}>{n}</Text>
          </View>
        ))}
      </View>

      {keys.length === 0 ? (
        <Empty t={t} icon="calendar" title="Sem eventos agendados." hint="Use Agendar evento para acrescentar o primeiro." />
      ) : pg.slice.map(k => {
        const evs = mine.filter(e => e.day === k).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
        return (
          <View key={k}>
            <SectionTitle t={t}>{dayLabel(k)}</SectionTitle>
            {evs.length === 0 ? (
              <Empty t={t} icon="calendar" title="Nada agendado." />
            ) : (
              <View>
                {/* Linhas planas, sem cartão — desenho C (09/09/2026). */}
                {evs.map((e, i) => (
                  <Linha key={e.id} t={t} last={i === evs.length - 1}>
                    <Pressable
                      onPress={() => editavel(e) && setEditar(e)}
                      accessibilityRole={editavel(e) ? 'button' : undefined}
                      accessibilityLabel={editavel(e) ? `Editar ${e.title}` : undefined}
                      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center',
                        gap: 12, minHeight: 44,
                        opacity: pressed ? 0.7 : 1 })}>
                      <Text style={{ width: 42, fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.text3 }}>{evTime(e.time)}</Text>
                      <Avatar {...avatarDe(e.owner, MEMBERS[e.owner], t.text3)} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text numberOfLines={2} style={{ fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>{e.title}</Text>
                        <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>{e.who}</Text>
                      </View>
                      <PastilhaVisibilidade t={t} evento={e} />
                      {editavel(e)
                        ? <Icon name="caretRight" size={18} color={t.text3} />
                        : null}
                    </Pressable>
                  </Linha>
                ))}
              </View>
            )}
          </View>
        );
      })}
      <Pager t={t} pg={pg} />

      <View style={{ gap: S.md }}>
        <AddButton t={t} label="agendar evento" onPress={() => {
          setPreFillDay(null);
          setSheetOpen(true);
        }} />
        <AddButton t={t} label="importar do google" onPress={() => setGoogleSheetOpen(true)} />
      </View>

      {sheetOpen ? (
        <Sheet t={t} title="Novo Evento" sub="Criar um evento na agenda"
          onClose={() => {
            setSheetOpen(false);
            setPreFillDay(null);
          }}>
          <NovoEvento t={t} user={user} onClose={() => {
            setSheetOpen(false);
            setPreFillDay(null);
          }} preFillDay={preFillDay} />
        </Sheet>
      ) : null}

      {editar ? (
        <Sheet t={t} title="Editar Evento" sub={editar.title}
          onClose={() => setEditar(null)}>
          <NovoEvento t={t} user={user} evento={editar} onClose={() => setEditar(null)} />
        </Sheet>
      ) : null}

      {googleSheetOpen ? (
        <Sheet t={t} title="Importar do Google" sub="Sincronizar eventos do Google Calendar"
          onClose={() => setGoogleSheetOpen(false)}>
          <ImportarGoogle t={t} user={user} onClose={() => setGoogleSheetOpen(false)} />
        </Sheet>
      ) : null}
    </>
  );
}
