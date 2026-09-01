# Alexa — especificação da fase 1

> **Estado: por decidir.** Nada disto está implementado. Este documento existe
> para a decisão ser tomada com o desenho à frente, e não a meio da construção.
>
> Depende de **uma decisão que não é técnica** — expor o servidor da casa à
> Internet. Ver «A decisão que vem primeiro».

---

## O problema que decide tudo

A Alexa **não sabe quem está a falar**. Um altifalante na cozinha ouve os
quatro, e a Amazon entrega a mesma identidade — a do dispositivo — venha a voz
de quem vier.

Isso choca de frente com dois invariantes desta casa:

| Invariante | O que a voz quebra |
|---|---|
| **#3 Visibilidade no servidor** | Um evento «Só eu» ou uma ficha de saúde ditos por um altifalante são ouvidos por quem estiver na cozinha. A regra do servidor continua certa; o *canal* é que passou a ser público. |
| **Papéis** | «Alexa, marca a minha tarefa como feita» dito pelo Léo é indistinguível da Rita a dizê-lo. Uma criança não confirma tarefas nem mexe no dinheiro. |

A Alexa tem **Voice Profiles**, que reconhecem quem fala. **Não são uma
credencial** — a própria Amazon os descreve como um sinal de personalização,
não de autenticação. Para dinheiro e saúde não servem, e não se usam aqui.

**A resposta da fase 1 não é resolver a identidade — é escolher trabalho onde
ela não é precisa.** Escrever numa lista de compras partilhada não exige saber
quem falou; ler uma ficha de saúde exige.

---

## O que a fase 1 faz — e o que não faz

### Faz

- **Acrescentar à lista de compras.** «Alexa, diz à Nossa Casa para acrescentar
  leite à lista.»
- **Marcar um evento com visibilidade `familia`.** «…marca almoço com a avó
  amanhã às treze horas.»
- **Acrescentar uma tarefa sem pontos**, atribuída à casa e não a uma pessoa.

Todas são **escritas**, todas ficam **visíveis a toda a família**, e nenhuma
delas revela algo que já não estivesse à vista de quem está na cozinha.

### Não faz

| Fora da fase 1 | Porquê |
|---|---|
| Ler a agenda, as tarefas ou as compras | Uma leitura por altifalante não sabe filtrar por quem ouve. Fase 2, e só para `familia`. |
| Qualquer coisa de saúde | Dados clínicos de menores. Nem lê nem escreve — nunca. |
| Qualquer coisa de dinheiro | Despesas, envelopes, cofres, acerto de contas. |
| Confirmar tarefas de crianças | É o que dá pontos, e pontos são dinheiro. |
| Marcar eventos «só eu» ou «só adultos» | Um evento privado ditado em voz alta já não é privado. Se for pedido, a skill responde que só marca eventos de família. |
| Apagar o que quer que seja | Sem confirmação possível pelo canal. |

**A regra por trás da tabela:** por voz só entra o que já é público dentro de
casa, e só na direcção de escrever. Uma ordem mal ouvida acrescenta uma linha a
mais — que se apaga na app. Uma leitura mal dirigida não se desfaz.

---

## Ligação da conta (Account Linking)

Cada altifalante fica ligado a **um** membro adulto. É um `Authorization Code
Grant` normal, e a app já tem as peças:

```
Authorization URI   https://<casa>/api/alexa/autorizar
Access Token URI    https://<casa>/api/alexa/token
Client ID/Secret    gerados para a skill, guardados como os da Google
Scope               casa.escrever
```

O fluxo é o mesmo que o `pb_hooks/agenda-google.pb.js` já faz com a Google, do
outro lado: lá pedimos autorização, aqui damo-la. O `state`, a validade curta e
o guardar do refresh token seguem o mesmo desenho, incluindo a lição que custou
uma volta — **cada handler do JSVM corre num contexto isolado**, e as
auxiliares entram por `require` dentro da rota.

**O token que a Alexa guarda representa um membro, com papel de adulto.** Se
esse membro deixar a casa ou passar a criança, o token deixa de servir — a
verificação é a mesma que as rotas actuais fazem: papel e casa lidos do membro
autenticado, nunca do pedido.

---

## As intenções

Nomes de invocação em pt-PT. Cada uma corresponde a **uma** rota.

### `AcrescentarArtigo`

```
Alexa, diz à Nossa Casa para acrescentar {artigo} à lista
Alexa, pede à Nossa Casa para pôr {artigo} nas compras
```

| Slot | Tipo | Nota |
|---|---|---|
| `artigo` | `AMAZON.SearchQuery` | Texto livre: «leite meio-gordo», «pão de forma» |

Resposta: *«Acrescentei leite meio-gordo à lista.»*

### `MarcarEvento`

```
Alexa, diz à Nossa Casa para marcar {titulo} {data} às {hora}
```

