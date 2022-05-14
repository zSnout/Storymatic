import * as grammar from "./grammar.js";

export const story = grammar as any as grammar.StorymaticGrammar;
export const semantics = story.createSemantics();
