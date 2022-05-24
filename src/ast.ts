import { Node } from "ohm-js";
import * as ts from "typescript";
import * as grammar from "./grammar.js";
import { semantics } from "./semantics.js";

function indent(
  text: TemplateStringsArray,
  ...subs: (string | Node)[]
): string {
  return (
    text[0] +
    text
      .slice(1)
      .map((e, i) => {
        let el: string | Node = subs[i];

        return indentText(typeof el === "object" ? el.tree() : el) + e;
      })
      .join("")
  );
}

function optional(node: string | Node) {
  if (typeof node === "object") {
    node = node.tree();
  }

  if (!node) {
    return "";
  }

  return "\n" + node;
}

function indentText(text: string) {
  let split = text.split("\n");
  let indented = split.map((e) => "  " + e);

  return split.length > 1
    ? split[0] + "\n" + indented.slice(1).join("\n")
    : split[0];
}

function namespace(name: string, node: string | Node) {
  if (typeof node === "object") {
    node = node.tree();
  }

  if (!node) {
    return "";
  }

  return indent`${name}\n  ${node}`;
}

function modify(name: string, node: string | Node) {
  if (typeof node === "object") {
    node = node.tree();
  }

  if (!node) {
    return "";
  }

  let lines = node.split("\n");

  if (lines.length === 1) {
    return `${lines[0]}\n  [${name}]`;
  } else if (lines[1][2] === "[") {
    return `${lines[0]}\n  [${name}, ${lines[1].slice(3)}\
${optional(lines.slice(2).join("\n"))}`;
  } else {
    return `${lines[0]}\n  [${name}]${optional(lines.slice(1).join("\n"))}`;
  }
}

function syntaxKind(kind: number) {
  for (let key in ts.SyntaxKind) {
    if (ts.SyntaxKind[key as keyof typeof ts.SyntaxKind] === kind) {
      return key;
    }
  }

  return "UnknownSyntaxKind";
}

/**
 * Creates an abstract syntax tree from a TypeScript node.
 * @param node The TypeScript node to create a tree from.
 * @returns A string representing the TypeScript node in AST form.
 */
export function typescriptAST(node: ts.Node): string {
  let output = "";
  node.forEachChild((node) => {
    output = output ? `${output}\n${typescriptAST(node)}` : typescriptAST(node);
  });

  if (!output && "text" in node) {
    return namespace(syntaxKind(node.kind), "" + (node as any).text);
  } else if (!output) {
    return syntaxKind(node.kind);
  } else {
    return namespace(syntaxKind(node.kind), output);
  }
}

