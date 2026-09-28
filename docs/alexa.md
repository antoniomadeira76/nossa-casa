# Alexa — especificação da fase 1

> ## ⏸ EM ESPERA desde 28/09/2026
>
> Decisão do dono da casa: **a Alexa fica para desenvolvimentos futuros.** Nada
> aqui foi desfeito — o que está construído está provado e a passar. Isto é uma
> pausa, não um recuo.
>
> **Onde ficou, exactamente:**
>
> | | |
> |---|---|
> | A conta | **ligada**. O servidor da Amazon trocou o código por um token (200) e nasceu a identidade em `alexa_vozes`. |
> | O endpoint | de pé, a verificar assinaturas, com registo em `registos/alexa.log`. |
> | As rotas da casa | as três da voz e as cinco do Account Linking, com 60 provas. |
> | O que **não** funciona | **a invocação por voz**. A Alexa nunca chamou o endpoint — zero pedidos, em todo o histórico. |
>
> ⚠ **O que falta é do lado da Amazon, e é uma só coisa por descobrir.** Ao dizer
> «abra nossa casa» ela respondeu que *não encontrou a música* — a resposta de
> quem não conhece skill nenhuma com aquele nome de invocação. E «acrescentar
> leite» foi para a lista de compras **dela**, não para a nossa, o que explica o
> «acrescentei» seguido de nada aparecer na app.
>
> O selector do separador *Test* já está em **Development**. Ficaram por
> confirmar duas coisas, e a primeira é a mais provável:
>
> 1. **O idioma do dispositivo tem de ser Português (Brasil).** Não há pt-PT na
>    Alexa, e uma skill pt-BR não existe para um dispositivo noutro idioma.
> 2. **Em que idiomas é que a skill foi criada.** Se nasceu em inglês e o modelo
>    pt-BR nunca foi colado *nesse* idioma, nada disto responde em português.
>
> **Como retomar:** o simulador do separador *Test*, com o idioma em Português
> (BR), escrevendo `abra nossa casa`. Ele mostra o JSON que envia e o que recebe,
> e o pedido aparece em `registos/alexa.log` no mesmo instante. É o caminho mais
> curto, e é o que não chegámos a fazer.
>
> ⚠ **Duas coisas ficaram a correr**, e é deliberado: o serviço `NossaCasaAlexa`
> e a ligação de conta (com um `refresh` vivo). Se a pausa for longa, vale a pena
> pará-las — um endpoint na internet e uma credencial de longa duração ao serviço
> de uma funcionalidade que ninguém usa não se justificam sozinhos.


> **Estado: falta a skill, e mais nada** (27/09/2026).
>
> O lado da casa está construído e provado — as três rotas, o Account Linking,
> o endpoint que a Amazon vai chamar, e a assinatura verificada contra a cadeia
> verdadeira dela. E **o servidor está exposto**: `casa.anossacasa.app`, por um
> túnel da Cloudflare, com os três serviços a arrancar sozinhos.
>
> O que falta é do lado da Amazon: criar a skill na consola, colar o modelo,
> apontar o endpoint e ligar a conta. E aceitar o `pt-BR`, que é o único
> português que a Alexa tem.
>
> O alcance é o desta página e não mais: três escritas, nada de leituras, nada
> de dinheiro nem de saúde. Confirmado pelo dono da casa em 27/09/2026, com as
> alternativas à frente.

## O servidor está exposto — o que isso mudou

`https://casa.anossacasa.app` → túnel da Cloudflare → `127.0.0.1:8095`.

Três serviços do Windows, todos de arranque automático:

| | |
|---|---|
| `Cloudflared` | o túnel |
| `NossaCasaPocketBase` | o servidor (NSSM, com reinício automático se cair) |
| `NossaCasaAlexa` | o endpoint da skill (NSSM, idem) — ver a secção a seguir |

Os dois primeiros foram verificados **de fora** depois de um reinício a sério da
máquina; o terceiro nasceu depois disso, a 27/09, e está na mesma lista do
verificador.

