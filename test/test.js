const dslPort = require("../src/dsl.ts")
const vm = require("vm");
const fs = require("fs");
const path = require("path")

describe("the port of the v1 DSL to typescript", () => {
  beforeEach(() => {
    global.alias = dslPort.alias;
    global.blank = dslPort.blank;
    global.choice = dslPort.choice;
    global.field = dslPort.field;
    global.grammar = dslPort.grammar;
    global.optional = dslPort.optional;
    global.prec = dslPort.prec;
    global.repeat = dslPort.repeat;
    global.repeat1 = dslPort.repeat1;
    global.seq = dslPort.seq;
    global.sym = dslPort.sym;
    global.token = dslPort.token;
  });
  afterEach(() => {
    delete global.alias;
    delete global.blank;
    delete global.choice;
    delete global.field;
    delete global.grammar;
    delete global.optional;
    delete global.prec;
    delete global.repeat;
    delete global.repeat1;
    delete global.seq;
    delete global.sym;
    delete global.token;
  });
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
      const mod = `tree-sitter-${lang}`
      const actual = require(`${mod}/grammar.js`)
      const expected = require(`${mod}/src/grammar.json`);
      expect(actual).toEqual(expected);
    });
  });
});

describe("v2 api", () => {
  describe("", () => {
    it('work', () => {
      console.log(global.seq)
    })
  });
});
