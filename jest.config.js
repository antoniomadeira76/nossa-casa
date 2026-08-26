module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['/node_modules/', '/design2/', '/nossa-casa-rn/'],
  modulePathIgnorePatterns: ['/design2/', '/nossa-casa-rn/'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
