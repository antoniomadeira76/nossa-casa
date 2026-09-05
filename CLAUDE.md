# Nossa Casa — instruções para o Claude Code

App familiar para uma casa de dois adultos (Rita, Tomás) e duas crianças (Léo, Mia): agenda,
tarefas com pontos, lista de compras que fecha em despesa, orçamento por envelopes,
equipamentos com garantias, e fichas de saúde.

**Português europeu em toda a interface.** Registo formal, terceira pessoa, nunca "tu".
Euro com vírgula decimal. Datas dd/mm/aaaa.

---

## Estado do projeto

Este é um projeto **Expo / React Native** com a lógica de negócio completa e a camada visual
parcial. O que falta está em `TAREFAS.md`, por ordem.

```
npm install
npx expo start        # i = iOS, a = Android, ou QR com o Expo Go
```

**O código nunca foi executado** — foi verificado estaticamente. Espere ajustes na primeira
compilação. O candidato mais provável são os tipos de letra (ver README.md).

---

## Fonte de verdade do desenho

`design/Nossa Casa App.dc.html` é o protótipo interativo — **abra-o num navegador antes de
escrever qualquer ecrã**. É HTML, corre com duplo clique, e cada medida nele está decidida e
testada. Quando este ficheiro e o protótipo discordarem, o protótipo ganha.

`docs/especificacao-ecras.md` descreve os 26 ecrãs ao pixel. `docs/sincronizacao.html` e
`docs/seguranca.html` são as especificações de servidor.

---

## Invariantes — não negociáveis

### 0. A base de dados está escrita — e provada

O alvo é o **PocketBase**: `db/pocketbase/`. As regras que impõem os invariantes abaixo
não estão escritas e esperadas — estão **provadas a correr**:

```
npm run db:servir     # o servidor. Sem ele a app corre local, e o ecrã de
                      # entrada diz que o servidor não responde — não que a
                      # Google esteja mal configurada. Já enganou duas vezes.
npm run db:provar     # 368 provas, vinte e dois ficheiros
```

Cada prova tenta o que a `docs/seguranca.html` diz que não pode acontecer e falha se
**passar**. Antes de mexer nas coleções, corra-as; depois de mexer, corra-as outra vez.
`db/README.md` explica cada decisão.

`src/pocketbase.js` é a camada de ligação. Sem `EXPO_PUBLIC_PB_URL` definido, a app corre
local como sempre correu — a ligação é opcional, não um pré-requisito.

`db/postgres/` é o esquema PostgreSQL anterior, guardado como referência: é onde as
políticas estão pensadas ao pormenor.

**A saúde não SINCRONIZA — mas está construída.** Esta linha dizia que `episodios_saude`
e `anexos` «não existem nas coleções nem na camada de cliente», e era falso nas duas
metades. Corrigido em 03/09/2026:

- as coleções **existem**, com regras e **16 provas** em `provar-saude.mjs`
- o cliente **tem** `ler.saude()` em `src/pocketbase.js`
- o que não existe é a **escrita**, e é travada à mão: `recusaSaude()` em `src/sync.js`
  rebenta se alguém lhe acrescentar uma escrita de saúde

O travão é a conformidade, não a construção: cinco pontos no `db/postgres/README.md`, e
são dados clínicos de menores. **Enquanto o servidor da casa correr em `127.0.0.1`**,
quase todos colapsam — não há subcontratante nem titular fora da casa. Voltam todos no
dia em que o servidor for exposto à internet ou alojado por outrem, e isso é decisão do
dono da casa.

⚠ **Uma criança não lê a sua própria ficha.** O servidor devolvia-a e o cliente
escondia-a: uma divergência de três pontas, com o ecrã a prometer «invisíveis às
próprias» em letras. O INVARIANTE #3 diz que o dado não pode CHEGAR ao dispositivo — e
chegava. Resolvido no servidor, que era o lado errado.

### 1. Cabeçalho e rodapé aparecem em TODAS as janelas

Nenhum ecrã os esconde. Nem os de ecrã inteiro (compras, equipamentos, saúde), nem com folhas
ou diálogos abertos. Isto quebrou **três vezes** no protótipo; o padrão do erro é sempre o mesmo:

- O rodapé tem de ser o **último filho da raiz da app**, irmão do cabeçalho e da área de scroll.
- A condição do rodapé é `inApp` e mais nada. Se um ecrã precisar de espaço, encolhe o conteúdo.
- Em React Native: `<View style={{flex:1}}>` com cabeçalho (`flex:0`), conteúdo (`flex:1`) e
  rodapé (`flex:0`). Folhas e diálogos são `<Modal>` ou absolutos **dentro** dessa raiz, com o
  rodapé por cima (`zIndex` alto) — não fora dela.

Depois de mexer na árvore de um ecrã, **meça**: o rodapé tem de ficar visível no fundo do ecrã.

### 2. Saldos nunca são campos escritos

Cofres das crianças, envelopes, pontos e o acerto de contas são **somas de movimentos aditivos**.
Nunca escreva `saldo = X`. Escreva um movimento e some. É isto que impede dois telefones de se
anularem quando ambos alteram a mesma casa — e é a diferença entre uma app que funciona a dois e
uma que perde dinheiro.

Ver `src/store.jsx`: `vault`, `envMove`, `paidPts` seguem esta regra.

### 3. Visibilidade imposta no servidor, nunca no cliente

