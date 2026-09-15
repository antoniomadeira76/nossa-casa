import React, { useState } from 'react';
import { View, Text, Pressable, Image, TextInput } from 'react-native';
import CampoData from '../CampoData';
import * as ImagePicker from 'expo-image-picker';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { plural, warrantyDaysLeft, chaveDeDMY, dmyDeChave, TODAY_KEY } from '../format';
import { Label, Primary, Choice, NumField } from '../ui';
import Icon from '../Icon';
import Sheet from '../Sheet';
import Confirm from '../Confirm';
import { documentoDaFatura, nomeDoFicheiroDaFatura } from '../exportar-equipamento';
import { lerComoDataURI } from '../ler-imagem';
import { guardarPDF } from '../guardar-ficheiro';
import { CATEGORIAS_DE_EQUIPAMENTO } from '../categorias-de-equipamento';

// Estado da garantia: a mesma regra de três estados da lista, para a ficha e a
// lista nunca discordarem.
const estado = (t, dias, fim) => {
  if (dias <= 0) return { titulo: 'Fora de Garantia', tom: t.state.errTexto,
    cor: t.state.err, fundo: t.tileErr,
    linha: `Terminou há ${plural(Math.abs(dias), 'dia', 'dias')}${fim ? ` · terminou a ${fim}.` : '.'}` };
  if (dias <= 90) return { titulo: 'Garantia a Expirar', tom: t.state.warnDeep,
    cor: t.state.warn, fundo: t.tileWarn,
    linha: `Faltam ${plural(dias, 'dia', 'dias')}${fim ? ` · termina a ${fim}.` : '.'}` };
  return { titulo: 'Em Garantia', tom: t.state.okTexto,
    cor: t.state.okBorder, fundo: t.state.okBg,
    linha: `Faltam ${plural(dias, 'dia', 'dias')}${fim ? ` · termina a ${fim}.` : '.'}` };
};

// Os dois anexos que um equipamento leva. `campo` é onde a imagem fica guardada.
const ANEXOS = [
  { campo: 'fatura', icone: 'fileDone', titulo: 'Fatura de compra' },
  { campo: 'foto',   icone: 'camera',   titulo: 'Equipamento e n.º de série' },
];

