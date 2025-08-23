module.exports = {
  env: {
    browser: true,
    es2022: true,
    jest: true,
    node: true
  },
  extends: [
    "eslint:recommended",
    "prettier"
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module"
  },
  rules: {
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "prefer-const": "error",
    "no-var": "error",
    "object-shorthand": "error",
    "prefer-template": "error",
    "prefer-arrow-callback": "error",
    "arrow-body-style": ["error", "as-needed"],
    "no-param-reassign": "error",
    "no-magic-numbers": ["warn", { ignore: [0, 1, -1, 100, 1000] }],
    "max-lines": ["warn", { max: 200, skipBlankLines: true, skipComments: true }],
    "max-lines-per-function": ["warn", { max: 20, skipBlankLines: true, skipComments: true }],
    "complexity": ["warn", { max: 10 }],
    "no-nested-ternary": "error"
  },
  ignorePatterns: [
    "dist/",
    "node_modules/",
    "coverage/",
    "*.min.js"
  ]
}
