---
name: base-de-dados
description: Trabalhar no esquema PocketBase — coleções, regras de visibilidade, hooks e vistas. Use antes de mexer em db/pocketbase/, ao acrescentar uma coleção, ao alterar quem vê o quê, ou ao ligar a app ao servidor.
---

# Base de dados — PocketBase

O esquema está em `db/pocketbase/`. As regras que impõem os invariantes **estão
provadas a correr**, não escritas e esperadas.

## A regra de ouro deste projeto

> O cliente decide o que **mostra**. O servidor decide o que **existe**.

Se um dado não deve ser visto por alguém, não é escondido na interface — **não é
devolvido pela consulta**. Toda a `docs/seguranca.html` é a aplicação desta
frase, e as provas abaixo verificam-na.

## Antes e depois de mexer, prove

```bash
./pocketbase serve --migrationsDir db/pocketbase/pb_migrations \
                   --hooksDir db/pocketbase/pb_hooks
npm run db:provar
```

67 provas em quatro suites. Cada uma tenta o que **não** deve ser possível e
falha se passar:

| Suite | O que cobre |
|---|---|
| `provar-regras.mjs` | visibilidade, isolamento entre casas, idempotência, vistas |
| `provar-hooks.mjs` | qualidade do PIN, palavra-passe de adulto, guardas de papel |
| `provar-saude.mjs` | a regra mais restritiva do sistema — ver abaixo |
| `provar-cliente.mjs` | o `src/pocketbase.js` a sério, contra o servidor |

**Acrescente uma prova por cada regra nova.** Uma regra sem prova é uma
esperança.

## Ao acrescentar uma coleção

1. Defina-a em `db/pocketbase/criar-colecoes.mjs` — é a fonte, não a migração.
2. Corra `npm run db:colecoes` (recria tudo do zero).
3. Gere o instantâneo: `./pocketbase migrate collections --migrationsDir db/pocketbase/pb_migrations`
4. **Apague o `pb_data` e volte a arrancar**, para confirmar que a migração
   reconstrói. Uma migração que nunca foi reproduzida não é uma migração.
5. Corra as provas.

Toda a coleção leva `casa` e a regra começa por `casa = @request.auth.casa`. Sem
isso, uma consulta sem filtro devolve as linhas de outra família.

## Três coisas que custaram tempo a descobrir

**As vistas partem-se com quebras de linha.** O analisador do PocketBase troca o
`WHERE` de uma subconsulta por `__pb_discard__` se a consulta tiver newlines.
Escreva cada `viewQuery` **numa linha só**, por feia que fique.

**Os hooks correm em contextos isolados** e não veem o escopo do módulo. Uma
função auxiliar declarada no topo do ficheiro dá `ReferenceError` — e só no
caminho de sucesso, portanto as recusas passam todas e parece que funciona.
Ponha as auxiliares **dentro** do handler.

**Os campos de sistema da autenticação** vêm com `password` a exigir 8
caracteres e `email` obrigatório. Um PIN tem quatro dígitos e uma criança não
tem e-mail: ajuste-os depois de criar a coleção.

## Saldos

Nunca uma coluna. São **vistas** — `v_cofre_saldo`, `v_envelope_gasto`,
`v_acerto_saldo`, `v_pontos_por_pagar`. Uma vista não tem caminho de escrita,
portanto o INVARIANTE #2 deixa de depender de disciplina.

## Saúde

`episodios_saude` e `anexos` funcionam e têm 15 provas. Mas **isso não dispensa
a conformidade**: são dados clínicos de menores, e `db/README.md` lista cinco
pontos por resolver antes de lá pôr uma linha real. Não os ignore por o código
já funcionar.
