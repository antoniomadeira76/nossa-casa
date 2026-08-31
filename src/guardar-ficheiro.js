// Fazer sair um documento da app: guardá-lo em PDF, ou entregá-lo ao correio.
//
// Está sozinho num ficheiro porque é a única parte de toda a exportação que
// depende da plataforma. Tudo o que decide o que vai lá dentro é puro e está
// em `exportar-saude.js`, provado contra o texto que produz.
//
// ── Nunca envia nada ────────────────────────────────────────────────────────
//
// `enviarPorCorreio` ABRE a aplicação de correio com a mensagem preenchida e o
// PDF anexado. Quem carrega em enviar é a pessoa, na aplicação dela. Esta app
// não tem servidor de correio, não guarda destinatários, e não põe nada em
// trânsito por iniciativa própria — e com uma ficha clínica de uma criança é
// assim que tem de ser.
//
// ── Duas plataformas, dois caminhos, e não por preferência ──────────────────
//
// No telemóvel o `expo-print` faz um PDF a sério a partir do HTML. Na web faz
// `window.print()` da página ATUAL e ignora o HTML que se lhe passa — li o
// código do módulo antes de escrever isto. Portanto na web abre-se uma janela
// com o documento e chama-se a impressão dela, que é como um navegador grava
// PDF. O ficheiro fica onde a pessoa o mandar gravar.

import { Platform } from 'react-native';

// Devolvem sempre `{ ok, motivo }`. Nunca rebentam: quem chama está num toque
// de botão e precisa de uma frase para mostrar, não de uma exceção.

// ── PDF ──────────────────────────────────────────────────────────────────────

export async function guardarPDF(nome, html) {
  return Platform.OS === 'web' ? pdfNaWeb(nome, html) : pdfNoTelemovel(nome, html);
}

function pdfNaWeb(nome, html) {
  try {
    const janela = window.open('', '_blank');
    if (!janela) {
      return { ok: false, motivo: 'O navegador bloqueou a janela de impressão. '
        + 'Permita janelas para este endereço e tente outra vez.' };
    }
    janela.document.write(html);
    janela.document.title = nome.replace(/\.[^.]+$/, '');   // o nome sugerido no diálogo
    janela.document.close();
    // Sem a espera, o diálogo abre antes de os estilos aplicarem e sai um
    // documento sem formatação nenhuma.
    janela.onload = () => { janela.focus(); janela.print(); };
    setTimeout(() => { try { janela.focus(); janela.print(); } catch (e) {} }, 400);
    return { ok: true, onde: 'no diálogo de impressão, escolha «Guardar como PDF».' };
  } catch (e) {
    return { ok: false, motivo: 'Não foi possível abrir a impressão neste navegador.' };
  }
}

// Faz o PDF e devolve onde ele ficou. Não o entrega a ninguém — quem decide
// isso é quem chamou.
async function fazerPDF(nome, html) {
  const Print = await import('expo-print');
  const { uri } = await Print.printToFileAsync({ html });
  // O `printToFileAsync` devolve um nome aleatório na cache. Um ficheiro
  // clínico chamado `a3f9c1.pdf` numa lista de anexos não diz a ninguém de
  // quem é, e é exatamente aí que se anexa o errado.
  try {
    const { File, Paths } = await import('expo-file-system');
    const bom = new File(Paths.cache, nome);
    if (bom.exists) bom.delete();
    // `move` é assíncrono na definição nativa — `delete` e `exists` não são.
    // Fui confirmar ao módulo em vez de assumir que a API era toda igual.
    await new File(uri).move(bom);
    return bom.uri;
  } catch (e) {
    return uri;              // com o nome feio, mas com o conteúdo certo
  }
}

async function pdfNoTelemovel(nome, html) {
  let uri;
  try {
    uri = await fazerPDF(nome, html);
  } catch (e) {
    return { ok: false, motivo: 'Não foi possível criar o PDF neste dispositivo.' };
  }
  try {
    const partilha = await import('expo-sharing');
    if (!(await partilha.isAvailableAsync())) {
      return { ok: false,
        motivo: 'O PDF foi criado, mas este dispositivo não tem como o abrir ou guardar.' };
    }
    await partilha.shareAsync(uri, {
      mimeType: 'application/pdf', UTI: 'com.adobe.pdf',
      dialogTitle: 'Guardar a ficha de saúde',
    });
    return { ok: true, onde: 'onde escolheu guardar.' };
  } catch (e) {
    // Fechar o seletor sem escolher nada cai aqui, e não é um erro: é uma
    // pessoa a mudar de ideias.
    return { ok: true, cancelado: true };
  }
}

// ── Correio ──────────────────────────────────────────────────────────────────

export async function enviarPorCorreio({ nome, html, para, assunto, corpo }) {
  if (Platform.OS === 'web') {
    // Um `mailto:` não leva anexos — é uma limitação do protocolo, não desta
    // app. Abrir o correio com a mensagem pronta e o ficheiro em falta era
    // convidar a enviar uma ficha vazia a pensar que ia lá dentro.
    return { ok: false,
      motivo: 'Enviar com o ficheiro anexado só funciona na aplicação do telemóvel. '
        + 'Aqui, guarde o PDF e anexe-o à mensagem.' };
  }

  let uri;
  try {
    uri = await fazerPDF(nome, html);
  } catch (e) {
    return { ok: false, motivo: 'Não foi possível criar o PDF para enviar.' };
  }

  try {
    const correio = await import('expo-mail-composer');
    if (!(await correio.isAvailableAsync())) {
      return { ok: false,
        motivo: 'Este dispositivo não tem uma aplicação de correio configurada.' };
    }
    // Abre a aplicação de correio com tudo pronto. Enviar é um gesto da
    // pessoa, na aplicação dela — esta app não põe nada em trânsito.
    const r = await correio.composeAsync({
      recipients: para, subject: assunto, body: corpo, attachments: [uri],
    });
    return { ok: true, estado: r && r.status };
  } catch (e) {
    return { ok: false, motivo: 'Não foi possível abrir a aplicação de correio.' };
  }
}
