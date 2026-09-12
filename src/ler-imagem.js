// Uma imagem como `data:` URI, para ir DENTRO de um documento.
//
// O PDF da ficha de saúde inclui as imagens dos documentos (12/09/2026, o dono
// da casa: «o PDF deve incluir as imagens dos docs»). Uma janela de impressão
// aberta com `document.write` e o `printToFileAsync` do telemóvel não podem
// contar com um endereço assinado do servidor nem com um `file://` da câmara —
// o primeiro expira e pede sessão, o segundo não é do documento. O byte vai
// dentro do HTML, e o documento fica inteiro em qualquer sítio onde se abra.
//
// ⚠ Vive num módulo próprio, e não no `guardar-ficheiro.js`, porque o guarda
// «a app não envia» proíbe um `fetch(` naquele ficheiro: o correio abre-se
// com a mensagem pronta e nunca se envia sozinho. Isto é outra coisa — ler um
// ficheiro que já é nosso.
//
// Devolve `null` quando não consegue: quem chama diz no papel que aquele
// documento ficou na aplicação, em vez de imprimir uma moldura vazia.
import { Platform } from 'react-native';

const MIME_POR_EXTENSAO = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic' };

export async function lerComoDataURI(uri) {
  if (!uri) return null;
  if (/^data:/.test(uri)) return uri;
  try {
    if (Platform.OS === 'web') {
      const r = await fetch(uri);
      if (!r.ok) return null;
      const blob = await r.blob();
      if (!/^image\//.test(blob.type || '')) return null;
      return await new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve(String(leitor.result));
        leitor.onerror = () => reject(leitor.error);
        leitor.readAsDataURL(blob);
      });
    }
    const { File } = await import('expo-file-system');
    const f = new File(uri);
    const ext = String(uri).split('?')[0].split('.').pop().toLowerCase();
    const mime = MIME_POR_EXTENSAO[ext] || 'image/jpeg';
    const b64 = await f.base64();
    return b64 ? `data:${mime};base64,${b64}` : null;
  } catch (e) {
    return null;
  }
}
