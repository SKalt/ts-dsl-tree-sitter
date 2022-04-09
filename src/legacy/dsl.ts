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
  GrammarSchema,
  RuleType,
  StringRule,
} from "../types";

interface ExtendedReferenceError extends ReferenceError {
  symbol: any;
}

type RawRule = string | RegExp | Rule;

interface GrammarMaker<
  E extends { [k: string]: Rule },
  R extends { [K in keyof R]: K extends keyof E ? never : Rule }
> {
  name: string;
  externals?: ($: E, original?: Rule[]) => Array<RawRule>;
  rules: { [K in keyof R]: ($: E & R, original?: Rule) => RawRule };
  extras?: ($: E & R, original?: Rule[]) => Array<RawRule>;
  precedences?: ($: E & R) => Array<string | SymbolRule>[];
  conflicts?: ($: E & R, original?: SymbolRule[][]) => Array<Array<RawRule>>;
  inline?: ($: E & R, original?: Rule[]) => Array<RawRule>;
  word?: ($: E & R, original?: string) => SymbolRule;
  supertypes?: ($: E & R, original?: SymbolRule[]) => Array<Rule>;
}

function alias(
  rule: RawRule | ExtendedReferenceError,
  value: string | SymbolRule | ExtendedReferenceError
): AliasRule {
  const result: AliasRule = {
    type: Type.ALIAS,
    content: normalize(rule),
    named: false,
    value: "",
  };
  if (typeof value == "string") {
    return { ...result, named: false, value };
  } else if (value instanceof ReferenceError) {
    return { ...result, named: true, value: value.symbol.name };
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
    content: normalize(rule),
  };
}

function choice(...elements: RawRule[]): ChoiceRule {
  return {
    type: Type.CHOICE,
    members: elements.map(normalize),
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
    content: normalize(rule),
  };
}

prec.left = function (number: number | RawRule, rule?: RawRule): PrecRule {
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
    content: normalize(rule),
  };
};

prec.right = function (number: number | RawRule, rule?: RawRule): PrecRule {
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
    content: normalize(rule),
  };
};

prec.dynamic = function (number: number, rule: RawRule): PrecRule {
  checkPrecedence(number);
  checkArguments(
    arguments.length - 1,
    "prec.dynamic",
    " and a precedence argument"
  );

  return {
    type: Type.PREC_DYNAMIC,
    value: number,
    content: normalize(rule),
  };
};

function repeat(rule: RawRule): RepeatRule {
  checkArguments(arguments.length, "repeat");
  return {
    type: Type.REPEAT,
    content: normalize(rule),
  };
}

function repeat1(rule: RawRule): Repeat1Rule {
  checkArguments(arguments.length, "repeat1");
  return {
    type: Type.REPEAT1,
    content: normalize(rule),
  };
}

function seq(...elements: RawRule[]) {
  return {
    type: Type.SEQ,
    members: elements.map(normalize),
  };
}

function sym(name: string): SymbolRule {
  return {
    type: Type.SYMBOL,
    name,
  };
}

function token(value: RawRule): TokenRule {
  return {
    type: Type.TOKEN,
    content: normalize(value),
  };
}

token.immediate = function (value: RawRule): TokenRule {
  return {
    type: Type.IMMEDIATE_TOKEN,
    content: normalize(value),
  };
};

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
  // TODO: ^ lowerCamelCase?
  return new Proxy(
    {},
    {
      get(_, propertyName: string) {
        const symbol = {
          type: Type.SYMBOL,
          name: propertyName,
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
      },
    }
  );
}

const mustBeFunction = (name: string, fn: any) => {
  if (typeof fn !== "function") {
    throw new Error(`Grammar's "${name}" property must be a function`);
  }
};

function _grammar<
  E extends { [k: string]: Rule },
  R extends { [K in keyof R]: K extends keyof E ? never : Rule }
