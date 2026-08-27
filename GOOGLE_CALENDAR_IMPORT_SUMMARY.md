# Google Calendar Import Implementation

## Implementação da importação do Google Calendar

### 1. Componentes Criados

#### `src/modals/GoogleCalendarImportModal.jsx`
Modal reutilizável para importar eventos do Google Calendar com:
- **Lista de eventos** a importar com hora, data, título e descrição
- **Toggle para eventos recorrentes** (desabilitado por padrão)
- **Três botões de ação**:
  - "Adicionar" — importa para a família (shared: true)
  - "Adicionar Só para Mim" — importa como privado (shared: false)
  - "Ignorar" — marca eventos como ignorados
- **Indicadores visuais** com Pills para data, tipo (recorrente), e fonte (Google Calendar)
- **Tema responsivo** seguindo a paleta do sistema
- **Acessibilidade** com labels e roles ARIA

### 2. Atualizações de Estado (store.jsx)

#### Novo campo de estado
- `googleCalendarImported`: objeto que rastreia IDs de eventos do Google Calendar já importados
- Adicionado aos arrays `DATA_KEYS`, `DEMO()`, e `BLANK()`

#### Nova função de API
```javascript
importGoogleEvents(events, user, shared = true)
```

**Parâmetros:**
- `events`: array de eventos com estrutura `{ id, title, date, time, description, isRecurring }`
- `user`: nome do utilizador (dono do evento)
- `shared`: true para família, false para privado

**Comportamento:**
- Converte eventos do Google Calendar para o formato interno da app
- Adiciona à lista de `added` (eventos criados pelo utilizador)
- Marca eventos como importados em `googleCalendarImported` para evitar duplicatas
- Cada evento importado recebe:
  - ID único: `gcal-{timestamp}-{random}`
  - Campo `source`: "Google Calendar" para rastreamento
  - Campo `isRecurring`: preserva informação de recorrência

### 3. Integração na App (App.jsx)

#### Estado
- Novo estado `googleImport` para controlar visibilidade do modal

#### Lógica de Disparo
useEffect que:
- Verifica se o utilizador é um adulto (não criança)
- Verifica se é a primeira importação (`googleCalendarImported` vazio)
- Dispara o modal automaticamente ao fazer login

#### UI Modal
- Posicionado como overlay na base da tela (`justify-content: flex-end`)
- Fundo semi-transparente (rgba 50% opacity)
- Callbacks para:
  - `onImportAll`: importa eventos para a família
  - `onImportPrivate`: importa como privado
  - `onIgnore`: marca como ignorados
  - `onClose`: fecha o modal

### 4. Estrutura de Eventos Importados

Cada evento importado possui:
```javascript
{
  id: "gcal-{timestamp}-{random}",      // ID único
  day: "2026-08-28",                    // Data em formato YYYY-MM-DD
  time: "14:00",                        // Hora em HH:MM
  title: "Reunião de equipa",           // Título do evento
  who: "Rita",                          // Nome do membro
  owner: "Rita",                        // Proprietário
  shared: true,                         // true: família, false: privado
  source: "Google Calendar",            // Tag de origem
  isRecurring: false,                   // Flag de recorrência
}
```

### 5. Fluxo de Utilização

1. **Primeiro Login:**
   - Utilizador faz login como adulto (Rita ou Tomás)
   - Modal aparece automaticamente com eventos do Google Calendar
   - Se houver eventos recorrentes, toggle está desabilitado por padrão

2. **Importação:**
   - Utilizador pode ativar toggle para incluir recorrentes
   - Clica "Adicionar" (família) ou "Adicionar Só para Mim" (privado)
   - Eventos são adicionados à Agenda com tag "Google Calendar"

3. **Ignorar:**
   - Clica "Ignorar"
   - Eventos são marcados como importados para evitar mostrar novamente
   - Modal fecha

4. **Eventos na Agenda:**
   - Aparecem na lista normal da Agenda
   - Tem source "Google Calendar" para identificação
   - Respeita a visibilidade (privado vs. família)

### 6. Considerações de Implementação

#### Segurança e Privacidade
- **Não está implementado:** Autenticação real do Google Calendar
- **Mock events:** Atualmente usa 3 eventos de demonstração
- **Próximos passos:** Integrar OAuth 2.0 com Google Calendar API

#### Eventos Recorrentes
- A flag `isRecurring` é preservada ao importar
- Não expande automaticamente (não cria múltiplas instâncias)
- Utilador decide se quer incluir via toggle
- Server-side RLS deve controlar visibilidade de recorrentes privados

#### Evitar Duplicatas
- `googleCalendarImported` rastreia eventos já importados
- IDs únicos gerados para cada importação (timestamp + random)
- Se importar novamente, novos IDs são criados (permite re-importar)

#### Touch Targets
- Botões: mínimo 48 px de altura (conforme CLAUDE.md)
- Toggle Switch: altura padrão do React Native (touch-friendly)
- Cards de evento: linha de 44 px mínimo

#### Responsividade
- Modal ocupa fundo da tela com overlay
- ScrollView para lista de eventos (overflow seguro)
- Botões full-width no rodapé
- Tema automático (claro/escuro)

### 7. Testes Recomendados

- [ ] Modal aparece ao fazer login pela primeira vez
- [ ] Toggle de recorrentes funciona corretamente
- [ ] Eventos importados com "Adicionar" aparecem na Agenda como família
- [ ] Eventos importados com "Só para Mim" aparecem apenas para esse utilizador
- [ ] "Ignorar" previne que o modal apareça novamente para os mesmos eventos
- [ ] Eventos recorrentes mostram indicador visual
- [ ] Data e hora são preservadas corretamente
- [ ] Source "Google Calendar" aparece nos eventos
- [ ] Modal fecha ao importar ou ignorar
- [ ] Temas claro e escuro funcionam

### 8. Arquivo TAREFAS.md Relevantes

Após implementar autenticação real, adicionar:
- [ ] Integrar Google Calendar OAuth 2.0 API
- [ ] Buscar eventos reais do Google Calendar
- [ ] Sincronização periódica de eventos
- [ ] Tratamento de erros de autenticação
- [ ] Expiração e refresh de tokens
- [ ] Conformidade GDPR para dados de terceiros

## Summary for Developer

**Files Changed:**
1. `src/modals/GoogleCalendarImportModal.jsx` — New component
2. `src/store.jsx` — Added `googleCalendarImported`, `importGoogleEvents()`
3. `App.jsx` — Added import modal UI and logic

**Integration Points:**
- Modal triggered on adult user login
- Events added to `added` array via `importGoogleEvents()`
- Events appear in Agenda with source tag "Google Calendar"
- Recurring events optional via toggle

**Mock Implementation:**
- Currently uses sample events for demonstration
- Production: Replace with real Google Calendar API OAuth flow
