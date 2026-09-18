import React, { useState } from 'react';
import { View, Text, Platform } from 'react-native';
import { S, FONT, R } from './theme';
import { Primary, Tile } from './ui';
import Sheet from './Sheet';
import { guardarPDF } from './guardar-ficheiro';

/**
 * A PRÉ-VISUALIZAÇÃO DE UM DOCUMENTO, ANTES DE ELE SAIR DA APP
 * ============================================================
 *
 * 17/09/2026: «quando se clica em Exportar PDF (toda a app) tem de apresentar
 * uma previsualização».
 *
 * Até aqui, carregar em «Exportar em PDF» ia directo ao diálogo de impressão do
 * navegador ou ao seletor de partilha do telemóvel — o documento só se via
 * depois de já estar a sair. Quem exporta uma ficha de saúde de uma criança ou
 * um extracto do dinheiro da casa tem de VER o que vai sair antes de o mandar
 * para fora, e é a última altura em que ainda se pode fechar a folha sem
 * consequências.
 *
 * ⚠ É UMA PORTA SÓ. Os quatro sítios que exportam — a ficha de saúde, a ficha
 * de emergência, a fatura do equipamento e o extracto do mês — passam todos por
 * aqui, e nenhum chama o `guardarPDF` directamente. O guarda que o impõe é
 * `__tests__/o-pdf-mostra-se-antes-de-sair.test.js`, e ENUMERA: uma exportação
 * nova fica coberta no dia em que nascer.
 *
 * ── Duas plataformas, duas pré-visualizações, e não por preferência ─────────
 *
 * Na WEB o documento é HTML e desenha-se numa moldura da própria página, à
 * escala do papel: vê-se a faixa do esquema, a marca de água e o carimbo, tal
 * como vão sair. É a mesma decisão do `guardar-ficheiro.js` — uma moldura na
 * página não é uma janela nova e o bloqueador não lhe toca.
 *
 * No TELEMÓVEL não há como desenhar HTML: esta app não tem `react-native-webview`
 * (são 21 dependências, e acrescentar uma para uma pré-visualização é caro).
 * Aí diz-se em letras o que o documento leva, e o visualizador do sistema —
 * que o `expo-print` abre a seguir — é que mostra as páginas. Não se finge uma
 * pré-visualização que não existe.
 */

// O papel tem 190 mm de largura útil (`documento.js`, `.pagina`). A moldura
// desenha-se a essa largura em pixels e encolhe-se com `transform` até caber na
// folha — assim o que se vê é a PROPORÇÃO do papel, e não um documento
// espremido com as linhas a partir noutros sítios.
const LARGURA_DO_PAPEL = 760;
const ALTURA_DA_MOLDURA = 2200;      // duas páginas, e a moldura rola por dentro
const ALTURA_DA_CAIXA = 430;

export default function PreVisualizarPDF({ t, nome, html, titulo, sub, acento, onFechar }) {
  const [largura, setLargura] = useState(0);
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState(null);
  const [feito, setFeito] = useState(null);

  const exportar = async () => {
    setAGuardar(true); setErro(null); setFeito(null);
    const res = await guardarPDF(nome, html);
    setAGuardar(false);
    if (!res.ok) { setErro(res.motivo); return; }
    if (!res.cancelado) setFeito(res.onde ? `PDF pronto — ${res.onde}` : 'PDF pronto.');
  };

  const escala = largura > 0 ? largura / LARGURA_DO_PAPEL : 0;

  // ── Porque é que isto são DOIS botões e não um com `comum={!acento}` ───────
  //
  // Porque `__tests__/o-acento-e-reservado.test.js` lê a árvore como texto e
  // decide pela PRESENÇA da palavra `comum` no bloco da etiqueta. Um
  // `comum={!acento}` tem lá a palavra, e o guarda dava por comum um botão que
  // às vezes leva o acento cheio — um buraco aberto de propósito no guarda que
  // diz quais são os botões com consequências. Duas linhas explícitas custam
  // menos do que isso, e é a classe de defeito 23 outra vez: um guarda de texto
  // casa por acidente enquanto o código for simples.
  //
  // O acento cheio é de quem tira dados clínicos de um menor para fora da app.
  // O extracto e a fatura do equipamento não o levam — saem dados da casa, que
  // não é a mesma coisa, e o botão que exporta não apaga nem move dinheiro.
  const rotulo = aGuardar ? 'A preparar…' : 'Exportar em PDF';
  const botao = acento
    ? <Primary t={t} icon="printer" label={rotulo} sub={nome} disabled={aGuardar} onPress={exportar} />
    : <Primary t={t} comum icon="printer" label={rotulo} sub={nome} disabled={aGuardar} onPress={exportar} />;

  return (
    <Sheet t={t} title={titulo || 'Pré-visualização'} sub={sub || nome} onClose={onFechar}
      action={botao}>
      <View style={{ gap: S.md }}>

        {Platform.OS === 'web' ? (
          <View onLayout={(ev) => setLargura(ev.nativeEvent.layout.width)}
            style={{ height: ALTURA_DA_CAIXA, borderRadius: R.card, borderWidth: 1,
              borderColor: t.divider, backgroundColor: t.subtle, overflow: 'hidden' }}>
            {escala > 0 ? React.createElement('iframe', {
              // ⚠ `sandbox=""` sem permissão nenhuma: o documento é nosso, não
              // tem guiões nem pede rede, e uma moldura sem privilégios não pode
              // mexer na app à volta. A pré-visualização não precisa de mais.
              sandbox: '',
              srcDoc: html,
              title: `Pré-visualização de ${nome}`,
              style: {
                width: LARGURA_DO_PAPEL,
                height: ALTURA_DA_MOLDURA,
                border: 0,
                backgroundColor: '#FFFFFF',
                transform: `scale(${escala})`,
                transformOrigin: 'top left',
              },
            }) : null}
          </View>
        ) : (
          <Tile t={t} kind="info" icon="printer">
            Neste telemóvel o documento abre no visualizador do sistema, onde se
            vêem as páginas antes de o guardar ou partilhar.
          </Tile>
        )}

        <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 17, color: t.text3 }}>
          {Platform.OS === 'web'
            ? 'É isto que vai sair. Role dentro da moldura para ver o resto.'
            : 'É isto que vai sair.'}
        </Text>

        {erro ? <Tile t={t} kind="warn">{erro}</Tile> : null}
        {feito ? <Tile t={t} kind="info">{feito}</Tile> : null}
      </View>
    </Sheet>
  );
}
