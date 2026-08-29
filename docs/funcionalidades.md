# Funcionalidades — especificação completa

Este documento existe para responder a uma pergunta: **o que acontece quando se toca em cada
coisa.** As medidas estão em `especificacao-ecras.md`, as imagens em `referencia/`. Aqui está o
comportamento.

Escrito a partir do protótipo (`design/Nossa Casa App.dc.html`). Quando houver dúvida, o
protótipo decide — abra-o e experimente.

---

# 1. Modelo de estado

## 1.1 Persistido — os dados da casa

Uma chave versionada. No protótipo é `localStorage['nossa-casa/v1']`; em produção é o Supabase
com cópia local. O formato é `{ v: 1, savedAt: ISO, ...dados }` — se `v` não corresponder, a
app ignora o guardado e arranca na demonstração, em vez de quebrar com um formato antigo.

| Chave | Forma | O que guarda |
|---|---|---|
| `done` | `{taskId: bool}` | Tarefas concluídas |
| `pending` | `{taskId: bool}` | Marcadas pela criança, à espera de confirmação |
| `doneAt` | `{taskId: dayKey}` | Dia em que foi concluída (para as recorrentes reaparecerem) |
| `urg` | `{taskId: 0\|1\|2}` | Urgência: 0 urgente, 1 normal, 2 sem pressa |
| `due` | `{taskId: {key, time}}` | Prazo |
| `rotate` | `{taskId: bool}` | Alterna semanalmente entre as crianças |
| `taskOrder` | `[taskId]` | Ordem manual dentro de cada grupo de urgência |
| `newTasks` | `[obj]` | Tarefas criadas pelo utilizador |
| `taskEdits` | `{taskId: patch}` | Alterações a tarefas de origem |
| `taskGone` | `{taskId: bool}` | Removidas |
| `status` | `{itemId: 'open'\|'done'\|'skip'}` | Estado de cada artigo na loja |
| `newItems`, `itemGone`, `itemOrder` | | Artigos criados / removidos / ordenados |
| `registered` | número | Total das compras fechadas este mês |
| `compras` | `[obj]` | Histórico — as últimas 10 compras |
| `shopPlan` | `{who, key, time, loja}` | Quem vai às compras, quando, onde |
| `lojas` | `[string]` | Supermercados |
| `envMove` | `{envName: delta}` | Movimentos entre envelopes (aditivo) |
| `monthLimits` | `{envName: valor}` | Limites do mês corrente |
| `monthName`, `monthZero` | | Mês aberto e se os gastos foram reiniciados |
| `renda` | número | Rendimento mensal previsto |
| `despesas` | `[obj]` | Despesas registadas à mão |
| `settled` | bool | Contas entre os adultos acertadas |
| `settleLog` | `[obj]` | Pagamentos parciais (aditivo) |
| `vault` | `{criança: saldo}` | Cofres — **sempre a soma dos movimentos** |
| `paidPts` | `{criança: pontos}` | Pontos já pagos |
| `extraLog` | `{criança: [mov]}` | Bónus e retiradas |
| `ptValue`, `payDay`, `splitHalf` | | Valor do ponto, dia de pagamento, divisão |
| `newEquip`, `equipGone`, `equipEdits` | | Equipamentos |
| `cats` | `[string]` | Categorias de equipamento |
| `saude` | `{membro: [episódio]}` | Fichas de saúde |
| `especialidades` | `[string]` | Especialidades médicas |
| `added`, `eventGone`, `eventEdits` | | Eventos da agenda |
| `importDone` | `{membro: bool}` | Sugestões do Calendar já tratadas |
| `roles` | `{membro: 'admin'\|'adulto'\|'crianca'}` | Papéis |
| `pins` | `{criança: '1234'}` | PIN — **sem valor de fábrica** |
| `schemeByUser` | `{userIdx: n}` | Esquema de cor por perfil |
| `themeByUser` | `{userIdx: 'claro'\|'escuro'\|'sistema'}` | Aspeto por perfil |
| `notif` | `{digest, hour, lead}` | Avisos |
| `registo` | `[obj]` | Histórico de tudo o que mudou |
| `docSeen` | `{versão: bool}` | Versões da documentação já vistas |
| `setupDone` | bool | Arranque de casa nova concluído |
| `clearedSeeds` | bool | Casa começada de zero |

