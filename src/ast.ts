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

function list(node: string | Node) {
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
    return `Arguments${list(node)}`;
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

  identifier(node) {
    return indent`Identifier ${node.sourceString}`;
  },
  ListOf(node) {
    return node.asIteration().tree();
  },
  LiteralExp(node) {
    return node.tree();
  },
  LiteralExp_array(_0, elements, _1, _2) {
    return indent`Array${list(elements)}`;
  },
  Script(statements) {
    return indent`Script\n  ${statements}`;
  },
  Statement(node) {
    return node.tree();
  },
  Statement_expression(expr, _) {
    return indent`Expression\n  ${expr}`;
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
