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

## Três decisões que valem explicação

**O PIN é a palavra-passe da criança.** `membros` é uma coleção de
autenticação, e o PocketBase já faz hash com bcrypt e verifica no servidor. É
exatamente o que a §3.2 exige — função lenta, com sal, verificada no servidor —
sem escrever criptografia nenhuma. Foi a razão principal para o esquema
PostgreSQL, que precisava de `crypt()` e de uma função à mão, ficar para trás.

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