**As trancas estão no túnel**, e não no servidor — localmente tudo continua a
funcionar como sempre. A ordem importa: o `cloudflared` usa a **primeira** regra
que casar, por isso os desvios e os bloqueios vêm antes do encaminhamento geral.

```
/alexa/skill                   → 8094  o endpoint da skill, que não é o PocketBase
/_/                            → 404   o painel de administração não existe de fora
/api/collections/_superusers/  → 404   nem o caminho de tentar a palavra-passe
/api/admins/                   → 404   o nome antigo do painel, tapado por precaução
tudo o resto                   → 8095  passa ao servidor
```

O que se mede de fora, sem sessão, e é o que o `verificar-a-casa.ps1` confere em
21 linhas: `/api/health` 200; o painel 404; o superutilizador 404; `POST
/api/alexa/artigo` 401; `POST /alexa/skill` sem assinatura 400 e `GET` 405; as
seis coleções de saúde a devolverem `totalItems: 0`; e — o que nenhum código de
estado diz — que os dois serviços apontam para os ficheiros **desta** casa, lido
do registo, porque o NSSM come as aspas e o caminho tem um espaço.

⚠ **E o que isto custa, dito claramente.** A casa tinha duas trancas — as regras
do servidor **e** a máquina não ser alcançável. Ficou uma. As regras aguentam
(605 provas, e vistas a aguentar de fora), mas os cinco pontos de conformidade
do `db/postgres/README.md` voltam todos: a base contém fichas clínicas de
menores e passou a estar atrás de uma porta na Internet, em vez de atrás de não
haver porta nenhuma. Foi decisão do dono da casa, tomada com isto à frente.

⚠ **O `casa.anossacasa.app` serve a API, não a app.** Abrir esse endereço não dá
interface nenhuma — dá o servidor. A app continua a viver no Expo, e é ela que
fala com aquele endereço.

## ⚠ O token da voz — o pior defeito desta casa, e como se fechou

Até à noite de 27/09/2026, o token que a Amazon recebia era
`membro.newAuthToken()`: **uma sessão de adulto a sério**, válida 30 dias, aceite
por todo o `/api/collections/…` — que está na internet desde que o servidor foi
exposto, nesse mesmo dia. O `scope: 'casa.escrever'` que ia na resposta era uma
etiqueta que nenhuma linha de código lia.

E a página de consentimento prometia, em letras:

> *«Não lê nada, e não toca em dinheiro nem em saúde.»*

Medido numa casa de simulação com um episódio clínico lá dentro:

```
  episodios_saude    estado 200   linhas: 1
      >>> Pediatria | Dra. Simulacao | notas: SEGREDO CLINICO DE SIMULACAO
  membros            estado 200   linhas: 2
  PATCH membros/<leo>.nome  ->  200
```

Lia a consulta da criança com as notas clínicas, e renomeava-a. É o INVARIANTE #3
ao contrário, e a mesma forma do defeito da ficha que a criança lia: o ecrã a
prometer o que o servidor não impõe.

**Nenhuma ligação chegou a ser feita** — apanhou-se com `alexa_ligacoes` a zero,
antes de a conta ser ligada no telemóvel.

### Porque é que 605 provas não deram por isto

Porque a prova que dizia cobri-lo media a **ausência de dados** e chamava-lhe
ausência de acesso:

```js
for (const c of ['episodios_saude', ...]) {
  const r = await comOToken(`/api/collections/${c}/records`, null, 'GET');
  if (r.d.totalItems) throw new Error(...);   // 0 linhas → passa
}
```

A casa dessa prova nunca criava um episódio de saúde. `totalItems` era 0 por não
haver nada lá. Um guarda que não lê nada passa sempre.

### A correcção: a voz tem identidade própria

A coleção `alexa_vozes`, de autenticação, uma linha por ligação. O token sai
dela, e **não** do membro.

