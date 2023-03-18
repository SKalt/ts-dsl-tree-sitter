# ts-dsl-tree-sitter

This repo contains [a port of the current tree-sitter DSL to typescript](./src/legacy/) and [a new typescript-based DSL](./src/functional). The typescript port and the test suite are inteded to make refactoring the DSL easier.


## Development

```sh
#!/usr/bin/env bash
pnpm install --dev # set up dev-dependencies
pnpm run test # build && test that the new dsl implementation generates the same output as the old one
```

## Usage

## typescript port of the tree-sitter DSL

Compile a `grammar.ts` file into a `grammar.js` file, then use the `tree-sitter` cli as you would normally. 

## New DSL

The new typescript DSL has two notable differences from the current tree-sitter DSL. First, rules are functions that can reference each other by name.  This works due to the distinction between named and anonymous functions;  in typescript, a named function's type is something like
```ts
type Function<Args, Return> = {
  name: string,
  (...args: Args) => Return,
}
```

Second, the new DSL also exposes the DSL as importable functions. Combined, these features let your js/ts language server should enable quick and easy jump-to-definition, documentation-on-hover, and type-checking, same as it would for any other typescript code.

This means you can write grammars that use imports and look like normal typescript:

```ts
// foobar.ts
import { seq } from "./src/functional"
export const foobar = () => seq(foo, bar)
export const foo = () => "foo"
export const bar = () => "bar"

// grammar.ts
import {grammar} from "./src/functional"
import * as rules from "./foobar.ts"

console.log(
  JSON.stringify(
    grammar({ name: "foolang", rules })
  )
)
```

```sh
esbuild --bundle --format=iife ./grammar.ts | node > ./src/grammar.json
tree-sitter generate ./src/grammar.json
```

### Design, trade-offs, and downsides.

Dropping `$ => $.rule_name` in favor of direct function references means typescript can't check for rules to referencing other rules that aren't part of the `rules` object in a grammar defintion. Instead, that check happens at JS runtime, prior to invoking the tree-sitter cli.

Also, ts => js compilation can mangle function names if minification is configured.
