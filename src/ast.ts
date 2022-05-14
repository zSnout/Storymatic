import * as grammar from "./grammar.js";
import { semantics } from "./semantics";

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

semantics.addOperation("ast", {
  Accessor(base, addons) {
    return indent(`Accessor
  Base
    ${indent(base.ast())}
  Addons
    ${indent(addons.ast())}`);
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
