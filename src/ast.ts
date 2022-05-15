import { Node } from "ohm-js";
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
    return value.sourceString === "true" ? "True" : "False";
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
  EmptyListOf() {
    return "";
  },
  Exportable(type, _0, name, _1, _2, _3, out) {
    if (out.sourceString) {
      return indent`ExportSpecifier\
${optional(type.sourceString && "[TypeOnly]")}
  Identifier ${name.sourceString}
  Identifier ${out.child(0).sourceString}`;
    } else {
      return indent`ExportSpecifier\
${optional(type.sourceString && "[TypeOnly]")}
  Identifier ${name.sourceString}`;
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
  [Exported]
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
  FinallyStatement(_0, _1, block) {
    return indent`FinallyStatement${optional(block)}`;
  },
  ForExp(node) {
    return node.tree();
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
  GenericTypeParameter(ident, _0, constraint, _1, _default) {
    return indent`TypeParameter ${ident.tree().slice(11)}\
${optional(namespace("Constraint", constraint))}\
${optional(namespace("Default", _default))}`;
  },
  GenericTypeParameterList(_0, params, _1) {
    return indent`TypeParameters\n  ${params}`;
  },
  IfExp(node) {
    return node.tree();
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
  IndexSignatureType(readonly, _0, _1, name, _2, key, _3, _4, type) {
    return indent`IndexSignature ${name.tree().slice(11)}\
${optional(readonly.sourceString && "[Readonly]")}
  ${key}
  ${type}`;
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
  ListOf(node) {
    return node.asIteration().tree();
  },
  LiteralExp(node) {
    return node.tree();
  },
  LiteralExp_array(_0, elements, _1, _2) {
    return indent`Array${optional(elements)}`;
  },
  LiteralExp_parenthesized(_0, expr, _1) {
    return indent`Parenthesized\n  ${expr}`;
  },
  LiteralExp_self(_) {
    return "This";
  },
  LiteralExp_topic_token(_) {
    return "TopicToken";
  },
  LiteralExp_with(_0, _1, self, block) {
    return indent`With\n  ${self}\n  ${block}`;
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
  MemberAccessExpNonCall_non_null_assertion(target, _) {
    return indent`NonNullAssertion\n  ${target}`;
  },
  MemberAccessExpNonCall_optional_chaining_member_access(target, _, prop) {
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
    return indent`Tuple\n  ${members}`;
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
  MethodName_string_key(node) {
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
  NonemptyGenericTypeArgumentList(_0, args, _1) {
    return indent`TypeArguments\n  ${args}`;
  },
  NonemptyListOf(_0, _1, _2) {
    return this.asIteration().tree();
  },
  nonemptyListOf(_0, _1, _2) {
    return this.asIteration().tree();
  },
  null(_) {
    return "Null";
  },
  Parameter(node) {
    return node.tree();
  },
  ParameterList(node) {
    return node.tree();
  },
  ParameterList_params(params, _, rest) {
    return indent`ParameterList\n  ${params}${optional(rest)}`;
  },
  ParameterList_rest_params(rest) {
    return namespace("ParameterList", rest);
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
  //   Statement_empty_export(_0, _1) {
  //     return indent`Export`;
  //   },
  //   Statement_empty_import(_0, _1, loc, _2) {
  //     return indent`Import ${loc}`;
  //   },
  //   Statement_export(_0, _1, type, _2, specifiers, _3, _4) {
  //     return indent`Export\
  // ${optional(type.sourceString && "[TypeOnly]")}\
  // ${optional(specifiers)}`;
  //   },
  //   Statement_export_all_from(_0, _1, _2, _3, loc, _4) {
  //     return indent`ExportFrom ${loc}\n  [ExportAll]`;
  //   },
  //   Statement_export_default(_0, _1, _2, _3, expr, _4) {
  //     return indent`ExportDefault\n  ${expr}`;
  //   },
  //   Statement_export_from(_0, _1, type, _2, specifiers, _3, _4, _5, loc, _6) {
  //     return indent`ExportFrom ${loc}\
  // ${optional(type.sourceString && "[TypeOnly]")}\
  // ${optional(specifiers)}`;
  //   },
  //   Statement_export_variable(node, _) {
  //     return node.tree();
  //   },
  Statement_expression(expr, _) {
    return expr.tree();
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
  TopLevelExp_return(_, expr) {
    return indent`Return${optional(expr)}`;
  },
  TopLevelExp_throw(_, expr) {
    return indent`Throw\n  ${expr}`;
  },
  TryStatement(_0, _1, block, _catch, _finally) {
    return indent`TryStatement\n  ${block}\
${optional(_catch)}${optional(_finally)}`;
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
  UnionType(list) {
    let iter = list.asIteration();

    if (iter.numChildren === 1) {
      return iter.child(0).tree();
    }

    return indent`Union\n  ${list}`;
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
  WrappedStatementBlock(_0, statements, _1) {
    return indent`StatementBlock${optional(statements)}`;
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
