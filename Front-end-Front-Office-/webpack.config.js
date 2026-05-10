module.exports = {
  // ...other webpack config...
  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader'],
        exclude: [
          /node_modules\/face-api\.js/,
          /node_modules\/@tensorflow/
        ]
      }
    ]
  },
  // Ajouter cette configuration pour ignorer les avertissements
  ignoreWarnings: [
    {
      module: /node_modules\/face-api\.js/,
    },
    {
      module: /node_modules\/@tensorflow/,
    }
  ]
};
