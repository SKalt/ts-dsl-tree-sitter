import * as legacy from "../src/legacy/dsl";

describe("the port of the v1 DSL to typescript", () => {
  beforeEach(() => {
    global.alias = legacy.alias;
    global.blank = legacy.blank;
    global.choice = legacy.choice;
    global.field = legacy.field;
    global.grammar = legacy.grammar;
    global.optional = legacy.optional;
    global.prec = legacy.prec;
    global.repeat = legacy.repeat;
    global.repeat1 = legacy.repeat1;
    global.seq = legacy._seq;
    global.sym = legacy.sym;
    global.token = legacy.token;
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

import { seq, pattern, makeNamedFunction } from "../src/functional";

const jsonOf = x => JSON.parse(JSON.stringify(x)); // strip SYMBOLs

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