⚠ **O que a torna inofensiva é o que ela não tem: `casa` e `papel`.** As regras
desta casa são quase todas da forma `casa = @request.auth.casa && …`, e uma
identidade sem `casa` não casa com casa nenhuma. É uma lista de permissões por
construção — não há caminho do PocketBase (`/api/files/`, `/api/realtime`,
`/api/batch`, o que a próxima versão trouxer) que precise de ser lembrado e
tapado, ao contrário do que seria uma lista de proibições.

O adulto fica numa relação, que o `quemFala()` segue. Quem fala continua a ser
um adulto da casa; o que mudou é que a credencial que anda pela nuvem da Amazon
já não é a dele. E a revogação passou a ser real: apagar a ligação, ou o membro
sair da casa, leva a identidade com ela por `cascadeDelete` — medido.

O guarda é `db/pocketbase/provar-a-voz-nao-chega-a-casa.mjs`, e faz três coisas
que a prova antiga não fazia:

1. **enumera as coleções do servidor** — 43 hoje, e uma nova entra sozinha;
2. **recusa-se a passar em vazio** — se um adulto também não vir nada, falha a
   dizer que não tem dados para medir;
3. **conta a escrita por linhas** antes e depois, porque um 400 tanto pode ser a
   regra a recusar como um campo em falta.

## ⚠ Duas coisas que impediram a conta de ligar, e o que ficou no lugar delas

### 1. O `state` da Amazon tem 1095 caracteres, e eu cortava-o aos 500

```js
state: String(state || '').slice(0, 500),
```

Do lado da casa corria tudo bem: a página abria, o adulto identificava-se, a
ligação nascia, o código era devolvido. E a Amazon respondia **«Não foi possível
vincular a sua conta»** sem nunca vir buscar o token — portanto **sem deixar um
único registo** no servidor a explicar porquê.

O `state` é um blob dela, em base64, que ela valida à chegada. Mutilado, não o
reconhece e desiste em silêncio.

⚠ **E a razão de nunca ter sido apanhado é a lição, não o defeito:** todas as
provas usavam `'abc123'`, `'xyz'`, `'sim-abc'`. Três caracteres contra mil e
noventa e cinco. Uma prova com um valor de brincar não prova o caminho
verdadeiro — mede outra coisa e diz que mediu esta.

Agora devolve-se inteiro, e o que for absurdo é **recusado com mensagem**, nunca
encolhido. Os guardas são `__tests__/o-state-da-amazon-nao-se-corta.test.js` (que
exige que alguma prova use um `state` do tamanho verdadeiro) e as 12 provas de
`db/pocketbase/provar-alexa-google.mjs`.

### 2. Os adultos desta casa entram pela Google, e nunca tiveram palavra-passe

A página só sabia pedir e-mail e palavra-passe. Quem entra pela Google tem no
registo uma palavra-passe ao acaso, criada pelo OAuth, que ninguém sabe — e
levava sempre «Não reconheço esse endereço ou essa palavra-passe». Com razão, e
sem serventia nenhuma.

A página ganhou um **«Continuar com Google»**, por baixo de um «ou». O caminho da
palavra-passe fica: há contas nesta casa que a usam.

```
GET /api/alexa/google          valida o pedido OUTRA VEZ, guarda-o, vai à Google
GET /api/alexa/retorno-google   onde a Google devolve o navegador
```

Quatro decisões que sustentam isto:

- **O segredo da Google não passa por código nosso.**
  `colecao.oauth2.getProviderConfig('google').initProvider()` devolve o
  fornecedor já carregado com o `clientId` e o `clientSecret` guardados na
  coleção. Não está no `.env.local` nem em ficheiro nenhum.
- **Não se usa o `auth-with-oauth2` do PocketBase**, que seria o caminho curto:
  esse **cria um membro novo** quando o e-mail não casa com nenhum. Um estranho
  nascia membro da casa por carregar num botão. Procura-se à mão, pelo e-mail
  que a Google **verificou**, filtrando já pela casa das credenciais da skill.
