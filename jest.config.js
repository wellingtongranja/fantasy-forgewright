export default {
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "\.(css|less|scss|sass)$": "identity-obj-proxy"
  },
  transform: {
    "^.+\.jsx?$": "babel-jest"
  },
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/**/*.test.js",
    "!src/**/__tests__/**"
  ],
  testMatch: [
    "**/__tests__/**/*.js",
    "**/*.test.js"
  ],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
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
