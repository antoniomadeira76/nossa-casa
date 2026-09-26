# Base de dados — Nossa Casa

O alvo é o **PocketBase**: um binário só, SQLite por dentro, com autenticação,
regras por coleção, tempo real e armazenamento de ficheiros já lá.

```
db/pocketbase/pb_migrations/   o esquema — um instantâneo, gerado pelo PocketBase
db/pocketbase/pb_hooks/        as regras que as regras de API não conseguem exprimir
db/pocketbase/criar-colecoes.mjs   como as coleções foram definidas
db/pocketbase/provar-regras.mjs    19 provas: tenta o que NÃO deve ser possível
db/pocketbase/provar-hooks.mjs     12 provas: PIN, palavra-passe, papéis
db/postgres/                   o esquema PostgreSQL anterior, como referência
```

## Correr

```bash
./pocketbase serve --migrationsDir db/pocketbase/pb_migrations \
                   --hooksDir db/pocketbase/pb_hooks
```

As migrações aplicam-se sozinhas ao arrancar. Para criar o primeiro
administrador: `./pocketbase superuser upsert <email> <palavra-passe>`.

Depois, no projeto: copie `.env.example` para `.env.local` e aponte
`EXPO_PUBLIC_PB_URL` ao servidor. Sem essa variável, a app corre local como
sempre correu — a ligação é opcional, não um pré-requisito.

## As provas

Isto é o que distingue este esquema do anterior: **as regras estão provadas a
correr**, não escritas e esperadas.

```bash
node db/pocketbase/provar-regras.mjs    # 19 provas
node db/pocketbase/provar-hooks.mjs     # 12 provas
```

Cada prova tenta o que a `docs/seguranca.html` diz que não pode acontecer, e
falha se **passar**. Entre elas:

- o orçamento e as despesas estão **ausentes da resposta** a um perfil de
  criança — não escondidos na interface (§5);
