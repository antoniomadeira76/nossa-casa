// Registo de alterações da app — a fonte das duas vistas da Documentação.
// Vem do protótipo (`design/Nossa Casa App.dc.html`), onde é escrito à mão a
// cada correção. A Documentação gera daqui as novidades por versão e o «Como
// funciona» por área: nada é escrito duas vezes.
//
// Não confundir com `s.registo`, que é o histórico de alterações que a
// FAMÍLIA faz à casa. São duas coisas diferentes, e o ecrã mostrava a segunda
// onde a referência 17 mostra a primeira.
export const APP_VERSION = '1.12.1';

// ── O que a app é, e o que cada área faz ─────────────────────────────────────
//
// ⚠ Isto é ESCRITO À MÃO, e é de propósito.
//
// O «Como funciona» era o registo de alterações cortado por área: respondia a
// «o que mudou nas Compras», não a «para que servem as Compras». E as frases de
// um registo são escritas como diferenças — «o botão era menor do que o mínimo
// para o dedo» — que só se entendem a quem já conhece a app. Uma lista de
// funcionalidades DERIVADA de um registo de alterações envelhece a ler como um
// registo de alterações.
//
// O que muda, muda no `REGISTO_APP` em baixo. O que a coisa É muda aqui, e
// muda muito menos vezes. São dois textos porque são duas perguntas.
//
// ⚠ O nome da área tem de bater CERTO com o campo `a` do `REGISTO_APP`: é por
// ele que o ecrã junta o que a área faz com o que mudou nela. Há uma prova que
// o confere — `__tests__/documentacao-cobre-as-areas.test.js`.
export const AMBITO = 'A Nossa Casa é a casa de uma família num sítio só: a '
  + 'agenda de todos, as tarefas com pontos, a lista de compras que fecha em '
  + 'despesa, o orçamento por envelopes, os equipamentos com as garantias e as '
  + 'fichas de saúde. Corre nos telemóveis dos adultos e das crianças, com '
  + 'aquilo que cada um pode ver decidido pelo papel que tem na casa.';

export const AREAS = [
  { area: 'Início', icon: 'home',
    o: 'O resumo do dia, e o primeiro ecrã de quem abre a app.',
    faz: [
      'Mostra o que precisa de si hoje: prazos a acabar, tarefas por confirmar e contas por acertar',
      'Traz a agenda e as tarefas de hoje, e o estado do orçamento do mês',
      'O avatar abre o Perfil; terminar sessão fica no cabeçalho',
    ] },

  { area: 'Dinheiro', icon: 'wallet',
    o: 'O orçamento da casa, por envelopes, um mês de cada vez.',
    faz: [
      'Divide o rendimento por envelopes — Mercearia, Casa & contas, e os que a casa criar',
      'Regista despesas, com a opção de as dividir a meias entre os adultos',
      'Move dinheiro de um envelope para outro sem mexer no total',
      'Acerta contas entre os dois adultos: quem pagou mais recebe a diferença',
      'Abre e fecha o mês. Fechar não apaga nada — o mês seguinte é outra contagem, e o saldo pode ir para uma meta',
      'As metas da família, em euros: um objetivo, quanto já está junto, e de onde veio',
      'Os cofres das crianças, com a semanada e os bónus',
      'As contas fixas — a renda, a luz, a internet — com o dia em que vencem; marcar como paga regista a despesa no envelope, e a conta aparece na Agenda no dia e no Início dois dias antes',
      'O retrato de cada mês — gasto por envelope, tarefas e pontos por criança, compras, acertos — somado das linhas do mês e exportável em PDF; os meses anteriores ficam em Documentação › Nesta casa',
    ] },

  { area: 'Tarefas', icon: 'checkSquare',
    o: 'O que há para fazer na casa, e quem o faz.',
    faz: [
      'Tarefas com responsável, prazo, recorrência e pontos',
      'A urgência manda na ordem; dentro de cada grupo, arrastar muda o lugar',
      'Uma criança marca a tarefa como feita e um adulto confirma — os pontos só contam depois disso',
      'Os irmãos trocam tarefas entre si, só para o dia: um propõe, o outro aceita ou recusa, um adulto pode anular',
      'Os pontos viram semanada no Dinheiro, ao valor que a casa definir, e podem ser desligados',
    ] },

  { area: 'Compras', icon: 'storefront',
    o: 'A lista de compras da casa, e a ida à loja.',
    faz: [
      'A lista é de todos: as crianças também pedem artigos',
      'Partilha-se com quem não tem a app por um endereço só de leitura, válido uma hora — rótulos e corredores, sem prendas, sem preços, sem nomes',
      'Os corredores da loja são da casa — renomeiam-se, ordenam-se e apagam-se —, e o modo de loja anda por eles nessa ordem',
      'Cada artigo altera-se e arrasta-se para o lugar certo dentro do corredor',
      'Cada artigo marca-se como apanhado ou sem stock, e os dois telemóveis veem o mesmo',
      'Fechar a conta regista a despesa e guarda a ida no histórico',
      'Os preços pagos ficam por artigo e por loja, para se saber onde é mais barato',
    ] },

  { area: 'Agenda', icon: 'calendar',
    o: 'Os compromissos da casa, com três níveis de quem vê o quê.',
    faz: [
      'Um evento é «Só eu», «Os adultos» ou «A casa toda» — e o que é privado não chega sequer ao telemóvel dos outros',
      'As consultas de saúde aparecem aqui como eventos, sem se escreverem duas vezes',
      'A agenda da Google pode ser importada, evento a evento',
    ] },

  { area: 'Saúde', icon: 'heartPulse',
    o: 'As fichas de saúde da família — a área mais fechada da app.',
    faz: [
      'Uma consulta por membro, com especialidade, médico e notas',
      'Notas, receitas e decisões acrescentam-se à consulta ao longo do tempo',
      'A medicação a partir da receita: tomas por dia, dias e caixa; as tomas põem-se na Agenda só para os adultos, e cada uma marca-se com quem e quando',
      'Documentos e exames anexam-se à consulta que os originou',
      'A ficha de um adulto é dele: nem o outro adulto a vê. Uma criança não vê a sua própria ficha',
      'A ficha de emergência da criança — alergias, medicação em curso, médico, contactos — exporta-se em PDF para a escola',
      'Só sincroniza para um servidor dentro de casa — são dados de saúde de menores',
    ] },

  { area: 'Equipamentos', icon: 'fileDone',
    o: 'As máquinas da casa e o que se sabe delas.',
    faz: [
      'Data de compra, loja, preço e fim da garantia',
      'Avisa quando uma garantia está a acabar',
      'Guarda a próxima manutenção de cada equipamento',
      'Os contratos — o seguro, a internet, a inspeção — com a data em que renovam, a fidelização, quem trata e o documento; avisa 30 dias antes',
    ] },

  { area: 'Gestão da Casa', icon: 'houseGear',
    o: 'As regras da casa, e quem lá vive. Só para quem administra.',
    faz: [
      'Acrescentar e retirar membros, e mudar o papel de cada um',
      'O PIN de entrada das crianças',
      'O rendimento mensal, os envelopes e os limites de cada um',
      'O valor do ponto, o dia de pagamento da semanada e se as despesas se dividem a meias',
      'As listas da casa: especialidades médicas, categorias de equipamento e lojas',
    ] },

  { area: 'Perfil', icon: 'user',
    o: 'O que é de cada um, e não da casa.',
    faz: [
      'O avatar: dezasseis figuras, a cor do perfil, ou a fotografia da conta Google',
      'O aspeto claro ou escuro e o esquema de cor — cada membro escolhe o seu',
      'Os avisos: o resumo diário e quantos dias antes de um prazo avisar',
      'Repor os dados de demonstração ou começar de zero',
    ] },

  { area: 'Entrada', icon: 'idcard',
    o: 'Como cada um entra na casa.',
    faz: [
      'Os adultos entram com a Conta Google',
      'As crianças entram com um PIN, e vão para um modo próprio — sem orçamento nenhum à vista',
    ] },

  { area: 'A App', icon: 'sliders',
    o: 'O que é igual em todos os ecrãs.',
    faz: [
      'O cabeçalho e o rodapé aparecem sempre, mesmo com folhas e diálogos abertos',
      'Seis esquemas de cor e dois aspetos, por membro e não por casa',
      'Sem ligação, a app continua a funcionar: o que se escreve fica em fila e sobe depois',
    ] },

  { area: 'Documentação', icon: 'fileText',
    o: 'Este ecrã: o que a app faz, o que mudou nela, e o que a casa fez.',
    faz: [
      '«Novidades» diz o que mudou na app, versão a versão',
      '«Como funciona» diz o que a app faz, área a área — e o que mudou em cada uma',
      '«Nesta casa» diz o que a família fez: quem mudou o quê, e quando',
    ] },
];

