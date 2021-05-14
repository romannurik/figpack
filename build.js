#!/usr/bin/env node
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

const fs = require('fs');
const webpack = require('webpack');
const equal = require('deep-equal');
const path = require('path');
const makeWebpackConfig = require('./webpack-config-maker');
const makeManifest = require('./manifest-json-maker');
const tmp = require('tmp');
const chokidar = require('chokidar');

const COMMANDS_ROOT = './commands';
const COMMAND_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx'];

/**
 * Main CLI proc
 */
module.exports = function build(argv) {
  if (argv.watch) {
    rewatch();
  } else {
    buildOnce();
  }
}

/**
 * Compile + watch
 */
function rewatch() {
  let fpConfig = prepareFigpackConfig();
  ensureNecessaryFiles(fpConfig);
  let wpCompiler = makeWebpackCompiler(fpConfig);

  // main webpack watcher
  let wpWatcher = wpCompiler.watch({}, postWebpack(fpConfig));
  // additional watcher for things that don't require a webpack configuration change
  let innerWatcher = chokidar.watch('manifest.json', { ignoreInitial: true });
  // innerWatcher.add('**/ui.html');
  innerWatcher.on('all', () => wpWatcher.invalidate());

  // watcher for things that require a new webpack config (teardown + reinit)
  let outerWatcher = chokidar.watch('./commands', { ignoreInitial: true });
  outerWatcher.add('./figpack.config.js');
  outerWatcher.on('add', maybeReinit);
  outerWatcher.on('change', maybeReinit);
  outerWatcher.on('unlink', maybeReinit);

  async function maybeReinit() {
    if (!configChangeRequiresNewWebpack(fpConfig, prepareFigpackConfig())) {
      return;
    }

    await outerWatcher.close();
    await innerWatcher.close();
    await new Promise(resolve => wpWatcher.close(resolve));
    await new Promise(resolve => setTimeout(resolve, 100));
    rewatch();
  }
}

/**
 * Compile once (no watch)
 */
async function buildOnce() {
  let fpConfig = prepareFigpackConfig();
  ensureNecessaryFiles(fpConfig);
  let wpCompiler = makeWebpackCompiler(fpConfig);
  wpCompiler.run(postWebpack(fpConfig));
}

/**
 * Common handler for build and watch to finish
 * processing after a webpack compile run.
 */
function postWebpack(fpConfig) {
  return (err, stats) => {
    if (err || stats.hasErrors()) {
      err && console.error(err);
      stats.hasErrors() && console.log(stats.toString({ modules: false, colors: true }));
      return;
    }

    writeExtraFiles(fpConfig);

    let { commands } = fpConfig;

    let cmds = commands.length === 1
      ? `1 command`
      : `${commands.length} commands`;
    console.log(`${randEmoji()} Built plugin (${cmds}) @ ${(new Date()).toLocaleTimeString()}`);
  }
}

/**
 * Returns a random "built" emoji for visual feedback
 */
function randEmoji() {
  const emoji = ['😸', '🤟', '🧶', '🦊', '🦖', '🐠', '🌈', '🥑', '🥐', '⛳️', '🥁', '🎈', '🎉'];
  return emoji[Math.floor(Math.random() * emoji.length)];
}

/**
 * Prepares the configuration by reading the filesystem
 */
function prepareFigpackConfig() {
  let commands = [];
  for (let file of fs.readdirSync(COMMANDS_ROOT)) {
    let f = path.join(COMMANDS_ROOT, file);
    let stat = fs.statSync(f);
    if (stat.isDirectory()) {
      let command = { id: file };
      for (let file2 of fs.readdirSync(f)) {
        let f2 = path.join(f, file2);
        for (let ext of COMMAND_EXTENSIONS) {
          if (file2 === `index${ext}`) {
            command.module = f2;
          } else if (file2 === `ui${ext}`) {
            command.uiModule = f2;
          } else if (file2 === `ui.html`) {
            command.uiHtmlString = fs.readFileSync(f2, { encoding: 'utf-8' });
          }
        }
      }
      if (command.module) {
        commands.push(command);
      }
    } else {
      for (let ext of COMMAND_EXTENSIONS) {
        if (file.endsWith(ext)) {
          commands.push({
            id: file.substring(0, file.length - ext.length),
            module: f,
          });
        }
      }
    }
  }

  let fpConfig = { commands };
  if (fs.existsSync('figpack.config.js')) {
    let pluginFpConfig = require(path.resolve(process.cwd(), 'figpack.config.js'));
    fpConfig.manifestTransform = pluginFpConfig.manifest;
  }
  return fpConfig;
}

/**
 * Sees if a new webpack instance is needed given a change
 * in the figpack configuration.
 */
function configChangeRequiresNewWebpack(a, b) {
  return !equal(b, a);
}

/**
 * Creates a webpack instance from the given figpack config
 */
function makeWebpackCompiler(config) {
  return webpack(makeWebpackConfig({
    ...config,
    mainEntry: buildMainEntryJs(config)
  }));
}

/**
 * Builds the main entry JS source file given the figpack config
 */
function buildMainEntryJs({ commands }) {
  const mainEntry = tmp.fileSync({ postfix: '.js' });
  fs.writeFileSync(mainEntry.fd, [
    ...commands.map(
      ({ module }, i) => `const cmd${i} = require("${path.resolve(module)}").default;`),
    'switch (figma.command) {',
    ...commands.map(
      ({ id }, i) =>
        `case "${id}": cmd${i}({}); break;` +
        `case "relaunch_${id}": cmd${i}({relaunch:true}); break;`),
    `default: figma.notify("Unknown command: " + figma.command); figma.closePlugin(); }`,
  ].join('\n'));
  return mainEntry.name;
}

/**
 * Writes extra files beyond what webpack emits, given the figpack configuration.
 */
function writeExtraFiles({ commands, manifestTransform }) {
  // write manifest
  let manifest = JSON.parse(fs.readFileSync('manifest.json'));
  manifest = makeManifest({ commands, manifest });
  if (manifestTransform) {
    manifest = manifestTransform(manifest);
  }
  fs.writeFileSync(path.resolve('dist/manifest.json'), JSON.stringify(manifest, null, 2));

  // write UI HTML files
  for (let { id, uiHtmlString } of commands.filter(({ uiHtmlString }) => !!uiHtmlString)) {
    fs.writeFileSync(path.resolve(`dist/ui-${id}.html`), uiHtmlString);
  }
}

function ensureNecessaryFiles() {
  if (!fs.existsSync('tsconfig.json')) {
    fs.writeFileSync('tsconfig.json',
      fs.readFileSync(path.resolve(TEMPLATE_DIR, 'tsconfig.json'), { encoding: 'utf-8' }));
  }

  if (!fs.existsSync('.babelrc')) {
    fs.writeFileSync('.babelrc',
      fs.readFileSync(path.resolve(TEMPLATE_DIR, '.babelrc'), { encoding: 'utf-8' }));
  }

  if (!fs.existsSync('manifest.json')) {
    console.error('Missing manifest.json!');
    process.exit(1);
  }
}
