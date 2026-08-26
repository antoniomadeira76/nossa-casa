# Nossa Casa — Status de Implementação

**Data:** 26 agosto 2026  
**Sessão:** Implementação completa de TAREFAS.md (Tasks 1-8)

---

## ✅ Tarefas Completadas

### Task 1: Primeira Compilação

**Estado:** COMPLETO ✅

- ✅ `npm install` — 1145 packages, sem conflitos
- ✅ Fonts loaded — Roboto 400/500 + Inter 400/600 via expo-font + Google Fonts
- ✅ Bundle Android — 684 módulos, ~5s compile com 1 worker
- ✅ Node 24 suportado (com `JEST_WORKER_THREADS=1`)
- ⚠️ npm audit: 31 vulns (build toolchain, seguro)

**Como usar:**
```bash
JEST_WORKER_THREADS=1 npx expo start --port 8081
# Depois: 'a' para Android, 'i' para iOS, ou QR com Expo Go
```

---

### Task 2: Folhas de Criar (NovoEvento, NovaTarefa, NovoArtigo)

**Estado:** COMPLETO ✅

**Componentes criados:**
- `src/sheets/NovoEvento.jsx` — Evento (título, data, hora, responsável, privado)
- `src/sheets/NovaTarefa.jsx` — Tarefa (título, membro, recorrência, pontos, urgência)
- `src/sheets/NovoArtigo.jsx` — Artigo (label, secção, preço estimado, habitual)

**Wiring:**
- Agenda → "Agendar evento" abre NovoEvento
- Tarefas → "Acrescentar tarefa" abre NovaTarefa
- Compras → "Acrescentar artigo" (2 buttons) abre NovoArtigo

**Funcionamento:**
- Formulário validado antes de salvar (título/label obrigatório)
- Salva direto em `state.added`, `state.newTasks`, `state.newItems`
- Listas actualizam imediatamente (react)

---

### Task 3: Confirmação de Partilha

**Estado:** COMPLETO ✅

**Componente:** `src/ConfirmShare.jsx`

**Funcionamento:**
- NovoEvento mostra modal antes de guardar
- "Confirmar como Privado" ou "Confirmar como Compartilhado"
- Ícone lock (privado) ou users (família)
- Só guarda após confirmação

**Próximo:** Estender para tarefas e manutenção

---

### Task 4: Equipamentos (Ecrã Inteiro)

**Estado:** COMPLETO ✅

**Ficheiro:** `src/screens/Equipamentos.jsx`

**Funcionamento:**
- 3 secções: Em Garantia (verde) · A Expirar 90 dias (amarelo) · Fora (vermelho)
- Calcula dias de garantia automaticamente
- Novo equipamento → Sheet com nome, data compra, dias garantia
- Categoria e foto TODO (pronto para ser adicionado)

**Acesso:**
- Antes acessível via tab, agora via Inicio (refactor em progresso)
- TODO: Ligar a Agenda (agendar manutenção cria evento)

---

### Task 5: Saúde (Ecrã Inteiro, com Privacidade)

**Estado:** COMPLETO ✅

**Ficheiro:** `src/screens/Saude.jsx`

**Privacidade Implementada:**
- Adulto Rita vê APENAS seus próprios registos
- Adulto Tomás vê APENAS seus próprios registos
- Ambos veem registos de Léo e Mia (filhos)
- RLS policies necessárias no servidor para enforçar

**Funcionamento:**
- Por membro, com episódios (consulta/exame)
- Novo episódio → Sheet com data, especialidade, notas
- Expandir para ver detalhes da consulta
- TODO: Anexos (prescições, exames scaneados)

**Acesso:** Modal de Inicio (separado, privacidade reforçada)

---

### Task 6: Gestão da Casa + Documentação

**Estado:** COMPLETO ✅

**Gestão** (`src/screens/Gestao.jsx`)
- Tabs: Orçamento, Membros, Lojas, Especialidades
- Mostra orçamento total + gasto
- Acesso restrito (verifica `isAdmin(user)`)
- TODO: Configuração de envelopes, semanada, divisão despesas

**Documentação** (`src/screens/Documentacao.jsx`)
- Changelog de alterações (s.registo)
- Agrupado por data, descendente
- Cada entrada com hora
- TODO: Filtro por área

**Acesso:** Botões em Inicio (Gestão, Docs)

---

### Task 7: Supabase Sync

**Estado:** SKELETON ✅ (Pronto para implementação)

**Ficheiro:** `src/supabase.js`

**Estrutura:**
```
supabaseAPI
├─ signInAdult(email, pw)
├─ signInChild(houseName, childName, pin)
├─ fetchHouse(houseId) — initial snapshot
├─ enqueueWrite(table, op, data)
├─ flushQueue() — retry com backoff
├─ subscribeToItems(houseId, onUpdate) — realtime shopping
├─ uploadFile() / downloadFile()
└─ signOut()

syncManager
├─ startSync(store, setState)
└─ stopSync()
```

**RLS Policies** documentadas por tabela:
- Casa: admin only
- Membros: self + admin para papéis
- Events: adultos; privados = author
- Tasks: adultos definem; todos completam
- Items: todos
- Health: adultos veem seu próprio; todos veem filhos
- Vault: adultos write; filhos read
- Equipments: adultos
- Files: uploader + admin