export default function FichaEquipamento({ t, equip, user = null, onClose }) {
  const { editEquip, removeEquip, nomeDaCasa } = useStore();
  const [remover, setRemover] = useState(false);
  const [manut, setManut] = useState(null);   // rascunho da manutenção
  // A exportação da fatura: `null` parada, `'a preparar'`, ou a frase do fim.
  const [exportacao, setExportacao] = useState(null);
  // O que se altera (15/09/2026 — «quando se faz editar, o título não tem
  // opção de alterar»): o nome, a categoria, o preço, a data de compra e o fim
  // da garantia, como a ficha do contrato. Um rascunho, e vai de uma vez no
  // «Guardar alterações»; as fotografias e a manutenção continuam a ir por
  // si — duas escritas à mesma linha no mesmo tique é a classe 27.
  const [form, setForm] = useState({
    name: equip.name || '', cat: equip.cat || CATEGORIAS_DE_EQUIPAMENTO[0],
    price: typeof equip.price === 'number' ? equip.price : null,
    bought: equip.bought || '', warrantyEnd: equip.warrantyEnd || '',
  });
  const precoAntes = typeof equip.price === 'number' ? equip.price : null;
  const mudou = form.name.trim() !== (equip.name || '')
    || form.cat !== (equip.cat || CATEGORIAS_DE_EQUIPAMENTO[0])
    || (form.price ?? null) !== precoAntes
    || form.bought !== (equip.bought || '')
    || form.warrantyEnd !== (equip.warrantyEnd || '');
  const guardar = () => {
    if (!form.name.trim() || !mudou) return;
    editEquip(equip.id, {
      name: form.name.trim(), cat: form.cat,
      price: form.price ?? 0,
      bought: form.bought, warrantyEnd: form.warrantyEnd,
    });
    onClose();
  };

  const dias = warrantyDaysLeft(equip);
  const e = estado(t, dias, equip.warrantyEnd);

  // ⚠ Era `onPress={() => {}}`: um botão que prometia e não fazia, com a
  // fatura fotografada mesmo ao lado (13/09/2026). Sai um PDF pelo molde da app,
  // com a imagem dentro — o mesmo caminho da ficha de saúde.
  const exportarFatura = async () => {
    if (!equip.fatura || exportacao === 'a preparar') return;
    setExportacao('a preparar');
    try {
      const imagem = await lerComoDataURI(equip.fatura);
      const html = documentoDaFatura({ equip, estado: e, imagem, casa: nomeDaCasa, hoje: TODAY_KEY, quemImprime: user, t });
      const r = await guardarPDF(nomeDoFicheiroDaFatura(equip, TODAY_KEY), html);
      if (!r.ok) setExportacao(r.motivo || 'Não foi possível exportar a fatura.');
      else if (r.cancelado) setExportacao(null);
      else setExportacao(r.onde ? `PDF pronto — ${r.onde}` : 'PDF pronto.');
    } catch (err) {
      setExportacao('Não foi possível exportar a fatura. Tente outra vez.');
    }
  };

  const escolherImagem = async (campo) => {
    const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!r.canceled && r.assets && r.assets[0]) editEquip(equip.id, { [campo]: r.assets[0].uri });
  };

  // Botão de ação: preenchido para a ação principal, contorno para as outras.
  const Acao = ({ label, icone, onPress, preenchido, perigo, desativado, porque, meio }) => {
    // ⚠ Dois tons, não um. O contorno e o ícone são objetos gráficos (3:1) e
    // levam a cor-base do estado ou o `titulo`; o RÓTULO é texto de 15 px e
    // leva o `xTexto` ou o `actFg` — «Remover equipamento» a #FF4D4F sobre a
    // folha dava 3,27, e o acento como texto dava 2,50 no escuro.
    const tomGrafico = perigo ? t.state.err : t.titulo;
    const tomTexto = perigo ? t.state.errTexto : t.actFg;
    return (
      <View style={{ gap: 4, ...(meio ? { flex: 1 } : {}) }}>
        <Pressable onPress={desativado ? undefined : onPress} accessibilityRole="button"
          accessibilityLabel={label} accessibilityState={{ disabled: !!desativado }}
          style={({ pressed }) => ({
            minHeight: 48, borderRadius: R.row, borderWidth: 1, paddingHorizontal: S.sm,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S.sm,
            // ⚠ `actBg`/`actBrd`, os tokens do botão comum — e não o `infoBg`,
            // que é um tijolo OPACO e claro nos dois aspetos: no escuro o
            // `actFg` (clareado) por cima dele dava 2,23 (09/09/2026). O
            // `actFg` só é garantido sobre o `actBg`.
            backgroundColor: desativado ? t.subtle : preenchido ? t.actBg : t.surface,
            borderColor: desativado ? t.border : preenchido ? t.actBrd : tomGrafico,
            opacity: pressed ? 0.85 : 1,
          })}>
          <Icon name={icone} size={20} color={desativado ? t.text3 : tomGrafico} />
          {/* Duas linhas no máximo: lado a lado, «Agendar manutenção» a 15 px
              não cabe em 170 e partia para fora do botão. */}
          <Text numberOfLines={2} style={{ fontFamily: FONT.display, fontSize: meio ? 14 : 15, fontWeight: '700',
            textAlign: 'center', flexShrink: 1, color: desativado ? t.text3 : tomTexto }}>{label}</Text>
        </Pressable>
        {desativado && porque ? (
          <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3, textAlign: 'center' }}>
            {porque}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <>
      <Sheet t={t} title={equip.name} sub={equip.cat} onClose={onClose}
        action={
          <View style={{ gap: S.md }}>
            {/* Lado a lado, como «Exportar» e «Marcar» na ficha de saúde — o
                dono da casa (13/09/2026): «botões lado a lado (agendar e
                exportar) em todos os ecrãs que tiverem estes dois». */}
            <View style={{ flexDirection: 'row', gap: S.md, alignItems: 'flex-start' }}>
              <Acao meio preenchido label="Agendar manutenção" icone="calendar"
                onPress={() => setManut({ maint: equip.maint || '', maintDate: equip.maintDate || '' })} />
              <Acao meio label={exportacao === 'a preparar' ? 'A preparar…' : 'Exportar fatura'} icone="printer"
                desativado={!equip.fatura || exportacao === 'a preparar'}
                porque={!equip.fatura ? 'Ainda não há fatura para exportar.' : null}
                onPress={exportarFatura} />
            </View>
            {exportacao && exportacao !== 'a preparar' ? (
              <Text style={{ fontFamily: FONT.ui, fontSize: 12, lineHeight: 18, textAlign: 'center',
                color: /^PDF pronto/.test(exportacao) ? t.state.okTexto : t.state.errTexto }}>{exportacao}</Text>
            ) : null}
            <Acao perigo label="Remover equipamento" icone="trash" onPress={() => setRemover(true)} />
          </View>
        }>

        {/* Garantia */}
        <View style={{ borderRadius: R.card, borderWidth: 1, borderColor: e.cor,
          backgroundColor: e.fundo, padding: 16, gap: S.sm }}>
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, fontWeight: '600', color: t.slate }}>
            Garantia
          </Text>
          <Text style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: '500', color: e.tom }}>
            {e.titulo}
          </Text>
          <Text style={{ fontFamily: FONT.ui, fontSize: 12, color: t.text3 }}>{e.linha}</Text>
        </View>

        {/* Fotografias */}
        <View>
          <Label t={t}>Fotografias</Label>
          <View style={{ gap: S.md, marginTop: S.sm }}>
            {ANEXOS.map(a => {
              const uri = equip[a.campo];
              return (
                <Pressable key={a.campo} onPress={() => escolherImagem(a.campo)}
                  accessibilityRole="button"
                  accessibilityLabel={`${uri ? 'Substituir' : 'Adicionar'} — ${a.titulo}`}
                  style={({ pressed }) => ({
                    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60,
                    // ⚠ `R.row`: é um tocável, e o canto de tudo o que se toca
                    // é 6. Estava a `R.card` e escapou ao guarda dos cantos
                    // porque o `=>` deste estilo em função tem um `>` que o
                    // guarda tomava pelo fim da etiqueta.
                    padding: 12, borderRadius: R.row, borderWidth: 1, borderColor: t.border,
                    backgroundColor: pressed ? t.subtle : t.card,
                  })}>
                  <View style={{ width: 40, height: 40, borderRadius: R.row, overflow: 'hidden',
                    backgroundColor: t.subtle, borderWidth: 1, borderColor: t.border,
                    alignItems: 'center', justifyContent: 'center' }}>
                    {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
                         : <Icon name={a.icone} size={20} color={t.text3} />}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>{a.titulo}</Text>
                    {/* «Só neste aparelho» enquanto não subiu ao servidor — a
                        verdade sobre onde a fotografia está, como o «só aqui»
                        do documento do contrato. */}
                    <Text style={{ fontFamily: FONT.ui, fontSize: 12,
                      color: uri && equip[`${a.campo}PorSubir`] ? t.state.warnTexto : t.text3 }}>
                      {uri ? (equip[`${a.campo}PorSubir`] ? 'Só neste aparelho · por subir' : 'Guardada') : 'Por adicionar'}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: FONT.ui, fontSize: 13, fontWeight: '600', color: t.actFg }}>
                    {uri ? 'Substituir' : 'Adicionar'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Alterar ──────────────────────────────────────────────────────
            Era um cartão só de leitura com o preço e a data de compra; agora
            são os campos da folha de registar, preenchidos com o que está. A
            loja fica de fora de propósito, como estava. */}
        <View style={{ gap: S.sm }}>
          <Label t={t}>Nome</Label>
          <TextInput accessibilityLabel="Nome do equipamento"
            value={form.name}
            onChangeText={(v) => setForm(f => ({ ...f, name: v }))}
            placeholder="Ex: Frigorífico LG"
            placeholderTextColor={t.text3}
            maxLength={60}
            style={{ minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body, fontSize: 15,
              color: t.text2, borderRadius: R.row, borderWidth: 1, borderColor: t.border,
              backgroundColor: t.card }} />
        </View>

        <View style={{ gap: S.sm }}>
          <Label t={t}>Categoria</Label>
          <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
            {CATEGORIAS_DE_EQUIPAMENTO.map(c => (
              <Choice key={c} t={t} label={c} selected={form.cat === c}
                onPress={() => setForm(f => ({ ...f, cat: c }))} />
            ))}
          </View>
        </View>

        <View style={{ gap: S.sm }}>
          <Label t={t}>Preço de compra</Label>
          {/* O campo de número da app: «−» e «+» de 10 €; vazio é «não se sabe». */}
          <NumField t={t} vazio value={form.price} step={10} min={0} max={99999}
            rotulo="Preço de compra em euros" placeholder="0,00 €"
            onChange={(v) => setForm(f => ({ ...f, price: v }))} />
        </View>

        <View style={{ gap: S.sm }}>
          <Label t={t}>Data de compra</Label>
          {/* Uma compra não é no futuro. */}
          <CampoData t={t} valor={chaveDeDMY(form.bought)} maximo={TODAY_KEY}
            onChange={(k) => setForm(f => ({ ...f, bought: k ? dmyDeChave(k) : '' }))} />
        </View>

        <View style={{ gap: S.sm }}>
          <Label t={t}>Fim da garantia</Label>
          <CampoData t={t} valor={chaveDeDMY(form.warrantyEnd)}
            onChange={(k) => setForm(f => ({ ...f, warrantyEnd: k ? dmyDeChave(k) : '' }))} />
        </View>

        <Primary comum t={t} label="Guardar alterações"
          sub={!form.name.trim() ? 'Escreva o nome do equipamento' : !mudou ? 'Nada mudou' : 'A ficha fica como escreveu'}
          disabled={!form.name.trim() || !mudou} onPress={guardar} />

        {/* Manutenção marcada, se houver */}
        {equip.maint ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="refresh" size={20} color={t.slate} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>{equip.maint}</Text>
              {equip.maintDate ? (
                <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
                  a fazer até {equip.maintDate}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}
      </Sheet>

      {/* Agendar manutenção */}
      {manut ? (
        <Sheet t={t} title="Agendar Manutenção" sub={equip.name} onClose={() => setManut(null)}
          action={<Primary t={t} comum label="Guardar" disabled={!manut.maint.trim()}
            onPress={() => { editEquip(equip.id, manut); setManut(null); }} />}>
          <View style={{ gap: S.sm }}>
            <Label t={t}>O que é preciso fazer</Label>
            <TextInput accessibilityLabel="O que é preciso fazer" value={manut.maint}
              onChangeText={(v) => setManut(m => ({ ...m, maint: v }))}
              placeholder="Ex: Revisão anual obrigatória" placeholderTextColor={t.text3}
              style={{ minHeight: 44, paddingHorizontal: S.md, fontFamily: FONT.body, fontSize: 15,
                color: t.text2, borderRadius: R.row, borderWidth: 1, borderColor: t.border,
                backgroundColor: t.card }} />
          </View>
          <View style={{ gap: S.sm }}>
            <Label t={t}>A fazer até</Label>
            {/* Uma manutenção é no futuro. */}
            <CampoData t={t} valor={chaveDeDMY(manut.maintDate)} minimo={TODAY_KEY}
              onChange={(k) => setManut(m => ({ ...m, maintDate: dmyDeChave(k) }))} />
          </View>
        </Sheet>
      ) : null}

      {/* Remover — não se desfaz, portanto confirma-se */}
      {remover ? (
        <Confirm t={t} destructive icon="trash"
          title="Remover equipamento?"
          message={`${equip.name} sai da lista, e com ele a garantia e a manutenção que lhe estão marcadas.`}
          confirmLabel="Remover"
          onCancel={() => setRemover(false)}
          onConfirm={() => { removeEquip(equip.id); setRemover(false); onClose(); }} />
      ) : null}
    </>
  );
}
