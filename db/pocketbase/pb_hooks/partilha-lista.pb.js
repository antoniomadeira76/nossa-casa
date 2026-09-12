/// <reference path="../pb_data/types.d.ts" />

// A lista de compras partilhada com quem nao tem a app (12/09/2026).
//
// Duas metades, as duas aqui:
//
//   1. Ao criar uma `partilhas_lista`, o SINAL e o prazo sao escritos pelo
//      servidor. O cliente nao escolhe o sinal -- um sinal escolhido pelo
//      cliente era um sinal adivinhavel -- e nao escolhe o prazo: uma hora,
//      que e o tempo de uma ida ao supermercado.
//   2. `GET /lista/{sinal}` devolve a lista ABERTA em HTML, sem sessao: so os
//      rotulos e os corredores, riscados os ja comprados. Sem prendas «so
//      adultos», sem precos, sem o nome de quem pediu. Nada se escreve por
//      aqui -- so ha GET, e a resposta nao tem um unico formulario.
//
// ATENCAO: cada handler corre num contexto ISOLADO no JSVM -- nada de
// constantes de fora, nem sequer as deste ficheiro. As auxiliares vao dentro.

onRecordCreateRequest((e) => {
  // O sinal e sempre do servidor, mesmo que o cliente mande um.
  e.record.set('sinal', $security.randomString(24));
  const daquiAUmaHora = new Date(Date.now() + 60 * 60 * 1000);
  e.record.set('expira_em', daquiAUmaHora.toISOString());
  e.next();
}, 'partilhas_lista');

