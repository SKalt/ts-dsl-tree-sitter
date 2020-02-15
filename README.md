A port of the tree-sitter DSL to typescript. The typescript and the test suite are inteded to make refactoring the DSL easier.

```sh
#!/usr/bin/env bash
yarn install --dev # get set up
yarn test # build && test that the new dsl implementation generates the same output as the old one
```
