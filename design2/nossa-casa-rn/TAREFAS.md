# Tarefas — por ordem

Cada tarefa diz **o que fazer**, **onde**, e **como saber que está feita**. A referência visual
é sempre `design/Nossa Casa App.dc.html` aberto no navegador, e `docs/especificacao-ecras.md`
para as medidas.

---

## 0. Antes de tudo — medir

Abra `design/Nossa Casa App.dc.html` no Chrome, entre com a Rita, e percorra os cinco
separadores. Leia `docs/medir.md` e experimente o bloco de medição num ecrã, para ter o
procedimento na mão antes de precisar dele.

**Feito quando:** consegue extrair a árvore medida de um ecrã e reconhece nela os valores que
`src/theme.js` já define.

---

## 1. Primeira compilação

`npm install && npx expo start`. Resolver o que aparecer.

**Provável:** os tipos de letra. O protótipo usa Roboto (títulos e corpo) e Inter (dados densos
e etiquetas pequenas). Em Expo: `expo-font` + `@expo-google-fonts/roboto` e
`@expo-google-fonts/inter`, carregados em `App.jsx` antes de renderizar.

**Feito quando:** a app abre no simulador, entra com a Rita, e os cinco separadores navegam.

---

## 2. Folhas de criar (novo evento, nova tarefa, novo artigo)

**Onde:** `src/Sheet.jsx` já tem o invólucro. Criar `src/sheets/NovoEvento.jsx`,
`NovaTarefa.jsx`, `NovoArtigo.jsx`.

**Padrão da folha:** cabeçalho fixo com título e ✕ · meio com scroll · ação fixa em baixo.
Altura máxima que **para 86 px acima do fundo**, para o rodapé continuar visível.

**Campos:** ver o protótipo. Evento: texto livre, dia e hora (um só popup com calendário e
roletes), responsável, alternador de partilha. Tarefa: texto, membro, recorrência, pontos,
urgência, prazo. Artigo: texto, secção, alternador de habitual.

**Feito quando:** criar cada um dos três e vê-lo aparecer na lista respetiva, e o registo de
alterações apanhar a criação.

---

## 3. Popup de confirmação de partilha

Tudo o que é agendado (evento, tarefa, manutenção) passa por confirmação antes de gravar, com
as etiquetas a mudar conforme o tipo — **não fixe "Evento"**. Ver a tabela na especificação.

**Feito quando:** guardar um evento privado mostra "Confirmar como Privado" e o selo *Só eu*
aparece na Agenda.

---

## 4. Equipamentos (ecrã inteiro)

**Onde:** `src/screens/Equipamentos.jsx`.

Lista com os três estados de garantia (em garantia / a expirar / fora), ficha com fotografias de
fatura e equipamento, agendar manutenção, exportar fatura em PDF.

**Regra de cor:** a expirar → texto e contorno laranja de aviso; expirada → vermelho.

**Feito quando:** os três estados aparecem corretos, e agendar manutenção coloca o evento na
Agenda com o nome do equipamento.

---

## 5. Saúde (ecrã inteiro)

**Onde:** `src/screens/Saude.jsx`.

Uma ficha por membro, com episódios (consultas) e, dentro de cada um, exames, receitas e notas —
**os anexos pertencem ao episódio que os originou**, nunca soltos.

**Visibilidade:** a ficha de um adulto é visível só a esse adulto; as das crianças aos adultos.
Esta é a regra mais restritiva do sistema e a que precisa de mais teste.

**Feito quando:** um episódio marcado aparece na Agenda e no Início, e a ficha de um adulto não
é visível ao outro.

---

## 6. Gestão da Casa e Documentação

**Onde:** `src/screens/Gestao.jsx`, `src/screens/Documentacao.jsx`.

Gestão: rendimento, envelopes, semanada (valor livre do ponto, qualquer dia da semana), divisão
das despesas, membros e PIN, lojas, categorias, especialidades. **Só administradores.**

Documentação: o registo de alterações por área e por versão, ordenado por versão descendente.

**Feito quando:** entrar com o Tomás (adulto) não mostra a Gestão; com a Rita mostra.

---

## 7. Ligar ao Supabase

Só depois de a app funcionar com dados locais. `docs/sincronizacao.html` tem o modelo de dados
tabela a tabela, com quem escreve e a regra de conflito de cada uma.

**Ordem:** contas e casa → leitura remota com cópia local → fila de escrita → tempo real na
lista de compras → ficheiros (faturas e exames).

**Feito quando:** a Rita altera no telefone dela e o Tomás vê no dele.

---

## 8. Lojas, ícone e submissão

Ícone e capturas estão em `docs/loja/`. Falta: política de privacidade num endereço estável
(obrigatória nas duas lojas), verificação do acesso ao Google Calendar (leva semanas — comece
cedo), e a declaração de recolha de dados.
