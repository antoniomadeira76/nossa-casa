// ⚠ O `import()` dinâmico não corre no Jest sem `--experimental-vm-modules`:
// «A dynamic import callback was invoked without --experimental-vm-modules».
// A loja carrega o `sync` assim (`carregarSync`), e por isso NENHUM guarda
// conseguia correr o `lerDoServidor` de ponta a ponta — o `catch` devolvia
// «sem servidor» e nada ficava vermelho. Foi assim que um `ReferenceError` no
// `puxarCasa` chegou ao dono da casa como «não faz parte desta casa»
// (12/09/2026, classe 39). Só em testes, `import(x)` passa a
// `Promise.resolve().then(() => require(x))`; o Metro nunca vê isto.
const importDinamicoParaRequire = ({ types: t }) => ({
  name: 'import-dinamico-para-require',
  visitor: {
    CallExpression(caminho) {
      if (!t.isImport(caminho.node.callee)) return;
      const [alvo] = caminho.node.arguments;
      caminho.replaceWith(t.callExpression(
        t.memberExpression(
          t.callExpression(t.memberExpression(t.identifier('Promise'), t.identifier('resolve')), []),
          t.identifier('then')),
        [t.arrowFunctionExpression([], t.callExpression(t.identifier('require'), [alvo]))],
      ));
    },
  },
});

module.exports = function (api) {
  const emTestes = api.env('test');
  api.cache.using(() => (emTestes ? 'test' : 'app'));
  return {
    presets: ['babel-preset-expo'],
    plugins: emTestes ? [importDinamicoParaRequire] : [],
  };
};
