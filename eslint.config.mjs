import js from '@eslint/js';
import globals from 'globals';
import hooks from 'eslint-plugin-react-hooks';
export default [
  { ignores: ['**/node_modules/**', '**/dist/**'] },
  js.configs.recommended,
  { files: ['**/*.{js,jsx}'], languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } }, globals: { ...globals.browser, ...globals.node } }, rules: { 'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z]', argsIgnorePattern: '^(_|[A-Z])' }] } },
  { files: ['frontend/src/**/*.{js,jsx}'], plugins: { 'react-hooks': hooks }, rules: hooks.configs.recommended.rules },
];
