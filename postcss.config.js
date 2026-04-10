export default {
  plugins: {
    '@tailwindcss/postcss': {},
    'autoprefixer': {},
    'postcss-color-functional-notation': {},
    'postcss-color-converter': {
      outputColorFormat: 'rgb',
    },
    'postcss-preset-env': {
      stage: 2,
      features: {
        'oklab-function': true,
        'color-functional-notation': true,
      },
    },
  },
};
