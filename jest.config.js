module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['/node_modules/', '/design2/'],
  modulePathIgnorePatterns: ['/design2/'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
