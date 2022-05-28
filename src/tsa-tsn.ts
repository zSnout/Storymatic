import * as ts from "typescript";
import { semantics } from "./semantics.js";

semantics.addOperation<ts.NodeArray<ts.Node>>("tsa", {
  _terminal() {
    throw new Error(".tsa() must not be called on a TerminalNode.");
  },
  _nonterminal(...children) {
    if (children[0].isIteration()) return children[0].tsa();

    let iterNode;

    try {
      iterNode = this.asIteration();
    } catch {
      throw new Error(
        "When .tsa() is called on a NonterminalNode, the node must have a .asIteration() method or have a single child of type IterationNode."
      );
    }

    iterNode.source = this.source;
    return iterNode.tsa();
  },
  _iter(...children) {
    return ts.factory.createNodeArray(children.map((e) => e.ts()));
  },

  ArgumentList(node) {
    return node.tsa();
  },
  GenericTypeArgumentList(node) {
    return node.tsa();
  },
  GenericTypeArgumentList_with_args(node) {
    return node.tsa();
  },
  GenericTypeArgumentList_empty() {
    return ts.factory.createNodeArray([]);
  },
  GenericTypeParameterList(_0, params, _1) {
    return params.tsa();
  },
  ImpliedCallArgumentList(node) {
    return node.tsa();
  },
  Indented(_0, node, _1) {
    return node.tsa();
  },
  MaybeIndented(node) {
    return node.tsa();
  },
  NonemptyGenericTypeArgumentList(_0, typeArgs, _1) {
    return typeArgs.tsa();
  },
  ParameterList(node) {
    return node.tsa();
  },
  ParameterList_params(paramNodes, _, rest) {
    let params = paramNodes.tsa<ts.ParameterDeclaration>();

    if (rest.sourceString) {
      return ts.factory.createNodeArray(
        params.concat(rest.child(0).ts<ts.ParameterDeclaration>())
      );
    } else {
      return params;
    }
  },
  ParameterList_rest_params(rest) {
    return ts.factory.createNodeArray([rest.ts()]);
  },
  Wrapped(_0, node, _1) {
    return node.tsa();
  },
});

semantics.addOperation<ts.Node | undefined>("tsn(map)", {
  _terminal() {
    let args = this.args.map as Record<string, ts.Node>;
    let res = args[this.sourceString];
    if (!res) return undefined;
    return res;
  },
  _nonterminal() {
    let args = this.args.map as Record<string, ts.Node>;
    let res = args[this.sourceString];
    if (!res) return undefined;
    return res;
  },
  _iter() {
    let args = this.args.map as Record<string, ts.Node>;
    let res = args[this.sourceString];
    if (!res) return undefined;
    return res;
  },
});

declare module "./grammar.js" {
  export interface StorymaticDict {
    tsa<T extends ts.Node = ts.Node>(): ts.NodeArray<T>;
    tsn<T extends ts.Node = ts.Node>(map: Record<string, T>): T | undefined;
  }
}
