/*
 * @Author: razer.hua
 * @Date: 2022-12-02 17:29:23
 * @Description: 
 */
/**
 * @file ssr
 * @desc Use vue ssr to render skeleton components. The result contains html and css.
 * @author panyuqi <panyuqi@baidu.com>
 */

/* eslint-disable no-console, fecs-no-require */

const path = require('path');
const webpack = require('webpack');
const NodeTargetPlugin = require('webpack/lib/node/NodeTargetPlugin');
const LoaderTargetPlugin = require('webpack/lib/LoaderTargetPlugin');
const LibraryTemplatePlugin = require('webpack/lib/LibraryTemplatePlugin');
const EntryPlugin = require('webpack/lib/EntryPlugin');
const ExternalsPlugin = require('webpack/lib/ExternalsPlugin');

const createBundleRenderer = require('vue-server-renderer').createBundleRenderer;
const nodeExternals = require('webpack-node-externals');

let MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = function renderSkeleton(serverWebpackConfig, { quiet = false, compilation, context }) {
  let { path: outputPath, publicPath: outputPublicPath } = compilation.outputOptions;
  // get entry name from webpack.conf
  let outputJSPath = path.join(outputPath, serverWebpackConfig.output.filename);
  let outputBasename = path.basename(outputJSPath, path.extname(outputJSPath));
  let outputCssBasename = `${outputBasename}.css`;
  let outputCSSPath = path.join(outputPath, outputCssBasename);

  if (!quiet) {
    console.log(`Generate skeleton for ${outputBasename}...`);
  }

  const outputOptions = {
    filename: outputJSPath,
    publicPath: outputPublicPath
  };

  const childCompiler = compilation.createChildCompiler('vue-skeleton-webpack-plugin-compiler', outputOptions);

  childCompiler.context = context;
  new LibraryTemplatePlugin(undefined, 'commonjs2').apply(childCompiler);
  new NodeTargetPlugin().apply(childCompiler);
  if (Array.isArray(serverWebpackConfig.entry)) {
    serverWebpackConfig.entry.forEach((entry) => {
      new EntryPlugin(context, entry, undefined).apply(childCompiler)
    })
  }
  else {
    new EntryPlugin(context, serverWebpackConfig.entry, undefined).apply(childCompiler)
  }
  new LoaderTargetPlugin('node').apply(childCompiler);
  new ExternalsPlugin('commonjs2', serverWebpackConfig.externals || nodeExternals({
    whitelist: /\.css$/
  })).apply(childCompiler);

  new MiniCssExtractPlugin({
    filename: outputCssBasename
  }).apply(childCompiler);

  return new Promise((resolve, reject) => {
    childCompiler.runAsChild((err, entries, childCompilation) => {
      if (childCompilation && childCompilation.errors && childCompilation.errors.length) {
        const errorDetails = childCompilation.errors.map(error => error.message + (error.error ? ':\n' + error.error : '')).join('\n');
        reject(new Error('Child compilation failed:\n' + errorDetails));
      }
      else if (err) {
        reject(err);
      }
      else {
        let bundle = childCompilation.assets[outputJSPath].source();
        let skeletonCSS = '';
        if (childCompilation.assets[outputCssBasename]) {
          skeletonCSS = childCompilation.assets[outputCssBasename].source();
        }

        console.log('compilation.assets', compilation.assets);

        // delete JS & CSS files
        delete compilation.assets[outputJSPath];
        delete compilation.assets[outputCssBasename];
        delete compilation.assets[`${outputJSPath}.map`];
        delete compilation.assets[`${outputCssBasename}.map`];
        // create renderer with bundle
        let renderer = createBundleRenderer(bundle);
        // use vue ssr to render skeleton
        renderer.renderToString({}, (err, skeletonHTML) => {
          if (err) {
            reject(err);
          }
          else {
            resolve({ skeletonHTML, skeletonCSS });
          }
        });
      }
    });
  });
};
