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
- [x] Dinheiro — ver envelope Mercearia após compras
- [x] Marcar como Pago — acertar contas
- [ ] **PENDENTE:** Abrir o mês — distribuir rendimento e reiniciar
- [ ] **PENDENTE:** Fecho do mês — arquivar e 30% para metas

## 4. GESTÃO DA CASA (Admin)
- [x] Gestão da Casa — no avatar (rendimento, semanada, divisão, envelopes)
- [ ] **PENDENTE:** Papéis — toque na pílula para mudar (Administração, confirmar mudança)
- [ ] **PENDENTE:** Lojas — criar, renomear, apagar supermercados
- [ ] **PENDENTE:** Membros e PIN — definir PIN das crianças (rejeita iguais, sequências)
- [ ] **PENDENTE:** Especialidades — em Marcar Consulta

## 5. TAREFAS & PONTOS
- [x] Tarefas — toque para concluir, pontos recalculam
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
- [x] Notas do episódio — quantas quiser, com autor e data (`addHealthNote`)
- [x] Ficha de saúde — o topo mostra o que exige decisão, acordeão por consulta
- [x] Exportar em PDF — uma consulta, uma especialidade, ou tudo
- [x] Gerir especialidades — criar, renomear e apagar, num sítio só, e o
      renomear migra os episódios e o título do evento
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
- [x] **O «Gerir» é um botão ao lado do título.**
      ⚠ Dívida assumida: leva à aba «Especialidades», que continua no topo da
      folha. São duas portas para o mesmo sítio — o mesmo defeito que os
      atalhos do Início tinham. Fica até as especialidades irem para folha
      própria, e é isso que a linha seguinte pede.
- [ ] **PENDENTE: as especialidades numa folha própria**, e a aba fora daqui. É
      o que tira as duas portas. Leva com ela a linha com chevron para a
      especialidade, que hoje são pastilhas em fila.
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
      ⚠ É divergência de estrutura, não de conteúdo, e é deliberada: uma folha
      por consulta obrigava a um segundo alvo na linha, e a linha já é o alvo
      que abre o cartão (erro #6 do CLAUDE.md). Fica aqui por se decidir, não
      por estar em falta.
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
- [ ] **PENDENTE: as notas, as receitas e as decisões não sobem**, e não é
      escolha: não têm coleção no servidor. Não é que não subam — é que não há
      para onde. Enquanto não houver, dizer que sincronizam era pior do que a
      lacuna.

## 9. EQUIPAMENTOS
- [x] Equipamentos da Casa — garantias, fotos da fatura
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

