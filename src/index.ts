import * as ohm from "ohm-js";
import * as ts from "typescript";
import * as grammar from "./grammar.js";

let story = grammar as any as grammar.StorymaticGrammar;
let semantics = story.createSemantics();

export function makeCompilerOptions(flags: Flags = {}): ts.CompilerOptions {
  if (flags.typescript)
    throw new Error(
      "TypeScript flag may not be active when creating compiler options."
    );

  return {
    module: flags.module,
    target: flags.target,
    jsx: flags.jsx ? ts.JsxEmit.React : ts.JsxEmit.Preserve,
    jsxFactory: flags.jsx || undefined,
    strict: true,
    allowJs: true,
    checkJs: true,
    skipLibCheck: true,
    allowSyntheticDefaultImports: true,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
  };
}

export function compile(text: string) {
  let match = story.match(text);
  if (match.failed()) throw new SyntaxError(match.message);
  return semantics(match).ts<ts.SourceFile>();
}

export function transpile(node: ts.Node, flags: Flags = {}) {
  if (flags.typescript && flags.module)
    throw new Error("Module and TypeScript options are mutually exclusive.");

  if (flags.typescript && flags.target)
    throw new Error("Target and TypeScript options are mutually exclusive.");

  if (flags.typescript && flags.jsx)
    throw new Error("JSX and TypeScript options are mutually exclusive.");

  let source = ts.createSourceFile(
    "",
    "",
    ts.ScriptTarget.Latest,
    undefined,
    ts.ScriptKind.TSX
  );

  let printer = ts.createPrinter({});
  let text = printer.printNode(ts.EmitHint.Unspecified, node, source);

  if (flags.typescript) return text;

  let transpiled = ts.transpileModule(text, {
    compilerOptions: makeCompilerOptions(flags),
  });

  return transpiled.outputText;
}

