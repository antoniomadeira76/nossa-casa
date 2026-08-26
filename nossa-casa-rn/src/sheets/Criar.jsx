import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable } from 'react-native';
import { useStore } from '../store';
import { MEMBERS, SECTIONS } from '../data';
import { EUR, TODAY_KEY, dayLabel, WD } from '../format';
import { MEMBER_COLOR, S, R, elev, FONT } from '../theme';
import Icon from '../Icon';
import { Label, Segmented, Toggle, Tap, Avatar, Primary, AddButton } from '../ui';
import Sheet from '../Sheet';

const Field = ({ t, label, children }) => (
  <View style={{ gap: S.md }}>
    <Label t={t}>{label}</Label>
    {children}
  </View>
);

const TextField = ({ t, value, onChangeText, placeholder, label }) => (
  <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder}
    placeholderTextColor={t.text3} accessibilityLabel={label}
    style={{ minHeight: 48, borderWidth: 1, borderColor: t.border, borderRadius: R.row,
      paddingHorizontal: 14, fontFamily: FONT.body, fontSize: 15,
      color: t.text1, backgroundColor: t.surface }} />
);

const MemberGrid = ({ t, value, onChange, only }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }}>
    {Object.keys(MEMBERS).filter(n => !only || only.includes(n)).map(n => {
      const on = value === n;
      return (
        <Pressable key={n} onPress={() => onChange(n)} accessibilityRole="button"
          accessibilityLabel={n} accessibilityState={{ selected: on }}
          style={{ minWidth: '47%', flexGrow: 1, minHeight: 44, borderRadius: R.row, borderWidth: 1,
            borderColor: on ? t.chrome : t.border, backgroundColor: on ? t.chrome : 'transparent',
            flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: 12 }}>
          <Avatar initial={MEMBERS[n].initial} color={MEMBER_COLOR[n]} size={22} />
          <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600',
            color: on ? '#FFFFFF' : t.text2 }}>{n}</Text>
        </Pressable>
      );
    })}
  </View>
);

// Bloco de partilha — o mesmo nas três folhas de agendar
const ShareBlock = ({ t, on, onToggle, owner, kind }) => (
  <View style={{ backgroundColor: t.subtle, borderWidth: 1, borderColor: t.border,
    borderRadius: R.card, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
    <Icon name={on ? 'home' : 'lock'} size={24} color={t.slate} />
    <View style={{ flex: 1, gap: 3 }}>
      <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>Partilhar com a família</Text>
      <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 17, color: t.text3 }}>
        {on ? `Fica visível para os 4 membros da casa e entra na ${kind === 'tarefa' ? 'lista' : 'Agenda'} de todos.`
          : `Fica apenas no calendário do ${owner}. Ninguém mais o vê.`}
      </Text>
    </View>
    <Toggle t={t} on={on} onPress={onToggle} label="Partilhar com a família" />
  </View>
);

// ── Confirmação. As etiquetas mudam com o tipo — nunca fixar "Evento".
const ROTULOS = {
  evento:     { l1: 'Evento',     l2: 'Quando' },
  tarefa:     { l1: 'Tarefa',     l2: 'Recorrência' },
  manutencao: { l1: 'Manutenção', l2: 'Quando' },
};
const CORPOS = {
  evento: {
    on: 'Este evento vai aparecer na Agenda de todos os membros da casa e qualquer adulto poderá alterá-lo. Confirma?',
    off: 'Este evento fica visível apenas para si. Os restantes membros não o verão na Agenda partilhada nem receberão aviso. Confirma?',
  },
  tarefa: {
    on: 'Esta tarefa vai aparecer nas Tarefas de todos os membros da casa, e os pontos contam para a semanada. Confirma?',
    off: 'Esta tarefa fica visível apenas para si. Não aparece na lista dos restantes membros nem gera aviso. Confirma?',
  },
  manutencao: {
    on: 'Esta manutenção vai aparecer na Agenda de todos os membros da casa e fica registada na ficha do equipamento. Confirma?',
    off: 'Esta manutenção fica visível apenas para si, mas continua registada na ficha do equipamento. Confirma?',
  },
};

