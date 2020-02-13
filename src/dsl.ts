import {
  Rule,
  AliasRule,
  SymbolRule,
  RuleType as Type,
  BlankRule,
  ChoiceRule,
  FieldRule,
  PrecRule,
  Repeat1Rule,
  RepeatRule,
  TokenRule,
  GrammarSchema
} from "./types";

import debug from "debug";
debug.enable("*");
interface ExtendedReferenceError extends ReferenceError {
  symbol: any;
}

type RawRule = string | RegExp | Rule;

interface GrammarMaker<
  E extends { [k: string]: Rule },
  R extends { [K in keyof R]: K extends keyof E ? never : Rule }
> {
  name: string;
  externals?: ($: E) => Array<RawRule>;
  rules: { [K in keyof R]: ($: E & R) => RawRule };
  extras?: ($: E & R) => Array<RawRule>;
  conflicts?: ($: E & R) => Array<Array<RawRule>>;
  inline?: ($: E & R) => Array<RawRule>;
  word?: ($: E & R) => RawRule;
  supertypes?: ($: E & R) => Array<RawRule>;
}

function alias(
  rule: RawRule | ExtendedReferenceError,
  value: string | SymbolRule | ExtendedReferenceError
): AliasRule {
  debug("alias")({ arguments });
  const result: AliasRule = {
    type: Type.ALIAS,
    content: normalize(rule),
    named: false,
    value: ""
  };
  if (typeof value == "string") {
    return { ...result, named: false, value };
  } else if (value instanceof ReferenceError) {
    return { ...result, named: false, value: value.symbol.name };
  } else if (typeof value.type === "string" && value.type === Type.SYMBOL) {
    return { ...result, named: true, value: value.name };
  }
  throw new Error("Invalid alias value " + value);
}

function blank(): BlankRule {
  return { type: Type.BLANK };
}

function field(name: string, rule: RawRule): FieldRule {
  return {
    type: Type.FIELD,
    name: name,
    content: normalize(rule)
  };
}

function choice(...elements: RawRule[]): ChoiceRule {
  return {
    type: Type.CHOICE,
    members: elements.map(normalize)
  };
}

function optional(value: RawRule) {
  checkArguments(arguments.length, "optional");
  return choice(value, blank());
}

function prec(number: number, rule: RawRule): PrecRule {
  checkPrecedence(number);
  checkArguments(arguments.length - 1, "prec", " and a precedence argument");

  return {
    type: Type.PREC,
    value: number,
    content: normalize(rule)
  };
}

prec.left = function(number: number | RawRule, rule?: RawRule): PrecRule {
  // TODO: type ^rule
  if (rule === undefined) {
    rule = number as RawRule; // FIXME: this should include a better type guard.
    number = 0;
  }

  checkPrecedence(number);
  checkArguments(
    arguments.length - 1,
    "prec.left",
    " and an optional precedence argument"
  );

  return {
    type: Type.PREC_LEFT,
    value: number as number,
    content: normalize(rule)
  };
};

prec.right = function(number: number | RawRule, rule?: RawRule): PrecRule {
  if (rule == null) {
    rule = number as RawRule;
    number = 0;
  }
  checkPrecedence(number);
  checkArguments(
    arguments.length - 1,
    "prec.right",
    " and an optional precedence argument"
  );

  return {
    type: Type.PREC_RIGHT,
    value: number as number,
    content: normalize(rule)
  };
};

prec.dynamic = function(number: number, rule: RawRule): PrecRule {
  checkPrecedence(number);
  checkArguments(
    arguments.length - 1,
    "prec.dynamic",
    " and a precedence argument"
  );

  return {
    type: Type.PREC_DYNAMIC,
    value: number,
    content: normalize(rule)
  };
};

function repeat(rule: RawRule): RepeatRule {
  checkArguments(arguments.length, "repeat");
  return {
    type: Type.REPEAT,
    content: normalize(rule)
  };
}

function repeat1(rule: RawRule): Repeat1Rule {
  checkArguments(arguments.length, "repeat1");
  return {
    type: Type.REPEAT1,
    content: normalize(rule)
  };
}

function seq(...elements: RawRule[]) {
  return {
    type: Type.SEQ,
    members: elements.map(normalize)
  };
}

