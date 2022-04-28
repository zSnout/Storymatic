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
    return setTextRange(ts.factory.createAdd(left.ts(), right.ts()), this);
  },
  AddExp_subtraction(left, _, right) {
    return setTextRange(ts.factory.createSubtract(left.ts(), right.ts()), this);
  },
  Argument(node) {
    return node.ts();
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
    let first = firstWord.ts<ts.Identifier>();
    let idents = otherWords.tsa<ts.Identifier | ts.NumericLiteral>();
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
        target.ts(),
        index.ts<ts.Expression>()
      ),
      this
    );
  },
  MemberAccessExp_function_call(target, typeArgs, _0, args, _1) {
    return setTextRange(
      ts.factory.createCallExpression(target.ts(), typeArgs.tsa(), args.tsa()),
      this
    );
  },
  MemberAccessExp_function_call_implied(target, _, args) {
    return setTextRange(
      ts.factory.createCallExpression(target.ts(), undefined, args.tsa()),
      this
    );
  },
  MemberAccessExp_member_access(target, _, key) {
    return setTextRange(
      ts.factory.createPropertyAccessExpression(
        target.ts(),
        key.ts<ts.MemberName>()
      ),
      this
    );
  },
  MemberAccessExp_non_null_assertion(target, _) {
    return setTextRange(ts.factory.createNonNullExpression(target.ts()), this);
  },
  MemberAccessExp_optional_chaining_computed_member_access(
    target,
    qDot,
    _0,
    index,
    _1
  ) {
    return setTextRange(
      ts.factory.createElementAccessChain(
        target.ts(),
        setTextRange(
          ts.factory.createToken(ts.SyntaxKind.QuestionDotToken),
          qDot
        ),
        index.ts<ts.Expression>()
      ),
      this
    );
  },
  MemberAccessExp_optional_chaining_function_call(
    target,
    qDot,
    typeArgs,
    _0,
    args,
    _1
  ) {
    return setTextRange(
      ts.factory.createCallChain(
        target.ts(),
        setTextRange(
          ts.factory.createToken(ts.SyntaxKind.QuestionDotToken),
          qDot
        ),
        typeArgs.tsa(),
        args.tsa()
      ),
      this
    );
  },
  MemberAccessExp_optional_chaining_member_access(target, qDot, key) {
    return setTextRange(
      ts.factory.createPropertyAccessChain(
        target.ts(),
        setTextRange(
          ts.factory.createToken(ts.SyntaxKind.QuestionDotToken),
          qDot
        ),
        key.ts<ts.MemberName>()
      ),
      this
    );
  },
  MemberAccessExp_optional_chaining_symbol_access(target, qDot, symbol) {
    return setTextRange(
      ts.factory.createElementAccessChain(
        target.ts(),
        setTextRange(
          ts.factory.createToken(ts.SyntaxKind.QuestionDotToken),
          qDot
        ),
        symbol.ts<ts.Expression>()
      ),
      this
    );
  },
  MemberAccessExp_symbol_access(target, _, symbol) {
    return setTextRange(
      ts.factory.createElementAccessExpression(
        target.ts(),
        symbol.ts<ts.Expression>()
      ),
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
    return setTextRange(ts.factory.createExportDefault(expression.ts()), this);
  },
  Statement_expression(expression, _) {
    return setTextRange(
      ts.factory.createExpressionStatement(expression.ts()),
      this
    );
  },
  StatementBlock_statements(statements) {
    return setTextRange(
      ts.factory.createSourceFile(
        statements.tsa(),
        ts.setTextRange(ts.factory.createToken(ts.SyntaxKind.EndOfFileToken), {
          pos: this.source.endIdx,
          end: this.source.endIdx,
        }),
        0
      ),
      this
    );
  },
  Symbol(node) {
    return node.ts();
  },
  SymbolKey(node) {
    return node.ts();
  },
  SymbolKey_computed(_0, expr, _1) {
    return setTextRange(expr.ts(), this);
  },
  SymbolKey_name(ident) {
    return setTextRange(
      ts.factory.createStringLiteralFromNode(ident.ts()),
      this
    );
  },
  SymbolKey_string(str) {
    return str.ts();
  },
  Symbol_builtin_symbol(hashMarks, key) {
    return setTextRange(
      ts.factory.createElementAccessExpression(
        setTextRange(ts.factory.createIdentifier("Symbol"), hashMarks),
        key.ts<ts.Expression>()
      ),
      this
    );
  },
  Symbol_symbol_for(hashMark, key) {
    let Symbol = setTextRange(ts.factory.createIdentifier("Symbol"), hashMark);
    let _for = setTextRange(ts.factory.createIdentifier("for"), hashMark);
    let Symbol_for = setTextRange(
      ts.factory.createPropertyAccessExpression(Symbol, _for),
      hashMark
    );

    return setTextRange(
      ts.factory.createCallExpression(Symbol_for, undefined, [key.ts()]),
      this
    );
  },
  sign(_) {
    throw new Error("`sign` nodes should never be evaluated directly.");
  },
  space(_) {
    throw new Error("`space` nodes should never be evaluated directly.");
  },
  statementTerminator(_) {
    return setTextRange(
      ts.factory.createToken(ts.SyntaxKind.SemicolonToken),
      this
    );
  },
  statementTerminator_semicolon(_0, _1) {
    throw new Error(
      "`statementTerminator_semicolon` nodes should never be evaluated directly."
    );
  },
  string(node) {
    return node.ts();
  },
  string_bit(node) {
    let char = node.sourceString;
    if (char.length == 1 && "$\"'`".indexOf(char) > -1) char = "\\" + char;
    if (char == "\n") char = "\\n";
    if (char == "\r") char = "\\r";
    return ts.factory.createStringLiteral(char);
  },
  string_bit_character(_) {
    throw new Error(
      "`string_bit_character` nodes should never be evaluated directly."
    );
  },
  string_bit_escape(_0, _1) {
    throw new Error(
      "`string_bit_escape` nodes should never be evaluated directly."
    );
  },
  string_bit_escape_sequence(_0, _1) {
    throw new Error(
      "`string_bit_escape_sequence` nodes should never be evaluated directly."
    );
  },
  string_bit_hex_sequence(_0, _1, _2) {
    throw new Error(
      "`string_bit_hex_sequence` nodes should never be evaluated directly."
    );
  },
  string_bit_unicode_code_point_sequence(_0, _1, _2) {
    throw new Error(
      "`string_bit_unicode_code_point_sequence` nodes should never be evaluated directly."
    );
  },
  string_bit_unicode_sequence(_0, _1, _2, _3, _4) {
    throw new Error(
      "`string_bit_unicode_sequence` nodes should never be evaluated directly."
    );
  },
  string_full(open, content, _) {
    let bits = content.tsa<ts.StringLiteral>();
    return setTextRange(
      ts.factory.createStringLiteral(
        bits.map((e) => e.text).join(""),
        open.sourceString == "'"
      ),
      this
    );
  },
  string_interpolatable(_0, headNode, spansNode, _1) {
    let head = headNode.ts<ts.TemplateHead>();
    let spans = spansNode.tsa<ts.TemplateSpan>();
    return setTextRange(ts.factory.createTemplateExpression(head, spans), this);
  },
  string_interpolatable_head(content) {
    let bits = content.tsa<ts.StringLiteral>();
    return setTextRange(
      ts.factory.createTemplateHead(bits.map((e) => e.text).join("")),
      this
    );
  },
  string_interpolatable_span(_0, expression, _1, content, isTail) {
    let bits = content
      .tsa<ts.StringLiteral>()
      .map((e) => e.text)
      .join("");

    let text = isTail.sourceString
      ? ts.factory.createTemplateTail(bits, content.sourceString)
      : ts.factory.createTemplateMiddle(bits, content.sourceString);

    text = setTextRange(text, content);

    return setTextRange(
      ts.factory.createTemplateSpan(expression.ts(), text),
      this
    );
  },
  unitNumber(number, identifier) {
    let num = number.ts<ts.NumericLiteral>();
    let str = setTextRange(
      ts.factory.createStringLiteral(number.sourceString),
      number
    );
    let ident = identifier.ts<ts.Identifier>();

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
    return setTextRange(ts.factory.createBlock(statements.tsa()), this);
  },
  word(_0, _1, _2) {
    return setTextRange(ts.factory.createIdentifier(this.sourceString), this);
  },
});

declare module "ohm-js" {
  export interface Node {
    ts<T extends ts.Node = ts.Node>(): T;
    tsa<T extends ts.Node = ts.Node>(): ts.NodeArray<T>;
    asIteration(): ohm.IterationNode;
  }
}

declare module "./grammar.js" {
  export interface StorymaticDict {
    ts<T extends ts.Node = ts.Node>(): T;
    tsa<T extends ts.Node = ts.Node>(): ts.NodeArray<T>;
    asIteration(): ohm.IterationNode;
  }

  export interface StorymaticSemantics {
    (match: ohm.MatchResult): StorymaticDict;
  }
}
