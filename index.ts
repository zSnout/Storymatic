import { randomUUID } from "crypto";
import * as grammar from "./grammar.js";
import ohm = require("ohm-js");

let story = grammar as any as grammar.StorymaticGrammar;

let semantics = story.createSemantics();
export function js(text: string) {
  return semantics(story.match(text)).js();
}

interface Node {
  output: string;
  scopedVariables: string[];
  scopes: string[];
  isAsync: boolean;
  isGenerator: boolean;
  toString(this: Node): string;
  trim(this: Node): Node;
  noVars(this: Node): Node;
}

interface PartialNode extends Partial<Node> {
  output: string;
}

function toString(this: Node) {
  return this.output;
}

function trim(this: Node) {
  return createNode(this.output.trim(), this);
}

function noVars(this: Node) {
  return { ...this, scopedVariables: [] };
}

function createNode(options: string | PartialNode, ...parents: Node[]): Node {
  // The type assertion here ensures that the `options` node is included as a standard node.
  if (typeof options == "object") {
    parents.push(options as any);
  } else {
    parents.push({ output: options, scopedVariables: [] } as any);
  }

  let output = typeof options == "string" ? options : options.output;

  return {
    trim,
    noVars,
    toString,
    output,
    isAsync: parents.some((e) => e.isAsync),
    isGenerator: parents.some((e) => e.isGenerator),
    scopedVariables: parents.flatMap((e) => e.scopedVariables || []),
    scopes: parents.flatMap((e) => e.scopes || []),
  };
}

function makeNode(
  strings: TemplateStringsArray,
  ...substitutions: (string | Node)[]
) {
  let text = strings[0];
  text += strings
    .slice(1)
    .map((e, i) => substitutions[i] + e)
    .join("");
  let nodes = substitutions.filter((e): e is Node => typeof e != "string");
  return createNode(text, ...nodes);
}

function createNodes(...nodes: ohm.Node[]) {
  return nodes.map((e) => e.js());
}

function indent(text: string): string;
function indent(node: Node): Node;
function indent(item: string | Node): string | Node;
function indent(item: string | Node): string | Node {
  if (typeof item == "object") return createNode(indent(item.output), item);

  let split = item.split("\n");
  let indented = split
    .slice(1)
    .map((e) => e && "  " + e)
    .join("\n");

  return split[0] + (indented && "\n" + indented);
}

interface Function {
  identifier?: Node;
  type?: FunctionType;
  params?: Node;
  body: Node;
}

const enum FunctionType {
  Function,
  ClassMethod,
  ClassStaticMethod,
  ObjectMethod,
}

interface Scope {
  vars: Set<string>;
  contains: string[];
}

let scopeMap: Record<string, Scope> = Object.create(null);

function scopeVars(node: Node) {
  let uuid = randomUUID();
  let scope: Scope = {
    vars: new Set(node.scopedVariables.sort()),
    contains: node.scopes,
  };

  scopeMap[uuid] = scope;
  return createNode({
    output: `%${uuid}%`,
    scopes: [uuid, ...node.scopes],
  });
}

function makeFunction({ identifier, type, params, body }: Function): Node {
  if (!type) type = FunctionType.Function;

  // Remove wrapping block of functions
  let output = body.output
    .split("\n")
    .slice(1, -1)
    .map((e) => e.slice(2))
    .join("\n");

  let async = body.isAsync ? "async " : "";
  let gen = body.isGenerator ? "*" : "";

  let self = "";
  if (type == FunctionType.ClassMethod) self = "let $self = this;\n  ";
  else if (type == FunctionType.ClassStaticMethod)
    self =
      "let $self = Object.create(null, { constructor: { get: () => this } });\n  ";

  let ident = identifier || "";

  if (type == FunctionType.Function) {
    return createNode(
      `${async}function${gen} ${ident}(${params || ""}) {
  ${indent(output).trim()}\n}`,
      body,
      params || ({} as any)
    );
  } else {
    return createNode(
      `${async}${gen}${ident}(${params || ""}) {
  ${self}${indent(output).trim()}\n}`,
      body,
      params || ({} as any)
    );
  }
}

function makeWrappedBlock(node: ohm.Node) {
  let js = node.js();
  let scoped = scopeVars(js);

  return makeNode`{\n  ${scoped}${indent(js).noVars().trim()}\n}\n`;
}

