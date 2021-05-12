/**
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const process = require('process');
const path = require('path');
const webpack = require('webpack');

module.exports = ({ mainEntry, commands }) => ({
  mode: 'production',
  entry: {
    main: mainEntry,
    ...commands
      .filter(({ uiModule }) => !!uiModule)
      .reduce((entries, { id, uiModule }) => ({
        ...entries,
        [`ui-${id}`]: './' + uiModule,
      }), {}),
  },
  performance: { hints: false },
  output: {
    filename: '[name].js',
    path: path.join(process.cwd(), './dist'),
  },
  plugins: [
    new webpack.DefinePlugin({
      __html__: `(
        __uiFiles__.hasOwnProperty('j_' + figma.command)
          ? ("<div class=\\"root\\"></div><script>" + __uiFiles__['j_' + figma.command] + "</script>")
        : __uiFiles__.hasOwnProperty('h_' + figma.command)
          ? __uiFiles__['h_' + figma.command]
          : 'No UI module'
        )`,
    }),
  ],
  module: {
    rules: [
      // JS and TS
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: [
          'babel-loader',
        ]
      },
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          'ts-loader'
        ]
      },
      // CSS and SCSS
      {
        test: /\.s?css$/,
        use: [
          'style-loader',
          'css-loader',
          'sass-loader',
        ]
      },
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.scss',],
  },
  resolveLoader: {
    modules: [
      'node_modules',
      // ensure we can pull loaders from figpick, vs. only loaders
      // installed explicitly by plugins
      path.resolve(__dirname, 'node_modules'),
    ],
  },
});