## 1.2 Transitório — nunca persistido

Separador ativo, folha aberta, diálogo de confirmação, rascunhos a meio, filtro, entrada de PIN,
passo da loja, equipamento selecionado, recibos de exportação, mês do calendário, campo numérico
em edição. **Abrir a app não a devolve a meio de uma folha.**

## 1.3 Regra que governa tudo

**Saldos nunca são campos escritos.** Cofres, envelopes, pontos e acerto de contas são somas de
movimentos. Escrever `saldo = X` é o erro que faz dois telefones anularem-se — e é a diferença
entre perder e não perder dinheiro. Ver `src/store.jsx`.

---

# 2. Valores derivados

Calculados a cada render, nunca guardados. Estão em `renderVals()` no protótipo e em
`src/store.jsx` no projeto.

## 2.1 Dinheiro

```
orçamento      = soma dos limites dos envelopes (ou 2400 por omissão)
gasto          = (monthZero ? 0 : 1687,40) + registered + soma(despesas)
disponível     = orçamento − gasto
envelope.usado = base + despesas nesse envelope (+ registered, na Mercearia)
envelope.limite= monthLimits[nome] + envMove[nome]
envelope.livre = limite − usado
aperta         = usado / limite >= 0,94   → aviso amarelo + ação Reforçar
```

**Mover dinheiro:** retira ao limite de um envelope e acrescenta ao de outro. Não sai dinheiro da
conta. O valor máximo é o livre do envelope de origem; acima disso o botão fica cinza e diz
*Valor Indisponível*. A pré-visualização nomeia os dois limites resultantes.

**Acerto de contas:** `deve = 86,50 − soma(settleLog)`. Pagamento parcial é permitido (Tudo,
Metade, ou valor à escolha) e o resto continua a dever-se. Casa nova começa a zero e o cartão diz
*Está tudo acertado*.

## 2.2 Semanada

```
pontos(criança)   = base + soma(pontos das tarefas concluídas dela)
por pagar         = pontos − paidPts[criança]
valor por pagar   = por pagar × ptValue
pagar semanada    → vault += valor · paidPts = pontos · movimento no extraLog
```

`ptValue` é livre entre 0,01 e 5,00 €, com passo de 0,05 no −/+. `payDay` é qualquer dia da
semana. Ambos só o administrador altera.

## 2.3 Tarefas

**Três estados:** por fazer → (criança marca) a confirmar → (adulto confirma) concluída. Um adulto
que toque numa tarefa por fazer conclui-a diretamente. **Os pontos só contam quando confirmada.**

**Recorrência:** uma tarefa recorrente concluída mostra *"feita hoje · volta amanhã"* e reaparece
por fazer no dia seguinte (compara `doneAt` com o dia atual). As pontuais ficam concluídas.

**Ordem:** por urgência (0, 1, 2), e dentro do grupo por `taskOrder`. Os números renumeram-se
1, 2, 3… dentro de cada grupo. **Mudar a urgência move a tarefa e renumera.**

**Rotação:** com `rotate` ligado, alterna entre Léo e Mia conforme a paridade da semana do ano.

**Prazo:** a segunda linha mostra o prazo em vez da recorrência, com cor — *atrasada 1 dia*
(vermelho), *hoje às 18:00 · falta 2h20* (âmbar), *quinta, 22/08* (cinza).

## 2.4 Compras

```
carrinho    = soma dos preços reais dos artigos confirmados
estimativa  = soma das estimativas dos artigos por comprar
por confirmar= artigos com status 'open'
sem stock   = artigos com status 'skip'
```

A barra do carrinho é azul, âmbar acima de 80 % do livre do envelope Mercearia, e vermelha acima
de 100 %. Fechar a conta escreve o total em `registered`, acrescenta ao `compras`, e divide com o
outro adulto se `splitHalf`.

**Ordem dos corredores** segue a loja onde se está a comprar.

## 2.5 Garantias

```
dias = warrantyEnd − hoje
dias > 90   → Em Garantia        (verde)
0 … 90      → Garantia a Expirar (laranja: texto e contorno)
dias < 0    → Fora de Garantia   (vermelho: texto e contorno)
```