function joinWith(ohm: ohm.Node[], text = ", ") {
  let js = ohm.map((e) => e.js());
  let output = js.map((e) => e.output).join(text);
  return createNode(output, ...js);
}

function sepBy(node: ohm.NonterminalNode, text = ", ") {
  return joinWith(node.asIteration().children, text);
}

let actions: grammar.StorymaticActionDict<Node> = {
  _terminal() {
    return createNode(this.sourceString);
  },
  _iter(...children) {
    let js = children.map((node) => node.js());
    let output = js.map((node) => node.output).join("");
    return createNode(output, ...js);
  },

  Accessor(base, addons) {
    return makeNode`${base.js()}${addons.js()}`;
  },
  AccessorAddon_computed_member_access(_0, node, _1) {
    return makeNode`[${node.js()}]`;
  },
  AccessorAddon_member_access(_0, node) {
    return makeNode`.${node.js()}`;
  },
  AccessorAddon_symbol_access(_0, node) {
    return makeNode`[${node.js()}]`;
  },
  AddExp_addition(nodeA, _, nodeB) {
    let [a, b] = createNodes(nodeA, nodeB);
    return makeNode`${a} + ${b}`;
  },
  AddExp_subtraction(nodeA, _, nodeB) {
    let [a, b] = createNodes(nodeA, nodeB);
    return makeNode`${a} - ${b}`;
  },
  ArrayEntry_spread_operator(_, expr) {
    return makeNode`...${expr.js()}`;
  },
  ArgumentList(node) {
    let js = createNodes(...node.asIteration().children);
    return createNode(js.map((e) => e.output).join(", "), ...js);
  },
  Argument_spread_operator(_, node) {
    return makeNode`...${node.js()}`;
  },
  AssignableWithDefault_with_default(assignable, _, expression) {
    return makeNode`${assignable.js()} = ${expression.js()}`;
  },
  AssignableKeyWithRewrite_rewrite(key, _, assignable) {
    return makeNode`${key.js()}: ${assignable.js()}`;
  },
  Assignable_array(_0, varNodes, _1, _2, spreadNode, _3, _4) {
    let nodes = createNodes(...varNodes.asIteration().children);
    if (spreadNode.sourceString) nodes.push(makeNode`...${spreadNode.js()}`);
    return createNode(`[${nodes.join(", ")}]`, ...nodes);
  },
  Assignable_identifier(identNode) {
    let js = identNode.js();
    return createNode({ output: js.output, scopedVariables: [js.output] }, js);
  },
  Assignable_object(_0, varNodes, _1, _2, spreadNode, _3, _4) {
    let nodes = createNodes(...varNodes.asIteration().children);
    if (spreadNode.sourceString) nodes.push(makeNode`...${spreadNode.js()}`);
    return createNode(`{ ${nodes.join(", ")} }`, ...nodes);
  },
  AssignmentExp_assignment(assignable, _, expression) {
    return makeNode`${assignable.js()} = ${expression.js()}`;
  },
  AssignmentExp_yield(_0, _1, expr) {
    return { ...makeNode`yield ${expr.js()}`, isGenerator: true };
  },
  AssignmentExp_yield_from(_0, _1, _2, _3, expr) {
    return { ...makeNode`yield* ${expr.js()}`, isGenerator: true };
  },
  bigint(_0, _1, _2) {
    return createNode(this.sourceString);
  },
  block_comment(_0, _1, _2) {
    return createNode("");
  },
  boolean(node) {
    return createNode(node.sourceString);
  },
  BlockFunction_no_params(_0, _1, identNode, funcBody) {
    return makeNode`${makeFunction({
      identifier: identNode.js(),
      body: funcBody.js(),
    })}\n`;
  },
  BlockFunction_with_params(
    _0,
    _1,
    identNode,
    _2,
    _3,
    _4,
    paramListNode,
    funcBody
  ) {
    return makeNode`${makeFunction({
      identifier: identNode.js(),
      body: funcBody.js(),
      params: paramListNode.js(),
    })}\n`;
  },
  char(node) {
    return createNode(node.sourceString);
  },
  CaseClause(_0, _1, expr, _2) {
    return makeNode`case ${expr.js()}:`;
  },
  CaseStatement(clauses, blockNode) {
    let block = blockNode.js().trim();
    block.output = block.output.slice(0, -1) + "\n  break;\n}";

    return makeNode`${joinWith(clauses.children, "\n")} ${block}`;
  },
  CatchStatement(_0, _1, ident, _2, _3, _4, block) {
    let js = ident.js();
    return makeNode`catch (${js.output ? js : "$"}) ${block.js()}`;
  },
  ClassCreationExp_class_creation_implied(_0, _1, target, _2, args) {
    return makeNode`new ${target.js()}(${args.js()})`;
  },
  ClassCreationExp_class_creation_no_args(_0, _1, target) {
    return makeNode`new ${target.js()}()`;
  },
  ClassCreationExp_class_creation_symbolic(_0, _1, target, _2, args, _3) {
    return makeNode`new ${target.js()}(${args.js()})`;
  },
  ClassDeclaration(_0, _1, ident, _2, _3, _4, extendsNode, _5, elements, _6) {
    let _extends = extendsNode.sourceString
      ? makeNode` extends ${extendsNode.js()}`
      : "";

    let body = indent(joinWith(elements.children, "\n"));
    return makeNode`class ${ident.js()}${_extends} {\n  ${body}\n}`;
  },
  ClassElement_property(_0, ident, _1, expr, _2) {
    return makeNode`${ident.js()} = ${expr.js()};`;
  },
  ClassElement_static_property(_0, ident, _1, expr, _2) {
    return makeNode`static ${ident.js()} = ${expr.js()}`;
  },
  CompareExp_greater_than(nodeA, _, nodeB) {
    let [a, b] = createNodes(nodeA, nodeB);
    return makeNode`${a} > ${b}`;
  },
  CompareExp_greater_than_equal(nodeA, _, nodeB) {
    let [a, b] = createNodes(nodeA, nodeB);
    return makeNode`${a} >= ${b}`;
  },
  CompareExp_instanceof(nodeA, _0, _1, _2, _3, _4, nodeB) {
    let [a, b] = createNodes(nodeA, nodeB);
    return makeNode`${a} instanceof ${b}`;
  },
  CompareExp_less_than(nodeA, _, nodeB) {
    let [a, b] = createNodes(nodeA, nodeB);
    return makeNode`${a} < ${b}`;
  },
  CompareExp_less_than_equal(nodeA, _, nodeB) {
    let [a, b] = createNodes(nodeA, nodeB);
    return makeNode`${a} <= ${b}`;
  },
  CompareExp_not_instanceof(nodeA, _0, _1, _2, _3, _4, nodeB) {
    let [a, b] = createNodes(nodeA, nodeB);
    return makeNode`!(${a} instanceof ${b})`;
  },
  CompareExp_not_within(nodeA, _0, _1, _2, _3, _4, nodeB) {
    let [a, b] = createNodes(nodeA, nodeB);
    return makeNode`!(${a} in Object(${b}))`;
  },
  CompareExp_within(nodeA, _0, _1, _2, _3, _4, nodeB) {
    let [a, b] = createNodes(nodeA, nodeB);
    return makeNode`${a} in Object(${b})`;
  },
  DefaultStatement(_0, _1, block) {
    return makeNode`default: ${block.js()}`;
  },
  decimalNumber(num) {
    return num.js();
  },
  ElseIfKeyword_elif(_) {
    return createNode("else if");
  },
  ElseIfKeyword_else_if(_0, _1) {
    return createNode("else if");
  },
  ElseIfKeyword_else_unless(_0, _1, _2) {
    return createNode("else unless");
  },
  ElseIfStatement(ifUnless, _, conditionNode, block) {
    let condition: Node;
    if (ifUnless.sourceString == "unless") {
      condition = makeNode`!(${conditionNode.js()})`;
    } else condition = conditionNode.js();

    return makeNode` else if (${condition}) ${block.js().trim()}`;
  },
  ElseStatement(_0, _1, node) {
    return makeNode` else ${node.js().trim()}`;
  },
  EqualityExp_equal_to(nodeA, _, nodeB) {
    let [a, b] = createNodes(nodeA, nodeB);
    return makeNode`${a} === ${b}`;
  },
  EqualityExp_not_equal_to(nodeA, _, nodeB) {
    let [a, b] = createNodes(nodeA, nodeB);
    return makeNode`${a} !== ${b}`;
  },
  ExpExp_exponentiate(nodeA, _, nodeB) {
    let [a, b] = createNodes(nodeA, nodeB);
    return makeNode`${a} ** ${b}`;
  },
  ExportableItemName_rewrite(first, _0, _1, _2, second) {
    return makeNode`${first.js()} as ${second.js()}`;
  },
  equalityExpWords(_0, node, _1) {
    if (node.sourceString == "isnt") return createNode("!=");
    return createNode("==");
  },
  FinallyStatement(_0, _1, node) {
    let js = node.js();
    return makeNode`finally ${js}`;
  },
  FunctionBody_expression(_, node) {
    let js = node.js();
    let body = makeNode`return ${js};`;
    return makeNode`{\n  ${scopeVars(body)}${indent(body).noVars().trim()}\n}`;
  },
  fullNumber(_0, _1, _2, _3, _4, _5, _6) {
    return createNode(this.sourceString);
  },
  hexNumber(_0, _1, _2) {
    return createNode(this.sourceString);
  },
  IfStatement(ifUnless, _0, conditionNode, block, elseifs, elseBlock) {
    let condition: Node;
    if (ifUnless.sourceString == "unless") {
      condition = makeNode`!(${conditionNode.js()})`;
    } else condition = conditionNode.js();

    let node = block.js().trim();
    return makeNode`if (${condition}) ${node}${elseifs.js()}${elseBlock.js()}\n`;
  },
  InlineClassDeclaration(_0, _1, _2, _3, extendsNode, _4, elements, _5) {
    let _extends = extendsNode.sourceString
      ? makeNode` extends ${extendsNode.js()}`
      : "";

    let body = indent(joinWith(elements.children, "\n"));
    return makeNode`class${_extends} {\n  ${body}\n}`;
  },
  InlineFunction_no_params(_0, funcBody) {
    return makeNode`${makeFunction({
      body: funcBody.js(),
    })}`;
  },
  InlineFunction_with_params(_0, _1, _2, _3, paramListNode, funcBody) {
    return makeNode`${makeFunction({
      body: funcBody.js(),
      params: paramListNode.js(),
    })}`;
  },
  ImportableItemName_rewrite(first, _0, _1, _2, second) {
    return makeNode`${first.js()} as ${second.js()}`;
  },
  identifier(node) {
    return node.js();
  },
  identifierNumber(_0, _1, _2) {
    return createNode(this.sourceString);
  },
  identifierWord(node) {
    return createNode(node.sourceString);
  },
  identifierWords(firstWord, _, otherWords) {
    let output = firstWord.sourceString;

    for (let word of otherWords.children) {
      let text = word.sourceString;
      output += text[0].toUpperCase() + text.slice(1);
    }

    return makeNode`${output}`;
  },
  importLocation_filename(filename, _) {
    return makeNode`"${filename.sourceString}"`;
  },
  LiteralExp_array(_0, entries, _1, _2) {
    return makeNode`[${sepBy(entries)}]`;
  },
  LiteralExp_parenthesized(_0, node, _1) {
    let js = node.js();
    return makeNode`(${js})`;
  },
  LiteralExp_object(_0, entries, _1, _2) {
    return makeNode`{\n  ${indent(sepBy(entries, ",\n"))}\n}`;
  },
  LogicalAndExp_logical_and(nodeA, _0, _1, _2, nodeB) {
    let [a, b] = createNodes(nodeA, nodeB);
    return makeNode`${a} && ${b}`;
  },
  LogicalOrExp_logical_nullish_coalescing(nodeA, _, nodeB) {
    let [a, b] = createNodes(nodeA, nodeB);
    return makeNode`${a} ?? ${b}`;
  },
  LogicalOrExp_logical_or(nodeA, _0, _1, _2, nodeB) {
    let [a, b] = createNodes(nodeA, nodeB);
    return makeNode`${a} || ${b}`;
  },
  MemberAccessExp_computed_member_access(target, _0, expr, _1) {
    return makeNode`${target.js()}[${expr.js()}]`;
  },
  MemberAccessExp_function_call(target, _0, args, _1) {
    return makeNode`${target.js()}(${args.js()})`;
  },
  MemberAccessExp_function_call_implied(target, _0, args) {
    return makeNode`${target.js()}(${args.js()})`;
  },
  MemberAccessExp_member_access(target, _0, ident) {
    return makeNode`${target.js()}.${ident.js()}`;
  },
  MemberAccessExp_optional_chaining_computed_member_access(
    target,
    _0,
    _1,
    expr,
    _2
  ) {
    return makeNode`${target.js()}?.[${expr.js()}]`;
  },
  MemberAccessExp_optional_chaining_function_call(target, _0, _1, args, _2) {
    return makeNode`${target.js()}?.(${args.js()})`;
  },
  MemberAccessExp_optional_chaining_member_access(target, _, ident) {
    return makeNode`${target.js()}?.${ident.js()}`;
  },
  MemberAccessExp_optional_chaining_symbol_access(target, _, symbol) {
    return makeNode`${target.js()}?.[${symbol.js()}]`;
  },
  MemberAccessExp_symbol_access(target, _, symbol) {
    return makeNode`${target.js()}[${symbol.js()}]`;
  },
  MethodName_symbol(symbol) {
    return makeNode`[${symbol.js()}]`;
  },
  MethodName_computed_key(_0, expr, _1) {
    return makeNode`[${expr.js()}]`;
  },
  MethodName_computed_string_key(string) {
    return makeNode`[${string.js()}]`;
  },
  MethodName_identifier(ident) {
    return ident.js();
  },
  MethodName_string_key(string) {
    return string.js();
  },
  MethodName_numerical_key(number) {
    return createNode(number.sourceString);
  },
  Method_no_params(_0, _1, type, identNode, funcBody) {
    return makeNode`${makeFunction({
      identifier: identNode.js(),
      body: funcBody.js(),
      type:
        type.sourceString == "@@"
          ? FunctionType.ClassStaticMethod
          : type.sourceString == "@"
          ? FunctionType.ClassMethod
          : FunctionType.ObjectMethod,
    })}\n`;
  },
  Method_with_params(
    _0,
    _1,
    type,
    identNode,
    _3,
    _4,
    _5,
    paramListNode,
    funcBody
  ) {
    return makeNode`${makeFunction({
      identifier: identNode.js(),
      body: funcBody.js(),
      params: paramListNode.js(),
      type:
        type.sourceString == "@@"
          ? FunctionType.ClassStaticMethod
          : type.sourceString == "@"
          ? FunctionType.ClassMethod
          : FunctionType.ObjectMethod,
    })}\n`;
  },
  MulExp_division(nodeA, _, nodeB) {
    let [a, b] = createNodes(nodeA, nodeB);
    return makeNode`${a} / ${b}`;
  },
  MulExp_modulus(nodeA, _, nodeB) {
    let [a, b] = createNodes(nodeA, nodeB);
    return makeNode`${a} % ${b}`;
  },
  MulExp_multiplication(nodeA, _, nodeB) {
    let [a, b] = createNodes(nodeA, nodeB);
    return makeNode`${a} * ${b}`;
  },
  NonAssignableAccessor(base, addons) {
    return makeNode`${base.js()}${addons.js()}`;
  },
  NonCapturingAssignable_array(_0, varNodes, _1, _2, spreadNode, _3, _4) {
    let nodes = createNodes(...varNodes.asIteration().children);
    if (spreadNode.sourceString) nodes.push(makeNode`...${spreadNode.js()}`);
    return createNode(`[${nodes.join(", ")}]`, ...nodes);
  },
  NonCapturingAssignable_object(_0, varNodes, _1, _2, spreadNode, _3, _4) {
    let nodes = createNodes(...varNodes.asIteration().children);
    if (spreadNode.sourceString) nodes.push(makeNode`...${spreadNode.js()}`);
    return createNode(`{ ${nodes.join(", ")} }`, ...nodes);
  },
  NonEmptyArgumentList(node) {
    let js = createNodes(...node.asIteration().children);
    return createNode(js.map((e) => e.output).join(", "), ...js);
  },
  NotExp_await(_0, _1, node) {
    let js = node.js();
    return createNode({ output: `await ${js}`, isAsync: true }, js);
  },
  NotExp_logical_not_symbolic(_0, node) {
    let js = node.js();
    return makeNode`!${js}`;
  },
  NotExp_logical_not_worded(_0, _1, node) {
    let js = node.js();
    return makeNode`!${js}`;
  },
  NotExp_typeof(_0, _1, _2, node) {
    let js = node.js();
    return makeNode`typeof ${js}`;
  },
  NotExp_unary_minus(_0, node) {
    let js = node.js();
    return makeNode`-${js}`;
  },
  NotExp_unary_plus(_0, node) {
    let js = node.js();
    return makeNode`+${js}`;
  },
  number(node) {
    return createNode(node.sourceString);
  },
  ObjectEntry_key_value(key, _, value) {
    return makeNode`${key.js()}: ${value.js()}`;
  },
  ObjectEntry_object_method(method) {
    return method.js().trim();
  },
  ObjectEntry_object_method_with_self(method) {
    return method.js().trim();
  },
  ObjectEntry_restructure(ident) {
    return ident.js();
  },
  ObjectEntry_spread_operator(_, expr) {
    return makeNode`...${expr.js()}`;
  },
  ParameterList(node, _) {
    return sepBy(node);
  },
  Parameter_rest_operator(_, node) {
    return makeNode`...${node.js()}`;
  },
  Property_computed(_0, _1, node, _2) {
    return makeNode`$self[${node.js()}]`;
  },
  Property_identifier(_, node) {
    return makeNode`$self.${node.js()}`;
  },
  Property_symbol(_, node) {
    return makeNode`$self[${node.js()}]`;
  },
  Script(node) {
    scopeMap = Object.create(null);

    let js = node.js();
    let output = js.output;

    output = scopeVars(js) + output;

    if (js.isAsync) {
      output += `\nexport {};`;
    }

    if (js.isGenerator) {
      output = `throw new SyntaxError('Yield statements may not appear in the top level of a script.');`;
    }

    for (let uuid in scopeMap) {
      let scope = scopeMap[uuid];

      // prettier-ignore
      for (let ident of scope.vars)
        for (let uuid of scope.contains)
          scopeMap[uuid].vars.delete(ident);
    }

    for (let uuid in scopeMap) {
      let vars = [...scopeMap[uuid].vars];
      let regex = new RegExp(`( *)(%${uuid}%)`);

      if (vars.length) {
        output = output.replace(regex, (text) => {
          let space = text.split("%")[0];
          return `${space}let ${vars.join(", ")};\n${space}`;
        });
      } else {
        output = output.replace(`%${uuid}%`, "");
      }
    }

    scopeMap = Object.create(null);
    return createNode(`"use strict";\n${output}`);
  },
  SingleStatementBlock_single_statement(_0, _1, statementNode) {
    return makeWrappedBlock(statementNode);
  },
  StatementBlock_statements(node) {
    let nodes = createNodes(...node.children);
    return createNode(nodes.map((e) => e.output).join("\n"), ...nodes);
  },
  Statement_await_new_thread(_0, _1, identNode, _2, exprNode, statementNode) {
    let [ident, expr] = createNodes(identNode, exprNode);
    let statement = statementNode.js();
    let func: Function = {
      body: statement,
      params: ident,
    };

    let funcNode = makeFunction(func);

    return createNode(
      `(async function ($expr) {
  ${indent(`(${funcNode})(await $expr);\n`)}})(${expr});`,
      funcNode
    );
  },
  Statement_expression(node, _) {
    let js = node.js();

    if (
      js.output.startsWith("{") ||
      js.output.startsWith("function") ||
      js.output.startsWith("class")
    ) {
      return makeNode`(${js});`;
    } else return makeNode`${js};`;
  },
  Statement_break(_0, _1) {
    return createNode("break;");
  },
  Statement_continue(_0, _1) {
    return createNode("continue;");
  },
  Statement_do_until(_0, _1, block, _2, _3, _4, expr, _5) {
    return makeNode`do ${block.js()} while (!(${expr.js()}))`;
  },
  Statement_do_while(_0, _1, block, _2, _3, _4, expr, _5) {
    return makeNode`do ${block.js()} while (${expr.js()})`;
  },
  Statement_empty_export(_0, _1) {
    return makeNode`export {};`;
  },
  Statement_empty_import(_0, _1, filename, _2) {
    return makeNode`import ${filename.js()};`;
  },
  Statement_export(_0, _1, exports, _2) {
    return makeNode`export { ${sepBy(exports)} };`;
  },
  Statement_export_all_from(_0, _1, _2, _3, filename, _4) {
    return makeNode`export * from ${filename.js()};`;
  },
  Statement_export_class(_0, _1, block) {
    return makeNode`export ${block.js()}`;
  },
  Statement_export_default(_0, _1, expr, _2) {
    return makeNode`export default ${expr.js()};`;
  },
  Statement_export_from(_0, _1, exports, _2, _3, _4, filename, _5) {
    return makeNode`export { ${sepBy(exports)} } from ${filename.js()};`;
  },
  Statement_export_function(_0, _1, block) {
    return makeNode`export ${block.js()}`;
  },
  Statement_export_variable(_0, _1, expr) {
    return makeNode`export let ${expr.js()};`;
  },
  Statement_for_await_of(_0, _1, _2, _3, assignable, _4, _5, _6, expr, block) {
    let node = makeNode`for await (let ${assignable.js()} of ${expr.js()}) ${block.js()}`;
    return { ...node, isAsync: true };
  },
  Statement_for_in(_0, _1, assignable, _2, _3, _4, expression, block) {
    return makeNode`for (let ${assignable.js()} in ${expression.js()}) ${block.js()}`;
  },
  Statement_for_of(_0, _1, assignable, _2, _3, _4, expression, block) {
    return makeNode`for (let ${assignable.js()} of ${expression.js()}) ${block.js()}`;
  },
  Statement_for_range(
    _0,
    _1,
    identNode,
    _2,
    _3,
    _4,
    fromNode,
    _5,
    down,
    _6,
    toThrough,
    _7,
    toNode,
    _8,
    _9,
    _10,
    stepNode,
    block
  ) {
    let ident = identNode.js();
    let isDown = down.sourceString.startsWith(" down");

    let to: Node | string = toNode.js();
    if (!to.output) to = isDown ? "-Infinity" : "Infinity";

    let from: Node | string = fromNode.js();
    if (!from.output) from = "0";

    let step: Node | string = stepNode.js();
    if (!step.output) step = "1";

    let condition = toThrough.sourceString.startsWith(" through")
      ? isDown
        ? makeNode`${ident.output} >= ${to}`
        : makeNode`${ident} <= ${to}`
      : isDown
      ? makeNode`${ident.output} > ${to}`
      : makeNode`${ident.output} < ${to}`;

    let dir = isDown ? "-" : "+";

    return makeNode`for (let ${ident} = ${from}; ${condition}; ${ident} ${dir}= ${step}) ${block.js()}`;
  },
  Statement_import(_0, _1, imports, _2, _3, _4, filename, _5) {
    return makeNode`import { ${sepBy(imports)} } from ${filename.js()};`;
  },
  Statement_import_all(_0, _1, _2, _3, ident, _4, _5, _6, filename, _7) {
    return makeNode`import * as ${ident.js()} from ${filename.js()};`;
  },
  Statement_import_default(_0, _1, ident, _2, _3, _4, filename, _5) {
    return makeNode`import ${ident.js()} from ${filename.js()};`;
  },
  Statement_print(_0, _1, expr, _2) {
    return makeNode`console.log(${expr.js()});`;
  },
  Statement_repeat(_0, _1, expr, block) {
    return makeNode`for (let $ = 0; $ < ${expr.js()}; $++) ${block.js()}`;
  },
  Statement_rescope(_0, _1, idents, _2) {
    return makeNode`let ${sepBy(idents)};`;
  },
  Statement_rescope_assign(_0, _1, declaration, _2) {
    return makeNode`let ${declaration.js()};`;
  },
  Statement_return(_0, _1, expr, _2) {
    return makeNode`return ${expr.js()}`;
  },
  Statement_throw(_0, _1, expr, _2) {
    return makeNode`throw ${expr.js()};`;
  },
  Statement_until(_0, _1, expr, block) {
    return makeNode`while (!(${expr.js()})) ${block.js()}`;
  },
  Statement_when_callback(_0, _1, targetNode, _2, _3, _4, params, block) {
    let js = targetNode.js();
    let func = makeFunction({
      body: block.js(),
      params: params.js(),
    });

    if (js.output.endsWith(")")) {
      js.output = `${js.output.slice(0, -1)}, ${func.output});`;
    } else js.output += `(${func.output});`;

    return createNode(js, func);
  },
  Statement_while(_0, _1, expr, block) {
    return makeNode`while (${expr.js()}) ${block.js()}`;
  },
  StaticProperty_computed(_0, _1, node, _2) {
    return makeNode`$self.constructor[${node.js()}]`;
  },
  StaticProperty_identifier(_, node) {
    return makeNode`$self.constructor.${node.js()}`;
  },
  StaticProperty_symbol(_, node) {
    return makeNode`$self.constructor[${node.js()}]`;
  },
  SwitchStatement(_0, _1, expr, _2, cases, defaultNode, _3) {
    let js = joinWith(cases.children.concat(defaultNode.children), "\n");
    return makeNode`switch (${expr.js()}) {\n  ${indent(js)}\n}`;
  },
  string_bit_character(char) {
    if (char.sourceString == "$") return createNode("\\$");
    if (char.sourceString == "\n") return createNode("\\n");
    if (char.sourceString == "\r") return createNode("\\r");
    return createNode(char.sourceString);
  },
  string_bit_escape(_0, _1) {
    return createNode(this.sourceString);
  },
  string_bit_escape_sequence(_0, _1) {
    return createNode(this.sourceString);
  },
  string_bit_hex_sequence(_0, _1, _2) {
    return createNode(this.sourceString);
  },
  string_bit_unicode_code_point_sequence(_0, _1, _2) {
    return createNode(this.sourceString);
  },
  string_bit_unicode_sequence(_0, _1, _2, _3, _4) {
    return createNode(this.sourceString);
  },
  string_full(delim, bits, _) {
    return createNode(`${delim.sourceString}${bits.js()}${delim.sourceString}`);
  },
  string_interpolatable(_0, bits, _1) {
    return createNode(`\`${bits.js()}\``);
  },
  string_interpolatable_bit_interpolated(_0, expr, _1) {
    return createNode(`\${${expr.js()}}`);
  },
  SymbolKey_computed(_0, node, _1) {
    return node.js();
  },
  SymbolKey_string(node) {
    return node.js();
  },
  SymbolKey_name(node) {
    return makeNode`"${node.js()}"`;
  },
  Symbol_builtin_symbol(_, node) {
    return makeNode`Symbol[${node.js()}]`;
  },
  Symbol_symbol_for(_, node) {
    return makeNode`Symbol.for(${node.js()})`;
  },
  TernaryExp_symbolic(conditionNode, _0, trueNode, _1, falseNode) {
    let condition = conditionNode.js();
    let [ifTrue, ifFalse] = createNodes(trueNode, falseNode);

    return makeNode`${condition} ? ${ifTrue} : ${ifFalse}`;
  },
  TryStatement(_0, _1, block, catchNode, finallyNode) {
    let _try = block.js().trim();
    let _catch = catchNode.js().trim();
    let _finally = finallyNode.js().trim();

    if (_catch.output && _finally.output) {
      return makeNode`try ${_try} ${_catch} ${_finally}\n`;
    } else if (_catch.output) {
      return makeNode`try ${_try} ${_catch}\n`;
    } else if (_finally.output) {
      return makeNode`try ${_try} ${_finally}\n`;
    } else {
      return makeNode`try ${_try} catch ($) {}\n`;
    }
  },
  unitNumber(num, unit) {
    return makeNode`${unit.js()}({ number: ${num.js()}, string: "${num.js()}" })`;
  },
  UnprefixedSingleStatementBlock_single_statement(statementNode) {
    return makeWrappedBlock(statementNode);
  },
  VariableAssignment(assignable, _, expr) {
    return makeNode`${assignable.js()} = ${expr.js()}`;
  },
  whitespace(_) {
    return createNode(" ");
  },
  word(_0, _1, _2) {
    return createNode(this.sourceString);
  },
  WrappedStatementBlock(_0, node, _1) {
    return makeWrappedBlock(node);
  },
};

semantics.addOperation<Node>("js", actions);

type SMNode = Node;

declare module "ohm-js" {
  export interface Node {
    js(): SMNode;
    asIteration(): ohm.IterationNode;
  }
}

declare module "./grammar.js" {
  export interface StorymaticDict {
    js(): SMNode;
  }

  export interface StorymaticSemantics {
    (match: ohm.MatchResult): StorymaticDict;
  }
}

export { story, semantics };
