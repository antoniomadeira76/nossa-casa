# A cadeia verdadeira da Alexa, guardada

O `cadeia-da-alexa.pem` é o `echo-api-cert-12.pem` da Amazon, descarregado de
`s3.amazonaws.com/echo.api/` em 27/09/2026. É **público** — é o certificado com
que ela assina os pedidos, não um segredo.

Está aqui porque a verificação da cadeia só se prova contra uma cadeia a sério,
e uma prova que vai à rede buscá-la falha por razões que não são do código.

⚠ **Está EXPIRADO, e é de propósito.** A folha expirou em Dezembro de 2023, e o
guarda usa-o de duas maneiras: com o relógio de hoje, para provar que a validade
é conferida; e com o relógio posto dentro da janela dele, para provar que a
cadeia encaixa e chega a uma raiz do sistema.

⚠ **Foi ele que mostrou o defeito.** A primeira versão da verificação subia até
ao TOPO da cadeia e só aí procurava a raiz. O topo desta são quatro elos:

```
CN=echo-api.amazon.com
CN=Amazon RSA 2048 M01
CN=Amazon Root CA 1                                    ← o âncora está AQUI
CN=Starfield Services Root Certificate Authority - G2  ← e isto vem a mais
```

O quarto é um *cross-sign*: um Starfield Services Root G2 assinado por OUTRA
autoridade, com impressão diferente da raiz que o sistema tem. Olhando só para o
topo, nada encaixa — e o serviço recusaria **todos** os pedidos da Amazon, o que
só se descobriria com a skill publicada e o altifalante calado.

Uma cadeia verifica-se até ao **primeiro** âncora. O que vem depois é história,
não prova. A teoria dizia que a primeira versão estava bem.
