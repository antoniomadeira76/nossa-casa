# Capturas de referência — 33 ecrãs

Tiradas do protótipo atual, **402 × 874** (iPhone lógico), uma por ecrã. É contra estas imagens
que se verifica a implementação.

`todos-os-ecras.png` é a folha de contacto com todos lado a lado — útil para uma passagem
rápida de coerência (espaçamentos, pesos de tipo, altura de cabeçalho e rodapé).

| Ficheiro | Ecrã | O que verificar |
|---|---|---|
| 01-entrar | Entrada | Marca de água centrada a .14 · painel de vidro a 50 % |
| 02-escolher-conta | Contas Google | Papel de cada membro na pastilha |
| 03-popup-calendar | Importar do Calendar | Caixas de seleção · alternador de partilha |
| 04-inicio | Início | Precisa de Si no topo · três números no cabeçalho |
| 05-dinheiro | Dinheiro | Envelopes com barras · contas entre nós · despesa |
| 06-tarefas | Tarefas | Número com cor de urgência · ordem por urgência |
| 07-compras | Lista de compras | Secções · habituais · histórico |
| 08-agenda | Agenda | Semana · calendário expansível · dias |
| 09-perfil | Perfil | Aspeto num bloco · avisos como frase |
| 10-modo-compras | Modo de loja | Linhas de 64 px · total ao vivo |
| 11-equipamentos | Equipamentos | Três estados de garantia |
| 12-ficha-equipamento | Ficha do equipamento | Fotografias · garantia · manutenção |
| 13-gestao-casa | Gestão da Casa | Só administradores |
| 14-membros-pin | Membros e PIN | Pílula do papel como estado, não botão |
| 15-saude | Saúde da Família | Uma ficha por membro |
| 16-ficha-saude | Ficha de saúde | Episódios com anexos dentro |
| 17-documentacao | Documentação | Versões descendentes |
| 18-agendar-evento | Agendar evento | Folha para 86 px acima do fundo |
| 19-mover-dinheiro | Mover dinheiro | Valor escrevível · pré-visualização |
| 20-nova-tarefa | Nova tarefa | Urgência · prazo · partilha |
| 21-cofre-crianca | Cofre (vista adulto) | Movimentos aditivos |
| 22-escuro-inicio | Início escuro | Superfícies escurecem, branco de primeiro plano não |
| 23-escuro-dinheiro | Dinheiro escuro | Barras e estados legíveis |
| 24-escuro-perfil | Perfil escuro | Seis esquemas visíveis |
| 25-terminar-sessao | Terminar sessão | Diálogo de confirmação |
| 26-entrar-crianca | Quem está a entrar | Perfis sem conta própria |
| 27-pin-crianca | PIN | Quatro dígitos · sem valor de fábrica |
| 28-crianca-tarefas | Criança — Tarefas | Alvos maiores · sem orçamento |
| 29-crianca-cofre | Criança — Cofre | Pedido sujeito a autorização |

## Como usar

Ponha a captura ao lado do simulador, no mesmo tamanho. Compare por esta ordem:

1. **Altura do cabeçalho e do rodapé** — se estes estiverem certos, o resto encaixa.
2. **Espaçamento entre cartões** — o erro mais comum é somar `gap` do contentor e margem
   do filho.
3. **Quebras de linha nos títulos** — a largura útil é 355 px, não 402.
4. **Pesos e tamanhos de tipo** — títulos de secção em slate, não preto.
5. **Alvos de toque** — nada abaixo de 44 px; 64 px nas linhas da loja.

Recapture-as quando o desenho mudar: `docs/medir.md` explica como.
