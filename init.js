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
const path = require('path');
const figpackPackageJson = require('./package.json');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const TEMPLATE_DIR = path.resolve(__dirname, 'init-template');
const TEMPLATE_COMMAND_DIR = path.resolve(__dirname, 'init-template/command-template');
const BAIL_EXISTING_FILES = ['manifest.json', 'commands', 'package.json'];

/**
 * Initialize a new plugin in the current folder
 */
module.exports = async function init({ dir }) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  process.chdir(dir);
  for (let f of BAIL_EXISTING_FILES) {
    if (fs.existsSync(f)) {
      console.error(`The directory "${dir}" already has a plugin!`);
      process.exit(1);
    }
  }

  console.log(`Scaffolding new plugin in directory "${dir}"...`);

  let pluginFolder = path.basename(path.resolve('.'));
  execTemplateDir(TEMPLATE_DIR, '.');
  fs.writeFileSync('package.json', JSON.stringify(makePackageJson(pluginFolder), null, 2));
  fs.writeFileSync('manifest.json', JSON.stringify(makeManifetJson(pluginFolder), null, 2));
  fs.mkdirSync('commands/cmd1', { recursive: true });
  execTemplateDir(TEMPLATE_COMMAND_DIR, 'commands/cmd1');

  try {
    console.log('Installing dependencies...');
    await exec('npm install --save-dev @figma/plugin-typings');
    await exec('npm install --save react react-dom react-figma-plugin-ds');
    await exec('npm install');
    console.log(`Done.`);
  } catch (e) {
    console.error(e.toString());
  }
}

/**
 * Instantiates a copy of all files in the given template directory to the
 * given output directory.
 */
function execTemplateDir(templateDir, destDir = '.') {
  for (let file of fs.readdirSync(templateDir)) {
    let f = path.resolve(templateDir, file);
    if (fs.statSync(f).isDirectory()) {
      continue;
    }
    let s = fs.readFileSync(f, { encoding: 'utf-8' });
    fs.writeFileSync(path.resolve(destDir, file), s);
  }
}

/**
 * Prepare a scaffold package.json
 */
function makePackageJson(pluginName) {
  return {
    "name": `${pluginName}-figma-plugin`,
    "version": "1.0.0",
    "scripts": {
      "build": "figpack",
      "start": "figpack --watch"
    },
    "devDependencies": {
      "figpack": `^${figpackPackageJson.version}`
    },
    "dependencies": {
      "classnames": "^2.2.6",
      "figma-messenger": "^1.0.5"
    }
  };
}

/**
 * Prepares a scaffold manifest.json
 */
function makeManifetJson(pluginName) {
  return {
    "api": "1.0.0",
    "name": pluginFolder,
    "id": "000000000000000000",
    "menu": [
      {
        "name": "Command 1",
        "command": "cmd1"
      }
    ]
  };
}