export interface Flags {
  typescript?: boolean;
  module?: ts.ModuleKind;
  target?: ts.ScriptTarget;
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
    return setTextRange(
      ts.factory.createNodeArray(children.map((e) => e.ts())),
      this
    );
  },

  GenericTypeArgumentList(node) {
    return node.tsa();
  },
  GenericTypeArgumentList_with_args(node) {
    return node.tsa();
  },
  GenericTypeArgumentList_empty() {
    return setTextRange(ts.factory.createNodeArray([]), this);
  },
  GenericTypeParameterList(_0, params, _1) {
    return params.tsa();
  },
  NonemptyGenericTypeArgumentList(_0, typeArgs, _1) {
    return setTextRange(typeArgs.tsa(), this);
  },
  ParameterList(node) {
    return node.tsa();
  },
  ParameterList_params(paramNodes, _, rest) {
    let params = paramNodes.tsa<ts.ParameterDeclaration>();

    if (rest.sourceString) {
      return setTextRange(
        ts.factory.createNodeArray(
          params.concat(rest.child(0).ts<ts.ParameterDeclaration>())
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
  TypeParameterList(node) {
    return node.tsa();
  },
  TypeParameterList_params(paramNodes, _, rest) {
    let params = paramNodes.tsa<ts.ParameterDeclaration>();

    if (rest.sourceString) {
      return setTextRange(
        ts.factory.createNodeArray(
          params.concat(rest.child(0).ts<ts.ParameterDeclaration>())
        ),
        this
      );
    } else {
      return setTextRange(params, this);
    }
  },
  TypeParameterList_rest_params(rest) {
    return setTextRange(ts.factory.createNodeArray([rest.ts()]), this);
  },
});

semantics.addOperation<ts.Node | undefined>("tsn(map)", {
  _terminal() {
    let args = this.args.map as Record<string, ts.Node>;
    let res = args[this.sourceString];
    if (!res) return undefined;
    return setTextRange(res, this);
  },
  _nonterminal() {
    let args = this.args.map as Record<string, ts.Node>;
    let res = args[this.sourceString];
    if (!res) return undefined;
    return setTextRange(res, this);
  },
  _iter() {
    let args = this.args.map as Record<string, ts.Node>;
    let res = args[this.sourceString];
    if (!res) return undefined;
    return setTextRange(res, this);
  },
});

function bindingToAssignment(
  bound:
    | ts.Identifier
    | ts.BindingElement
    | ts.ObjectBindingPattern
    | ts.ArrayBindingPattern
): ts.Expression {
  if (bound.kind == ts.SyntaxKind.Identifier) {
    return bound;
  } else if (bound.kind == ts.SyntaxKind.BindingElement) {
    if (bound.dotDotDotToken)
      return ts.setTextRange(
        ts.factory.createSpreadElement(bindingToAssignment(bound.name)),
        bound
      );

    if (bound.propertyName)
      return ts.setTextRange(
        ts.factory.createPropertyAssignment(
          bound.propertyName,
          bindingToAssignment(bound.name)
        ),
        bound
      ) as any;

    if (bound.initializer)
      return ts.setTextRange(
        ts.factory.createAssignment(
          bindingToAssignment(bound.name),
          bound.initializer
        ),
        bound
      );

    return bindingToAssignment(bound.name);
  } else if (bound.kind == ts.SyntaxKind.ArrayBindingPattern) {
    return ts.setTextRange(
      ts.factory.createArrayLiteralExpression(
        bound.elements.map((element) => bindingToAssignment(element as any))
      ),
      bound
    );
  } else if (bound.kind == ts.SyntaxKind.ObjectBindingPattern) {
    return ts.setTextRange(
      ts.factory.createObjectLiteralExpression(
        bound.elements.map((element) => bindingToAssignment(element) as any)
      ),
      bound
    );
  }

  throw new Error(
    "`bindingToAssignment` expects an Identifier, BindingElement or BindingPattern."
  );
}

function makeAssignment(name: string, value: ts.Expression) {
  return ts.setTextRange(
    ts.factory.createVariableStatement(
      undefined,
      ts.setTextRange(
        ts.factory.createVariableDeclarationList(
          [
            ts.setTextRange(
              ts.factory.createVariableDeclaration(
                name,
                undefined,
                undefined,
                value
              ),
              value
            ),
          ],
          ts.NodeFlags.Let
        ),
        value
      )
    ),
    value
  );
}

function transformer(context: ts.TransformationContext) {
  return (node: ts.Block) => {
    interface FunctionScope {
      isAsync: boolean;
      isGenerator: boolean;
    }

    interface BlockScope {
      localVars: string[];
      exclude: string[];
    }

    function visitAssignment(
      node: ts.Node,
      fnScope: FunctionScope,
      blockScope: BlockScope
    ) {
      if (ts.isIdentifier(node)) {
        blockScope.localVars.push(node.text);
      } else if (ts.isSpreadElement(node)) {
        visitAssignment(node.expression, fnScope, blockScope);
      } else if (ts.isPropertyAssignment(node)) {
        visitAssignment(node.initializer, fnScope, blockScope);
      } else if (ts.isArrayLiteralExpression(node)) {
        node.elements.map((node) => visitAssignment(node, fnScope, blockScope));
      } else if (ts.isObjectLiteralExpression(node)) {
        node.properties.map((node) =>
          visitAssignment(node, fnScope, blockScope)
        );
      }
    }

    function visitBinding(
      node: ts.Node,
      fnScope: FunctionScope,
      blockScope: BlockScope
    ) {
      if (ts.isIdentifier(node)) {
        blockScope.exclude.push(node.text);
      } else if (ts.isBindingElement(node)) {
        visitBinding(node.name, fnScope, blockScope);
      } else if (ts.isArrayBindingPattern(node)) {
        node.elements.map((node) => visitBinding(node, fnScope, blockScope));
      } else if (ts.isObjectBindingPattern(node)) {
        node.elements.map((node) => visitBinding(node, fnScope, blockScope));
      }
    }

    function visit(
      node: ts.Node,
      fnScope: FunctionScope,
      blockScope: BlockScope,
      exclude?: ts.BindingName[]
    ): ts.Node {
      if (
        node.kind == ts.SyntaxKind.FunctionDeclaration ||
        node.kind == ts.SyntaxKind.FunctionExpression ||
        node.kind == ts.SyntaxKind.ArrowFunction
      ) {
        let fn = node as
          | ts.FunctionDeclaration
          | ts.FunctionExpression
          | ts.ArrowFunction;

        let scope: FunctionScope = { isAsync: false, isGenerator: false };

        fn = ts.visitEachChild(
          fn,
          (node) =>
            visit(
              node,
              scope,
              blockScope,
              fn.parameters.flatMap((e) => e.name)
            ),
          context
        );

        let asterisk = scope.isGenerator
          ? ts.factory.createToken(ts.SyntaxKind.AsteriskToken)
          : undefined;

        let asyncModifier = scope.isAsync
          ? [ts.factory.createToken(ts.SyntaxKind.AsyncKeyword)]
          : [];

        let modifiers = fn.modifiers?.concat(asyncModifier) || asyncModifier;

        if (fn.kind == ts.SyntaxKind.FunctionExpression) {
          return ts.factory.updateFunctionExpression(
            fn,
            modifiers,
            asterisk,
            fn.name,
            fn.typeParameters,
            fn.parameters,
            fn.type,
            fn.body
          );
        }

        if (fn.kind == ts.SyntaxKind.FunctionDeclaration) {
          return ts.factory.updateFunctionDeclaration(
            fn,
            fn.decorators,
            modifiers,
            asterisk,
            fn.name,
            fn.typeParameters,
            fn.parameters,
            fn.type,
            fn.body
          );
        }

        if (fn.kind == ts.SyntaxKind.ArrowFunction) {
          return ts.factory.updateArrowFunction(
            fn,
            modifiers,
            fn.typeParameters,
            fn.parameters,
            fn.type,
            fn.equalsGreaterThanToken,
            fn.body
          );
        }
      }

      if (node.kind == ts.SyntaxKind.Block) {
        let block = node as ts.Block;
        let scope: BlockScope = {
          localVars: [],
          exclude: blockScope.exclude.concat(blockScope.localVars),
        };

        exclude?.map((name) => visitBinding(name, fnScope, scope));

        block = ts.visitEachChild(
          block,
          (node) => visit(node, fnScope, scope),
          context
        );

        let pos = { pos: block.pos, end: block.pos };

        let names = [
          ...new Set(
            scope.localVars
              .filter((name) => !scope.exclude.includes(name))
              .sort()
          ),
        ];

        let decl = ts.setTextRange(
          ts.factory.createVariableStatement(
            undefined,
            ts.setTextRange(
              ts.factory.createVariableDeclarationList(
                names.map((name) =>
                  ts.setTextRange(
                    ts.factory.createVariableDeclaration(name),
                    pos
                  )
                ),
                ts.NodeFlags.Let
              ),
              pos
            )
          ),
          pos
        );

        if (names.length)
          return ts.setTextRange(
            ts.factory.createBlock([decl, ...block.statements], true),
            block
          );

        return block;
      }

      if (node.kind == ts.SyntaxKind.BinaryExpression) {
        let bin = node as ts.BinaryExpression;

        if (
          ts.SyntaxKind.FirstAssignment <= bin.operatorToken.kind &&
          ts.SyntaxKind.LastAssignment >= bin.operatorToken.kind
        ) {
          visitAssignment(bin.left, fnScope, blockScope);

          return ts.visitEachChild(
            node,
            (node) => visit(node, fnScope, blockScope),
            context
          );
        }
      }

      if (ts.isVariableStatement(node)) {
        node.declarationList.declarations.map((node) =>
          visitBinding(node.name, fnScope, blockScope)
        );
      }

      if (node.kind == ts.SyntaxKind.YieldExpression) {
        fnScope.isGenerator = true;
      }

      if (node.kind == ts.SyntaxKind.AwaitExpression) {
        fnScope.isAsync = true;
      }

      return ts.visitEachChild(
        node,
        (node) => visit(node, fnScope, blockScope),
        context
      );
    }

    let fnScope: FunctionScope = { isAsync: false, isGenerator: false };
    let blockScope: BlockScope = { localVars: [], exclude: [] };
    let result = ts.visitNode(node, (node) => visit(node, fnScope, blockScope));
    return result;
  };
}

function traverseScript(node: ts.SourceFile) {
  let result = ts.transform<ts.Block>(ts.factory.createBlock(node.statements), [
    transformer,
  ]);

  return ts.setTextRange(
    ts.factory.createSourceFile(
      result.transformed[0].statements,
      ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
      0
    ),
    node
  );
}

semantics.addOperation<ts.Node>("ts", {
  Accessor(base, addons) {
    let expr = base.ts<ts.Expression>();

    for (let addon of addons.tsa<ts.Expression | ts.Identifier>()) {
      if (
        addon.kind == ts.SyntaxKind.Identifier ||
        addon.kind == ts.SyntaxKind.PrivateIdentifier
      ) {
        expr = ts.factory.createPropertyAccessExpression(
          expr,
          addon as ts.MemberName
        );
      } else if (addon.kind == ts.SyntaxKind.ParenthesizedExpression) {
        expr = ts.factory.createElementAccessExpression(
          expr,
          (addon as ts.ParenthesizedExpression).expression
        );
      } else {
        expr = ts.factory.createElementAccessExpression(expr, addon);
      }

      expr = ts.setTextRange(expr, {
        pos: base.source.startIdx,
        end: addon.end,
      });
    }

    return setTextRange(expr, this);
  },
  AccessorAddon(node) {
    return node.ts();
  },
  AccessorAddon_computed_member_access(_0, expr, _1) {
    return setTextRange(
      ts.factory.createParenthesizedExpression(expr.ts()),
      this
    );
  },
  AccessorAddon_member_access(_, prop) {
    return prop.ts();
  },
  AccessorAddon_symbol_access(_, symbol) {
    return symbol.ts();
  },
  AccessorBase(node) {
    return node.ts();
  },
  AccessorIdentifierBase(node) {
    return node.ts();
  },
  AccessorPropertyBase(node) {
    return node.ts();
  },
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
  ArgumentList(_) {
    throw new Error("`ArgumentList` nodes should never directly be evaluated.");
  },
  Argument_spread_operator(_, expr) {
    return setTextRange(ts.factory.createSpreadElement(expr.ts()), this);
  },
  ArrayEntry(node) {
    return node.ts();
  },
  ArrayEntry_spread_operator(_, expr) {
    return setTextRange(ts.factory.createSpreadElement(expr.ts()), this);
  },
  Assignable(node) {
    return node.ts();
  },
  AssignableKeyWithRewrite(node) {
    return node.ts();
  },
  AssignableKeyWithRewrite_rewrite(name, _, assignable) {
    return setTextRange(
      ts.factory.createBindingElement(
        undefined,
        name.ts<ts.PropertyName>(),
        assignable.ts<ts.BindingName>()
      ),
      this
    );
  },
  AssignableOrAccessor(node) {
    return node.ts();
  },
  AssignableWithDefault(node) {
    return node.ts();
  },
  AssignableWithDefault_with_default(assignableNode, _, initializer) {
    let assignable = assignableNode.ts<ts.BindingElement>();

    return setTextRange(
      ts.factory.createBindingElement(
        assignable.dotDotDotToken,
        assignable.propertyName,
        assignable.name,
        initializer.ts<ts.Expression>()
      ),
      this
    );
  },
  Assignable_array(_0, elements, _1, dotDotDot, spreadable, _2, _3) {
    let members = elements.tsa<ts.BindingElement>().slice();

    if (spreadable.sourceString) {
      members.push(
        setTextRange(
          ts.factory.createBindingElement(
            setTextRange(
              ts.factory.createToken(ts.SyntaxKind.DotDotDotToken),
              dotDotDot.child(0)
            ),
            undefined,
            spreadable.child(0).ts<ts.BindingName>()
          ),
          this
        )
      );
    }

    return setTextRange(ts.factory.createArrayBindingPattern(members), this);
  },
  Assignable_identifier(node) {
    return setTextRange(
      ts.factory.createBindingElement(
        undefined,
        undefined,
        node.ts<ts.Identifier>()
      ),
      this
    );
  },
  Assignable_object(_0, elements, _1, dotDotDot, spreadable, _2, _3) {
    let members = elements.tsa<ts.BindingElement>().slice();

    if (spreadable.sourceString) {
      members.push(
        setTextRange(
          ts.factory.createBindingElement(
            setTextRange(
              ts.factory.createToken(ts.SyntaxKind.DotDotDotToken),
              dotDotDot.child(0)
            ),
            undefined,
            spreadable.child(0).ts<ts.BindingName>()
          ),
          this
        )
      );
    }

    return setTextRange(ts.factory.createObjectBindingPattern(members), this);
  },
  AssignmentExp(node) {
    return node.ts();
  },
  AssignmentExp_assignment(target, _, expr) {
    let bound = target.ts<
      | ts.BindingElement
      | ts.BindingPattern
      | ts.ElementAccessExpression
      | ts.PropertyAccessExpression
    >();

    if (
      bound.kind == ts.SyntaxKind.BindingElement ||
      bound.kind == ts.SyntaxKind.ArrayBindingPattern ||
      bound.kind == ts.SyntaxKind.ObjectBindingPattern
    ) {
      return setTextRange(
        ts.factory.createAssignment(bindingToAssignment(bound), expr.ts()),
        this
      );
    }

    return setTextRange(ts.factory.createAssignment(bound, expr.ts()), this);
  },
  AssignmentExp_yield(_0, _1, expr) {
    return setTextRange(
      ts.factory.createYieldExpression(undefined, expr.ts<ts.Expression>()),
      this
    );
  },
  AssignmentExp_yield_from(_0, _1, from, _2, expr) {
    return setTextRange(
      ts.factory.createYieldExpression(
        setTextRange(ts.factory.createToken(ts.SyntaxKind.AsteriskToken), from),
        expr.ts<ts.Expression>()
      ),
      this
    );
  },
  alnum(_) {
    throw new Error("`alnum` nodes should never directly be evaluated.");
  },
  applySyntactic(node) {
    return node.ts();
  },
  BitwiseExp(node) {
    return node.ts();
  },
  BitwiseExp_left_shift(left, _, right) {
    return setTextRange(
      ts.factory.createLeftShift(left.ts(), right.ts()),
      this
    );
  },
  BitwiseExp_right_shift(left, _, right) {
    return setTextRange(
      ts.factory.createRightShift(left.ts(), right.ts()),
      this
    );
  },
  BitwiseExp_unsigned_right_shift(left, _, right) {
    return setTextRange(
      ts.factory.createUnsignedRightShift(left.ts(), right.ts()),
      this
    );
  },
  BlockFunction(
    _export,
    _0,
    _1,
    _2,
    ident,
    generics,
    _3,
    _4,
    _5,
    params,
    _6,
    returnType,
    body
  ) {
    return setTextRange(
      ts.factory.createFunctionDeclaration(
        undefined,
        _export.sourceString
          ? [
              setTextRange(
                ts.factory.createToken(ts.SyntaxKind.ExportKeyword),
                _export
              ),
            ]
          : [],
        undefined,
        ident.ts<ts.Identifier>(),
        generics.child(0)?.tsa(),
        params.child(0)?.tsa(),
        returnType.child(0)?.ts<ts.TypeNode>(),
        body.ts<ts.Block>()
      ),
      this
    );
  },
  BlockFunctionType(
    _0,
    _1,
    name,
    qMark,
    generics,
    _2,
    _3,
    _4,
    params,
    _5,
    returnType
  ) {
    return setTextRange(
      ts.factory.createMethodSignature(
        undefined,
        name.ts<ts.PropertyName>(),
        qMark.tsn({ "?": ts.factory.createToken(ts.SyntaxKind.QuestionToken) }),
        generics.child(0)?.tsa(),
        params.child(0)?.tsa(),
        returnType.ts<ts.TypeNode>()
      ),
      this
    );
  },
  bigint(_0, _1, _2) {
    return setTextRange(
      ts.factory.createBigIntLiteral(this.sourceString),
      this
    );
  },
  block_comment(_0, _1, _2) {
    throw new Error(
      "`block_comment` nodes should never directly be evaluated."
    );
  },
  boolean(value) {
    return value.tsn({
      true: ts.factory.createTrue(),
      false: ts.factory.createFalse(),
    })!;
  },
  CaseClause(_0, _1, expr, _2) {
    return setTextRange(ts.factory.createCaseClause(expr.ts(), []), this);
  },
  CaseStatement(clauseNodes, blockNode) {
    let clauses = [...clauseNodes.tsa<ts.CaseClause>()];
    let finalClause = clauses.pop()!;

    let breakStatement = ts.setTextRange(ts.factory.createBreakStatement(), {
      pos: blockNode.source.startIdx,
      end: blockNode.source.endIdx,
    });

    let block = blockNode.ts<ts.Block>();
    let statements = block.statements.concat(breakStatement);

    let clause = ts.setTextRange(
      ts.factory.createCaseClause(finalClause.expression, [
        ts.setTextRange(ts.factory.createBlock(statements, true), block),
      ]),
      finalClause
    );

    return setTextRange(
      ts.factory.createCaseBlock(clauses.concat(clause)),
      this
    );
  },
  CaseTerminator(_) {
    throw "`CaseTerminator` nodes should never directly be evaluated.";
  },
  CaseTerminator_final(_) {
    throw "`CaseTerminator_final` nodes should never directly be evaluated.";
  },
  CaseTerminator_terminator(_) {
    throw "`CaseTerminator_terminator` nodes should never directly be evaluated.";
  },
  CatchStatement(_0, _1, ident, _2, _3, _4, block) {
    return setTextRange(
      ts.factory.createCatchClause(
        ident.child(0)?.ts<ts.Identifier>(),
        block.ts()
      ),
      this
    );
  },
  ClassCreationExp(node) {
    return node.ts();
  },
  ClassCreationExp_class_creation_no_args(_0, _1, target) {
    return setTextRange(
      ts.factory.createNewExpression(target.ts(), undefined, []),
      this
    );
  },
  ClassCreationExp_class_creation_symbolic(
    _0,
    _1,
    target,
    typeArgs,
    _2,
    args,
    _3
  ) {
    return setTextRange(
      ts.factory.createNewExpression(target.ts(), typeArgs.tsa(), args.tsa()),
      this
    );
  },
  ClassDeclaration(
    _export,
    _0,
    _1,
    _2,
    ident,
    generics,
    _3,
    _4,
    _5,
    extendTarget,
    _6,
    _7,
    _8,
    implementTargets,
    _9,
    elements,
    _10
  ) {
    let heritage: ts.HeritageClause[] = [];

    if (extendTarget.sourceString) {
      heritage.push(
        setTextRange(
          ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [
            extendTarget.child(0).ts(),
          ]),
          extendTarget.child(0)
        )
      );
    }

    if (implementTargets.sourceString) {
      heritage.push(
        setTextRange(
          ts.factory.createHeritageClause(
            ts.SyntaxKind.ImplementsKeyword,
            implementTargets.child(0).tsa()
          ),
          implementTargets.child(0)
        )
      );
    }

    return setTextRange(
      ts.factory.createClassDeclaration(
        undefined,
        _export.sourceString
          ? [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)]
          : [],
        ident.ts<ts.Identifier>(),
        generics.tsa(),
        heritage,
        elements.tsa()
      ),
      this
    );
  },
  ClassElement(node) {
    return node.ts();
  },
  ClassElement_index_signature(signature, _) {
    return signature.ts();
  },
  ClassElement_method(method) {
    return method.ts();
  },
  ClassElement_property(
    privacy,
    readonly,
    _0,
    _1,
    name,
    modifier,
    _2,
    type,
    _3,
    initializer,
    _4
  ) {
    let modifiers: ts.Modifier[] = [];
    if (privacy.sourceString) modifiers.push(privacy.ts());
    if (readonly.sourceString)
      modifiers.push(
        setTextRange(
          ts.factory.createToken(ts.SyntaxKind.ReadonlyKeyword),
          readonly
        )
      );

    let exclOrQues = modifier.child(0)?.tsn({
      "!": ts.factory.createToken(ts.SyntaxKind.ExclamationToken),
      "?": ts.factory.createToken(ts.SyntaxKind.QuestionToken),
    });

    return setTextRange(
      ts.factory.createPropertyDeclaration(
        undefined,
        modifiers,
        name.ts<ts.PropertyName>(),
        exclOrQues,
        type.child(0)?.ts<ts.TypeNode>(),
        initializer.child(0)?.ts<ts.Expression>()
      ),
      this
    );
  },
  ClassElement_static_property(
    privacy,
    readonly,
    _0,
    atAt,
    name,
    modifier,
    _2,
    type,
    _3,
    initializer,
    _4
  ) {
    let modifiers: ts.Modifier[] = [];
    if (privacy.sourceString) modifiers.push(privacy.ts());
    modifiers.push(
      setTextRange(ts.factory.createToken(ts.SyntaxKind.StaticKeyword), atAt)
    );
    if (readonly.sourceString)
      modifiers.push(
        setTextRange(
          ts.factory.createToken(ts.SyntaxKind.ReadonlyKeyword),
          readonly
        )
      );

    let ques = modifier.child(0)?.tsn({
      "?": ts.factory.createToken(ts.SyntaxKind.QuestionToken),
    });

    return setTextRange(
      ts.factory.createPropertyDeclaration(
        undefined,
        modifiers,
        name.ts<ts.PropertyName>(),
        ques,
        type.child(0)?.ts<ts.TypeNode>(),
        initializer.child(0)?.ts<ts.Expression>()
      ),
      this
    );
  },
  ClassElement_static_index_signature(signature, _) {
    return signature.ts();
  },
  ClassElement_static_method(method) {
    return method.ts();
  },
  CompareExp(node) {
    return node.ts();
  },
  CompareExp_greater_than(left, _, right) {
    return setTextRange(
      ts.factory.createGreaterThan(left.ts(), right.ts()),
      this
    );
  },
  CompareExp_greater_than_equal(left, _, right) {
    return setTextRange(
      ts.factory.createGreaterThanEquals(left.ts(), right.ts()),
      this
    );
  },
  CompareExp_instanceof(left, _0, _1, _2, _3, _4, right) {
    return setTextRange(
      ts.factory.createBinaryExpression(
        left.ts(),
        ts.SyntaxKind.InstanceOfKeyword,
        right.ts()
      ),
      this
    );
  },
  CompareExp_less_than(left, _, right) {
    return setTextRange(ts.factory.createLessThan(left.ts(), right.ts()), this);
  },
  CompareExp_less_than_equal(left, _, right) {
    return setTextRange(
      ts.factory.createLessThanEquals(left.ts(), right.ts()),
      this
    );
  },
  CompareExp_not_instanceof(left, _0, _1, _2, _3, _4, right) {
    return setTextRange(
      ts.factory.createLogicalNot(
        setTextRange(
          ts.factory.createBinaryExpression(
            left.ts(),
            ts.SyntaxKind.InstanceOfKeyword,
            right.ts()
          ),
          this
        )
      ),
      this
    );
  },
  CompareExp_not_within(left, _0, _1, _2, _3, _4, right) {
    return setTextRange(
      ts.factory.createLogicalNot(
        setTextRange(
          ts.factory.createBinaryExpression(
            left.ts(),
            ts.SyntaxKind.InKeyword,
            right.ts()
          ),
          this
        )
      ),
      this
    );
  },
  CompareExp_within(left, _0, _1, _2, _3, _4, right) {
    return setTextRange(
      ts.factory.createBinaryExpression(
        left.ts(),
        ts.SyntaxKind.InKeyword,
        right.ts()
      ),
      this
    );
  },
  ConditionalType(node) {
    return node.ts();
  },
  ConditionalType_conditional(
    target,
    _0,
    _1,
    _2,
    mustBe,
    _3,
    ifTrue,
    _4,
    ifFalse
  ) {
    return setTextRange(
      ts.factory.createConditionalTypeNode(
        target.ts(),
        mustBe.ts(),
        ifTrue.ts(),
        ifFalse.ts()
      ),
      this
    );
  },
  char(_) {
    throw "`char` nodes should never directly be evaluated.";
  },
  colonTerminator(_) {
    throw "`colonTerminator` nodes should never directly be evaluated.";
  },
  colonTerminator_colon(_0, _1) {
    throw "`colonTerminator_colon` nodes should never directly be evaluated.";
  },
  DefaultStatement(_0, _1, block) {
    let _default = setTextRange(
      ts.factory.createDefaultClause([block.ts()]),
      this
    );

    return setTextRange(ts.factory.createCaseBlock([_default]), this);
  },
  decimalNumber(number) {
    return number.ts();
  },
  digit(_) {
    throw "`digit` nodes should never directly be evaluated.";
  },
  EmptyListOf() {
    throw new Error("`EmptyListOf` nodes should never directly be evaluated.");
  },
  EnumMember(node) {
    return node.ts();
  },
  EnumMember_assigned(key, _0, value, _1) {
    return setTextRange(
      ts.factory.createEnumMember(
        key.ts<ts.PropertyName>(),
        value.ts<ts.Expression>()
      ),
      this
    );
  },
  EnumMember_auto_assign(key, _) {
    return setTextRange(
      ts.factory.createEnumMember(key.ts<ts.PropertyName>()),
      this
    );
  },
  EnumStatement(_export, _0, _1, _2, ident, _3, members, _4) {
    return setTextRange(
      ts.factory.createEnumDeclaration(
        undefined,
        _export.sourceString
          ? [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)]
          : undefined,
        ident.ts<ts.Identifier>(),
        members.tsa()
      ),
      this
    );
  },
  EqualityExp(node) {
    return node.ts();
  },
  EqualityExp_equal_to(left, _, right) {
    return setTextRange(
      ts.factory.createStrictEquality(left.ts(), right.ts()),
      this
    );
  },
  EqualityExp_not_equal_to(left, _, right) {
    return setTextRange(
      ts.factory.createStrictInequality(left.ts(), right.ts()),
      this
    );
  },
  Expression(node) {
    return node.ts();
  },
  Extendable(base, _0, accessors, generics, _1) {
    let ident = base.ts<ts.Expression>();

    for (let accessor of accessors.tsa<ts.Identifier>()) {
      ident = ts.setTextRange(
        ts.factory.createPropertyAccessExpression(ident, accessor),
        { pos: base.source.startIdx, end: accessor.end }
      );
    }

    return setTextRange(
      ts.factory.createExpressionWithTypeArguments(ident, generics.tsa()),
      this
    );
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
  ExportedVariableAssignment(_export, _0, assignable, _1, type, _2, expr) {
    let declaration = setTextRange(
      ts.factory.createVariableDeclaration(
        assignable.ts<ts.BindingName>(),
        undefined,
        type.child(0)?.ts<ts.TypeNode>(),
        expr.ts<ts.Expression>()
      ),
      this
    );

    let list = setTextRange(
      ts.factory.createVariableDeclarationList([declaration], ts.NodeFlags.Let),
      this
    );

    return setTextRange(
      ts.factory.createVariableStatement(
        [
          setTextRange(
            ts.factory.createToken(ts.SyntaxKind.ExportKeyword),
            _export
          ),
        ],
        list
      ),
      this
    );
  },
  emptyListOf() {
    throw new Error("`emptyListOf` nodes should never directly be evaluated.");
  },
  equalityExpWords(_0, _1, _2) {
    throw new Error(
      "`equalityExpWords` nodes should never directly be evaluated."
    );
  },
  expressionTerminator(_) {
    throw new Error(
      "`expressionTerminator` nodes should never directly be evaluated."
    );
  },
  expressionTerminator_comma(_0, _1) {
    throw new Error(
      "`expressionTerminator_comma` nodes should never directly be evaluated."
    );
  },
  FinallyStatement(_0, _1, block) {
    return block.ts();
  },
  FunctionBody(node) {
    return node.ts();
  },
  FunctionBody_expression(_0, _1, expression) {
    return setTextRange(
      ts.factory.createBlock(
        [ts.factory.createReturnStatement(expression.ts<ts.Expression>())],
        true
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
  GenericTypeArgumentList_with_args(_) {
    throw new Error(
      "`GenericTypeArgumentList_with_args` nodes should never directly be evaluated."
    );
  },
  GenericTypeParameter(name, _0, constraint, _1, defaultType) {
    return setTextRange(
      ts.factory.createTypeParameterDeclaration(
        name.ts<ts.Identifier>(),
        constraint.child(0)?.ts<ts.TypeNode>(),
        defaultType.child(0)?.ts<ts.TypeNode>()
      ),
      this
    );
  },
  GenericTypeParameterList(_0, _1, _2) {
    throw new Error(
      "`GenericTypeParameterList` nodes should never directly be evaluated."
    );
  },
  hexDigit(_) {
    throw new Error("`hexDigit` nodes should never directly be evaluated.");
  },
  hexNumber(_0, _1, _2) {
    return setTextRange(
      ts.factory.createNumericLiteral(
        this.sourceString,
        ts.TokenFlags.HexSpecifier
      ),
      this
    );
  },
  IfStatement(ifUnless, _0, condition, block, _1, _2, _3, elseBlock) {
    let cond = condition.ts<ts.Expression>();

    if (ifUnless.sourceString == "unless")
      cond = ts.setTextRange(ts.factory.createLogicalNot(cond), cond);

    return setTextRange(
      ts.factory.createIfStatement(
        cond,
        block.ts(),
        elseBlock.child(0)?.ts<ts.Block>()
      ),
      this
    );
  },
  Implementable(base, _0, accessors, generics, _1) {
    let ident = base.ts<ts.Expression>();

    for (let accessor of accessors.tsa<ts.Identifier>()) {
      ident = ts.setTextRange(
        ts.factory.createPropertyAccessExpression(ident, accessor),
        { pos: base.source.startIdx, end: accessor.end }
      );
    }

    if (!generics.sourceString) return setTextRange(ident, this);

    return setTextRange(
      ts.factory.createExpressionWithTypeArguments(ident, generics.tsa()),
      this
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
  IndexSignatureType(readonly, prefix, _0, ident, _1, key, _2, _3, value) {
    let modifiers: ts.Modifier[] = [];
    if (prefix.sourceString == "@@")
      modifiers.push(
        setTextRange(
          ts.factory.createToken(ts.SyntaxKind.StaticKeyword),
          prefix
        )
      );
    if (readonly.sourceString)
      modifiers.push(
        setTextRange(
          ts.factory.createToken(ts.SyntaxKind.ReadonlyKeyword),
          readonly
        )
      );

    return setTextRange(
      ts.factory.createIndexSignature(
        undefined,
        modifiers,
        [
          ts.setTextRange(
            ts.factory.createParameterDeclaration(
              undefined,
              undefined,
              undefined,
              ident.ts<ts.Identifier>(),
              undefined,
              key.ts<ts.TypeNode>()
            ),
            { pos: ident.source.startIdx, end: key.source.endIdx }
          ),
        ],
        value.ts()
      ),
      this
    );
  },
  InlineClassDeclaration(
    _0,
    generics,
    _1,
    _2,
    _3,
    extendTarget,
    _4,
    _5,
    _6,
    implementTargets,
    _7,
    elements,
    _8
  ) {
    let heritage: ts.HeritageClause[] = [];

    if (extendTarget.sourceString) {
      heritage.push(
        setTextRange(
          ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [
            extendTarget.child(0).ts(),
          ]),
          extendTarget.child(0)
        )
      );
    }

    if (implementTargets.sourceString) {
      heritage.push(
        setTextRange(
          ts.factory.createHeritageClause(
            ts.SyntaxKind.ImplementsKeyword,
            implementTargets.child(0).tsa()
          ),
          implementTargets.child(0)
        )
      );
    }

    return setTextRange(
      ts.factory.createClassExpression(
        undefined,
        undefined,
        undefined,
        generics.tsa(),
        heritage,
        elements.tsa()
      ),
      this
    );
  },
  InlineFunction(_0, generics, _1, _2, _3, params, _4, returnType, body) {
    return setTextRange(
      ts.factory.createFunctionExpression(
        undefined,
        undefined,
        undefined,
        generics.child(0)?.tsa(),
        params.child(0)?.tsa(),
        returnType.child(0)?.ts<ts.TypeNode>(),
        body.ts<ts.Block>()
      ),
      this
    );
  },
  InlineFunctionType(_0, generics, _1, _2, _3, params, _4, returnType) {
    return setTextRange(
      ts.factory.createFunctionTypeNode(
        generics.child(0)?.tsa(),
        params.child(0)?.tsa(),
        returnType.child(0)?.ts<ts.TypeNode>()
      ),
      this
    );
  },
  InterfaceDeclaration(
    _export,
    _0,
    _1,
    _2,
    ident,
    generics,
    _3,
    _4,
    _5,
    extendTargets,
    _6,
    members,
    _7
  ) {
    let heritage = extendTargets
      .child(0)
      ?.tsa<ts.ExpressionWithTypeArguments>();

    return setTextRange(
      ts.factory.createInterfaceDeclaration(
        undefined,
        _export.sourceString
          ? [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)]
          : undefined,
        ident.ts<ts.Identifier>(),
        generics.child(0)?.tsa(),
        heritage && [
          ts.factory.createHeritageClause(
            ts.SyntaxKind.ExtendsKeyword,
            heritage
          ),
        ],
        members.tsa()
      ),
      this
    );
  },
  IntersectionType(node) {
    let iter = node.asIteration();
    if (iter.children.length == 1) return iter.child(0).ts();

    return setTextRange(
      ts.factory.createIntersectionTypeNode(node.tsa()),
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
  ListOf(_) {
    throw new Error("`ListOf` nodes should never directly be evaluated.");
  },
  ListOfTwo(_0, _1, _2) {
    throw new Error("`ListOfTwo` nodes should never directly be evaluated.");
  },
  LiteralExp(node) {
    return node.ts();
  },
  LiteralExp_array(_0, entries, _1, _2) {
    return setTextRange(
      ts.factory.createArrayLiteralExpression(entries.tsa()),
      this
    );
  },
  LiteralExp_object(_0, entries, _1, _2) {
    return setTextRange(
      ts.factory.createObjectLiteralExpression(entries.tsa()),
      this
    );
  },
  LiteralExp_parenthesized(_0, expr, _1) {
    return setTextRange(
      ts.factory.createParenthesizedExpression(expr.ts()),
      this
    );
  },
  LiteralType(node) {
    return node.ts();
  },
  LiteralType_construct(_0, _1, func) {
    let fn = func.ts<ts.FunctionTypeNode>();

    return setTextRange(
      ts.factory.createConstructorTypeNode(
        fn.modifiers,
        fn.typeParameters,
        fn.parameters,
        fn.type
      ),
      this
    );
  },
  LiteralType_infer(_0, _1, ident, _2, _3, constraint) {
    return setTextRange(
      ts.factory.createInferTypeNode(
        ts.setTextRange(
          ts.factory.createTypeParameterDeclaration(
            ident.ts<ts.Identifier>(),
            constraint.child(0)?.ts<ts.TypeNode>()
          ),
          { pos: ident.source.startIdx, end: this.source.endIdx }
        )
      ),
      this
    );
  },
  LiteralType_parenthesized(_0, expr, _1) {
    return setTextRange(ts.factory.createParenthesizedType(expr.ts()), this);
  },
  LiteralExp_self(_) {
    return setTextRange(ts.factory.createIdentifier("$self"), this);
  },
  LiteralExp_static_self(_) {
    return setTextRange(ts.factory.createIdentifier("$static"), this);
  },
  LiteralExp_topic_token(_) {
    return setTextRange(ts.factory.createIdentifier("$"), this);
  },
  LiteralType_type_args(expr, args) {
    return setTextRange(
      ts.factory.createTypeReferenceNode(expr.ts<ts.EntityName>(), args.tsa()),
      this
    );
  },
  LogicalAndExp(node) {
    return node.ts();
  },
  LogicalAndExp_logical_and(left, _0, _1, _2, right) {
    return setTextRange(
      ts.factory.createLogicalAnd(left.ts(), right.ts()),
      this
    );
  },
  LogicalOrExp(node) {
    return node.ts();
  },
  LogicalOrExp_logical_nullish_coalescing(left, _, right) {
    return setTextRange(
      ts.factory.createBinaryExpression(
        left.ts(),
        ts.SyntaxKind.QuestionQuestionToken,
        right.ts()
      ),
      this
    );
  },
  LogicalOrExp_logical_or(left, _0, _1, _2, right) {
    return setTextRange(
      ts.factory.createLogicalOr(left.ts(), right.ts()),
      this
    );
  },
  letter(_) {
    throw new Error("`letter` nodes should never directly be evaluated.");
  },
  lineContinuer(_) {
    throw new Error(
      "`lineContinuer` nodes should never directly be evaluated."
    );
  },
  lineTerminator(_0, _1, _2) {
    throw new Error(
      "`lineTerminator` nodes should never directly be evaluated."
    );
  },
  line_comment(_0, _1, _2) {
    throw new Error("`line_comment` nodes should never directly be evaluated.");
  },
  listOf(_) {
    throw new Error("`listOf` nodes should never directly be evaluated.");
  },
  MemberAccessExp(node) {
    return node.ts();
  },
  MemberAccessExp_as_expression(expr, _0, _1, _2, type) {
    return setTextRange(
      ts.factory.createAsExpression(expr.ts(), type.ts()),
      this
    );
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
  MemberAccessExp_dispatch_event(expr, qMark, _0, eventName, _1, args, _2) {
    return setTextRange(
      ts.factory.createCallExpression(
        ts.setTextRange(
          ts.factory.createIdentifier(
            qMark.sourceString ? "$emitChain" : "$emit"
          ),
          {
            pos: this.source.startIdx,
            end: this.source.startIdx,
          }
        ),
        undefined,
        [
          expr.ts(),
          setTextRange(
            ts.factory.createStringLiteral(eventName.sourceString),
            eventName
          ),
          ...(args.child(0)?.tsa<ts.Expression>() || []),
        ]
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
  MemberAccessExp_listen_event(expr, qMark, _0, eventName, _1, args, _2) {
    return setTextRange(
      ts.factory.createCallExpression(
        ts.setTextRange(
          ts.factory.createIdentifier(
            qMark.sourceString ? "$listenChain" : "$listen"
          ),
          {
            pos: this.source.startIdx,
            end: this.source.startIdx,
          }
        ),
        undefined,
        [
          expr.ts(),
          setTextRange(
            ts.factory.createStringLiteral(eventName.sourceString),
            eventName
          ),
          ...(args.child(0)?.tsa<ts.Expression>() || []),
        ]
      ),
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
  MemberAccessType(node) {
    return node.ts();
  },
  MemberAccessType_array(element, _0, _1) {
    return setTextRange(ts.factory.createArrayTypeNode(element.ts()), this);
  },
  MemberAccessType_member_access(target, _0, key, _1) {
    return setTextRange(
      ts.factory.createIndexedAccessTypeNode(target.ts(), key.ts()),
      this
    );
  },
  MemberAccessType_named_tuple(_0, elements, _1) {
    return setTextRange(ts.factory.createTupleTypeNode(elements.tsa()), this);
  },
  MemberAccessType_object(_0, members, _1) {
    return setTextRange(ts.factory.createTypeLiteralNode(members.tsa()), this);
  },
  MemberAccessType_tuple(_0, elements, _1) {
    return setTextRange(ts.factory.createTupleTypeNode(elements.tsa()), this);
  },
  Method(
    privacy,
    _0,
    _1,
    prefix,
    name,
    qMark,
    generics,
    _3,
    _4,
    _5,
    params,
    _6,
    returnType,
    body
  ) {
    let block = body.ts<ts.Block>();
    let range = { pos: block.pos, end: block.pos };

    let $void = ts.setTextRange(ts.factory.createVoidZero(), range);
    let $this = ts.setTextRange(ts.factory.createIdentifier("this"), range);
    let $static = ts.setTextRange(
      ts.factory.createPropertyAccessExpression($this, "constructor"),
      range
    );

    if (prefix.sourceString == "@") {
      block = ts.setTextRange(
        ts.factory.createBlock(
          [
            makeAssignment("$self", $this),
            makeAssignment("$static", $static),
            ...block.statements,
          ],
          true
        ),
        block
      );
    } else if (prefix.sourceString == "@@") {
      block = ts.setTextRange(
        ts.factory.createBlock(
          [
            makeAssignment("$self", $void),
            makeAssignment("$static", $this),
            ...block.statements,
          ],
          true
        ),
        block
      );
    }

    return setTextRange(
      ts.factory.createMethodDeclaration(
        undefined,
        privacy.sourceString ? [privacy.ts()] : [],
        undefined,
        name.ts<ts.PropertyName>(),
        qMark.tsn({ "?": ts.factory.createToken(ts.SyntaxKind.QuestionToken) }),
        generics.child(0)?.tsa(),
        params.child(0)?.tsa(),
        returnType.child(0)?.ts<ts.TypeNode>(),
        block
      ),
      this
    );
  },
  MethodName(node) {
    return node.ts();
  },
  MethodName_computed_key(_0, expr, _1) {
    return setTextRange(ts.factory.createComputedPropertyName(expr.ts()), this);
  },
  MethodName_computed_string_key(node) {
    return setTextRange(ts.factory.createComputedPropertyName(node.ts()), this);
  },
  MethodName_identifier(ident) {
    return ident.ts();
  },
  MethodName_numerical_key(node) {
    return node.ts();
  },
  MethodName_string_key(node) {
    return node.ts();
  },
  MethodName_symbol(symbol) {
    return setTextRange(
      ts.factory.createComputedPropertyName(symbol.ts()),
      this
    );
  },
  MulExp(node) {
    return node.ts();
  },
  MulExp_division(left, _, right) {
    return setTextRange(ts.factory.createDivide(left.ts(), right.ts()), this);
  },
  MulExp_modulus(left, _, right) {
    return setTextRange(ts.factory.createModulo(left.ts(), right.ts()), this);
  },
  MulExp_multiplication(left, _, right) {
    return setTextRange(ts.factory.createMultiply(left.ts(), right.ts()), this);
  },
  NamedTupleElement(node) {
    return node.ts();
  },
  NamedTupleElement_name_value(name, qMark, _, value) {
    return setTextRange(
      ts.factory.createNamedTupleMember(
        undefined,
        name.ts(),
        qMark.tsn({ "?": ts.factory.createToken(ts.SyntaxKind.QuestionToken) }),
        value.ts()
      ),
      this
    );
  },
  NamedTupleElement_spread_operator(dotDotDot, name, _, value) {
    return setTextRange(
      ts.factory.createNamedTupleMember(
        setTextRange(
          ts.factory.createToken(ts.SyntaxKind.DotDotDotToken),
          dotDotDot
        ),
        name.ts(),
        undefined,
        value.ts()
      ),
      this
    );
  },
  NamespaceDeclaration(_export, _0, _1, _2, ident, block) {
    return setTextRange(
      ts.factory.createModuleDeclaration(
        undefined,
        _export.sourceString
          ? [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)]
          : undefined,
        ident.ts(),
        setTextRange(
          ts.factory.createModuleBlock(block.ts<ts.Block>().statements),
          block
        )
      ),
      this
    );
  },
  NonemptyGenericTypeArgumentList(_0, _1, _2) {
    throw new Error(
      "`NonemptyGenericTypeArgumentList` nodes should never directly be evaluated."
    );
  },
  NonemptyArgumentList(_) {
    throw new Error(
      "`NonemptyArgumentList` nodes should never directly be evaluated."
    );
  },
  NonemptyListOf(_0, _1, _2) {
    throw new Error(
      "`NonemptyListOf` nodes should never directly be evaluated."
    );
  },
  NotExp(node) {
    return node.ts();
  },
  NotExp_await(_0, _1, expr) {
    return setTextRange(ts.factory.createAwaitExpression(expr.ts()), this);
  },
  NotExp_logical_not_symbolic(_, expr) {
    return setTextRange(ts.factory.createLogicalNot(expr.ts()), this);
  },
  NotExp_logical_not_worded(_0, _1, expr) {
    return setTextRange(ts.factory.createLogicalNot(expr.ts()), this);
  },
  NotExp_typeof(_0, _1, _2, expr) {
    return setTextRange(ts.factory.createTypeOfExpression(expr.ts()), this);
  },
  NotExp_unary_minus(_, expr) {
    return setTextRange(
      ts.factory.createPrefixUnaryExpression(
        ts.SyntaxKind.MinusToken,
        expr.ts()
      ),
      this
    );
  },
  NotExp_unary_plus(_, expr) {
    return setTextRange(
      ts.factory.createPrefixUnaryExpression(
        ts.SyntaxKind.PlusToken,
        expr.ts()
      ),
      this
    );
  },
  nonemptyListOf(_0, _1, _2) {
    throw new Error(
      "`nonemptyListOf` nodes should never directly be evaluated."
    );
  },
  number(number) {
    return setTextRange(
      ts.factory.createNumericLiteral(number.sourceString),
      this
    );
  },
  null(_) {
    return setTextRange(ts.factory.createNull(), _);
  },
  ObjectEntry(node) {
    return node.ts();
  },
  ObjectEntry_key_value(key, _, value) {
    return setTextRange(
      ts.factory.createPropertyAssignment(
        key.ts<ts.PropertyName>(),
        value.ts()
      ),
      this
    );
  },
  ObjectEntry_object_method(node) {
    return node.ts();
  },
  ObjectEntry_object_method_with_self(node) {
    return node.ts();
  },
  ObjectEntry_restructure(ident) {
    return setTextRange(
      ts.factory.createShorthandPropertyAssignment(ident.ts<ts.Identifier>()),
      this
    );
  },
  ObjectEntry_spread_operator(_, expr) {
    return setTextRange(ts.factory.createSpreadAssignment(expr.ts()), this);
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
  Parameter_assignable(assignable) {
    return setTextRange(
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        assignable.ts<ts.BindingName>()
      ),
      this
    );
  },
  Parameter_initializer(assignable, _0, type, _1, expr) {
    return setTextRange(
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        assignable.ts<ts.BindingName>(),
        undefined,
        type.child(0)?.ts<ts.TypeNode>(),
        expr.ts<ts.Expression>()
      ),
      this
    );
  },
  Parameter_type(assignable, qMark, _, type) {
    return setTextRange(
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        assignable.ts<ts.BindingName>(),
        qMark.tsn({ "?": ts.factory.createToken(ts.SyntaxKind.QuestionToken) }),
        type.ts<ts.TypeNode>()
      ),
      this
    );
  },
  PipeExp(node) {
    return node.ts();
  },
  PipeExp_pipe(targets, _, final) {
    let $ = ts.setTextRange(ts.factory.createIdentifier("$"), {
      pos: this.source.startIdx,
      end: this.source.startIdx,
    });

    return setTextRange(
      ts.factory.createCommaListExpression([
        ...targets
          .tsa<ts.Expression>()
          .map((expr) =>
            ts.setTextRange(ts.factory.createAssignment($, expr), expr)
          ),
        final.ts(),
      ]),
      this
    );
  },
  PrimitiveType(node) {
    return setTextRange(ts.factory.createIdentifier(node.sourceString), this);
  },
  PrivacyLevel(node) {
    return node.ts();
  },
  PrivacyLevel_none() {
    throw new Error(
      "`PrivacyLevel_none` nodes should never directly be evaluated."
    );
  },
  PrivacyLevel_private(keyword, _) {
    return setTextRange(
      ts.factory.createToken(ts.SyntaxKind.PrivateKeyword),
      keyword
    );
  },
  PrivacyLevel_protected(keyword, _) {
    return setTextRange(
      ts.factory.createToken(ts.SyntaxKind.ProtectedKeyword),
      keyword
    );
  },
  PrivacyLevel_public(keyword, _) {
    return setTextRange(
      ts.factory.createToken(ts.SyntaxKind.PublicKeyword),
      keyword
    );
  },
  Property(node) {
    return node.ts();
  },
  Property_computed(atSymbol, _0, expr, _1) {
    return setTextRange(
      ts.factory.createElementAccessExpression(
        setTextRange(ts.factory.createIdentifier("$self"), atSymbol),
        expr.ts<ts.Expression>()
      ),
      this
    );
  },
  Property_identifier(atSymbol, prop) {
    return setTextRange(
      ts.factory.createPropertyAccessExpression(
        setTextRange(ts.factory.createIdentifier("$self"), atSymbol),
        prop.ts<ts.Identifier>()
      ),
      this
    );
  },
  Property_symbol(atSymbol, symbol) {
    return setTextRange(
      ts.factory.createElementAccessExpression(
        setTextRange(ts.factory.createIdentifier("self"), atSymbol),
        symbol.ts<ts.Expression>()
      ),
      this
    );
  },
  QualifiedName(base, _, qualifiers) {
    if (qualifiers.children.length == 0) return base.ts();

    let type = base.ts<ts.EntityName>();
    for (let qualifier of qualifiers.tsa<ts.Identifier>()) {
      type = ts.setTextRange(ts.factory.createQualifiedName(type, qualifier), {
        pos: type.pos,
        end: qualifier.end,
      });
    }

    return setTextRange(type, this);
  },
  Rescopable(node) {
    return node.ts();
  },
  Rescopable_identifier(ident) {
    return setTextRange(
      ts.factory.createVariableDeclaration(ident.ts<ts.Identifier>()),
      this
    );
  },
  Rescopable_with_type(ident, _, type) {
    return setTextRange(
      ts.factory.createVariableDeclaration(
        ident.ts<ts.Identifier>(),
        undefined,
        type.ts<ts.TypeNode>()
      ),
      this
    );
  },
  RestParameter(node) {
    return node.ts();
  },
  RestParameter_with_type(dotDotDot, assignable, _, type) {
    return setTextRange(
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        setTextRange(
          ts.factory.createToken(ts.SyntaxKind.DotDotDotToken),
          dotDotDot
        ),
        assignable.ts<ts.BindingName>(),
        undefined,
        type.ts<ts.TypeNode>()
      ),
      this
    );
  },
  RestParameter_without_type(dotDotDot, assignable) {
    return setTextRange(
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        setTextRange(
          ts.factory.createToken(ts.SyntaxKind.DotDotDotToken),
          dotDotDot
        ),
        assignable.ts<ts.BindingName>()
      ),
      this
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
  Script(node) {
    return traverseScript(node.ts());
  },
  SingleStatementBlock(node) {
    return node.ts();
  },
  SingleStatementBlock_single_statement(_0, _1, statement) {
    return setTextRange(ts.factory.createBlock([statement.ts()], true), this);
  },
  Statement(node) {
    return node.ts();
  },
  Statement_await_new_thread(
    awaitKeyword,
    _0,
    assignable,
    _1,
    expression,
    blockNode
  ) {
    let $ = setTextRange(
      ts.factory.createAwaitExpression(
        setTextRange(ts.factory.createIdentifier("$"), awaitKeyword)
      ),
      awaitKeyword
    );

    let first = assignable.sourceString
      ? ts.factory.createVariableStatement(
          undefined,
          setTextRange(
            ts.factory.createVariableDeclarationList(
              [
                setTextRange(
                  ts.factory.createVariableDeclaration(
                    assignable.child(0)?.ts<ts.BindingName>(),
                    undefined,
                    undefined,
                    $
                  ),
                  this
                ),
              ],
              ts.NodeFlags.Let
            ),
            this
          )
        )
      : ts.factory.createExpressionStatement($);

    first = setTextRange(first, this);

    let block = setTextRange(
      ts.factory.createBlock(
        [first, ...blockNode.ts<ts.Block>().statements],
        true
      ),
      blockNode
    );

    let fn = ts.factory.createFunctionExpression(
      undefined,
      undefined,
      undefined,
      undefined,
      [
        setTextRange(
          ts.factory.createParameterDeclaration(
            undefined,
            undefined,
            undefined,
            "$"
          ),
          awaitKeyword
        ),
      ],
      undefined,
      block
    );

    return setTextRange(
      ts.factory.createExpressionStatement(
        setTextRange(
          ts.factory.createCallExpression(fn, undefined, [expression.ts()]),
          this
        )
      ),
      this
    );
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
  Statement_export_variable(expr, _) {
    return expr.ts();
  },
  Statement_expression(expression, _) {
    let expr = expression.ts<ts.Expression>();

    if (
      expr.kind == ts.SyntaxKind.ClassExpression ||
      expr.kind == ts.SyntaxKind.FunctionExpression
    ) {
      expr = ts.setTextRange(
        ts.factory.createParenthesizedExpression(expr),
        expr
      );
    }

    return setTextRange(ts.factory.createExpressionStatement(expr), this);
  },
  Statement_for_await_of(
    _0,
    _1,
    awaitKeyword,
    _3,
    assignable,
    _4,
    _5,
    _6,
    expression,
    block
  ) {
    let await = setTextRange(
      ts.factory.createToken(ts.SyntaxKind.AwaitKeyword),
      awaitKeyword
    );

    let declaration = setTextRange(
      ts.factory.createVariableDeclaration(assignable.ts<ts.BindingName>()),
      assignable
    );

    let list = setTextRange(
      ts.factory.createVariableDeclarationList([declaration], ts.NodeFlags.Let),
      assignable
    );

    return setTextRange(
      ts.factory.createForOfStatement(await, list, expression.ts(), block.ts()),
      this
    );
  },
  Statement_for_in(_0, _1, assignable, _2, _3, _4, expression, block) {
    let declaration = setTextRange(
      ts.factory.createVariableDeclaration(assignable.ts<ts.BindingName>()),
      assignable
    );

    let list = setTextRange(
      ts.factory.createVariableDeclarationList([declaration], ts.NodeFlags.Let),
      assignable
    );

    return setTextRange(
      ts.factory.createForInStatement(list, expression.ts(), block.ts()),
      this
    );
  },
  Statement_for_of(_0, _1, assignable, _2, _3, _4, expression, block) {
    let declaration = setTextRange(
      ts.factory.createVariableDeclaration(assignable.ts<ts.BindingName>()),
      assignable
    );

    let list = setTextRange(
      ts.factory.createVariableDeclarationList([declaration], ts.NodeFlags.Let),
      assignable
    );

    return setTextRange(
      ts.factory.createForOfStatement(
        undefined,
        list,
        expression.ts(),
        block.ts()
      ),
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

    let call = setTextRange(
      ts.factory.createCallExpression(cLog, undefined, [expr.ts()]),
      this
    );

    return setTextRange(ts.factory.createExpressionStatement(call), this);
  },
  Statement_repeat(_0, _1, count, block) {
    let pos: ts.TextRange = {
      pos: this.source.startIdx,
      end: this.source.startIdx,
    };

    return setTextRange(
      ts.factory.createForOfStatement(
        undefined,
        ts.setTextRange(
          ts.factory.createVariableDeclarationList(
            [
              ts.setTextRange(
                ts.factory.createVariableDeclaration(
                  ts.setTextRange(ts.factory.createIdentifier("$"), pos)
                ),
                pos
              ),
            ],
            ts.NodeFlags.Let
          ),
          pos
        ),
        ts.setTextRange(
          ts.factory.createCallExpression(
            ts.setTextRange(
              ts.factory.createPropertyAccessExpression(
                ts.setTextRange(
                  ts.factory.createArrayLiteralExpression([]),
                  pos
                ),
                "constructor"
              ),
              pos
            ),
            undefined,
            [count.ts()]
          ),
          pos
        ),
        block.ts()
      ),
      this
    );
  },
  Statement_rescope(_0, _1, declarations, _2) {
    let list = setTextRange(
      ts.factory.createVariableDeclarationList(
        declarations.tsa(),
        ts.NodeFlags.Let
      ),
      this
    );

    return setTextRange(
      ts.factory.createVariableStatement(undefined, list),
      this
    );
  },
  Statement_rescope_assign(_0, _1, assignment, _2) {
    let list = setTextRange(
      ts.factory.createVariableDeclarationList(
        [assignment.ts()],
        ts.NodeFlags.Let
      ),
      this
    );

    return setTextRange(
      ts.factory.createVariableStatement(undefined, list),
      this
    );
  },
  Statement_return(_0, _1, expression, _2) {
    return setTextRange(
      ts.factory.createReturnStatement(
        expression.child(0)?.ts<ts.Expression>()
      ),
      this
    );
  },
  Statement_throw(_0, _1, expression, _2) {
    return setTextRange(ts.factory.createThrowStatement(expression.ts()), this);
  },
  Statement_typed_assignment(node) {
    return node.ts();
  },
  Statement_until(_0, _1, expression, block) {
    return setTextRange(
      ts.factory.createWhileStatement(
        setTextRange(ts.factory.createLogicalNot(expression.ts()), expression),
        block.ts()
      ),
      this
    );
  },
  Statement_when_callback(expressionNode, qMark, _0, _1, _2, params, block) {
    let fn = setTextRange(
      ts.factory.createFunctionExpression(
        undefined,
        undefined,
        undefined,
        undefined,
        params.child(0)?.tsa(),
        undefined,
        block.ts()
      ),
      block
    );

    let expression = expressionNode.ts<ts.Expression | ts.CallExpression>();

    let mark = qMark
      .child(0)
      ?.tsn({ "?": ts.factory.createToken(ts.SyntaxKind.QuestionDotToken) });

    if (expression.kind == ts.SyntaxKind.CallExpression) {
      let expr = expression as ts.CallExpression;

      expression = ts.setTextRange(
        ts.factory.createCallChain(
          expr.expression,
          expr.questionDotToken || mark,
          expr.typeArguments,
          expr.arguments.concat(fn)
        ),
        expr
      );
    } else {
      expression = ts.setTextRange(
        ts.factory.createCallChain(expression, mark, undefined, [fn]),
        expression
      );
    }

    return setTextRange(ts.factory.createExpressionStatement(expression), this);
  },
  Statement_while(_0, _1, expression, block) {
    return setTextRange(
      ts.factory.createWhileStatement(expression.ts(), block.ts()),
      this
    );
  },
  Statement_with(_0, _1, context, blockNode) {
    let block = blockNode.ts<ts.Block>();
    let decl = setTextRange(
      ts.factory.createVariableStatement(
        undefined,
        setTextRange(
          ts.factory.createVariableDeclarationList(
            [
              setTextRange(
                ts.factory.createVariableDeclaration(
                  "$self",
                  undefined,
                  undefined,
                  context.ts<ts.Expression>()
                ),
                context
              ),
            ],
            ts.NodeFlags.Let
          ),
          context
        )
      ),
      context
    );

    return setTextRange(
      ts.factory.createBlock([decl, ...block.statements], true),
      this
    );
  },
  StatementBlock(statements) {
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
  StaticProperty(node) {
    return node.ts();
  },
  StaticProperty_computed(atSymbol, _0, expr, _1) {
    return setTextRange(
      ts.factory.createElementAccessExpression(
        setTextRange(ts.factory.createIdentifier("$static"), atSymbol),
        expr.ts<ts.Expression>()
      ),
      this
    );
  },
  StaticProperty_identifier(atSymbol, prop) {
    return setTextRange(
      ts.factory.createPropertyAccessExpression(
        setTextRange(ts.factory.createIdentifier("$static"), atSymbol),
        prop.ts<ts.Identifier>()
      ),
      this
    );
  },
  StaticProperty_symbol(atSymbol, symbol) {
    return setTextRange(
      ts.factory.createElementAccessExpression(
        setTextRange(ts.factory.createIdentifier("$static"), atSymbol),
        symbol.ts<ts.Expression>()
      ),
      this
    );
  },
  SwitchStatement(_0, _1, target, open, cases, defaultNode, close) {
    let blocks: readonly ts.CaseBlock[] = cases.tsa();
    if (defaultNode.sourceString) {
      blocks = blocks.concat(defaultNode.child(0).ts<ts.CaseBlock>());
    }

    let block = ts.setTextRange(
      ts.factory.createCaseBlock(blocks.flatMap((e) => e.clauses)),
      { pos: open.source.endIdx, end: close.source.startIdx }
    );

    return setTextRange(
      ts.factory.createSwitchStatement(target.ts(), block),
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
    if (char == "\n") char = "\\n";
    if (char == "\r") char = "\\r";

    if (char.length == 2 && char[0] == "\\") {
      let res = {
        b: "\b",
        f: "\f",
        n: "\n",
        r: "\r",
        t: "\t",
        v: "\v",
        0: "\0",
      }[char[1]];

      return setTextRange(ts.factory.createStringLiteral(res || char[1]), this);
    }

    if (char.length == 4 && char[0] == "\\" && char[1] == "x") {
      return setTextRange(
        ts.factory.createStringLiteral(
          String.fromCodePoint(parseInt(char.slice(2), 16))
        ),
        this
      );
    }

    if (
      char.length == 6 &&
      char[0] == "\\" &&
      char[1] == "u" &&
      char[2] != "{"
    ) {
      return setTextRange(
        ts.factory.createStringLiteral(
          String.fromCodePoint(parseInt(char.slice(2), 16))
        ),
        this
      );
    }

    if (char[0] == "\\" && char[1] == "u") {
      return setTextRange(
        ts.factory.createStringLiteral(
          String.fromCodePoint(parseInt(char.slice(3, -1), 16))
        ),
        this
      );
    }

    return setTextRange(ts.factory.createStringLiteral(char), this);
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
  string_non_interpolatable(node) {
    return node.ts();
  },
  string_type(node) {
    return node.ts();
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
  TryStatement(_0, _1, block, _catch, _finally) {
    let catchBlock = _catch.child(0)?.ts<ts.CatchClause>();
    let finallyBlock = _finally.child(0)?.ts<ts.Block>();

    if (!_catch.sourceString && !_finally.sourceString) {
      catchBlock = ts.setTextRange(
        ts.factory.createCatchClause(
          undefined,
          ts.setTextRange(ts.factory.createBlock([]), {
            pos: this.source.endIdx,
            end: this.source.endIdx,
          })
        ),
        {
          pos: this.source.endIdx,
          end: this.source.endIdx,
        }
      );
    }

    return setTextRange(
      ts.factory.createTryStatement(block.ts(), catchBlock, finallyBlock),
      this
    );
  },
  TupleElement(node) {
    return node.ts();
  },
  TupleElement_spread_operator(_, type) {
    return setTextRange(ts.factory.createSpreadElement(type.ts()), this);
  },
  TupleElement_value(type, qMark) {
    if (qMark.sourceString)
      return setTextRange(ts.factory.createOptionalTypeNode(type.ts()), this);
    return type.ts();
  },
  Type(node) {
    return node.ts();
  },
  TypeDeclaration(_export, _0, _1, _2, ident, generics, _3, value, _4) {
    return setTextRange(
      ts.factory.createTypeAliasDeclaration(
        undefined,
        _export.sourceString
          ? [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)]
          : undefined,
        ident.ts<ts.Identifier>(),
        generics.tsa(),
        value.ts()
      ),
      this
    );
  },
  TypeObjectEntry(node) {
    return node.ts();
  },
  TypeObjectEntry_call_signature(signature) {
    let fn = signature.ts<ts.FunctionTypeNode>();

    return setTextRange(
      ts.factory.createCallSignature(fn.typeParameters, fn.parameters, fn.type),
      this
    );
  },
  TypeObjectEntry_construct_signature(_0, _1, signature) {
    let fn = signature.ts<ts.FunctionTypeNode>();

    return setTextRange(
      ts.factory.createConstructSignature(
        fn.typeParameters,
        fn.parameters,
        fn.type
      ),
      this
    );
  },
  TypeObjectEntry_key_value(readonly, _0, key, qMark, _1, value) {
    return setTextRange(
      ts.factory.createPropertySignature(
        readonly.sourceString
          ? [ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)]
          : undefined,
        key.ts<ts.PropertyName>(),
        qMark.tsn({ "?": ts.factory.createToken(ts.SyntaxKind.QuestionToken) }),
        value.ts<ts.TypeNode>()
      ),
      this
    );
  },
  TypeObjectKey(node) {
    return node.ts();
  },
  TypeObjectKey_computed_accessor(_0, accessor, _1) {
    return setTextRange(
      ts.factory.createComputedPropertyName(accessor.ts()),
      this
    );
  },
  TypeObjectKey_identifier(node) {
    return node.ts();
  },
  TypeObjectKey_numerical_key(node) {
    return node.ts();
  },
  TypeObjectKey_string(node) {
    return node.ts();
  },
  TypeParameter(ident, qMark, _, type) {
    return setTextRange(
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        ident.ts<ts.BindingName>(),
        qMark.tsn({ "?": ts.factory.createToken(ts.SyntaxKind.QuestionToken) }),
        type.ts<ts.TypeNode>()
      ),
      this
    );
  },
  TypeParameterList(_) {
    throw new Error(
      "`TypeParameterList` nodes should never directly be evaluated."
    );
  },
  TypeParameterList_params(_0, _1, _2) {
    throw new Error(
      "`TypeParameterList_params` nodes should never directly be evaluated."
    );
  },
  TypeParameterList_rest_params(_) {
    throw new Error(
      "`TypeParameterList_rest_params` nodes should never directly be evaluated."
    );
  },
  TypeRestParameter(dotDotDot, ident, _, type) {
    return setTextRange(
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        setTextRange(
          ts.factory.createToken(ts.SyntaxKind.DotDotDotToken),
          dotDotDot
        ),
        ident.ts<ts.BindingName>(),
        undefined,
        type.ts<ts.TypeNode>()
      ),
      this
    );
  },
  TypedVariableAssignment(assignable, _0, type, _1, expr) {
    let declaration = setTextRange(
      ts.factory.createVariableDeclaration(
        assignable.ts<ts.BindingName>(),
        undefined,
        type.child(0)?.ts<ts.TypeNode>(),
        expr.ts<ts.Expression>()
      ),
      this
    );

    let list = setTextRange(
      ts.factory.createVariableDeclarationList([declaration], ts.NodeFlags.Let),
      this
    );

    return setTextRange(
      ts.factory.createVariableStatement(undefined, list),
      this
    );
  },
  terminator(_) {
    throw new Error("`terminator` nodes should never directly be evaluated.");
  },
  terminator_implied(_0, _1) {
    throw new Error(
      "`terminator_implied` nodes should never directly be evaluated."
    );
  },
  thenOrDo(_) {
    throw new Error("`thenOrDo` nodes should never directly be evaluated.");
  },
  typeTerminator(_) {
    throw new Error(
      "`typeTerminator` nodes should never directly be evaluated."
    );
  },
  typeTerminator_comma(_0, _1) {
    throw new Error(
      "`typeTerminator_comma` nodes should never directly be evaluated."
    );
  },
  typeTerminator_semicolon(_0, _1) {
    throw new Error(
      "`typeTerminator_semicolon` nodes should never directly be evaluated."
    );
  },
  UnionType(node) {
    let iter = node.asIteration();
    if (iter.children.length == 1) return iter.child(0).ts();

    return setTextRange(ts.factory.createUnionTypeNode(node.tsa()), this);
  },
  UnprefixedSingleStatementBlock(node) {
    return node.ts();
  },
  UnprefixedSingleStatementBlock_single_statement(statement) {
    return setTextRange(ts.factory.createBlock([statement.ts()], true), this);
  },
  undefined(_) {
    return setTextRange(ts.factory.createVoidZero(), this);
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
  VariableAssignment(assignable, _0, type, _1, expr) {
    return setTextRange(
      ts.factory.createVariableDeclaration(
        assignable.ts<ts.BindingName>(),
        undefined,
        type.child(0)?.ts<ts.TypeNode>(),
        expr.ts<ts.Expression>()
      ),
      this
    );
  },
  WrappedStatementBlock(_0, statements, _1) {
    return setTextRange(ts.factory.createBlock(statements.tsa(), true), this);
  },
  whitespace(_) {
    throw new Error("`whitespace` nodes should never directly be evaluated.");
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
    tsn<T extends ts.Node = ts.Node>(map: Record<string, T>): T | undefined;
    asIteration(): ohm.IterationNode;
  }

  export interface StorymaticSemantics {
    (match: ohm.MatchResult): StorymaticDict;
  }
}
