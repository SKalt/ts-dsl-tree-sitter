import {
  RuleType,
  AliasRule as Alias,
  BlankRule as Blank,
  ChoiceRule as Choice,
  FieldRule as Field,
  RepeatRule as Repeat,
  Repeat1Rule as Repeat1,
  PatternRule as Pattern,
  SeqRule as Seq,
  StringRule,
  SymbolRule as Symbolic,
  TokenRule as Token,
  PrecRule as Prec,
  Rule as AnyRule,
  GrammarSchema,
} from "../types";

export const validName = (name: any): name is string =>
  typeof name === "string" && /^[a-zA-Z_]\w*/.test(name);

export type Rule<R extends AnyRule = AnyRule> = R;
export type RuleOrLiteral =
  | string
  | RegExp
  | Rule
  | ((...args: any[]) => Rule)
  | (() => string | RegExp | Rule);

/**
 * This function causes the given rule to appear with an alternative name in the syntax tree.
 * If name is a symbol, as in `alias(foo, bar)`, then the aliased rule will appear as a named node called `bar`.
 * And if name is a string literal, as in `alias(foo, 'bar')`, then the aliased rule will appear as an anonymous node, as if the rule had been written as the simple string.
 * @param rule the rule to alias
 * @param name either a symbol ()
 */
export const alias = (rule: Rule, name: string | Rule): Rule<Alias> => {
  if (typeof name === "string") {
    return {
      type: RuleType.ALIAS,
      content: normalize(rule),
      named: false,
      value: name,
    };
  } else if (name && "name" in name) {
    return {
      type: RuleType.ALIAS,
      content: normalize(rule),
      named: true,
      value: name.name, // TODO: nicer syntax
    };
  } else {
    throw new Error(`Invalid alias target ${name}`);
  }
};

export const blank = (): Rule<Blank> => ({
  type: RuleType.BLANK,
});

/**
 * This function creates a rule that matches one of a set of possible rules. The order of the arguments does not matter. This is analogous to the | (pipe) operator in EBNF notation.
 * @param rules
 */
export const choice = (...rules: RuleOrLiteral[]): Rule<Choice> => ({
  type: RuleType.CHOICE,
  members: rules.map(normalize),
});

/**
 * This function assigns a field name to the child node(s) matched by the given rule.
 * In the resulting syntax tree, you can then use that field name to access specific children.
 * @param name
 * @param rule
 */
export const field = (name: string, rule: RuleOrLiteral): Rule<Field> => ({
  type: RuleType.FIELD,
  name: name,
  content: normalize(rule),
});

/**
 * creates a rule that matches zero or one occurrence of a given rule it is analogous to the `[x]` (square bracket) syntax in EBNF notation.
 * @param value
 */
export const optional = (value: RuleOrLiteral): Rule<Choice> => {
  return choice(value, blank());
};

/**
 * This function marks the given rule with a numerical precedence which will be used to resolve LR(1) Conflicts at parser-generation time.
 * When two rules overlap in a way that represents either a true ambiguity or a local ambiguity given one token of lookahead, Tree-sitter will try to resolve the conflict by matching the rule with the higher precedence.
 * The default precedence of all rules is zero.
 * This works similarly to the precedence directives in Yacc grammars.
 * @param value
 * @param rule
 */
export const prec = (rule: RuleOrLiteral, value: number = 0): Rule<Prec> => ({
  type: RuleType.PREC,
  value,
  content: normalize(rule),
});

/**
 * Left Associativity: marks the given rule as left-associative (and optionally applies a numerical precedence).
 * When an LR(1) conflict arises in which all of the rules have the same numerical precedence, Tree-sitter will consult the rules’ associativity.
 * If there is a left-associative rule, Tree-sitter will prefer matching a rule that ends earlier.
 * This works similarly to associativity directives in Yacc grammars.
 * @param value
 * @param rule
 */
prec.left = (rule: RuleOrLiteral, value: number = 0): Rule<Prec> => ({
  type: RuleType.PREC_LEFT,
  value,
  content: normalize(rule),
});

/**
 * Right Associativity: like @see prec.left, but it instructs Tree-sitter to prefer matching a rule that ends later.
 * @param value
 * @param rule
 */
