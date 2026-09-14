import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { Label, Primary, Pill, PastilhaTocavel, BotaoCompacto, NumField } from '../ui';
import Icon from '../Icon';
import { plural, dmyDeChave, dayLabel, TODAY_KEY } from '../format';
import { planoDaReceita, tomasDoDia, horaDoInstante } from '../medicacao';

/**
 * As tomas de uma receita: o plano, a agenda, e o que já se tomou.
 *
 * ── O que se pediu ───────────────────────────────────────────────────────────
 *
 * 12/09/2026, a sexta das dez funcionalidades. Na receita: dose, frequência,
 * duração, tamanho da caixa. «Pôr na Agenda» cria os eventos «só adultos»;
 * cada toma marca-se e fica com quem e quando. Aviso quando a caixa acaba
 * antes da receita.
 *
 * ⚠ «Quantas tomas» é a CONTAGEM das linhas, nunca um número na receita
 * (INVARIANTE #2). Só quem marcou desmarca. Tudo sobe pelo travão de casa.
 *
 * `record` é a consulta (`{ id, member, day }`), `recipe` a receita dela.
 */
export default function TomasDaReceita({ t, user, record, recipe, onClose }) {
  const { definirTomas, tomasDaReceita, marcarToma, desmarcarToma, agendaTemTomas, porTomasNaAgenda } = useStore();
  // `rascunho`, e não `plano`: o guarda do plano de COMPRAS lê `plano.x` em
  // todos os ecrãs como um campo do `shopPlan`.
  const [rascunho, setPlano] = useState({
    frequency: String(recipe.frequency || ''), durationDays: String(recipe.durationDays || ''), boxSize: String(recipe.boxSize || ''),
  });
  const [erro, setErro] = useState(null);
  const [aviso, setAviso] = useState(null);

  const p = planoDaReceita(recipe, record.day);
  const tomas = tomasDaReceita(record.id, recipe.id);
  const hoje = tomasDoDia(tomas, TODAY_KEY);
  const naAgenda = agendaTemTomas(record.id, recipe.id);

  const guardarPlano = () => {
    const msg = definirTomas(record.id, recipe.id, rascunho);
    setErro(msg);
    if (!msg) setAviso('Plano guardado.');
  };
  const marcar = () => {
    const msg = marcarToma(record.id, recipe.id, user);
    setErro(msg);
    if (!msg) setAviso(null);
  };
  const agendar = () => {
    const r = porTomasNaAgenda(record.id, recipe.id, user);
    if (typeof r === 'string') { setErro(r); return; }
    setErro(null);
    setAviso(r ? `${plural(r, 'dia', 'dias')} na Agenda, só para os adultos.` : 'Os dias que faltam já estão na Agenda.');
  };

  // `campo`, com os 44 px — o nome que o guarda `todo-campo-tem-44` reconhece.
  const campo = {
    flex: 1, minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body, fontSize: 15,
    color: t.text2, borderRadius: R.row, borderWidth: 1, borderColor: t.border, backgroundColor: t.card,
    textAlign: 'center',
  };

  return (
    <View style={{ gap: S.lg }}>
      {/* ── O plano ──────────────────────────────────────────────────────── */}
      <View style={{ gap: S.sm }}>
        <Label t={t}>Plano de tomas</Label>
        {p ? (
          <Text style={{ fontFamily: FONT.body, fontSize: 14.5, lineHeight: 21, color: t.text2 }}>
            {`${p.descricao} · de ${dmyDeChave(p.inicio)} a ${dmyDeChave(p.fim)} · ${plural(p.doses, 'dose', 'doses')} no total`}
          </Text>
        ) : (
          <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, lineHeight: 19, color: t.text3 }}>
            Sem plano ainda. Diga quantas tomas por dia e durante quantos dias — a caixa é opcional.
          </Text>
        )}
        {/* O aviso da caixa: leva o tijolo âmbar, e o texto «deep» que é o
            único que se lê sobre ele. */}
        {p && p.aviso ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md,
            borderRadius: R.row, backgroundColor: t.state.warnBg, borderWidth: 1, borderColor: t.state.warn }}>
            <Icon name="warning" size={18} color={t.state.warnDeep} />
            <Text style={{ flex: 1, fontFamily: FONT.ui, fontSize: 12.5, lineHeight: 18, color: t.state.warnDeep }}>{p.aviso}</Text>
          </View>
        ) : null}
        {/* O campo de número da app, com «−» e «+» (14/09/2026), um por linha
            com o seu rótulo — três caixas lado a lado não têm largura para os
            botões. O rascunho continua a ser texto, que é o que o «Guardar»
            já lia; vazio é vazio. */}
        <View style={{ gap: S.md }}>
          {[['frequency', 'Tomas por dia', 'Por dia', '2'], ['durationDays', 'Duração em dias', 'Dias', '14'], ['boxSize', 'Unidades na caixa', 'Caixa', '20']].map(([campoDoPlano, rotulo, curto, exemplo]) => (
            <View key={campoDoPlano} style={{ gap: 4 }}>
              <Label t={t}>{curto}</Label>
              <NumField t={t} vazio suffix={false} step={1} min={0} max={999} rotulo={rotulo} placeholder={exemplo}
                value={rascunho[campoDoPlano] === '' || rascunho[campoDoPlano] == null ? null : Number(rascunho[campoDoPlano])}
                onChange={(v) => { setErro(null); setPlano(x => ({ ...x, [campoDoPlano]: v == null ? '' : String(v) })); }} />
            </View>
          ))}
        </View>
        <BotaoCompacto t={t} tom="comum" label={p ? 'Guardar plano' : 'Definir plano'}
          etiqueta="Guardar o plano de tomas" onPress={guardarPlano} />
      </View>

      {/* ── A Agenda ─────────────────────────────────────────────────────── */}
      <View style={{ gap: S.sm }}>
        <Label t={t}>Agenda</Label>
        {/* Botão comum: acrescenta eventos, não fecha nem apaga. E o «só
            adultos» está escrito nele, porque é a decisão que importa: a
            criança não vê a medicação dela na agenda. */}
        <Primary comum t={t} label={naAgenda ? 'As tomas estão na Agenda' : 'Pôr as tomas na Agenda'}
          sub={!p ? 'Defina o plano primeiro' : naAgenda ? 'Um dia por toma, só para os adultos' : `${plural(p.dias.filter(d => d >= TODAY_KEY).length, 'dia', 'dias')} a partir de hoje · só adultos`}
          disabled={!p} onPress={agendar} />
      </View>

      {/* ── Hoje ─────────────────────────────────────────────────────────── */}
      <View style={{ gap: S.sm }}>
        <Label t={t}>{`Hoje · ${plural(hoje.length, 'toma', 'tomas')}${p ? ` de ${p.frequencia}` : ''}`}</Label>
        {hoje.length === 0 ? (
          <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, color: t.text3 }}>Ainda nenhuma toma marcada hoje.</Text>
        ) : hoje.map(tm => (
          <View key={tm.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 44 }}>
            <Pill label="tomado" fg={t.state.okTexto} bg={t.state.okBg} border={t.state.okBorder} />
            <Text style={{ flex: 1, fontFamily: FONT.body, fontSize: 14.5, color: t.text2 }}>
              {`${horaDoInstante(tm.quando)} · ${tm.por}`}
            </Text>
            {/* Só quem marcou desmarca — e o alvo só aparece a essa pessoa. */}
            {tm.por === user ? (
              <Pressable onPress={() => setErro(desmarcarToma(record.id, recipe.id, tm.id, user))}
                accessibilityRole="button" accessibilityLabel={`Desmarcar a toma das ${horaDoInstante(tm.quando)}`}
                style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={18} color={t.text3} />
              </Pressable>
            ) : null}
          </View>
        ))}
        {/* Marcar vira estado: verde, com a marca, como a pastilha que fica. */}
        <PastilhaTocavel t={t} label="Tomado agora"
          fg={t.state.okDeep} bg={t.state.okBg} border={t.state.okBorder}
          onPress={marcar} />
      </View>

      {/* ── Os outros dias ──────────────────────────────────────────────── */}
      {tomas.some(tm => !hoje.includes(tm)) ? (
        <View style={{ gap: S.sm }}>
          <Label t={t}>Antes de hoje</Label>
          {tomas.filter(tm => !hoje.includes(tm)).slice(0, 8).map(tm => (
            <Text key={tm.id} style={{ fontFamily: FONT.ui, fontSize: 12.5, color: t.text3 }}>
              {`${dayLabel(require('../medicacao').diaDoInstante(tm.quando))} · ${horaDoInstante(tm.quando)} · ${tm.por}`}
            </Text>
          ))}
        </View>
      ) : null}

      {erro ? (
        <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, lineHeight: 19, color: t.state.errTexto }}>{erro}</Text>
      ) : aviso ? (
        <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, lineHeight: 19, color: t.state.okTexto }}>{aviso}</Text>
      ) : null}

      <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar as tomas"
        style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '500', color: t.text2 }}>Fechar</Text>
      </Pressable>
    </View>
  );
}
