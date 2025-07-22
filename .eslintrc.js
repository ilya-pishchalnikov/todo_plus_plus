module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: fals,
  },
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    semi: ["error", "always"],
    quotes: ["error", "double"],
    "no-console": "warn",
    "no-var": "error",
    "prefer-const": "error",
    eqeqeq: "error",
    "no-unused-vars": "warn",
    "no-undef": "error",
  },
};
