# O modelo de interação — porquê assim

O  é para **colar tal e qual** no *JSON Editor*
da consola da Amazon. Por isso não tem comentários nem chaves a mais: a consola
valida contra o esquema dela, e uma chave que ela não conheça é um erro à frente
de quem está a colar.

As razões vivem aqui, que é onde podem ser escritas em português.

Modelo de interação da skill «Nossa Casa» — fase 1 do docs/alexa.md.
PORQUE É pt-BR E NÃO pt-PT: a Alexa não tem português europeu. Os idiomas
de uma skill são uma lista fechada da Amazon e o único português nela é o
pt-BR (confirmado em 27/09/2026, sem planos anunciados). O idioma aqui é o
que a Alexa OUVE; o que ela diz são as frases que o servidor devolve, e
essas continuam escritas em português europeu. O altifalante tem de estar
configurado em português do Brasil para a skill ser invocável.
PORQUE É QUE O TÍTULO DO EVENTO NÃO É AMAZON.SearchQuery: a regra da Amazon
é que o SearchQuery «cannot be combined with another intent slot in sample
utterances». O docs/alexa.md pedia {titulo} SearchQuery com {data} e {hora}
na mesma frase, e a compilação da skill recusaria. O título passa a tipo
próprio, TituloDeEvento, que se combina com os outros.
E PORQUE É QUE OS SearchQuery ESTÃO NO FIM DA FRASE: o SearchQuery é guloso
— apanha tudo o que vier a seguir. Num «acrescentar {artigo} à lista» o
slot fica com «leite à lista». No fim da frase não há nada para ele comer.