export const Confirmar = ({ t, kind, titulo, quando, shared, owner, onConfirm, onBack }) => {
  const r = ROTULOS[kind], c = CORPOS[kind];
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 86, zIndex: 90,
      alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Pressable onPress={onBack} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,.5)' }} accessibilityLabel="Fechar" />
      <View style={{ backgroundColor: t.surface, borderRadius: R.card, padding: 24, gap: S.lg,
        width: '100%', ...elev(2) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Icon name={shared ? 'home' : 'lock'} size={26} color={t.accent} />
          <Text style={{ flex: 1, fontFamily: FONT.display, fontSize: 20, fontWeight: '500', color: t.text1 }}>
            {shared ? 'Partilhar com a família?' : 'Guardar só no seu perfil?'}
          </Text>
        </View>
        <Text style={{ fontFamily: FONT.body, fontSize: 15, lineHeight: 23, color: t.text2 }}>
          {shared ? c.on : c.off}
        </Text>
        <View style={{ backgroundColor: t.subtle, borderRadius: R.card, padding: 16, gap: S.md }}>
          {[[r.l1, titulo], [r.l2, quando],
            ['Visibilidade', shared ? 'Família — 4 membros' : `Só eu — ${owner}`]].map(([k, v]) => (
            <View key={k} style={{ flexDirection: 'row', gap: 12 }}>
              <Text style={{ flex: 1, fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.slate }}>{k}</Text>
              <Text style={{ flex: 1.4, fontFamily: FONT.body, fontSize: 14, color: t.text2, textAlign: 'right' }}>{v}</Text>
            </View>
          ))}
        </View>
        <Primary t={t} onPress={onConfirm}
          label={shared ? 'Confirmar e Partilhar' : 'Confirmar como Privado'} />
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Voltar e alterar"
          style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: '500',
            color: t.text3, letterSpacing: 0.4 }}>Voltar e Alterar</Text>
        </Pressable>
      </View>
    </View>
  );
};

// ── Nova tarefa
export const NovaTarefa = ({ t, me, onClose }) => {
  const { set } = useStore();
  const [d, setD] = useState({ title: '', who: 'Léo', recur: 'Todos os dias', pts: 2, urg: 1, shared: true });
  const [ask, setAsk] = useState(false);
  const guardar = () => {
    const id = 'nt' + Date.now();
    set(x => ({
      newTasks: [{ id, title: d.title.trim() || 'Nova tarefa', who: d.who,
        meta: d.recur, pts: d.pts, recur: d.recur, today: true, shared: d.shared }, ...x.newTasks],
      urg: { ...x.urg, [id]: d.urg },
      registo: [{ t: `Tarefa "${d.title.trim() || 'Nova tarefa'}" criada`, at: Date.now() }, ...x.registo],
    }));
    onClose();
  };
  return (
    <>
      <Sheet t={t} title="Nova Tarefa" onClose={onClose}
        action={<Primary t={t} label="Guardar Tarefa" onPress={() => setAsk(true)} />}>
        <Field t={t} label="Tarefa">
          <TextField t={t} value={d.title} onChangeText={(v) => setD({ ...d, title: v })}
            placeholder="Escreva a tarefa" label="Nome da tarefa" />
        </Field>
        <Field t={t} label="Atribuir a"><MemberGrid t={t} value={d.who} onChange={(v) => setD({ ...d, who: v })} /></Field>
        <Field t={t} label="Recorrência">
          <Segmented t={t} small value={d.recur} onChange={(v) => setD({ ...d, recur: v })}
            options={[{ value: 'Todos os dias', label: 'Diária' },
                      { value: 'Dias de semana', label: 'Semana' },
                      { value: 'Uma vez', label: 'Uma vez' }]} />
        </Field>
        <Field t={t} label="Pontos para a semanada">
          <Segmented t={t} small value={d.pts} onChange={(v) => setD({ ...d, pts: v })}
            options={[{ value: 0, label: 'Sem' }, { value: 2, label: '2 pt' },
                      { value: 3, label: '3 pt' }, { value: 5, label: '5 pt' }]} />
        </Field>
        <Field t={t} label="Urgência">
          <Segmented t={t} small value={d.urg} onChange={(v) => setD({ ...d, urg: v })}
            options={[{ value: 0, label: 'Urgente' }, { value: 1, label: 'Normal' },
                      { value: 2, label: 'Sem pressa' }]} />
        </Field>
        <ShareBlock t={t} on={d.shared} owner={me} kind="tarefa"
          onToggle={() => setD({ ...d, shared: !d.shared })} />
      </Sheet>
      {ask ? (
        <Confirmar t={t} kind="tarefa" titulo={d.title.trim() || 'Nova tarefa'}
          quando={`${d.recur} · ${d.who} · ${d.pts} pt`} shared={d.shared} owner={me}
          onConfirm={guardar} onBack={() => setAsk(false)} />
      ) : null}
    </>
  );
};

