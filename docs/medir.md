# Medir o protótipo — como obter os valores exatos

O protótipo não é uma imagem: é uma página que corre. Isso significa que **não precisa de
adivinhar nenhuma medida** — pode extraí-la.

## O método

1. Abra `design/Nossa Casa App.dc.html` no Chrome (duplo clique).
2. Entre com a Rita e navegue até ao ecrã que vai construir.
3. Abra a consola (F12 → Console) e cole o bloco abaixo.
4. Recebe a árvore do ecrã com as medidas reais de cada elemento.

Trabalhe **um ecrã de cada vez**: extraia, construa, compare, siga.

```js
// Cole na consola com o ecrã que quer medir visível.
(() => {
  const raiz = [...document.querySelectorAll('div')]
    .find(d => { const b = d.getBoundingClientRect();
      return Math.round(b.width) === 402 && Math.round(b.height) === 874; });
  if (!raiz) return 'Ecrã do telefone não encontrado.';

  const K = ['display','flexDirection','alignItems','justifyContent','gap','flexWrap',
    'paddingTop','paddingRight','paddingBottom','paddingLeft','minHeight',
    'backgroundColor','borderRadius','borderTopWidth','borderTopColor','borderTopStyle',
    'color','fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','textAlign',
    'boxShadow','opacity','position','zIndex','overflow','flexGrow','flexShrink'];
  const omitir = { display:'block', position:'static', opacity:'1', flexGrow:'0',
    flexShrink:'1', textAlign:'start', zIndex:'auto', overflow:'visible',
    backgroundColor:'rgba(0, 0, 0, 0)', borderRadius:'0px', borderTopWidth:'0px',
    boxShadow:'none', letterSpacing:'normal', flexWrap:'nowrap', gap:'normal' };

  const linhas = [];
  const anda = (el, nivel) => {
    const b = el.getBoundingClientRect();
    if (b.width < 1 || b.height < 1) return;
    const cs = getComputedStyle(el);
    const props = K.filter(k => cs[k] && cs[k] !== omitir[k] && cs[k] !== '0px' || k === 'fontSize' && el.childElementCount === 0)
      .map(k => `${k}:${cs[k]}`);
    const proprio = [...el.childNodes]
      .filter(n => n.nodeType === 3 && n.textContent.trim())
      .map(n => n.textContent.trim()).join(' ');
    const alvo = el.getAttribute('aria-label');
    linhas.push('  '.repeat(nivel)
      + `<${el.tagName.toLowerCase()}> ${Math.round(b.width)}x${Math.round(b.height)}`
      + (proprio ? `  "${proprio.slice(0, 60)}"` : '')
      + (alvo ? `  [aria: ${alvo}]` : '')
      + '\n' + '  '.repeat(nivel) + '   ' + props.join(' · '));
    [...el.children].forEach(c => anda(c, nivel + 1));
  };
  anda(raiz, 0);
  const saida = linhas.join('\n');
  console.log(saida);
  copy(saida);   // fica na área de transferência
  return `${linhas.length} elementos — copiado.`;
})()
```

## Duas medições que valem sempre a pena

**Rodapé visível** — o invariante que quebrou três vezes:

```js
(() => {
  const r = [...document.querySelectorAll('div')]
    .filter(d => /Início/.test(d.textContent) && /Agenda/.test(d.textContent));
  const b = r[r.length - 1].getBoundingClientRect();
  return { fundo: Math.round(b.top + b.height), limite: 874,
           ok: Math.round(b.top + b.height) <= 874 };
})()
```

**Alvos de toque abaixo de 44 px** — o que se perde ao comprimir espaçamentos:

```js
[...document.querySelectorAll('[role="button"],[aria-label],[style*="cursor:pointer"]')]
  .map(e => ({ el: e.getAttribute('aria-label') || e.textContent.trim().slice(0, 30),
               w: Math.round(e.getBoundingClientRect().width),
               h: Math.round(e.getBoundingClientRect().height) }))
  .filter(o => o.h > 0 && (o.h < 44 || o.w < 44))
```

## Traduzir para React Native

O CSS do protótipo já está próximo do que o React Native aceita. As diferenças que importam:

| No protótipo | Em React Native |
|---|---|
| `gap: 8px` | `gap: 8` — suportado desde a 0.71, use-o |
| `padding: 14px 16px` | `paddingVertical: 14, paddingHorizontal: 16` |
| `flex: 1` | `flex: 1` (igual) |
| `min-height: 44px` | `minHeight: 44` |
| `box-shadow` | `shadowColor/Offset/Opacity/Radius` + `elevation` no Android |
| `border-radius: 6px` | `borderRadius: 6` |
| `line-height: 1.5` | `lineHeight: 24` — **absoluto**, multiplique pelo tamanho |
| `letter-spacing: .25px` | `letterSpacing: 0.25` |
| `overflow: auto` | `<ScrollView>` |
| `position: absolute; inset: 0` | `StyleSheet.absoluteFill` |
| `backdrop-filter: blur()` | `expo-blur` → `<BlurView>` |
| Texto solto num `<div>` | tem de estar dentro de `<Text>` — sempre |

**A que mais tropeça:** `line-height` relativo. `font-size: 15px; line-height: 1.5` são
`fontSize: 15, lineHeight: 22.5` — se copiar o `1.5` a linha colapsa.

## Comparar

Em `docs/referencia/` estão as capturas dos nove ecrãs principais, tiradas do protótipo
atual. Ponha a captura ao lado do simulador e compare. O que falha primeiro, por experiência:

1. Títulos que partem em duas linhas — a largura útil é **355 px**, não 402.
2. Espaço a mais entre cartões — verifique se não está a somar `gap` do contentor **e**
   margem do filho. No protótipo isso deu 70 px onde deviam ser 16.
3. Alvos de toque encolhidos.
4. Entrelinha colapsada (o `line-height` acima).
