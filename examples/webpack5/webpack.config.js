/*
 * @Author: razer.hua
 * @Date: 2022-12-02 17:29:23
 * @Description: 
 */
/**
 * @file skeleton conf
 * @author panyuqi (pyqiverson@gmail.com)
 */

/* eslint-disable fecs-no-require */

'use strict';

const path = require('path');
const utils = require('./utils');
const merge = require('webpack-merge');
const baseWebpackConfig = require('./webpack.base.conf');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { VueLoaderPlugin } = require('vue-loader');

const SkeletonWebpackPlugin = require('../../lib');

function resolve(dir) {
  return path.join(__dirname, dir);
}

let webpackConfig = merge(baseWebpackConfig, {
  mode: 'development',
  module: {
    rules: utils.styleLoaders({
      sourceMap: false,
      extract: true
    })
  },
  devtool: false,
  plugins: [
    new VueLoaderPlugin(),

    new MiniCssExtractPlugin({
      filename: utils.assetsPath('css/[name].css')
    }),

    new HtmlWebpackPlugin({
      filename: utils.assetsPath('../index.html'),
      template: path.join(__dirname, './index.html'),
      inject: true,
      minify: {
        removeComments: true,
        collapseWhitespace: true,
      },
    }),

    new SkeletonWebpackPlugin({
      webpackConfig: {
        entry: {
          app: resolve('./src/entry-skeleton.js')
        }
      },
      quiet: true
    })
  ]
});

module.exports = webpackConfig;