| Slot | Tipo | Nota |
|---|---|---|
| `titulo` | `AMAZON.SearchQuery` | |
| `data` | `AMAZON.DATE` | Resolve «amanhã», «sexta», «dia 12» |
| `hora` | `AMAZON.TIME` | Opcional — sem ela, evento de dia inteiro |

Resposta: *«Marquei almoço com a avó para amanhã às treze horas, visível para a
família.»* — a visibilidade **diz-se sempre**, para ninguém supor que ficou
privado.

### `AcrescentarTarefa`

```
Alexa, diz à Nossa Casa para acrescentar a tarefa {titulo}
```

Fica sem responsável e sem pontos. Atribuir e pontuar faz-se na app, onde se vê
quem é quem.

---

## As rotas

Uma por intenção, no estilo das que já existem:

```
POST /api/alexa/artigo    { artigo }                → { id, rotulo }
POST /api/alexa/evento    { titulo, dia, hora? }    → { id, dia, hora, visibilidade }
POST /api/alexa/tarefa    { titulo }                → { id, titulo }
```

Todas com `$apis.requireAuth()`, e todas com as mesmas três verificações que o
`/api/casa/limpar` faz:

1. há membro autenticado;
2. o membro **não é criança**;
3. a casa vem do **membro**, nunca do corpo do pedido.

A terceira é a que impede o caso que as provas do `limpar-casa` já cobrem: um
token de uma casa a escrever noutra.

### Idempotência

O invariante #2 ajuda aqui: tudo são movimentos aditivos, portanto uma ordem
repetida **duplica** em vez de corromper. Mas a Alexa reenvia pedidos quando a
resposta demora, e duas linhas de «leite» são um defeito visível.

Cada rota aceita a `requestId` da Alexa como **chave de idempotência**, como as
escritas de dinheiro já fazem: um reenvio colide no índice único em vez de
escrever outra vez.

---

## Os nomes falados não batem com os dados

Três problemas conhecidos, todos a resolver **antes** de escrever a primeira
intenção:

1. **Acentos e maiúsculas.** «Léo» chega como «Leo», «Cião» como «ciao». A
   correspondência tem de normalizar — a app já tem `chaveDoArtigo` em
   `src/precos.js`, que faz exactamente isso, e é dela que se parte.
2. **Palavras que são três coisas.** «Compras» é secção, envelope e separador.
   Uma intenção que aceite «compras» como slot vai acertar no sítio errado.
3. **A hora que a Alexa devolve não é a chave da app.** `AMAZON.DATE` dá
   `2026-09-06`; a app lê `d2026-09-06`. É o mesmo defeito que já custou quatro
   eventos invisíveis neste projecto — a conversão faz-se **num sítio só**, à
   entrada.

---

## Como se prova

O padrão da casa: as regras não se afirmam, provam-se a correr
(`npm run db:provar`). Um `provar-alexa.mjs` com, no mínimo:

- um token de criança é recusado em todas as rotas;
- um token da casa B não escreve na casa A;
- um evento criado por voz sai sempre com `visibilidade: familia`;
- o mesmo `requestId` duas vezes cria **uma** linha;
- uma data sem prefixo entra com a chave certa (`d2026-09-06`);
- nenhuma rota devolve dados de saúde ou de dinheiro, mesmo pedidos.

---

## A decisão que vem primeiro

**A Alexa precisa de um endereço público com HTTPS válido.** O servidor corre
hoje em `127.0.0.1:8095` e não é alcançável de fora. Isto obriga a expor a casa
à Internet, e é a decisão de segurança maior deste projecto — maior do que
qualquer coisa feita até aqui, porque é a única que não se desfaz sozinha.

O que muda no dia em que se expõe:

- as regras de API deixam de ter a rede local como segunda tranca;
- os hooks passam a ser superfície pública;
- as provas de `db/pocketbase/` passam de «boa prática» a **única** defesa.

Há três caminhos, por ordem de exposição:

| | O quê | Custo |
|---|---|---|
| **A** | Túnel com nome próprio (Cloudflare Tunnel, Tailscale Funnel) | Baixo. Sem porta aberta no router; o túnel autentica-se para fora. |
| **B** | Servidor alugado, com a casa a sincronizar para lá | Médio. É onde isto acaba se a casa crescer. |
| **C** | Porta aberta no router com certificado | **Não recomendo.** |

---

## O que fazer a seguir, e por que ordem

1. **Passar a semana com a app no telemóvel**, como combinado. A Alexa
   acrescenta uma porta; convém saber primeiro se a casa que ela abre é a que
   se quer.
2. **Decidir sobre a exposição** (A, B ou C acima). Sem isto, nada do resto
   avança.
3. Só então: a skill, as três rotas, e as provas.

A fase 1 é honestamente pequena — três intenções, três rotas, e o Account
Linking em cima do OAuth que já existe. O que a torna séria não é o tamanho: é
que ela é a primeira coisa nesta app que fala com o mundo de fora.
