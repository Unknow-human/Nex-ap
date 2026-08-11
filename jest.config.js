module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 20000,
  roots: ['<rootDir>/tests'],
  setupFiles: ['<rootDir>/tests/jestSetup.ts'],
  moduleNameMapper: {
    '^expo-constants$': '<rootDir>/tests/__mocks__/expo-constants.ts',
    '^@react-native-google-signin/google-signin$': '<rootDir>/tests/__mocks__/google-signin.js',
    '^react-native$': '<rootDir>/tests/__mocks__/react-native.js'
  },
};
