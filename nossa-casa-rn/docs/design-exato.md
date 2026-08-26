# Design exato — contrato

O desenho não é uma referência para interpretar. É uma especificação. Este documento diz o que
não pode ser inventado, e como verificar que não foi.

Aplica-se a **todas as plataformas** — iOS, Android e web. A mesma app, o mesmo desenho.

---

## 1. A regra

**Se um valor não está em `src/theme.js`, não existe.**

Precisar de um cinza que não está na tabela, de um raio a meio caminho entre dois, de um
espaçamento de 12 px — é sinal de que o desenho está a divergir, não de que falta um token.
Nesse caso: volte ao protótipo, meça (`docs/medir.md`), e ou o valor já existe com outro nome,
ou o ecrã está a ser desenhado de novo em vez de reproduzido.

Não há exceções para "só neste sítio".

---

## 2. Tokens — medidos, não recordados

Extraídos do protótipo em execução em 26/08/2026. `src/theme.js` corresponde a esta tabela;
se divergir, a tabela ganha.

### Cor de ação — vem do esquema, por perfil

Seis esquemas. **Não existe laranja nesta app.** A Rita pode ter violeta e o Tomás cião ao mesmo
tempo — a cor de ação é lida do tema do membro ligado, nunca escrita literal.

| Esquema | Ação | Hover | Cabeçalho |
|---|---|---|---|
| Azul Sóbrio (predefinido) | `#011B58` | `#0A2A7A` | `#001529` |
| Violeta | `#722ED1` | `#8B4EE0` | `#241239` |
| Cião | `#08979C` | `#13ADB3` | `#0A5B60` |
| Verde | `#2F7D1F` | `#3B9B23` | `#12300B` |
| Grafite | `#3F3F46` | `#52525B` | `#1C1C1F` |
| Céu | `#1B5FA8` | `#2679C9` | `#0C2A47` |

&gt; **Armadilha de nome.** No protótipo o token da cor de ação ainda se chama
&gt; `--c-orange-strong`, por herança do sistema +Cliente. O **valor** é o acento do esquema
&gt; (`#011B58` no predefinido), não laranja. Não conclua do nome que há laranja; não introduza
&gt; laranja ao encontrar o nome.

### Neutros

| | Claro | Escuro |
|---|---|---|
| Página | `#F0F2F5` | `#00101C` |
| Cartão | `#FCFCFD` | `#0A2033` |
| Superfície | `#FFFFFF` | `#0A2033` |
| Subtil | `#FAFAFA` | `#10293D` |
| Contorno | `#D9D9D9` | `#1E3A4F` |
| Texto 1 | `#262626` | `#F0F2F5` |
| Texto 2 | `#434343` | `#DCE3EA` |
| Texto 3 | `#6A7282` | `#93A4B5` |
| Slate (títulos de secção) | `#67769B` | `#9DB2D6` |
| Divisória | `#F0F2F5` | `#1E3A4F` |

**Branco tem dois papéis e não se podem confundir.** `white` é **primeiro plano** — texto sobre
o cabeçalho e sobre botões de ação; nunca escurece. `surface` é **superfície** — cartões,
folhas, rodapé; escurece no modo escuro. Sobrecarregar os dois com o mesmo nome apagou metade da
interface uma vez.

### Estado

```
info    #1890FF   fundo #E8F4FF
ok      #52C41A   contorno #BAE7A3   fundo rgba(220,243,209,.2)   fundo #389E0D
aviso   #FAAD14   fundo #FEFFD0                                  fundo #AD8B00
erro    #FF4D4F                                                  fundo #CE0002
violeta #722ED1
cião    #08979C
```

Telhas de aviso: `rgba(255,251,230,.8)` no claro, `rgba(250,173,20,.16)` no escuro.
Telhas informativas: `rgba(232,244,255,.8)` / `rgba(24,144,255,.16)`.

### Cor por membro

Rita `#722ED1` · Tomás `#08979C` · Léo `#1890FF` · Mia `#011B58`.
Todas da paleta de estado. **Nenhuma é a cor de ação** — senão um membro parecia um botão.

### Espaçamento — cinco valores

`2 / 4 / 8 / 16 / 24`, mais `48` para estados vazios. Enchimento dos cartões 14 ou 16.
Não existe 12, nem 20, nem 10.

### Raios

```
pastilha  100
cartão      8
linha       6
pequeno     4
```

As bordas são suaves por decisão explícita — foram reduzidas duas vezes. Não as arredonde mais.