function sym(name: string) {
  return {
    type: Type.SYMBOL,
    name: name
  };
}

function token(value: RawRule): TokenRule {
  return {
    type: Type.TOKEN,
    content: normalize(value)
  };
}

token.immediate = function(value: RawRule): TokenRule {
  return {
    type: Type.IMMEDIATE_TOKEN,
    content: normalize(value)
  };
};
// function normalize<R extends Rule>(value: R): R;
// function normalize(value: string): StringRule;
// function normalize(value: RegExp): PatternRule;
function normalize(value: RawRule | ReferenceError): Rule {
  if (value instanceof ReferenceError) throw value;
  switch (typeof value) {
    case "string":
      return { type: Type.STRING, value };
    case "undefined":
      throw new Error("Undefined symbol");
  }

  if (value instanceof RegExp) {
    return { type: Type.PATTERN, value: value.source };
  } else if (typeof value.type === "string") {
    return value;
  } else {
    throw new TypeError("Invalid rule: " + value.toString());
  }
}

function RuleBuilder(ruleMap?: object | null) {
  // TODO: ^ lowerCamelCase
  return new Proxy(
    {},
    {
      get(_, propertyName: string) {
        debug("rulebuilder")({ propertyName, _ });
        const symbol = {
          type: Type.SYMBOL,
          name: propertyName
        };

        if (!ruleMap || ruleMap.hasOwnProperty(propertyName)) {
          return symbol;
        } else {
          const error: ExtendedReferenceError = Object.assign(
            new ReferenceError(`Undefined symbol '${propertyName}'`),
            { symbol }
          );
          return error;
        }
      }
    }
  );
}

function _grammar<
  E extends { [k: string]: Rule },
  R extends { [K in keyof R]: K extends keyof E ? never : Rule }
