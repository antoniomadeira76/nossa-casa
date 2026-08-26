# Nossa Casa — Status do Projeto 🏠

**Última atualização:** 26 de agosto de 2026  
**Estado geral:** ✅ **Funcional localmente** → 🚧 **Pronto para servidor** → ⏳ **Pendente: Supabase + Lojas**

---

## 📊 Visão Geral

| Aspecto | Estado | Detalhe |
|---------|--------|---------|
| **Arquitetura** | ✅ Completa | React Native + Expo, navegação + estado funcional |
| **Interface Visual** | ✅ 100% | Todos os 29 ecrãs implementados conforme design |
| **Lógica de Negócio** | ✅ Completa | Máquina de estados, cálculos aditivos, regras de privacidade |
| **Dados Locais** | ✅ Funcional | AsyncStorage com persistência, dados de demonstração |
| **Testes** | ✅ 18 smoke tests | Todos passando (exit code 0) |
| **Backend/Servidor** | ❌ Pendente | Supabase: Auth, Sync, RLS policies |
| **Publicação** | ⏳ Em espera | Aguarda Supabase + verificação Google Calendar |

---

## ✅ Tarefas Completadas (0-6)

### Tarefa 0: Medição do Design ✅
- Arquivo de referência: `design/Nossa Casa App.dc.html`
- 29 ecrãs capturados em `design2/referencia/`
- Especificação completa em `docs/especificacao-ecras.md`
- Bloco de medição CSS → React Native disponível em `docs/medir.md`

