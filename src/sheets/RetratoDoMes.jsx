import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useStore } from '../store';
import { S, FONT } from '../theme';
import { SectionTitle, Linha, Pill, Primary, Empty, Tile } from '../ui';
import Sheet from '../Sheet';
import { EUR, plural, TODAY_KEY, dmyDeChave } from '../format';
import { documentoDoRetrato, nomeDoFicheiroDoRetrato } from '../retrato-do-mes';
import { guardarPDF } from '../guardar-ficheiro';

/**
 * O retrato de um mês — o gasto por envelope contra o limite, as tarefas e os
 * pontos por criança, as compras, as contas entre os adultos — e «Exportar em
 * PDF». (12/09/2026 — a décima das dez funcionalidades.)
 *
 * Nenhum número é escrito: tudo é soma das linhas do mês (`retrato-do-mes.js`).
 * Só adultos chegam aqui — é orçamento (INVARIANTE #3) —, e a app da criança
 * não tem porta para esta folha.
 */
export default function RetratoDoMes({ t, retrato, user, onClose }) {
  const { nomeDaCasa } = useStore();
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState(null);
  const [feito, setFeito] = useState(null);
  const r = retrato;

  const exportar = async () => {
    setAGuardar(true); setErro(null); setFeito(null);
    const html = documentoDoRetrato({ retrato: r, casa: nomeDaCasa, hoje: TODAY_KEY, quemImprime: user, t });
    const res = await guardarPDF(nomeDoFicheiroDoRetrato(r), html);
    setAGuardar(false);
    if (!res.ok) { setErro(res.motivo); return; }
    if (!res.cancelado) setFeito(res.onde ? `PDF pronto — ${res.onde}` : 'PDF pronto.');
  };

  const linhaDeTexto = (texto) => (
    <Linha t={t} last>
      <Text style={{ fontFamily: FONT.body, fontSize: 15, lineHeight: 21, color: t.text2, paddingHorizontal: S.xs }}>{texto}</Text>
    </Linha>
  );

  if (!r) {
    return (
      <Sheet t={t} title="Retrato do Mês" sub="Como correu o mês, em euros" onClose={onClose}>
        <Empty t={t} icon="fileText" title="Ainda não há um mês para retratar" hint="Abra um mês no Dinheiro." />
      </Sheet>
    );
  }

  return (
    <Sheet t={t} title={`Retrato de ${r.nome}`}
      sub={r.aberto ? 'Mês em curso · até hoje' : `Mês fechado${r.fechadoEm ? ` a ${dmyDeChave(r.fechadoEm)}` : ''}`}
      onClose={onClose}
      action={<Primary t={t} comum icon="printer" label={aGuardar ? 'A preparar…' : 'Exportar em PDF'}
        sub={`${EUR(r.gasto)} gastos de ${EUR(r.orcamento)}`} disabled={aGuardar} onPress={exportar} />}>
      <View style={{ gap: S.xl }}>
        <View>
          <SectionTitle t={t} right={<Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>{`${EUR(r.gasto)} de ${EUR(r.orcamento)}`}</Text>}>
            Dinheiro
          </SectionTitle>
          {r.envelopes.length > 0 ? r.envelopes.map((e, i) => (
            <Linha key={e.nome} t={t} last={i === r.envelopes.length - 1}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.xs }}>
                <Text numberOfLines={1} style={{ flex: 1, fontFamily: FONT.body, fontSize: 15, color: t.text2 }}>{e.nome}</Text>
                <Text style={{ fontFamily: FONT.ui, fontSize: 13, color: t.text3 }}>{`${EUR(e.gasto)} de ${EUR(e.limite)}`}</Text>
                {e.gasto > e.limite ? <Pill label="acima" fg={t.state.errTexto} bg={t.state.errBg} border={t.state.err} /> : null}
              </View>
            </Linha>
          )) : (
            <Empty t={t} icon="wallet" title="Sem despesas neste mês" />
          )}
        </View>

        <View>
          <SectionTitle t={t}>Tarefas</SectionTitle>
          {r.criancas.length > 0 ? r.criancas.map((c, i) => (
            <Linha key={c.nome} t={t} last={i === r.criancas.length - 1}>
              <Text style={{ fontFamily: FONT.body, fontSize: 15, lineHeight: 21, color: t.text2, paddingHorizontal: S.xs }}>
                {`${c.nome} · ${plural(c.feitas, 'tarefa feita', 'tarefas feitas')} · ${plural(c.pontos, 'ponto', 'pontos')}`}
              </Text>
            </Linha>
          )) : (
            <Empty t={t} icon="checkSquare" title="Sem crianças na casa" />
          )}
        </View>

        <View>
          <SectionTitle t={t}>Compras</SectionTitle>
          {linhaDeTexto(r.compras.idas
            ? `${plural(r.compras.idas, 'ida às compras', 'idas às compras')} · ${EUR(r.compras.total)}`
            : 'Sem idas às compras fechadas neste mês')}
        </View>

        <View>
          <SectionTitle t={t}>Contas entre Nós</SectionTitle>
          {linhaDeTexto(`${plural(r.meias || 0, 'despesa a meias', 'despesas a meias')} · ${plural(r.acertos.n, 'acerto', 'acertos')}${r.acertos.n ? ` · ${EUR(r.acertos.total)}` : ''}`)}
        </View>

        {erro ? <Tile t={t} kind="warn">{erro}</Tile> : null}
        {feito ? <Tile t={t} kind="info">{feito}</Tile> : null}
      </View>
    </Sheet>
  );
}
