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
const { spawn } = require('child_process');

const ALLOW_EXISTING_FILES = new Set(['.git', '.gitignore', 'LICENSE', 'README.md']);
const DEFAULT_TEMPLATE = 'vanilla';

/**
 * Initialize a new plugin in the current folder
 */
module.exports = async function init({ dir, template }) {
  if (!template) {
    template = DEFAULT_TEMPLATE;
  }

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const templateDir = path.resolve(__dirname, 'init-templates', template);
  const templateCommandDir = path.resolve(templateDir, 'command-template');

  process.chdir(dir);
  for (let f of fs.readdirSync('.')) {
    if (ALLOW_EXISTING_FILES.has(f)) {
      continue;
    }

    console.error(`❗️ The target directory "${dir}" isn't empty!`);
    process.exit(1);
  }

  console.log(`🐣 Scaffolding a new Figma plugin in directory "${dir}"...`);

  let pluginFolder = path.basename(path.resolve('.'));

  let templateVars = {
    PLUGIN_NAME: pluginFolder,
    FIGPACK_VERSION: figpackPackageJson.version,
  };

  execTemplateDir(templateDir, '.', templateVars);
  fs.mkdirSync('commands/cmd1', { recursive: true });
  execTemplateDir(templateCommandDir, 'commands/cmd1', templateVars);

  try {
    console.log('📦 Installing dependencies...');
    await $('npm install --save-dev @figma/plugin-typings');
    console.log(`✅ Done! Your plugin starter is ready.
🔧 To build your plugin and watch for changes (start developing):

    $ cd ${dir}
    $ npm start

🔧 To run a one-time build, run:

    $ npm run build

🦞 Next, grab a new plugin ID from Figma and set the "id" field in manifest.json.
`);
  } catch (e) {
    console.error(`❗️ Error running figpack init: ${e}`);
  }
}

/**
 * Runs a shell command with options, returns a promise.
 */
function $(cmd) {
  return new Promise((resolve, reject) => {
    let args = cmd.split(/\s+/);
    let child;
    try {
      child = spawn(args[0], args.slice(1), { stdio: 'inherit' });
    } catch (e) {
      throw new Error(`Error running "${cmd}"`);
    }
    child.on('error', e => reject(`Command "${cmd}" failed (${e.toString()})`));
    child.on('exit', code => {
      (code === 0 ? resolve : reject)(code)
    });
  });
}

/**
 * Instantiates a copy of all files in the given template directory to the
 * given output directory.
 */
function execTemplateDir(templateDir, destDir, templateVars) {
  for (let file of fs.readdirSync(templateDir)) {
    let f = path.resolve(templateDir, file);
    if (fs.statSync(f).isDirectory()) {
      continue;
    }
    let s = fs.readFileSync(f, { encoding: 'utf-8' });
    s = s.replace(/%%(\w+)%%/g, (_, k) => templateVars[k] || '');
    fs.writeFileSync(path.resolve(destDir, file), s);
  }
}
