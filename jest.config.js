// jest.config.js
import { createJsWithTsEsmPreset } from "ts-jest";
export default {
  clearMocks: true,
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  testRunner: "jest-circus/runner",
  moduleNameMapper: {
    "(.+)\\.js": "$1",
  },
  ...createJsWithTsEsmPreset(),
}