routerAdd('GET', '/lista/{sinal}', (e) => {
  function escapar(x) {
    return String(x == null ? '' : x)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  // A mesma cara dos documentos da app: faixa do cabeçalho com o logotipo,
  // titulos de seccao no acento, linhas planas. Uma pagina para o telemovel
  // de quem esta no supermercado, sem um byte de JavaScript.
  function pagina(titulo, sub, corpo, codigo) {
    const logo = '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">'
      + '<path d="M3.6 10.9L12 4.1l8.4 6.8" stroke="#FFFFFF" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
      + '<circle cx="9.1" cy="14.9" r="1.62" fill="#8B4EE0"/><circle cx="14.9" cy="14.9" r="1.62" fill="#13ADB3"/>'
      + '<circle cx="9.1" cy="19.4" r="1.62" fill="#4A8FE0"/><circle cx="14.9" cy="19.4" r="1.62" fill="#E8EDF5"/></svg>';
    return e.html(codigo || 200, '<!doctype html><html lang="pt-PT"><head><meta charset="utf-8">'
      + '<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">'
      + '<title>' + escapar(titulo) + '</title><style>'
      + 'body{margin:0;background:#F0F2F5;color:#262626;font:16px/1.5 Inter,Roboto,"Segoe UI",system-ui,sans-serif}'
      + '.faixa{background:#0A5B60;color:#fff;padding:16px 18px;display:flex;align-items:center;gap:12px}'
      + 'h1{font-size:18px;font-weight:600;margin:0}.sub{margin:2px 0 0;font-size:12.5px;color:rgba(255,255,255,.82)}'
      + 'main{max-width:460px;margin:0 auto;padding:8px 16px 40px}'
      + 'h2{font-size:13px;font-weight:600;letter-spacing:.2px;color:#076F73;border-bottom:1px solid #D9D9D9;padding:18px 0 8px;margin:0}'
      + 'ul{list-style:none;margin:0;padding:0}li{min-height:44px;display:flex;align-items:center;padding:8px 4px;border-bottom:1px solid #E7E9EE}'
      + 'li.feito{color:#656C7C;text-decoration:line-through}.vazio{color:#656C7C;font-style:italic;padding:12px 4px}'
      + '.pe{font-size:12px;color:#656C7C;margin-top:24px}'
      + '</style></head><body><header class="faixa">' + logo + '<div><h1>' + escapar(titulo) + '</h1>'
      + '<p class="sub">' + escapar(sub) + '</p></div></header><main>' + corpo + '</main></body></html>');
  }

  const sinal = String(e.request.pathValue('sinal') || '');
  // A forma do sinal, antes de ir a base de dados: 24 letras ou algarismos.
  if (!/^[A-Za-z0-9]{24}$/.test(sinal)) {
    return pagina('Endereco desconhecido', 'Nossa Casa', '<p class="vazio">Este endereco nao corresponde a nenhuma lista.</p>', 404);
  }
  let partilha = null;
  try { partilha = $app.findFirstRecordByFilter('partilhas_lista', 'sinal = {:s}', { s: sinal }); } catch (_) { partilha = null; }
  if (!partilha) {
    return pagina('Endereco desconhecido', 'Nossa Casa', '<p class="vazio">Este endereco nao corresponde a nenhuma lista.</p>', 404);
  }
  // O prazo. A data vem como «2026-09-12 20:00:00.000Z».
  // ATENCAO: `get()` de uma data devolve um OBJETO, verdadeiro mesmo vazio;
  // le-se em texto (`getString`), que e vazio quando a data nao esta escrita.
  const expira = Date.parse(partilha.getString('expira_em').replace(' ', 'T'));
  if (!expira || Date.now() > expira) {
    return pagina('Endereco expirado', 'Nossa Casa', '<p class="vazio">Este endereco ja expirou. Peca outro a quem lhe mandou a lista.</p>', 410);
  }
  let lista = null;
  try { lista = $app.findRecordById('listas_compras', partilha.get('lista')); } catch (_) { lista = null; }
  if (!lista || lista.getString('fechada_em')) {
    return pagina('Lista fechada', 'Nossa Casa', '<p class="vazio">Esta ida as compras ja fechou.</p>', 410);
  }

  // Os artigos que se podem mostrar: os da lista, SEM as prendas «so adultos».
  const artigos = $app.findRecordsByFilter('artigos',
    'lista = {:l} && visibilidade != "adultos"', 'posto', 0, 0, { l: lista.id });
  // Os corredores da casa, pela ordem em que se anda na loja.
  const corredores = $app.findRecordsByFilter('seccoes', 'casa = {:c}', 'posto', 0, 0, { c: lista.get('casa') });
  const nomeDoCorredor = {};
  for (const c of corredores) nomeDoCorredor[c.id] = c.get('nome');

  let loja = '';
  try { const l = lista.getString('loja') ? $app.findRecordById('lojas', lista.getString('loja')) : null; loja = l ? l.getString('nome') : ''; } catch (_) { loja = ''; }

  // Agrupados por corredor, pela ordem dos corredores; o que nao tem corredor
  // vai para o fim. So o rotulo e se ja foi comprado -- nem preco, nem quem.
  const porCorredor = {};
  for (const a of artigos) {
    const chave = nomeDoCorredor[a.get('corredor')] || 'Outros';
    (porCorredor[chave] = porCorredor[chave] || []).push(a);
  }
  const ordem = corredores.map(c => c.get('nome')).filter(n => porCorredor[n]);
  if (porCorredor['Outros']) ordem.push('Outros');
  let corpo = '';
  for (const nome of ordem) {
    corpo += '<h2>' + escapar(nome) + '</h2><ul>';
    for (const a of porCorredor[nome]) {
      const feito = a.get('estado') === 'confirmado';
      corpo += '<li' + (feito ? ' class="feito"' : '') + '>' + escapar(a.get('rotulo')) + '</li>';
    }
    corpo += '</ul>';
  }
  if (!artigos.length) corpo = '<p class="vazio">A lista esta vazia.</p>';
  const ate = new Date(expira);
  const hh = String(ate.getHours()).padStart(2, '0') + ':' + String(ate.getMinutes()).padStart(2, '0');
  corpo += '<p class="pe">Endereco so de leitura, valido ate as ' + hh + '. Partilhado pela aplicacao Nossa Casa.</p>';
  return pagina('Lista de compras', loja ? loja : 'A lista da casa', corpo, 200);
});
