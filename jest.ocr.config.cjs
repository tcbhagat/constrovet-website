/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/claim-companion/extraction/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.ocr.json" }]
  },
  moduleFileExtensions: ["ts", "js", "json"],
  collectCoverageFrom: ["claim-companion/extraction/**/*.ts", "!claim-companion/extraction/**/*.test.ts"],
  clearMocks: true
};