// ── Novo evento
export const NovoEvento = ({ t, me, dayKey, onClose }) => {
  const { set } = useStore();
  const [d, setD] = useState({ title: '', time: '19:00', owner: me, shared: true, key: dayKey || TODAY_KEY });
  const [ask, setAsk] = useState(false);
  const guardar = () => {
    const titulo = d.title.trim() || 'Novo evento';
    set(x => ({
      added: [...x.added, { id: 'ev' + Date.now(), day: d.key, time: d.time, title: titulo,
        who: d.owner, owner: d.owner, shared: d.shared }],
      registo: [{ t: `Evento "${titulo}" agendado`, at: Date.now() }, ...x.registo],
    }));
    onClose();
  };
  return (
    <>
      <Sheet t={t} title="Agendar Evento" onClose={onClose}
        action={<Primary t={t} label="Guardar Evento" onPress={() => setAsk(true)} />}>
        <Field t={t} label="O que quer agendar">
          <TextField t={t} value={d.title} onChangeText={(v) => setD({ ...d, title: v })}
            placeholder="Escreva o evento" label="Nome do evento" />
        </Field>
        <Field t={t} label="Quando">
          <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: R.row,
            minHeight: 52, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="calendar" size={20} color={t.slate} />
            <Text style={{ flex: 1, fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>
              {dayLabel(d.key)}
            </Text>
            <Text style={{ fontFamily: FONT.ui, fontSize: 14, fontWeight: '600', color: t.text2 }}>{d.time}</Text>
          </View>
          <Segmented t={t} small value={d.time} onChange={(v) => setD({ ...d, time: v })}
            options={['09:00', '14:00', '19:00'].map(h => ({ value: h, label: h }))} />
        </Field>
        <Field t={t} label="Responsável">
          <MemberGrid t={t} value={d.owner} onChange={(v) => setD({ ...d, owner: v })} />
        </Field>
        <ShareBlock t={t} on={d.shared} owner={d.owner} kind="evento"
          onToggle={() => setD({ ...d, shared: !d.shared })} />
      </Sheet>
      {ask ? (
        <Confirmar t={t} kind="evento" titulo={d.title.trim() || 'Novo evento'}
          quando={`${dayLabel(d.key)} · ${d.time}`} shared={d.shared} owner={d.owner}
          onConfirm={guardar} onBack={() => setAsk(false)} />
      ) : null}
    </>
  );
};

// ── Novo artigo. Sem confirmação: um artigo não é uma coisa agendada.
export const NovoArtigo = ({ t, onClose }) => {
  const { set } = useStore();
  const [d, setD] = useState({ label: '', s: 2, staple: false, est: 2 });
  const guardar = () => {
    const nome = d.label.trim() || 'Novo artigo';
    set(x => ({
      newItems: [...x.newItems, { id: 'ni' + Date.now(), s: d.s, label: nome, est: d.est,
        staple: d.staple, by: d.staple ? 'Artigo habitual' : 'Acrescentado agora' }],
      registo: [{ t: `Artigo "${nome}" acrescentado à lista`, at: Date.now() }, ...x.registo],
    }));
    onClose();
  };
  return (
    <Sheet t={t} title="Acrescentar Artigo" onClose={onClose}
      action={<Primary t={t} label="Adicionar à Lista" onPress={guardar} />}>
      <Field t={t} label="Artigo">
        <TextField t={t} value={d.label} onChangeText={(v) => setD({ ...d, label: v })}
          placeholder="Escreva o artigo" label="Nome do artigo" />
      </Field>
      <Field t={t} label="Secção">
        <Segmented t={t} small value={d.s} onChange={(v) => setD({ ...d, s: v })}
          options={SECTIONS.map((n, i) => ({ value: i, label: n.split(' ')[0] }))} />
      </Field>
      <View style={{ backgroundColor: t.subtle, borderWidth: 1, borderColor: t.border,
        borderRadius: R.card, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Icon name="refresh" size={24} color={t.slate} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>Artigo habitual</Text>
          <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 17, color: t.text3 }}>
            {d.staple ? 'Entra na lista sozinho, todas as segundas-feiras.'
              : 'Compra pontual — entra apenas nesta lista.'}
          </Text>
        </View>
        <Toggle t={t} on={d.staple} label="Artigo habitual"
          onPress={() => setD({ ...d, staple: !d.staple })} />
      </View>
    </Sheet>
  );
};
