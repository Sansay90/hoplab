// Общие правила монорепо для core и api (web берёт свою часть из ./web.mjs): стиль, строгость, комментарии-отключения.
// Стиль — тот же, что у интерфейса в nuxt.config.ts (eslint.config.stylistic); отдельного Prettier нет.
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs'
import stylistic from '@stylistic/eslint-plugin'
import tseslint from 'typescript-eslint'

/** Отступления проекта от стиля — те же, что в apps/web/eslint.config.mjs. */
export const styleOverrides = {
  // однострочный тип — через «;»: { title: string; icon?: string }
  '@stylistic/member-delimiter-style': ['error', {
    multiline: { delimiter: 'none' },
    singleline: { delimiter: 'semi', requireLast: false },
  }],
  // комментарии в конце строк выравниваются в столбец
  '@stylistic/no-multi-spaces': ['error', { ignoreEOLComments: true }],
  // однострочники вида async () => { unwrap(await …) } — осознанный стиль
  '@stylistic/max-statements-per-line': 'off',
}

/** Правила, общие для всех TS-пакетов (в том числе web, поверх конфига Nuxt). */
export const strictRules = {
  // any — только с комментарием-обоснованием: // eslint-disable-next-line … -- почему
  '@typescript-eslint/no-explicit-any': 'error',
}

export const sharedConfig = [
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  ...tseslint.configs.recommended,
  stylistic.configs.customize({
    semi: false,
    quotes: 'single',
    indent: 2,
    commaDangle: 'always-multiline',
    braceStyle: '1tbs',
    jsx: false,
  }),
  comments.recommended,
  {
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      ...styleOverrides,
      ...strictRules,
      // отключение правила — только с причиной
      '@eslint-community/eslint-comments/require-description': 'error',
      '@eslint-community/eslint-comments/no-unlimited-disable': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
]
