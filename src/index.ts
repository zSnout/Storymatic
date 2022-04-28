import * as ts from "typescript";
import * as grammar from "./grammar.js";
import ohm = require("ohm-js");

let story = grammar as any as grammar.StorymaticGrammar;
let semantics = story.createSemantics();

export function compile(
  text: string,
  { commonjs = false, typescript = false, jsx = false }: Partial<Flags> = {}
) {
  flags = { commonjs, typescript, jsx };
  return semantics(story.match(text)).ts();
}

export function transpile(node: ts.Node, flags: Partial<Flags> = {}) {
  if (flags.typescript && flags.commonjs)
    throw new Error("CommonJS and TypeScript flags must not both be enabled.");
  if (flags.typescript && flags.jsx)
    throw new Error("JSX and TypeScript flags must not both be enabled.");

  let printer = ts.createPrinter({});
  let source = ts.createSourceFile("", "", ts.ScriptTarget.Latest);
  let text = printer.printNode(ts.EmitHint.Unspecified, node, source);

  return text;
}

interface Flags {
  commonjs: boolean;
  typescript: boolean;
  jsx: boolean;
}

let flags: Flags = Object.create(null);
flags;

function setTextRange<T extends ts.TextRange>(range: T, location: ohm.Node) {
  return ts.setTextRange(range, {
    pos: location.source.startIdx,
    end: location.source.endIdx,
  });
}

semantics.addOperation<ts.NodeArray<ts.Node>>("tsa", {
  _terminal() {
    throw new Error(".tsa() must not be called on a TerminalNode.");
  },
  _nonterminal(...children) {
    if (children.length != 1)
      throw new Error(
        ".tsa() must only be called on NonterminalNodes with a single child."
      );

    try {
      if (children[0].isIteration()) return children[0].tsa();

      let iterNode = children[0].asIteration();
      iterNode.source = this.source;
      return iterNode.tsa();
    } catch {
      throw new Error(
        ".tsa() must only be called on NonterminalNodes with a defined .asIteration() method or whose first child is an IterationNode."
      );
    }
  },
  _iter(...children) {
    return setTextRange(
      ts.factory.createNodeArray(children.map((e) => e.ts())),
      this
    );
  },
});

semantics.addOperation<ts.Node>("ts", {
  AddExp(node) {
    return node.ts();
  },
  AddExp_addition(left, _, right) {
    return setTextRange(
      ts.factory.createAdd(left.ts() as any, right.ts() as any),
      this
    );
  },
  AddExp_subtraction(left, _, right) {
    return setTextRange(
      ts.factory.createSubtract(left.ts() as any, right.ts() as any),
      this
    );
  },
  bigint(_0, _1, _2) {
    return setTextRange(
      ts.factory.createBigIntLiteral(this.sourceString),
      this
    );
  },
  decimalNumber(number) {
    return number.ts();
  },
  digit(_) {
    throw "`digit` nodes should never directly be evaluated";
  },
  fullNumber(_0, _1, _2, _3, _4, _5, _6) {
    return setTextRange(
      ts.factory.createNumericLiteral(this.sourceString),
      this
    );
  },
  identOrWord(node) {
    return node.ts();
  },
  identifier(node) {
    return node.ts();
  },
  identifierNumber(_0, _1, _2) {
    return setTextRange(
      ts.factory.createNumericLiteral(this.sourceString),
      this
    );
  },
  identifierWord(word) {
    return word.ts();
  },
  identifierWords(firstWord, _, otherWords) {
    let first = firstWord.ts() as ts.Identifier;
    // prettier-ignore
    let idents = otherWords.tsa() as ts.NodeArray<ts.Identifier | ts.NumericLiteral>;
    let others = idents.map((e) => e.text[0].toUpperCase() + e.text.slice(1));

    return setTextRange(
      ts.factory.createIdentifier(first.text + others.join("")),
      this
    );
  },
  MemberAccessExp(node) {
    return node.ts();
  },
  MemberAccessExp_computed_member_access(target, _0, index, _1) {
    return setTextRange(
      ts.factory.createElementAccessExpression(
        target.ts() as any,
        index.ts() as any
      ),
      this
    );
  },
  MemberAccessExp_function_call(target, typeArgs, _0, args, _1) {
    return setTextRange(
      ts.factory.createCallExpression(
        target.ts() as any,
        typeArgs.tsa() as any,
        args.tsa() as any
      ),
      this
    );
  },
  MemberAccessExp_function_call_implied(target, _, args) {
    return setTextRange(
      ts.factory.createCallExpression(
        target.ts() as any,
        undefined,
        args.tsa() as any
      ),
      this
    );
  },
  MemberAccessExp_member_access(target, _, key) {
    return setTextRange(
      ts.factory.createPropertyAccessExpression(target as any, key.ts() as any),
      this
    );
  },
  number(number) {
    return setTextRange(
      ts.factory.createNumericLiteral(number.sourceString),
      this
    );
  },
  Statement_break(_0, _1) {
    return setTextRange(ts.factory.createBreakStatement(), this);
  },
  Statement_continue(_0, _1) {
    return setTextRange(ts.factory.createContinueStatement(), this);
  },
  Statement_empty_export(_0, _1) {
    return setTextRange(
      ts.factory.createExportDeclaration(
        undefined,
        undefined,
        false,
        setTextRange(ts.factory.createNamedExports([]), this)
      ),
      this
    );
  },
  Statement_export_default(_0, _1, expression, _2) {
    return setTextRange(
      ts.factory.createExportDefault(expression.ts() as any),
      this
    );
  },
  Statement_expression(expression, _) {
    return setTextRange(
      ts.factory.createExpressionStatement(expression.ts() as any),
      this
    );
  },
  StatementBlock_statements(statements) {
    return setTextRange(
      ts.factory.createSourceFile(
        statements.tsa() as any,
        ts.setTextRange(ts.factory.createToken(ts.SyntaxKind.EndOfFileToken), {
          pos: this.source.endIdx,
          end: this.source.endIdx,
        }),
        0
      ),
      this
    );
  },
  unitNumber(number, identifier) {
    let num = number.ts() as ts.NumericLiteral;
    let str = setTextRange(
      ts.factory.createStringLiteral(number.sourceString),
      number
    );
    let ident = identifier.ts() as ts.Identifier;

    let numEl = setTextRange(
      ts.factory.createPropertyAssignment("number", num),
      number
    );
    let strEl = setTextRange(
      ts.factory.createPropertyAssignment("string", str),
      number
    );
    let obj = setTextRange(
      ts.factory.createObjectLiteralExpression([numEl, strEl], false),
      number
    );

    return setTextRange(
      ts.factory.createCallExpression(ident, undefined, [obj]),
      this
    );
  },
  WrappedStatementBlock(_0, statements, _1) {
    return setTextRange(ts.factory.createBlock(statements.tsa() as any), this);
  },
  word(_0, _1, _2) {
    return setTextRange(ts.factory.createIdentifier(this.sourceString), this);
  },
});

declare module "ohm-js" {
  export interface Node {
    ts(): ts.Node;
    tsa(): ts.NodeArray<ts.Node>;
    asIteration(): ohm.IterationNode;
  }
}

declare module "./grammar.js" {
  export interface StorymaticDict {
    ts(): ts.Node;
    tsa(): ts.NodeArray<ts.Node>;
    asIteration(): ohm.IterationNode;
  }

  export interface StorymaticSemantics {
    (match: ohm.MatchResult): StorymaticDict;
  }
}
