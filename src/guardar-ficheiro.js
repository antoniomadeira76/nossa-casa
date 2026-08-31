// Fazer sair um ficheiro da app.
//
// Está sozinho num ficheiro porque é a única parte de toda a exportação que
// depende da plataforma. Tudo o que decide o que vai lá dentro é puro e está
// em `exportar-saude.js`, provado contra o texto que produz.
//
// GUARDAR, e não partilhar. A folha de partilha do sistema põe a lista das
// aplicações instaladas à frente de quem exportou uma ficha clínica de uma
// criança, e um toque distraído manda-a para qualquer uma delas. Guardar no
// dispositivo é um passo a mais, e é o passo que impede esse engano — quem
// quiser mesmo enviá-la envia-a depois, de propósito.

import { Platform } from 'react-native';

// Devolve `{ ok, motivo }`. Nunca rebenta: quem chama está num toque de botão
// e precisa de uma frase para mostrar, não de uma exceção.
export async function guardarHTML(nome, conteudo) {
  if (Platform.OS === 'web') {
    try {
      const blob = new Blob([conteudo], { type: 'text/html;charset=utf-8' });
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
      return { ok: true };
    } catch (e) {
      return { ok: false, motivo: 'Não foi possível guardar o ficheiro neste navegador.' };
    }
  }

  // No telemóvel isto precisa de `expo-file-system` para escrever o ficheiro, e
  // de `expo-print` se um dia se quiser PDF em vez de HTML. Nenhum dos dois
  // está instalado, e não os acrescentei sem perguntar — o CLAUDE.md é claro
  // sobre não trazer dependências por iniciativa própria.
  //
  // Prefiro dizer isto no ecrã a fingir que exportou. Uma exportação que não
  // exporta e não se queixa é a pior das três hipóteses.
  return {
    ok: false,
    motivo: 'Guardar ficheiros no telemóvel precisa do módulo expo-file-system, '
      + 'que ainda não está instalado. Por agora a exportação funciona na versão '
      + 'web da aplicação.',
  };
}
