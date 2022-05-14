import * as grammar from "./grammar.js";
import { semantics } from "./semantics.js";

function indent(text: string, first = false): string {
  let split = text.split("\n");
  let indented = split.map((e) => "  " + e);

  if (first) {
    return indented.join("\n");
  }

  return split.length > 1
    ? split[0] + "\n" + indented.slice(1).join("\n")
    : split[0];
}

semantics.addOperation<string>("tree", {
  Accessor(base, addons) {
    return `Accessor
  ${indent(base.tree())}
  ${indent(addons.tree())}`;
  },
  AccessorAddon(node) {
    return node.tree();
  },
  AssignmentExp_assignment(assignable, _, expr) {
    return `Assignment\n  ${assignable.tree()}\n  ${expr.tree()}`;
  },
  CompareExp(primary, ops, exps) {
    if (ops.numChildren === 0) {
      return primary.tree();
    }

    if (ops.numChildren === 1) {
      return `Comparison ${ops.child(0).sourceString}
  ${indent(primary.tree())}
  ${indent(exps.child(0).tree())}`;
    }

    return (
      `ChainedComparison\n  ${indent(primary.tree())}` +
      ops.children.map(
        (op, i) => `\n  ${op.sourceString}\n  ${indent(exps.child(i).tree())}`
      )
    );
  },
  identifier(node) {
    return `Identifier ${node.sourceString}`;
  },
  Script(statements) {
    return `Script\n  ${indent(statements.tree())}`;
  },
  Statement(node) {
    return `Statement\n  ${indent(node.tree())}`;
  },
  Statement_expression(expr, _) {
    return expr.tree();
  },

  _iter(...children) {
    return children.map((e) => e.tree()).join("\n");
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
