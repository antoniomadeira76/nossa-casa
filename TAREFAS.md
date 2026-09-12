# Checklist de Implementação vs Especificação

## 1. NAVEGAÇÃO & LAYOUT ✅
- [x] Navbar Storm Blue com linhas de largura total
- [x] Menu inferior de cinco entradas (Início, Dinheiro, Tarefas, Compras, Agenda)
- [x] Cinco separadores ligados com estado partilhado
- [x] Avatar no cabeçalho para Gestão da Casa e Perfil

## 2. AUTENTICAÇÃO & ENTRADA
- [x] Entrar — Continuar com Google
- [x] Modo Criança — PIN de 4 dígitos
- [ ] **PENDENTE:** Ao entrar — popup do evento novo do Google Calendar (Adicionar, Adicionar Só para Mim, Ignorar)

## 3. DINHEIRO & FINANÇAS
- [x] Registar Despesa — valor, envelope, quem pagou
- [x] Acertar Contas — pagamento parcial (Tudo, Metade, Valor)
- [ ] **PENDENTE:** Limite de um envelope — toque para mudar contra rendimento
- [ ] **PENDENTE:** Mover Dinheiro — toque no envelope ou botão Mover
- [x] **O ORÇAMENTO vive na base de dados** (05/09/2026), com **13 provas** em
      `provar-orcamento.mjs`.
      - os envelopes eram **sementes no código** (`ENV_BASE`): a lista da casa
        não existia em lado nenhum, e «criar um envelope» acrescentava uma
        chave a um mapa de limites — que o ecrã nem sequer lia. Agora vêm do
        servidor quando há um, e as sementes ficam para quem corre sem rede.
      - ⚠ **e o `envMove` era um SALDO ESCRITO.** Um mapa `nome → número` que
        cada telefone reescrevia por inteiro: se a Rita movesse 50 € da
        Mercearia para o Lazer e o Tomás 30 € do Lazer para a Casa, o último a
        gravar apagava o outro. É o INVARIANTE #2 ao contrário, e o CLAUDE.md
        descreve esta consequência exacta — «a diferença entre uma app que
        funciona a dois e uma que perde dinheiro».
        Passou a ser a **soma das `transferencias`**, que são aditivas e têm
        chave de idempotência. Há uma prova que move dos dois telemóveis e
        exige que as duas contem, e outra que exige que a soma de todos os
        ajustes seja **zero** — mover dinheiro redistribui, não cria.
      - ⚠ **quinto** buraco de casa-cruzada, e nos dois sítios onde há dinheiro:
        `transferencias.de_envelope`/`para_envelope` e `despesas.envelope`. Uma
        adulta de outra casa movia dinheiro entre os envelopes desta, e lançava
        despesas contra eles — e o orçamento desta família mostrava-as gastas.
      - **falta**: os limites do mês (`meses.limites`), o abrir e o fechar do
        mês, e o apagar de um envelope pela interface.