export const REGISTO_APP = [
  // ── 1.12.1 ────────────────────────────────────────────────────────────────
  // A pesquisa global (13/09/2026, opção A de design/pesquisa-global.dc.html) e a
  // fila de escritas que perdia dinheiro.
  { v: '1.12.1', d: '13/09/2026', k: 'novo', a: 'Início', t: 'A pesquisa da casa: a lupa no cabeçalho do Início abre um campo no próprio cabeçalho, e o que se encontra aparece à medida que se escreve, por área — tarefas, agenda, compras, dinheiro, equipamentos, saúde, pessoas, documentação — com a palavra a negrito e três sugestões para completar. Um toque leva ao sítio. Procura só no que já está neste telemóvel, sem acentos nem maiúsculas a contar. A criança tem a mesma lupa sobre o que ela vê' },
  { v: '1.12.1', d: '13/09/2026', k: 'corrigido', a: 'Dinheiro', t: 'Semanadas, bónus e despesas registadas pela app ficavam no ecrã e desapareciam na leitura seguinte: a fila de escritas era lida e regravada por duas escritas ao mesmo tempo — o movimento entrava, a linha do registo lia a fila antiga e gravava por cima. O movimento morria sem ser enviado e o registo ia duas vezes. A fila passou a atender uma escrita de cada vez, e há uma prova contra o servidor que faz as duas em simultâneo' },
  { v: '1.12.1', d: '13/09/2026', k: 'alterado', a: 'Equipamentos', t: 'Na ficha do equipamento, «Agendar Manutenção» e «Exportar Fatura» ficam lado a lado, como «Exportar» e «Marcar» na ficha de saúde. E «Exportar Fatura» passou a fazer o que diz: sai um PDF com a cara da app — o equipamento, a garantia, a compra e a fotografia da fatura. Era um botão sem ação' },
  { v: '1.12.1', d: '13/09/2026', k: 'corrigido', a: 'Saúde', t: 'Um exame anexado no navegador subia ao servidor, mas ao recarregar a página o PDF da consulta dizia «um documento não pôde ser incluído»: a app continuava a usar a cópia local da fotografia, que o navegador já tinha deitado fora, em vez do ficheiro no servidor. Depois de subir, o documento passa a apontar para o servidor' },
  { v: '1.12.1', d: '13/09/2026', k: 'corrigido', a: 'A App', t: 'Uma base de dados criada do zero nascia sem a coleção que guarda a autorização da agenda da Google: o ficheiro que a cria estava fora da cadeia de criação, e ligar a agenda num servidor novo falhava. Passou a fazer parte de «npm run db:colecoes», e lê as credenciais do mesmo sítio que os outros' },
  { v: '1.12.1', d: '13/09/2026', k: 'corrigido', a: 'Equipamentos', t: 'A fotografia da fatura e a do equipamento passaram a subir ao servidor: escolhiam-se, a ficha dizia «Guardada», e ficavam só naquele telemóvel — e no navegador desapareciam ao recarregar a página. Agora ficam no aparelho primeiro, com «Só neste aparelho · por subir» à vista, sobem à parte como o documento do contrato, e chegam ao outro adulto' },
  { v: '1.12.1', d: '14/09/2026', k: 'alterado', a: 'Documentação', t: 'O registo «Nesta casa» lê-se como a Agenda: os dias como secções («Hoje · Segunda, 14/09»), e em cada linha a hora, a bola de quem fez, um título curto com o detalhe por baixo e a pastilha da área. Saiu o cartão e o mesmo ícone em todas as linhas. Entradas iguais seguidas ficam uma só («4 vezes entre sábado e domingo»). Cabem oito entradas no ecrã em vez de quatro' },
  { v: '1.12.1', d: '14/09/2026', k: 'alterado', a: 'Documentação', t: 'Os filtros do registo «Nesta casa» ficaram em duas linhas: as pessoas pela bola de cada uma, como nas Tarefas e na Saúde, e as áreas numa fila que rola de lado, com o ícone de cada área e a escolhida logo a seguir a «Tudo». Eram nove pastilhas em três linhas dentro de um cartão, antes da primeira entrada' },
  { v: '1.12.1', d: '14/09/2026', k: 'alterado', a: 'A App', t: 'A marca de água dos ecrãs passou a cores: as quatro bolas com as cores da marca, e só o telhado na tinta do texto — suave, atrás de tudo. E o cinzento de fundo dos ecrãs ficou um tom mais claro' },
  { v: '1.12.1', d: '14/09/2026', k: 'alterado', a: 'A App', t: 'A revisão de coerência de todos os ecrãs. O scroll volta ao topo ao mudar de ecrã — abrir a Documentação depois de descer na Gestão abria-a a meio. «Acrescentar» é um só botão em toda a app, o tracejado em minúsculas, também no Dinheiro («registar despesa»). Os botões escrevem-se em frase («Guardar alterações», «Exportar fatura», «Confirmar abertura»). Os envelopes leem-se «gasto / limite» na Gestão como no Dinheiro. A marca do cabeçalho passou para a esquerda do avatar, em vez de ficar por trás dele. As cores da urgência das tarefas e do ecrã de entrada vêm do tema, e os tamanhos de letra passaram a uma escala de dezassete valores' },
  { v: '1.12.1', d: '13/09/2026', k: 'alterado', a: 'Início', t: 'O campo da pesquisa deixou a caixa: escreve-se a branco no próprio cabeçalho, com uma linha por baixo que acende quando tem o foco — e é a app que desenha esse foco, em vez do anel do navegador, que no Windows saía laranja. Antes de escrever, em vez de um cartão a repetir «Procurar na casa», aparece «Onde se procura»: uma linha por área, e um toque leva lá. A criança vê só as áreas dela' },
  { v: '1.12.1', d: '13/09/2026', k: 'novo', a: 'A App', t: 'O logótipo da app em marca de água em todos os ecrãs — a mesma marca dos documentos em papel, centrada entre o cabeçalho e o rodapé, numa tinta só e quase transparente, atrás do conteúdo. Nos adultos e na app da criança' },
  { v: '1.12.1', d: '13/09/2026', k: 'alterado', a: 'Compras', t: 'A ementa da semana saiu da app, por decisão do dono da casa: a secção das Compras, o interruptor na Gestão e o «Jantar de hoje» da criança. Poderá voltar numa versão futura — os pratos e os jantares que já estavam no servidor ficam guardados, e a pesquisa deixou de os mostrar' },
  { v: '1.12.1', d: '13/09/2026', k: 'corrigido', a: 'Saúde', t: 'No navegador, «Guardar como PDF» deixou de depender de uma janela nova: o bloqueador de janelas travava-a e a app dizia «O navegador bloqueou a janela de impressão». O documento imprime-se agora dentro da própria página, e o diálogo do navegador abre com o nome do ficheiro. Vale para a ficha de saúde, o retrato do mês e a fatura do equipamento' },
  // A casa SIMULADA de 13/09/2026 («testa a app toda, simula o que tiveres de
  // simular»): um servidor temporário, uma casa cheia e difícil, todos os ecrãs.
  { v: '1.12.1', d: '13/09/2026', k: 'corrigido', a: 'A App', t: 'Quem entrar de OUTRA casa num telemóvel onde antes entrou outra família começa do zero. A cópia local da casa anterior ficava: uma administradora de uma casa nova via o jantar, as tarefas e a garantia do frigorífico de quem lá entrara antes. Ao mudar a casa, o aparelho esvazia-se antes de ler' },
  { v: '1.12.1', d: '13/09/2026', k: 'corrigido', a: 'Compras', t: 'No Modo Compras, com mais de cinco corredores a fila dos separadores passa a rolar de lado, cada um com o seu nome inteiro e alvo de 44. Com oito corredores ficavam com 40 px e os nomes cortados a «Fresc…». E o subtítulo das Compras conta os adultos da casa em vez de dizer sempre «2 adultos»' },
  { v: '1.12.1', d: '13/09/2026', k: 'corrigido', a: 'Dinheiro', t: '«Reforçar» num envelope no limite abre a folha de mover com esse envelope como destino e o que tem mais livre como origem — abria com o primeiro e o quarto da lista, fossem quais fossem. E a folha «Abrir Mês» mostra o limite que cada envelope vai ficar a ter, não «0,00 €» em todos com o total certo no botão; o máximo acompanha o orçamento em vez de parar nos 2 000 €' },
  { v: '1.12.1', d: '13/09/2026', k: 'alterado', a: 'Saúde', t: 'O filtro por membro passou a ser o das Tarefas: «Todos» e a bola de cada pessoa, agora com o nome por baixo, e o nome de quem se filtra no título da secção («Precisa de ação · Léo»). As pastilhas com o nome saíram — com cinco membros ficavam com 39 px — e «Adicionar receita» passou aos 44 px. A caixa «Procurar por especialidade» saiu: o protótipo nunca a teve, e com o filtro por pessoa cada ficha mostra duas ou três consultas' },
  { v: '1.12.1', d: '13/09/2026', k: 'alterado', a: 'Tarefas', t: 'As bolas do filtro por membro ganharam o nome por baixo, para se saber quem é quem antes de tocar. O filtro é agora o mesmo componente nas Tarefas e na Saúde' },
  { v: '1.12.1', d: '13/09/2026', k: 'corrigido', a: 'A App', t: 'Uma base de dados criada do zero nascia sem o avatar e a figura dos membros — só a tabela que acrescenta campos a um servidor a andar os tinha —, e correr a criação pela segunda vez tropeçava em três coleções que não estavam na lista de limpeza. Os dois sítios voltaram a dizer o mesmo, e há um guarda que os compara' },
  // A revisão de 13/09/2026: «testa o código, procura por bugs». Três leituras
  // (lógica, servidor, ecrãs) sobre o que se escreveu de 11 a 13/09.
  { v: '1.12.1', d: '13/09/2026', k: 'corrigido', a: 'Tarefas', t: 'Uma troca de tarefas aceite deixou de mudar o histórico de pontos: contava a quem tem a tarefa HOJE todas as vezes que ela foi feita no mês — o Léo herdava os lixos da Mia até à meia-noite e o «por pagar» dela ficava negativo. Cada dia é de quem tinha a tarefa nesse dia' },
  { v: '1.12.1', d: '13/09/2026', k: 'corrigido', a: 'Tarefas', t: 'A urgência e o prazo de uma tarefa passaram a chegar ao servidor: mudavam só no telemóvel onde se mexeu, e o outro adulto continuava a ver a ordem antiga. E o botão «Sem prazo» passou a LIGAR o prazo — hoje às 18:00 — em vez de só o tirar' },
  { v: '1.12.1', d: '13/09/2026', k: 'corrigido', a: 'Tarefas', t: 'Uma tarefa que alterna entre as crianças não entra numa troca, e uma proposta com uma tarefa que ainda não chegou ao servidor é recusada com uma frase. Antes a proposta aparecia como feita, o servidor recusava-a em silêncio, e ela desaparecia na leitura seguinte' },
  { v: '1.12.1', d: '13/09/2026', k: 'corrigido', a: 'A App', t: 'No servidor, aceitar uma troca passou a exigir a data e a trancar a casa: quem aceitava podia assinar sem datar — e voltar a assinar — ou, sabendo o id de outra casa, mudar a troca para lá. Três provas novas' },
  { v: '1.12.1', d: '13/09/2026', k: 'corrigido', a: 'Dinheiro', t: 'O retrato do mês passou a contar o dinheiro movido entre envelopes: dizia «acima do limite» num envelope que o Dinheiro mostrava dentro dele, porque só lia o limite de base. Os dois ecrãs somam agora as mesmas linhas' },
  { v: '1.12.1', d: '13/09/2026', k: 'corrigido', a: 'Dinheiro', t: '«Mover Dinheiro» rebentava numa casa com menos de quatro envelopes: a folha nascia a apontar para o quarto, que não existia. Os envelopes escolhidos prendem-se à lista da casa' },
  { v: '1.12.1', d: '13/09/2026', k: 'corrigido', a: 'Compras', t: 'A página da lista partilhada deixou de se guardar em cache e de se indexar, e um corredor chamado «constructor» ou «__proto__» já não a deita abaixo. Um rótulo com código HTML sai como texto — agora provado, antes só assumido. «Desfazer a partilha» sem servidor diz que não pôde, em vez de afirmar que o endereço morreu' },
  { v: '1.12.1', d: '13/09/2026', k: 'corrigido', a: 'Compras', t: 'O histórico de compras tinha em cada linha um botão «Repetir compra» que não fazia nada, com seta e tudo; as linhas passaram a ser só de leitura, e dizem «1 artigo» em vez de «1 artigos». O cartão de cima só mostra o envelope Mercearia quando a casa o tem — mostrava «0,00 €» a verde quando não' },
  { v: '1.12.1', d: '13/09/2026', k: 'corrigido', a: 'Saúde', t: 'No telemóvel, as imagens guardadas no servidor entram no PDF da ficha: só as acabadas de tirar entravam, e as outras saíam como «não pôde ser incluída». Se a preparação do documento falhar, o botão volta a si em vez de ficar em «A preparar…». A frase da folha já não diz que os ficheiros ficam na aplicação' },
  { v: '1.12.1', d: '13/09/2026', k: 'corrigido', a: 'Início', t: 'Uma consulta sem hora lia-se «Amanhã às » no «Precisa de Si». Sem hora, fica só o dia' },
  { v: '1.12.1', d: '13/09/2026', k: 'corrigido', a: 'Dinheiro', t: 'No cofre da criança, «Pedir para usar o dinheiro» dizia «A Rita ou o Tomás têm de autorizar» fosse qual fosse a casa; passou a nomear os adultos desta, e a dizer que o pedido fica neste telemóvel — não há linha no servidor para ele' },
  // ── 1.11.1 ────────────────────────────────────────────────────────────────
  // ── 1.12.0 ────────────────────────────────────────────────────────────────
  { v: '1.12.0', d: '12/09/2026', k: 'alterado', a: 'Saúde', t: 'O PDF da ficha de saúde passou a incluir as imagens dos documentos de cada consulta — a radiografia, o relatório, a receita fotografada —, cada uma com a sua legenda. Antes só os nomeava e avisava que os ficheiros ficavam na aplicação; agora só o diz do que não puder incluir' },
  { v: '1.12.0', d: '12/09/2026', k: 'novo', a: 'Compras', t: 'A lista partilhada com quem não tem a app: «Partilhar a lista» pede ao servidor um endereço só de leitura, válido uma hora; quem o abre vê os rótulos por corredor, riscados os já comprados — sem prendas «só adultos», sem preços, sem nomes, e sem poder escrever. «Desfazer a partilha» mata o endereço na hora. O endereço só serve onde o servidor da casa for alcançável, e a folha di-lo' },
  { v: '1.12.0', d: '12/09/2026', k: 'alterado', a: 'A App', t: 'Os documentos que a app gera — a ficha de saúde, a ficha de emergência, o retrato do mês — passaram a ter a cara da app: a faixa de cabeçalho na cor do esquema de quem imprime, com o logótipo, os títulos de secção e as linhas como nos ecrãs, o logótipo em marca de água em cada página, e no canto inferior direito «Impresso por António · 12/09/2026 · 19:40». Saíam a preto e branco, em serifa, sem nada que dissesse de onde vinham' },
  { v: '1.12.0', d: '12/09/2026', k: 'novo', a: 'Dinheiro', t: 'O retrato do mês: uma página por mês com o gasto por envelope contra o limite, as tarefas feitas e os pontos por criança, as idas às compras e os acertos entre os adultos — e «Exportar em PDF». Abre-se pela linha «Retrato de Setembro» no Dinheiro, abre-se sozinho ao fechar o mês, e os meses anteriores ficam em Documentação › Nesta casa. Nenhum número é escrito: é a soma das linhas do mês, e um mês fechado não muda quando o seguinte abre' },
  { v: '1.12.0', d: '12/09/2026', k: 'alterado', a: 'Tarefas', t: 'O filtro por membro passou a avatares: «Todos» e a bola de cada pessoa numa linha só, em vez de seis pastilhas com o nome que caíam para uma segunda linha. O escolhido ganha um anel e o nome passa para o título da secção; tocar outra vez volta a «Todos»' },
  { v: '1.12.0', d: '12/09/2026', k: 'novo', a: 'Tarefas', t: 'A troca de tarefas entre irmãos: na app da criança, «Propor uma troca» escolhe uma tarefa sua e uma do irmão, só para hoje; o irmão vê a proposta em «Trocas» e aceita ou recusa. Aceite, a tarefa passa para quem a troca diz — com «Troca com o Léo · só hoje» na linha — e os pontos são de quem a faz. À meia-noite cada tarefa volta a quem era, sem ninguém desfazer nada' },
  { v: '1.12.0', d: '12/09/2026', k: 'novo', a: 'Início', t: 'Uma troca de tarefas de hoje entra no «Precisa de Si» dos adultos, a cinzento — informação, não risco —, e a linha leva às Tarefas, onde «Trocas de Hoje» mostra o estado e «Anular a troca» a desfaz' },
  { v: '1.12.0', d: '12/09/2026', k: 'novo', a: 'Saúde', t: 'A ficha de emergência da criança: alergias com gravidade e nota, a medicação em curso (das receitas com plano), o médico das consultas e os contactos dos adultos — e «Exportar em PDF para a escola», uma página, pelo mesmo caminho da ficha de saúde. Só as alergias são dado novo; a criança não vê a sua ficha, e o PDF sai do telemóvel de um adulto' },
  { v: '1.12.0', d: '12/09/2026', k: 'corrigido', a: 'A App', t: 'Uma adulta de outra casa conseguia escrever uma consulta, um movimento de cofre ou um acerto de contas a apontar para pessoas desta casa — sem os ver, mas a escrever. O guarda das relações não via as relações para os membros; passou a ver, e as quatro coleções ficaram presas à casa da pessoa' },
  { v: '1.12.0', d: '12/09/2026', k: 'corrigido', a: 'Saúde', t: 'A faixa de cor de uma consulta aberta deixou de crescer com o acordeão: media a primeira linha e passou a acompanhar receitas, notas e anexos — uma régua azul de 700 px pela página abaixo. Fica nos 52 px do título' },
  { v: '1.12.0', d: '12/09/2026', k: 'novo', a: 'Saúde', t: 'A medicação a partir da receita: a receita ganha o plano de tomas — quantas por dia, durante quantos dias, e quantas unidades traz a caixa — e avisa quando a caixa acaba antes da receita. «Pôr as tomas na Agenda» cria um dia por toma, só para os adultos. Cada toma marca-se com um toque e fica com quem e quando; só quem marcou desmarca. A criança não vê nada disto, e as tomas só sobem para um servidor que viva na casa, como as consultas' },
  { v: '1.12.0', d: '12/09/2026', k: 'alterado', a: 'Compras', t: 'A ementa da semana passou a ser opcional: um interruptor na Gestão da Casa desliga-a para toda a casa — a secção sai das Compras e o «Jantar de hoje» sai da app das crianças; os pratos ficam guardados. Ligada, mostra só os dias com jantar, e sem nenhum é uma linha só, «Planear a semana», que abre os sete dias' },
  { v: '1.12.0', d: '12/09/2026', k: 'novo', a: 'Equipamentos', t: 'Os contratos e as renovações, ao lado dos equipamentos: o seguro do carro, a internet, a inspeção, cada um com o fornecedor, a data em que renova, a fidelização e quem trata. A ficha guarda o documento — a apólice, o contrato assinado — e diz «só aqui» enquanto ele não chegar ao servidor' },
  { v: '1.12.0', d: '12/09/2026', k: 'novo', a: 'Início', t: 'Um contrato que renova dentro de 30 dias entra no «Precisa de Si», como as garantias; a linha abre a ficha desse contrato. Depois da data passar, fica a vermelho' },
  { v: '1.12.0', d: '12/09/2026', k: 'novo', a: 'Dinheiro', t: 'As contas fixas: a renda, a luz, a internet, cada uma com o valor, o dia do mês em que vence, o envelope e quem paga. «Marcar como paga» regista a despesa do mês no envelope com um toque, e a segunda do mesmo mês não entra. «Paga» é a despesa existir, nunca um número escrito' },
  { v: '1.12.0', d: '12/09/2026', k: 'novo', a: 'Início', t: 'Uma conta fixa por pagar entra no «Precisa de Si» dois dias antes de vencer — e fica lá, a vermelho, depois de vencer' },
  { v: '1.12.0', d: '12/09/2026', k: 'novo', a: 'Agenda', t: 'As contas fixas aparecem na Agenda no dia em que vencem, este mês e o seguinte, só para os adultos. Não são eventos: gerem-se no Dinheiro' },
  { v: '1.12.0', d: '11/09/2026', k: 'novo', a: 'Compras', t: 'A ementa da semana: sete jantares, um prato por dia, nas Compras. Cada prato tem os seus ingredientes, e «Pôr o que falta na lista» acrescenta só os que a lista ainda não tem, com o seu nome. A criança vê o jantar de hoje na lista dela' },
  { v: '1.12.0', d: '11/09/2026', k: 'novo', a: 'Dinheiro', t: 'A criança escolhe um objetivo para o cofre — «Bicicleta, 120 €» — e vê a barra a encher com a semanada e os bónus, e quantas semanadas faltam ao ritmo de agora. Os adultos veem para que ela junta na linha do cofre. O juntado é o saldo do cofre, nunca um número escrito' },
  { v: '1.12.0', d: '11/09/2026', k: 'novo', a: 'Compras', t: 'Um artigo pode ser «só os adultos»: a prenda de anos que a criança não deve ver. Não é escondida no ecrã, é o servidor que não a manda ao telemóvel dela. Na lista aparece com a pastilha «Só adultos»' },
  { v: '1.12.0', d: '11/09/2026', k: 'novo', a: 'Compras', t: 'O modo criança ganhou o separador Compras: a lista da casa, corredor a corredor, sem preços, e «Pedir um artigo», que entra na lista com o nome da criança. A documentação prometia-o desde o início e a app não o tinha' },
  { v: '1.11.1', d: '10/09/2026', k: 'corrigido', a: 'Tarefas', t: 'No modo criança, marcar uma tarefa deixa-a «a confirmar por um adulto» e chega ao servidor: a mãe vê-a à espera no telemóvel dela e confirma-a nas Tarefas. Ficava feita só no telemóvel da criança, sem confirmação de ninguém. A criança desmarca a sua enquanto ninguém a confirmou; o que já foi confirmado não se desfaz daí' },
  { v: '1.11.1', d: '10/09/2026', k: 'novo', a: 'Entrada', t: 'No modo criança, a bola do nome abre «O meu perfil»: a criança escolhe o avatar (figura e cor) e o esquema de cor, e continua a poder mudar o PIN. As escolhas ficam no servidor, como as dos adultos' },
  { v: '1.11.1', d: '10/09/2026', k: 'corrigido', a: 'Perfil', t: 'A figura escolhida para o avatar chega ao servidor. Ficava só no aparelho onde se escolheu, e o outro telemóvel continuava a ver a inicial' },
  { v: '1.11.1', d: '10/09/2026', k: 'alterado', a: 'A App', t: 'Na app da criança o cabeçalho e o rodapé passam a ter a cor do esquema, como nos adultos. Tinham a cor da criança e não mudavam com o esquema; essa cor fica agora na bola do avatar, que é o que diz quem entrou' },
  { v: '1.11.1', d: '10/09/2026', k: 'corrigido', a: 'A App', t: 'A app da criança segue o esquema de cor guardado para ela, como já seguia o aspeto claro ou escuro. Ficava sempre em Violeta, fosse qual fosse a preferência no servidor' },
  { v: '1.11.1', d: '10/09/2026', k: 'corrigido', a: 'A App', t: 'A data passa sozinha à meia-noite: a app deixada aberta dizia «Quarta, 09/09» na quinta até recarregar. Agora confere o dia a cada meio minuto e ao voltar à frente, sem recarregar nem reiniciar a sessão' },
  { v: '1.11.1', d: '10/09/2026', k: 'alterado', a: 'Dinheiro', t: 'Os cofres das crianças vivem no Dinheiro, como «Cofres das Crianças»: uma linha por criança com os pontos por pagar e o saldo, e a linha abre o cofre. Estavam nas Tarefas, onde só a origem dos pontos fazia sentido' },
  { v: '1.11.1', d: '10/09/2026', k: 'alterado', a: 'Tarefas', t: 'O cartão «Semanada das Crianças» saiu — o dinheiro é do Dinheiro. Os pontos de cada tarefa continuam na linha, e o filtro por membro mostra as de cada criança' },
  // O varrimento continuou pelas folhas da Gestão, do Perfil e das tarefas. E
  // o dono da casa achou os títulos de secção grandes e os cartões a mais:
  // cinco alternativas em `design/titulos-e-cartoes.dc.html`, escolheu a C.
  { v: '1.11.1', d: '09/09/2026', k: 'alterado', a: 'A App', t: 'Os títulos de secção passaram de 20 px a negro para uma linha de 13 px na cor do perfil, com uma régua por baixo — pesavam mais do que o que rotulavam' },
  { v: '1.11.1', d: '09/09/2026', k: 'alterado', a: 'A App', t: 'As listas deixaram de ter um cartão por item: as linhas assentam na página, separadas por divisórias, e a cor do estado passa para uma faixa à esquerda — Agenda, Início, Tarefas, Compras, Dinheiro, Gestão, Saúde, Equipamentos, Perfil e modo criança' },
  { v: '1.11.1', d: '09/09/2026', k: 'corrigido', a: 'A App', t: 'A Gestão, a Saúde e os outros ecrãs inteiros abertos a partir do Início ficavam sem o avatar no cabeçalho — e sem caminho para o Perfil; o avatar está lá venha-se de onde se vier' },
  { v: '1.11.1', d: '09/09/2026', k: 'alterado', a: 'Entrada', t: 'A criança entra com o PIN verificado no servidor — o PIN deixou de ser comparado no telemóvel — e «ainda sem PIN» passa a ser o que o servidor sabe, em todos os telemóveis' },
  { v: '1.11.1', d: '09/09/2026', k: 'novo', a: 'Entrada', t: 'No modo criança, tocar na bola do nome abre «O meu PIN»: a criança muda o seu PIN sabendo o atual; sem o atual, é um adulto que define outro na Gestão da Casa' },
  { v: '1.11.1', d: '09/09/2026', k: 'corrigido', a: 'Entrada', t: 'No modo criança, o cabeçalho e o rodapé levam a cor da criança escurecida até o branco se ler por cima — o azul do Léo dava 3,2 de contraste com o «Olá, Léo», o resumo e os rótulos; e a inicial passa a ler-se na bola' },
  { v: '1.11.1', d: '09/09/2026', k: 'corrigido', a: 'Entrada', t: 'No monitor, o modo criança ia de ponta a ponta da janela; passa a viver na mesma coluna que a app dos adultos' },
  { v: '1.11.1', d: '09/09/2026', k: 'corrigido', a: 'A App', t: 'Três textos pequenos na cor do perfil abaixo do contraste mínimo, apanhados no varrimento: o «livre» do envelope escolhido ao registar despesa, o «Confirmar» de um artigo sem stock no Modo Compras, e «Pagar Semanada» no cofre' },
  { v: '1.11.1', d: '09/09/2026', k: 'alterado', a: 'Saúde', t: 'As consultas do arquivo clínico passaram a linhas planas, como o resto das listas' },
  { v: '1.11.1', d: '09/09/2026', k: 'corrigido', a: 'Agenda', t: 'O rótulo lido em voz de um dia da semana dizia «1 eventos»' },
  { v: '1.11.1', d: '09/09/2026', k: 'alterado', a: 'A App', t: 'Todos os campos de texto passaram a ter um rótulo lido em voz — eram 33 sem ele; um leitor de ecrã dizia só «campo de texto»' },
  { v: '1.11.1', d: '09/09/2026', k: 'corrigido', a: 'Gestão da Casa', t: 'Os campos de texto das folhas do envelope e da loja tinham 36 px de altura, abaixo dos 44 mínimos para o dedo; passam aos 44, e ganham rótulo em voz' },
  { v: '1.11.1', d: '09/09/2026', k: 'corrigido', a: 'A App', t: 'No aspeto escuro, quatro botões e linhas pintados com o tijolo claro de informação ou de aviso ficavam com texto claro por cima — «Agendar Manutenção», «Pagar Semanada», um artigo sem stock no Modo Compras, a próxima consulta na ficha. Passam aos preenchimentos do botão comum e às tintas que escurecem' },
  { v: '1.11.1', d: '09/09/2026', k: 'corrigido', a: 'Compras', t: 'Os artigos do Modo Compras passaram a linhas planas de 64 px; o estado é a faixa à esquerda, e o «sem stock» deixou de pintar a linha inteira de âmbar' },
  { v: '1.11.1', d: '09/09/2026', k: 'corrigido', a: 'A App', t: 'Na web, uma folha aberta por cima de outra — o avatar sobre o Perfil — podia ficar presa fora do ecrã, invisível; as folhas abrem sem animação na web e continuam a deslizar no telemóvel' },
  { v: '1.11.1', d: '09/09/2026', k: 'corrigido', a: 'Gestão da Casa', t: 'Na lista de envelopes da Gestão, o limite e o que está livre colavam-se num número só — «590,00 €43,40 €»; a linha passa a ocupar o cartão todo' },

  // ── 1.11.0 ────────────────────────────────────────────────────────────────
  // As metas em euros, as compras que se arrumam, e a cor que faltava aos
  // botões. E um varrimento com a casa a sério apanhou uma escrita que se
  // perdia em silêncio.
  { v: '1.11.0', d: '08/09/2026', k: 'novo', a: 'Dinheiro', t: 'As metas da família: criar, reforçar e ver de onde veio o dinheiro — tudo em euros, e o juntado é a soma dos reforços' },
  { v: '1.11.0', d: '08/09/2026', k: 'alterado', a: 'Dinheiro', t: 'Fechar o mês pode levar o saldo para uma meta, no valor que quem administra escolher — e não numa percentagem' },
  { v: '1.11.0', d: '08/09/2026', k: 'alterado', a: 'A App', t: 'Os botões seguem a cor do perfil escolhido; deixou de haver botões pretos' },
  { v: '1.11.0', d: '08/09/2026', k: 'corrigido', a: 'A App', t: 'O texto pequeno lê-se no aspeto escuro e nos seis esquemas: as datas em atraso, os valores a verde, os dias da agenda e as etiquetas estavam abaixo do contraste mínimo — medido tema a tema' },
  { v: '1.11.0', d: '08/09/2026', k: 'alterado', a: 'A App', t: 'Um botão que ainda não pode agir fica na cor do perfil, com o contorno tracejado, em vez de cinzento — a folha do artigo abria sem uma cor do perfil à vista' },
  { v: '1.11.0', d: '08/09/2026', k: 'corrigido', a: 'A App', t: 'Nos esquemas de cabeçalho claro — Cinza, Menta, Rosa, Cião — o subtítulo do cabeçalho e os rótulos do rodapé ficavam abaixo do contraste mínimo; o branco passa a calcular-se para o cumprir' },
  { v: '1.11.0', d: '08/09/2026', k: 'corrigido', a: 'Dinheiro', t: 'As barras dos envelopes não enchiam: os envelopes da casa vêm sem cor e a barra pintava-se com nada — passam a usar a cor do perfil' },
  { v: '1.11.0', d: '08/09/2026', k: 'alterado', a: 'A App', t: 'Uma escolha marcada — a urgência, o responsável, «com prazo», o aspeto, o interruptor ligado — fica na cor do perfil, e não na cor escura do cabeçalho' },
  { v: '1.11.0', d: '08/09/2026', k: 'alterado', a: 'Compras', t: 'Ao acrescentar um artigo, o primeiro corredor já vem escolhido — a escolha que a app fazia em silêncio passa a ver-se, e muda-se' },
  { v: '1.11.0', d: '08/09/2026', k: 'corrigido', a: 'Início', t: 'No «Precisa de Si» a faixa e o ícone de cada aviso são duas cores, como no desenho: a faixa das linhas cinzentas era da cor do ícone e ficava quase preta ao lado das coloridas' },
  { v: '1.11.0', d: '08/09/2026', k: 'novo', a: 'Compras', t: 'Um artigo altera-se — nome, corredor, estimativa, habitual — e arrasta-se para mudar a ordem dentro do corredor' },
  { v: '1.11.0', d: '08/09/2026', k: 'novo', a: 'Compras', t: '«Como fazemos compras»: quem vai, quando e a que loja, e os corredores da loja pela ordem em que se anda neles' },
  { v: '1.11.0', d: '08/09/2026', k: 'corrigido', a: 'Compras', t: 'Passar um artigo de corredor ficava só neste telemóvel: duas escritas no mesmo instante e a primeira perdia-se em silêncio' },
  { v: '1.11.0', d: '08/09/2026', k: 'alterado', a: 'Compras', t: 'No Modo Compras a loja e os separadores por corredor ficam por cima da lista, e a lista rola por baixo — deixou de ser preciso voltar ao topo para mudar de corredor' },
  { v: '1.11.0', d: '07/09/2026', k: 'corrigido', a: 'Saúde', t: 'Cada nota de uma consulta diz de quem é e quando foi escrita; só quem a escreveu a altera, e uma criança não escreve notas noutra' },
  { v: '1.11.0', d: '07/09/2026', k: 'alterado', a: 'Dinheiro', t: 'O orçamento fala só em euros: saíram as percentagens da frase do rendimento e dos envelopes' },

  // ── 1.10.0 ────────────────────────────────────────────────────────────────
  // A casa encheu-se de dados a sério — três meses de despesas, quatro
  // consultas, dezoito artigos — e cinco defeitos apareceram que nenhuma prova
  // via com a casa vazia. São estes.
  { v: '1.10.0', d: '06/09/2026', k: 'alterado', a: 'A App', t: 'A app abre mais depressa: o registo da casa deixou de vir todo de cada vez' },
  { v: '1.10.0', d: '06/09/2026', k: 'corrigido', a: 'Agenda', t: 'Mudar o responsável ou a etiqueta de um evento ficava só neste telemóvel' },
  { v: '1.10.0', d: '06/09/2026', k: 'corrigido', a: 'Dinheiro', t: 'Uma despesa sem data contava no total de todos os meses' },
  { v: '1.10.0', d: '06/09/2026', k: 'corrigido', a: 'Dinheiro', t: 'O gasto de um envelope era o do mês inteiro, e não o do envelope' },
  { v: '1.10.0', d: '06/09/2026', k: 'corrigido', a: 'Tarefas', t: 'As tarefas de hoje não apareciam no Início quando vinham do servidor' },

  // ── 1.9.0 ─────────────────────────────────────────────────────────────────
  // A casa deixou de viver em cada telemóvel e passou a viver num servidor
  // próprio. Quase tudo o que está aqui é consequência disso: o que dois
  // telefones já não se anulam, e o que passou a ser visto pelos dois.
  { v: '1.9.0', d: '05/09/2026', k: 'novo', a: 'A App', t: 'A casa passou a viver num servidor próprio: dois telemóveis vêem as mesmas tarefas, as mesmas compras e o mesmo dinheiro' },
  { v: '1.9.0', d: '05/09/2026', k: 'novo', a: 'Documentação', t: '«Nesta casa» diz o que a família fez: quem mudou o quê, e quando' },
  { v: '1.9.0', d: '05/09/2026', k: 'novo', a: 'Documentação', t: 'O registo filtra-se por área e por pessoa, e tocar numa linha leva ao ecrã de que ela fala' },
  { v: '1.9.0', d: '05/09/2026', k: 'alterado', a: 'Documentação', t: 'O «Como funciona» passou a descrever o âmbito da app e o que cada área faz' },
  { v: '1.9.0', d: '05/09/2026', k: 'novo', a: 'Tarefas', t: 'A ordem à mão das tarefas é da casa: quem arrasta muda a lista dos dois' },
  { v: '1.9.0', d: '05/09/2026', k: 'corrigido', a: 'Tarefas', t: 'A semanada podia ser paga duas vezes — o segundo adulto não via que já tinha sido paga' },
  { v: '1.9.0', d: '05/09/2026', k: 'corrigido', a: 'Compras', t: 'Dois adultos na mesma loja apagavam as marcações um do outro; agora cada um marca a sua linha' },
  { v: '1.9.0', d: '05/09/2026', k: 'corrigido', a: 'Dinheiro', t: 'Dois telemóveis a mover dinheiro entre envelopes anulavam-se; agora somam-se' },
  { v: '1.9.0', d: '05/09/2026', k: 'alterado', a: 'Dinheiro', t: 'O mês do orçamento passou a ser uma linha que abre e fecha — o mês novo começa do zero sem apagar o anterior' },
  { v: '1.9.0', d: '05/09/2026', k: 'alterado', a: 'Dinheiro', t: 'Os valores escrevem-se à mão, além de subirem e descerem ao toque' },
  { v: '1.9.0', d: '05/09/2026', k: 'novo', a: 'Perfil', t: 'O esquema de cor e o aspeto seguem a pessoa, e não o telemóvel onde entrou' },
  { v: '1.9.0', d: '05/09/2026', k: 'corrigido', a: 'Entrada', t: 'Uma oscilação da rede terminava a sessão e obrigava a entrar outra vez' },

  { v: '1.9.0', d: '04/09/2026', k: 'novo', a: 'Gestão da Casa', t: 'As lojas, as categorias de equipamento e as especialidades são da casa, e não de cada telemóvel' },
  { v: '1.9.0', d: '04/09/2026', k: 'alterado', a: 'Tarefas', t: 'Os pontos passaram a ser opcionais: uma tarefa pode não valer nada' },

  // ── 1.8.0 ─────────────────────────────────────────────────────────────────
  { v: '1.8.0', d: '02/09/2026', k: 'novo', a: 'Perfil', t: 'O avatar escolhe-se: dezasseis figuras, a cor do perfil, ou a fotografia da conta Google' },
  { v: '1.8.0', d: '02/09/2026', k: 'novo', a: 'Perfil', t: 'A fotografia da conta Google traz-se sem terminar a sessão' },
  { v: '1.8.0', d: '02/09/2026', k: 'alterado', a: 'Perfil', t: 'O ecrã passou a cinco secções com nome — A Casa, Aparência, Avisos, A App e Apagar Dados' },
  { v: '1.8.0', d: '02/09/2026', k: 'alterado', a: 'Perfil', t: '«Repor Dados de Demonstração» e «Começar de Zero» deixaram de apagar ao toque: pedem a confirmação de todos os administradores da casa' },
  { v: '1.8.0', d: '02/09/2026', k: 'corrigido', a: 'Perfil', t: 'A fotografia da conta ficava guardada e não aparecia em lado nenhum' },
  { v: '1.8.0', d: '02/09/2026', k: 'alterado', a: 'Início', t: 'O avatar passou para junto do nome, e é ele que abre o Perfil' },
  { v: '1.8.0', d: '02/09/2026', k: 'alterado', a: 'Início', t: 'Os dois atalhos do topo saíram: levavam aos mesmos ecrãs que o rodapé e ocupavam o lugar do «Precisa de Si»' },
  { v: '1.8.0', d: '02/09/2026', k: 'alterado', a: 'Tarefas', t: 'Dentro de cada grupo de urgência, a lista passou a ordenar-se pelo prazo — quem acaba primeiro aparece primeiro' },
  { v: '1.8.0', d: '02/09/2026', k: 'alterado', a: 'Início', t: 'Terminar sessão passou para o cabeçalho, à direita — deixou de ser preciso abrir o Perfil para sair' },
  { v: '1.8.0', d: '02/09/2026', k: 'alterado', a: 'A App', t: 'O modo escuro segue o esquema de cor escolhido — a página deixou de ser azul-marinho para os seis' },
  { v: '1.8.0', d: '02/09/2026', k: 'corrigido', a: 'A App', t: 'O rodapé não levava onde dizia: com a Saúde, os Equipamentos, a Gestão ou a Documentação abertos, tocar num separador não saía de lá' },
  { v: '1.8.0', d: '02/09/2026', k: 'corrigido', a: 'A App', t: 'A seta de voltar estava dez pixels mais perto da borda do que todo o resto do ecrã' },
  { v: '1.8.0', d: '02/09/2026', k: 'corrigido', a: 'A App', t: 'As folhas abriam a ocupar a janela toda no monitor, em vez de ficarem dentro da app' },
  { v: '1.8.0', d: '02/09/2026', k: 'corrigido', a: 'A App', t: 'Botões, pastilhas e interruptores mais pequenos do que o mínimo para o dedo — em cinco ecrãs' },
  { v: '1.8.0', d: '02/09/2026', k: 'alterado', a: 'A App', t: 'A marca da casa no cabeçalho ganhou as suas cores, em vez de um cinzento só' },
  { v: '1.8.0', d: '02/09/2026', k: 'corrigido', a: 'A App', t: 'A marca do cabeçalho ficava por fora da coluna e era cortada em quatro dos cinco separadores' },
  { v: '1.8.0', d: '02/09/2026', k: 'corrigido', a: 'A App', t: 'O avatar mudava de tamanho ao mudar de separador — 44 no Início e 36 nos outros' },
  { v: '1.8.0', d: '02/09/2026', k: 'novo', a: 'Tarefas', t: 'Uma tarefa apaga-se — e os pontos que ela já rendeu ficam com a criança' },
  { v: '1.8.0', d: '02/09/2026', k: 'corrigido', a: 'Tarefas', t: 'Toda a tarefa criada na app dizia «undefined» por baixo do título' },
  { v: '1.8.0', d: '02/09/2026', k: 'corrigido', a: 'Tarefas', t: 'Uma criança acrescentada à casa mostrava «NaN pt» na semanada' },
  { v: '1.8.0', d: '02/09/2026', k: 'corrigido', a: 'Tarefas', t: 'A folha do cofre de uma criança abria em branco' },
  { v: '1.8.0', d: '02/09/2026', k: 'novo', a: 'Compras', t: 'Um artigo apaga-se da lista — e os preços que a casa já registou para ele ficam' },
  { v: '1.8.0', d: '02/09/2026', k: 'corrigido', a: 'Compras', t: 'A lista deixava de abrir depois de a casa ter preços registados' },
  { v: '1.8.0', d: '02/09/2026', k: 'corrigido', a: 'Saúde', t: 'Marcar consulta abria um ecrã em branco' },
  { v: '1.8.0', d: '02/09/2026', k: 'alterado', a: 'Saúde', t: 'As especialidades médicas passaram a ser geridas num sítio só — em Marcar Consulta, onde aparecem' },
  { v: '1.8.0', d: '02/09/2026', k: 'corrigido', a: 'Saúde', t: 'Apagar uma especialidade pergunta primeiro, e diz que as consultas já marcadas com ela ficam' },
  { v: '1.8.0', d: '02/09/2026', k: 'corrigido', a: 'Saúde', t: 'O botão de apagar uma especialidade era menor do que o mínimo para o dedo' },
  { v: '1.8.0', d: '02/09/2026', k: 'corrigido', a: 'Saúde', t: 'Renomear uma especialidade trocava o nome na lista e deixava as consultas a apontar para um nome que já não existia' },
  { v: '1.8.0', d: '02/09/2026', k: 'corrigido', a: 'Saúde', t: 'Marcar consulta não punha nada na ficha — o ecrã dizia «Use Marcar Consulta para a primeira» e usá-lo não punha lá nada' },
  { v: '1.8.0', d: '02/09/2026', k: 'corrigido', a: 'Saúde', t: 'A consulta de uma criança aparecia na agenda das outras crianças, e a de um adulto aparecia ao outro' },
  { v: '1.8.0', d: '02/09/2026', k: 'corrigido', a: 'Saúde', t: 'Marcar consulta deixava escolher o outro adulto, cuja ficha não se pode ver' },
  { v: '1.8.0', d: '03/09/2026', k: 'novo', a: 'Saúde', t: 'Médico ou clínica ao marcar uma consulta — o nome passa a aparecer na ficha, no histórico e no PDF exportado' },
  { v: '1.8.0', d: '03/09/2026', k: 'novo', a: 'Saúde', t: 'Nota ao marcar uma consulta, para o que é preciso levar ou saber' },
  { v: '1.8.0', d: '03/09/2026', k: 'novo', a: 'Saúde', t: 'Marcar uma consulta diz quem a vai ver, antes de a marcar' },
  { v: '1.8.0', d: '03/09/2026', k: 'alterado', a: 'Saúde', t: 'O botão passou a «Marcar e Pôr na Agenda», e o «Gerir» das especialidades está ao lado do título' },
  { v: '1.8.0', d: '03/09/2026', k: 'corrigido', a: 'Saúde', t: 'O cartão de uma consulta não abria — «Resolvida», «Pendente», as notas e as receitas eram inalcançáveis' },
  { v: '1.8.0', d: '03/09/2026', k: 'corrigido', a: 'Saúde', t: 'Uma criança recebia a sua própria ficha do servidor; era só a interface a esconder-lha' },
  { v: '1.8.0', d: '03/09/2026', k: 'novo', a: 'Saúde', t: 'As consultas passam a ficar no servidor da casa — e só nele, nunca num servidor fora de casa' },
  { v: '1.8.0', d: '03/09/2026', k: 'alterado', a: 'Saúde', t: 'O dia e a hora de uma consulta passaram a um só campo, e a hora escolhe-se em vez de se escrever' },
  { v: '1.8.0', d: '03/09/2026', k: 'novo', a: 'Saúde', t: 'Anexar um exame, uma receita ou um relatório a uma consulta' },
  { v: '1.8.0', d: '03/09/2026', k: 'novo', a: 'Saúde', t: 'Arquivar uma consulta — sai da lista, não se apaga, e volta com um toque' },
  { v: '1.8.0', d: '03/09/2026', k: 'novo', a: 'Saúde', t: 'Fotografar o exame ou a receita, e a fotografia fica guardada no servidor da casa' },
  { v: '1.8.0', d: '03/09/2026', k: 'novo', a: 'Saúde', t: 'Um anexo que ainda só existe no telemóvel diz «só aqui», em vez de parecer guardado' },
  { v: '1.8.0', d: '02/09/2026', k: 'corrigido', a: 'Gestão da Casa', t: 'As abas tinham espaços mortos entre elas, e um toque ali não acertava em nenhuma' },
  { v: '1.8.0', d: '02/09/2026', k: 'corrigido', a: 'Gestão da Casa', t: 'A faixa de abas cortava a última no telemóvel — «Especialidades» perdia o fim da palavra' },
  // ── 1.7.0 ─────────────────────────────────────────────────────────────────
  { v: '1.7.0', d: '01/09/2026', k: 'corrigido', a: 'A App', t: 'A data era 20 de agosto, sempre — o cabeçalho, os prazos e as garantias contavam a partir daí' },
  { v: '1.7.0', d: '01/09/2026', k: 'corrigido', a: 'Início', t: '«Bom dia» aparecia a qualquer hora, e uma tarefa das 18:00 dizia sempre «falta 3h30»' },
  { v: '1.7.0', d: '01/09/2026', k: 'alterado', a: 'Perfil', t: 'Três esquemas de cor novos — Rosa, Menta e Cinza — com cabeçalhos mais claros' },
  { v: '1.7.0', d: '01/09/2026', k: 'alterado', a: 'Perfil', t: 'A bola do esquema mostra as duas cores separadas na diagonal' },
  { v: '1.7.0', d: '01/09/2026', k: 'novo', a: 'Agenda', t: 'A autorização da agenda da Google liga-se uma vez e fica — deixou de a pedir a cada sessão' },
  { v: '1.7.0', d: '01/09/2026', k: 'corrigido', a: 'Entrada', t: 'O servidor em baixo dizia que a Google não estava configurada; agora diz o que é' },
  { v: '1.7.0', d: '01/09/2026', k: 'corrigido', a: 'Dinheiro', t: 'Abrir o mês punha sempre «Setembro», qualquer que fosse o mês' },
  { v: '1.7.0', d: '01/09/2026', k: 'corrigido', a: 'Tarefas', t: '«Cofre do Mia» — o artigo passa a acompanhar o género de cada membro' },

  // ── 1.6.0 ─────────────────────────────────────────────────────────────────
  { v: '1.6.0', d: '31/08/2026', k: 'novo', a: 'Agenda', t: 'Eventos editam-se e apagam-se, e vão para a agenda da Google nos dois sentidos' },
  { v: '1.6.0', d: '31/08/2026', k: 'novo', a: 'Agenda', t: 'Visibilidade com três níveis: toda a família, só os adultos, ou só eu' },
  { v: '1.6.0', d: '31/08/2026', k: 'corrigido', a: 'Agenda', t: 'Guardar um evento não fazia nada — gravava num campo que nenhum ecrã lê' },
  { v: '1.6.0', d: '31/08/2026', k: 'novo', a: 'Saúde', t: 'Exportar fichas em PDF: uma consulta, uma especialidade, ou tudo' },
  { v: '1.6.0', d: '31/08/2026', k: 'novo', a: 'Saúde', t: 'O PDF pode seguir por correio para outro adulto da casa' },
  { v: '1.6.0', d: '31/08/2026', k: 'novo', a: 'Compras', t: 'O preço escreve-se no corredor, e a ida seguinte já o sabe' },
  { v: '1.6.0', d: '31/08/2026', k: 'novo', a: 'Compras', t: 'A lista diz em que loja sai mais barata, sobre os artigos que conhece nas duas' },
  { v: '1.6.0', d: '31/08/2026', k: 'novo', a: 'A App', t: 'Instala-se no telemóvel a partir do navegador, sem loja de aplicações' },
  { v: '1.6.0', d: '31/08/2026', k: 'novo', a: 'A App', t: 'Datas escrevem-se à mão ou escolhem-se no calendário, em todos os ecrãs' },
  { v: '1.6.0', d: '31/08/2026', k: 'alterado', a: 'A App', t: 'Uma secção sem nada mostra um aviso, em vez de um título a apontar para o vazio' },
  { v: '1.6.0', d: '31/08/2026', k: 'alterado', a: 'Início', t: 'Tocar num evento ou numa tarefa leva ao ecrã dele, já aberto' },
  { v: '1.6.0', d: '31/08/2026', k: 'corrigido', a: 'Entrada', t: 'Entrar com a conta Google — três defeitos, nenhum na configuração' },
  { v: '1.6.0', d: '31/08/2026', k: 'corrigido', a: 'Dinheiro', t: 'Uma casa nova já não herdava o orçamento da família de demonstração' },

  // ── 1.5.0 ─────────────────────────────────────────────────────────────────
  { v: '1.5.0', d: '30/08/2026', k: 'novo', a: 'Gestão da Casa', t: 'A casa configura-se: nome, membros, papéis e quem sai' },
  { v: '1.5.0', d: '30/08/2026', k: 'novo', a: 'Gestão da Casa', t: 'Renomear um membro leva com ele as tarefas, as despesas e o cofre' },
  { v: '1.5.0', d: '30/08/2026', k: 'alterado', a: 'A App', t: 'A casa deixou de ser quatro nomes escritos no código' },

  { v: '1.4.0', d: '25/08/2026', k: 'novo', a: 'Documentação', t: 'Registo de versões e Como funciona, gerados deste registo' },
  { v: '1.4.0', d: '25/08/2026', k: 'novo', a: 'Saúde', t: 'Ficha por membro com episódios, anexos e notas' },
  { v: '1.4.0', d: '25/08/2026', k: 'novo', a: 'Saúde', t: 'Especialidades geridas na Gestão da Casa' },
  { v: '1.4.0', d: '25/08/2026', k: 'alterado', a: 'Compras', t: 'Listas acima de 5 linhas paginam; 10 por página no modo de loja' },
  { v: '1.4.0', d: '25/08/2026', k: 'alterado', a: 'Perfil', t: 'Aspeto e Esquema de Cor num só bloco, com três ícones' },
  { v: '1.4.1', d: '25/08/2026', k: 'alterado', a: 'Perfil', t: 'Gestão da Casa e Saúde com ícones próprios: houseGear e heartPulse' },
  { v: '1.4.1', d: '25/08/2026', k: 'novo', a: 'A App', t: 'Marca da casa no arranque, no ecrã de entrada e no resumo diário' },
  { v: '1.4.1', d: '25/08/2026', k: 'alterado', a: 'Gestão da Casa', t: 'Divisão das despesas passou a alternador' },
  { v: '1.4.1', d: '25/08/2026', k: 'alterado', a: 'Entrada', t: 'Painéis de vidro passaram de preto a Storm Blue — a cor do cabeçalho onde se entra' },
  { v: '1.4.1', d: '26/08/2026', k: 'alterado', a: 'Perfil', t: 'Escala de espaçamento única (2/4/8/16/24) e entradas da casa num só contentor' },
  { v: '1.4.2', d: '26/08/2026', k: 'corrigido', a: 'Gestão da Casa', t: 'PIN sem valor de fábrica, definido por um adulto e nunca mostrado em claro' },
  { v: '1.4.2', d: '26/08/2026', k: 'alterado', a: 'Gestão da Casa', t: 'Membros: a linha abre a ficha, com PIN e papel como linhas dentro dela' },
  { v: '1.4.2', d: '26/08/2026', k: 'corrigido', a: 'Gestão da Casa', t: 'Cinco tentativas de PIN erradas bloqueiam o perfil por um minuto' },
  { v: '1.4.1', d: '26/08/2026', k: 'corrigido', a: 'Perfil', t: 'Documentação passou a linha do bloco A App e os Dados' },
  { v: '1.4.1', d: '25/08/2026', k: 'alterado', a: 'Gestão da Casa', t: 'Concluir removido — a folha grava ao toque e fecha pelo ✕ do cabeçalho' },
  { v: '1.4.1', d: '25/08/2026', k: 'alterado', a: 'Gestão da Casa', t: 'Valor do ponto livre entre 0,01 e 5,00 €; semanada em qualquer dia da semana' },
  { v: '1.4.0', d: '25/08/2026', k: 'corrigido', a: 'Agenda', t: 'Consultas da Saúde passam a aparecer na Agenda de Hoje' },
  { v: '1.4.0', d: '25/08/2026', k: 'corrigido', a: 'Início', t: 'Rodapé desaparecia em algumas janelas — a raiz fechava cedo' },
  { v: '1.4.0', d: '25/08/2026', k: 'corrigido', a: 'Perfil', t: 'Subtítulo do cabeçalho ilegível nos esquemas mais claros' },
  { v: '1.3.0', d: '24/08/2026', k: 'novo', a: 'Dinheiro', t: 'Registar Despesa fora das compras, com envelope e divisão' },
  { v: '1.3.0', d: '24/08/2026', k: 'novo', a: 'Dinheiro', t: 'Fecho do mês guarda o que foi gasto por envelope' },
  { v: '1.3.0', d: '24/08/2026', k: 'novo', a: 'Tarefas', t: 'Prazo com aviso, e urgência que ordena a lista' },
  { v: '1.3.0', d: '24/08/2026', k: 'alterado', a: 'Gestão da Casa', t: 'Papéis editáveis, com validação das transições possíveis' },
  { v: '1.3.0', d: '24/08/2026', k: 'alterado', a: 'Perfil', t: 'Terminar sessão passou a ícone no cabeçalho da folha' },
  { v: '1.2.0', d: '22/08/2026', k: 'novo', a: 'Compras', t: 'Carrinho, últimas 10 compras e preço habitual de cada artigo' },
  { v: '1.2.0', d: '22/08/2026', k: 'novo', a: 'Compras', t: 'Lojas com a sua própria ordem de corredor' },
  { v: '1.2.0', d: '22/08/2026', k: 'alterado', a: 'Compras', t: 'Aba Todos no modo de loja, para não andar secção a secção' },
  { v: '1.2.0', d: '22/08/2026', k: 'alterado', a: 'Dinheiro', t: 'Valores escritos à mão em vez de montantes fixos' },
  { v: '1.1.0', d: '21/08/2026', k: 'novo', a: 'Equipamentos', t: 'Compra, fatura, garantia e manutenções agendadas' },
  { v: '1.1.0', d: '21/08/2026', k: 'novo', a: 'Gestão da Casa', t: 'Rendimento, semanada, divisão e envelopes, só para quem administra' },
  { v: '1.1.0', d: '21/08/2026', k: 'novo', a: 'Tarefas', t: 'Modo criança com PIN: só as suas tarefas e o seu cofre' },
  { v: '1.0.0', d: '20/08/2026', k: 'novo', a: 'Início', t: 'Cinco separadores: Início, Dinheiro, Tarefas, Compras e Agenda' },
  { v: '1.0.0', d: '20/08/2026', k: 'novo', a: 'Agenda', t: 'Calendário com mês expansível e visibilidade por evento' },
  { v: '1.0.0', d: '20/08/2026', k: 'novo', a: 'Perfil', t: 'Entrada com conta Google, dados guardados no dispositivo' },
];

// Novo / Alterado / Corrigido. As cores vêm do tema em quem desenha.
export const TIPOS = {
  novo:      'Novo',
  alterado:  'Alterado',
  corrigido: 'Corrigido',
};