- **O pedido da Amazon não viaja dentro do `state` da Google.** O que volta da
  Google vem pela barra de endereços — por mãos de quem se está a autenticar —,
  e bastaria começar o fluxo com um `redirect_uri` e voltar com outro. Viaja uma
  chave ao acaso de 40 caracteres; o pedido fica numa linha de `alexa_esperas`,
  de **uso único** e com **cinco minutos** de prazo.
- **As mesmas três recusas** do caminho da palavra-passe: não é membro desta
  casa, é criança, ou a casa não é a das credenciais usadas. Um caminho novo que
  salte uma delas é uma porta das traseiras.

O endereço de retorno é **fixo** — `https://casa.anossacasa.app/api/alexa/retorno-google`
— e tem de estar, letra por letra, nos URIs de redirecionamento autorizados da
consola da Google, **a mais** do `http://localhost:8082/` que faz a app entrar.
Não se deriva do cabeçalho `Host`: esse vem de fora e escolhe-se.

### E o que fica a meio agora limpa-se

Três tentativas falhadas deixaram duas linhas em `alexa_ligacoes` com o código
por gastar — cada uma com um `refresh` válido, que é uma credencial de longa
duração para uma ligação que nunca existiu. E as `alexa_esperas` guardam o
`state` da Amazon. Nenhuma das duas se limpava.

Limpam-se no início de cada tentativa. O filtro distingue-as pelo que não é
ambíguo: `codigo != ""` é uma ligação **a meio**; uma ligação **feita** tem o
código apagado pela troca, e não entra no filtro por mais velha que seja.

## O endpoint da skill é um processo à parte — e porquê

⚠ **Esta página chegou a dizer que o endpoint da Alexa era `casa.anossacasa.app`.
Era falso**, e teria sido descoberto com a skill publicada e o altifalante calado.

A Amazon não chama as rotas da casa. Ela manda **um** pedido, para **um**
endereço, num envelope dela — com a intenção, os slots e o token de quem ligou a
conta — e espera uma resposta no formato dela, com a frase que o altifalante vai
dizer. As rotas `/api/alexa/artigo` e companhia falam outra língua.

E há mais, que é o que decide a questão: um endpoint HTTPS **tem de verificar a
assinatura** de cada pedido. A Amazon exige a cadeia de certificados descarregada
de `s3.amazonaws.com/echo.api/`, o nome alternativo `echo-api.amazon.com`, a
validade, 150 segundos de tolerância no relógio, e a assinatura SHA-256 sobre o
corpo **em bytes**. O JSVM do PocketBase não faz nada disso — não tem X.509, não
tem RSA, não tem cadeia de confiança. Escrevê-lo à mão em Goja seria criptografia
caseira no sítio errado.

Por isso: `alexa/servidor-da-skill.mjs`, um processo Node na `8094` que só traduz
e verifica, e chama as rotas da casa como qualquer outro cliente. As rotas não
mudaram, e as provas que as defendem continuam a valer.

```
Alexa → casa.anossacasa.app/alexa/skill → 8094 (verifica e traduz) → 8095 (escreve)
```

⚠ **A cadeia verifica-se até ao PRIMEIRO âncora, e não até ao topo.** A primeira
versão subia até ao fim da cadeia antes de procurar a raiz, e com a cadeia
verdadeira da Amazon isso **recusa tudo**: o topo dela é um *cross-sign* do
Starfield Services Root G2 que não está no arquivo do sistema, e o âncora — o
Amazon Root CA 1 — está um elo antes. O que vem depois de um âncora é história,
não prova. Só se descobriu porque o guarda corre contra o certificado verdadeiro,
guardado em `alexa/amostras/` — é público, e está expirado de propósito, para
provar também que a validade é conferida.

As funções que decidem quem entra vivem em `alexa/verificacao.cjs`, em CommonJS,
para que o guarda (`__tests__/a-assinatura-da-alexa.test.js`, 8 provas) leia
exactamente o mesmo ficheiro que corre.