- [x] Dinheiro — ver envelope Mercearia após compras
- [x] Marcar como Pago — acertar contas
- [x] **Contas fixas com prazo** (12/09/2026, a quarta das dez funcionalidades de
      `design/dez-funcionalidades.dc.html`). Coleção `contas_fixas` (nome, valor, dia do
      mês, envelope, quem paga) e o campo `despesas.conta_fixa`, nos dois sítios.
      - ⚠ **«paga» não é um campo**: é a despesa do mês com `conta_fixa` a apontar
        (INVARIANTE #2). Marcar como paga regista uma despesa NORMAL — o gasto e o
        acerto mexem — e a segunda do mês colide na chave `conta-fixa:<id>:<AAAA-MM>`,
        que é o índice `(casa, idem_key)` que as despesas já tinham. A fila trata a
        colisão como «já lá está», e é isso mesmo.
      - o vencimento respeita o mês: a conta do dia 31 vence a 30 de setembro.
      - a Agenda mostra a conta no dia (este mês e o seguinte), sem a deixar editar; o
        «Precisa de Si» avisa dois dias antes e fica a vermelho depois de vencer. A
        criança não recebe a lista — é orçamento — nem do servidor nem da loja.
      - guarda: `__tests__/as-contas-fixas.test.js`; provas: `provar-contas-fixas.mjs`
        (11) e três ataques novos em `provar-relacoes-ancoradas.mjs`.
      - visto no navegador como António (12/09/2026): a secção com o aviso de vazio e
        «acrescentar conta fixa», rodapé no sítio. ⚠ Só à segunda: o painel esteve a
        servir o bundle do checkout PRINCIPAL por causa de uma junção do `node_modules`
        no worktree — ver a classe 38 e seguintes na memória.
- [ ] **PENDENTE:** Abrir o mês — distribuir rendimento e reiniciar
- [ ] **PENDENTE:** Fecho do mês — arquivar e 30% para metas

## 4. GESTÃO DA CASA (Admin)
- [x] Gestão da Casa — no avatar (rendimento, semanada, divisão, envelopes)
- [ ] **PENDENTE:** Papéis — toque na pílula para mudar (Administração, confirmar mudança)
- [ ] **PENDENTE:** Lojas — criar, renomear, apagar supermercados
- [ ] **PENDENTE:** Membros e PIN — definir PIN das crianças (rejeita iguais, sequências)
- [x] Especialidades — em Marcar Consulta, no «Gerir» ao lado do campo (secção 8)

## 5. TAREFAS & PONTOS
- [x] Tarefas — toque para concluir, pontos recalculam
- [x] **As tarefas e a agenda SOBEM** (04/09/2026). Até aqui a base de dados
      tinha 31 coleções e o cliente escrevia em **10**: as tarefas e a agenda —
      as duas coisas para que a app mais serve — viviam só no telefone de quem
      as escreveu, e dois telefones nunca se viam.
      - `tarefas`, `tarefas_feitas` e `eventos`, com **30 provas de regra** e
        **13 de ponta a ponta** pelo cliente a sério contra o servidor a sério
      - ⚠ **marcar é ADITIVO**: cria uma linha em `tarefas_feitas`, e desmarcar
        apaga-a. Nunca um booleano «feita» na tarefa. O índice único em
        (tarefa, dia) faz dois telefones **colidirem em vez de se anularem**, e
        uma colisão quer dizer «já estava marcada» — que é o estado pedido.
      - ⚠ os `eventos` tinham `partilhado`, um BOOLEANO, e a app tem **três**
        níveis. O do meio é o que mais importa: a consulta de uma criança entra
        como «adultos», e com um booleano ou a criança passava a vê-la, ou o
        outro adulto deixava de a ver. Passou a `select`, e a regra do servidor
        é a tradução literal do `podeVerEvento`.
      - a folha «Nova Tarefa» deixou de escrever direto na loja: uma escrita
        numa folha é uma escrita sem sítio onde a sincronização possa viver
      - ⚠ **três buracos de casa-cruzada**, todos com a mesma forma: uma regra
        que fala de uma RELAÇÃO tem de perguntar de que casa é a relação, não
        de que casa se diz a linha. O `casa` da linha é escolhido por quem
        escreve. Apareceu em `eventos.responsavel`, `eventos.episodio`,
        `tarefas.atribuido_a` e `tarefas_feitas.tarefa` — e este último só se
        viu depois de eu alargar a regra a «ou é adulto», porque a vizinha de
        outra casa **também** é adulta. A regra apertada escondia-o.
      - ⚠ e a regra do `tarefas_feitas` era mais apertada do que a app: dizia
        «só a tarefa a si atribuída», e o `tapTask` deixa um adulto dar por
        feita a tarefa de uma criança. A marcação era recusada, caía na fila, e
        ficava feita no telefone dela e por fazer no dele — **em silêncio**.
        Apanhado pela prova de ponta a ponta.
      - ⚠ **e eu disse mais do que era verdade.** O commit `b0cd9d2` afirma que
        «as tarefas e a agenda passam a viver na base de dados». A LEITURA da
        agenda passou — os eventos do servidor apareciam — e **nada escrevia
        lá**: o `sync.eventoDaCasa` existia e ninguém o chamava. Corrigido em
        05/09/2026, com um guarda para o género de defeito (abaixo).
      - **falta ainda**: a ordem à mão (`taskOrder`).
- [x] ⚠ **Toda a relação para dentro da casa está ancorada à casa** — o guarda
      em `db/pocketbase/provar-relacoes-ancoradas.mjs`, escrito em 05/09/2026
      depois de o dono da casa perguntar o óbvio: «quando verificas isto várias
      vezes, não achas que vale a pena olhar com muito mais atenção e resolver
      de vez?»
      Eu tinha corrigido a MESMA falha **cinco vezes**, uma de cada vez, sempre
      depois de uma prova a apanhar por acaso. O levantamento completo mostrou
      **doze** relações; **três** ainda estavam soltas — `listas_compras.loja`,
      `artigos.lista`, `manutencoes.equipamento` — e duas delas exploráveis.
      - o guarda tem **duas metades**, e são precisas as duas: a **estática**
        enumera as coleções do servidor e exige a âncora (é completa — apanha a
        coleção que ainda não existe); a **dinâmica** monta duas casas e ataca
        mesmo, uma tentativa por relação (é a que prova que a regra faz o que
        diz). A estática sozinha aceitava uma regra que menciona a âncora sem a
        impor; a dinâmica sozinha só cobre o que eu me lembrei de tentar.
      - ⚠ e ele apanhou **dois defeitos meus**: faltava-me um ataque ao
        `transferencias.para_envelope`, e a primeira versão da metade estática
        juntava a `createRule` e a `updateRule` num texto só — a âncora numa
        salvava a outra. Confere-se cada regra sozinha.
      - corre **primeiro** no `db:provar`: se as âncoras estiverem mal, o resto
        não interessa.
- [x] ⚠ **Nenhuma função de escrita fica sem quem a chame** — o guarda em
      `__tests__/nenhuma-escrita-sem-quem-a-chame.test.js`, escrito em
      05/09/2026 depois de contar quantas havia. Eram **oito**:
      | função | consequência |
      |---|---|
      | `despesa` | as despesas nunca chegavam ao servidor |
      | `acerto` | nem o acerto de contas entre os adultos |
      | `eventoDaCasa` | escrita por mim no dia anterior, nunca ligada |
      | `alterarEvento` | editar um evento ficava num telefone |
      | `alterarTarefa` | reatribuir uma tarefa também |
      | `confirmarTarefaFeita` | os pontos ficavam por confirmar para sempre |
      | `receitaDeSaude` | a receita não chegava a quem ia à farmácia |
      | `decisaoDeSaude` | idem |

      É o mesmo padrão que este projeto já nomeou duas vezes — «o mesmo andaime
      sem obra que as tarefas tinham», sobre o `itemGone`, e o `addHealthRecord`
      que existia e nada chamava. Uma função de escrita sem chamador **não dá
      erro nenhum**: as provas do servidor passam, porque chamam-na
      diretamente, e a app não a usa.

      O guarda LÊ as exportações do `sync.js` em vez de as listar à mão — uma
      lista escrita à mão envelhece na próxima função que alguém escrever.
- [x] **As REGRAS DA CASA sobem** (04/09/2026): o valor do ponto, o dia de
      pagamento, a divisão a meias, o interruptor dos pontos, o rendimento, os
      **papéis** e os **PINs**. **19 provas** em `provar-regras-da-casa.mjs`.
      - ⚠ o papel e o PIN eram os mais graves da lista, porque não são
        aparência: decidem o que o servidor DEVOLVE. A Rita promovia o Tomás e
        o servidor continuava a recusar-lhe a Gestão; punha o PIN do Léo e ele
        não entrava no telemóvel dele.
      - ⚠ o **PIN vai por uma ROTA** (`pb_hooks/pin.pb.js`), não por um update
        da coleção: o PocketBase exige `oldPassword` para mudar uma
        palavra-passe, e quem põe o PIN de uma criança de sete anos não sabe o
        antigo — o objetivo é muitas vezes não saber. A app fazia o update e
        apanhava a recusa num `.catch(() => {})`: **falhava em silêncio**. A
        rota valida a qualidade do PIN outra vez do lado do servidor, recusa um
        adulto, e recusa uma criança de outra casa.
      - ⚠ o `valor_ponto` do servidor tinha `min: 0.01` e eu tinha baixado o
        ecrã a 0 no dia anterior: a escolha de 0 € era aceite no telefone e
        recusada ao subir. Mesma forma de falha silenciosa do `tarefas_feitas`.
      - ⚠ e um defeito no próprio `criar-colecoes.mjs`: numa casa habitada, o
        `casas` e o `membros` são **preservados** — e «preservado» estava a
        significar «intocado». Os campos novos nunca lhes chegavam. Corri o
        script, ele disse «criadas», e nem o `pontos_ligados` nem o mínimo do
        `valor_ponto` estavam lá. Numa base vazia funcionava; na casa a sério —
        a única que interessa — não fazia nada.
- [x] **As três listas da casa sobem** — especialidades, categorias de
      equipamento e lojas. Têm a mesma forma no servidor (`casa`, `nome`) e por
      isso levam uma tradução só: três funções, não três cópias de três.
      - a loja continua a guardá-las como listas de **texto** — é o que oito
        ecrãs leem — e um mapa `nome → id` à parte é o que permite renomear e
        apagar do lado do servidor
      - ⚠ **renomear guarda a linha.** O `mudarListaDaCasa` compara a lista
        antes e depois, e um a sair com um a entrar **na mesma posição** é um
        renomear, não apagar-e-criar. A diferença importa: uma loja apagada
        leva atrás — ou trava — as listas de compras que a referem, e voltaria
        com id novo e sem histórico.
      - ⚠ e uma **fusão** de especialidades não é um renomear: quando o nome
        novo já existe, a linha antiga **apaga-se**. Renomeá-la deixava duas
        linhas com o mesmo nome, que é o defeito que a fusão existe para evitar.
      - ✅ **decidido em 05/09/2026: manda o servidor.** Só quem administra a
        casa cria, renomeia ou apaga uma especialidade — e a app diz agora o
        mesmo, e di-lo ANTES de tentar. As três funções exigem `quem`, e sem
        ele a chamada é recusada: um esquecimento não abre a porta. A quem não
        administra, o botão «Gerir» não aparece, e o estado vazio diz-lhe a
        quem pedir.
- [x] **Os pontos são OPCIONAIS** (04/09/2026, a pedido do dono da casa):
      «atribuir pontos a tarefas deve ser opcional — poder ligar e desligar, e
      se estiver ligado pode-se atribuir qualquer valor, mesmo 0 €».
      - um interruptor em Gestão da Casa → Semanada. Ligado por omissão, porque
        é o que a app fazia — e **ausente lê-se como ligado**, senão uma casa
        gravada antes disto ficava sem pontos, em silêncio, ao actualizar.
      - o valor do ponto desce a **0 €**; o mínimo era 0,01 €, o que obrigava os
        pontos a valer sempre algo. A zero, contam e não valem dinheiro — e as
        frases que falavam de euros dão lugar a frases que não mentem, em quatro
        sítios.
      - desligado, sai do ecrã: a semanada das crianças, as pastilhas de pontos
        nas tarefas e no Início, o campo «Pontos de bónus» ao criar uma tarefa,
        o cartão «Pontos da semana» no modo criança, e o «Pagar Semanada» no
        cofre. O cofre **fica** — um bónus não é um ponto.
      - ⚠ **desligar não apaga nada.** Os pontos são somas de movimentos
        (INVARIANTE #2) e ficam onde estão; voltar a ligar traz os mesmos
        números. Há uma prova que desliga, confere o estado, liga e exige a
        igualdade — porque «limpar ao desligar» seria perda de dados
        disfarçada de arrumação.
      - ⚠ e uma prova apanhou um defeito visual meu: o `Toggle` desenha **só** o
        interruptor (o `label` dele é o rótulo de acessibilidade), e eu tinha-o
        posto sem texto ao lado. Ficava um interruptor sem nome.
- [ ] **PENDENTE:** Nova Tarefa — com toggle de partilha
- [ ] **PENDENTE:** Lápis na tarefa — reatribuir, mudar pontos, remover
- [ ] **PENDENTE:** Recorrência — "feita hoje · volta amanhã"
- [ ] **PENDENTE:** Prazo — data/hora, 2.ª linha mostra prazo (hoje às 18:00, atrasada 1 dia, vermelha)
- [ ] **PENDENTE:** Urgência — cores (vermelho cheio urgente, âmbar normal, cinza sem pressa)
- [ ] **PENDENTE:** Ordem — renumeração automática 1,2,3 e arrastar dentro do grupo
- [ ] **PENDENTE:** Paginação — 10 itens, total à esquerda, setas à direita
- [ ] **PENDENTE:** Confirmação de tarefas — criança marca, pais confirmam

## 6. COMPRAS & LOJA
- [x] Compras — Iniciar Compras abre modo de loja
- [x] Fechar conta — despesa entra no envelope Mercearia
- [ ] **PENDENTE:** Adicionar Artigo — escolhe secção e se é habitual
- [ ] **PENDENTE:** Lápis do artigo — adia ou remove
- [ ] **PENDENTE:** Artigos ordenáveis à mão (no lápis)
- [ ] **PENDENTE:** Todos — primeira aba, lista inteira na ordem do corredor
- [ ] **PENDENTE:** Carrinho — o que está dentro (preço), sem stock, validação
- [ ] **PENDENTE:** Ordem do corredor — stepper segue sequência, mostra preço costumado
- [ ] **PENDENTE:** Últimas 10 compras — data, loja, quem, total, Repetir (11.ª empurra a mais antiga)
- [ ] **PENDENTE:** Quem vai às compras — Alterar dia, hora, loja (modo compras mostra dados)
- [ ] **PENDENTE:** Lojas — Outra loja… também na folha das compras

- [x] **A ementa da semana é opcional** (12/09/2026). O dono da casa viu sete linhas de «Sem
      jantar marcado» e pediu opções (`design/ementa-opcional.dc.html`); escolheu A e C.
      - A: `casas.ementa_desligada`, regra da casa como o `pontos_ligados` (nos dois
        sítios, na tradução `REGRA_NO_SERVIDOR`, interruptor na Gestão). ⚠ **Pela
        NEGATIVA**: a primeira versão era `ementa_ligada`, e um `bool` acrescentado a uma
        coleção com linhas nasce a `false` — a casa a sério ficou com a ementa desligada
        no instante em que o campo chegou ao servidor. «Ausente lê-se como ligado» só vale
        enquanto o campo NÃO existe; um interruptor novo com predefinição ligada guarda-se
        pela negativa. Desligar não apaga pratos nem jantares; a secção sai das Compras e
        o «Jantar de hoje» da criança.
      - C: ligada, só os dias com jantar; sem nenhum, uma linha «Planear a semana» que
        abre os sete. Guarda: `__tests__/a-ementa-e-opcional.test.js`.

## 7. AGENDA & EVENTOS
- [x] Agendar — campo de texto + popup (calendário em cima, roller hora/minuto em baixo)
- [ ] **PENDENTE:** Calendário — Ver mês expande grelha, toque num dia para agendar
- [ ] **PENDENTE:** Importar do Google — lista eventos novos com seleção, recorrentes desligados, toggle visibilidade
- [ ] **PENDENTE:** Agendar Evento — toggle partilhado/só seu calendário
- [x] Saúde na Agenda — consulta é um evento com etiqueta Saúde
- [ ] **PENDENTE:** Agendar Manutenção (Equipamentos) — entra na Agenda

## 8. SAÚDE

### ⚠ Duas auditorias, e a primeira estava errada

Esta secção estava marcada como pendente de ponta a ponta, o que era falso.
Auditei-a em **02/09/2026** e marquei quase tudo como feito — e essa auditoria
**também estava errada**, ao contrário.

O erro tem nome: comparei o código consigo próprio. Para cada linha verifiquei
que existia *alguma coisa*, em vez de comparar o ecrã com o protótipo. O
`CLAUDE.md` diz, em letras: «abra-o num navegador antes de escrever qualquer
ecrã» e «quando este ficheiro e o protótipo discordarem, o protótipo ganha».
Não o abri.

Reauditada em **03/09/2026** contra `design/Nossa Casa App.dc.html`, campo por
campo. O que está feito continua feito; o que falta é bastante mais do que a
lista anterior dizia.

A prova mais dura está nos rascunhos:

```
protótipo    consDraft = { esp, doctor, day, time, note }    cinco campos
implementado     form  = { member, date, time, specialty }   sem doctor, sem note
protótipo    docDraft  = { kind, name, months }              a folha «Anexar»
implementado     —                                           não existe
```

E o `doctor` é **lido em cinco sítios** — `FichaSaude.jsx:51`, `:111`, `:159`,
`exportar-saude.js:113`, `ExportarSaude.jsx:169` — e escrito em **zero**. A app
mostra «Dentista · Dr. Cardoso» para as sementes e nunca o pode mostrar para
uma consulta a sério, porque não há onde escrever o nome.

### Feito

- [x] Saúde da Família — no Perfil, com o ícone `heartPulse`
- [x] Ficha por pessoa — `src/screens/FichaSaude.jsx`
- [x] Visibilidade (INVARIANTE #3) — a ficha de um adulto é só dele; as das
      crianças são visíveis aos adultos e invisíveis às próprias.
      `podeVerSaude` em `src/store.jsx`, pura e com provas, e a regra do
      servidor com 16 provas em `provar-saude.mjs`.
      ⚠ A linha original dizia «privada para adultos, visível para crianças»,
      que é a regra ao contrário. Uma criança nunca vê a sua própria ficha.
- [x] Arquivo clínico — procura e filtros, e o arquivo aparece acima de 5
      registos (`showArchive`)
- [x] Receitas — aviso 30 dias antes de expirar (`receitasAExpirarDe`)
- [x] Notas do episódio — quantas quiser, com autor e data (`addHealthNote`),
      **sempre à mão e alteráveis** (04/09/2026, a pedido do dono da casa)
      - o campo de escrita está sempre presente. Estava atrás de um «Adicionar
        nota» que o revelava, e escrever custava dois toques — uma nota de
        consulta escreve-se na sala de espera.
      - **alterar e apagar**, que não existiam: uma gralha ficava lá para
        sempre, e acrescentar o que faltava obrigava a uma segunda nota a dizer
        «na anterior queria dizer…»
      - ⚠ mexe-se numa nota pelo `id`, nunca pela posição. Dois telefones que
        acrescentem uma nota cada um produzem listas com ordens diferentes, e um
        `editar(indice)` alterava a nota errada no segundo — é a mesma razão do
        INVARIANTE #2.
      - ⚠ e o `id` era `'note-' + Date.now()`: duas notas no mesmo milissegundo
        ficavam com o **mesmo** id, e editar uma alterava as duas. Não era
        hipótese remota — a primeira prova a acrescentar duas notas seguidas
        caiu lá dentro.
      - **só quem escreveu altera ou apaga**, no cliente e no servidor. Uma nota
        é o relato de uma pessoa sobre o que ouviu; o outro adulto reescrevê-la
        em silêncio é pior do que não a poder corrigir.
      - a data em que foi escrita não se perde ao corrigir — a alteração fica
        num campo próprio (`editadaEm`)
- [x] Ficha de saúde — o topo mostra o que exige decisão, acordeão por consulta
- [x] Exportar em PDF — uma consulta, uma especialidade, ou tudo
- [x] Gerir especialidades — criar, renomear e apagar, numa folha própria e
      numa porta só; o renomear migra os episódios e o título do evento, e uma
      que tenha consultas não se apaga
- [x] **Nenhum exame órfão** — a consulta É o evento. Marcar consulta cria o
      episódio E o evento, ligados pelo `healthId`.
      ⚠ Estava em falta e em silêncio: o `addHealthRecord` existia na loja e
      **nada o chamava**. Numa casa a sério a ficha ficava vazia para sempre —
      o ecrã dizia «Use Marcar Consulta para a primeira» e usar Marcar Consulta
      não punha lá nada.
- [x] O cartão de uma consulta abre.
      ⚠ Não abria: `<Card onPress={...}>`, e o `Card` não aceita `onPress` —
      ignorava-o em silêncio. Todo o interior era inalcançável: «Resolvida»,
      «Pendente», as notas, as receitas. Descoberto porque o dono da casa
      tocou em «Ação» e não aconteceu nada.
- [x] Sincronizar as consultas — sobem se o servidor viver na casa. Ver a
      última entrada desta secção.
- [x] **A lista partilhada com quem não tem a app** (12/09/2026, a nona das dez; bloco 9 de
      `design/dez-funcionalidades.dc.html`). O dono da casa disse «avança» sem decidir o
      servidor fora de casa; a funcionalidade fica construída e o endereço serve onde o
      servidor for alcançável — a folha avisa quando é `127.0.0.1`. `partilhas_lista` (casa,
      lista, criada_por, sinal único, expira_em) nos dois sítios, sem `updateRule`; o hook
      `pb_hooks/partilha-lista.pb.js` escreve o sinal (`$security.randomString(24)`) e o prazo
      de uma hora ao criar, e serve `GET /lista/{sinal}` sem sessão: HTML com rótulos por
      corredor, riscados os comprados, sem `visibilidade = "adultos"`, sem estimativa, sem
      `pedido_por`; 404 sem sinal, 410 expirada ou lista fechada; só GET. `sync.partilharLista`
      é direta (a resposta traz o sinal); `desfazerPartilha` apaga. Folha `PartilharLista`
      (pede ao abrir; «Copiar o endereço»; «Desfazer a partilha»); linha nas Compras, no cartão
      da ida. Ícone novo `share`. Guarda: `a-lista-partilhada` (6); prova: `provar-partilha.mjs`
      (12) e dois ataques no guarda das relações.
      - ⚠ o PocketBase da casa corria com `--hooksDir` de OUTRA árvore (a de outra conversa)
        e no Windows os hooks não recarregam: a rota dava 404 sem erro nenhum. A prova
        correu primeiro num PocketBase temporário em 8096 (base vazia, hooks desta árvore);
        depois o dono da casa autorizou o reinício e o de 8095 passou a correr com os hooks
        e as migrações desta árvore. Duas armadilhas no reinício: `Start-Process` partiu os
        caminhos com espaços (o PocketBase tratou «Casa\pb_data» como domínio e arrancou em
        HTTPS sobre uma base vazia), e o temporário tinha deixado 79 migrações automáticas
        na pasta desta árvore, que fizeram o arranque seguinte recusar «created_casas».
      - no navegador com a casa real viu-se a linha nas Compras (52 px); a folha não se
        abriu porque abrir CRIA uma partilha e duas linhas de registo na casa.
- [x] **Os documentos têm a cara da app** (12/09/2026). O dono da casa pediu «o logótipo em
      marca de água e o nome de quem imprime e a data no canto inferior direito», e depois
      «um design semelhante à app»; cinco páginas em `design/documentos-da-app.dc.html`,
      escolheu a A. Um molde só, `paginaDaApp` em `src/documento.js`, para os três documentos
      (`documentoDeSaude`, `documentoDeEmergencia`, `documentoDoRetrato`): faixa de cabeçalho
      na cor do `chrome` de quem imprime com o logótipo a cores, títulos de secção a 13 px em
      `actFg` com régua, linhas planas com os números tabulares à direita, letra da app (sem
      serifa), o logótipo centrado a 7 % como marca de água e o carimbo «Impresso por X ·
      dd/mm/aaaa · hh:mm» — os dois `position: fixed`, para se repetirem em cada página
      impressa. Quem chama passa `quemImprime` e `t`; a Documentação ganhou o `user` para o
      retrato. Guarda: `os-documentos-tem-a-cara-da-app` (exige `quemImprime` e `t` em toda a
      chamada dos ecrãs, e que não haja um segundo `<!doctype>` fora do molde).
- [x] ⚠ **Código partido a fingir-se de servidor em baixo** (12/09/2026, classe 39). A meio
      do retrato do mês editei o `sync.js` em dois lotes — a chamada `retratosDe(...)` no
      `puxarCasa` num, o `import` no seguinte — com o servidor de desenvolvimento a servir a
      árvore ao vivo e o dono da casa a entrar nesse minuto. As trinta leituras deram 200, o
      `ReferenceError` caiu no `catch` do `lerDoServidor` (que devolve «sem servidor»), a app
      ficou com a família de demonstração e o ecrã disse-lhe «António não faz parte desta
      casa». Nada vermelho em lado nenhum. Saídas: o `catch` do `lerDoServidor` e o do
      `carregarSync` passaram a dizer na consola o que apanharam; o guarda
      `a-leitura-da-casa-corre` corre o `puxarCasa` E o `lerDoServidor` com a ligação
      simulada a devolver TODAS as coleções da lista `COLECOES` (exige que a casa de prova
      as tenha); e o `babel.config.js` ganhou, só em testes, um plugin local que traduz
      `import()` para `require` — sem ele nenhum guarda conseguia chegar ao `lerDoServidor`.
      Regra: o `import` vai no MESMO lote que a primeira chamada, porque a árvore está a ser
      servida; e avisa-se o dono da casa quando uma edição possa partir a app que ele tem
      aberta.
- [x] **O retrato do mês** (12/09/2026, a décima das dez funcionalidades; desenho em
      `design/retrato-do-mes.dc.html`). Nenhum campo novo: `retratosDe` em
      `src/retrato-do-mes.js` soma, no `puxarCasa`, as `despesas` (não anuladas), as
      `tarefas_feitas` confirmadas (por criança, com os pontos da tarefa), as `listas_compras`
      fechadas e os `acertos` do intervalo de cada linha de `meses` — do `mes` até ao `mes` do
      seguinte, ou ao dia depois do `fechado_em`. Desce como `retratos` (chave `local` no
      `o-que-sobe`: é uma soma, não dado). Folha `RetratoDoMes` (quatro secções, «Exportar em
      PDF» comum pelo `guardarPDF`); portas: secção «Retrato do Mês» no Dinheiro (qualquer
      adulto), o fecho do mês (abre o retrato do que fechou, tirado ANTES do `fecharMes` zerar
      as somas locais) e «Retratos dos Meses» em Documentação › Nesta casa. Sem servidor,
      `retratoLocal()` faz o do mês corrente das somas do Dinheiro.
      - guarda: `o-retrato-do-mes` (10); prova: `provar-retrato.mjs` (7) — a soma é a das
        linhas do mês, Agosto não muda quando Setembro cresce nem quando Outubro abre, a
        criança recebe zero retratos.
- [x] **O filtro por membro das Tarefas passou a avatares** (12/09/2026). Seis pastilhas
      com o nome embrulhavam em duas linhas (355 px dão para quatro): 96 px antes da
      primeira tarefa, a crescer com a família. O dono da casa pediu cinco alternativas
      (`design/filtro-de-membros.dc.html`) e ficou a A: «Todos» continua pastilha; cada
      membro é a sua bola (`Avatar`/`avatarDe`, a mesma da linha da tarefa) num alvo de 44,
      com anel do acento no escolhido e o NOME no título («Rotinas e Tarefas · Léo»). Tocar
      outra vez volta a «Todos». Uma linha até cinco membros; medido no navegador: cinco
      alvos de 44 × 44 ao mesmo topo. Guarda: `o-filtro-de-membros-e-de-avatares`; o motivo
      da pílula em `o-canto-de-tudo-o-que-se-toca` passou do ponto de 8 px ao anel.
- [x] **A troca de tarefas entre irmãos** (12/09/2026, a oitava das dez funcionalidades;
      desenho em `design/troca-de-tarefas.dc.html`). `trocas_tarefas` (casa, dia, tarefa_de,
      tarefa_para, proposta_por, aceite_em, aceite_por) nos dois sítios, com índices únicos
      (tarefa_de, dia) e (tarefa_para, dia). A atribuição do dia é DERIVADA no `allTasks`
      (`trocadaCom` guarda o dono original), como a rotação — nada se escreve na tarefa, e
      à meia-noite acabou. Só as de hoje descem (filtro por data no `ler.casa`, com um dia
      de folga pelo fuso). Na app da criança: secção «Trocas» (aceitar, recusar, retirar) e
      «Propor uma troca» → folha `ProporTroca`; nos adultos: linha no «Precisa de Si» e
      «Trocas de Hoje» nas Tarefas com «Anular a troca». Ícone novo `swap`, só para isto.
      - servidor: só quem tem a `tarefa_de` propõe, criança para criança, e a linha nasce por
        aceitar; só quem tem a `tarefa_para` aceita e assina (`@request.body.aceite_por`,
        `:isset = false` no resto); apaga quem propôs/recebeu enquanto por aceitar, um adulto
        sempre. Quatro relações, quatro ataques novos no guarda (49 provas).
      - ⚠ limite conhecido, herdado da rotação e do reatribuir: com servidor, o histórico de
        `tarefas_feitas` de uma tarefa conta para quem a TEM hoje — no dia da troca, os
        pontos antigos do lixo contam para a Mia, e amanhã voltam ao Léo. Uma atribuição por
        linha resolvia-o; fica para quando doer.
      - guarda: `a-troca-de-tarefas` (12); provas: `provar-trocas.mjs` (18).
      - visto no navegador como António (12/09/2026): as Tarefas e o Início desenham-se sem
        a secção, porque a casa real não tem trocas hoje; nada foi escrito na casa. Como Léo
        não se viu — a entrada da criança pede o PIN dele, que não tenho.
- [x] **A ficha de emergência da criança** (12/09/2026, a sétima das dez funcionalidades).
      `alergias_saude` (membro, nome, gravidade, nota), nos dois sítios, com as regras da
      ficha e índice único (membro, nome). Na ficha da criança, a linha «Ficha de
      emergência» abre a folha: alergias (acrescentar e tirar), medicação em curso (das
      receitas com plano), médico (das consultas), contactos (os adultos), e «Exportar em
      PDF para a escola» — `documentoDeEmergencia` em `exportar-saude.js`, quatro secções
      sempre. Guarda: `a-ficha-de-emergencia`; prova: `provar-emergencia.mjs` (10).
      - ⚠ **A prova da alergia apanhou um buraco nas consultas**: a regra de escrita dos
        `episodios_saude` não tinha `membro.casa`, e uma adulta de outra casa criava uma
        consulta a uma criança desta. E o guarda das relações ancoradas NUNCA o tinha visto,
        porque o mapa de nomes só tinha coleções de base — `membros` é de autenticação — e
        toda a relação para `membros` era saltada, com um `daCasa.add('membros')` a
        prometer o contrário. Alargado: 41 relações, 45 provas, catorze ataques novos.
        Sete relações estavam soltas; duas eram buracos a sério (`cofre_movimentos.membro`
        e `acertos.de_membro/para_membro`). Ancoradas as quatro coleções nos dois sítios
        (tabela `REGRAS`), e o `acrescentar-campos` passou a aplicar regras a coleções da
        tabela `COLECOES` que já existam — «já existe» deixava a regra velha viva.
- [x] **A faixa da consulta aberta não cresce** (12/09/2026). O dono da casa viu a
      consulta do Léo aberta com a faixa azul a acompanhar os ~700 px do acordeão e pediu
      cinco opções (`design/faixa-da-consulta.dc.html`); escolheu a A: a `Linha` ganhou
      `faixaCurta` — 3 × 52 px, absoluta — e a consulta usa-a em vez de `faixa`. As
      linhas fechadas não mudam. Guarda: `a-faixa-da-consulta-nao-cresce`.
- [x] **A medicação a partir da receita** (12/09/2026, a sexta das dez funcionalidades).
      A receita ganha `frequencia`, `duracao_dias` e `caixa` (nos dois sítios; zero é «sem
      plano»); `tomas_saude` (receita, quando, por) nasce nos dois, aditiva, com índice
      único (receita, quando), regra `PELA_RECEITA` e `por = @request.auth.id`.
      - **as tomas sobem pelo travão de casa** — decisão do dono da casa. `tomas_saude`
        entrou na lista `SAUDE` do `recusaSaude`; a leitura da ficha traz as tomas.
      - a folha `TomasDaReceita` (aberta pelo botão «Tomas» da receita): o plano, o
        aviso da caixa, «Pôr as tomas na Agenda» (um evento «adultos» por dia, de hoje em
        diante, sem duplicar), «Tomado agora», e desmarcar só por quem marcou.
      - ⚠ as tomas guardam-se pela `chaveDaReceita` (`srv-<id>` mal exista): uma receita
        troca de id na leitura seguinte, e as tomas ficavam órfãs debaixo do antigo.
      - ⚠ «agora» é o `agoraNaApp()`, não `new Date()`: com o dia fixado nas provas, a
        toma marcada «agora» tem de cair em «hoje».
      - guarda: `__tests__/a-medicacao-a-partir-da-receita.test.js`; provas:
        `provar-medicacao.mjs` (14) e dois ataques em `provar-relacoes-ancoradas.mjs`.
      - visto no navegador como António (12/09/2026): as duas receitas da Pediatria do
        Léo com o botão «Tomas», e a folha com o plano por definir, «Pôr as tomas na
        Agenda» à espera do plano, «Hoje · 0 tomas» e «Tomado agora». Nada foi marcado.

### «Marcar Consulta», contra o protótipo

- [x] **Médico ou clínica.** Placeholder «Dr.ª Neves, Centro de Saúde…», ícone
      `idcard`. É o campo que desbloqueou os cinco sítios que já o leem — a
      próxima consulta na ficha, cada linha do histórico, o detalhe de cada
      documento, a folha de exportação e o PDF.
- [x] **Nota (opcional).** Placeholder «Jejum, levar exames anteriores…», ícone
      `edit`. Fica como `nota` (singular) na loja e `notas` no servidor, para
      não se confundir com o `healthNotes` — as notas escritas DEPOIS da
      consulta, cada uma com autor e data.
- [x] **Dia e hora, um controlo.** O protótipo tem UMA linha —
      «Hoje · Quinta, 20/08 às 09:00» — que abre um selector. Eram dois campos,
      e a hora escrevia-se à mão em «hh:mm» — nada impedia «25:99».
      Agora o calendário traz a hora por baixo e a legenda diz a frase inteira.
      ⚠ O campo de TEXTO da data fica: a app decidiu na 1.6.0 que «datas
      escrevem-se à mão ou escolhem-se no calendário, em TODOS os ecrãs», e
      trocar isso num ecrã só dava duas maneiras de escrever uma data.
- [x] **O aviso de quem vê a consulta.** Caixa com `lock` vermelho. O
      comportamento existia e estava provado; faltava dizê-lo a quem marca.
      ⚠ A frase NÃO é a do protótipo tal e qual. Lá é fixa — «entra na sua
      Agenda como Só eu» — porque aquela folha marca sempre para quem está a
      ver. Esta tem selector de membro, e a visibilidade não é a mesma: a de um
      adulto é `so-eu`, a de uma criança é `adultos`. Copiar a frase fixa dizia
      «só eu» ao marcar ao Léo, quando o outro adulto a vê. Há uma prova que
      compara a frase com a visibilidade do evento, membro a membro.
- [x] **O botão diz «Marcar e Pôr na Agenda»** — promete as duas coisas que
      acontecem, e são duas: o episódio na ficha e o evento na agenda.
- [x] **O «Gerir» é um botão ao lado do CAMPO da especialidade** — onde o
      protótipo o põe — e é a única porta. A faixa de abas «Nova Consulta» /
      «Especialidades» saiu: eram duas portas para o mesmo sítio, o mesmo
      defeito que os atalhos do Início tinham.
- [x] **As especialidades têm folha própria**, irmã da de marcar e nunca dentro
      dela (a `Sheet` é um `Modal`; empilhá-los põe o rodapé em risco —
      INVARIANTE #1). Fechar volta a marcar consulta.
      - o rascunho da consulta subiu para o ecrã da Saúde, senão um formulário
        meio preenchido perdia-se a caminho de acrescentar a especialidade que
        falta — que é precisamente quando se lá vai
      - criar uma deixa-a JÁ escolhida no rascunho, como no protótipo
      - cada linha diz «3 consultas» ou «sem consultas»
      - ⚠ **uma especialidade em uso não se apaga.** Apagava sempre, com um
        diálogo que prometia que as consultas ficavam como estavam — ficavam,
        a apontar em TEXTO para um nome que já não existe. É o defeito que
        obrigou o `renameSpecialty` a migrar os episódios, a entrar pela porta
        do lado. Agora a linha diz «Em uso» e não oferece alvo nenhum.
      - ⚠ a linha NÃO é tocável, e no protótipo é: lá o apagar vive dentro dela
        num alvo de ~28 px. As invariantes não cedem a medidas do protótipo
        (#5, 44 px, e o erro #6 do CLAUDE.md).
      - falta a linha com chevron para a especialidade — hoje são pastilhas em
        fila, e o protótipo tem um selector que abre
- [ ] **PENDENTE: sem selector de membro.** A folha do protótipo não o tem —
      quem marca está dentro de uma ficha, e é essa a pessoa (`healthWho`).
      Tirá-lo muda a navegação da Saúde, e é decisão à parte.

### Os anexos e o arquivo

- [x] **A folha «Anexar».** Tipo (exame / receita / relatório) com ícones, nome
      («Análises de sangue, receita do ferro…») e validade só se for receita.
      O documento fica ligado à consulta pelo `healthId` — «nenhum exame
      órfão» — e trocar de tipo limpa a validade, senão um exame com prazo
      aparecia no «Precisa de Si» como receita a expirar.
      O arquivo clínico já LIA (`allHealthDocs`, com procura, filtros e a
      origem) e nada ESCREVIA: as sementes eram o único conteúdo possível.
- [x] **Arquivar uma consulta.** `healthArchived` no estado, e uma terceira
      secção «Arquivadas» — e não um esconderijo: arquivar não apaga, portanto
      a consulta tem de continuar a chegar-se. A frase do protótipo está no
      ecrã e é verdade: «os anexos ficam ligados e a consulta volta com um
      toque».
      ⚠ E fiz aqui um defeito que já estava documentado no `store.jsx`: pus o
      `healthArchived` nas `DATA_KEYS` e o valor por omissão só no `BLANK()`,
      não no `DEMO()`. A mesma prova de fumo que o tinha apanhado antes
      apanhou-o outra vez.
- [ ] **PENDENTE: a folha «Gerir consulta».** No protótipo os anexos e o
      arquivar vivem numa folha que abre da consulta. Aqui vivem DENTRO do
      cartão expandido, onde as notas já estavam.

      ⚠ **A justificação que estava aqui era falsa**, e ficou por escrito duas
      semanas: dizia que «uma folha por consulta obrigava a um segundo alvo na
      linha, e a linha já é o alvo que abre o cartão (erro #6)». Fui ver o
      protótipo em 04/09/2026: a linha dele **substitui** o acordeão —
      `open: () => this.setState({ healthSel: c.id, sheet: 'consulta' })`,
      linha 6551. Um alvo só. Não há conflito nenhum com as invariantes.

      Fica pendente por **preferência**, e a preferência tem agora um argumento
      a favor do acordeão: o dono da casa pediu que as notas estejam «sempre à
      mão» para poder alterar e acrescentar texto. No acordeão estão à vista na
      lista; numa folha ficam um toque mais longe.

      ⚠ E ao ir ver, encontrei divergências maiores do que esta folha. Medido no
      protótipo:

      | | a app | o protótipo |
      |---|---|---|
      | «Precisa de ação» | uma secção no topo | **não existe** (0 ocorrências) |
      | Resolvida / Pendente | botões na consulta | **não existe** (0 ocorrências) |
      | Arquivadas | terceira secção | um **filtro** (`hFilter === 'arquivadas'`) |

      A decisão «resolvida/pendente» e o «Precisa de ação» são coisas que a app
      tem e o desenho não. Podem ser boas — mas não vieram do protótipo, e isso
      muda a conversa de «implementar o que falta» para «decidir o que fica».
- [x] **A fotografia do documento**, e ela SOBE — «sobe tudo», por decisão do
      dono da casa em 03/09/2026, pelas mesmas condições do resto da saúde: só
      para um servidor que viva na casa.
      Escolhe-se pelo `expo-image-picker`, o mesmo caminho que a fatura de um
      equipamento usa, para não haver dois modos de escolher uma imagem.
      ⚠ A fotografia fica no dispositivo PRIMEIRO, com `porSubir: true`, e só
      depois se tenta o carregamento. Um anexo não pode ir pela fila de
      escritas — ela serializa em JSON e um ficheiro não é JSON — portanto o
      carregamento é direto e pode falhar. Guardar antes de tentar é o que
      impede a fotografia de se perder por não haver rede; o `porSubir` é o que
      impede a app de fingir que ela já está no servidor, e o ecrã mostra-o
      como «só aqui».
      ⚠ E um anexo é uma RELAÇÃO para o episódio: foi por isso que o
      `episodioDeSaude` passou a tentar direto antes de cair na fila. A fila
      devolve quantas subiram, não o registo — uma consulta que fosse só pela
      fila nunca aprendia o seu `id`, e o anexo não teria para onde apontar.
      O ficheiro a atravessar a rede está provado em `provar-anexo-sobe.mjs`,
      com 11 provas e um PNG a sério que volta a ser pedido e conferido byte a
      byte.

### A sincronização

- [x] As **consultas** sobem, e só para um servidor que viva na casa —
      `eEnderecoDeCasa` em `src/endereco.js`, com 38 provas, e o caminho todo
      em `provar-saude-sobe.mjs`.
- [x] **Os anexos sobem, com o ficheiro** — pelo mesmo travão. Um ficheiro
      clínico de menor é categoria especial no RGPD, e é o dado mais difícil de
      retirar de um servidor depois de lá estar; sobe porque o dono da casa
      decidiu, e só para casa.
      ⚠ Os cinco pontos só colapsam ENQUANTO o servidor viver na casa. Voltam
      todos no dia em que for exposto à internet, e nesse dia é a fotografia
      que fica pior. A condição está em código — `eEnderecoDeCasa` — e não numa
      nota: se o endereço deixar de ser de casa, a saúde deixa de subir sozinha.
- [x] **As notas, as receitas e as decisões sobem** — `notas_saude`,
      `receitas_saude` e `decisoes_saude`, com **24 provas** em
      `provar-notas-saude.mjs` e pelo mesmo travão do `eEnderecoDeCasa`.
      Esta linha dizia «não têm coleção no servidor: não é que não subam, é que
      não há para onde». Passaram a ter, em 04/09/2026.
      - a visibilidade é a **mesma** dos anexos, e é a condição literal, não uma
        cópia dela: uma nota de uma consulta é o mesmo dado clínico que a
        consulta, e um segundo sítio onde a regra vive é um sítio onde ela pode
        divergir. Foi assim que a criança chegou a ler a própria ficha.
      - **só o autor altera ou apaga a sua nota**, e a regra é do servidor —
        `autor = @request.auth.id`, também na criação, senão bastava criar a
        nota já assinada por outra pessoa
      - a decisão tem **índice único** por episódio: é um estado, não um
        movimento, e não se pode somar. Dois telefones que decidam ao mesmo
        tempo encontram-se no servidor em vez de criarem uma linha cada um.
      - ⚠ **e uma prova nova encontrou um buraco que era anterior a tudo
        isto.** A regra dos anexos dizia `casa = @request.auth.casa && adulto
        && (episodio.membro = eu || episodio.membro.papel = "crianca")`. O
        `casa` é o da PRÓPRIA LINHA, e quem escreve escolhe-o: uma adulta de
        outra casa punha a casa dela na linha, apontava o `episodio` para a
        consulta de uma criança desta, e passava. Ler a consulta não conseguia;
        pendurar-lhe um exame conseguia — e depois lê-lo, porque o anexo era
        dela. **Onze provas dos anexos nunca tentaram isto.** Corrigido para
        `episodio.casa = @request.auth.casa`, nas quatro coleções.

## 9. EQUIPAMENTOS
- [x] Equipamentos da Casa — garantias, fotos da fatura
- [x] **Contratos e renovações** (12/09/2026, a quinta das dez funcionalidades). Coleção
      `contratos` (nome, fornecedor, renova_em, fidelizacao_ate, responsavel, ficheiro),
      nos dois sítios, com as regras dos equipamentos e `responsavel.casa` ancorado.
      - segunda secção no ecrã dos Equipamentos, mesma linha e ficha própria
        (`FichaContrato`): renovação, documento, campos, remover. Aviso a 30 dias no
        «Precisa de Si», e a linha abre a ficha DESTE contrato (`abrir: 'contrato:<id>'`).
      - ⚠ o documento vai à parte da definição: a fila serializa em JSON, por isso nasceu
        o `atualizarComFicheiro` — um `update` só com o ficheiro, na linha que já tem id.
        Fica «por subir» (e «só aqui» no ecrã) até subir; a leitura seguinte não o perde.
      - ⚠ os campos e o documento são DUAS escritas à mesma linha (classe 27): a ficha
        guarda uns num botão e escolhe o outro noutro; nunca no mesmo tique.
      - guarda: `__tests__/os-contratos-e-renovacoes.test.js`; provas:
        `provar-contratos.mjs` (10, com um PNG a atravessar e a voltar byte a byte) e
        um ataque novo em `provar-relacoes-ancoradas.mjs`.
      - visto no navegador como António (12/09/2026): «Contratos a renovar» no resumo, a
        secção com o aviso de vazio e «acrescentar contrato». O subtítulo do cabeçalho
        cortava em «3 em garanti…» com as três contagens — ficou «4 equipamentos · 0
        contratos», como o desenho diz.
- [ ] **PENDENTE:** Agendar Manutenção — entra na Agenda

## 10. COFRE (Crianças)
- [x] Cofre — nas Tarefas, saldo, movimentos
- [x] Pagar Semanada e bónus
- [ ] **PENDENTE:** Semanada — campo escrevível com −/+ de 0,05 € (0,01 a 5,00 €)
- [ ] **PENDENTE:** Semanada — pode ser paga em qualquer dia (tira de abreviaturas)
- [ ] **PENDENTE:** Metas — recebem o que sobra do rendimento: +50 € por toque (só admin)

## 11. PERFIL & DADOS
- [x] Aspeto — sol, lua ou dispositivo
- [x] Esquema de cor — apenas no avatar navbar, apenas para perfil ligado
- [ ] **PENDENTE:** Modo criança — reduzido a tarefas e cofre, sem orçamento
- [ ] **PENDENTE:** Dados — guardados no dispositivo, Repor Dados de Demonstração
- [ ] **PENDENTE:** Terminar sessão — ícone no cabeçalho da folha de perfil
- [ ] **PENDENTE:** Começar de zero — ver estados vazios, pede confirmação
- [ ] **PENDENTE:** Casa nova — depois de Começar de Zero, folha de arranque

## 12. UI/UX DETALHES
- [ ] **PENDENTE:** Confirmação — remover tarefa/artigo/evento/equipamento, repor demo
- [ ] **PENDENTE:** Precisa de si — topo do Início, só o que exige decisão
- [ ] **PENDENTE:** Resumo diário — no perfil, regra como frase, desligado fica uma linha
- [ ] **PENDENTE:** Espaçamento — escala 2/4/8/16/24 px, enchimento 14/16 nos cartões
- [ ] **PENDENTE:** Ícones — houseGear (Gestão), heartPulse (Saúde)
- [ ] **PENDENTE:** Cor por membro — Rita violeta, Tomás cião, Léo azul, Mia azul-meia-noite

## 13. SEGURANÇA & PAPÉIS
- [ ] **PENDENTE:** PIN crianças — sem valor de fábrica, 5 tentativas = 1 min bloqueio
- [ ] **PENDENTE:** Papéis — mudança pede confirmação, criança sobe a adulto, adulto nunca volta criança
- [ ] **PENDENTE:** Ficha do membro — Membros e PIN, abre ficha com PIN e papel como linhas

## PRIORIDADE DE IMPLEMENTAÇÃO
1. **Crítica (INVARIANTE #1):** ✅ Já feito — Navbar, separadores, header/footer
2. **Alta (Funcionalidade Core):**
   - [ ] Popup evento Google ao entrar
   - [ ] Papéis & Membros (admin pode mudar)
   - [ ] Lojas
   - [ ] Limite de envelope
3. **Média (Funcionalidade Secundária):**
   - [ ] Recorrência de tarefas
   - [ ] Prazo com cores de urgência
   - [ ] Saúde completa
4. **Baixa (UI/UX Polish):**
   - [ ] Paginação
   - [ ] Confirmações de delete
   - [ ] Resumo diário

