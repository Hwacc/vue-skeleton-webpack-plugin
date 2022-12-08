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

var path = require('path');
var webpack = require('webpack');
var NodeTargetPlugin = require('webpack/lib/node/NodeTargetPlugin');
var LoaderTargetPlugin = require('webpack/lib/LoaderTargetPlugin');
var LibraryTemplatePlugin = require('webpack/lib/LibraryTemplatePlugin');
var EntryPlugin = require('webpack/lib/EntryPlugin');
var ExternalsPlugin = require('webpack/lib/ExternalsPlugin');

var createBundleRenderer = require('vue-server-renderer').createBundleRenderer;
var nodeExternals = require('webpack-node-externals');

var MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = function renderSkeleton(serverWebpackConfig, ref) {
  var quiet = ref.quiet; if ( quiet === void 0 ) quiet = false;
  var compilation = ref.compilation;
  var context = ref.context;

  var ref$1 = compilation.outputOptions;
  var outputPath = ref$1.path;
  var outputPublicPath = ref$1.publicPath;
  // get entry name from webpack.conf
  var outputJSPath = path.join(outputPath, serverWebpackConfig.output.filename);
  var outputBasename = path.basename(outputJSPath, path.extname(outputJSPath));
  var outputCssBasename = outputBasename + ".css";
  var outputCSSPath = path.join(outputPath, outputCssBasename);

  if (!quiet) {
    console.log(("Generate skeleton for " + outputBasename + "..."));
  }

  var outputOptions = {
    filename: outputJSPath,
    publicPath: outputPublicPath
  };

  var childCompiler = compilation.createChildCompiler('vue-skeleton-webpack-plugin-compiler', outputOptions);

  childCompiler.context = context;
  new LibraryTemplatePlugin(undefined, 'commonjs2').apply(childCompiler);
  new NodeTargetPlugin().apply(childCompiler);
  if (Array.isArray(serverWebpackConfig.entry)) {
    serverWebpackConfig.entry.forEach(function (entry) {
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

  return new Promise(function (resolve, reject) {
    childCompiler.runAsChild(function (err, entries, childCompilation) {
      if (childCompilation && childCompilation.errors && childCompilation.errors.length) {
        var errorDetails = childCompilation.errors.map(function (error) { return error.message + (error.error ? ':\n' + error.error : ''); }).join('\n');
        reject(new Error('Child compilation failed:\n' + errorDetails));
      }
      else if (err) {
        reject(err);
      }
      else {
        var bundle = childCompilation.assets[outputJSPath].source();
        var skeletonCSS = '';
        if (childCompilation.assets[outputCssBasename]) {
          skeletonCSS = childCompilation.assets[outputCssBasename].source();
        }

        console.log('compilation.assets', compilation.assets);

        // delete JS & CSS files
        delete compilation.assets[outputJSPath];
        delete compilation.assets[outputCssBasename];
        delete compilation.assets[(outputJSPath + ".map")];
        delete compilation.assets[(outputCssBasename + ".map")];
        // create renderer with bundle
        var renderer = createBundleRenderer(bundle);
        // use vue ssr to render skeleton
        renderer.renderToString({}, function (err, skeletonHTML) {
          if (err) {
            reject(err);
          }
          else {
            resolve({ skeletonHTML: skeletonHTML, skeletonCSS: skeletonCSS });
          }
        });
      }
    });
  });
};
