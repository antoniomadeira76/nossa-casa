import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useStore } from '../store';
import { S, FONT } from '../theme';
import { Label, Choice, Primary, Tile, Empty } from '../ui';
import Sheet from '../Sheet';

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
        <View style={{ gap: S.sm }}>
          <Label t={t}>A minha tarefa</Label>
          {minhas.length > 0 ? (
            <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
              {minhas.map(x => (
                <Choice key={x.id} t={t} label={x.title} selected={minha === x.id}
                  onPress={() => { setErro(null); setMinha(x.id); }} />
              ))}
            </View>
          ) : (
            <Empty t={t} icon="checkSquare" title="Não tem tarefas por fazer para trocar hoje."
              hint="Uma troca precisa de uma tarefa sua ainda por fazer." />
          )}
        </View>

        <View style={{ gap: S.sm }}>
          <Label t={t}>{irmaos.length === 1 ? `Pela tarefa ${deNome(irmaos[0])} ${irmaos[0]}` : 'Pela tarefa de um irmão'}</Label>
          {deles.length > 0 ? (
            <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
              {deles.map(x => (
                <Choice key={x.id} t={t} label={irmaos.length > 1 ? `${x.title} · ${x.who}` : x.title}
                  selected={dele === x.id} onPress={() => { setErro(null); setDele(x.id); }} />
              ))}
            </View>
          ) : (
            <Empty t={t} icon="checkSquare" title="Nenhum irmão tem tarefas por fazer hoje."
              hint="Quando um irmão tiver uma tarefa por fazer, aparece aqui para trocar." />
          )}
        </View>

        <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
          A troca vale só para hoje: amanhã cada tarefa volta a quem era. Quem recebe a proposta
          aceita ou recusa, e os pontos são de quem faz a tarefa.
        </Text>
        {erro ? <Tile t={t} kind="warn">{erro}</Tile> : null}
      </View>
    </Sheet>
  );
}
