import * as ohm from "ohm-js";
import * as ts from "typescript";
import * as grammar from "./grammar.js";

let story = grammar as any as grammar.StorymaticGrammar;
let semantics = story.createSemantics();

export function compile(text: string, _flags: Partial<Flags> = {}) {
  return semantics(story.match(text)).ts();
}

export function transpile(node: ts.Node, flags: Partial<Flags> = {}) {
  if (flags.typescript && flags.module)
    throw new Error("Module and TypeScript options are mutually exclusive.");

  if (flags.typescript && flags.jsx)
    throw new Error("JSX and TypeScript options are mutually exclusive.");

  let source = ts.createSourceFile("", "", ts.ScriptTarget.Latest);
  source.languageVariant = ts.LanguageVariant.JSX;

  let printer = ts.createPrinter({});
  let text = printer.printNode(ts.EmitHint.Unspecified, node, source);

  if (flags.typescript) return text;

  let transpiled = ts.transpileModule(text, {
    compilerOptions: {
      module: flags.module,
      jsx: flags.jsx ? ts.JsxEmit.React : ts.JsxEmit.Preserve,
      jsxFactory: flags.jsx || undefined,
      strict: true,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      allowJs: true,
      checkJs: true,
      skipLibCheck: true,
    },
  });

  return transpiled.outputText;
}