## O que falta, e é na consola da Amazon

Tudo o que é da casa está feito e provado — incluindo **pela internet**, com o
`npm run simular:amazon`, que faz de Amazon contra o endereço público: abre a
página, identifica-se, troca o código por um token, acrescenta um artigo, repete
o pedido para provar que não duplica, marca um evento, e confirma que as seis
coleções de saúde não devolvem nada a esse token.

O que falta é do outro lado, e **tem de ser feito por quem tem a conta Amazon**:
criar a skill é entrar numa conta, e o `client_secret` é um segredo que se
escreve num formulário deles. Nenhuma das duas coisas se delega.

Por ordem, na consola em `developer.amazon.com/alexa/console/ask`:

**1. Criar a skill.** Modelo *Custom*, alojamento *Provision your own*. Idioma
**Português (BR)** — não há pt-PT, ver acima.

**2. O modelo de interação.** Em *Build → JSON Editor*, colar o conteúdo de
`alexa/modelo-de-interacao.pt-BR.json`. Depois *Save* e *Build Model*.

**3. O endpoint.** Em *Build → Endpoint*, escolher **HTTPS** e pôr, **com o
caminho**:

```
https://casa.anossacasa.app/alexa/skill
```

⚠ **Sem o `/alexa/skill` isto não funciona.** O endereço sem caminho vai dar ao
PocketBase, que não sabe responder a um envelope da Alexa — ver a secção «O
endpoint da skill é um processo à parte».

No certificado, escolher *«My development endpoint is a sub-domain of a domain
that has a wildcard certificate from a certificate authority»* — o certificado é
da Cloudflare e é válido.

Para conferir antes de gravar, de qualquer máquina:

```
curl -X POST https://casa.anossacasa.app/alexa/skill
```

Tem de responder `400 {"erro":"faltam os cabeçalhos da assinatura"}`. Um `401` é
o PocketBase a atender — o caminho está errado. Um `404` é a regra do túnel em
falta. Um `502` é o serviço `NossaCasaAlexa` em baixo.

**4. Renovar as credenciais — ANTES de as escrever, e não depois.**

```
node db/pocketbase/criar-credenciais-alexa.mjs --novo
```

⚠ **Corra-o na sua consola, e não me mostre o que ele imprime.** O segredo que
lá estava antes foi impresso numa conversa, e é por isso que se troca. Repetir a
conversa com o segredo novo seria desfazer o motivo.

⚠ E faz-se **antes** do passo 5, não depois. O `--novo` troca o `client_id` **e**
o `client_secret`, e a consola da Amazon é um sítio onde se preenche uma vez e
não se volta lá. Esta página chegou a mandar preencher primeiro e renovar
depois — dava o mesmo trabalho a dobrar, com uma janela pelo meio em que a
ligação está feita com um segredo queimado.

O que ele imprime — `Client ID` e `Client secret` — é o que vai para o passo 5, e
**não se volta a ver em lado nenhum** sem ser ali ou na base.

**5. O Account Linking.** Em *Build → Account Linking*, ligar *Do you allow
users to create an account…* e preencher:

| Campo da consola | Valor |
|---|---|
| Authorization Grant Type | `Auth Code Grant` |
| Authorization URI | `https://casa.anossacasa.app/api/alexa/autorizar` |
| Access Token URI | `https://casa.anossacasa.app/api/alexa/token` |
| Client ID | o que o `criar-credenciais-alexa.mjs` imprimiu |
| Client Secret | idem — e **só se vê ali** |
| Client Authentication Scheme | qualquer uma — servem as duas |
| Scope | `casa.escrever` |

⚠ O **Client Authentication Scheme** tem duas opções na consola, e a rota
aceita **as duas**: as credenciais no corpo do pedido ou no cabeçalho
`Authorization` em Basic. A primeira versão só lia o corpo, e escolher a outra
opção dava um `invalid_client` — que parece um segredo mal copiado e manda quem
o vê procurar no sítio errado. Aceitar as duas é o que o RFC 6749 manda, e tira
uma armadilha de uma consola onde se carrega uma vez e não se volta lá.