## 2.6 Precisa de Si

No topo do Início, por ordem de urgência, e **desaparece quando vazio**:

1. Tarefas a confirmar (azul) — se houver `pending`
2. Contas por acertar (ação) — se `!settled` e há valor
3. Envelope no limite (âmbar) — um por envelope acima de 94 %
4. Garantia a expirar (âmbar) — uma por equipamento entre 0 e 90 dias
5. Tarefas por fazer hoje (cinza)

Singular e plural tratados (*1 tarefa*, *2 tarefas*), nomes deduplicados. Cada linha navega para
o sítio respetivo.

## 2.7 Visibilidade

| Dado | Quem vê |
|---|---|
| Evento partilhado | Todos os membros |
| Evento privado | Só o autor |
| Ficha de saúde de adulto | Só esse adulto |
| Ficha de saúde de criança | Todos os adultos |
| Orçamento, envelopes, despesas | Adultos |
| Gestão da Casa | Só administradores |
| Cofre da criança | O próprio (leitura) e os adultos |

**Em produção isto é imposto no servidor.** Ver `seguranca.html`.

---

# 3. Ecrã a ecrã

## 3.1 Arranque

Storm Blue cheio, marca a 74 px, barra de progresso. 900 ms enquanto lê os dados. Depois:
entrada, ou a app se havia sessão.

## 3.2 Entrada

**Continuar com Google** → seletor de contas (Rita administradora, Tomás adulto, e *Usar outra
conta*). **Entrar como Criança** → seletor de perfis → PIN.

Escolher um adulto: se não há dados guardados, abre o **arranque de casa nova** (nome da casa,
rendimento, convite ao segundo adulto, perfis das crianças). Se há, entra e mostra o **popup do
Calendar** se houver sugestão não tratada para esse membro.

## 3.3 Popup do Calendar

Lido **só à abertura da app** — nunca em segundo plano. Caixas de seleção por evento, alternador
de partilha, e três saídas: *Adicionar e Partilhar*, *Adicionar Só para Mim*, *Agora não*.
Adicionar leva à Agenda com os eventos presentes, marcados *via Google Calendar*.

## 3.4 Início

Saudação com a data e a contagem viva de eventos e tarefas. Três números no cabeçalho.
**Precisa de Si**. **Agenda de Hoje** (eventos do dia, com estado vazio). **Tarefas de Hoje** com
*Ver todas*. **Orçamento do mês** tocável. Aviso do acerto de contas.

## 3.5 Dinheiro

**Envelopes** com barras, avisos aos 94 % e *Reforçar*; toque num envelope abre o limite
(só admin). **Abrir mês seguinte** — distribuir o rendimento, reinicia os gastos.
**Contas entre Nós** com extrato e *Acertar Contas* (parcial). **Registar Despesa** — valor
escrevível, envelope em acordeão, quem pagou, divisão, fotografia do recibo.
**Equipamentos da Casa** e **Saúde da Família** como duas linhas num contentor. **Metas**.

## 3.6 Tarefas

CTA **Acrescentar tarefa**. Filtro por membro com pontos de cor. **Semanada das Crianças** —
cartão por criança, toque abre o cofre. **Rotinas e Tarefas** — as linhas, ordenadas por
urgência. O lápis abre *Gerir Tarefa*: reatribuir, pontos, urgência, prazo, rotação, ordem,
remover.

## 3.7 Compras

Resumo (artigos, por comprar, estimativa, envelope). **Quem vai às compras** — toque em *Alterar*
abre quem, quando, onde. Secções com os artigos; o lápis abre *Gerir Artigo* (adiar, remover,
ordem). **Artigos Habituais**. **Últimas 10 compras** com média. **Acrescentar artigo** e
**Iniciar Compras**, ambos a rolar com a lista.

## 3.8 Modo de loja (ecrã inteiro)

Duas saídas: seta na navbar e *Voltar à Lista* no fim. Stepper com **Todos** + quatro corredores.
Cartão do carrinho com total ao vivo. Linhas de 64 px: toque confirma, *Sem stock* adia (para a
propagação). 10 artigos por página. **Acrescentar artigo à lista** — para o que se lembrou na
loja. *Secção Seguinte* → *Fechar Conta e Registar Despesa* → recibo → *Ver Impacto no
Orçamento*.

