# Alexa — especificação da fase 1

> **Estado: o lado da casa está construído** (27/09/2026) — as rotas, o modelo
> de interação e as provas. O que falta é a decisão de expor o servidor, sem a
> qual a Amazon não consegue chamar cá. Ver «A decisão que vem primeiro».
>
> O alcance é o desta página e não mais: três escritas, nada de leituras, nada
> de dinheiro nem de saúde. Confirmado pelo dono da casa em 27/09/2026, com as
> alternativas à frente.

## ⚠ Três coisas que esta página dizia mal

Descobertas ao construir, em 27/09/2026. Ficam aqui em cima porque duas delas
só apareceriam na consola da Amazon, com a skill já escrita.

1. **O pt-PT não existe na Alexa.** Os idiomas de uma skill são uma lista
   fechada da Amazon, e o único português nela é o `pt-BR`. Não há pt-PT, e não
   há planos anunciados. A skill tem de ser declarada em `pt-BR` — é o idioma em
   que a Alexa **ouve**. As frases que ela **diz** são as que o servidor
   devolve, e essas continuam em português europeu. O altifalante tem de estar
   configurado em português do Brasil.
2. **O `MarcarEvento` desta página não compila.** Punha `{titulo}` como
   `AMAZON.SearchQuery` na mesma frase que `{data}` e `{hora}`, e a regra da
   Amazon é que o `SearchQuery` «cannot be combined with another intent slot in
   sample utterances». O título passou a um tipo próprio, `TituloDeEvento`.
   E os `SearchQuery` que restam ficam no **fim** da frase: são gulosos, e num
   «acrescentar {artigo} à lista» o slot apanharia «leite à lista».
3. **O `/api/casa/limpar` não verifica «não é criança».** Verifica
   `papel !== 'admin'` — um adulto que não administre também é recusado. Esta
   página descrevia-o mal na secção «As rotas». As rotas da Alexa seguem o que
   esta página **queria** dizer (não é criança), porque o token de voz
   representa um adulto da casa e não necessariamente quem administra.

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

Cada rota aceita a `requestId` da Alexa como **chave de idempotência**.

⚠ **Mas não da maneira que esta página dizia.** Dizia «um reenvio colide no
índice único em vez de escrever outra vez», e isso descreve uma coisa que não
acontece: o índice protege o REGISTO do pedido, não a linha que se escreve. A
primeira implementação seguiu a página ao pé da letra — lia, escrevia o artigo,
e só depois registava — e **não era idempotente de todo**. Medido em
27/09/2026: dois pedidos iguais em voo ao mesmo tempo escreveram dois artigos,
cinco vezes em cinco; doze em paralelo escreveram doze.

E a prova que devia apanhá-lo fazia os dois pedidos **em sequência**, que é
precisamente o caso que a Alexa não produz — ela reenvia porque a primeira
resposta ainda não chegou.

A ordem certa é a inversa: **reservar primeiro, escrever depois.** A rota
insere a chave em `alexa_pedidos`, e é o índice único `(casa, request_id)` que
decide quem chegou primeiro; só quem ganhou escreve, e quem perdeu lê a reserva
do outro e responde o mesmo. Fica também escrito na reserva **qual foi a
intenção**: a mesma chave usada noutra intenção é recusada, em vez de devolver
a frase da ordem anterior e o `id` de uma linha de outra coleção.

⚠ E a chave **não se corta**. Cortá-la ao tamanho do campo fazia duas chaves
diferentes colapsarem numa, com a segunda escrita descartada em silêncio e a
Alexa a confirmar a primeira. Uma chave ou serve inteira ou é recusada.

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

## O que já está construído (27/09/2026)

Tudo o que não depende da exposição. Corre e está provado contra o servidor
local; falta só a Amazon conseguir chegar cá.

| | |
|---|---|
| `alexa/modelo-de-interacao.pt-BR.json` | o modelo da skill — três intenções, o tipo próprio `TituloDeEvento`, e os `SearchQuery` no fim da frase |
| `db/pocketbase/pb_hooks/alexa.pb.js` | as três rotas |
| `db/pocketbase/pb_hooks/alexa-comum.js` | as auxiliares — as três verificações, o reenvio, e a validação das datas e horas vagas do `AMAZON.DATE`/`AMAZON.TIME` |
| coleção `alexa_pedidos` | a chave de idempotência, numa coleção à parte |
| `db/pocketbase/provar-alexa.mjs` | **15 provas**, na cadeia do `npm run db:provar` |

**A idempotência não é um campo `idem_key`, como esta página pedia.** As cinco
coleções de dinheiro têm esse campo com índice único `(casa, idem_key)`, e
funciona porque a fila do cliente escreve sempre uma chave nelas. Os `artigos`,
os `eventos` e as `tarefas` escrevem-se sem chave — e um índice único do
PocketBase **não é parcial**, ao contrário do `db/postgres/04-idempotencia.sql`.
Um campo de texto por preencher grava `""`, e `""` colide com `""`: o segundo
artigo de uma casa colidia com o primeiro. A app partia-se ao segundo «leite»
por causa de uma funcionalidade de voz que ela nem usa. Numa coleção própria o
problema não existe, e ganha-se um reenvio que devolve a MESMA frase que a
Alexa já disse em voz alta — em vez de um erro depois de um «acrescentei».

As 15 provas, e o controlo negativo que as valida: com a verificação da criança,
a escrita da visibilidade e o travão do reenvio retiradas num servidor de deitar
fora, a criança passa a receber 200, o evento sai com visibilidade **vazia** (que
na regra do servidor quer dizer «só o autor vê») e o reenvio escreve duas linhas.

## O que fazer a seguir, e por que ordem

1. **Passar a semana com a app no telemóvel**, como combinado. A Alexa
   acrescenta uma porta; convém saber primeiro se a casa que ela abre é a que
   se quer.
2. **Decidir sobre a exposição** (A, B ou C acima). Sem isto o altifalante não
   fala com a casa — mas note-se que o que falta é só isso: as rotas já existem
   e estão provadas.
3. **Decidir sobre o `pt-BR`**, que é a única forma de a Alexa ouvir português.
4. Só então: publicar a skill e ligar a conta.

A fase 1 é honestamente pequena — três intenções, três rotas, e o Account
Linking em cima do OAuth que já existe. O que a torna séria não é o tamanho: é
que ela é a primeira coisa nesta app que fala com o mundo de fora.
