// jest.config.js

import { createDefaultEsmPreset } from "ts-jest";

export default {
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "(.+)\\.js": "$1"
  },
  ...createDefaultEsmPreset()
};