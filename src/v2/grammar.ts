


const processExternals = (
  externals: any,
  baseGrammarExternals?: concrete.Rule[] = [],
  validationErrors
) => {};

const processRules = (rules: any, baseGrammarRules: {[key: string]: concrete.Rule }, errors: Error[]): [any, Error[]] => {
  if (typeof rules !== "object") {
    return [{}, [...errors, new Error(`Invalid rules: ${rules}`)]]
  }
  const result = {...baseGrammarRules};
  Object.entries(rules).map(([name, rule]) => {
    if (typeof(name) === "string" && (/^[a-zA-Z_]\w*$/.test(name)) {
      // ok name
      try {

        return concretize(rule)
      }
    } else if () {

    } else {
      errors.push(new Error(`invalid rule name '${name}'`));
    }
  }).reduce((rules, [name, rule]))
  return [rules, errors];
};

const processExtras = (
  extras: any,
  baseGrammarExtras?: concrete.Rule[],
  validationErrors: Error[]
) => {};

const processWord = () => {};
const processConflicts = () => {};
const processInline = () => {};
// const processExtras//

export function grammar(
  options: { name: string; externals, rules: { [name: string]: Rule } },
  baseGrammar? = {}
): concrete.GrammarSchema {
  if (typeof options !== "object") {
    // return
  }
  let validationErrors: Error[] = [];
  let name: string, rules: { [key: string]: concrete.Rule }, extras: concrete.GrammarSchema["extras"]
  [name, validationErrors] = processName(options.name, validationErrors);
  [rules, validationErrors] = processRules(options.rules, baseGrammar.rules, validationErrors);
  [external, validationErrors] = processExternals(options.external)
  [extras, validationErrors] = processExtras(options.extras, validationErrors)

  return {
    name,
    rules
  };
  // TODO: externals
  // TODO: name
  // TODO: rules
  // TODO: extras
  // TODO: word
  // TODO: conflicts
  // TODO: inline
  // TODO: supertypes
  // TODO: error handling ...
}