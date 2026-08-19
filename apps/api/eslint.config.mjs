import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'node:url';

const tsconfigRootDir = fileURLToPath(new URL('.', import.meta.url));

export default tseslint.config(
  { ignores: ['dist/**', 'src/generated/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    languageOptions: { parserOptions: { tsconfigRootDir } },
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
);