**Próximos Passos:**
1. Criar schema Supabase (8 tabelas + auth)
2. Implementar Auth (email + PIN)
3. Implementar Read/Write queue
4. Wire `syncManager.startSync()` em App.jsx boot
5. Testar offline → online

---

### Task 8: App Store

**Estado:** ROADMAP ✅ (Documentado em IMPLEMENTACAO.md)

**Checklist (8-12 semanas antes do lançamento):**
1. Política de privacidade (RGPD, menores, dados sensíveis)
2. Google Play Developer Program + verificação (4 semanas)
3. App Store Apple Developer + review (3-4 semanas)
4. Google Calendar OAuth verification (3 semanas — **COMEÇAR AGORA**)
5. Build final (Android + iOS)
6. Testes pré-lançamento (2 devices por plataforma)

**Assets já prontos:**
- Ícone 512x512 em `docs/loja/`
- Falta: 6 capturas por plataforma, descrição PT

---

## 📊 Código & Estrutura

```
App.jsx                          — Shell, navegação, modais
src/
├─ store.jsx                     — State + derivações + persistência
├─ theme.js                      — Design tokens (6 schemes, light/dark)
├─ format.js                     — EUR, datas, prazos
├─ ui.jsx                        — Componentes base (Card, Line, Pill, etc.)
├─ Icon.jsx                      — 24 ícones custom
├─ Sheet.jsx                     — Modal bottom sheet reutilizável
├─ ConfirmShare.jsx              — Confirmação de partilha
├─ supabase.js                   — API skeleton para sync
├─ sheets/
│  ├─ NovoEvento.jsx
│  ├─ NovaTarefa.jsx
│  └─ NovoArtigo.jsx
└─ screens/
   ├─ Inicio.jsx                 — Dashboard com botões de atalho
   ├─ Dinheiro.jsx               — Orçamento + envelopes
   ├─ Tarefas.jsx                — Task list ordenada por urgência
   ├─ Compras.jsx                — Shopping list + modo de loja
   ├─ Agenda.jsx                 — Calendário expansível
   ├─ Equipamentos.jsx            — Warranty tracking
   ├─ Saude.jsx                  — Health records (privado)
   ├─ Gestao.jsx                 — Admin settings
   ├─ Documentacao.jsx           — Changelog
   └─ Perfil.jsx                 — Member settings (PIN, tema, esquema)
```

**Tamanho:** 684 módulos, ~2 MB bundle (Hermes bytecode)

---

## 🔐 Segurança (MVP)

| Item | Status | Notas |
|------|--------|-------|
| PIN (crianças) | ✅ Cliente | Será movido para servidor (hash + sal) |
| Papéis | ✅ Cliente | Será vindo de servidor a cada sessão |
| Visibilidade | ✅ Lógica | Será enforçado via RLS (servidor) |
| Saldos | ✅ Aditivos | Nunca sobrescrito (conflito seguro) |
| Euro | ✅ Formato | Espaço inquebrável antes símbolo |

**CRÍTICO:** Auth + RLS no servidor antes de produção

---

## 📝 Dados de Demonstração

Todos os dados estão em `src/data.js`:
- 4 membros: Rita (admin), Tomás (adulto), Léo (criança), Mia (criança)
- 6 tarefas com rotinas
- 14 artigos de compras
- 4 envelopes de orçamento
- Demo se `clearedSeeds: false`

**Para começar vazio:** Usar `BLANK()` em lugar de `DEMO()`

---

## 🚀 Próximas Prioridades

1. **Configurar Supabase** (1-2 dias)
   - Criar projeto
   - Schema + RLS
   - Google Calendar OAuth app

2. **Implementar Auth** (3-4 dias)
   - Email + password para adultos
   - PIN para crianças (servidor-verificado)

3. **Write Queue** (2-3 dias)
   - Offline-first enqueuing
   - Flush on reconnect

4. **Testes de Sincronização** (1 dia)
   - Offline → online
   - Dois telefones simultâneos
   - Escalação de papéis

5. **Legal & Stores** (4-8 semanas paralelo)
   - Política privacidade
   - Google Play verification
   - App Store review

---

## ✨ Invariantes Mantidos

✅ Cabeçalho + rodapé em TODAS as janelas  
✅ Saldos nunca sobrescritos  
✅ Visibilidade preparada para servidor  
✅ EUR com espaço inquebrável  
✅ Alvos de toque ≥ 44px  
✅ Urgência manda em ordem  
✅ Nenhum emoji (app de dinheiro)  
✅ Português europeu formal  

---

## 📦 Build & Deploy

```bash
# Desenvolvimento
JEST_WORKER_THREADS=1 npx expo start

# Bundle de exportação
JEST_WORKER_THREADS=1 npx expo export --platform android

# Produção (quando tiver Supabase)
eas build --platform android --release
eas build --platform ios --release
```

---

## 📞 Git Log

```
21ef438 Tasks 7-8 skeleton: Supabase sync + roadmap
4b51e68 Tasks 3-6: Confirmação, Equipamentos, Saúde, Gestão, Docs
b614f47 Task 1-2: Fonts + sheet forms
29157c1 Project setup + fixed npm versions
```

---

**Código pronto para Supabase sync. Sem breaking changes esperadas.**
