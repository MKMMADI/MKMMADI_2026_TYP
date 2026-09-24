/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/jest.setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
  globalTeardown: '<rootDir>/tests/teardown.ts',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  clearMocks: true,
  collectCoverageFrom: ['src_ts/controllers/**/*.ts', 'src_ts/routes/**/*.ts'],
};
