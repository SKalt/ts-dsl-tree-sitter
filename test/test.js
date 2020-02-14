const {
  alias,
  blank,
  choice,
  field,
  grammar,
  optional,
  prec,
  repeat,
  repeat1,
  seq,
  sym,
  token
} = require("../dist/dsl.js");

global.alias = alias;
global.blank = blank;
global.choice = choice;
global.field = field;
global.grammar = grammar;
global.optional = optional;
global.prec = prec;
global.repeat = repeat;
global.repeat1 = repeat1;
global.seq = seq;
global.sym = sym;
global.token = token;

[
  "bash",
  "python",
  "php",
  "c",
  "cpp",
  "java",
  "javascript",
  "toml",
  "lua",
  "typescript/typescript"
].forEach(lang => {
  test(`correctly processed tree-sitter-${lang}`, () => {
    const mod = `tree-sitter-${lang}`;
    const actual = require(`${mod}/grammar.js`);
    const expected = require(`${mod}/src/grammar.json`);
    expect(actual).toEqual(expected);
  });
});
