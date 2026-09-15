import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import CampoData from '../CampoData';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { Label, Primary, BotaoCompacto, NumField, Bar, Linha, Row, Avatar, avatarDe } from '../ui';
import { useAcaoDaFolha } from '../Sheet';
import Icon from '../Icon';
import { plural, dayLabel, TODAY_KEY, chaveDeDMY, dmyDeChave, daysUntil } from '../format';
import { planoDaReceita, tomasDoDia, horaDoInstante, diaDoInstante } from '../medicacao';

/**
 * As tomas de uma receita: o estado, o que já se tomou, a Agenda, e a receita.
 *
 * ── O que se pediu ───────────────────────────────────────────────────────────
 *
 * 12/09/2026, a sexta das dez funcionalidades. Na receita: dose, frequência,
 * duração, tamanho da caixa. «Pôr na Agenda» cria os eventos «só adultos»;
 * cada toma marca-se e fica com quem e quando. Aviso quando a caixa acaba
 * antes da receita.
 *
 * ── A forma é a da folha Gerir Meta (desenho A, 15/09/2026) ─────────────────
 *
 * «Este layout não me parece consistente com o resto da app», e depois
 * «parece-me incompleto». Ver `design/folha-das-tomas.dc.html`. A folha:
 *
 *   - CRESCE com o plano. Sem plano só há a receita e o rodapé diz «Definir
 *     plano»; com plano aparecem o estado (barra + números), «Hoje», «Antes de
 *     hoje» e a Agenda, e o rodapé passa a «Tomado agora». Mostrar «Hoje»
 *     vazio e uma Agenda desligada a quem ainda não tem plano era o que a
 *     fazia parecer incompleta;
 *   - a RECEITA é completa: o que a folha de criar pede (nome, dose ·
 *     quantidade · unidade, validade, notas, plano) altera-se aqui — quem cria
 *     com sete altera com sete;
 *   - o PLANO é uma linha de três números lado a lado (`NumField compacto`),
 *     não três blocos altos com «−» e «+»;
 *   - «Hoje» é uma `Linha` por toma (hora · bola de quem · «tomado» · ×);
 *   - a Agenda é uma `Row` com seta — leva à ação, não compete com o rodapé;
 *   - UM botão compacto «Guardar alterações» para tudo o que se altera, e só
 *     aparece quando algo mudou; o rodapé fixo (`useAcaoDaFolha`) leva a ação
 *     do estado, em botão comum — acrescenta, não se desfaz nada.
 *
 * ⚠ «Quantas tomas» é a CONTAGEM das linhas, nunca um número na receita
 * (INVARIANTE #2). Só quem marcou desmarca. Tudo sobe pelo travão de casa.
 *
 * `record` é a consulta (`{ id, member, day }`), `recipe` a receita dela.
 */
