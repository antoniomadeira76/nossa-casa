import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useStore } from '../store';
import { S, FONT } from '../theme';
import { Primary, Tile } from '../ui';
import Sheet from '../Sheet';
import CampoDeEscolha from '../CampoDeEscolha';

// «Propor uma troca» — a criança escolhe uma tarefa sua e uma do irmão, só
// para hoje. (12/09/2026 — a oitava das dez funcionalidades.)
//
// As feitas, as «a confirmar» e as que já estão numa troca de hoje não
// aparecem: a loja é que decide o que se pode trocar (`tarefasParaTrocar`), e
// esta folha só mostra. A proposta vai pela loja, que a manda ao servidor com
// o nome de quem propõe — e é o servidor que garante que só quem tem a tarefa
// a oferece.
export default function ProporTroca({ t, kid, onClose }) {
  const { tarefasParaTrocar, proporTroca, aoNome, deNome } = useStore();
  const { minhas, deles } = tarefasParaTrocar(kid);
  const [minha, setMinha] = useState(minhas[0] ? minhas[0].id : null);
  const [dele, setDele] = useState(deles[0] ? deles[0].id : null);
  const [erro, setErro] = useState(null);
  const escolhida = deles.find(x => x.id === dele) || null;
  // Com um irmão só, o nome dele fica no título da lista; com dois, em cada
  // pastilha — senão duas «Regar as plantas» não se distinguiam.
  const irmaos = [...new Set(deles.map(x => x.who))];

  const propor = () => {
    const e = proporTroca(kid, minha, dele);
    if (e) { setErro(e); return; }
    onClose();
  };

  return (
    <Sheet t={t} title="Propor uma Troca" sub="Uma tarefa sua por uma do irmão · só para hoje" onClose={onClose}
      action={<Primary t={t} comum label={escolhida ? `Propor ${aoNome(escolhida.who)}` : 'Propor a troca'}
        disabled={!minha || !dele} onPress={propor} />}>
      <View style={{ gap: S.lg }}>
        {/* ── As duas tarefas ────────────────────────────────────────────────
            ⚠ Dois CAMPOS, e não duas filas de pastilhas (25/09/2026, opção B de
            `design/escolher-corredor.dc.html`). Esta folha era o pior caso da
            app inteira, e não por ter muitas opções: os rótulos são TÍTULOS DE
            TAREFA — «Arrumar a mochila da escola», «Máquina de roupa + estender»
            — e com dois irmãos ainda levavam « · Léo» colado. Uma pastilha com
            trinta caracteres não cabe nos 355 px úteis e parte sozinha, e eram
            duas filas destas empilhadas na mesma folha. O campo mostra o título
            inteiro numa linha e a lista abre com as tarefas por baixo umas das
            outras, que é a forma de um título se ler. */}
        <CampoDeEscolha t={t} grande rotulo="A minha tarefa" titulo="A minha tarefa"
          sub="A que quer dar a trocar, só por hoje"
          iconeDoCampo="checkSquare"
          valor={minha}
          opcoes={minhas.map(x => ({ valor: x.id, titulo: x.title }))}
          aoEscolher={(id) => { setErro(null); setMinha(id); }}
          porEscolher="Escolher a minha tarefa"
          vazio="Não tem tarefas por fazer para trocar hoje."
          dicaVazia="Uma troca precisa de uma tarefa sua ainda por fazer." />

        {/* Com um irmão só, o nome dele fica no título da lista; com dois, em
            cada linha — senão duas «Regar as plantas» não se distinguiam. */}
        <CampoDeEscolha t={t} grande
          rotulo={irmaos.length === 1 ? `Pela tarefa ${deNome(irmaos[0])} ${irmaos[0]}` : 'Pela tarefa de um irmão'}
          titulo="A tarefa do irmão"
          sub="A que quer receber em troca"
          iconeDoCampo="checkSquare"
          valor={dele}
          opcoes={deles.map(x => ({
            valor: x.id, titulo: x.title, sub: irmaos.length > 1 ? x.who : undefined,
          }))}
          aoEscolher={(id) => { setErro(null); setDele(id); }}
          porEscolher="Escolher a tarefa do irmão"
          vazio="Nenhum irmão tem tarefas por fazer hoje."
          dicaVazia="Quando um irmão tiver uma tarefa por fazer, aparece aqui para trocar." />

        <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
          A troca vale só para hoje: amanhã cada tarefa volta a quem era. Quem recebe a proposta
          aceita ou recusa, e os pontos são de quem faz a tarefa.
        </Text>
        {erro ? <Tile t={t} kind="warn">{erro}</Tile> : null}
      </View>
    </Sheet>
  );
}
