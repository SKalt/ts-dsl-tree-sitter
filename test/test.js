const dslPort = require("../src/dsl.ts");
const vm = require("vm");
const fs = require("fs");
const path = require("path");

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
      const mod = `tree-sitter-${lang}`;
      const actual = require(`${mod}/grammar.js`);
      const expected = require(`${mod}/src/grammar.json`);
      expect(actual).toEqual(expected);
    });
  });
});
const { seq, pattern, makeNamedFunction } = require("../src/v2/rules.ts");

const jsonOf = x => JSON.parse(JSON.stringify(x));

describe("v2 api", () => {
  describe("dsl", () => {
    it("pattern", () => {
      expect(jsonOf(pattern(/a?b/gi))).toEqual({
        type: "PATTERN",
        value: "a?b"
      });
    });
    describe("making custom named functions", () => {
      it('works with valid names', () => {
        let name = 'foo';
        expect(makeNamedFunction(name).name).toEqual(name)
      })
    })
    describe("seq", () => {
      it("works with string literals", () => {
        expect(jsonOf(seq("a", "b"))).toEqual({
          type: "SEQ",
          members: [
            { type: "STRING", value: "a",  },
            { type: "STRING", value: "b",  }
          ]
        });
      });
      it("works with regex literals", () => {
        expect(jsonOf(seq(/ab/, /cb/))).toEqual({
          type: "SEQ",
          members: [
            { type: "PATTERN", value: "ab", },
            { type: "PATTERN", value: "cb", }
          ]
        });
      });
      it("works with functions", () => {
        const foo = () => /a/ // a valid grammar
        expect(jsonOf(seq(foo, "b"))).toEqual({
          type: "SEQ",
          members: [
            { type: "SYMBOL", name: "foo" },
            { type: "STRING", value: "b" }
          ],
        });
      })
    });
  });
});
