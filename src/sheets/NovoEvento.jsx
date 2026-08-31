import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { useStore, VISIBILIDADES } from '../store';
import CampoData from '../CampoData';
import { S, R, FONT } from '../theme';
import { Label, Primary, EscolherMembros, Opcao, Toggle, Tile } from '../ui';
import Confirm from '../Confirm';
import Icon from '../Icon';
import ConfirmShare from '../ConfirmShare';
import { parseKey, listaEmPortugues } from '../format';
import * as servidor from '../pocketbase';

// A mesma folha cria e edita. Duas folhas para o mesmo objeto divergem — uma
// ganha um campo, a outra não — e depois um evento criado e um evento editado
// já não são a mesma coisa.
export default function NovoEvento({ t, user, onClose, preFillDay, evento }) {
  const { set, s, adultos, membros: MEMBROS, editarEvento, removerEvento } = useStore();
  const aEditar = !!evento;
  const [aApagar, setAApagar] = useState(false);
  const [naGoogle, setNaGoogle] = useState(servidor.google.disponivel());
  const [erroGoogle, setErroGoogle] = useState(null);
  const [aGuardar, setAGuardar] = useState(false);

  // Quem é convidado: os membros da casa que este evento alcança E têm e-mail.
  //
  // ⚠ Não se escreve na agenda de outra pessoa — nem esta app nem nenhuma. A
  // agenda de cada um é dela, e o único token que existe aqui é o de quem
  // entrou. O que se faz é CONVIDAR: a Google põe o evento na agenda de quem
  // aceitar, e manda-lhe um convite por correio.
  //
  // As crianças não têm e-mail (é uma decisão do §8, não um esquecimento),
  // portanto não se convidam. Veem o evento na app, que é onde a agenda delas
  // vive.
  const convidados = Object.entries(MEMBROS)
    .filter(([nome, m]) => nome !== user && m.email && !m.kid
      && (form.visibilidade === 'familia' || form.visibilidade === 'adultos'))
    .map(([, m]) => m.email);
  const [form, setForm] = useState(evento ? {
    title: evento.title || '',
    day: evento.day || null,
    time: evento.time || '10:00',
    responsaveis: evento.responsaveis
      || (evento.responsible ? [evento.responsible] : []),
    visibilidade: evento.visibilidade || (evento.shared ? 'familia' : 'so-eu'),
  } : {
    title: '',
    day: null,
    time: '10:00',
    // Quem fica responsável. Um ou mais, e só adultos: um evento é um
    // compromisso, e um compromisso é de quem o pode cumprir. As sementes já
    // diziam «Rita e Tomás» numa reunião de pais — em texto livre, porque a
    // folha só deixava escolher um.
    //
    // Arranca em quem está a criar, se for adulto. Uma criança que marque um
    // evento não fica responsável por ele: escolhe quem fica.
    responsaveis: MEMBROS[user] && !MEMBROS[user].kid ? [user] : [],
    visibilidade: 'familia',
  });
  const [confirming, setConfirming] = useState(false);

  // Pre-fill date if provided
  useEffect(() => {
    if (preFillDay) {
      const parsed = parseKey(preFillDay);
      if (parsed) {
        setForm(f => ({ ...f, day: preFillDay }));
      }
    }
  }, [preFillDay]);

  const handleSave = () => {
    if (!form.title.trim() || !form.day || !form.responsaveis.length) return;
    setConfirming(true);
  };

  // O que a Google leva. Separado do que a app guarda, porque são duas coisas
  // com formas diferentes e juntá-las fazia o evento local depender de a
  // Google responder.
  const paraGoogle = () => ({
    titulo: form.title,
    dia: form.day,
    hora: form.time,
    convidados,
    descricao: `Criado na Nossa Casa por ${user}.`,
  });

  const handleConfirm = async () => {
    if (aEditar) {
      // Um remendo, e não um evento novo: as sementes vivem no código e não se
      // podem reescrever, e um evento criado na app segue o mesmo caminho para
      // não haver dois.
      const campos = {
        title: form.title,
        day: form.day,
        time: form.time,
        who: listaEmPortugues(form.responsaveis),
        responsaveis: form.responsaveis,
        visibilidade: form.visibilidade,
      };
      // A app guarda primeiro. Se a Google falhar, o evento fica na app na
      // mesma — o contrário perdia o que a pessoa escreveu por causa de uma
      // rede.
      editarEvento(evento.id, campos);
      if (naGoogle && evento.idGoogle && servidor.google.disponivel()) {
        setAGuardar(true);
        try { await servidor.google.atualizarEvento(evento.idGoogle, paraGoogle()); }
        catch (e) { setErroGoogle(e.message); setAGuardar(false); setConfirming(false); return; }
        setAGuardar(false);
      }
      setConfirming(false);
      onClose();
      return;
    }
    const id = 'evt-' + Date.now();
    // O campo é `day`, e a chave é `d2026-08-21`. Isto escrevia
    // `date: '2026-08-21'` — nome diferente e formato diferente do que a app
    // lê. O evento gravava-se e não aparecia em lado nenhum: nem na Agenda,
    // nem no Início, nem na grelha do mês. Guardar parecia não fazer nada, e
    // fazia — só que num campo que ninguém consulta.
    const event = {
      id,
      title: form.title,
      day: form.day,
      time: form.time,
      // `who` é a linha que a Agenda mostra por baixo do título.
      who: listaEmPortugues(form.responsaveis),
      responsaveis: form.responsaveis,
      owner: user,
      visibilidade: form.visibilidade,
      manual: true,
    };

    set(s => ({
      added: [...(s.added || []), event],
    }));

    if (naGoogle && servidor.google.disponivel()) {
      setAGuardar(true);
      try {
        const idGoogle = await servidor.google.criarEvento(paraGoogle());
        // O identificador da Google guarda-se para editar e apagar do lado de
        // lá. Sem ele, uma alteração na app deixava a agenda a dizer outra
        // coisa e ninguém percebia porquê.
        set(x => ({ eventEdits: { ...x.eventEdits, [id]: { ...(x.eventEdits[id] || {}), idGoogle } } }));
      } catch (e) {
        setErroGoogle(e.message); setAGuardar(false); setConfirming(false); return;
      }
      setAGuardar(false);
    }

    setConfirming(false);
    onClose();
  };

  const canSave = form.title.trim() && form.day && form.responsaveis.length > 0;

  return (
    <View style={{ gap: S.lg }}>
      <View style={{ gap: S.sm }}>
        <Label t={t}>Título do evento</Label>
        <TextInput
          value={form.title}
          onChangeText={(v) => setForm(f => ({ ...f, title: v }))}
          placeholder="Ex: Reunião com professor"
          placeholderTextColor={t.text3}
          maxLength={60}
          style={{
            minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body,
            fontSize: 15, color: t.text2, borderRadius: R.row, borderWidth: 1,
            borderColor: t.border, backgroundColor: t.card,
          }}
        />
      </View>

      <View style={{ gap: S.sm }}>
        <Label t={t}>Data</Label>
        {/* Era um botão cujo manipulador não fazia nada e trazia um comentário
            a prometer um calendário para mais tarde. Um controlo que parece
            tocável e não faz nada, a meio do caminho de marcar um evento.
            Agora escreve-se a data ou escolhe-se no calendário. */}
        <CampoData t={t} valor={form.day}
          onChange={(chave) => setForm(f => ({ ...f, day: chave }))} />
      </View>

      <View style={{ gap: S.sm }}>
        <Label t={t}>Hora</Label>
        <TextInput
          value={form.time}
          onChangeText={(v) => setForm(f => ({ ...f, time: v }))}
          placeholder="HH:MM"
          keyboardType="decimal-pad"
          style={{
            minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body,
            fontSize: 15, color: t.text2, borderRadius: R.row, borderWidth: 1,
            borderColor: t.border, backgroundColor: t.card,
          }}
        />
      </View>

      <View style={{ gap: S.sm }}>
        <Label t={t}>{form.responsaveis.length > 1 ? 'Responsáveis' : 'Responsável'}</Label>
        <EscolherMembros t={t} membros={adultos}
          valor={form.responsaveis}
          onEscolher={(nomes) => setForm(f => ({ ...f, responsaveis: nomes }))} />
        <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
          {form.responsaveis.length === 0
            ? 'Escolha pelo menos um adulto.'
            : `${listaEmPortugues(form.responsaveis)} — toque outra vez para tirar.`}
        </Text>
      </View>

      {/* Três níveis, e não um interruptor. «Partilhar» ligado ou desligado
          eram a casa toda ou mais ninguém, e faltava o do meio — que é o que
          uma família precisa mais vezes: uma consulta, uma reunião na escola,
          uma conta a pagar. Coisas que os dois adultos têm de saber e que não
          têm de aparecer na agenda de uma criança de sete anos. */}
      <View style={{ gap: S.md }}>
        <Label t={t}>Quem vê</Label>
        {VISIBILIDADES.map(v => (
          <Opcao key={v.chave} t={t} titulo={v.rotulo} detalhe={v.detalhe}
            selected={form.visibilidade === v.chave}
            onPress={() => setForm(f => ({ ...f, visibilidade: v.chave }))} />
        ))}
      </View>

      {/* A agenda da Google. Só aparece se houver autorização — um interruptor
          que não pode fazer nada é pior do que a sua ausência.

          O texto diz que CONVIDA e que isso manda e-mail, antes de acontecer.
          Não se escreve na agenda de outra pessoa: a agenda de cada um é dela,
          e o que a app pode fazer é convidar. Quem aceita, fica com o evento. */}
      {servidor.google.disponivel() ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14,
          borderWidth: 1, borderColor: t.border, borderRadius: R.card, padding: 14 }}>
          <Icon name="calendar" size={22} color={t.slate} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>
              Marcar também na agenda da Google
            </Text>
            <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
              {!naGoogle ? 'Fica só na Nossa Casa.'
                : convidados.length
                  ? `Entra na sua agenda e convida ${listaEmPortugues(convidados)} — a Google manda-lhes um e-mail.`
                  : 'Entra na sua agenda. Não há mais ninguém com e-mail nesta casa para convidar.'}
            </Text>
          </View>
          <Toggle t={t} on={naGoogle} label="Marcar na agenda da Google"
            onPress={() => { setNaGoogle(v => !v); setErroGoogle(null); }} />
        </View>
      ) : null}

      {erroGoogle ? <Tile t={t} kind="warn">{erroGoogle}</Tile> : null}

      <Primary
        t={t}
        label={aGuardar ? 'A guardar…'
          : aEditar ? 'Guardar alterações' : 'Guardar evento'}
        disabled={!canSave || aGuardar}
        onPress={handleSave}
      />

      {aEditar ? (
        <Pressable onPress={() => setAApagar(true)}
          accessibilityRole="button" accessibilityLabel={`Apagar ${evento.title}`}
          style={({ pressed }) => ({ minHeight: 44, alignItems: 'center',
            justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
          <Text style={{ fontFamily: FONT.body, fontSize: 14, color: t.state.err }}>
            Apagar evento
          </Text>
        </Pressable>
      ) : null}

      {/* Apagar não se desfaz, portanto confirma-se — como em toda a app. */}
      {aApagar ? (
        <Confirm t={t}
          title={`Apagar «${evento.title}»?`}
          message="Sai da agenda de quem o via. Não se desfaz."
          confirmLabel="Apagar"
          destructive
          onConfirm={() => { removerEvento(evento.id); setAApagar(false); onClose(); }}
          onCancel={() => setAApagar(false)} />
      ) : null}

      {confirming ? (
        <ConfirmShare
          t={t}
          type="evento"
          isPrivate={form.visibilidade === 'so-eu'}
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </View>
  );
}
