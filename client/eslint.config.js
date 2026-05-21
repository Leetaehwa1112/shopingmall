import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // React 19 + react-hooks v7 의 신규 엄격 룰들은 경고로만 — 점진 정리 대상
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/exhaustive-deps': 'warn',

      // HMR 최적화 힌트 — 빌드는 안 깸
      'react-refresh/only-export-components': 'warn',

      // catch 블록 비워두는 흔한 패턴은 허용
      'no-empty': ['error', { allowEmptyCatch: true }],

      // 안 쓰는 변수는 경고로 두고 점진 정리. `_` 접두사는 허용
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
])
