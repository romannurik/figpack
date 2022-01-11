# Update: [create-figma-plugin](https://yuanqing.github.io/create-figma-plugin/) is a better, more maintained version of what this tool set out to do! Please use that :)

----
----
----
----

# Figpack

**EXPERIMENTAL / WORK IN PROGRESS**

A simple build tool for Figma plugins based on webpack.

It's optimized for plugins that could get complex, meaning multiple commands, multiple UIs, several npm dependencies, etc.

# Usage

## Scaffold a new plugin

To start writing a new plugin:

```shell
$ npx figpack init <dir>
```

You can also use the opinionated React + `react-figma-plugin-ds` template:

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

- It expects a `commands` folder in your plugin, that has each command as a separate module (e.g. `commands/cmd1.ts` or `commands/cmd1/index.ts`).
- It automatically detects the presence of a `ui.html` (or .tsx, .jsx, .ts, .js) for each command, compiles it if needed, and exposes it through the `__html__` global variable.

# License

Apache 2.0