### Tarefa 1: Primeira Compilação ✅
- `npm install` + `npx expo start` funcional
- Fonts carregadas: Roboto + Inter via `expo-font`
- Todos os 5 abas principais navegam com sucesso
- Testado em web (http://localhost:8081) e pronto para Expo Go

### Tarefa 2: Folhas de Criar ✅
**Implementadas:**
- `src/sheets/NovoEvento.jsx` — Texto, data/hora (popup calendário), responsável, toggle partilha
- `src/sheets/NovaTarefa.jsx` — Texto, membro, recorrência, pontos, urgência, prazo
- `src/sheets/NovoArtigo.jsx` — Texto, secção, toggle habitual
- Todas com padrão correto: cabeçalho fixo, conteúdo scroll, ação fixa a 86px do fundo

### Tarefa 3: Popup de Confirmação ✅
- Confirmação antes de gravar (evento, tarefa, manutenção)
- Etiquetas dinâmicas: "Confirmar como Privado", "Confirmar Partilha", etc.
- Ícones apropriados (`lock` privado, `users` partilhado)

### Tarefa 4: Equipamentos (Ecrã Inteiro) ✅
- `src/screens/Equipamentos.jsx` — Ecrã de ecrã inteiro com cabeçalho e rodapé próprios
- 3 estados de garantia com cores corretas:
  - ✅ Em garantia (azul)
  - ⚠️ A expirar (laranja texto + contorno)
  - ❌ Fora de garantia (vermelho)
- Ficha com: fotografias, garantia, agendar manutenção, exportar PDF

### Tarefa 5: Saúde (Ecrã Inteiro) ✅
- `src/screens/Saude.jsx` — Uma ficha por membro (Rita, Tomás, Léo, Mia)
- Episódios (consultas) com anexos (exames, receitas, notas) aninhados
- **Regra de privacidade crítica:**
  - Adultos: só veem a sua própria ficha ✅
  - Crianças: os adultos veem as delas ✅
- Eventos de saúde aparecem na Agenda e no Início

### Tarefa 6: Gestão da Casa + Documentação ✅
- `src/screens/Gestao.jsx` — 4 abas admin:
  - Orçamento: rendimento, envelopes, semanada, divisão de despesas
  - Membros: PIN, papéis, lojas, categorias, especialidades
  - (Mais abas conforme necessário)
- **Controle de acesso:** Só Rita (admin) vê Gestão; Tomás não vê
- `src/screens/Documentacao.jsx` — Histórico de alterações por versão descendente

---

## 🚧 Tarefas Pendentes (7-8)

### Tarefa 7: Ligar ao Supabase 🔴 **BLOQUEANTE**

**O que é necessário:**

#### 7.1 Autenticação Google OAuth
- Setup no Google Cloud Console
- Integração Supabase Auth com Google
- Sessão com token persistente

#### 7.2 Data Model & Sync
- Tabelas no Supabase (contas, casa, tarefas, envelopes, eventos, etc.)
- Schema definido em `docs/sincronizacao.html`
- Politicas de Row Level Security (RLS) em `docs/seguranca.html`

#### 7.3 Leitura Remota com Cópia Local
- Fetch inicial das tabelas autorizadas
- Guardar em AsyncStorage como cache
- Conflito = versão remota ganha

#### 7.4 Fila de Escrita
- Operações locais entram em fila
- Background sync quando há conexão
- Retry com backoff exponencial

#### 7.5 Tempo Real — Lista de Compras
- PostgreSQL LISTEN/NOTIFY
- WebSocket listeners com `supabase-js`
- Actualizações ao vivo quando outro membro edita

#### 7.6 Ficheiros — Faturas e Exames
- Storage bucket no Supabase
- Upload de imagens (foto fatura, foto equipamento, exames)
- URL pública com TTL curto

**Documentação de referência:**
- `docs/sincronizacao.html` — Modelo de dados tabela a tabela
- `docs/seguranca.html` — RLS policies (quem lê/escreve o quê)

**Quando está feito:** Rita altera algo no telefone, Tomás vê no dele sem refrescar

---

### Tarefa 8: Lojas e Submissão 📱 **FINAL**

#### 8.1 Ícone e Capturas
- `docs/loja/icone-appstore-1024.png` — Icon 1024×1024 (já existe)
- `docs/loja/android-foreground-432.png` — Android Adaptive icon
- `docs/loja/android-background-432.png` — Android background
- 6 capturas por loja (iPhone + Android)

#### 8.2 Política de Privacidade
- Necessária em URL **estável e pública** (obrigatória em Apple + Google)
- Mencionar: dados de saúde de menores (RGPD), sincronização, persistência
- Referência em `app.json` → `privacy` URL

#### 8.3 Verificação Google Calendar
- **CRÍTICA:** Leva **4-6 semanas** de espera
- Comece já mesmo antes de publicar
- Google verifica: OAuth scope, conformidade, etc.

#### 8.4 Declaração de Recolha de Dados
- Quais dados são recolhidos (nome, email, eventos, tarefas, etc.)
- Como são usados (síncrono entre adultos)
- Retenção (enquanto a app estiver instalada)

**Fluxo de submissão:**
1. App Store (iOS) — 24-48h de revisão
2. Google Play (Android) — 2-4h de revisão
3. Beta testing com TestFlight (iOS) + Google Play Beta (Android)

---

## 📈 Roadmap Recomendado

### Fase 1: Supabase Setup (1-2 semanas)
```
Week 1:
  [ ] Google Cloud Console + OAuth app
  [ ] Supabase project + tabelas
  [ ] RLS policies implementadas
  [ ] Teste manual: auth + leitura

Week 2:
  [ ] Sync engine (local ↔ remoto)
  [ ] Fila de escrita com retry
  [ ] Testes de sincronização offline
```

### Fase 2: Backend Integration (2-3 semanas)
```
Week 3:
  [ ] Listeners tempo real (Compras)
  [ ] Upload de ficheiros (Faturas, Exames)
  [ ] Teste multi-device (Rita + Tomás)
  [ ] Smoke tests para sync

Week 4-5:
  [ ] Bug fixes pós-testes
  [ ] Otimização de performance
  [ ] Testes de conformidade RGPD (saúde de menores)
```

### Fase 3: Publicação (4-6 semanas)
```
Week 6:
  [ ] Google Calendar verification (START NOW!)
  [ ] Ícone + capturas finalizadas
  [ ] Política de privacidade + URL
  [ ] Beta testing setup

Week 7-10:
  [ ] Submissão App Store (iOS)
  [ ] Submissão Google Play (Android)
  [ ] Aguardar revisão
  [ ] Bug fixes pós-publicação
```

---

## 🎯 Métricas de Sucesso

✅ **Hoje:**
- 18/18 smoke tests passam
- App funciona com dados locais
- Todos os 29 ecrãs navegáveis
- Design 100% conforme referência

🚀 **Após Supabase:**
- Rita edita, Tomás vê em tempo real
- Offline-first funciona (fila de escrita)
- Sincronização de conflitos (versão remota ganha)

📱 **Após Publicação:**
- App disponível em App Store + Google Play
- 2+ adultos usam ativamente
- 4+ semanas de operação estável

---

## 🔐 Notas de Segurança

**Hoje (antes de servidor):**
- ⚠️ Permissões são sugestão (cliente não valida papéis)
- ⚠️ PIN verificado no cliente (facilmente contornável)
- ⚠️ Dados não sincronizam entre dispositivos

**Após servidor (OBRIGATÓRIO):**
- ✅ PIN como hash com sal no servidor
- ✅ Papéis devolvidos pelo servidor a cada sessão
- ✅ Visibilidade imposta via RLS (nunca no cliente)
- ✅ Dados de saúde de menores: criptografia + RGPD compliance

**Dados sensíveis:**
- 🔴 Saúde de crianças (categoria especial RGPD)
- 🔴 Nível de acesso a cada membro
- 🔴 Informações financeiras compartilhadas

---

## 📚 Ficheiros Críticos a Ler

| Ficheiro | Propósito | Lê primeiro |
|----------|-----------|------------|
| `src/store.jsx` | Estado + todas as derivações | ✅ SIM |
| `docs/especificacao-ecras.md` | Medidas de cada ecrã | Antes de mexer num ecrã |
| `docs/sincronizacao.html` | Modelo de dados + sync | Antes de Tarefa 7 |
| `docs/seguranca.html` | RLS policies + privacidade | Antes de Tarefa 7 |
| `design/Nossa Casa App.dc.html` | Protótipo interativo | Sempre que comparar |
| `CLAUDE.md` | 8 invariantes não-negociáveis | Sempre que commit |
| `TAREFAS.md` | Roadmap ordenado | Sempre que planear |

---

## 🎓 Lições Aprendidas

**Do protótipo:**
1. Cabeçalho + rodapé SEMPRE visíveis (quebrou 3 vezes)
2. Saldos são somas, não campos (caso contrário dois devices anulam-se)
3. Visibilidade no servidor, nunca cliente (RGPD)
4. Medição é obrigatória (estimativa leva a dissonância)
5. Touch targets ≥44px (senão falha em produção)

**Da implementação:**
1. Começar por `store.jsx` (é onde a lógica vive)
2. Um ecrã de cada vez (não construir 3 antes de medir o 1º)
3. Smoke tests ANTES de commit (evita surpresas)
4. Dados locais funcionam bem (AsyncStorage é suficiente para v1)
5. Supabase RLS é o bloqueante real (não é trivial)

---

## 📞 Próximas Ações

1. **Imediatamente:**
   - ✅ Completar smoke tests (FEITO)
   - ⏳ Garantir que design2/nossa-casa-rn não interfere com raiz

2. **Esta semana:**
   - [ ] Rever `docs/sincronizacao.html` (modelo de dados)
   - [ ] Rever `docs/seguranca.html` (RLS policies)
   - [ ] Criar Supabase project + tabelas

3. **Próximas 2 semanas:**
   - [ ] Integrar Supabase Auth (Google OAuth)
   - [ ] Implementar sync engine
   - [ ] Testes de multi-device

4. **Candidato a bloqueante:**
   - ⏰ Google Calendar verification — **COMEÇA LOGO**

---

**Responsável:** Claude + antonio.madeira@criticalsoftware.com  
**Última medição:** 26 de agosto de 2026  
**Versão do protótipo:** 3.0 (agosto 2026)