## 3.9 Agenda

**Agendar Evento**. Tira da semana, expansível para o mês com navegação de mês e ano e *Voltar a
hoje*. Toque num dia mostra **o dia** — eventos e tarefas desse dia — não abre logo a criar.
Legenda de membros. Dias agrupados a partir de hoje, com o lápis a abrir *Gerir Evento*.

## 3.10 Perfil

Toque no avatar. **Aspeto** — três ícones (sol, lua, dispositivo) e as seis cores, por perfil.
**Avisos** — a regra como frase editável, com colapso quando desligado. **Dados** — onde estão,
repor demonstração, começar de zero. **Gestão da Casa** e **Documentação**. Terminar sessão no
cabeçalho, com confirmação.

## 3.11 Equipamentos, Saúde, Gestão, Documentação

Ver `TAREFAS.md` tarefas 4 a 6 e as capturas 11 a 17.

## 3.12 Modo criança

PIN de 4 dígitos, sem valor de fábrica, com limite de tentativas e bloqueio. Duas entradas:
**Tarefas** (alvos maiores, marca como *a confirmar*) e **O Meu Cofre** (saldo, movimentos,
*Pedir para Usar o Dinheiro* sujeito a autorização). **Nada de orçamento.**

---

# 4. Confirmações

Tudo o que é agendado passa por confirmação antes de gravar. **As etiquetas mudam com o tipo:**

| Tipo | Linha 1 | Linha 2 |
|---|---|---|
| Evento | Evento | Quando |
| Tarefa | Tarefa | Recorrência |
| Manutenção | Manutenção | Quando |

Linha 3 é sempre *Visibilidade* → *Família — 4 membros* ou *Só eu — {nome}*.

Ações: *Confirmar e Partilhar* / *Confirmar como Privado*, e *Voltar e Alterar*.

**Remoções** também confirmam, nomeando o que se perde. **Mudanças de papel** confirmam e dizem
o que muda; criança→admin e adulto→criança são **impossíveis** e explicam porquê.

---

# 5. Copy

O registo é procedimental e formal — terceira pessoa, nunca "tu". Português europeu.

**Exemplos que dão o tom:**

- *"Um resumo por dia às 20:00, avisando 1 dia antes de cada prazo."*
- *"O limite de Casa & contas passa a 670,00 € e o de Sair & lazer a 210,00 €. Não sai dinheiro
  da conta — é só uma redistribuição do orçamento."*
- *"Fica apenas no calendário da Rita. Ninguém mais o vê."*
- *"Pedido enviado. A Rita ou o Tomás têm de autorizar antes de poder usar o dinheiro."*
- *"A garantia terminou a 18/11/2023. Qualquer assistência é paga."*
- *"O Google Calendar é consultado apenas quando abre a app — nunca em segundo plano."*

**Vocabulário de estado**, nunca inventado: `A Aguardar` · `A Confirmar` · `A Decorrer` ·
`Concluído` · `Em Garantia` · `Garantia a Expirar` · `Fora de Garantia` · `Família` · `Só eu` ·
`Urgente` · `Normal` · `Sem pressa`.

**Sem emoji.** Trata de dinheiro.

---

# 6. Dados de arranque

Em `src/data.js`. Duas origens:

**DEMO** — a família Bengui com histórico: 6 tarefas, 13 artigos em 4 secções, 4 envelopes
(412/550, 318/340, 486/700, 171/180), 4 equipamentos nos três estados de garantia, 7 eventos,
cofres a 12,40 € e 8,90 €, contas a 86,50 €.

**BLANK** — casa nova: tudo vazio, para ver os estados vazios e o arranque. É o que o
*Começar de Zero* usa.

Os quatro membros: Rita `#722ED1` administradora · Tomás `#08979C` adulto · Léo `#1890FF` e
Mia `#011B58` crianças. As cores vêm da paleta de estado — **nenhuma é a cor de ação**.

---

# 7. Ordem de implementação

`TAREFAS.md`. Resumida: compilar → folhas de criar → confirmações → equipamentos → saúde →
gestão e documentação → Supabase → lojas.

Um ecrã está feito quando a captura em `referencia/` e o simulador coincidem, e quando o
comportamento descrito aqui se verifica.
