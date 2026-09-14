import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { Label, Primary, Pill, Choice, BotaoCompacto, Tile } from '../ui';
import Icon from '../Icon';
import Sheet from '../Sheet';
import { TODAY_KEY, dmyDeChave } from '../format';
import { GRAVIDADES, documentoDeEmergencia, nomeDoFicheiroDeEmergencia } from '../exportar-saude';
import { guardarPDF } from '../guardar-ficheiro';

/**
 * A ficha de emergência de uma criança: alergias, medicação em curso, médico,
 * contactos — e «Exportar em PDF para a escola».
 *
 * ── O que se pediu ───────────────────────────────────────────────────────────
 *
 * 12/09/2026, a sétima das dez funcionalidades. Só as alergias são dado novo;
 * a medicação vem das receitas em curso, o médico das consultas, os contactos
 * dos adultos da casa. O PDF sai pelo mesmo caminho da ficha de saúde.
 *
 * ⚠ Quem vê é quem vê a ficha (INVARIANTE #3): a loja devolve `null` a quem
 * não pode, e esta folha diz-o em vez de mostrar uma ficha vazia.
 */
export default function FichaEmergencia({ t, member, user, onClose }) {
  const { fichaDeEmergencia, criarAlergia, apagarAlergia, nomeDaCasa, deNome } = useStore();
  const [form, setForm] = useState({ nome: '', gravidade: 'moderada', nota: '' });
  const [erro, setErro] = useState(null);
  const [feito, setFeito] = useState(null);
  const [aGuardar, setAGuardar] = useState(false);

  const ficha = fichaDeEmergencia(member, user);

  const tomDaGravidade = (g) => (g === 'grave'
    ? { fg: t.state.errTexto, bg: t.state.errBg, border: t.state.err }
    : g === 'leve'
      ? { fg: t.state.infoDeep, bg: t.state.infoBg, border: t.state.info }
      : { fg: t.state.warnDeep, bg: t.state.warnBg, border: t.state.warn });
  const rotulo = (g) => (GRAVIDADES.find(x => x.chave === g) || GRAVIDADES[1]).rotulo;

  const acrescentar = () => {
    const r = criarAlergia(member, user, form);
    if (typeof r === 'string') { setErro(r); return; }
    setErro(null); setFeito(null);
    setForm({ nome: '', gravidade: 'moderada', nota: '' });
  };

  const exportar = async () => {
    setAGuardar(true); setErro(null); setFeito(null);
    const html = documentoDeEmergencia({ membro: member, casa: nomeDaCasa, ficha, hoje: TODAY_KEY, quemImprime: user, t });
    const r = await guardarPDF(nomeDoFicheiroDeEmergencia({ membro: member, dia: TODAY_KEY }), html);
    setAGuardar(false);
    if (!r.ok) { setErro(r.motivo); return; }
    if (!r.cancelado) setFeito(r.onde ? `PDF pronto — ${r.onde}` : 'PDF pronto.');
  };

  // `campo`, com os 44 px — o nome que o guarda `todo-campo-tem-44` reconhece.
  const campo = {
    minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body, fontSize: 15,
    color: t.text2, borderRadius: R.row, borderWidth: 1, borderColor: t.border, backgroundColor: t.card,
  };

  return (
    <Sheet t={t} title="Ficha de Emergência" sub={`${deNome(member)} ${member} · casa ${nomeDaCasa}`}
      onClose={onClose}
      action={ficha ? (
        // ⚠ ACENTO, como o «Guardar como PDF» da ficha de saúde: tira dados
        // clínicos de um menor de dentro da app e põe-nos num ficheiro que a
        // app deixa de governar. Não se desfaz.
        <Primary t={t} icon="printer"
          label={aGuardar ? 'A preparar…' : 'Exportar em PDF para a escola'}
          sub="As quatro secções, numa página"
          disabled={aGuardar} onPress={exportar} />
      ) : null}>
      {!ficha ? (
        <Tile t={t} kind="err" icon="lock">Não pode ver a ficha desta pessoa.</Tile>
      ) : (
        <View style={{ gap: S.lg }}>
          {/* ── Alergias ───────────────────────────────────────────────── */}
          <View style={{ gap: S.sm }}>
            <Label t={t}>Alergias</Label>
            {ficha.alergias.length === 0 ? (
              <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, color: t.text3 }}>Nenhuma alergia conhecida.</Text>
            ) : ficha.alergias.map(a => (
              <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 44 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>{a.nome}</Text>
                  {a.nota ? <Text numberOfLines={2} style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>{a.nota}</Text> : null}
                </View>
                <Pill label={rotulo(a.gravidade).toLowerCase()} {...tomDaGravidade(a.gravidade)} />
                <Pressable onPress={() => setErro(apagarAlergia(member, user, a.id))}
                  accessibilityRole="button" accessibilityLabel={`Tirar a alergia ${a.nome}`}
                  style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="trash" size={18} color={t.state.err} />
                </Pressable>
              </View>
            ))}
            <TextInput accessibilityLabel="Alergia a" value={form.nome}
              onChangeText={(v) => { setErro(null); setForm(f => ({ ...f, nome: v })); }}
              placeholder="Ex: Amendoim, penicilina, picada de abelha" placeholderTextColor={t.text3}
              maxLength={60} style={campo} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
              {GRAVIDADES.map(g => (
                <Choice key={g.chave} t={t} label={g.rotulo} selected={form.gravidade === g.chave}
                  onPress={() => setForm(f => ({ ...f, gravidade: g.chave }))} />
              ))}
            </View>
            <TextInput accessibilityLabel="Nota sobre a alergia" value={form.nota}
              onChangeText={(v) => setForm(f => ({ ...f, nota: v }))}
              placeholder="O que fazer, onde está a caneta de adrenalina… (opcional)" placeholderTextColor={t.text3}
              maxLength={300} style={campo} />
            <BotaoCompacto t={t} tom="comum" label="Acrescentar alergia" etiqueta="Acrescentar a alergia à ficha"
              disabled={!form.nome.trim()} onPress={acrescentar} />
          </View>

          {/* ── Medicação atual ─────────────────────────────────────────── */}
          <View style={{ gap: S.sm }}>
            <Label t={t}>Medicação atual</Label>
            {ficha.medicacao.length === 0 ? (
              <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, color: t.text3 }}>Sem medicação em curso. Vem das receitas com plano de tomas.</Text>
            ) : ficha.medicacao.map(m => (
              <View key={m.id} style={{ gap: 2, minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>{`${m.nome}${m.dose ? ` · ${m.dose}` : ''}`}</Text>
                <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
                  {[m.plano, m.ate ? `até ${dmyDeChave(m.ate)}` : null].filter(Boolean).join(' · ') || 'receita válida'}
                </Text>
              </View>
            ))}
          </View>

          {/* ── Médico ─────────────────────────────────────────────────── */}
          <View style={{ gap: S.sm }}>
            <Label t={t}>Médico</Label>
            {ficha.medicos.length === 0 ? (
              <Text style={{ fontFamily: FONT.ui, fontSize: 12.5, color: t.text3 }}>Sem médico registado. Vem do campo «médico» das consultas.</Text>
            ) : ficha.medicos.map(m => (
              <Text key={m} style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1, minHeight: 28 }}>{m}</Text>
            ))}
          </View>

          {/* ── Contactos ──────────────────────────────────────────────── */}
          <View style={{ gap: S.sm }}>
            <Label t={t}>Contactos</Label>
            {ficha.contactos.map(c => (
              <Text key={c.nome} style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1, minHeight: 28 }}>
                {`${c.nome}${c.email ? ` · ${c.email}` : ''}`}
              </Text>
            ))}
          </View>

          <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
            O PDF fica no dispositivo, para entregar em mão. A aplicação não o envia a
            lado nenhum sozinha. Contém dados de saúde de um menor.
          </Text>

          {erro ? <Tile t={t} kind="warn">{erro}</Tile> : null}
          {feito ? <Tile t={t} kind="info" icon="checkCircle">{feito}</Tile> : null}
        </View>
      )}
    </Sheet>
  );
}
