---
name: referencias
description: Recapturar ou verificar as capturas de referência do desenho em docs/referencia/. Use quando for comparar um ecrã com o desenho, quando o protótipo mudar, ou quando suspeitar que uma referência não mostra o que o nome diz.
---

# Capturas de referência

`docs/referencia/` tem 29 capturas do protótipo a 402×874, uma por ecrã. São o
critério de aceitação: um ecrã só está feito quando a captura e o simulador
coincidem.

## Antes de confiar numa captura, verifique que é distinta

Este conjunto já esteve com **34 ficheiros para 16 imagens** — metade eram
cópias com nomes trocados. `12-ficha-equipamento.png` era o ecrã do Dinheiro.
Os cinco ficheiros de `25` a `29` eram todos o mesmo diálogo. Ninguém reparou
durante muito tempo, porque **uma captura errada parece uma captura**.

```bash
cd docs/referencia && md5sum *.png | awk '{print $1}' | sort -u | wc -l
```

Deve dar 30 (29 ecrãs + a folha de contacto). Se der menos, há duplicados e as
comparações que fizer contra eles não valem nada.

## Recapturar

```bash
npm run referencias
```

Leva cerca de dois minutos. Conduz o protótipo (`design/Nossa Casa App.dc.html`)
no Chrome instalado, percorre os 29 ecrãs e recorta a moldura de 402×874. No
fim, regenera `todos-os-ecras.png`.

Regenera o conjunto **todo** de uma vez, de propósito: é a única defesa contra
voltar a derivar.

## Se um ecrã falhar na recaptura

O script imprime `✕ <nome>: falhou em «<rótulo>»`. Quase sempre é um rótulo que
mudou no protótipo. Descubra o novo com:

```js
// em scripts/recapturar-referencias.mjs, a função `folhas()` lista os
// rótulos clicáveis do ecrã atual
```

Duas armadilhas já encontradas, ambas no script com comentário a explicar:

- **O seletor de aspeto são três ícones sem texto.** Encontra-se pela estrutura
  — o único trio de irmãos clicáveis de 44×44 em linha — e não por coordenada:
  a folha rola e as coordenadas mudam entre execuções.
- **Os ecrãs de criança precisam de PIN, e não há PIN de fábrica.** O script
  define um por *Gestão → Membros e PIN → Definir*, e **não pode recarregar a
  página entre isso e o login**: o protótipo guarda o estado em memória.

## Medir em vez de capturar

Se precisar de medidas exatas de um elemento (espaçamentos, tipos, cores) e não
de uma imagem, `docs/medir.md` tem o bloco a colar na consola do protótipo. Dá
a árvore do ecrã com os valores reais — não estime, extraia.
