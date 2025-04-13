const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

const commonConfig = {
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|obj)$/i,
        type: 'asset/resource',
      }
    ]
  },
};

const browserConfig = {
  ...commonConfig,
  mode: 'development',
  devtool: 'source-map',
  entry: {
    main: './src/index.js',
    worker: './src/worker.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js',
    assetModuleFilename: 'assets/[hash][ext][query]'
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      chunks: ['main']
    })
  ],
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    compress: true,
    port: 9000
  }
};

const nodeConfig = {
  ...commonConfig,
  mode: 'development',
  devtool: 'source-map',
  target: 'node',
  entry: {
    server: './src/server.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  externals: [nodeExternals()]
};

module.exports = [browserConfig, nodeConfig];