- um evento privado do Tomás não chega à Rita, mas chega ao próprio (§5);
- nem um adulto edita ou apaga um movimento do cofre: a coleção não tem regra
  de update nem de delete, portanto o servidor recusa-os (INVARIANTE #2);
- uma criança não credita o próprio cofre; um adulto credita o dela;
- a mesma chave de idempotência duas vezes não duplica (§6);
- uma casa vizinha não vê nada desta;
- o PIN errado é recusado pelo servidor, e o hash nunca chega ao cliente (§3).

## A casa de simulação

`npm run simular:casa` cria uma casa cheia e difícil — cinco membros, oito
corredores, três meses de despesas, títulos longos, anexos — para se percorrer
a app à procura de ecrãs que rebentem. **Não é auto-suficiente**: não arranca
servidor nenhum nem constrói a base. Espera as duas coisas já feitas, no
servidor de simulação (8096), e sai com código 2 se lhe apontarem a porta da
casa a sério (8095).

```bash
# 1. um servidor só para a simulação, com dados à parte
./pocketbase.exe serve --http=127.0.0.1:8096 --dir .simulacao/pb_data \
    --migrationsDir db/pocketbase/pb_migrations \
    --hooksDir db/pocketbase/pb_hooks

# 2. o superutilizador — os scripts autenticam-se com ele, e numa base
#    acabada de nascer ele ainda não existe
./pocketbase.exe superuser upsert admin@nossacasa.local <PB_ADMIN_PASS> \
    --dir .simulacao/pb_data

# 3. as coleções, e só então a casa
PB_URL=http://127.0.0.1:8096 npm run db:colecoes
PB_URL=http://127.0.0.1:8096 npm run simular:casa
```

`PB_ADMIN`, `PB_ADMIN_PASS` e `PB_URL` saem do `.env.local` pelo
`db/pocketbase/ambiente.mjs`, com o ambiente a ganhar ao ficheiro — daí o
prefixo `PB_URL=` na linha, que é o que desvia os scripts da casa a sério.

⚠ **É esse prefixo que separa a simulação da casa — e já não é ele sozinho.** O
`simular-casa.mjs` recusa pela PORTA: apontado à 8095, sai com o código 2. O
`criar-colecoes.mjs` não olha para a porta, olha para o NOME da casa que está do
outro lado. Um `npm run db:colecoes` sem o `PB_URL` à frente, com o `.env.local`
a apontar à casa, não a perde: preserva `casas`, `membros`, a
`credenciais_agenda` e toda a coleção com linhas, recria as vazias e aplica as
regras. O que a perderia é a reconstrução total — e essa pede-se escrevendo o
nome exacto da casa a destruir, `PB_RECRIAR="Madeira"`. Um valor que não bate
certo com nenhuma casa do servidor é RECUSADO, com o código 2 e sem apagar nada:
o «1» de antes escrevia-se igual para a simulação e para a casa a sério.
Confira à mesma o endereço antes do Enter.

Três coisas que já custaram tempo:

**As migrações não constroem a base do zero.** O `pb_migrations/` é um
instantâneo do esquema, não uma história — aplicá-lo a uma pasta de dados vazia
pára logo na primeira, com «failed to apply migration
`1788620964_created_acertos.js`: … Collection name must be unique (case
insensitive)». O caminho deste projeto é o `db:colecoes`; as migrações servem
um servidor que já tem a base.

**A app não entra na casa simulada.** Correr o Expo numa segunda porta a apontar
à 8096 mostra o ecrã de entrada, mas o «Continuar com Google» não leva a lado
nenhum: aquele servidor não tem a Google configurada (é o `db:google`, e exige
credenciais reais), e o ecrã cai no «Escolher uma conta» — que é a lista das
sementes locais (`rita.bengui@gmail.com`), não os membros simulados
(`rita@simulacao.pt`). Para ver uma casa grande na interface sem tocar na casa
a sério, o caminho curto é escrever o estado local dessa origem: a chave
`nossa-casa/v1` do `localStorage`, com as `seccoesDaCasa` e os `iconesDeSeccao`
que se quer experimentar.

**A simulação prova o `criar-colecoes.mjs`.** É o único sítio onde esse ficheiro
corre de verdade, e foi assim que se apanhou o sétimo caso do par de sítios —
coleções que ele criava e não constavam da lista `NOSSAS`, a fazerem a segunda
corrida parar em «Collection name must be unique». O guarda que o fixou é
`__tests__/a-casa-simulada-apanhou.test.js`.

## Três decisões que valem explicação

**O PIN é a palavra-passe da criança.** `membros` é uma coleção de
autenticação, e o PocketBase já faz hash com bcrypt e verifica no servidor. É
exatamente o que a §3.2 exige — função lenta, com sal, verificada no servidor —
sem escrever criptografia nenhuma. Foi a razão principal para o esquema
PostgreSQL, que precisava de `crypt()` e de uma função à mão, ficar para trás.

E é no servidor que a criança **entra** (`authWithPassword` por `login`, desde
09/09/2026 — antes comparava um resumo local), que se sabe se ela **tem PIN**
(`membros.pin_definido`, posto a verdadeiro pelo hook quando a palavra-passe
entra e pela rota do PIN), e que ela o **muda** sabendo o atual
(`POST /api/casa/pin/proprio`, `pb_hooks/pin.pb.js`). A reposição sem o atual
continua a ser só de quem administra (`POST /api/casa/pin`). O resumo local
do cliente serve a entrada sem servidor e mais nada.

**As crianças entram por `login`, não por e-mail.** O campo de identidade tem de
ser único em toda a coleção, e `nome` não pode ser: duas casas podem ter um Léo.
O `login` é um identificador interno, `casa_nome`. As crianças continuam sem
e-mail nem conta própria, como a §8 pede — há um hook que recusa uma criança com
e-mail.

**O mínimo da palavra-passe é 4, e um hook obriga os adultos a 10.** Quatro
dígitos são precisos para o PIN, mas deixar um adulto proteger a casa com
«1234» seria uma fraqueza a sério. As regras de API não olham para o valor da
palavra-passe; por isso esta regra vive num hook.

## O que ficou de fora

**A saúde.** `episodios_saude` e `anexos` não existem nestas coleções. O
`CLAUDE.md` põe-nas atrás da conformidade RGPD, e a última secção do
`db/postgres/README.md` lista os cinco pontos a resolver antes da primeira
linha gravada. São dados clínicos de menores.

O PocketBase melhora um deles por construção: sendo um binário auto-alojado, a
**região de alojamento** deixa de ser uma escolha de fornecedor e passa a ser
onde puser a máquina.
