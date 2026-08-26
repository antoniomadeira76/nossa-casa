# Declaração de Recolha de Dados — RGPD

**Aplicação:** Nossa Casa — Gestão Familiar  
**Data:** 26 de agosto de 2026  
**Versão:** 1.0

---

## 1. Resumo Executivo

Nossa Casa recolhe e processa dados pessoais de famílias (adultos e menores) para fornecer serviços de gestão doméstica. Esta declaração cumpre os requisitos de transparência do RGPD (Artigo 13 e 14).

---

## 2. Identidade do Responsável pelo Tratamento

| Campo | Valor |
|-------|-------|
| **Organização** | Nossa Casa — Gestão Familiar |
| **Tipo** | Aplicação móvel e web |
| **Email** | privacy@nossacasa.app |
| **Localização** | Lisboa, Portugal |
| **Jurisdição** | Lei Portuguesa + RGPD (UE) |

---

## 3. Categorias de Dados Pessoais Recolhidos

### 3.1 Dados de Identificação
```
Nome, Email, Foto de perfil, Google Account ID
Recolha: Obrigatória para autenticação
Base legal: Consentimento + Contrato
```

### 3.2 Dados de Menores
```
Nome, Data de nascimento, Foto (opcional)
Registos de saúde (consultas, alergias, medicações)
Tarefas e pontos de recompensa
Recolha: Com consentimento dos encarregados de educação
Base legal: Consentimento + Proteção de menores
```

### 3.3 Dados Financeiros
```
Orçamentos, Despesas, Envelopes, Transações
Recolha: Voluntária
Base legal: Consentimento + Contrato
Acesso: NUNCA visível a menores
```

### 3.4 Dados de Saúde (Sensíveis)
```
Consultas, Exames, Receitas, Sintomas, Alergias, Medicações
Recolha: Voluntária
Base legal: Consentimento explícito (Artigo 9 RGPD)
Acesso: Apenas membro que adicionou + adultos autorizados
Retenção: Indefinida (até eliminação de conta)
```

### 3.5 Dados de Localização (Opcional)
```
Endereço da casa (para lembretes contextuais)
Recolha: Voluntária
Base legal: Consentimento
Acesso: Apenas local, nunca partilhado
```

### 3.6 Dados Técnicos
```
Tipo de dispositivo, SO, Versão app
Endereço IP, Timestamps
Erros e crashes (para debugging)
Recolha: Automática
Base legal: Interesse legítimo (melhoria do serviço)
Retenção: 30 dias
```

---

## 4. Finalidades do Processamento

| # | Finalidade | Base Legal | Retenção |
|---|-----------|-----------|----------|
| 1 | Fornecer serviços da app | Contrato | Enquanto ativa |
| 2 | Sincronizar entre dispositivos | Contrato | Enquanto ativa |
| 3 | Autenticação e segurança | Contrato | Enquanto ativa |
| 4 | Melhorias da aplicação | Interesse legítimo | 30 dias (logs) |
| 5 | Suporte ao cliente | Interesse legítimo | 6 meses |
| 6 | Conformidade legal | Obrigação legal | Conforme lei |
| 7 | Notificações agenda/tarefas | Consentimento | Enquanto ativa |
| 8 | Proteção de menores | Obrigação legal | Enquanto menor |

---

## 5. Destinatários dos Dados

### 5.1 Partilha Interna
- **Outros membros da família:** Conforme permissões (eventos partilhados, tarefas)
- **Menores:** Sem acesso a dados financeiros, apenas tarefas e saúde própria

### 5.2 Prestadores de Serviços (Processadores)
| Prestador | Dados | Finalidade | Localização | Encriptação |
|-----------|-------|-----------|-------------|------------|
| **Google** | ID + Email | Autenticação | EUA | Sim (Artigo 46 RGPD) |
| **Supabase** | Todos (optional) | Sincronização | UE | Sim |
| **Sentry** | Erros técnicos | Debugging | EUA | Sim |

### 5.3 Transferências Internacionais
- **Google (EUA):** Autorizado via Privacy Shield / SCCs
- **Supabase (UE):** Sem transferência — dados na UE
- **Sentry (EUA):** Dados técnicos, encriptados, com SCCs

### 5.4 NÃO Partilhamos Com
- ❌ Redes sociais (Facebook, Instagram, etc.)
- ❌ Publicidade (Google Ads, etc.)
- ❌ Data brokers
- ❌ Terceiros comerciais