Um evento privado ("Só eu") ou uma ficha de saúde de adulto **não são escondidos na interface** —
não são devolvidos pela consulta. Se o filtro viver no cliente, o dado chega ao dispositivo do
outro membro e basta uma falha de interface para o revelar.

Quando ligar ao Supabase: políticas de Row Level Security, uma por tabela. `docs/seguranca.html`
tem a tabela de autorização operação a operação.

### 4. Formato do euro com espaço inquebrável

`1 250,00 €` — milhares separados por espaço estreito inquebrável (U+202F), vírgula decimal, e
**espaço inquebrável antes do €** (U+00A0), senão o símbolo cai sozinho para a linha seguinte.
Já implementado em `src/format.js` (`EUR`). Use sempre essa função; nunca formate à mão.

### 5. Alvos de toque nunca abaixo de 44 px

Inclui ícones sozinhos, alternadores, pastilhas e setas. Em linhas de compras na loja: 64 px.
Um ícone de 20 px vive dentro de um alvo de 44. Isto falhou repetidamente ao comprimir
espaçamentos — **verifique depois de mexer em qualquer gap**.

### 6. A urgência manda na ordem das tarefas

Urgentes primeiro, normais depois, sem pressa no fim; os números renumeram-se 1, 2, 3 dentro do
grupo. Mudar a urgência move a tarefa. Ver `sortedTasks` em `src/store.jsx`.

---

## Sistema visual

Tudo em `src/theme.js`. **Não invente valores** — se precisar de um que não existe, é sinal de
que o desenho está a divergir.

**Cor de ação** — não existe laranja nesta app. A ação vem do esquema escolhido pelo membro
(seis esquemas, `SCHEMES`), e é **por perfil**: a Rita pode ter violeta e o Tomás cião.
Nunca escreva uma cor de ação literal; leia-a do tema.

**Cuidado com o branco.** `white` é primeiro plano (texto sobre cabeçalho e sobre botões de
ação) e `surface` é superfície (cartões, folhas, rodapé). No modo escuro só a segunda escurece.
Sobrecarregar as duas com o mesmo valor apagou metade da interface uma vez.

**Alfa sobre o cabeçalho é calculado, não fixo.** O subtítulo do cabeçalho é branco com
transparência; o alfa depende da luminosidade do cabeçalho do esquema, senão os esquemas claros
falham o contraste. Ver `chromeSub` em `src/theme.js`.

**Títulos de secção seguem o esquema do membro** — nunca preto. Eram slate fixo (`#67769B`);
passaram a ser o acento do esquema no modo claro e o `hover` no escuro, porque o acento não
chega aos 3:1 contra a página escura em três dos seis esquemas (Cinza 2,55, Violeta 2,77,
Céu 2,98). Ver `titulo` em `src/theme.js`.

**As etiquetas pequenas (`Label`) continuam em slate**, e é uma decisão: 12 px precisam de
4,5:1, e aí o Cião falha no claro e o Cinza no escuro.

**Espaçamento: 2 / 4 / 8 / 16 / 24.** Cinco valores, mais nada. Enchimento dos cartões 14/16.

**Ícones** — traço aberto, 1,75 de espessura, grelha de 24. Ver `src/Icon.jsx`. Cada ícone tem um
significado exclusivo: `lock` é privado, `smile` é bónus de criança, `houseGear` é a gestão da
casa, `heartPulse` é saúde. **Nunca reutilize um ícone com outro sentido** — é pior do que um
ícone menos evocativo.

**Sem emoji.** É uma app que trata de dinheiro.

---

## Erros já cometidos — não repetir

1. **`</View>` a mais** fechou a raiz cedo e o rodapé saiu da coluna flex. Três vezes.
   Conte as tags depois de editar a árvore de um ecrã.
2. **Sobrecarregar o token de branco** (superfície e primeiro plano no mesmo nome) apagou
   títulos e pastilhas selecionadas no modo escuro.
3. **Acento fixo no ícone da app** — era laranja; quando o laranja saiu, o ícone ficou
   incoerente e ninguém reparou durante semanas. O ícone da app não leva cor de esquema.
4. **Alfas de branco fixos** calibrados para um cabeçalho escuro falharam o contraste nos
   esquemas claros.
5. **Comprimir espaçamentos** fez cair alvos de toque abaixo de 44 px em três sítios.
6. **Pílula tocável dentro de linha tocável** obrigava a adivinhar onde se tocou. Uma linha,
   um destino.

---

## Como verificar

O protótipo foi construído com medição, não com impressão. Mantenha isso:

- Depois de mexer num ecrã, corra-o e **meça** o rodapé, os alvos de toque e as linhas que
  podem partir em duas.
- A largura útil do conteúdo é **355 px** num telefone de 402. Títulos longos partem.
- Teste com os seis esquemas de cor e nos dois aspetos (claro e escuro), não só no predefinido.
- Teste o modo criança: PIN, tarefas, cofre — e confirme que **nenhuma informação de orçamento**
  aparece lá.

---

## O que não fazer sem perguntar

- Acrescentar ecrãs, secções ou funcionalidades que não estão em `TAREFAS.md`.
- Mudar o registo da escrita (formal, terceira pessoa) ou traduzir para outra variante.
- Introduzir uma biblioteca de componentes visuais — o sistema é próprio e está em `theme.js`.
- Ligar o módulo de saúde a um servidor antes de resolver a conformidade: são dados de saúde de
  menores, categoria especial no RGPD. `docs/seguranca.html` explica.