export default function TomasDaReceita({ t, user, record, recipe }) {
  const { definirTomas, alterarReceita, tomasDaReceita, marcarToma, desmarcarToma, agendaTemTomas, porTomasNaAgenda,
    membros: MEMBROS } = useStore();
  // O rascunho da receita — os campos da folha de criar. O plano continua a
  // ser texto, que é o que o `definirTomas` já lia; vazio é vazio. `rascunho`,
  // e não `plano`: o guarda do plano de COMPRAS lê `plano.x` nos ecrãs.
  const [rascunho, setRascunho] = useState({
    name: recipe.name || '', dosage: recipe.dosage || '', quantity: recipe.quantity || '', unit: recipe.unit || '',
    expiresAt: recipe.expiresAt || '', notas: recipe.notas || '',
    frequency: String(recipe.frequency || ''), durationDays: String(recipe.durationDays || ''), boxSize: String(recipe.boxSize || ''),
  });
  const muda = (campo, v) => { setErro(null); setRascunho(x => ({ ...x, [campo]: v })); };
  const [erro, setErro] = useState(null);
  const [aviso, setAviso] = useState(null);

  const p = planoDaReceita(recipe, record.day);
  const tomas = tomasDaReceita(record.id, recipe.id);
  const hoje = tomasDoDia(tomas, TODAY_KEY);
  const antes = tomas.filter(tm => !hoje.includes(tm));
  const naAgenda = agendaTemTomas(record.id, recipe.id);

  // O que mudou, campo a campo — o botão só aparece quando algo mudou.
  const planoMudou = ['frequency', 'durationDays', 'boxSize'].some(k => rascunho[k] !== String(recipe[k] || ''));
  const textoMudou = ['name', 'dosage', 'quantity', 'unit', 'expiresAt', 'notas'].some(k => rascunho[k].trim() !== (recipe[k] || ''));
  const mudou = textoMudou || planoMudou;
  const planoPreenchido = !!(Number(rascunho.frequency) && Number(rascunho.durationDays));

  const guardar = () => {
    let msg = textoMudou ? alterarReceita(record.id, recipe.id, {
      name: rascunho.name, dosage: rascunho.dosage, quantity: rascunho.quantity, unit: rascunho.unit,
      expiresAt: rascunho.expiresAt, notas: rascunho.notas,
    }) : null;
    if (!msg && planoMudou) msg = definirTomas(record.id, recipe.id, rascunho);
    setErro(msg);
    if (!msg) setAviso(p ? 'Receita guardada.' : 'Plano definido. Já pode marcar as tomas.');
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

  // O estado com plano: em que dia se está, quantas doses vão, o que falta hoje.
  //
  // ⚠ Três dias diferentes, e cada um diz outra coisa: o plano pode ainda não
  // ter COMEÇADO (uma consulta marcada para a semana que vem), estar a decorrer,
  // ou já ter terminado. Dizia «Dia 1 de 14 · faltam 2 hoje» nos três — e num
  // plano que só começa daqui a cinco dias isso é uma instrução errada.
  const porComecar = !!p && TODAY_KEY < p.inicio;
  const terminado = !!p && TODAY_KEY > p.fim;
  const diaDoPlano = p ? (p.dias.indexOf(TODAY_KEY) + 1 || (terminado ? p.duracao : 0)) : 0;
  const faltamHoje = p && !porComecar && !terminado ? Math.max(0, p.frequencia - hoje.length) : 0;
  const pct = p ? (tomas.length / p.doses) * 100 : 0;
  const estado = !p ? null : porComecar
    ? `Começa a ${dmyDeChave(p.inicio)} · ${p.descricao}`
    : [
      terminado ? `Plano de ${plural(p.duracao, 'dia', 'dias')}, terminado` : `Dia ${diaDoPlano} de ${p.duracao}`,
      `${tomas.length} de ${plural(p.doses, 'dose', 'doses')}`,
      terminado ? null : faltamHoje ? `faltam ${faltamHoje} hoje` : 'hoje está feito',
    ].filter(Boolean).join(' · ');
  // A validade da receita, quando está perto ou já passou.
  const diasDeValidade = daysUntil(recipe.expiresAt);
  const validade = diasDeValidade === null ? null
    : diasDeValidade < 0 ? { texto: `A receita expirou em ${recipe.expiresAt}.`, cor: t.state.errTexto }
      : diasDeValidade <= 30 ? { texto: `A receita expira em ${recipe.expiresAt} (${plural(diasDeValidade, 'dia', 'dias')}).`, cor: t.state.warnTexto }
        : null;

  // `campo`, com os 44 px — o nome que o guarda `todo-campo-tem-44` reconhece.
  const campo = {
    minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body, fontSize: 15,
    color: t.text2, borderRadius: R.row, borderWidth: 1, borderColor: t.border, backgroundColor: t.card,
  };

  // Uma toma numa linha: hora · bola de quem · «tomado» · × (só a quem marcou).
  const linhaDaToma = (tm, i, arr, comDia) => (
    <Linha key={tm.id} t={t} last={i === arr.length - 1}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
        <Text style={{ width: 42, fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.text3 }}>{horaDoInstante(tm.quando)}</Text>
        <Avatar {...avatarDe(tm.por, MEMBROS[tm.por], t.text3)} size={28} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>tomado</Text>
          <Text numberOfLines={1} style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
            {comDia ? `${dayLabel(diaDoInstante(tm.quando))} · ${tm.por}` : tm.por}
          </Text>
        </View>
        {/* Só quem marcou desmarca — e o alvo só aparece a essa pessoa. */}
        {tm.por === user ? (
          <Pressable onPress={() => setErro(desmarcarToma(record.id, recipe.id, tm.id, user))}
            accessibilityRole="button" accessibilityLabel={`Desmarcar a toma das ${horaDoInstante(tm.quando)}`}
            style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={18} color={t.text3} />
          </Pressable>
        ) : null}
      </View>
    </Linha>
  );

  return (
    <View style={{ gap: S.lg }}>
      {/* ── O estado ─────────────────────────────────────────────────────── */}
      <View style={{ gap: S.sm }}>
        {p ? <Bar t={t} pct={pct} color={t.accent} height={6} /> : null}
        <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, lineHeight: 19, color: t.text3 }}>
          {p ? estado : 'Ainda sem plano. Diga em baixo quantas tomas por dia e durante quantos dias — a caixa é opcional.'}
        </Text>
        {validade ? (
          <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, lineHeight: 19, fontWeight: '600', color: validade.cor }}>{validade.texto}</Text>
        ) : null}
        {/* O aviso da caixa: o tijolo âmbar, e o texto «deep» que é o único
            que se lê sobre ele. */}
        {p && p.aviso ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md,
            borderRadius: R.row, backgroundColor: t.state.warnBg, borderWidth: 1, borderColor: t.state.warn }}>
            <Icon name="warning" size={18} color={t.state.warnDeep} />
            <Text style={{ flex: 1, fontFamily: FONT.ui, fontSize: 12.5, lineHeight: 18, color: t.state.warnDeep }}>{p.aviso}</Text>
          </View>
        ) : null}
      </View>

      {/* ── Hoje, antes, e a Agenda — só com plano ───────────────────────── */}
      {p ? (
        <>
          <View style={{ gap: S.sm }}>
            <Label t={t}>{`Hoje · ${plural(hoje.length, 'toma', 'tomas')} de ${p.frequencia}`}</Label>
            {hoje.length === 0 ? (
              <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, color: t.text3 }}>Ainda nenhuma toma marcada hoje.</Text>
            ) : <View>{hoje.map((tm, i, arr) => linhaDaToma(tm, i, arr, false))}</View>}
          </View>

          {antes.length ? (
            <View style={{ gap: S.sm }}>
              <Label t={t}>Antes de hoje</Label>
              <View>{antes.slice(0, 8).map((tm, i, arr) => linhaDaToma(tm, i, arr, true))}</View>
              {antes.length > 8 ? (
                <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>e mais {antes.length - 8}.</Text>
              ) : null}
            </View>
          ) : null}

          <View style={{ gap: S.sm }}>
            <Label t={t}>Agenda</Label>
            {/* Uma linha com seta, não um botão: leva à ação e não compete
                com o do rodapé. E o «só adultos» está escrito, porque é a
                decisão que importa: a criança não vê a medicação na agenda. */}
            {naAgenda ? (
              <Row t={t} icon="calendar" title="Na Agenda" sub="Um dia por toma, só para os adultos" last />
            ) : (
              <Row t={t} icon="calendar" title="Pôr as tomas na Agenda" last
                sub={`${plural(p.dias.filter(d => d >= TODAY_KEY).length, 'dia', 'dias')} a partir de hoje · só adultos`}
                onPress={agendar} />
            )}
          </View>
        </>
      ) : null}

      {/* ── A receita ────────────────────────────────────────────────────── */}
      <View style={{ gap: S.sm }}>
        <Label t={t}>Receita</Label>
        <TextInput accessibilityLabel="Nome do medicamento"
          value={rascunho.name} onChangeText={(v) => muda('name', v)}
          placeholder="Ex: Ferro 30 mg" placeholderTextColor={t.text3} maxLength={60}
          style={{ ...campo, minHeight: 44 }} />
        {/* Dose · quantidade · unidade, na mesma linha da folha de criar.
            ⚠ `flexBasis: 0, minWidth: 0`: na web um campo de texto tem largura
            própria, e sem isto os três dividiam a linha em partes iguais
            e a unidade cortava «frasco» em «fras». */}
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          <TextInput accessibilityLabel="Dose"
            value={rascunho.dosage} onChangeText={(v) => muda('dosage', v)}
            placeholder="Dose" placeholderTextColor={t.text3} maxLength={40}
            style={{ ...campo, minHeight: 44, flex: 1, flexBasis: 0, minWidth: 0 }} />
          <TextInput accessibilityLabel="Quantidade"
            value={rascunho.quantity} onChangeText={(v) => muda('quantity', v)}
            placeholder="Qtd" placeholderTextColor={t.text3} maxLength={12}
            style={{ ...campo, minHeight: 44, flex: 0.5, flexBasis: 0, minWidth: 0 }} />
          <TextInput accessibilityLabel="Unidade"
            value={rascunho.unit} onChangeText={(v) => muda('unit', v)}
            placeholder="Unid" placeholderTextColor={t.text3} maxLength={12}
            style={{ ...campo, minHeight: 44, flex: 0.9, flexBasis: 0, minWidth: 0 }} />
        </View>
      </View>

      <View style={{ gap: S.sm }}>
        <Label t={t}>Validade</Label>
        <CampoData t={t} valor={chaveDeDMY(rascunho.expiresAt)} placeholder="Validade (dd/mm/aaaa)"
          onChange={(k) => muda('expiresAt', k ? dmyDeChave(k) : '')} />
      </View>

      <View style={{ gap: S.sm }}>
        <Label t={t}>Notas</Label>
        <TextInput accessibilityLabel="Notas da receita"
          value={rascunho.notas} onChangeText={(v) => muda('notas', v)}
          placeholder="Ex: tomar depois do jantar" placeholderTextColor={t.text3} maxLength={500} multiline
          style={{ ...campo, minHeight: 44, paddingVertical: S.md, lineHeight: 21 }} />
      </View>

      {/* ── O plano: três números lado a lado ────────────────────────────── */}
      <View style={{ gap: S.sm }}>
        <Label t={t}>Plano de tomas</Label>
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          {[['frequency', 'Por dia', 'Tomas por dia'], ['durationDays', 'Dias', 'Duração em dias'], ['boxSize', 'Caixa', 'Unidades na caixa']].map(([campoDoPlano, curto, rotulo]) => (
            <View key={campoDoPlano} style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Text style={{ fontFamily: FONT.ui, fontSize: 11, color: t.text3, textAlign: 'center' }}>{curto}</Text>
              {/* Vazio é «—», como na folha de criar: um exemplo num campo
                  vazio lia-se como o valor. */}
              <NumField t={t} compacto vazio suffix={false} step={1} min={0} max={999} rotulo={rotulo} placeholder="—"
                value={rascunho[campoDoPlano] === '' || rascunho[campoDoPlano] == null ? null : Number(rascunho[campoDoPlano])}
                onChange={(v) => muda(campoDoPlano, v == null ? '' : String(v))} />
            </View>
          ))}
        </View>
        <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 17, color: t.text3 }}>
          {planoPreenchido
            ? `${plural(Number(rascunho.frequency), 'toma', 'tomas')} por dia · ${plural(Number(rascunho.durationDays), 'dia', 'dias')}${Number(rascunho.boxSize) ? ` · caixa de ${Number(rascunho.boxSize)}` : ''} · ${Number(rascunho.frequency) * Number(rascunho.durationDays)} doses no total`
            : 'Tomas por dia e dias são precisos; a caixa avisa quando não chega ao fim.'}
        </Text>
      </View>

      {/* Um só botão compacto para tudo o que se altera — e só quando algo
          mudou (o padrão do membro, na Gestão).
          ⚠ Sem plano também: era `p && mudou`, e numa receita ainda sem plano
          não havia botão NENHUM que guardasse o nome, a dose, a validade ou as
          notas — o do rodapé pede o plano preenchido, e o que se escrevia
          perdia-se ao fechar a folha. Quando é o PLANO que muda e ainda não há
          plano, quem guarda é o rodapé, e este não aparece para não haver dois
          botões a dizer o mesmo. */}
      {(textoMudou || (p && planoMudou)) ? (
        <BotaoCompacto t={t} tom="comum" label="Guardar alterações"
          etiqueta="Guardar as alterações à receita" onPress={guardar} />
      ) : null}

      {erro ? (
        <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, lineHeight: 19, color: t.state.errTexto }}>{erro}</Text>
      ) : aviso ? (
        <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, lineHeight: 19, color: t.state.okTexto }}>{aviso}</Text>
      ) : null}

      {/* O botão principal vai para o rodapé FIXO da folha (`useAcaoDaFolha`) e
          muda com o estado: sem plano, definir o plano é o que falta; com
          plano, marcar a toma é a ação de todos os dias. Botão comum nos dois
          casos: acrescenta, não se desfaz nada. */}
      {/* ⚠ E desliga-se quando não há dose para marcar: o plano já terminou,
          ainda não começou, ou as de hoje já estão todas. Marcava na mesma, e
          anunciava «4.ª de 3 hoje» — uma dose que o plano não tem. A contagem
          é a soma das linhas (INVARIANTE #2), e por isso uma a mais fica lá. */}
      {useAcaoDaFolha(p
        ? <Primary comum t={t} label="Tomado agora"
            sub={terminado ? 'O plano já terminou'
              : porComecar ? `Começa a ${dmyDeChave(p.inicio)}`
                : faltamHoje ? `${hoje.length + 1}.ª de ${p.frequencia} hoje · fica em nome de ${user}`
                  : `As ${plural(p.frequencia, 'toma', 'tomas')} de hoje já estão marcadas`}
            disabled={terminado || porComecar || !faltamHoje}
            onPress={marcar} />
        : <Primary comum t={t} label="Definir plano"
            sub={planoPreenchido ? `${Number(rascunho.frequency) * Number(rascunho.durationDays)} doses · a partir de ${dayLabel(record.day)}` : 'Diga as tomas por dia e os dias'}
            disabled={!planoPreenchido} onPress={guardar} />)}
    </View>
  );
}
