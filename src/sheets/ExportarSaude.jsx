import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useStore } from '../store';
import { S, R, FONT } from '../theme';
import { plural, TODAY_KEY } from '../format';
import { Label, Primary, Choice, Opcao, EscolherMembro, Tile } from '../ui';
import Sheet from '../Sheet';
import Icon from '../Icon';
import {
  AMBITOS, resumoDoAmbito, documentoDeSaude, nomeDoFicheiro,
} from '../exportar-saude';
import { guardarPDF, enviarPorCorreio } from '../guardar-ficheiro';

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
  t, membro, casa, user, consultas, docs, notas,
  ambitoInicial = 'tudo', alvoInicial = null, onClose,
}) {
  const { deNome, aoNome, adultos, membros: MEMBROS } = useStore();
  const [ambito, setAmbito] = useState(ambitoInicial);
  const [alvo, setAlvo] = useState(alvoInicial);
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState(null);
  const [feito, setFeito] = useState(null);
  // Para quem se pode enviar: os outros adultos da casa, e só esses.
  //
  // Não é uma caixa de texto de propósito. Uma ficha clínica de uma criança
  // não se manda para um endereço escrito à pressa, e um erro de escrita aqui
  // é irreversível — o correio já saiu. A lista vem do quadro da casa, e quem
  // não estiver lá não recebe.
  const destinatarios = adultos
    .filter(n => n !== user && MEMBROS[n]?.email)
    .map(n => ({ nome: n, email: MEMBROS[n].email }));
  const [para, setPara] = useState(null);

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

  const documento = () => ({
    html: documentoDeSaude({ membro, casa, consultas, docs, notas, ambito, alvo, hoje: TODAY_KEY }),
    nome: nomeDoFicheiro({ membro, ambito, alvo, dia: TODAY_KEY }),
  });

  const correr = async (accao) => {
    setAGuardar(true); setErro(null); setFeito(null);
    const r = await accao();
    setAGuardar(false);
    if (!r.ok) { setErro(r.motivo); return null; }
    return r;
  };

  const guardar = async () => {
    const { html, nome } = documento();
    const r = await correr(() => guardarPDF(nome, html));
    if (r && !r.cancelado) setFeito(r.onde ? `PDF pronto — ${r.onde}` : 'PDF pronto.');
  };

  const enviar = async () => {
    if (!para) return;
    const { html, nome } = documento();
    const r = await correr(() => enviarPorCorreio({
      nome, html, para: [para.email],
      assunto: `Ficha de saúde ${deNome(membro)} ${membro}`,
      // O corpo diz o que vai anexado e de que âmbito. Quem recebe abre o
      // correio semanas depois e tem de perceber o que aquilo é.
      corpo: `Segue em anexo ${ambito === 'tudo' ? 'a ficha de saúde completa'
        : ambito === 'especialidade' ? `o registo de ${alvo}`
        : 'o registo de uma consulta'} ${deNome(membro)} ${membro}, da casa ${casa}.`,
    }));
    if (r) setFeito(`Correio aberto para ${para.nome}. Falta carregar em enviar, na aplicação de correio.`);
  };

  return (
    <Sheet t={t} title="Exportar" sub={`Ficha ${deNome(membro)} ${membro} · casa ${casa}`}
      onClose={onClose}
      action={
        <View style={{ gap: S.md }}>
          <Primary t={t} icon="printer"
            label={aGuardar ? 'A preparar…' : 'Guardar como PDF'}
            disabled={aGuardar || nada}
            onPress={guardar} />
          {destinatarios.length ? (
            <Pressable onPress={enviar} disabled={aGuardar || nada || !para}
              accessibilityRole="button"
              accessibilityLabel={para ? `Enviar por correio a ${para.nome}` : 'Enviar por correio'}
              style={({ pressed }) => ({ minHeight: 48, borderRadius: R.pill, borderWidth: 1,
                borderColor: t.border, alignItems: 'center', justifyContent: 'center',
                flexDirection: 'row', gap: 8,
                opacity: (aGuardar || nada || !para) ? 0.45 : (pressed ? 0.7 : 1) })}>
              <Icon name="mail" size={18} color={t.text2} />
              <Text style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: '600', color: t.text2 }}>
                {para ? `Enviar ${aoNome(para.nome)}` : 'Escolha quem recebe'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      }>
      <View style={{ gap: S.lg }}>
        <View style={{ gap: S.md }}>
          <Label t={t}>O que exportar</Label>
          <View style={{ gap: S.md }}>
            {[
              ['consulta', 'Só esta consulta',
                aConsulta ? `${aConsulta.specialty} · ${aConsulta.doctor || 'sem médico indicado'}` : null,
                !!aConsulta],
              ['especialidade', 'Por especialidade',
                especialidades.length ? `${plural(especialidades.length, 'especialidade', 'especialidades')} nesta ficha` : null,
                especialidades.length > 0],
              ['tudo', 'Ficha completa',
                plural(consultas.length, 'consulta', 'consultas'), true],
            ].map(([chave, titulo, detalhe, pode]) => (
              <Opcao key={chave} t={t} titulo={titulo} detalhe={detalhe}
                selected={ambito === chave} disabled={!pode}
                onPress={() => escolher(chave)} />
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

        {destinatarios.length ? (
          <View style={{ gap: S.md }}>
            <Label t={t}>Enviar a</Label>
            {/* A mesma grelha das referências 18, 19 e 20 — dois por linha, com
                o ponto de cor de cada um. É como a app escolhe um membro em
                todo o lado; não havia razão para esta folha inventar outra. */}
            <EscolherMembro t={t} membros={destinatarios.map(d => d.nome)}
              valor={para && para.nome}
              onEscolher={(nome) => {
                setPara(p => (p && p.nome === nome ? null : destinatarios.find(d => d.nome === nome)));
                setErro(null); setFeito(null);
              }} />
            {para ? (
              <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, color: t.text3 }}>
                {para.email}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Onde é que isto vai parar, dito antes de acontecer. É a única porta
            por onde dados de saúde saem da app, e quem a usa merece sabê-lo
            sem ter de deduzir.
            Este texto dizia «não é enviado para lado nenhum». Deixou de ser
            verdade no momento em que o envio passou a existir, e um aviso de
            privacidade desatualizado é pior do que nenhum. */}
        <Text style={{ fontFamily: FONT.ui, fontSize: 11.5, lineHeight: 18, color: t.text3 }}>
          O PDF fica no dispositivo. A aplicação não envia nada sozinha: enviar
          abre o correio com a mensagem pronta, e o envio fica do seu lado. Só
          aparecem aqui os adultos desta casa — e o correio não vai cifrado,
          como um postal.
        </Text>

        {erro ? <Tile t={t} kind="warn">{erro}</Tile> : null}
        {feito ? <Tile t={t} kind="info" icon="checkCircle">{feito}</Tile> : null}
      </View>
    </Sheet>
  );
}