---

## 6. Direitos do Titular dos Dados (RGPD Artigos 15-22)

| Direito | Como Exercer | Prazo |
|--------|-------------|-------|
| **Acesso** | privacy@nossacasa.app | 30 dias |
| **Retificação** | Editar perfil (ou email para ajuda) | Imediato |
| **Eliminação** | Eliminar conta (ou email) | 30 dias + apagamento permanente |
| **Restrição** | privacy@nossacasa.app | 30 dias |
| **Portabilidade** | privacy@nossacasa.app | 30 dias (formato JSON) |
| **Oposição** | privacy@nossacasa.app | 30 dias |
| **Queixa AEPD** | [AEPD.pt](https://www.aepd.pt) | Sem limite |

---

## 7. Menores de Idade

### Consentimento dos Encarregados
- **Menores de 13 anos:** Requer consentimento dos encarregados
- **Menores de 13-16 anos:** Consentimento parental ou próprio (conforme lei)
- **Maiores de 16 anos:** Podem consentir por si próprios

### Proteções Específicas
- Modo criança com interface restrita (sem acesso a orçamentos)
- PIN obrigatório para modo criança
- Dados de menores não são comercializados
- Sem publicidade direcionada
- Sem rastreamento externo

---

## 8. Segurança dos Dados

### Medidas Técnicas
- ✅ Encriptação TLS 1.3 (dados em trânsito)
- ✅ Encriptação AES-256 (dados em repouso)
- ✅ Hash bcrypt para passwords
- ✅ Controle de acesso baseado em papéis

### Medidas Organizacionais
- ✅ Acordo de Processamento de Dados (DPA) com prestadores
- ✅ Formação de privacidade do pessoal
- ✅ Plano de resposta a incidentes
- ✅ Testes de penetração anuais

### Conformidade
- ✅ Implementação de Privacy by Design
- ✅ Avaliação de Impacto na Privacidade (DPIA) realizada
- ✅ Sem violações de dados reportadas

---

## 9. Retenção de Dados

| Tipo de Dados | Retenção | Apagamento |
|--------------|----------|-----------|
| Conta ativa | Enquanto ativa | Imediato após eliminação |
| Backups | 90 dias | Automático |
| Logs técnicos | 30 dias | Automático |
| Logs de acesso | 30 dias | Automático |
| Dados de menores | Até 18 anos (se requerido) | Ou após eliminação de conta |

---

## 10. Automatização e Decisões

A aplicação **não utiliza**:
- ❌ Perfilação automática
- ❌ Decisões automatizadas com efeito legal
- ❌ Algoritmos de recomendação baseados em IA

Toda a inteligência é local e não treina sobre dados pessoais.

---

## 11. Cookies e Rastreamento

### Aplicação Móvel
- ❌ Nenhum cookie
- ❌ Nenhum rastreamento

### Aplicação Web
- ✅ Cookies técnicos (autenticação, sessão)
- ⚠️ Cookies analíticos (opcional, posso desativar)
- ❌ Cookies de publicidade
- ❌ Rastreamento externo

---

## 12. Contacto para Privacidade

| Função | Email | Responsabilidade |
|--------|-------|-----------------|
| **DPO** | dpd@nossacasa.app | Conformidade RGPD |
| **Privacidade** | privacy@nossacasa.app | Pedidos de dados, direitos |
| **Suporte** | support@nossacasa.app | Problemas técnicos |

---

## 13. Alterações a Esta Declaração

Podemos atualizar esta declaração. Notificaremos alterações significativas por email.

**Última atualização:** 26 de agosto de 2026

---

## Anexos

### Anexo A: Lista de Processadores
- Google (Autenticação)
- Supabase (Sincronização opcional)
- Sentry (Logging de erros)

### Anexo B: Transferências Internacionais
- Google (EUA): Privacy Shield + SCCs
- Supabase (UE): Sem transferência

### Anexo C: Avaliação de Impacto (DPIA)
- Conclusão: Risco baixo
- Medidas de mitigação: Em implementação
- Data da próxima revisão: agosto 2027

---

**Declaração assinada e datada:** 26 de agosto de 2026

*Esta declaração é obrigatória conforme Artigo 13 RGPD para recolha de dados junto do titular.*
