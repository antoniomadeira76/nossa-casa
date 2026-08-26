# Implementação: Supabase Sync e App Store

## Task 7: Supabase Sync

**Estado:** Skeleton criado em `src/supabase.js`. RLS policies documentadas. Pronto para implementação.

### Passos (por ordem de risco):

1. **Auth + Sessão** (1-2 dias)
   - Criar tabelas: `auth.users`, `public.members` (com papéis)
   - Implementar `signInAdult()` e `signInChild(houseName, childName, pin)`
   - PIN verificado no servidor (hash com sal)
   - Sessão devolve papéis que não podem ser editados no cliente

2. **Read Snapshot** (1 dia)
   - `fetchHouse()` puxa todas as tabelas filtradas por RLS
   - Merge local com remoto (sem conflitos na primeira sync)
   - Timestamp em cada registo para conflito resolver

3. **Write Queue** (2 dias)
   - Cada `set()` no store enfileira: `{ table, op, data, at, idempotencyKey }`
   - `flushQueue()` envia por ordem, com retry exponencial
   - Operações idempotentes (chave única por `at + table + id`)

4. **Real-Time (Shopping List)** (1 dia)
   - Realtime channel para itens
   - WebSocket update quando outro membro confirma artigo
   - Não precisa de full sync para shopping

5. **File Storage** (1 dia)
   - Bucket para faturas (equipamentos) e exames (saúde)
   - Signed URLs (1 hora validade)
   - Upload no dispositivo, servidor guarda referência

6. **RLS Policies** (1 dia)
   - Implementar tabela a tabela per `RLS_RULES` em `supabase.js`
   - Testar escalação: criança → adulto não permite

**Deploy sequence:**
1. Deploy schema + RLS
2. Wire `syncManager.startSync()` em App.jsx boot
3. Teste offline → online → sync
4. Teste conflitos com dois telefones simultâneos

---

## Task 8: App Store (iOS + Android)

**Estado:** Assets em `docs/loja/`. Ícone já existe. Falta política de privacidade e verificações.

### Antes de submeter (8-12 semanas antes):

1. **Documentação Legal** (1-2 semanas)
   - Política de privacidade (RGPD: menores, dados sensíveis)
     - Localizar em domínio estável (não pode desaparecer)
     - Explicar: recolha (nome, tarefas, semanada, saúde), fim (familiar), direitos RGPD
   - Termos de serviço
   - Declaração de conformidade LGPD (Brasil) se aplicável

2. **Google Play** (4 semanas)
   - Criar conta desenvolvedora
   - Assinar Play Developer Program
   - Preparar: ícone 512x512, capturas (6), descrição (em PT)
   - Preencher formulário de conformidade crianças
   - **Crítico:** Google Calendar OAuth exige verificação (3 semanas) → começar já

3. **App Store (iOS)** (3-4 semanas)
   - Programa Apple Developer
   - Certificado de distribuição
   - Preparar app (ícone, capturas, descrição)
   - Build com Xcode (não via Expo EAS por enquanto)

4. **Verificação Google Calendar** (3 semanas)
   - Pedir acesso sensível (calendar) → Google verifica app
   - Precisa de política de privacidade já publicada
   - Callback URI: `https://seu-dominio.com/auth/google/callback`

5. **Testes Antes de Submeter**
   - Device: Android real (Samsung, Xiaomi)
   - Device: iPhone (qualquer versão ≥ 13)
   - Offline → online sim.
   - Dois telefones a editar em paralelo (conflito resolve)
   - PIN das crianças (4 dígitos, validação servidor)
   - Acesso saúde (adulto A não vê adulto B)

6. **Build Final**
   - `eas build --platform android --release`
   - `eas build --platform ios --release`
   - Ou via Android Studio + Xcode localmente

### Checklist Pré-Lançamento

- [ ] Política privacidade publicada em domínio estável
- [ ] Google Calendar OAuth verification completa
- [ ] Dois telefones testados com sync live
- [ ] PIN servidor-verificado (hash + sal)
- [ ] Saúde: adulto A não vê adulto B (RLS testado)
- [ ] App Store descrição (PT) pronta
- [ ] Google Play descrição (PT) pronta
- [ ] Ícone 512x512 + 6 capturas por plataforma
- [ ] Build prod gerado e testado
- [ ] Crash reporting ativo (Sentry ou similar)

---

## Próximas Prioridades

**Semana 1:** Auth + Write Queue (riscos maiores)  
**Semana 2:** RLS + Read Snapshot  
**Semana 3:** Real-time + Files  
**Semana 4:** Google Calendar verificação + Legal docs  
**Semana 5-8:** Build final + Testes + Submissão
