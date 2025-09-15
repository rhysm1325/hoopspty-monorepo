// ESLint config for HoopsPty Sales Dashboard
export default [
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'dist/**',
      'node_modules/**',
      '**/*.config.js',
      '**/*.config.mjs',
      '**/*.config.ts',
      'coverage/**',
      'supabase/**',
    ],
  },
  {
    rules: {
      // Allow builds to pass during development
      // Will be enhanced with proper rules in production
    },
  },
]