### Sombra — uma receita, três opacidades

```
0 2px 6px 0 rgba(76,123,166,X), 0 -2px 6px 0 rgba(76,123,166,X)
X = 0.10 em repouso · 0.15 elevado · 0.20 cabeçalho e ação principal
```

Sem sombras internas. Sem gradientes. Sem texturas.

### Tipo

**Roboto** para títulos, corpo e botões. **Inter** para dados densos e etiquetas pequenas.
Escala `38 / 32 / 28 / 24 / 20 / 18 / 16 / 15 / 14 / 13 / 12 / 11`.

Espaçamento de letra: título `0.25px` · etiqueta `0.1px` · botão `0.4px`.

**Títulos de secção em slate, não em preto.** É a regra de tipo mais distintiva do sistema, e a
primeira coisa que se nota quando alguém a esquece.

Nunca ALL-CAPS.

### Alfa do branco sobre o cabeçalho — calculado

O subtítulo do cabeçalho é branco com transparência, e o alfa **depende da luminância do
cabeçalho do esquema**. Um literal fixo, calibrado para um cabeçalho escuro, falha o contraste
nos esquemas claros — aconteceu, e o Cião ficou a 4,33:1. Use `onChrome()` em `theme.js`.

---

## 3. Anatomias que não variam

| Elemento | Medida |
|---|---|
| Cabeçalho | `56 / 16 / 14` de enchimento — os 56 do topo limpam a barra de estado |
| Rodapé | 86 px totais, cinco entradas iguais, `6 / 4 / 28` de enchimento |
| Largura útil do conteúdo | **355 px** num telefone de 402 — os títulos partem aqui |
| Linha de lista | 44 px mínimo, enchimento `13–16` |
| Linha na loja | **64 px** — uma mão no carrinho |
| Linha de definição | 52 px, com o valor à direita |
| Alvo de toque | **nunca abaixo de 44 px**, seja o ícone de 18 ou de 24 |
| Folha | para **86 px acima do fundo**, para o rodapé continuar visível |
| Ícones | 24 no corpo · 22 em barras · 26–32 em estados · 48 em confirmações |

---

## 4. Web tem de ser igual

Não é uma versão adaptada. É a mesma app.

**Como se garante:** o Expo já corre a mesma árvore de componentes na web
(`npx expo start --web`, via react-native-web). Os tokens são os mesmos módulos JS. Se o desenho
divergir na web, é porque alguém escreveu um valor literal em vez de o ler do tema — não porque
a web precise de outro desenho.

**O que muda na web, e só isto:** o ponteiro tem hover (a app já o define), e a janela pode ser
maior que um telefone. Nesse caso **centre a coluna de 402 px** contra o fundo da página — não
esticar, não reflowar para duas colunas. A app foi desenhada para uma mão.

**Referência viva:** `design/Nossa Casa App.dc.html` corre num navegador com duplo clique. É
literalmente o desenho a funcionar — use-o como padrão de comparação lado a lado, no mesmo
tamanho.

---

## 5. Como verificar

Depois de cada ecrã:

1. **Sobreponha** a captura de `docs/referencia/` ao simulador, no mesmo tamanho. Não compare
   de memória.
2. **Meça** o rodapé (`top + height` tem de caber nos 874) e os alvos de toque.
3. **Corra os seis esquemas** e os **dois aspetos**. Um bug de contraste só aparece no quarto
   esquema.
4. **Procure literais**: `grep -n "#[0-9A-Fa-f]\{6\}" src/` fora de `theme.js` deve devolver
   quase nada. Cada resultado é uma pergunta.

`docs/medir.md` tem o procedimento para extrair a árvore medida de qualquer ecrã do protótipo.

---

## 6. Erros de desenho já cometidos

Não repetir:

1. **Sobrecarregar o token de branco** — apagou títulos e pastilhas no modo escuro.
2. **Alfas de branco fixos** — falharam o contraste nos esquemas claros.
3. **Comprimir espaçamentos sem medir** — três alvos caíram abaixo de 44 px.
4. **Pílula tocável dentro de linha tocável** — obrigava a adivinhar. Uma linha, um destino.
5. **Reutilizar um ícone com outro sentido** — pior do que um ícone menos evocativo.
6. **Acento laranja no ícone da app** — ficou órfão quando o laranja saiu do sistema.
7. **Um `</div>` a mais** — fechou a raiz e o rodapé saiu da coluna flex. Três vezes.
