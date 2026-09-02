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

Esta secção estava marcada como pendente de ponta a ponta e **não era verdade**:
quase tudo já existia e ninguém tinha voltado aqui riscar. Auditada contra o
código em 02/09/2026, ficheiro por ficheiro. O que fica por fazer está em baixo,
e é bem menos do que parecia.

- [x] Saúde da Família — no Perfil, com o ícone `heartPulse`
- [x] Ficha por pessoa — `src/screens/FichaSaude.jsx`
- [x] Visibilidade (INVARIANTE #3) — a ficha de um adulto é só dele; as das
      crianças são visíveis aos adultos e invisíveis às próprias.
      `podeVerSaude` em `src/store.jsx`, pura e com provas.
      ⚠ A linha antiga dizia «privada para adultos, visível para crianças», que
      é a regra ao contrário. Uma criança nunca vê a sua própria ficha.
- [x] Arquivo clínico — procura e filtros, e o arquivo aparece acima de 5
      registos (`showArchive`)
- [x] Marcar Consulta — gerir especialidades, agora com criar, **renomear** e
      apagar, num sítio só
- [x] Receitas — aviso 30 dias antes de expirar (`receitasAExpirarDe`)
- [x] Notas do episódio — quantas quiser, com autor e data (`addHealthNote`)
- [x] Ficha de saúde — o topo mostra o que exige decisão, acordeão por consulta
- [x] Exportar em PDF — uma consulta, uma especialidade, ou tudo
- [x] **Nenhum exame órfão** — a consulta É o evento. Marcar consulta cria o
      episódio E o evento, ligados pelo `healthId`; os documentos gravam a
      origem no mesmo campo.
      ⚠ Esta era a que estava mesmo em falta, e em silêncio: o
      `addHealthRecord` existia na loja e **nada o chamava**. Numa casa a sério
      a ficha ficava vazia para sempre — o ecrã dizia «Use Marcar Consulta para
      a primeira» e usar Marcar Consulta não punha lá nada.

### O que falta

- [ ] **PENDENTE:** Acrescentar um documento a uma ficha. O arquivo clínico
      LÊ (`allHealthDocs`, com procura, filtros e a origem no `healthId`) e
      nenhum ecrã ESCREVE. As sementes de `HEALTH_DOCS` são o único conteúdo
      possível: numa casa a sério não há como juntar um relatório a uma
      consulta.
      ⚠ Antes de fazer isto: um documento com ficheiro anexo entra em
      `anexos`, que o CLAUDE.md põe fora das coleções até os cinco pontos do
      `db/postgres/README.md` estarem resolvidos. Um documento só com título e
      tipo não tem esse problema, e é provavelmente por onde começar.
- [ ] **PENDENTE:** Sincronizar a saúde. Continua deliberadamente fora do
      servidor — `episodios_saude` e `anexos` não existem nas coleções nem na
      camada de cliente. São dados clínicos de menores, categoria especial no
      RGPD. Ver `docs/seguranca.html`.

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

