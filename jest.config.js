export default {
  clearMocks: true,
  moduleFileExtensions: ["js", "ts"],
  moduleDirectories: ["src", "node_modules"],
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  testRunner: "jest-circus/runner",
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  verbose: true
};