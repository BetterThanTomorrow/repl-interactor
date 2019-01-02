const path = require('path');
module.exports = {
  entry: './src/client/main.ts',
  mode: "development",
  externals: {},
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        options: {
          transpileOnly: true,
          experimentalWatchApi: true,
        },
        exclude: /node_modules/
      },
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader']
      }
    ]
  },
  watchOptions: {
    aggregateTimeout: 200,
    poll: 500,
    ignored: /node_modules/
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ]
  },
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'www')
  },
  devServer: {
    historyApiFallback: true,
    host: "0.0.0.0",
    compress: true,
    contentBase: path.join(__dirname, 'www'),
    proxy: {
      '/api': 'http://localhost:3000',
    }
  }
};