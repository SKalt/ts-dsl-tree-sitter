import { RuleOrLiteral, Rule, normalize, isRule, validName } from "./rules";
import { RuleType, GrammarSchema } from "../types";
// needed to distinguish the "Rule" types from ./rules and ./types
type Namespace = Record<string, any>;
type Fn<Arg, Result> = (arg: Arg, namespace: Namespace, log: Error[]) => Result;

const checkThat =
  <T>(check: Fn<T, boolean>, errorMessage: Fn<T, string>): Fn<T, boolean> =>
  (arg, namespace, errors) => {
    if (check(arg, namespace, errors)) return true;
    else {
      log(errors)(errorMessage(arg, namespace, errors));
      return false;
    }
  };

const checkArray = (ctx: string) =>
  checkThat(
    (arg) => Array.isArray(arg),
    () => `invalid ${ctx}: must be an array`
  );

const fallback =
  <I, O>(revertTo: O, check: Fn<I, boolean>, fn: Fn<I, O>): Fn<I, O> =>
  (arg, ...params) =>
    check(arg, ...params) ? fn(arg, ...params) : revertTo;

const validSymbolName: Fn<any, boolean> = checkThat(
  validName,
  (name) => `invalid symbol name '${name}': should match /^[a-zA-Z_]\\w*/`
);

const log = (errors: Error[]) => (msg: string) => errors.push(new Error(msg));

const canBeUndefined =
  <Arg, Result>(fallback: Result) =>
  (fn: Fn<Arg, Result>): Fn<any, Result> =>
  (arg, namespace, errors) =>
    arg ? fn(arg, namespace, errors) : fallback;

const shouldBeAnArray = <R>(context: string, to: R, fn: Fn<any[], R>) =>
  fallback(to, checkArray(context), fn);

const shouldBeAnObject = <R>(context: string, to: R, fn: Fn<Namespace, R>) =>
  fallback(
    to,
    checkThat(
      (arg) => typeof arg === "object" && !Array.isArray(arg),
      () => `${context} must be an object`
    ),
    fn
  );

const validateName = (context: string) =>
  checkThat<any>(validName, (name) => `invalid name in ${context}: '${name}'`);

const normalizable: Fn<any, Rule | false> = (arg, _, errors) => {
  try {
    return normalize(arg);
  } catch (e) {
    log(errors)(String(e));
    return false;
  }
};

const shouldCheckNamespace =
  (fn: Fn<string, any>): Fn<Rule, any> =>
  (rule, ...params) => {
    if (rule.type === RuleType.ALIAS) return fn(rule.value, ...params);
    if (rule.type === RuleType.SYMBOL) return fn(rule.name, ...params);
    return;
  };

const nameInNamespace = (context: string): Fn<string, boolean> =>
  checkThat(
    (name, namespace) => name in namespace,
    (name) => `invalid ${context}: name '${name}' not in namespace`
  );

const nameNotInNamespace: Fn<string, boolean> = checkThat(
  (name, namespace) => !(name in namespace),
  (name) => `name ${name} has already been declared in the namespace`
);

const validateNameMatch = (rule: Rule, name: string, errors: Error[]) => {
  if (rule.type !== RuleType.SYMBOL) return true;
  if (rule.name === name) return true;
  else {
    log(errors)(`mismatched external rule names '${name}' and ${rule.name}`);
    return false;
  }
};

const validateExternals = shouldBeAnObject(
  "externals",
  [] as Rule[],
  (externals, namespace, errors) => {
    const results: Rule[] = [];
    Object.entries(externals).forEach(([name, raw]) => {
      let rule = normalizable(raw, namespace, errors);
      if (isRule(rule) && validateNameMatch(rule, name, errors)) {
        results.push(rule);
        namespace[name] = "externals";
        shouldCheckNamespace(nameInNamespace)(rule, namespace, errors);
      }
    });
    return results;
  }
);

const findAllSymbols = (r: Rule, symbols: Set<string> = new Set()) => {
  if (r.type == "SYMBOL") symbols.add(r.name);
  let children = "members" in r ? r.members : "content" in r ? [r.content] : [];
  children.forEach((r) => findAllSymbols(r, symbols));
  return symbols;
};

