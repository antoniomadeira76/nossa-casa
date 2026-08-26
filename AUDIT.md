# Auditoria Completa - Nossa Casa

## 1. SMOKE TESTS (Funcionalidades Básicas)

### Navegação
- [ ] Login funciona (escolher membro)
- [ ] 5 tabs navegam corretamente
- [ ] Botões de atalho abrem modais
- [ ] Back button funciona

### Criar Items
- [ ] Novo Evento funciona
- [ ] Novo Tarefa funciona  
- [ ] Novo Artigo funciona
- [ ] Confirmação de privado/compartilhado funciona
- [ ] Dados aparecem nas listas

### Visualização
- [ ] Equipamentos mostra 3 secções (em garantia/expirando/expirada)
- [ ] Saúde mostra registos por membro
- [ ] Gestão restringe acesso (só admin)
- [ ] Documentação mostra changelog

### Persistência
- [ ] Dados não são perdidos ao fechar/reabrir

---

## 2. CODE QUALITY

### Erros de Compilação
- [ ] Bundle Android sem warnings
- [ ] Bundle Web sem warnings
- [ ] Sem console errors

### Imports & Exports
- [ ] Todos os imports existem
- [ ] Sem imports não utilizados
- [ ] Exports consistentes

### Tipos & Validação
- [ ] Props validadas
- [ ] State inicializado
- [ ] Nenhum "any" type desnecessário

---

## 3. SEGURANÇA

### Vulnerabilidades
- [ ] npm audit - vulnerabilidades críticas: 0
- [ ] Sem hardcoded secrets
- [ ] PIN verificado no cliente (será servidor depois)
- [ ] Papéis validados

### Privacy
- [ ] Saúde adulto não vê outro adulto
- [ ] Crianças veem saúde de todos
- [ ] Permissões implementadas

---

## 4. DESIGN

### Invariantes (CLAUDE.md)
- [ ] Header em todas as janelas
- [ ] Rodapé em todas as janelas
- [ ] Saldos nunca sobrescritos (aditivos)
- [ ] EUR com espaço inquebrável
- [ ] Alvos de toque ≥ 44px
- [ ] Urgência ordena tarefas
- [ ] Sem emoji

### Temas
- [ ] 6 schemes visuais funcionam
- [ ] Light/dark mode funciona
- [ ] Contraste adequado
- [ ] Títulos em slate (#67769B)

### Typography
- [ ] Roboto carregado
- [ ] Inter carregado
- [ ] Tamanhos consistentes
- [ ] Peso consistente

### Espaçamento
- [ ] Usa só 5 valores (2, 4, 8, 16, 24)
- [ ] Sem padding/margin aleatório
- [ ] Layouts aligned

---

## 5. PERFORMANCE

### Bundle Size
- [ ] Android: < 2MB
- [ ] Web: < 500KB (gzip)

### Módulos
- [ ] Sem dead code
- [ ] Sem circular imports
- [ ] Imports otimizados

### Runtime
- [ ] Sem N+1 queries
- [ ] Sem memory leaks
- [ ] Sem infinite loops

---

## 6. ACESSIBILIDADE

### Touch Targets
- [ ] Todos buttons ≥ 44px
- [ ] Todos ícones em 44x44 target
- [ ] Sem elementos <30px

### Labels
- [ ] Campos têm labels
- [ ] Botões têm text visível
- [ ] accessibilityRole correto
- [ ] accessibilityLabel quando necessário

### Navegação
- [ ] Tab order lógica
- [ ] Sem keyboard traps
- [ ] Sem color-only info

---

## 7. DADOS

### State Management
- [ ] AsyncStorage funciona
- [ ] Saldos calculados corretamente
- [ ] Sem mutações diretas
- [ ] Sem race conditions

### Validação
- [ ] Campos obrigatórios validados
- [ ] Valores limites verificados
- [ ] Tipos corretos

---

## 8. FUNCIONALIDADES CRITICAS

### Tarefas
- [ ] Urgência ordena corretamente
- [ ] Recorrência funciona
- [ ] Pontos acumulam
- [ ] Confirmação de conclusão

### Compras
- [ ] Items por secção
- [ ] Modo de loja funciona
- [ ] Preço estimado vs real
- [ ] Histórico de compras

### Orçamento
- [ ] Envelopes mostram status
- [ ] Percentagem de uso correto
- [ ] Cores mudam em limites

---

Resultado: [ ] PASSOU / [ ] FALHOU

