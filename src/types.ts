// see https://github.com/tree-sitter/tree-sitter/blob/master/cli/src/generate/grammar-schema.json
export type Rule =
  | AliasRule
  | BlankRule
  | ChoiceRule
  | FieldRule
  | Repeat1Rule
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
  TOKEN = "TOKEN"
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
export interface Repeat1Rule {
  type: RuleType.REPEAT1;
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
  name: string;
  rules: {
    [k: string]: Rule;
  };
  extras?: Rule[];
  externals?: Array<Rule>;
  inline?: string[];
  conflicts?: string[][];
  word?: string;
  supertypes?: string[];
}