prec.right = (value: number = 0, rule: RuleOrLiteral): Rule<Prec> => ({
  type: RuleType.PREC_RIGHT,
  value,
  content: normalize(rule),
});

/**
 * This function is similar to prec, but the given numerical precedence is applied at runtime instead of at parser generation time.
 * This is only necessary when handling a conflict dynamically using the the conflicts field in the grammar, and when there is a genuine ambiguity: multiple rules correctly match a given piece of code.
 * In that event, Tree-sitter compares the total dynamic precedence associated with each rule, and selects the one with the highest total.
 * This is similar to dynamic precedence directives in Bison grammars.
 * @param value
 * @param rule
 */
prec.dynamic = (rule: RuleOrLiteral, value: number = 0): Rule<Prec> => ({
  type: RuleType.PREC_DYNAMIC,
  value,
  content: normalize(rule),
});

/**
 * creates a rule that matches zero-or-more occurrences of a given rule. It is analogous to the `{x}` (curly brace) syntax in EBNF notation.
 * @param rule
 */
export const repeat = (rule: RuleOrLiteral): Rule<Repeat> => ({
  type: RuleType.REPEAT,
  content: normalize(rule),
});

/**
 * creates a rule that matches one-or-more occurrences of a given rule. The previous `repeat` rule is implemented in terms of `repeat1` but is included because it is very commonly used.
 * @param rule
 */
export const repeat1 = (rule: RuleOrLiteral): Rule<Repeat1> => ({
  type: RuleType.REPEAT1,
  content: normalize(rule),
});

/**
 * This function creates a rule that matches any number of other rules, one after
 * another. It is analogous to simply writing multiple symbols next to each other
 * in EBNF notation.
 * @param rules
 */
export const seq = (...rules: RuleOrLiteral[]): Rule<Seq> => {
  // TODO: validate args
  return {
    type: RuleType.SEQ,
    members: rules.map(normalize),
  };
};

export const sym = (name: string): Rule<Symbolic> => ({
  type: RuleType.SYMBOL,
  name,
});

/**
 * This function marks the given rule as producing only a single token.
 * Tree-sitter’s default is to treat each String or RegExp literal in the grammar as a separate token.
 * Each token is matched separately by the lexer and returned as its own leaf node in the tree.
 * The token function allows you to express a complex rule using the functions described above (rather than as a single regular expression) but still have Tree-sitter treat it as a single token.
 * @param value
 */
export const token = (value: RuleOrLiteral): Rule<Token> => ({
  type: RuleType.TOKEN,
  content: normalize(value),
});

token.immediate = (value: RuleOrLiteral): Rule<Token> => ({
  type: RuleType.IMMEDIATE_TOKEN,
  content: normalize(value),
});

export const str = (value: string): Rule<StringRule> => ({
  type: RuleType.STRING,
  value,
});

export const pattern = (re: RegExp): Rule<Pattern> => ({
  type: RuleType.PATTERN,
  value: re.source,
});

export const isRule = (x: any): x is Rule =>
  typeof x === "object" && x.type in RuleType;

export function normalize(arg: any): Rule {
  if (isRule(arg)) return arg;
  else if (arg instanceof RegExp) return pattern(arg);
  else if (typeof arg === "string") return str(arg);
  else if (typeof arg === "function") {
    if (validName(arg.name)) return sym(arg.name);
    else
      throw new Error(
        `invalid name for a function-rule: '${arg.name}' for '${arg}'`
      );
  } else throw new Error(`invalid rule: '${arg}'`);
}

/**
 *
 * @param grammar a grammar imported from a src/grammar.json
 */
export const fromGrammar = (grammar: GrammarSchema) => {
  const rules = Object.entries(grammar.rules).reduce(
    (a, [k, v]) => Object.assign(a, { [k]: () => v }),
    {} as Record<string, () => AnyRule>
  );
  const externals = (grammar.externals || []).reduce(
    (acc, value) =>
      "name" in value
        ? Object.assign(acc, {
            [value.name]: () => ({ ...value }),
          })
        : acc, // TODO: handle STRING external rules
    {} as Record<string, () => AnyRule>
  );
  return { ...rules, ...externals, rules, externals };
};

export const makeNamedFunction = (name: string) =>
  ({ [name]: function () {} }[name]);

export const external = (name: string) => makeNamedFunction(name);
