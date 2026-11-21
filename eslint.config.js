import tseslint from 'typescript-eslint'

const commentLint = {
  rules: {
    'no-comments': {
      create(context) {
        return {
          Program() {
            for (const comment of context.sourceCode.getAllComments()) {
              context.report({ node: comment, message: 'Code comments are forbidden' })
            }
          },
        }
      },
    },
  },
}

export default tseslint.config(
  { ignores: ['dist', 'data', 'node_modules'] },
  ...tseslint.configs.recommended,
  {
    plugins: { comments: commentLint },
    rules: {
      'comments/no-comments': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
)
