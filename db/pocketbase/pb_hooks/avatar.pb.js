/// <reference path="../pb_data/types.d.ts" />

// O aspeto do proprio membro: a fotografia da conta Google, a figura e a cor.
//
// -- Porque e uma rota e nao uma escrita normal -------------------------------
//
// A regra de update de `membros` e `papel = "admin" && casa = ...`, e e assim
// de proposito: quem muda um membro muda o PAPEL dele, e um adulto que se
// promovesse a administrador tornava a regra decorativa.
//
// Mas isso deixava um adulto sem poder escolher o SEU proprio avatar. Uma regra
// que permitisse a auto-escrita permitiria as duas coisas -- o PocketBase
// autoriza a OPERACAO, nao o campo -- e trocar a fechadura toda por causa de um
// avatar seria ma troca.
//
// Esta rota escreve TRES campos, no PROPRIO membro autenticado, e mais nada.
//
// ATENCAO: cada handler corre num contexto ISOLADO no JSVM -- nada de
// constantes de fora, nem sequer as deste ficheiro.

routerAdd('POST', '/api/membro/aspeto', (e) => {
  const membro = e.auth;
  if (!membro) throw new UnauthorizedError('Entre primeiro.');

  // Os campos sao independentes: quem manda so a cor nao perde a fotografia.
  // Dai o valor sentinela em vez de vazio -- vazio E uma escolha (limpar), e
  // tinha de se poder distinguir de «nao mexer».
  const corpo = new DynamicModel({ avatar: ' ', cor: ' ', figura: ' ' });
  e.bindBody(corpo);

  const avatar = String(corpo.avatar);
  if (avatar !== ' ') {
    const url = avatar.trim();
    if (url) {
      // So enderecos da Google, e so https.
      //
      // O campo e mostrado como imagem em todos os ecras da casa: aceitar um
      // endereco qualquer era deixar um membro apontar o avatar para o que lhe
      // apetecesse -- ou para um servidor que conta quem o abriu, e assim saber
      // a que horas cada pessoa desta casa usa a app.
      if (!/^https:\/\/[a-z0-9-]+\.googleusercontent\.com\//.test(url)) {
        throw new BadRequestError('So se aceita a fotografia da conta Google.');
      }
      if (url.length > 500) throw new BadRequestError('Endereco demasiado longo.');
    }
    membro.set('avatar', url);
  }

  const cor = String(corpo.cor);
  if (cor !== ' ') {
    const v = cor.trim().toUpperCase();
    if (v && !/^#[0-9A-F]{6}$/.test(v)) throw new BadRequestError('Cor invalida.');
    membro.set('cor', v);
  }

  const figura = String(corpo.figura);
  if (figura !== ' ') {
    const v = figura.trim();
    // Uma chave, nao um desenho. O SVG vive na app; o servidor guarda o nome.
    // Aceitar marcacao aqui era deixar entrar um desenho escolhido por um
    // membro no ecra de todos os outros.
    if (v && !/^[a-z]{2,24}$/.test(v)) throw new BadRequestError('Figura invalida.');
    membro.set('figura', v);
  }

  $app.save(membro);
  return e.json(200, {
    avatar: membro.get('avatar'), cor: membro.get('cor'), figura: membro.get('figura'),
  });
}, $apis.requireAuth());