semantics.addOperation<string>("tree", {
  Accessor(base, addons) {
    return indent`Accessor
  ${base}
  ${addons}`;
  },
  AccessorAddon(node) {
    return node.tree();
  },
  AccessorAddon_computed_member_access(_0, expr, _1) {
    return indent`ComputedMember\n  ${expr}`;
  },
  AccessorAddon_member_access(_0, name) {
    return indent`Property ${name.sourceString}`;
  },
  AddExp(node) {
    return node.tree();
  },
  AddExp_addition(left, _, right) {
    return indent`Addition\n  ${left}\n  ${right}`;
  },
  AddExp_subtraction(left, _, right) {
    return indent`Subtraction\n  ${left}\n  ${right}`;
  },
  Argument(node) {
    return node.tree();
  },
  ArgumentList(node) {
    return node.sourceString && indent`Arguments${optional(node)}`;
  },
  Argument_spread_operator(_, node) {
    return indent`Spread\n  ${node}`;
  },
  ArrayEntry(node) {
    return node.tree();
  },
  ArrayEntry_spread_operator(_, node) {
    return indent`Spread\n  ${node}`;
  },
  Assignable(node) {
    return node.tree();
  },
  AssignableKeyWithRewrite(node) {
    return node.tree();
  },
  AssignableKeyWithRewrite_rewrite(name, _, rewrite) {
    return indent`PropertyRename\n  ${name}\n  ${rewrite}`;
  },
  AssignableOrAccessor(node) {
    return node.tree();
  },
  AssignableWithDefault(node) {
    return node.tree();
  },
  AssignableWithDefault_with_default(assignable, _, expr) {
    return indent`WithDefault\n  ${assignable}\n  ${expr}`;
  },
  Assignable_array(_0, members, _1, _2, rest, _3, _4) {
    return indent`DestructuredIterable\
  ${optional(members)}${optional(namespace("Rest", rest))}`;
  },
  Assignable_identifier(node) {
    return node.tree();
  },
  Assignable_object(_0, members, _1, _2, rest, _3, _4) {
    return indent`DestructuredObject\
${optional(members)}${optional(namespace("Rest", rest))}`;
  },
  AssignmentExp(node) {
    return node.tree();
  },
  AssignmentExp_assignment(assignable, _, expr) {
    return indent`Assignment =\n  ${assignable}\n  ${expr}`;
  },
  AssignmentExp_splice(accessor, _0, start, dots, end, _1, _2, expr) {
    let range = `${start.tree()}
${dots.sourceString === "..." ? "Through" : "To"}\
${optional(end.tree())}`.trimStart();

    return indent`ArraySplice
  ${accessor}
  ${namespace("Range", range)}
  ${expr}`;
  },
  AssignmentExp_update_assignment(accessor, op, expr) {
    return indent`Assignment ${op.sourceString
      .replace("and", "&&")
      .replace("or", "||")}
  ${accessor}
  ${expr}`;
  },
  AssignmentExp_yield(_0, _1, expr) {
    return indent`Yield\n  ${expr}`;
  },
  AssignmentExp_yield_from(_0, _1, _2, _3, expr) {
    return indent`YieldFrom\n  ${expr}`;
  },
  alnum(_) {
    return "Alnum";
  },
  applySyntactic(node) {
    return node.tree();
  },
  BitwiseExp(node) {
    return node.tree();
  },
  BitwiseExp_left_shift(left, _, right) {
    return indent`LeftShift\n  ${left}\n  ${right}`;
  },
  BitwiseExp_right_shift(left, _, right) {
    return indent`RightShift\n  ${left}\n  ${right}`;
  },
  BitwiseExp_unsigned_right_shift(left, _, right) {
    return indent`UnsignedRightShift\n  ${left}\n  ${right}`;
  },
  bigint(_0, _1, _2) {
    return indent`BigInt ${this.sourceString}`;
  },
  block_comment(_0, _1, _2) {
    return "BlockComment";
  },
  boolean(value) {
    if ("true yes on".split(" ").includes(value.sourceString)) {
      return "True";
    } else {
      return "False";
    }
  },
  CaseClause(_0, _1, expr, _2) {
    return expr.tree();
  },
  CaseStatement(clauses, block) {
    return indent`CaseBlock\n  ${namespace("Clauses", clauses)}\n  ${block}`;
  },
  CaseTerminator(_) {
    return "CaseTerminator";
  },
  CaseTerminator_final(_) {
    return "CaseTerminator";
  },
  CaseTerminator_terminator(_) {
    return "CaseTerminator";
  },
  CatchStatement(_0, _1, ident, block) {
    if (ident.sourceString) {
      return indent`CatchStatement ${ident.tree().slice(11)}${optional(block)}`;
    } else {
      return indent`CatchStatement${optional(block)}`;
    }
  },
  ClassDeclaration(
    _export,
    _0,
    _1,
    _2,
    ident,
    generics,
    _3,
    _4,
    _5,
    extendable,
    _6,
    _7,
    _8,
    implemented,
    _9,
    members,
    _10
  ) {
    return indent`ClassDeclaration ${ident.tree().slice(11)}\
${optional(_export.sourceString && "[Exported]")}\
${optional(generics)}\
${optional(namespace("Extends", extendable))}\
${optional(namespace("Implements", implemented))}\
${optional(members)}`;
  },
  ClassElement(node) {
    return node.tree();
  },
  ClassElement_index_signature(signature, _) {
    return signature.tree();
  },
  ClassElement_method(node) {
    return node.tree();
  },
  ClassElement_property(node, _) {
    return node.tree();
  },
  ClassElement_static_index_signature(node, _) {
    return modify("Static", node.tree());
  },
  ClassElement_static_method(node) {
    return node.tree();
  },
  ClassElement_static_property(node, _) {
    return node.tree();
  },
  ClassProperty(privacy, readonly, _0, prefix, name, mark, _1, type, _2, init) {
    let prop = indent`Property\n  ${name}\
${optional(namespace("Type", type))}\
${optional(namespace("Initializer", init))}`;

    if (mark.sourceString === "?") prop = modify("Optional", prop);
    if (mark.sourceString === "!") prop = modify("DefinitelyAssigned", prop);
    if (readonly.sourceString) prop = modify("Readonly", prop);
    if (prefix.sourceString === "@") prop = modify("Static", prop);
    if (privacy.sourceString) prop = modify(privacy.tree(), prop);

    return prop;
  },
  CompareExp(primary, ops, exps) {
    if (ops.numChildren === 0) {
      return primary.tree();
    }

    if (ops.numChildren === 1) {
      return indent`Comparison
  ${primary}
  ${ops.child(0)}
  ${exps.child(0)}`;
    }

    return (
      indent`Comparison\n  [Chained]\n  ${primary}` +
      ops.children
        .map((op, i) => indent`\n  ${op}\n  ${exps.child(i)}`)
        .join("")
    );
  },
  ConditionalType(node) {
    return node.tree();
  },
  ConditionalType_conditional(target, _0, _1, mustBe, _2, ifTrue, _3, ifFalse) {
    return indent`ConditionalType\n  ${target}\n  ${mustBe}\n  ${ifTrue}\n  ${ifFalse}`;
  },
  ConditionalType_if_then_else(
    ifUnless,
    _0,
    target,
    _1,
    _2,
    mustBe,
    _3,
    _4,
    ifTrue,
    _5,
    _6,
    ifFalse
  ) {
    return indent`ConditionalType\
${optional(ifUnless.sourceString === "unless" ? "[Unless]" : "")}
  ${target}\n  ${mustBe}\n  ${ifTrue}\n  ${ifFalse}`;
  },
  char(_) {
    return "Char";
  },
  colonTerminator(_) {
    return "ColonTerminator";
  },
  colonTerminator_colon(_0, _1) {
    return "ColonTerminator";
  },
  comparisonOperator(op) {
    return indent`Operator ${op}`;
  },
  comparisonOperator_equal_to(_) {
    return "===";
  },
  comparisonOperator_greater_than(_) {
    return ">";
  },
  comparisonOperator_greater_than_equal(_) {
    return ">=";
  },
  comparisonOperator_in(_0, _1) {
    return "in";
  },
  comparisonOperator_instanceof(_) {
    return "instanceof";
  },
  comparisonOperator_less_than(_) {
    return "<";
  },
  comparisonOperator_less_than_equal(_) {
    return "<=";
  },
  comparisonOperator_not_equal_to(_) {
    return "!==";
  },
  DefaultStatement(_0, _1, block) {
    return namespace("DefaultBlock", block);
  },
  decimalNumber(node) {
    return node.tree();
  },
  dedent(_) {
    return "DedentMarker";
  },
  digit(_) {
    return "Digit";
  },
  EmptyListOf() {
    return "";
  },
  Exportable(type, _0, left, _1, _2, _3, right) {
    if (right.sourceString) {
      return indent`ExportSpecifier\
${optional(type.sourceString && "[TypeOnly]")}
  Identifier ${left.sourceString}
  Identifier ${right.child(0).sourceString}`;
    } else {
      return indent`ExportSpecifier\
${optional(type.sourceString && "[TypeOnly]")}
  Identifier ${left.sourceString}`;
    }
  },
  EnumMember(node) {
    return node.tree();
  },
  EnumMember_assigned(prop, _0, expr, _1) {
    return indent`Assignment =\n  Identifier ${prop.sourceString}\n  ${expr}`;
  },
  EnumMember_auto_assign(prop, _) {
    return indent`Identifier ${prop.sourceString}`;
  },
  EnumStatement(_export, _0, _1, _2, name, _3, members, _4) {
    return indent`Enum ${name.tree().slice(11)}\
${optional(_export.sourceString && "[Exported]")}\
${optional(members)}`;
  },
  ExpExp(node) {
    return node.tree();
  },
  ExpExp_exponentiate(left, _, right) {
    return indent`Exponentiation\n  ${left}\n  ${right}`;
  },
  ExportedVariableAssignment(_0, _1, assignable, _2, type, _3, expr) {
    return indent`Assignment =
  [Exported${type.sourceString && ", Typed"}]
  ${assignable}${optional(type)}
  ${expr}`;
  },
  Expression(node) {
    return node.tree();
  },
  Extendable(ident, _0, props, generics, _1) {
    let text = ident.tree();

    for (let prop of props.children) {
      text = indent`PropertyAccess\n  ${text}\n  Identifier ${prop.sourceString}`;
    }

    return indent`${text}\n${generics}`;
  },
  emptyListOf() {
    return "";
  },
  expressionTerminator(_) {
    return "ExpressionTerminator";
  },
  expressionTerminator_comma(_0, _1) {
    return "ExpressionTerminator";
  },
  FinallyStatement(_0, _1, block) {
    return indent`FinallyStatement${optional(block)}`;
  },
  ForExp(node) {
    return node.tree();
  },
  ForExp_for(
    expr,
    _0,
    _1,
    _await,
    _2,
    assignable,
    _3,
    _4,
    iterable,
    _5,
    _6,
    guard
  ) {
    let text = indent`Comprehension
  ${assignable.child(0)?.tree() || "[ValueIsntCaptured]"}
  ${iterable}
  ${expr}${optional(namespace("Guard", guard))}`;

    if (guard.sourceString) text = modify("HasGuard", text);
    if (_await.sourceString) text = modify("Async", text);

    return text;
  },
  Function(generics, _0, params, _1, _2, returnType, arrow, body) {
    return indent`Function\
${optional(arrow.sourceString === "=>" ? "[Bound]" : "")}\
${optional(generics)}\
${optional(params)}\
${optional(returnType)}\
${optional(body)}`;
  },
  FunctionBody(node) {
    return node.tree();
  },
  FunctionBody_expression(expr) {
    return namespace("ConciseBody", expr);
  },
  FunctionReturnType(node) {
    return namespace("ReturnType", node);
  },
  FunctionReturnType_predicate(asserts, _0, param, _1, _2, type) {
    return indent`TypePredicate\
${optional(asserts.sourceString && "[Assertion]")}
  ${param}
  ${type}`;
  },
  FunctionType(generics, _0, params, _1, _2, returnType) {
    return indent`FunctionType\
  ${optional(generics)}\
  ${optional(params)}\
  ${optional(returnType)}`;
  },
  fullNumber(_0, _1, _2, _3, _4, _5, _6) {
    return indent`Number ${this.sourceString}`;
  },
  GenericTypeArgumentList(node) {
    return node.tree();
  },
  GenericTypeArgumentList_empty() {
    return "";
  },
  GenericTypeArgumentList_with_args(node) {
    return node.tree();
  },
  GenericTypeParameter(node) {
    return node.tree();
  },
  GenericTypeParameter_indented(ident, _0, _1, constraint, _2, _default, _3) {
    return indent`TypeParameter ${ident.tree().slice(11)}\
${optional(namespace("Constraint", constraint))}\
${optional(namespace("Default", _default))}`;
  },
  GenericTypeParameter_parameter(ident, _0, constraint, _1, _default) {
    return indent`TypeParameter ${ident.tree().slice(11)}\
${optional(namespace("Constraint", constraint))}\
${optional(namespace("Default", _default))}`;
  },
  GenericTypeParameterList(_0, params, _1) {
    return indent`TypeParameters\n  ${params}`;
  },
  hexDigit(_) {
    return "HexDigit";
  },
  hexNumber(_0, _1, _2, _3, _4) {
    return indent`HexNumber ${this.sourceString}`;
  },
  IfExp(node) {
    return node.tree();
  },
  IfExp_if(expr, ifUnless, _, condition) {
    return indent`IfExpression\
${optional(ifUnless.sourceString === "unless" ? "[Inverted]" : "")}
  ${condition}
  ${expr}`;
  },
  IfStatement(ifUnless, _0, condition, block, _1, _2, elseBlock) {
    return (
      indent`IfStatement\
${optional(ifUnless.sourceString === "unless" ? "[Inverted]" : "")}
  ${condition}
  ${block}` + optional(namespace("ElseStatement", elseBlock))
    );
  },
  IfType(node) {
    return node.tree();
  },
  IfType_if(type, ifUnless, _0, target, _1, _2, condition) {
    let text = indent`IfType\n  ${target}\n  ${condition}\n  ${type}`;
    if (ifUnless.sourceString === "unless") text = modify("Inverted", text);

    return text;
  },
  Implementable(ident, _0, props, generics, _1) {
    let text = ident.tree();

    for (let prop of props.children) {
      text = indent`PropertyAccess\n  ${text}\n  Identifier ${prop.sourceString}`;
    }

    if (!generics.sourceString) return text;
    return indent`ExpressionWithTypeArguments\n  ${text}\n  ${generics}`;
  },
  ImpliedCallArgumentList(node) {
    return indent`Arguments${optional(node)}`;
  },
  Importable(type, _0, left, _1, _2, _3, right) {
    if (right.sourceString) {
      return indent`ImportSpecifier\
${optional(type.sourceString && "[TypeOnly]")}
  Identifier ${left.sourceString}
  Identifier ${right.child(0).sourceString}`;
    } else {
      return indent`ImportSpecifier\
${optional(type.sourceString && "[TypeOnly]")}
  Identifier ${left.sourceString}`;
    }
  },
  Indented(_0, node, _1) {
    return node.tree();
  },
  IndexSignatureType(readonly, _0, _1, name, _2, key, _3, _4, type) {
    return indent`IndexSignature ${name.tree().slice(11)}\
${optional(readonly.sourceString && "[Readonly]")}
  ${key}
  ${type}`;
  },
  InlineClassDeclaration(
    _0,
    generics,
    _1,
    _2,
    _3,
    extendable,
    _4,
    _5,
    _6,
    implemented,
    _7,
    members,
    _8
  ) {
    return indent`ClassExpression\
${optional(generics)}\
${optional(namespace("Extends", extendable))}\
${optional(namespace("Implements", implemented))}\
${optional(members)}`;
  },
  InterfaceDeclaration(
    _export,
    _0,
    _1,
    _2,
    ident,
    generics,
    _3,
    _4,
    _5,
    extended,
    _6,
    members,
    _7
  ) {
    return indent`InterfaceDeclaration ${ident.tree().slice(11)}\
${optional(_export.sourceString && "[Exported]")}\
${optional(generics)}\
${optional(namespace("Extends", extended))}\
${optional(members)}`;
  },
  IntersectionType(node) {
    let iter = node.asIteration();

    if (iter.numChildren === 1) {
      return iter.child(0).tree();
    }

    return indent`Intersection\n  ${node}`;
  },
  identifier(node) {
    return indent`Identifier ${node.sourceString}`;
  },
  id_continue(_) {
    return "IdContinue";
  },
  importLocation(node) {
    return node.tree().slice(7);
  },
  importLocation_filename(bits, _) {
    return indent`String "${bits.sourceString}"`;
  },
  indent(_) {
    return "IndentMarker";
  },
  JSXAttribute(node) {
    return node.tree();
  },
  JSXAttributeKey(node) {
    return node.sourceString;
  },
  JSXAttribute_spread_attributes(_0, _1, expr, _2) {
    return indent`JSXAttribute\n  [Spread]\n  ${expr}`;
  },
  JSXAttribute_value_computed_string(name, _, expr) {
    return indent`JSXAttribute ${name}\n  [Computed]\n  ${expr}`;
  },
  JSXAttribute_value_expression(name, _0, _1, expr, _2) {
    return indent`JSXAttribute ${name}\n  [Computed]\n  ${expr}`;
  },
  JSXAttribute_value_true(name) {
    return indent`JSXAttribute ${name}\n  [Implied]\n  True`;
  },
  JSXChild(node) {
    return node.tree();
  },
  JSXChild_interpolation(_0, dots, expr, _1) {
    if (dots.sourceString) {
      return namespace("Spread", expr);
    }

    return expr.tree();
  },
  JSXElement(node) {
    return node.tree();
  },
  JSXElement_open_close(
    _0,
    name,
    generics,
    attributes,
    _1,
    children,
    _2,
    _3,
    _4
  ) {
    return indent`JSXElement ${name.sourceString}\
${optional(generics)}\
${optional(attributes)}\
${optional(children)}`;
  },
  JSXElement_self_closing(_0, name, generics, attributes, _1, _2) {
    return indent`JSXElement ${name.sourceString}
  [SelfClosing]\
${optional(generics)}\
${optional(attributes)}`;
  },
  jsxTagName(_) {
    return indent`JSXTagName ${this.sourceString}`;
  },
  jsxTagName_property_access(_0, _1, _2) {
    return indent`JSXTagName ${this.sourceString}`;
  },
  jsxTagName_standard(_0) {
    return indent`JSXTagName ${this.sourceString}`;
  },
  jsx_string(node) {
    let text = node.sourceString
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[⇦⇨]/g, "")
      .replace(/"/g, '\\"');

    return indent`"${text}"`;
  },
  ListOf(node) {
    return node.asIteration().tree();
  },
  LiteralExp(node) {
    return node.tree();
  },
  LiteralExp_array(_0, elements, _1, _2) {
    return indent`Array${optional(elements)}`;
  },
  LiteralExp_do(_, expr) {
    return namespace("Do", expr);
  },
  LiteralExp_object(_0, members, _1, _2) {
    return indent`Object${optional(members)}`;
  },
  LiteralExp_object_implied(members) {
    return indent`Object\n  [Implied]${optional(members)}`;
  },
  LiteralExp_parenthesized(_0, expr, _1) {
    return indent`Parenthesized\n  ${expr}`;
  },
  LiteralExp_self(_) {
    return "This";
  },
  LiteralExp_statement(node) {
    return namespace("EmbeddedStatement", node.tree());
  },
  LiteralExp_topic_token(_) {
    return "TopicToken";
  },
  LiteralExp_with(_0, _1, self, block) {
    return indent`With\n  ${self}\n  ${block}`;
  },
  LiteralType(node) {
    return node.tree();
  },
  LiteralType_construct(_, node) {
    return node.tree().replace("FunctionType", "ConstructType");
  },
  LiteralType_infer(_0, _1, ident, _2, _3, constraint) {
    return indent`Infer ${ident.tree().slice(11)}\
${optional(namespace("Constraint", constraint))}`;
  },
  LiteralType_parenthesized(_0, node, _1) {
    return namespace("Parenthesized", node);
  },
  LiteralType_type_args(name, generics) {
    return indent`TypeReference\n  ${name}\n  ${generics}`;
  },
  LiteralType_typeof(_0, _1, node) {
    return namespace("Typeof", node);
  },
  LogicalAndExp(node) {
    return node.tree();
  },
  LogicalAndExp_logical_and(left, _0, _1, _2, right) {
    return indent`LogicalAnd\n  ${left}\n  ${right}`;
  },
  LogicalOrExp(node) {
    return node.tree();
  },
  LogicalOrExp_logical_nullish_coalescing(left, _, right) {
    return indent`NullishCoalescing\n  ${left}\n  ${right}`;
  },
  LogicalOrExp_logical_or(left, _0, _1, _2, right) {
    return indent`LogicalOr\n  ${left}\n  ${right}`;
  },
  letter(_) {
    return "Letter";
  },
  lineBreak(_0, _1) {
    return "LineBreak";
  },
  line_comment(_0, _1) {
    return "LineComment";
  },
  listOf(node) {
    return node.asIteration().tree();
  },
  MappedType(node) {
    return node.tree();
  },
  MappedType_mapped(
    _0,
    readPlusMinus,
    readKeyword,
    _1,
    ident,
    _2,
    keys,
    _3,
    asClause,
    _4,
    qMarkPlusMinus,
    qMark,
    _5,
    type,
    _6
  ) {
    let text = indent`MappedType ${ident.tree().slice(11)}
  ${keys}${optional(asClause)}\n  ${type}`;

    if (asClause.sourceString) text = modify("HasAsClause", text);

    if (qMarkPlusMinus.child(0)?.child(0)?.sourceString === "-") {
      text = modify("NonOptional", text);
    } else if (qMark.child(0)) {
      text = modify("Optional", text);
    }

    if (readPlusMinus.child(0)?.child(0)?.sourceString === "-") {
      text = modify("NonReadonly", text);
    } else if (readKeyword.child(0)) {
      text = modify("Readonly", text);
    }

    return text;
  },
  MemberAccessExp(node) {
    return node.tree();
  },
  MemberAccessExpNonCall(node) {
    return node.tree();
  },
  MemberAccessExpNonCall_array_slice(target, qMark, _0, start, dots, end, _1) {
    let range = `${start.tree()}
${dots.sourceString === "..." ? "Through" : "To"}\
${optional(end.tree())}`.trimStart();

    return indent`ArraySlice${optional(qMark.sourceString && "[Chain]")}
  ${target}
  ${namespace("Range", range)}`;
  },
  MemberAccessExpNonCall_as_expression(expr, _0, _1, type) {
    return indent`TypeAssertion\n  ${expr}\n  ${type}`;
  },
  MemberAccessExpNonCall_class_creation_implied(_0, _1, target, _2, args) {
    return indent`ClassCreation\n  ${target}\n  ${args}`;
  },
  MemberAccessExpNonCall_class_creation_no_args(_0, _1, target) {
    return indent`ClassCreation\n  ${target}`;
  },
  MemberAccessExpNonCall_class_creation_symbolic(
    _0,
    _1,
    target,
    generics,
    _2,
    args,
    _3
  ) {
    return indent`ClassCreation\n  ${target}\
${optional(generics)}${optional(args)}`;
  },
  MemberAccessExpNonCall_computed_member_access(target, qMark, _0, prop, _1) {
    return indent`MemberAccess${optional(qMark.sourceString && "[Chain]")}
  ${target}
  ${prop}`;
  },
  MemberAccessExpNonCall_member_access(target, _, prop) {
    return indent`PropertyAccess\n  ${target}\n  Identifier ${prop.sourceString}`;
  },
  MemberAccessExpNonCall_member_access_indented(target, _0, _1, prop, _2) {
    return indent`PropertyAccess\n  ${target}\n  Identifier ${prop.sourceString}`;
  },
  MemberAccessExpNonCall_non_null_assertion(target, _) {
    return indent`NonNullAssertion\n  ${target}`;
  },
  MemberAccessExpNonCall_optional_chaining_member_access(target, _, prop) {
    return indent`PropertyAccess\n  [Chain]\n  ${target}\n  Identifier ${prop.sourceString}`;
  },
  MemberAccessExpNonCall_optional_chaining_member_access_indented(
    target,
    _0,
    _1,
    prop,
    _2
  ) {
    return indent`PropertyAccess\n  [Chain]\n  ${target}\n  Identifier ${prop.sourceString}`;
  },
  MemberAccessExpNonCall_tagged_template_literal(fn, string) {
    return indent`TaggedTemplateLiteral\n  ${fn}\n  ${string}`;
  },
  MemberAccessExp_function_call(target, generics, _0, args, _1) {
    return indent`FunctionCall\n  ${target}\
${optional(generics)}${optional(args)}`;
  },
  MemberAccessExp_implied_call(target, _, args) {
    return indent`FunctionCall\n  ${target}${optional(args)}`;
  },
  MemberAccessExp_optional_chaining_function_call(
    target,
    _,
    generics,
    _0,
    args,
    _1
  ) {
    return indent`FunctionCall\n  [Chain]\n  ${target}\
${optional(generics)}${optional(args)}`;
  },
  MemberAccessType(node) {
    return node.tree();
  },
  MemberAccessType_array(node, _0, _1) {
    return indent`ArrayOf\n  ${node}`;
  },
  MemberAccessType_keyof(_, node) {
    return indent`Keyof\n  ${node}`;
  },
  MemberAccessType_member_access(target, _0, prop, _1) {
    return indent`MemberAccess\n  ${target}\n  ${prop}`;
  },
  MemberAccessType_named_tuple(_0, members, _1, _2) {
    return indent`Tuple\n  [Named]\n  ${members}`;
  },
  MemberAccessType_object(_0, members, _1, _2) {
    return indent`ObjectType\n  ${members}`;
  },
  MemberAccessType_object_implied(members) {
    return indent`ObjectType\n  [Implied]\n  ${members}`;
  },
  MemberAccessType_readonly(_, node) {
    return indent`Readonly\n  ${node}`;
  },
  MemberAccessType_tuple(_0, members, _1, _2) {
    return indent`Tuple\n  ${members}`;
  },
  Method(privacy, prefix, name, qMark, fn) {
    let prop = indent`Method\n  ${name}\n  ${fn}`;

    if (qMark.sourceString === "?") prop = modify("Optional", prop);
    if (prefix.sourceString === "@") prop = modify("Static", prop);
    if (privacy.sourceString) prop = modify(privacy.tree(), prop);

    return prop;
  },
  MethodName(node) {
    return node.tree();
  },
  MethodName_computed_key(_0, node, _1) {
    return node.tree();
  },
  MethodName_computed_string_key(node) {
    return node.tree();
  },
  MethodName_identifier(ident) {
    return indent`Property ${ident.sourceString}`;
  },
  MethodName_numerical_key(node) {
    return node.tree();
  },
  MulExp(node) {
    return node.tree();
  },
  MulExp_division(left, _, right) {
    return indent`Division\n  ${left}\n  ${right}`;
  },
  MulExp_modulus(left, _, right) {
    return indent`Modulus\n  ${left}\n  ${right}`;
  },
  MulExp_multiplication(left, _, right) {
    return indent`Multiplication\n  ${left}\n  ${right}`;
  },
  NamedTupleElement(node) {
    return node.tree();
  },
  NamedTupleElement_spread_operator(_0, name, _1, expr) {
    return indent`NamedElement ${name.tree().slice(11)}
  ${namespace("Spread", expr)}`;
  },
  NamedTupleElement_name_value(name, qMark, _, expr) {
    let text = qMark.sourceString ? namespace("Optional", expr) : expr.tree();
    return indent`NamedElement ${name.tree().slice(11)}\n  ${text}`;
  },
  NamespaceDeclaration(_export, _0, _1, _2, name, block) {
    return indent`Namespace ${name.tree().slice(11)}\
${optional(_export.sourceString && "[Exported]")}\
${optional(block)}`;
  },
  NCMemberAccessExp(node) {
    return node.tree();
  },
  NonLoopExpression(node) {
    return node.tree();
  },
  NonLoopType(node) {
    return node.tree();
  },
  NonemptyGenericTypeArgumentList(_0, args, _1) {
    return indent`TypeArguments\n  ${args}`;
  },
  NonemptyListOf(_0, _1, _2) {
    return this.asIteration().tree();
  },
  NotExp(node) {
    return node.tree();
  },
  NotExp_await(_0, _1, node) {
    return indent`Await\n  ${node}`;
  },
  NotExp_logical_not_symbolic(_, node) {
    return indent`Not\n  ${node}`;
  },
  NotExp_logical_not_worded(_0, _1, node) {
    return indent`Not\n  ${node}`;
  },
  NotExp_prefix_decrement(_, node) {
    return indent`Decrement\n  ${node}`;
  },
  NotExp_prefix_increment(_, node) {
    return indent`Increment\n  ${node}`;
  },
  NotExp_typeof(_0, _1, _2, node) {
    return indent`Typeof\n  ${node}`;
  },
  NotExp_unary_minus(_, node) {
    return indent`UnaryMinus\n  ${node}`;
  },
  NotExp_unary_plus(_, node) {
    return indent`UnaryPlus\n  ${node}`;
  },
  nonemptyListOf(_0, _1, _2) {
    return this.asIteration().tree();
  },
  null(_) {
    return "Null";
  },
  number(_0, _1, _2) {
    return this.sourceString;
  },
  ObjectEntry(node) {
    return node.tree();
  },
  ObjectEntry_implied(key, _, value) {
    return indent`Property\n  ${key}\n  ${value}`;
  },
  ObjectEntry_key_value(key, _, value) {
    return indent`Property\n  ${key}\n  ${value}`;
  },
  ObjectEntry_object_method(name, fn) {
    return fn.tree().replace("Function", indent`Method\n  ${name}`);
  },
  ObjectEntry_restructure(node) {
    return indent`Property\n  [Shorthand]\n  ${node}`;
  },
  ObjectEntry_spread_operator(_, node) {
    return indent`Spread\n  ${node}`;
  },
  Parameter(node) {
    return node.tree();
  },
  ParameterList(node) {
    return node.tree();
  },
  ParameterList_params(params, _, rest) {
    return indent`Parameters\n  ${params}${optional(rest)}`;
  },
  ParameterList_rest_params(rest) {
    return namespace("Parameters", rest);
  },
  Parameter_assignable(assignable) {
    return namespace("Parameter", assignable);
  },
  Parameter_initializer(assignable, _0, type, _1, expr) {
    return indent`Parameter
  ${assignable}${optional(namespace("Type", type))}
  ${namespace("Initializer", expr)}`;
  },
  Parameter_type(assignable, qMark, _, type) {
    return indent`Parameter${optional(qMark.sourceString && "[Optional]")}
  ${assignable}
  ${namespace("Type", type)}`;
  },
  PipeExp(node) {
    return node.tree();
  },
  PipeExp_pipe(pipes, _, last) {
    return indent`Pipe\n  ${pipes}\n  ${last}`;
  },
  PostfixExp(node) {
    return node.tree();
  },
  PostfixExp_decrement(accessor, _) {
    return namespace("Decrement", accessor);
  },
  PostfixExp_increment(accessor, _) {
    return namespace("Increment", accessor);
  },
  PrimitiveType(node) {
    return indent`PrimitiveType ${node.sourceString}`;
  },
  PrivacyLevel(node) {
    return node.tree();
  },
  PrivacyLevel_none() {
    return "";
  },
  PrivacyLevel_private(_0, _1) {
    return "Private";
  },
  PrivacyLevel_protected(_0, _1) {
    return "Protected";
  },
  PrivacyLevel_public(_0, _1) {
    return "Public";
  },
  Property(node) {
    return node.tree();
  },
  Property_computed(_0, _1, expr, _2) {
    return namespace("ThisProperty", expr);
  },
  Property_identifier(_0, node) {
    return indent`ThisProperty ${node.sourceString}`;
  },
  postWord(_) {
    return "PostWord";
  },
  QualifiedName(base, _, qualifiers) {
    let text = base.tree();

    for (let qualifier of qualifiers.children) {
      text = indent`PropertyAccess\n  ${text}\n  Property ${qualifier.sourceString}`;
    }

    return text;
  },
  Rescopable(node) {
    return node.tree();
  },
  Rescopable_identifier(ident) {
    return indent`Rescopable ${ident.tree().slice(11)}`;
  },
  Rescopable_with_type(ident, _, type) {
    return indent`Rescopable ${ident.tree().slice(11)}\n  ${type}`;
  },
  RestParameter(node) {
    return node.tree();
  },
  RestParameter_with_type(_0, assignable, _1, type) {
    return indent`Parameter
  [Rest]
  ${assignable}
  ${namespace("Type", type)}`;
  },
  RestParameter_without_type(_, assignable) {
    return indent`Parameter\n  [Rest]\n  ${assignable}`;
  },
  reserved(_) {
    return "ReservedWord";
  },
  reserved_block(_) {
    return "ReservedWord";
  },
  reserved_inline(_) {
    return "ReservedWord";
  },
  reserved_javascript(_) {
    return "ReservedWord";
  },
  reserved_operators(_) {
    return "ReservedWord";
  },
  reserved_primitive(_) {
    return "ReservedWord";
  },
  Script(statements) {
    return indent`Script${optional(statements)}`;
  },
  SingleStatementBlock(node) {
    return node.tree();
  },
  SingleStatementBlock_single_statement(_0, _1, statement) {
    return indent`StatementBlock\n  ${statement}`;
  },
  Statement(node) {
    return node.tree();
  },
  Statement_expression(expr, _) {
    return expr.tree();
  },
  Statement_for(_0, _1, _await, _2, assignable, _3, _4, iterable, block) {
    let text = indent`ForLoop
  ${assignable.child(0)?.tree() || "[ValueIsntCaptured]"}
  ${iterable}
  ${block}`;

    if (_await.sourceString) text = modify("Async", text);

    return text;
  },
  Statement_rescope(_0, _1, rescopables, _2) {
    return indent`Rescope\n  ${rescopables}`;
  },
  Statement_rescope_assign(_0, _1, assignment, _2) {
    return assignment.tree().replace("Assignment =", "Rescope");
  },
  Statement_typed_assignment(node) {
    return node.tree();
  },
  Statement_while(whileUntil, _0, condition, block) {
    let text = indent`WhileStatement\n  ${condition}\n  ${block}`;
    if (whileUntil.sourceString === "until") text = modify("Inverted", text);

    return text;
  },
  SwitchStatement(_0, _1, target, _2, cases, _default, _3) {
    return indent`SwitchStatement
  ${namespace("Target", target)}${optional(cases)}${optional(_default)}`;
  },
  sign(sign) {
    return indent`Sign ${sign.sourceString}`;
  },
  space(_) {
    return "Whitespace";
  },
  statementTerminator(_) {
    return "StatementTerminator";
  },
  statementTerminator_semicolon(_0, _1) {
    return "StatementTerminator";
  },
  string_bit(_) {
    let char = this.sourceString;
    if (char === "\n") char = "\\n";
    if (char === "\r") char = "\\r";
    if (char === "⇦" || char === "⇨") char = "";

    return char;
  },
  string_bit_character(_) {
    let char = this.sourceString;
    if (char === "\n") char = "\\n";
    if (char === "\r") char = "\\r";
    if (char === "⇦" || char === "⇨") char = "";

    return char;
  },
  string_bit_escape(_0, _1) {
    return this.sourceString;
  },
  string_bit_escape_sequence(_0, _1) {
    return this.sourceString;
  },
  string_bit_hex_sequence(_0, _1, _2) {
    return this.sourceString;
  },
  string_bit_unicode_code_point_sequence(_0, _1, _2) {
    return this.sourceString;
  },
  string_bit_unicode_sequence(_0, _1, _2, _3, _4) {
    return this.sourceString;
  },
  string_full(delim, bits, _) {
    return indent`${delim}${bits.children
      .map((e) => e.tree())
      .join("")}${delim}`;
  },
  string_interpolatable(delim, head, _0, spans, _1) {
    return (
      (head.sourceString && indent`${head}`.replace(/⇨/g, delim.sourceString)) +
      spans.children
        .map((x) => optional(x))
        .map((x) => x.replace(/⇨/g, delim.sourceString))
        .join("")
    ).trimStart();
  },
  string_interpolatable_head(bits) {
    return (
      bits.sourceString &&
      indent`⇨${bits.children.map((x) => x.tree()).join("")}⇨`
    );
  },
  string_interpolatable_span(_0, expr, _1, bits, _2) {
    return (
      expr.tree() +
      optional(
        bits.sourceString &&
          indent`⇨${bits.children.map((x) => x.tree()).join("")}⇨`
      )
    );
  },
  string(node) {
    return indent`String${optional(node)}`;
  },
  string_non_interpolatable(node) {
    return indent`String ${node}`;
  },
  string_type(node) {
    return indent`TemplateLiteral${optional(node)}`;
  },
  TernaryExp(node) {
    return node.tree();
  },
  TernaryExp_if_then_else(
    ifUnless,
    _0,
    condition,
    _1,
    _2,
    ifTrue,
    _3,
    _4,
    ifFalse
  ) {
    return indent`Conditional\
${optional(ifUnless.sourceString === "unless" ? "[Unless]" : "")}
  ${condition}\n  ${ifTrue}\n  ${ifFalse}`;
  },
  TernaryExp_symbolic(condition, _0, ifTrue, _1, ifFalse) {
    return indent`Conditional\n  ${condition}\n  ${ifTrue}\n  ${ifFalse}`;
  },
  TopLevelExp(node) {
    return node.tree();
  },
  TopLevelExp_break(_) {
    return "Break";
  },
  TopLevelExp_continue(_) {
    return "Continue";
  },
  TopLevelExp_expression(node) {
    return indent`Expression\n  ${node}`;
  },
  TopLevelExp_return(_0, _1, expr) {
    return indent`Return${optional(expr)}`;
  },
  TopLevelExp_throw(_0, _1, expr) {
    return indent`Throw\n  ${expr}`;
  },
  TopLevelForExp(node) {
    return node.tree();
  },
  TopLevelForExp_for(
    expr,
    _0,
    _1,
    _await,
    _2,
    assignable,
    _3,
    _4,
    iterable,
    _5,
    _6,
    guard
  ) {
    let text = indent`ForLoop
  ${assignable.child(0)?.tree() || "[ValueIsntCaptured]"}
  ${iterable}
  ${expr}${optional(namespace("Guard", guard))}`;

    if (guard.sourceString) text = modify("HasGuard", text);
    if (_await.sourceString) text = modify("Async", text);

    return text;
  },
  TopLevelIfExp(node) {
    return node.tree();
  },
  TopLevelIfExp_if(expr, ifUnless, _, condition) {
    return indent`IfStatement\
${optional(ifUnless.sourceString === "unless" ? "[Inverted]" : "")}
  ${condition}
  ${expr}`;
  },
  TopLevelWhileExp(node) {
    return node.tree();
  },
  TopLevelWhileExp_while(expr, whileUntil, _0, condition, _1, _2, guard) {
    let text = indent`WhileStatement\n  ${condition}\n  ${expr}\
${optional(guard)}`;

    if (guard.sourceString) text = modify("HasGuard", text);
    if (whileUntil.sourceString === "until") text = modify("Inverted", text);

    return text;
  },
  TopLevelStatement(node) {
    return node.tree();
  },
  TopLevelStatement_empty_export(_0, _1) {
    return indent`Export`;
  },
  TopLevelStatement_empty_import(_0, _1, loc, _2) {
    return indent`ImportFrom ${loc}`;
  },
  TopLevelStatement_export(_0, _1, type, _2, specifiers, _3, _4) {
    return indent`Export\
${optional(type.sourceString && "[TypeOnly]")}\
${optional(specifiers)}`;
  },
  TopLevelStatement_export_all_from(_0, _1, _2, _3, loc, _4) {
    return indent`ExportFrom ${loc}\n  [ExportAll]`;
  },
  TopLevelStatement_export_default(_0, _1, _2, _3, expr, _4) {
    return indent`ExportDefault\n  ${expr}`;
  },
  TopLevelStatement_export_from(
    _0,
    _1,
    type,
    _2,
    specifiers,
    _3,
    _4,
    _5,
    loc,
    _6
  ) {
    return indent`ExportFrom ${loc}\
${optional(type.sourceString && "[TypeOnly]")}\
${optional(specifiers)}`;
  },
  TopLevelStatement_export_variable(node, _) {
    return node.tree();
  },
  TopLevelStatement_import(_0, _1, type, _2, specifiers, _3, _4, _5, loc, _6) {
    return indent`ImportFrom ${loc}\
${optional(type.sourceString && "[TypeOnly]")}\
${optional(specifiers)}`;
  },
  TopLevelStatement_import_all(_0, _1, _2, _3, ns, _4, _5, loc, _6) {
    return indent`ImportFrom ${loc}
  [ImportAll]${optional(ns)}`;
  },
  TopLevelStatement_import_default(
    _0,
    _1,
    type,
    _2,
    ident,
    _3,
    _4,
    _5,
    loc,
    _6
  ) {
    return indent`ImportDefaultFrom ${loc}\
${optional(type.sourceString && "[TypeOnly]")}
  ${ident}`;
  },
  TryStatement(_0, _1, block, _catch, _finally) {
    // We use a different syntax so that "return `" doesn't match this.
    // "return `" is used to search for non-indented template literals.

    return (
      `TryStatement\n  ${indentText(block.tree())}` +
      `${optional(_catch)}${optional(_finally)}`
    );
  },
  TupleElement(node) {
    return node.tree();
  },
  TupleElement_spread_operator(_0, expr) {
    return namespace("Spread", expr);
  },
  TupleElement_value(expr, qMark) {
    if (qMark.sourceString) {
      return namespace("Optional", expr);
    }

    return expr.tree();
  },
  Type(node) {
    return node.tree();
  },
  TypeDeclaration(_export, _0, _1, _2, ident, generics, _3, type, _4) {
    return indent`TypeDeclaration ${ident.tree().slice(11)}\
${optional(_export.sourceString && "[Exported]")}\
${optional(generics)}\n  ${type}`;
  },
  TypeObjectEntry(node) {
    return node.tree();
  },
  TypeObjectEntry_call_signature(node) {
    return node.tree().replace("FunctionType", "CallSignature");
  },
  TypeObjectEntry_construct_signature(_, node) {
    return node.tree().replace("FunctionType", "ConstructSignature");
  },
  TypeObjectEntry_implied(readonly, _0, name, qMark, _1, type) {
    let text = indent`Property\n  ${name}\n  ${type}`;

    if (qMark.sourceString) text = modify("Optional", text);
    if (readonly.sourceString) text = modify("Readonly", text);

    return text;
  },
  TypeObjectEntry_key_value(readonly, _0, name, qMark, _1, type) {
    let text = indent`Property\n  ${name}\n  ${type}`;

    if (qMark.sourceString) text = modify("Optional", text);
    if (readonly.sourceString) text = modify("Readonly", text);

    return text;
  },
  TypeObjectEntry_method(name, qMark, node) {
    let text = node.tree().replace("FunctionType", indent`Method\n  ${name}`);

    if (qMark.sourceString) {
      text = modify("Optional", name);
    }

    return text;
  },
  TypeObjectKey(node) {
    return node.tree();
  },
  TypeObjectKey_computed_accessor(_0, node, _1) {
    return node.tree();
  },
  TypeObjectKey_identifier(node) {
    return indent`Property ${node.sourceString}`;
  },
  TypeObjectKey_numerical_key(node) {
    return node.tree();
  },
  TypeObjectKey_string(node) {
    return node.tree();
  },
  TypedVariableAssignment(assignable, _0, type, _1, expr) {
    return indent`Assignment =\n  [Declaration, Typed]\n  ${assignable}\n  ${type}\n  ${expr}`;
  },
  terminator(_0, _1) {
    return "Terminator";
  },
  typeTerminator(_) {
    return "TypeTerminator";
  },
  typeTerminator_comma(_0, _1) {
    return "TypeTerminator";
  },
  typeTerminator_semicolon(_0, _1) {
    return "TypeTerminator";
  },
  UnionType(node) {
    let iter = node.asIteration();

    if (iter.numChildren === 1) {
      return iter.child(0).tree();
    }

    return indent`Union\n  ${node}`;
  },
  UnprefixedSingleStatementBlock(node) {
    return node.tree();
  },
  UnprefixedSingleStatementBlock_single_statement(statement) {
    return indent`StatementBlock\n  ${statement}`;
  },
  undefined(_) {
    return "Undefined";
  },
  unitNumber(value, unit) {
    return indent`UnitNumber\n  ${value}\n  ${unit}`;
  },
  VariableAssignment(assignable, _0, type, _1, expr) {
    return indent`Assignment =
  ${type.sourceString ? "[Declaration, Typed]" : "[Declaration]"}
  ${assignable}${optional(type)}\n  ${expr}`;
  },
  WhileExp(node) {
    return node.tree();
  },
  WhileExp_while(expr, whileUntil, _0, condition, _1, _2, guard) {
    let text = indent`WhileExpression\n  ${condition}\n  ${expr}\
${optional(guard)}`;

    if (guard.sourceString) text = modify("HasGuard", text);
    if (whileUntil.sourceString === "until") text = modify("Inverted", text);

    return text;
  },
  Wrapped(_0, node, _1) {
    return node.tree();
  },
  WrappedScriptBlock(statements) {
    return indent`StatementBlock${optional(statements)}`;
  },
  WrappedStatementBlock(statements) {
    return indent`StatementBlock${optional(statements)}`;
  },
  whitespace(_) {
    return "Whitespace";
  },
  word(_0, _1, _2) {
    return this.sourceString;
  },

  _iter(...children) {
    return children.map((e) => e.tree()).join("\n");
  },
  _terminal() {
    return this.sourceString;
  },
});

declare module "ohm-js" {
  export interface Node extends grammar.StorymaticDict {}
}

declare module "./grammar.js" {
  export interface StorymaticDict {
    tree(): string;
  }
}