**6. Fixar o `ALEXA_SKILL_ID`** no `.env.local`, com o identificador que a
consola mostra (`amzn1.ask.skill.…`), e reiniciar o serviço `NossaCasaAlexa`:

```
Restart-Service NossaCasaAlexa
```

Sem ele o serviço aceita qualquer skill que acerte no endereço, e diz-o em cada
arranque. A tranca a sério continua a ser o token — um envelope sem token válido
leva 401 —, mas esta é barata e fecha uma porta que não precisa de estar aberta.

**7. Ligar a conta** na aplicação da Alexa, no telemóvel: *Skills → As suas
skills → Nossa Casa → Settings → Link Account*. É aí que a página do passo 5
aparece, e é aí que um adulto se identifica.

Do lado da casa confirma-se com uma linha nova em `alexa_ligacoes`.

E então: *«Alexa, diz à Nossa Casa para acrescentar leite.»*

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

## A decisão que vinha primeiro — já foi tomada

**Esta secção dizia que a Alexa precisa de um endereço público com HTTPS válido,
que o servidor corria em `127.0.0.1` e não era alcançável, e que expor a casa
era a decisão de segurança maior deste projecto — a única que não se desfaz
sozinha.** Continua tudo verdade, menos o tempo do verbo: foi tomada em
27/09/2026, pelo caminho **A** dos três que estavam listados, um túnel com nome
próprio da Cloudflare. Ver «O servidor está exposto» no topo.

Fica escrito o que ela custou, que era a parte que interessava:

- as regras de API deixaram de ter a rede local como segunda tranca;
- os hooks passaram a ser superfície pública;
- as provas de `db/pocketbase/` passaram de «boa prática» a **única** defesa.

Os outros dois caminhos ficam aqui porque continuam a ser as alternativas, se um
dia isto crescer: **B**, um servidor alugado com a casa a sincronizar para lá —
médio, e é onde acaba se a casa crescer; **C**, uma porta aberta no router com
certificado — que continuo a não recomendar.

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

Ao fim do dia 27/09/2026 estava feito tudo o que é da casa: a exposição, o
Account Linking, o endpoint da skill, e o `pt-BR` aceite. Fica o que é da
Amazon, por esta ordem:

1. ~~**Criar a skill**~~ — feito a 27/09, com o modelo colado e o *build* passado.
2. ~~**Apontar o endpoint**~~ a `https://casa.anossacasa.app/alexa/skill` —
   feito a 27/09, e conferido com o `curl` do passo 3 acima.
3. **Renovar as credenciais** com o `--novo`, na consola dele, **antes** de as
   escrever na Amazon. O que lá estava foi impresso numa conversa.
4. **Preencher o Account Linking** com a tabela do passo 5 acima, de uma vez.
5. **Fixar o `ALEXA_SKILL_ID`** no `.env.local` e reiniciar o `NossaCasaAlexa`.
6. **Ligar a conta** na aplicação da Alexa, no telemóvel. Do lado da casa
   confirma-se com uma linha nova em `alexa_ligacoes`.
7. **Passar a semana com a app no telemóvel**, como estava combinado. A Alexa
   acrescenta uma porta; convém saber se a casa que ela abre é a que se quer —
   e isso continua por saber, porque a app ainda só correu no computador.

A fase 1 é honestamente pequena — três intenções, três rotas, e o Account
Linking em cima do OAuth que já existe. O que a torna séria não é o tamanho: é
que ela é a primeira coisa nesta app que fala com o mundo de fora.

⚠ E hoje isso deixou de ser uma frase sobre o futuro: **o servidor já fala com
o mundo de fora**, com ou sem skill. O que a voz acrescentar daqui para a frente
é só mais uma porta na casa que já está na rua.
