// see https://github.com/tree-sitter/tree-sitter/blob/master/cli/src/generate/grammar-schema.json
export type Rule =
  | AliasRule
  | BlankRule
  | ChoiceRule
  | FieldRule
  | RepeatRule
  | Repeat1Rule
  | PatternRule
  | SeqRule
  | StringRule
  | SymbolRule
  | TokenRule
  | PrecRule;

export enum RuleType {
  ALIAS = "ALIAS",
  BLANK = "BLANK",
  CHOICE = "CHOICE",
  FIELD = "FIELD",
  IMMEDIATE_TOKEN = "IMMEDIATE_TOKEN",
  PATTERN = "PATTERN",
  PREC = "PREC",
  PREC_DYNAMIC = "PREC_DYNAMIC",
  PREC_LEFT = "PREC_LEFT",
  PREC_RIGHT = "PREC_RIGHT",
  REPEAT = "REPEAT",
  REPEAT1 = "REPEAT1",
  SEQ = "SEQ",
  STRING = "STRING",
  SYMBOL = "SYMBOL",
  TOKEN = "TOKEN",
}

export interface AliasRule {
  type: RuleType.ALIAS;
  value: string;
  named: boolean;
  content: Rule;
}
export interface BlankRule {
  type: RuleType.BLANK;
}
export interface ChoiceRule {
  type: RuleType.CHOICE;
  members: Rule[];
}
export interface FieldRule {
  name: string;
  type: RuleType.FIELD;
  content: Rule;
}
export interface PatternRule {
  type: RuleType.PATTERN;
  value: string;
}
export interface PrecRule {
  type:
    | RuleType.PREC_DYNAMIC
    | RuleType.PREC_LEFT
    | RuleType.PREC_RIGHT
    | RuleType.PREC;
  value: number;
  content: Rule;
}
export interface RepeatRule {
  type: RuleType.REPEAT;
  content: Rule;
}
export interface Repeat1Rule {
  type: RuleType.REPEAT1;
  content: Rule;
}
export interface SeqRule {
  type: RuleType.SEQ;
  members: Rule[];
}
export interface StringRule {
  type: RuleType.STRING;
  value: string;
}
export interface SymbolRule {
  type: RuleType.SYMBOL;
  name: string;
}
export interface TokenRule {
  type: RuleType.TOKEN | RuleType.IMMEDIATE_TOKEN;
  content: Rule;
}

export interface GrammarSchema {
  /** the name of the grammar */
  name: string;
  rules: {
    [k: string]: Rule;
  };
  /**
   * tokens that may appear anywhere in the language.
   * This is often used for whitespace and comments.
   * The default value of extras is to accept whitespace.
   * To control whitespace explicitly, specify extras: $ => [] in your grammar.
   */
  extras?: Rule[];
  /**
   * An array of arrays of precedence names. Each inner array represents
   * a *descending* ordering. Names listed earlier in one of these arrays
   * have higher precedence than any names listed later in the same array.
   */
  precedences: Array<SymbolRule | StringRule>[];
  /**
   * token names which can be returned by an external scanner.
   * External scanners allow you to write custom C code which runs during the lexing process in order to handle lexical rules (e.g. Python’s indentation tokens) that cannot be described by regular expressions.
   */
  externals?: Array<Rule>;
  /** rule names that should be automatically removed from the grammar by replacing all of their usages with a copy of their definition. This is useful for rules that are used in multiple places but for which you don’t want to create syntax tree nodes at runtime. */
  inline?: string[];
  /**
   * an array of arrays of rule names.
   * Each inner array represents a set of rules that’s involved in an LR(1) conflict that is intended to exist in the grammar.
   * When these conflicts occur at runtime, Tree-sitter will use the GLR algorithm to explore all of the possible interpretations.
   * If multiple parses end up succeeding, Tree-sitter will pick the subtree whose corresponding rule has the highest total dynamic precedence.
   */
  conflicts?: string[][];
  /** the name of a token that will match keywords for the purpose of the keyword extraction optimization. */
  word?: string;
  /** an array of hidden rule names which should be considered to be ‘supertypes’ in the generated node types file. */
  supertypes?: string[];
}
