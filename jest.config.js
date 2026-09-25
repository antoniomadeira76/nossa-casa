module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'jsdom',
  // ⚠ O `/.claude/` é a pasta das worktrees das sessões — cópias INTEIRAS deste
  // repositório, com um `__tests__` cada uma. Sem esta linha, `npx jest` corria
  // 364 suites em vez de 134 e dava 71 «falhadas» que eram só cópias antigas
  // sem `node_modules` a resolver — e a contagem que se diz antes de gravar
  // deixava de querer dizer nada. As provas desta casa vivem na raiz.
  testPathIgnorePatterns: ['/node_modules/', '/design2/', '/nossa-casa-rn/', '/.claude/'],
  modulePathIgnorePatterns: ['/design2/', '/nossa-casa-rn/', '/.claude/'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
