import React, { useEffect, useState } from 'react';
import { View, Text, Platform, Share } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { Pill, Primary, BotaoCompacto, Tile, Linha } from '../ui';
import Sheet from '../Sheet';

/**
 * «Partilhar a lista» — um endereço só de leitura da lista de compras aberta,
 * válido uma hora, para quem não tem a app. (12/09/2026 — a nona das dez.)
 *
 * A folha pede o endereço ao abrir e mostra-o: quem o abre vê os rótulos e os
 * corredores, riscados os já comprados — sem prendas «só adultos», sem preços,
 * sem o nome de quem pediu. «Desfazer a partilha» apaga a linha no servidor e
 * o endereço morre na hora.
 *
 * ⚠ O endereço só serve onde o servidor for alcançável — hoje, em
 * `127.0.0.1`, só neste computador. A folha diz-o em vez de fingir.
 */
export default function PartilharLista({ t, user, onClose }) {
  const { partilharLista, desfazerPartilha } = useStore();
  const [partilha, setPartilha] = useState(null);
  const [erro, setErro] = useState(null);
  const [feito, setFeito] = useState(null);
  const [aPedir, setAPedir] = useState(true);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const r = await partilharLista(user);
      if (!vivo) return;
      setAPedir(false);
      if (r && r.erro) setErro(r.erro); else setPartilha(r);
    })();
    return () => { vivo = false; };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  const copiar = async () => {
    if (!partilha) return;
    setFeito(null); setErro(null);
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(partilha.url);
        setFeito('Endereço copiado. Cole-o numa mensagem.');
      } else {
        await Share.share({ message: partilha.url });
      }
    } catch (e) {
      setErro('Não foi possível copiar o endereço. Selecione-o e copie-o à mão.');
    }
  };

  const desfazer = async () => {
    const e = await desfazerPartilha(partilha && partilha.id);
    if (e) { setErro(e); return; }
    setPartilha(null); setFeito(null);
    setErro('A partilha foi desfeita. O endereço já não abre nada.');
  };

  const local = partilha && /^(https?:\/\/)?(127\.0\.0\.1|localhost)([:/]|$)/.test(partilha.url);

  return (
    <Sheet t={t} title="Partilhar a Lista" sub="Um endereço só de leitura, válido uma hora" onClose={onClose}
      action={partilha
        ? <Primary t={t} comum icon="share" label="Copiar o endereço" sub="Para colar numa mensagem" onPress={copiar} />
        : <Primary t={t} comum label="Fechar" onPress={onClose} />}>
      <View style={{ gap: S.lg }}>
        {aPedir ? (
          <Tile t={t} kind="info">A pedir o endereço ao servidor…</Tile>
        ) : partilha ? (
          <>
            <Linha t={t} last>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.xs }}>
                <Text style={{ flex: 1, fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>Endereço só de leitura</Text>
                <Pill label="1 hora" fg={t.state.warnDeep} bg={t.state.warnBg} border={t.state.warn} />
              </View>
            </Linha>
            <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: R.row, backgroundColor: t.card, padding: S.md }}>
              <Text selectable style={{ fontFamily: FONT.ui, fontSize: 13, color: t.text1 }}
                accessibilityLabel="O endereço da lista">{partilha.url}</Text>
            </View>
            <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
              Quem o abrir vê os rótulos e os corredores, riscados os já comprados. Sem prendas «só adultos»,
              sem preços, sem nomes. Nada se escreve por lá.
            </Text>
            {local ? (
              <Tile t={t} kind="warn">
                O servidor desta casa vive neste computador: o endereço só abre aqui. Para chegar a outro
                telemóvel, o servidor tem de estar na rede de casa — ou fora dela, e isso é uma decisão sua.
              </Tile>
            ) : null}
            <BotaoCompacto t={t} label="Desfazer a partilha" onPress={desfazer} />
          </>
        ) : null}
        {feito ? <Tile t={t} kind="info">{feito}</Tile> : null}
        {erro ? <Tile t={t} kind="warn">{erro}</Tile> : null}
      </View>
    </Sheet>
  );
}