>(options: GrammarMaker<E, R>, baseGrammar?: GrammarSchema): GrammarSchema {
  baseGrammar = baseGrammar || {
    name: "",
    rules: {},
    extras: [normalize(/\s/)],
    conflicts: [],
    externals: [], // TODO: check this type.
    inline: [],
    supertypes: [],
    word: ""
  };

  // if (!options) throw new Error('')
  let { externals = [] } = baseGrammar;
  if (options.externals) {
    debug("externals")({ externals, opts: options.externals });
    if (typeof options.externals !== "function") {
      throw new Error("Grammar's 'externals' property must be a function.");
    }

    const externalsRuleBuilder = RuleBuilder(null) as E;
    const externalRules = options.externals.call(null, externalsRuleBuilder);

    if (!Array.isArray(externalRules)) {
      throw new Error(
        "Grammar's 'externals' property must return an array of rules."
      );
    }

    externals = externalRules.map(normalize);
  }

  const ruleMap = [
    ...Object.keys(baseGrammar.rules),
    ...Object.keys(options.rules),
    ...(externals as Array<{ name?: string }>)
      .map(rule => rule.name || "")
      .filter(Boolean)
  ].reduce((ruleMap: { [x: string]: true }, ruleName: string) => {
    ruleMap[ruleName] = true;
    return ruleMap;
  }, {});

  const ruleBuilder = RuleBuilder(ruleMap) as E & R;

  const { name } = options;
  if (typeof name !== "string") {
    throw new Error(`Grammar's 'name' property must be a string (was ${name})`);
  }

  if (!/^[a-zA-Z_]\w*$/.test(name)) {
    throw new Error(
      "Grammar's 'name' property must not start with a digit and cannot contain non-word characters."
    );
  }

  let rules = Object.assign({}, baseGrammar.rules);
  if (options.rules) {
    // debug("rules")({ rules, opts: options.rules });
    if (typeof options.rules !== "object") {
      throw new Error("Grammar's 'rules' property must be an object.");
    }

    let errors = Object.entries(options.rules)
      /*errors = errors*/ .filter(([, rule]) => typeof rule !== "function")
      /*errors = errors*/ .map(([ruleName]) => `'${ruleName}'`);
    if (errors.length) {
      const invalidRules = errors.join(", ");
      const are = errors.length < 2 ? "is" : "are";
      throw new Error(
        `Grammar rules must all be functions. ${invalidRules} ${are} not.`
      );
    }

    for (const ruleName in options.rules) {
      debug(`rules`)(ruleName);
      const ruleFn = options.rules[ruleName];
      rules[ruleName] = normalize(ruleFn.call(null, ruleBuilder as E & R));
    }
  }

  let { extras = [] } = baseGrammar;
  if (options.extras) {
    debug("extras")({ extras, opts: options.extras });

    if (typeof options.extras !== "function") {
      throw new Error("Grammar's 'extras' property must be a function.");
    }

    extras = options.extras.call(null, ruleBuilder).map(normalize);
  }

  let { word = "" } = baseGrammar;
  if (options.word) {
    debug("word")({ word, opts: options.word });

    word = (options.word.call(null, ruleBuilder) as SymbolRule).name;
    if (typeof word != "string") {
      throw new Error("Grammar's 'word' property must be a named rule.");
    }
  }

  let { conflicts = [] } = baseGrammar;
  if (options.conflicts) {
    debug("conflicts")({ conflicts, opts: options.conflicts });

    if (typeof options.conflicts !== "function") {
      throw new Error("Grammar's 'conflicts' property must be a function.");
    }
    // let { conflicts = [] } = baseGrammar;
    // const baseConflictRules = conflicts.map(conflict => conflict.map(sym));
    const conflictRules = options.conflicts.call(null, ruleBuilder);

    if (!Array.isArray(conflictRules)) {
      throw new Error(
        "Grammar's conflicts must be an array of arrays of rules."
      );
    }

    conflicts = conflictRules.map(conflictSet => {
      if (!Array.isArray(conflictSet)) {
        throw new Error(
          "Grammar's conflicts must be an array of arrays of rules."
        );
      }

      return conflictSet.map(symbol => (normalize(symbol) as SymbolRule).name);
    });
  }

  let inline = baseGrammar.inline;
  if (options.inline) {
    debug("inline")({ inline, opts: options.inline });

    if (typeof options.inline !== "function") {
      throw new Error("Grammar's 'inline' property must be a function.");
    }
    // const baseInlineRules = (baseGrammar.inline || []).map(sym);
    const inlineRules = options.inline.call(
      null,
      ruleBuilder
      // baseInlineRules,
    ) as SymbolRule[];

    if (!Array.isArray(inlineRules)) {
      throw new Error("Grammar's inline must be an array of rules.");
    }

    inline = inlineRules.map(symbol => symbol.name);
  }

  let { supertypes = [] } = baseGrammar;
  if (options.supertypes) {
    debug("supertypes")({ supertypes, opts: options.supertypes });

    if (typeof options.supertypes !== "function") {
      throw new Error("Grammar's 'supertypes' property must be a function.");
    }

    // const baseSupertypeRules = (baseGrammar.supertypes || []).map(sym);
    const supertypeRules = options.supertypes.call(
      null,
      ruleBuilder
      // baseSupertypeRules,
    ) as SymbolRule[];

    if (!Array.isArray(supertypeRules)) {
      throw new Error("Grammar's supertypes must be an array of rules.");
    }

    supertypes = supertypeRules.map(symbol => symbol.name);
  }

  if (Object.keys(rules).length == 0) {
    throw new Error("Grammar must have at least one rule.");
  }

  return {
    name,
    word,
    rules,
    extras,
    conflicts,
    externals,
    inline,
    supertypes
  };
}

function checkArguments(ruleCount: number, callerName: string, suffix = "") {
  if (ruleCount > 1) {
    throw new Error(
      [
        `The \`${callerName}\` function only takes one rule argument${suffix}.`,
        "You passed multiple rules. Did you mean to call `seq`?\n"
      ].join("\n")
    );
  }
}

function checkPrecedence(value: any) {
  if (value === null) {
    throw new Error("Missing precedence value");
  }
}

function grammar<
  E extends { [k: string]: Rule },
  R extends { [K in keyof R]: K extends keyof E ? never : Rule }
>(
  baseGrammar: GrammarSchema | GrammarMaker<E, R>,
  options?: GrammarMaker<E, R>
): GrammarSchema {
  if (options) {
    return _grammar(options, baseGrammar as GrammarSchema);
  } else {
    return _grammar(baseGrammar as GrammarMaker<E, R>);
  }
}

export {
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
};