const validateRules: Fn<any, GrammarSchema["rules"]> = shouldBeAnObject(
  "rules",
  {} as Record<string, Rule>,
  (rules, namespace, errors) => {
    const results: Record<string, Rule> = {};
    let allSymbolicReferences = new Set<string>();
    Object.entries(rules).forEach(([name, raw]) => {
      if (typeof raw !== "function")
        log(errors)(`rule must be a function, was ${raw}`);
      else {
        let rule = normalizable(raw(), namespace, errors);
        if (isRule(rule)) {
          allSymbolicReferences = findAllSymbols(rule, allSymbolicReferences);
          results[name] = rule;
          namespace[name] = "rule";
        }
      }
    });
    allSymbolicReferences.forEach((ref) =>
      nameInNamespace("rules")(ref, namespace, errors)
    );
    return results;
  }
);

const validateInlines = canBeUndefined<any, string[]>([])(
  shouldBeAnArray("inline", [] as string[], (inlines, ...params) => {
    const results = inlines.filter((name) => validSymbolName(name, ...params));
    results.forEach((name) => nameInNamespace("inline")(name, ...params));
    return results;
  })
);

const validateSupertypes = canBeUndefined<any, string[]>([])(
  shouldBeAnArray("supertypes", [] as string[], (supertypes, ...params) => {
    const results = supertypes.filter((name): name is string =>
      validSymbolName(name, ...params)
    );
    results.forEach((name) => nameInNamespace("supertype")(name, ...params));
    return results;
  })
);
/** by default, only whitespace are extras */
const validateExtras = canBeUndefined<any, Rule[]>([normalize(/\s/)])(
  shouldBeAnArray("extras", [] as Rule[], (extras, namespace, errors) => {
    const results: Rule[] = extras
      .map((extra) => normalizable(extra, namespace, errors))
      .filter((extra): extra is Rule => isRule(extra));
    results.forEach((rule) =>
      shouldCheckNamespace(nameNotInNamespace)(rule, namespace, errors)
    );
    return results.length === 0 ? [normalize(/s/)] : results;
  })
);

const validateConflicts = canBeUndefined<any, string[][]>([])(
  shouldBeAnArray("conflicts", [] as string[][], (conflicts, ...params) => {
    const isArray = checkArray("conflict");
    const atLeastTwoLong = checkThat<any[]>(
      (conflict) => conflict.length >= 2,
      (conflict) => `invalid conflict ${conflict} of length ${conflict.length}`
    );

    return conflicts
      .filter((conflict): conflict is any[] => isArray(conflict, ...params))
      .map((conflict) =>
        conflict.filter(
          (name): name is string =>
            validateName("conflict")(name, ...params) &&
            nameInNamespace("conflict")(name, ...params)
        )
      )
      .filter((conflict) => atLeastTwoLong(conflict, ...params));
  })
);

const validateWord: Fn<any, string | undefined> = (word, ...params) => {
  if (word === undefined) return word;
  if (!validateName("word")(word, ...params)) return;
  if (typeof word === "string") {
    if (nameInNamespace("word")(word, ...params)) return word;
    return;
  } else {
    log(params[1])(`invalid word: ${word}`);
  }
};

export function grammar<
  E extends Record<string, RuleOrLiteral> = {},
  R extends {
    [K in keyof R]: K extends keyof E ? never : () => RuleOrLiteral;
  } = {},
  NameInNamespace extends keyof R | keyof E = keyof R | keyof E
>(options: {
  name: string;
  externals?: E;
  rules: R;
  word?: string;
  supertypes?: Array<NameInNamespace>;
  inline?: Array<NameInNamespace>;
  extras?: RuleOrLiteral[];
  conflicts?: Array<Array<NameInNamespace>>;
}): GrammarSchema {
  const params: [Namespace, Error[]] = [{}, []],
    [, errors] = params;

  const result: GrammarSchema = {
    name: validateName("name")(options.name, ...params)
      ? options.name
      : "INVALID",
    externals: validateExternals(options.externals || {}, ...params),
    rules: validateRules(options.rules, ...params),
    inline: validateInlines(options.inline, ...params),
    extras: validateExtras(options.extras, ...params),
    precedences: [], // TODO: add precedences
    conflicts: validateConflicts(options.conflicts, ...params),
    word: validateWord(options.word, ...params),
    supertypes: validateSupertypes(options.supertypes, ...params),
  };
  if (errors.length) console.error(`${errors.length} errors:`, ...errors);
  // re-validate that all symbols are defined:
  return result;
}
