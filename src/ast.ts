import * as grammar from "./grammar.js";
import { semantics, story } from "./semantics.js";

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

semantics.addOperation<string>("ast", {
  Accessor(base, addons) {
    return `Accessor
  ${indent(base.ast())}
  ${indent(addons.ast())}`;
  },
  CompareExp(primary, ops, exps) {
    if (ops.numChildren === 0) {
      return primary.ast();
    }

    if (ops.numChildren === 1) {
      return `Comparison ${ops.child(0).sourceString}
  ${indent(primary.ast())}
  ${indent(exps.child(0).ast())}`;
    }

    return (
      `ChainedComparison\n  ${indent(primary.ast())}` +
      ops.children.map(
        (op, i) => `\n  ${op.sourceString}\n  ${indent(exps.child(i).ast())}`
      )
    );
  },
  identifier(node) {
    return `Identifier ${node.sourceString}`;
  },
  Script(statements) {
    return `Script\n  ${indent(statements.ast())}`;
  },
  Statement(node) {
    return `Statement\n  ${indent(node.ast())}`;
  },
  Statement_expression(expr, _) {
    return expr.ast();
  },

  _iter(...children) {
    return children.map((e) => e.ast()).join("\n");
  },
});

declare module "ohm-js" {
  export interface Node extends grammar.StorymaticDict {}
}

declare module "./grammar.js" {
  export interface StorymaticDict {
    ast(): string;
  }
}