export interface Flags {
  typescript?: boolean;
  module?: ts.ModuleKind;
  jsx?: string;
}

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
    try {
      if (children[0].isIteration()) return children[0].tsa();

      let iterNode = this.asIteration();
      iterNode.source = this.source;
      return iterNode.tsa();
    } catch {
      throw new Error(
        "When .tsa() is called on a NonterminalNode, the node must have a .asIteration() method or have a single child of type IterationNode."
      );
    }
  },
  _iter(...children) {
    return setTextRange(
      ts.factory.createNodeArray(children.map((e) => e.ts())),
      this
    );
  },

  GenericTypeArgumentList(node) {
    return node.tsa();
  },
  GenericTypeArgumentList_with_args(_0, typeArgs, _1) {
    return setTextRange(typeArgs.tsa(), this);
  },
  GenericTypeArgumentList_empty() {
    return setTextRange(ts.factory.createNodeArray([]), this);
  },

  GenericTypeParameterList(_0, params, _1) {
    return params.tsa();
  },

  ParameterList(node) {
    return node.tsa();
  },
  ParameterList_params(paramNodes, _, rest) {
    let params = paramNodes.tsa<ts.ParameterDeclaration>();

    if (rest.sourceString) {
      return setTextRange(
        ts.factory.createNodeArray(
          params.concat(rest.ts<ts.ParameterDeclaration>())
        ),
        this
      );
    } else {
      return setTextRange(params, this);
    }
  },
  ParameterList_rest_params(rest) {
    return setTextRange(ts.factory.createNodeArray([rest.ts()]), this);
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
    throw "`digit` nodes should never directly be evaluated.";
  },
  ElseIfKeyword(_) {
    throw "`ElseIfKeyword` nodes should never directly be evaluated.";
  },
  ElseIfKeyword_elif(_) {
    throw "`ElseIfKeyword_elif` nodes should never directly be evaluated.";
  },
  ElseIfKeyword_else_if(_0, _1) {
    throw "`ElseIfKeyword_else_if` nodes should never directly be evaluated.";
  },
  ElseIfKeyword_else_unless(_0, _1, _2) {
    throw "`ElseIfKeyword_else_unless` nodes should never directly be evaluated.";
  },
  ExpExp(node) {
    return node.ts();
  },
  ExpExp_exponentiate(left, _, right) {
    return setTextRange(ts.factory.createExponent(left.ts(), right.ts()), this);
  },
  ExportableItemName(node) {
    return node.ts();
  },
  ExportableItemName_rewrite(scriptName, _0, _1, _2, exportName) {
    return setTextRange(
      ts.factory.createExportSpecifier(
        false,
        scriptName.ts<ts.Identifier>(),
        exportName.ts<ts.Identifier>()
      ),
      this
    );
  },
  ExportableItemName_standard(ident) {
    return setTextRange(
      ts.factory.createExportSpecifier(
        false,
        undefined,
        ident.ts<ts.Identifier>()
      ),
      this
    );
  },
  fullNumber(_0, _1, _2, _3, _4, _5, _6) {
    return setTextRange(
      ts.factory.createNumericLiteral(this.sourceString),
      this
    );
  },
  GenericTypeArgumentList(_) {
    throw new Error(
      "`GenericTypeArgumentList` nodes should never directly be evaluated."
    );
  },
  GenericTypeArgumentList_empty() {
    throw new Error(
      "`GenericTypeArgumentList_empty` nodes should never directly be evaluated."
    );
  },
  GenericTypeArgumentList_with_args(_0, _1, _2) {
    throw new Error(
      "`GenericTypeArgumentList_with_args` nodes should never directly be evaluated."
    );
  },
  GenericTypeParameter(name, _0, constraint, _1, defaultType) {
    return setTextRange(
      ts.factory.createTypeParameterDeclaration(
        name.ts<ts.Identifier>(),
        constraint.ts<ts.TypeNode>(),
        defaultType.ts<ts.TypeNode>()
      ),
      this
    );
  },
  GenericTypeParameterList(_0, _1, _2) {
    throw new Error(
      "`GenericTypeParameterList` nodes should never directly be evaluated."
    );
  },
  ImportableItemName(node) {
    return node.ts();
  },
  ImportableItemName_rewrite(exportName, _0, _1, _2, scriptName) {
    return setTextRange(
      ts.factory.createImportSpecifier(
        false,
        exportName.ts<ts.Identifier>(),
        scriptName.ts<ts.Identifier>()
      ),
      this
    );
  },
  ImportableItemName_standard(ident) {
    return setTextRange(
      ts.factory.createImportSpecifier(
        false,
        undefined,
        ident.ts<ts.Identifier>()
      ),
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
  id_continue(_) {
    throw new Error("`id_continue` nodes should never directly be evaluated.");
  },
  importLocation(node) {
    return node.ts();
  },
  importLocation_filename(filename, _) {
    return setTextRange(
      ts.factory.createStringLiteral(filename.sourceString),
      this
    );
  },
  JSXAttribute(node) {
    return node.ts();
  },
  JSXAttributeKey(node) {
    return node.ts();
  },
  JSXAttribute_spread_attributes(_0, _1, expression, _2) {
    return setTextRange(
      ts.factory.createJsxSpreadAttribute(expression.ts()),
      this
    );
  },
  JSXAttribute_value_computed_string(key, _, value) {
    return setTextRange(
      ts.factory.createJsxAttribute(
        key.ts(),
        setTextRange(
          ts.factory.createJsxExpression(undefined, value.ts<ts.Expression>()),
          value
        )
      ),
      this
    );
  },
  JSXAttribute_value_expression(key, _0, _1, dotDotDot, value, _2) {
    let spread = dotDotDot.sourceString
      ? setTextRange(
          ts.factory.createToken(ts.SyntaxKind.DotDotDotToken),
          dotDotDot
        )
      : undefined;

    return setTextRange(
      ts.factory.createJsxAttribute(
        key.ts(),
        setTextRange(
          ts.factory.createJsxExpression(spread, value.ts<ts.Expression>()),
          value
        )
      ),
      this
    );
  },
  JSXAttribute_value_string(key, _, string) {
    return setTextRange(
      ts.factory.createJsxAttribute(key.ts(), string.ts<ts.StringLiteral>()),
      this
    );
  },
  JSXAttribute_value_true(key) {
    return setTextRange(
      ts.factory.createJsxAttribute(key.ts(), undefined),
      this
    );
  },
  JSXChild(node) {
    return node.ts();
  },
  JSXChild_interpolation(_0, dotDotDot, expression, _1) {
    let spread = dotDotDot.sourceString
      ? setTextRange(
          ts.factory.createToken(ts.SyntaxKind.DotDotDotToken),
          dotDotDot
        )
      : undefined;

    return setTextRange(
      ts.factory.createJsxExpression(spread, expression.ts<ts.Expression>()),
      this
    );
  },
  JSXElement(node) {
    return node.ts();
  },
  JSXElement_open_close(
    openLeft,
    tag,
    typeArgs,
    attrNode,
    openRight,
    children,
    closeLeft,
    _,
    closeRight
  ) {
    let attrs = setTextRange(
      ts.factory.createJsxAttributes(attrNode.tsa()),
      attrNode
    );

    let open = ts.setTextRange(
      ts.factory.createJsxOpeningElement(tag.ts(), typeArgs.tsa(), attrs),
      { pos: openLeft.source.startIdx, end: openRight.source.endIdx }
    );

    let close = ts.setTextRange(ts.factory.createJsxClosingElement(tag.ts()), {
      pos: closeLeft.source.startIdx,
      end: closeRight.source.endIdx,
    });

    return setTextRange(
      ts.factory.createJsxElement(open, children.tsa(), close),
      this
    );
  },
  JSXElement_self_closing(_0, tag, typeArgs, attrNode, _1, _2) {
    let attrs = setTextRange(
      ts.factory.createJsxAttributes(attrNode.tsa()),
      attrNode
    );

    return setTextRange(
      ts.factory.createJsxSelfClosingElement(tag.ts(), typeArgs.tsa(), attrs),
      this
    );
  },
  JSXTagName(node) {
    return node.ts();
  },
  JSXTagName_property_access(tag, _, key) {
    return setTextRange(
      ts.factory.createPropertyAccessExpression(
        tag.ts(),
        key.ts<ts.Identifier>()
      ),
      this
    );
  },
  JSXTagName_standard(node) {
    return node.ts();
  },
  jsx_string(bits) {
    let source = bits.sourceString.trim().replace(/\s+/g, " ");
    return setTextRange(ts.factory.createJsxText(source), this);
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
  MemberAccessExp_tagged_template_literal(tag, generics, template) {
    return setTextRange(
      ts.factory.createTaggedTemplateExpression(
        tag.ts(),
        generics.tsa(),
        template.ts()
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
  Parameter(node) {
    return node.ts();
  },
  ParameterList(_) {
    throw new Error(
      "`ParameterList` nodes should never directly be evaluated."
    );
  },
  ParameterList_params(_0, _1, _2) {
    throw new Error(
      "`ParameterList_params` nodes should never directly be evaluated."
    );
  },
  ParameterList_rest_params(_) {
    throw new Error(
      "`ParameterList_rest_params` nodes should never directly be evaluated."
    );
  },
  reserved(_) {
    throw "`reserved` nodes should never directly be evaluated.";
  },
  reserved_block(_) {
    throw "`reserved_block` nodes should never directly be evaluated.";
  },
  reserved_inline(_) {
    throw "`reserved_inline` nodes should never directly be evaluated.";
  },
  reserved_javascript(_) {
    throw "`reserved_javascript` nodes should never directly be evaluated.";
  },
  reserved_operators(_) {
    throw "`reserved_operators` nodes should never directly be evaluated.";
  },
  reserved_primitive(_) {
    throw "`reserved_primitive` nodes should never directly be evaluated.";
  },
  Statement_break(_0, _1) {
    return setTextRange(ts.factory.createBreakStatement(), this);
  },
  Statement_continue(_0, _1) {
    return setTextRange(ts.factory.createContinueStatement(), this);
  },
  Statement_do_until(_0, _1, block, _2, _3, _4, condition, _5) {
    let cond = setTextRange(
      ts.factory.createLogicalNot(condition.ts()),
      condition
    );

    return setTextRange(ts.factory.createDoStatement(block.ts(), cond), this);
  },
  Statement_do_while(_0, _1, block, _2, _3, _4, condition, _5) {
    return setTextRange(
      ts.factory.createDoStatement(block.ts(), condition.ts()),
      this
    );
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
  Statement_empty_import(_0, _1, filename, _2) {
    return setTextRange(
      ts.factory.createImportDeclaration(
        undefined,
        undefined,
        undefined,
        filename.ts()
      ),
      this
    );
  },
  Statement_export(_0, _1, exports, _2) {
    return setTextRange(
      ts.factory.createExportDeclaration(
        undefined,
        undefined,
        false,
        setTextRange(ts.factory.createNamedExports(exports.tsa()), exports)
      ),
      this
    );
  },
  Statement_export_all_from(_0, _1, _2, _3, filename, _4) {
    return setTextRange(
      ts.factory.createExportDeclaration(
        undefined,
        undefined,
        false,
        undefined,
        filename.ts<ts.StringLiteral>()
      ),
      this
    );
  },
  Statement_export_default(_0, _1, expression, _2) {
    return setTextRange(ts.factory.createExportDefault(expression.ts()), this);
  },
  Statement_export_from(_0, _1, exports, _2, _3, _4, filename, _5) {
    return setTextRange(
      ts.factory.createExportDeclaration(
        undefined,
        undefined,
        false,
        setTextRange(ts.factory.createNamedExports(exports.tsa()), exports),
        filename.ts<ts.Expression>()
      ),
      this
    );
  },
  Statement_expression(expression, _) {
    return setTextRange(
      ts.factory.createExpressionStatement(expression.ts()),
      this
    );
  },
  Statement_import(_0, _1, imports, _2, _3, _4, filename, _5) {
    return setTextRange(
      ts.factory.createImportDeclaration(
        undefined,
        undefined,
        setTextRange(
          ts.factory.createImportClause(
            false,
            undefined,
            setTextRange(ts.factory.createNamedImports(imports.tsa()), imports)
          ),
          imports
        ),
        filename.ts()
      ),
      this
    );
  },
  Statement_import_all(_0, star, _2, _3, ident, _4, _5, _6, filename, _7) {
    return setTextRange(
      ts.factory.createImportDeclaration(
        undefined,
        undefined,
        ts.setTextRange(
          ts.factory.createImportClause(
            false,
            undefined,
            ts.setTextRange(ts.factory.createNamespaceImport(ident.ts()), {
              pos: star.source.startIdx,
              end: ident.source.endIdx,
            })
          ),
          {
            pos: star.source.startIdx,
            end: ident.source.endIdx,
          }
        ),
        filename.ts<ts.StringLiteral>()
      ),
      this
    );
  },
  Statement_import_default(_0, _1, ident, _2, _3, _4, filename, _5) {
    return setTextRange(
      ts.factory.createImportDeclaration(
        undefined,
        undefined,
        setTextRange(
          ts.factory.createImportClause(
            false,
            ident.ts<ts.Identifier>(),
            undefined
          ),
          ident
        ),
        filename.ts()
      ),
      this
    );
  },
  Statement_print(consoleLog, _0, expr, _1) {
    let console = setTextRange(
      ts.factory.createIdentifier("console"),
      consoleLog
    );

    let log = setTextRange(ts.factory.createIdentifier("log"), consoleLog);

    let cLog = setTextRange(
      ts.factory.createPropertyAccessExpression(console, log),
      consoleLog
    );

    return setTextRange(
      ts.factory.createCallExpression(cLog, undefined, [expr.ts()]),
      this
    );
  },
  Statement_typed_assignment(node) {
    return node.ts();
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
    throw new Error("`sign` nodes should never directly be evaluated.");
  },
  space(_) {
    throw new Error("`space` nodes should never directly be evaluated.");
  },
  statementTerminator(_) {
    return setTextRange(
      ts.factory.createToken(ts.SyntaxKind.SemicolonToken),
      this
    );
  },
  statementTerminator_semicolon(_0, _1) {
    throw new Error(
      "`statementTerminator_semicolon` nodes should never directly be evaluated."
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
    return setTextRange(ts.factory.createStringLiteral(char), node);
  },
  string_bit_character(_) {
    throw new Error(
      "`string_bit_character` nodes should never directly be evaluated."
    );
  },
  string_bit_escape(_0, _1) {
    throw new Error(
      "`string_bit_escape` nodes should never directly be evaluated."
    );
  },
  string_bit_escape_sequence(_0, _1) {
    throw new Error(
      "`string_bit_escape_sequence` nodes should never directly be evaluated."
    );
  },
  string_bit_hex_sequence(_0, _1, _2) {
    throw new Error(
      "`string_bit_hex_sequence` nodes should never directly be evaluated."
    );
  },
  string_bit_unicode_code_point_sequence(_0, _1, _2) {
    throw new Error(
      "`string_bit_unicode_code_point_sequence` nodes should never directly be evaluated."
    );
  },
  string_bit_unicode_sequence(_0, _1, _2, _3, _4) {
    throw new Error(
      "`string_bit_unicode_sequence` nodes should never directly be evaluated."
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
  string_interpolatable(_0, headNode, _1, spansNode, _2) {
    let head = headNode.ts<ts.TemplateHead>();
    let spans = spansNode.tsa<ts.TemplateSpan>();

    if (spans.length == 0) {
      return setTextRange(
        ts.factory.createNoSubstitutionTemplateLiteral(head.text, head.rawText),
        this
      );
    }

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
  TernaryExp(node) {
    return node.ts();
  },
  TernaryExp_symbolic(condition, questionToken, ifTrue, colonToken, ifFalse) {
    return setTextRange(
      ts.factory.createConditionalExpression(
        condition.ts(),
        setTextRange(
          ts.factory.createToken(ts.SyntaxKind.QuestionToken),
          questionToken
        ),
        ifTrue.ts(),
        setTextRange(
          ts.factory.createToken(ts.SyntaxKind.ColonToken),
          colonToken
        ),
        ifFalse.ts()
      ),
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
  export interface Node extends grammar.StorymaticDict {}
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
