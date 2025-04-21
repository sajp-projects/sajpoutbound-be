module.exports = {
  parser: '@typescript-eslint/parser',
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_|^next$' }],

    // Formatting rules
    indent: ['error', 2],
    semi: ['error', 'always'],
    quotes: ['error', 'single'],
    'brace-style': ['error', '1tbs'],
    'comma-dangle': ['error', 'always-multiline'],
    'space-before-blocks': 'error',
    'keyword-spacing': 'error',
    'space-infix-ops': 'error',
    'eol-last': 'error',
    'no-multiple-empty-lines': ['error', { max: 1 }],
    'object-curly-spacing': ['error', 'always'],

    // Rules for object formatting
    'object-curly-newline': [
      'error',
      {
        ObjectExpression: { minProperties: 1, multiline: true },
        ObjectPattern: { minProperties: 3, multiline: true },
        ImportDeclaration: { minProperties: 3, multiline: true },
        ExportDeclaration: { minProperties: 3, multiline: true },
      },
    ],
    'object-property-newline': ['error', { allowAllPropertiesOnSameLine: false }],
  },
  env: {
    node: true,
    es6: true,
  },
};
