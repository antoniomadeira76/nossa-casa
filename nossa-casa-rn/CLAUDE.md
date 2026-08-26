# Nossa Casa — instruções para o Claude Code

App familiar para uma casa de dois adultos (Rita, Tomás) e duas crianças (Léo, Mia): agenda,
tarefas com pontos, lista de compras que fecha em despesa, orçamento por envelopes,
equipamentos com garantias, e fichas de saúde.

**Português europeu em toda a interface.** Registo formal, terceira pessoa, nunca "tu".
Euro com vírgula decimal. Datas dd/mm/aaaa.

---

## Estado do projeto

Projeto **Expo / React Native**. A lógica de negócio está completa em `src/store.jsx`, e os
**treze ecrãs estão escritos** — cinco separadores, cinco de ecrã inteiro (loja, equipamentos,
saúde, gestão, documentação), modo criança e as folhas de criar.

O que falta é ligação e as folhas de gerir: está em `TAREFAS.md`, por ordem.

```
npm install
npx expo start        # i = iOS, a = Android, ou QR com o Expo Go
```

**O código nunca foi executado** — foi verificado estaticamente. Espere ajustes na primeira
compilação. O candidato mais provável são os tipos de letra (ver README.md).

---

## Fidelidade ao desenho — leia antes de construir um ecrã

**Não estime medidas. Extraia-as.** O protótipo é uma página que corre, portanto cada valor
pode ser lido do DOM em vez de adivinhado a partir de uma descrição.

`docs/medir.md` tem o procedimento: abra `design/Nossa Casa App.dc.html` no Chrome, navegue
até ao ecrã, cole o bloco de medição na consola, e recebe a árvore do ecrã com as medidas reais
de cada elemento — espaçamentos, enchimentos, cores, tipos, sombras, dimensões.

Esse ficheiro tem também a **tabela de tradução CSS → React Native**. A entrada que mais
tropeça: `line-height` é relativo no protótipo (`1.5`) e **absoluto** em React Native
(`22.5` para um texto de 15) — copiar o `1.5` colapsa a linha.

**Trabalhe um ecrã de cada vez:** meça, construa, compare com a captura em
`docs/referencia/`, corrija, siga. Não construa três ecrãs antes de comparar o primeiro.

Quando este ficheiro e o protótipo discordarem, **o protótipo ganha** — foi ele que foi medido
e revisto ecrã a ecrã.

---

## Fonte de verdade do desenho

**`docs/funcionalidades.md` é o documento a ter aberto enquanto implementa.** Tem o modelo de
estado chave a chave, os valores derivados com as fórmulas, o que cada toque faz em cada ecrã, as
regras de visibilidade e o copy exato. Foi escrito a partir do protótipo para não ter de o ler.

`design/Nossa Casa App.dc.html` é o protótipo interativo — **abra-o num navegador antes de
escrever qualquer ecrã**. É HTML, corre com duplo clique, e cada medida nele está decidida e
testada. Quando este ficheiro e o protótipo discordarem, o protótipo ganha.

`docs/especificacao-ecras.md` descreve os 26 ecrãs ao pixel. `docs/sincronizacao.html` e
`docs/seguranca.html` são as especificações de servidor.

---

## Invariantes — não negociáveis

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

**`docs/design-exato.md` é o contrato do desenho** — a tabela de tokens medida do protótipo, as
anatomias que não variam, a regra de paridade com a web, e os erros de desenho já cometidos.
Leia-o antes do primeiro ecrã.

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

**Títulos de secção em slate** (`#67769B`), não em preto. É a regra de tipo mais distintiva do
sistema.

**Espaçamento: 2 / 4 / 8 / 16 / 24.** Cinco valores, mais nada. Enchimento dos cartões 14/16.

**Ícones** — traço aberto, 1,75 de espessura, grelha de 24. Ver `src/Icon.jsx`. Cada ícone tem um
significado exclusivo: `lock` é privado, `smile` é bónus de criança, `houseGear` é a gestão da
casa, `heartPulse` é saúde. **Nunca reutilize um ícone com outro sentido** — é pior do que um
ícone menos evocativo.

**Sem emoji.** É uma app que trata de dinheiro.

---

## Web é a mesma app

`npx expo start --web` corre a mesma árvore via react-native-web. O desenho é idêntico porque
os tokens são os mesmos módulos. Numa janela maior que um telefone, **centre a coluna de 402 px**
— não estique nem reflowe. Ver `docs/design-exato.md` §4.

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

---

## Capturas de referência

`docs/referencia/` — **29 ecrãs** do protótipo atual, a 402 × 874, mais
`todos-os-ecras.png` (folha de contacto) e um `README.md` que diz, ecrã a ecrã, o que
verificar em cada um.

Cobrem os cinco separadores, os ecrãs de ecrã inteiro (loja, equipamentos, saúde, gestão,
documentação), as folhas principais, o modo escuro e o modo criança completo.

**Use-as como aceitação:** um ecrã só está feito quando a captura e o simulador coincidem.
Compare por esta ordem — altura de cabeçalho e rodapé, espaçamento entre cartões, quebras de
linha nos títulos, pesos de tipo, alvos de toque. O `README.md` da pasta explica porquê.
