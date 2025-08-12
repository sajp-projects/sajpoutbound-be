module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended', // ✅ includes 'prettier' and enables the prettier/prettier rule
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_|^next$',
      },
    ],

    // Turn off indentation rules
    indent: 'off',
    '@typescript-eslint/indent': 'off',

    // Enforce Prettier config
    'prettier/prettier': 'error',
  },
  env: {
    node: true,
    es6: true,
  },
};
