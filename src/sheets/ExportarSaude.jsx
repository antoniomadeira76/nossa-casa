import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { plural, TODAY_KEY } from '../format';
import { Label, Primary, Choice, Tile } from '../ui';
import Sheet from '../Sheet';
import {
  AMBITOS, resumoDoAmbito, documentoDeSaude, nomeDoFicheiro,
} from '../exportar-saude';
import { guardarHTML } from '../guardar-ficheiro';

// A folha do âmbito.
//
// Abre-se de dois sítios, com o âmbito já escolhido: o ícone de uma consulta
// abre em «só esta», o botão do topo abre em «ficha completa». Em ambos se pode
// mudar aqui dentro — é a mesma folha, e o que muda é onde ela começa.
//
// O que este ecrã tem de fazer, e que um botão de exportar sozinho não faz:
// dizer o que vai sair ANTES de sair. Uma exportação clínica que a pessoa só
// percebe depois de abrir o ficheiro é uma exportação que já saiu.
export default function ExportarSaude({
  t, membro, casa, consultas, docs, notas, ambitoInicial = 'tudo', alvoInicial = null, onClose,
}) {
  const { deNome } = useStore();
  const [ambito, setAmbito] = useState(ambitoInicial);
  const [alvo, setAlvo] = useState(alvoInicial);
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState(null);
  const [feito, setFeito] = useState(null);

  // As especialidades que esta ficha tem — não a lista de especialidades da
  // casa. Oferecer «Cardiologia» a quem nunca lá foi é oferecer um ficheiro
  // vazio.
  const especialidades = [...new Set(consultas.map(h => h.specialty))].sort();
  const aConsulta = consultas.find(h => h.id === alvoInicial);

  // Ao trocar de âmbito, o alvo tem de o acompanhar: ficar com o id de uma
  // consulta selecionado enquanto se pede «por especialidade» dava uma lista
  // vazia sem explicação nenhuma.
  const escolher = (novo) => {
    setErro(null); setFeito(null);
    setAmbito(novo);
    setAlvo(novo === 'consulta' ? alvoInicial
      : novo === 'especialidade' ? (especialidades[0] || null)
      : null);
  };

  const resumo = resumoDoAmbito(consultas, docs, ambito, alvo);
  const nada = resumo.consultas === 0;

  const guardar = async () => {
    setAGuardar(true); setErro(null); setFeito(null);
    const html = documentoDeSaude({
      membro, casa, consultas, docs, notas, ambito, alvo, hoje: TODAY_KEY,
    });
    const nome = nomeDoFicheiro({ membro, ambito, alvo, dia: TODAY_KEY });
    const r = await guardarHTML(nome, html);
    setAGuardar(false);
    if (!r.ok) { setErro(r.motivo); return; }
    if (r.cancelado) return;              // fechou o seletor; não é erro nem feito
    setFeito(nome);
  };

  return (
    <Sheet t={t} title="Exportar" sub={`Ficha ${deNome(membro)} ${membro} · casa ${casa}`}
      onClose={onClose}
      action={
        <Primary t={t} icon="printer"
          label={aGuardar ? 'A guardar…' : 'Guardar ficheiro'}
          disabled={aGuardar || nada}
          onPress={guardar} />
      }>
      <View style={{ gap: S.lg }}>
        <View style={{ gap: S.md }}>
          <Label t={t}>O que exportar</Label>
          <View style={{ gap: S.md }}>
            {[
              ['consulta', aConsulta ? `Só a consulta de ${aConsulta.specialty}` : AMBITOS.consulta.rotulo, !!aConsulta],
              ['especialidade', AMBITOS.especialidade.rotulo, especialidades.length > 0],
              ['tudo', AMBITOS.tudo.rotulo, true],
            ].map(([chave, rotulo, pode]) => (
              <View key={chave} style={{ opacity: pode ? 1 : 0.4 }}>
                <Choice t={t} label={rotulo} selected={ambito === chave}
                  onPress={() => { if (pode) escolher(chave); }} />
              </View>
            ))}
          </View>
        </View>

        {ambito === 'especialidade' ? (
          <View style={{ gap: S.md }}>
            <Label t={t}>Qual</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }}>
              {especialidades.map(e => (
                <Choice key={e} t={t} label={e} selected={alvo === e}
                  onPress={() => { setAlvo(e); setErro(null); setFeito(null); }} />
              ))}
            </View>
          </View>
        ) : null}

        {/* O que vai sair, em números, antes de sair. */}
        <View style={{ backgroundColor: t.subtle, borderWidth: 1, borderColor: t.border,
          borderRadius: R.card, padding: 14, gap: 4 }}>
          <Text style={{ fontFamily: FONT.body, fontSize: 15, color: t.text1 }}>
            {nada ? 'Nada a exportar neste âmbito.'
              : plural(resumo.consultas, 'consulta', 'consultas')}
          </Text>
          <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
            {nada ? 'Escolha outro âmbito.'
              : resumo.anexos
                ? `${plural(resumo.anexos, 'documento do arquivo é nomeado', 'documentos do arquivo são nomeados')}, mas ${resumo.anexos === 1 ? 'o ficheiro fica' : 'os ficheiros ficam'} na aplicação.`
                : 'Sem documentos de arquivo neste âmbito.'}
          </Text>
        </View>

        {/* Onde é que isto vai parar, dito antes de acontecer. É a única porta
            por onde dados de saúde saem da app, e quem a usa merece sabê-lo
            sem ter de deduzir. */}
        <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
          O ficheiro é guardado no dispositivo, em formato para imprimir ou
          gravar como PDF. Não é enviado para lado nenhum — leva dados de saúde,
          e trata-se com o mesmo cuidado que o papel.
        </Text>

        {erro ? <Tile t={t} kind="warn">{erro}</Tile> : null}
        {feito ? <Tile t={t} kind="info" icon="checkCircle">{`Guardado como ${feito}.`}</Tile> : null}
      </View>
    </Sheet>
  );
}
