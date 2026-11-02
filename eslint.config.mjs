// One lint config for the app (src), API (backend/src) and admin console (admin/src).
// Rules are the recommended sets plus React hook correctness; formatting is not enforced
// (the codebase uses long, dense lines and a reformat would bury real changes).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/dist-web/**', '**/.next/**', '**/.expo/**', 'backend/drizzle/**', 'backend/src/games/engines.generated.ts', 'assets/**', 'scripts/generatePlaceholderArt.js', 'e2e/**', '**/*.config.js', 'metro.config.js', '**/next-env.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser, __DEV__: 'readonly' } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', ignoreRestSiblings: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-require-imports': 'off', // lazy native-module loads are intentional
      '@typescript-eslint/no-empty-object-type': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'prefer-const': 'warn',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}', 'admin/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
);
