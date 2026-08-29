# Tarefas — por ordem

Cada tarefa diz **o que fazer**, **onde**, e **como saber que está feita**.

Três referências, por esta ordem de autoridade:

1. **`docs/funcionalidades.md`** — o comportamento. Estado, valores derivados, o que cada toque
   faz, o copy exato. É o documento a ter aberto enquanto se implementa.
2. **`docs/referencia/`** — 29 capturas a 402 × 874. Um ecrã está feito quando coincide.
3. **`design/Nossa Casa App.dc.html`** — o protótipo. Decide quando os outros dois discordarem.

`docs/especificacao-ecras.md` tem as medidas ao pixel; `docs/medir.md` explica como extraí-las
do protótipo quando faltar alguma.

---

## 0. Antes de tudo — medir

Abra `design/Nossa Casa App.dc.html` no Chrome, entre com a Rita, e percorra os cinco
separadores. Leia `docs/medir.md` e experimente o bloco de medição num ecrã, para ter o
procedimento na mão antes de precisar dele.

**Feito quando:** consegue extrair a árvore medida de um ecrã e reconhece nela os valores que
`src/theme.js` já define.

---

## 1. Primeira compilação

`npm install && npx expo start`. Resolver o que aparecer.

**Provável:** os tipos de letra. O protótipo usa Roboto (títulos e corpo) e Inter (dados densos
e etiquetas pequenas). Em Expo: `expo-font` + `@expo-google-fonts/roboto` e
`@expo-google-fonts/inter`, carregados em `App.jsx` antes de renderizar.

**Feito quando:** a app abre no simulador, entra com a Rita, e os cinco separadores navegam.

---

## 2. Ligar o que já está escrito

Os ecrãs **estão todos escritos** — incluindo Equipamentos, Saúde, Gestão, Documentação, modo de
loja, modo criança e as folhas de criar. O que falta é ligar os pontos que ficaram com
`onOpen={() => {}}`:

| Onde | O que falta ligar |
|---|---|
| `Equipamentos.jsx` | `onOpen(id)` → ficha do equipamento · `onOpen('novo')` → registar |
| `Saude.jsx` | `onOpen(nome)` → ficha de saúde · `onOpen('nova')` → marcar consulta |
| `Gestao.jsx` | `onOpen('membros'\|'lojas'\|'cats'\|'esp'\|'membro:Nome')` |
| Ecrãs de separador | `openFull` e `openSheet` chegam por prop — usá-los nos CTA |

**Feito quando:** nenhum `onOpen={() => {}}` resta, e cada CTA abre o que promete.

---

## 3. Folhas que faltam

`src/sheets/Criar.jsx` tem *Nova Tarefa*, *Agendar Evento*, *Acrescentar Artigo* e o diálogo de
confirmação. Faltam, no mesmo padrão:

- **Gerir Tarefa** — reatribuir, pontos, urgência, prazo, rotação, ordem, remover
- **Gerir Artigo** — adiar, remover, ordem
- **Gerir Evento** — hora, visibilidade, remover
- **Mover Dinheiro** e **Registar Despesa**
- **Cofre da criança** (vista adulto) — pagar semanada, bónus
- **Ficha e registo de equipamento**, **ficha e episódio de saúde**
- **Membros e PIN**, **Lojas**, **Categorias**, **Especialidades**
- **Abrir mês**

O padrão está em `Criar.jsx`: `<Sheet>` com `action`, campos com `<Field>`, e `<Confirmar>`
quando o que se guarda é agendado. Reutilize `NumField` de `Gestao.jsx` para valores.

**Feito quando:** cada lápis e cada linha da Gestão abrem a folha respetiva.

---

## 4. Popup de dia e hora

Um só popup com calendário em grelha e roletes de hora, usado por eventos, prazos e manutenções.
É a peça partilhada que falta — hoje as folhas usam um segmentado de três horas como
substituto.

**Feito quando:** agendar para 15 de setembro às 07:45 funciona nas três folhas.

---

## 5. Equipamentos e Saúde — as fichas

Os ecrãs de lista estão feitos. Falta a ficha de cada um:

**Equipamento:** garantia com o estado tingido, duas fotografias (fatura e equipamento),
detalhes, agendar manutenção, exportar fatura, remover.

**Saúde:** episódios por ordem, e dentro de cada um os exames, receitas e notas — **os anexos
pertencem ao episódio**, nunca soltos. Ver `funcionalidades.md` §2.7 para quem vê o quê.

**Feito quando:** agendar manutenção coloca o evento na Agenda com o nome do equipamento, e um
episódio marcado aparece na Agenda e no Início.

---

## 6. Câmara e ficheiros

`expo-image-picker` para as fotografias de fatura, equipamento e recibo de despesa.
`expo-print` ou `expo-sharing` para exportar a fatura em PDF.

**Feito quando:** fotografar uma fatura guarda a referência e a miniatura aparece na ficha.

---

## 7. Ligar ao Supabase

**O esquema está escrito.** `db/01-esquema.sql`, `db/02-storage.sql` e `db/03-demo.sql`
correm por essa ordem, em Supabase ou PostgreSQL puro. `db/README.md` explica cada decisão.

Só depois de a app funcionar com dados locais.

**Ordem:**
1. Correr os três ficheiros SQL. Confirmar que `03-demo.sql` cria a família Bengui.
2. Autenticação Google, e ligar `membros.conta_id` à conta que entrou.
3. Trocar a leitura inicial do `localStorage` por consulta remota, mantendo a cópia local.
4. Fila de escrita: escrever local e enfileirar; enviar a alteração, não o estado inteiro.
5. Tempo real em `artigos` e `listas_compras` — já estão na publicação.
6. Storage para faturas, fotografias e exames.

**Cuidado com os saldos.** No protótipo `vault` é um número; no servidor é
`v_cofre_saldo`. Não recriar a coluna — é a única diferença estrutural entre os dois,
e é deliberada.

**Feito quando:** a Rita altera no telefone dela e o Tomás vê no dele, e um evento
privado dela não aparece no dele.

---

## 8. Lojas, ícone e submissão

Ícone e capturas estão em `docs/loja/`. Falta: política de privacidade num endereço estável
(obrigatória nas duas lojas), verificação do acesso ao Google Calendar (leva semanas — comece
cedo), e a declaração de recolha de dados.

---

## 9. Aceitação final

Antes de dizer que está feito, percorra `funcionalidades.md` §3 ecrã a ecrã com o simulador
aberto, e confirme os cinco invariantes do `CLAUDE.md`:

1. Cabeçalho e rodapé visíveis em **todos** os ecrãs, incluindo com folhas abertas.
2. Nenhum saldo escrito diretamente — só movimentos somados.
3. Nada abaixo de 44 px de alvo (64 nas linhas da loja).
4. Euro sempre por `EUR()`, nunca formatado à mão.
5. Modo criança sem qualquer informação de orçamento.

E teste com os **seis esquemas de cor** nos **dois aspetos** — não só no predefinido.
