// Fazer sair um ficheiro da app.
//
// Está sozinho num ficheiro porque é a única parte de toda a exportação que
// depende da plataforma. Tudo o que decide o que vai lá dentro é puro e está
// em `exportar-saude.js`, provado contra o texto que produz.
//
// ── Guardar, não partilhar ──────────────────────────────────────────────────
//
// A folha de partilha do sistema põe a lista das aplicações instaladas à
// frente de quem acabou de exportar a ficha clínica de uma criança, e um toque
// distraído manda-a para qualquer uma delas. Guardar é um passo a mais, e é o
// passo que impede esse engano — quem quiser mesmo enviá-la envia-a depois, de
// propósito, a partir do ficheiro.
//
// No telemóvel isso tem um senão que não se pode ignorar: um ficheiro escrito
// na área privada da aplicação não aparece em lado nenhum que a pessoa saiba
// abrir. Guardá-lo e não o dizer seria pior do que não guardar. Por isso, aí,
// o ficheiro é escrito E entregue ao seletor do sistema — que no telemóvel é a
// única porta para «Ficheiros», e não uma lista de aplicações de mensagens
// disfarçada. Está pedido como `Guardar em…`, não como `Partilhar`.
//
// ── Duas plataformas, dois caminhos ─────────────────────────────────────────
//
// O `expo-file-system` avisa «not supported on web» e não faz nada — a versão
// web dele são classes vazias. Na web o caminho é um Blob e uma âncora, que é
// o descarregamento normal do navegador. As duas metades estão separadas por
// `Platform.OS` e não por tentativa e erro.

import { Platform } from 'react-native';

const TIPO = 'text/html';

// Devolve `{ ok, motivo }`. Nunca rebenta: quem chama está num toque de botão
// e precisa de uma frase para mostrar, não de uma exceção.
export async function guardarHTML(nome, conteudo) {
  return Platform.OS === 'web'
    ? guardarNaWeb(nome, conteudo)
    : guardarNoTelemovel(nome, conteudo);
}

function guardarNaWeb(nome, conteudo) {
  try {
    const blob = new Blob([conteudo], { type: `${TIPO};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Sem isto o blob fica em memória enquanto a página viver. O adiamento é
    // porque revogar antes de o descarregamento arrancar cancela-o.
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return { ok: true, onde: 'transferências' };
  } catch (e) {
    return { ok: false, motivo: 'Não foi possível guardar o ficheiro neste navegador.' };
  }
}

async function guardarNoTelemovel(nome, conteudo) {
  let ficheiro;
  try {
    // A importação é dinâmica de propósito: na web estes módulos não servem
    // para nada, e não têm de ser carregados para a app arrancar. Também é o
    // que faz os testes correrem sem um módulo nativo por perto.
    const { File, Paths } = await import('expo-file-system');
    // Na cache, e não nos documentos: isto é um ficheiro de passagem, para ser
    // entregue já a seguir. O sistema pode limpá-lo quando precisar de espaço,
    // e é isso que se quer de dados clínicos que já foram guardados noutro
    // sítio pela pessoa.
    ficheiro = new File(Paths.cache, nome);
    ficheiro.create({ overwrite: true });
    ficheiro.write(conteudo);
  } catch (e) {
    return { ok: false, motivo: 'Não foi possível escrever o ficheiro neste dispositivo.' };
  }

  try {
    const partilha = await import('expo-sharing');
    if (!(await partilha.isAvailableAsync())) {
      // O ficheiro existe, mas não há como o entregar. Dizer as duas coisas:
      // que ficou escrito, e que não se consegue chegar-lhe daqui.
      return { ok: false,
        motivo: 'O ficheiro foi criado, mas este dispositivo não tem como o abrir ou guardar.' };
    }
    await partilha.shareAsync(ficheiro.uri, {
      mimeType: TIPO,
      UTI: 'public.html',
      dialogTitle: 'Guardar a ficha de saúde',
    });
    return { ok: true, onde: 'onde escolheu guardar' };
  } catch (e) {
    // Fechar o seletor sem escolher nada cai aqui, e não é um erro: é uma
    // pessoa a mudar de ideias. Tratá-lo como falha punha um aviso vermelho a
    // dizer que correu mal quando não correu.
    return { ok: true, cancelado: true };
  }
}
