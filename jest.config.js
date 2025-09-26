export default {
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "\.(css|less|scss|sass)$": "identity-obj-proxy"
  },
  transform: {
    "^.+\.jsx?$": "babel-jest"
  },
  transformIgnorePatterns: [
    "node_modules/(?!(@codemirror|@lezer|codemirror|lezer|style-mod|w3c-keyname)/)"
  ],
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/**/*.test.js",
    "!src/**/__tests__/**",
    "!src/workers/**/*.js"
  ],
  coverageReporters: ["text", "lcov", "clover", "html"],
  testMatch: [
    "**/__tests__/**/*.test.js"
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/__tests__/e2e/"
  ],
  setupFilesAfterEnv: ["<rootDir>/__tests__/setup.js"],
  moduleDirectories: ["node_modules", "src"],
  clearMocks: true,
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
}
