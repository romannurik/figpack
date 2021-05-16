[![npm](https://img.shields.io/npm/v/figpack?logo=npm&cacheSeconds=1800)](https://www.npmjs.com/package/figpack)

# Figpack

**EXPERIMENTAL / WORK IN PROGRESS**

A simple build tool for Figma plugins based on webpack.

It's optimized for plugins that could get complex, meaning multiple commands, multiple UIs, several npm dependencies, etc.

# Usage

## Scaffold a new plugin

To initialize a new plugin:

```shell
$ npx figpack init <dir>
```

If you want to use the "opinionated" template that uses React and `react-figma-plugin-ds`:

```shell
$ npx figpack init --template react <dir>
```

## Build your plugin

```shell
$ npx figpack build     # build once
$ npx figpack build -w  # build + watch
```

Or if you've created your plugin with the `init` script:

```shell
$ npm run build     # build once
$ npm start         # build + watch
```


# How it works

Figpack handles a couple typically very boilerplate-y things for you:

- It looks at your `commands` folder and exposes commands based on the subdirectory names. You should have an `index.ts` (or .js) file in there.
- It automatically detects `ui.html` (or .tsx, .jsx, .ts, .js) for each command and exposes it as `__html__` for the command's main module.

# License

Apache 2.0