>(options: GrammarMaker<E, R>, baseGrammar?: GrammarSchema): GrammarSchema {
  baseGrammar = baseGrammar || {
    name: "",
    rules: {},
    extras: [normalize(/\s/)],
    conflicts: [],
    precedences: [],
    externals: [], // TODO: check this type.
    inline: [],
    supertypes: [],
    word: "",
  };

  function processExternals(
    { externals: original = [] }: { externals?: Rule[] } = {},
    { externals }: GrammarMaker<E, R>
  ) {
    if (externals === undefined) return original;
    mustBeFunction("externals", externals);

    const externalsRuleBuilder = RuleBuilder(null) as E;
    const externalRules = externals(externalsRuleBuilder, original);

    if (!Array.isArray(externalRules)) {
      throw new Error(
        "Grammar's 'externals' property must return an array of rules."
      );
    }

    const result = externalRules.map(normalize);

    return result;
  }

  function processName(name: string): string {
    if (typeof name !== "string") {
      throw new Error(
        `Grammar's 'name' property must be a string (was ${name})`
      );
    }

    if (!/^[a-zA-Z_]\w*$/.test(name)) {
      throw new Error(
        "Grammar's 'name' property must not start with a digit and cannot contain non-word characters."
      );
    }
    return name;
  }

  function processRules(
    { rules: original }: { rules: { [k: string]: Rule } },
    { rules }: GrammarMaker<E, R>,
    ruleBuilder: E & R
  ) {
    if (typeof rules !== "object") {
      throw new Error("Grammar's 'rules' property must be an object.");
    }
    if (Object.keys(rules).length == 0) {
      throw new Error("Grammar must have at least one rule.");
    }
    let errors = Object.entries(rules)
      .filter(([, rule]) => typeof rule !== "function")
      .map(([ruleName]) => `'${ruleName}'`);
    if (errors.length) {
      const invalidRules = errors.join(", ");
      const are = errors.length < 2 ? "is" : "are";
      throw new Error(
        `Grammar rules must all be functions. ${invalidRules} ${are} not.`
      );
    }

    const results = { ...original };
    for (const ruleName in options.rules) {
      results[ruleName] = normalize(
        options.rules[ruleName](ruleBuilder, original[ruleName])
      );
    }
    return results;
  }

  function procesExtras(
    { extras: original }: GrammarSchema,
    { extras }: GrammarMaker<E, R>,
    ruleBuilder: E & R
  ) {
    if (!extras) return original;
    mustBeFunction("extras", extras);
    return extras(ruleBuilder, original).map(normalize);
  }

  function procesPrecedences(
    baseGrammar: GrammarSchema,
    options: GrammarMaker<E, R>,
    ruleBuilder: E & R
  ) {
    if (options.precedences === undefined) return baseGrammar.precedences;
    if (typeof options.precedences !== "function") {
      throw new Error("Grammar's 'supertypes' property must be a function.");
    }
    const precedences = options.precedences(ruleBuilder);
    if (Array.isArray(precedences)) {
      const errors = [] as string[];
      const result = [] as Array<StringRule | SymbolRule>[];
      precedences.forEach((group, i) => {
        if (!Array.isArray(group)) {
          return errors.push(`precedences[${i}] is not an array`);
        }
        const groupResult = [] as Array<StringRule | SymbolRule>;
        group.forEach((el, j) => {
          const rule = normalize(el); // can throw
          switch (rule.type) {
            case RuleType.STRING:
            case RuleType.SYMBOL:
              return groupResult.push(rule);
            default:
              return errors.push(
                `precedences[${i}][${j}] must be a string or symbol: ${rule}`
              );
          }
        });
        return result.push(groupResult);
      });
      if (errors.length > 0) throw new Error(errors.join("\n"));
      return result;
    } else {
      throw new Error(
        "Grammar's precedences must be an array of arrays of rules."
      );
    }
  }

  function processWord(
    { word: original = "" }: GrammarSchema,
    { word }: GrammarMaker<E, R>,
    ruleBuilder: E & R
  ) {
    if (!word) return original;
    const result = (word(ruleBuilder, original) as SymbolRule).name;
    if (typeof result != "string") {
      throw new Error("Grammar's 'word' property must be a named rule.");
    }
    return result;
  }

  function processConflicts(
    { conflicts: original = [] }: GrammarSchema,
    { conflicts }: GrammarMaker<E, R>,
    ruleBuilder: E & R
  ) {
    if (!conflicts) return original;
    mustBeFunction("conflicts", conflicts);
    const conflictRules = conflicts(
      ruleBuilder,
      original.map((conflict) => conflict.map(sym))
    );
    const errorMessage =
      "Grammar's conflicts must be an array of arrays of rules.";
    if (!Array.isArray(conflictRules)) throw new Error(errorMessage);

    return conflictRules.map((conflictSet) => {
      if (!Array.isArray(conflictSet)) throw new Error(errorMessage);
      const result = conflictSet.map(
        (symbol) => (normalize(symbol) as SymbolRule).name
      );
      return result;
    });
  }

  function processInline(
    { inline: original = [] }: GrammarSchema,
    { inline }: GrammarMaker<E, R>,
    ruleBuilder: E & R
  ) {
    if (!inline) return original;
    mustBeFunction("inline", inline);
    const baseInlineRules = (original || []).map(sym);
    const inlineRules = inline(ruleBuilder, baseInlineRules) as SymbolRule[];

    if (!Array.isArray(inlineRules)) {
      throw new Error("Grammar's 'inline' property must be an array of rules.");
    }

    return inlineRules.map((symbol) => symbol.name);
  }

  function processSupertypes(
    { supertypes: original }: GrammarSchema,
    { supertypes }: GrammarMaker<E, R>,
    ruleBuilder: E & R
  ) {
    if (!supertypes) return original;
    if (typeof supertypes !== "function") {
      throw new Error("Grammar's 'supertypes' property must be a function.");
    }
    let baseSupertypeRules = (original || []).map(sym);
    const supertypeRules = supertypes(ruleBuilder, baseSupertypeRules);
    if (!Array.isArray(supertypeRules)) {
      throw new Error("Grammar's supertypes must be an array of rules.");
    }
    return supertypeRules.map((rule) => {
      if ("name" in rule) return rule.name;
      else
        throw new Error(
          `supertype ${JSON.stringify(rule, null, 2)} cannot be an alias`
        );
    });
  }
  const name = processName(options.name);
  const externals = processExternals(baseGrammar, options);
  const ruleMap = [
    ...Object.keys(baseGrammar.rules),
    ...Object.keys(options.rules),
    ...externals
      .map((rule) => ("name" in rule ? rule.name : ""))
      .filter(Boolean),
  ].reduce((ruleMap: { [x: string]: true }, ruleName: string) => {
    ruleMap[ruleName] = true;
    return ruleMap;
  }, {});

  const ruleBuilder = RuleBuilder(ruleMap) as E & R;

  const rules = processRules(baseGrammar, options, ruleBuilder);
  const extras = procesExtras(baseGrammar, options, ruleBuilder);
  const precedences = procesPrecedences(baseGrammar, options, ruleBuilder);
  const supertypes = processSupertypes(baseGrammar, options, ruleBuilder);
  const word = processWord(baseGrammar, options, ruleBuilder);
  const conflicts = processConflicts(baseGrammar, options, ruleBuilder);
  const inline = processInline(baseGrammar, options, ruleBuilder);
  return {
    name,
    ...(word ? { word } : {}),
    rules,
    extras,
    precedences,
    conflicts,
    externals,
    inline,
    supertypes,
  };
}

function checkArguments(ruleCount: number, callerName: string, suffix = "") {
  if (ruleCount > 1) {
    throw new Error(
      [
        `The \`${callerName}\` function only takes one rule argument${suffix}.`,
        "You passed multiple rules. Did you mean to call `seq`?\n",
      ].join("\n")
    );
  }
}

function checkPrecedence(value: any) {
  if (value === null) throw new Error("Missing precedence value");
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
  token,
};
