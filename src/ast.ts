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

  return `\n${node}`;
}

function indentText(text: string) {
  let split = text.split("\n");
  let indented = split.map((e) => "  " + e);

  return split.length > 1
    ? split[0] + "\n" + indented.slice(1).join("\n")
    : split[0];
}

semantics.addOperation<string>("tree", {
  Accessor(base, addons) {
    return `Accessor
  ${indentText(base.tree())}
  ${indentText(addons.tree())}`;
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
    return `Spread\n  ${node}`;
  },
  ArrayEntry(node) {
    return node.tree();
  },
  ArrayEntry_spread_operator(_, node) {
    return indent`Spread\n  ${node}`;
  },
  AssignmentExp_assignment(assignable, _, expr) {
    return indent`Assignment\n  ${assignable}\n  ${expr}`;
  },
  bigint(_0, _1, _2) {
    return `BigInt ${this.sourceString}`;
  },
  block_comment(_0, _1, _2) {
    return "BlockComment";
  },
  boolean(value) {
    return value.sourceString === "true" ? "True" : "False";
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
      indent`ChainedComparison\n  ${primary}` +
      ops.children
        .map((op, i) => indent`\n  ${op}\n  ${exps.child(i)}`)
        .join("")
    );
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
  decimalNumber(node) {
    return node.tree();
  },
  fullNumber(_0, _1, _2, _3, _4, _5, _6) {
    return `Number ${this.sourceString}`;
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
  ImpliedCallArgumentList(node) {
    return indent`Arguments${optional(node)}`;
  },
  identifier(node) {
    return `Identifier ${node.sourceString}`;
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
  MemberAccessExp(node) {
    return node.tree();
  },
  MemberAccessExpNonCall(node) {
    return node.tree();
  },
  MemberAccessExpNonCall_array_slice(target, qMark, _0, start, dots, end, _1) {
    return indent`ArraySlice${qMark.sourceString && "Chain"}
  ${target}
  ${start.tree() || "Undefined"}
  ${dots.sourceString === "..." ? "Through" : "To"}
  ${end.tree() || "Undefined"}`;
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
    return indent`MemberAccess${qMark.sourceString && "Chain"}
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
    return indent`PropertyAccessChain\n  ${target}\n  Identifier ${prop.sourceString}`;
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
  Script(statements) {
    return indent`Script${optional(statements)}`;
  },
  Statement(node) {
    return node.tree();
  },
  Statement_expression(expr, _) {
    return indent`Expression\n  ${expr}`;
  },
  sign(sign) {
    return `Sign ${sign.sourceString}`;
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
      indent`${expr}` +
      optional(
        bits.sourceString &&
          indent`⇨${bits.children.map((x) => x.tree()).join("")}⇨`
      )
    );
  },
  string(node) {
    return indent`String${node}`;
  },
  string_non_interpolatable(node) {
    return indent`String${node}`;
  },
  string_type(node) {
    return indent`TemplateLiteral${node}`;
  },
  UnionType(list) {
    let iter = list.asIteration();

    if (iter.numChildren === 1) {
      return iter.child(0).tree();
    }

    return indent`Union\n  ${list}`;
  },
  undefined(_) {
    return "Undefined";
  },
  unitNumber(value, unit) {
    return indent`UnitNumber\n  ${value}\n  ${unit}`;
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
