import { randomUUID } from "crypto";
import * as grammar from "./grammar.js";
import ohm = require("ohm-js");
import * as ts from "typescript";

let story = grammar as any as grammar.StorymaticGrammar;
let semantics = story.createSemantics();

export function compileText(
  text: string,
  { commonjs = false, typescript = false }: Partial<Flags> = {}
) {
  flags = { commonjs, typescript };
  return semantics(story.match(text)).ts();
}

interface Flags {
  commonjs: boolean;
  typescript: boolean;
}

let flags: Flags = Object.create(null);

declare module "ohm-js" {
  export interface Node {
    ts(): ts.Node;
    asIteration(): ohm.IterationNode;
  }
}

declare module "./grammar.js" {
  export interface StorymaticDict {
    ts(): ts.Node;
  }

  export interface StorymaticSemantics {
    (match: ohm.MatchResult): StorymaticDict;
  }
}
