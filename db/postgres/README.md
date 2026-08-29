> **Referência histórica.** O alvo passou a ser o PocketBase — ver `db/README.md`.
> Este documento fica porque é onde as 41 políticas estão pensadas ao pormenor, e
> traduzi-las foi mais seguro com ele à vista. A última secção, sobre dados de
> menores, continua a valer tal e qual.

# Base de dados — Nossa Casa

Três ficheiros, por ordem. Correm em **PostgreSQL 15+** ou **Supabase** sem alteração.

```
db/01-esquema.sql        tipos, 22 tabelas, índices, 5 vistas, funções, RLS
db/02-storage.sql        bucket de anexos e as suas políticas
db/03-demo.sql           a família Bengui — os mesmos dados do protótipo
db/04-idempotencia.sql   chaves de idempotência nas operações de dinheiro
```

O `04` corrige uma lacuna entre este esquema e `docs/seguranca.html`: a §6 exige chave de
idempotência em cada operação de dinheiro e a §9 lista aceitá-las sem chave entre as coisas
que nunca devem acontecer, mas o `01` não as tinha. Com uma fila de escritas que reenvia
após reconexão, isso é uma semanada paga duas vezes.

A camada de cliente é `src/supabase.js`. Lê estas tabelas e as cinco vistas, enfileira as
escritas para funcionar sem rede, e subscreve o tempo real só em `artigos` e
`listas_compras`. **Não toca em `episodios_saude` nem em `anexos`** — ver a última secção.

## Correr

### Supabase

```bash
supabase init
supabase start
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2-)" -f db/01-esquema.sql
psql "..." -f db/02-storage.sql
psql "..." -f db/03-demo.sql   # opcional
```

Ou cole cada ficheiro no **SQL Editor** do painel, por ordem.

### PostgreSQL directo

`01-esquema.sql` referencia `auth.users` (Supabase) em `membros.conta_id` e
`02-storage.sql` referencia `storage.objects`. Sem Supabase:

```sql
-- antes de correr o 01
create schema if not exists auth;
create table auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as $$
  select current_setting('app.user_id', true)::uuid;
$$;
```

E salte o `02-storage.sql` — use o sistema de ficheiros que preferir, mantendo o
caminho `{casa_id}/{tipo}/{uuid}.{ext}`.

---

## As três regras que o esquema impõe

**1. Toda a tabela tem `casa_id`.** Sem exceção. É o primeiro termo de todas as
políticas, e a razão pela qual uma consulta sem filtro devolve zero linhas em vez
das de outra família.

**2. Saldos são vistas, não colunas.** `v_cofre_saldo`, `v_envelope_limite`,
`v_envelope_gasto`, `v_acerto_saldo`, `v_pontos_por_pagar`. Se escrever um saldo
numa coluna, dois telefones a somar 5 € cada resultam em 5 € — e o dinheiro
desapareceu.

**3. A visibilidade está nas `POLICY`, não no cliente.** A app não filtra eventos
privados nem fichas de saúde: recebe só o que lhe compete. Se filtrar no cliente, o
dado chega ao dispositivo e basta uma falha de ecrã para o revelar.

---

## Detalhes que não são óbvios

**`tarefas_feitas` tem uma linha por dia**, com `unique (tarefa_id, data)`. É o que
faz a recorrência funcionar — uma tarefa diária conclui-se todos os dias — e o que
impede pontos a dobrar. A confirmação pelos pais é `confirmada_em is null`, não um
estado separado.

**Corrigir uma despesa é `anula_id`**, nunca editar o valor. O extrato conta a
verdade, não a última versão dela. `v_envelope_gasto` já exclui as anuladas.

**`meses.limites` é `jsonb`** com uma cópia dos limites à data da abertura. Parece
redundante; é o que permite ao fecho do mês olhar para trás sem reconstruir história.

**`anexos` tem três elos e a restrição `um_so_elo`** — exames pertencem ao episódio
que os originou, faturas ao equipamento, recibos à despesa. Nunca soltos.

**`artigos.estado` vive na linha do artigo.** Se fosse uma lista de identificadores
confirmados na lista, dois telefones na mesma loja anulavam-se. Assim, fundem-se.

**O PIN nunca é comparado no cliente.** `verificar_pin(membro, pin)` corre no
servidor, usa `crypt()`, e bloqueia ao quinto erro. `definir_pin()` exige um adulto
e recusa o que não sejam quatro dígitos. Não existe PIN de fábrica: `pin_hash` nasce
nulo e uma criança sem PIN não entra.

**Papéis com guarda.** O `trigger` `membros_guardar_admin` recusa duas transições:
deixar a casa sem administração, e um adulto voltar a criança.

---

## Tempo real

Só `artigos` e `listas_compras` estão na publicação. É a única área onde dois
telefones estão na mesma coisa ao mesmo tempo — dois adultos na loja. O resto
sincroniza ao abrir a app e periodicamente; subscrever tudo custa bateria e não
resolve nenhum problema real.

---

## Do protótipo para as tabelas

O protótipo guarda tudo numa chave `nossa-casa/v1` no dispositivo. O mapeamento:

| Chave local | Tabela |
|---|---|
| `done`, `pending` | `tarefas_feitas` (com `data` e `confirmada_em`) |
| `newTasks`, `taskEdits`, `taskGone`, `urg` | `tarefas` (`removida_em` em vez de `taskGone`) |
| `added`, `eventEdits`, `eventGone` | `eventos` |
| `newItems`, `status`, `itemGone` | `artigos` |
| `vault`, `paidPts`, `extraLog` | `cofre_movimentos` (aditiva) |
| `envMove` | `transferencias` (aditiva) |
| `registered`, `settled` | `despesas` e `acertos` (aditivas) |
| `monthLimits`, `monthName` | `meses` |
| `newEquip`, `equipGone` | `equipamentos` |
| `health` | `episodios_saude` + `anexos` |
| `schemeByUser`, `themeByUser`, `notif` | `preferencias` |
| `pins` | `membros.pin_hash` (resumo, não o valor) |
| `stores`, `equipCats`, `specialities` | `lojas`, `categorias_equip`, `especialidades` |
| `tab`, `sheet`, rascunhos, `filter` | **nada** — estado de interface, não persiste |

Note as quatro linhas aditivas. No protótipo `vault` é um número; aqui é uma soma. É
a única diferença estrutural entre o protótipo e a produção, e é deliberada.

---

## Antes da primeira consulta gravada

A app trata **dados de saúde de menores** — categoria especial no RGPD. Isto não é
uma questão técnica:

- Alojamento na União Europeia, com contrato de subcontratação assinado.
- Política de privacidade publicada num endereço estável.
- Prazo de conservação declarado. Recomendo sete anos para o financeiro, dois para o
  resto, com arquivo dos anos fechados.
- Consentimento parental explícito para os perfis de criança.
- Procedimento de apagamento total, com aviso aos outros adultos.

`docs/seguranca.html` desenvolve cada um destes pontos.
