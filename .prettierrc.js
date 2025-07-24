// @ts-check
module.exports = {
  // Basic settings
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  jsxSingleQuote: false,
  trailingComma: 'es5',
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'always',
  endOfLine: 'lf',
  
  // Overrides for specific file types
  overrides: [
    {
      files: '*.json',
      options: {
        parser: 'json',
        tabWidth: 2,
      },
    },
    {
      files: '*.md',
      options: {
        parser: 'markdown',
        proseWrap: 'always',
        printWidth: 80,
        tabWidth: 2,
      },
    },
    {
      files: '*.yaml',
      options: {
        parser: 'yaml',
        singleQuote: true,
      },
    },
    {
      files: ['*.css', '*.scss'],
      options: {
        parser: 'css',
        singleQuote: true,
      },
    },
  ],
}
