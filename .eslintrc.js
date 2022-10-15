module.exports = {
  root: true,
  extends: 'eslint:recommended',
  rules: {
    semi: ['error', 'never'],
    'prettier/prettier': 0,
  },
  env: {
    node: true,
  },
  parserOptions: {
    ecmaVersion: "latest"
  }
}
