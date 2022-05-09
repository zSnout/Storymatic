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

  scriptHasEvents = false;
  let file = semantics(match).ts<ts.SourceFile>();
  (file as any).__storymaticHasEvents = scriptHasEvents;

  return file;
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
  if ((node as any).__storymaticHasEvents)
    text = `if (typeof EventTarget === "function") {
  (EventTarget.prototype as any).on = function on(name: any, ...args: any[]) { this.addEventListener(name, ...args) };
  (EventTarget.prototype as any).emit = function emit(name: any, ...args: any[]) { this.dispatchEvent(new Event(name, ...args)) };
}
${text}`;

  if (flags.typescript) return text;

  return ts.transpileModule(text, {
    compilerOptions: makeCompilerOptions(flags),
  }).outputText;
}

export interface Flags {
  typescript?: boolean;
  module?: ts.ModuleKind;
  target?: ts.ScriptTarget;
  jsx?: string;
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
    return ts.factory.createNodeArray(children.map((e) => e.ts()));
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
  TypeParameterList(node) {
    return node.tsa();
  },
  TypeParameterList_params(paramNodes, _, rest) {
    let params = paramNodes.tsa<ts.ParameterDeclaration>();

    if (rest.sourceString) {
      return ts.factory.createNodeArray(
        params.concat(rest.child(0).ts<ts.ParameterDeclaration>())
      );
    } else {
      return params;
    }
  },
  TypeParameterList_rest_params(rest) {
    return ts.factory.createNodeArray([rest.ts()]);
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

function bindingToAssignment(
  bound:
    | ts.Identifier
    | ts.BindingElement
    | ts.ObjectBindingPattern
    | ts.ArrayBindingPattern
): ts.Expression {
  if (bound.kind === ts.SyntaxKind.Identifier) {
    return bound;
  } else if (bound.kind === ts.SyntaxKind.BindingElement) {
    if (bound.dotDotDotToken)
      return ts.factory.createSpreadElement(bindingToAssignment(bound.name));

    if (bound.propertyName)
      return ts.factory.createPropertyAssignment(
        bound.propertyName,
        bindingToAssignment(bound.name)
      ) as any;

    if (bound.initializer)
      return ts.factory.createAssignment(
        bindingToAssignment(bound.name),
        bound.initializer
      );

    return bindingToAssignment(bound.name);
  } else if (bound.kind === ts.SyntaxKind.ArrayBindingPattern) {
    return ts.factory.createArrayLiteralExpression(
      bound.elements.map((element) => bindingToAssignment(element as any))
    );
  } else if (bound.kind === ts.SyntaxKind.ObjectBindingPattern) {
    return ts.factory.createObjectLiteralExpression(
      bound.elements.map((element) => bindingToAssignment(element) as any)
    );
  }

  throw new Error(
    "`bindingToAssignment` expects an Identifier, BindingElement or BindingPattern."
  );
}

function makeAssignment(name: string, value: ts.Expression) {
  return ts.factory.createVariableStatement(
    undefined,
    ts.factory.createVariableDeclarationList(
      [ts.factory.createVariableDeclaration(name, undefined, undefined, value)],
      ts.NodeFlags.Let
    )
  );
}

let scriptHasEvents = false;

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
      autoReturn: false | "return" | `$res${number | ""}`,
      exclude?: ts.BindingName[]
    ): ts.Node | ts.Node[] {
      console.log(ts.SyntaxKind[node.kind]);

      if (
        ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node)
      ) {
        let fn = node as
          | ts.FunctionDeclaration
          | ts.FunctionExpression
          | ts.ArrowFunction;

        let scope: FunctionScope = { isAsync: false, isGenerator: false };
        let params = fn.parameters.flatMap((e) => e.name);

        fn = ts.visitEachChild(
          fn,
          (node) => visit(node, scope, blockScope, "return", params),
          context
        );

        let asterisk = scope.isGenerator
          ? ts.factory.createToken(ts.SyntaxKind.AsteriskToken)
          : undefined;

        let asyncModifier = scope.isAsync
          ? [ts.factory.createToken(ts.SyntaxKind.AsyncKeyword)]
          : [];

        let modifiers = fn.modifiers?.concat(asyncModifier) || asyncModifier;

        if (fn.kind === ts.SyntaxKind.FunctionExpression) {
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

        if (fn.kind === ts.SyntaxKind.FunctionDeclaration) {
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

        if (fn.kind === ts.SyntaxKind.ArrowFunction) {
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

      if (autoReturn && ts.isIterationStatement(node, false)) {
        let result: typeof autoReturn = `$res`;
        if (autoReturn && autoReturn.startsWith("$res"))
          result += +autoReturn.slice(4) + 1;

        let exclude: ts.BindingName[] | undefined;
        if (
          ts.isForStatement(node) ||
          ts.isForInStatement(node) ||
          ts.isForOfStatement(node)
        ) {
          let init = node.initializer;
          if (init && ts.isVariableDeclarationList(init))
            exclude = init.declarations.map((e) => e.name);
        }

        return [
          makeAssignment(result, ts.factory.createArrayLiteralExpression([])),
          ts.visitEachChild(
            node,
            (node) => visit(node, fnScope, blockScope, result, exclude),
            context
          ),
          autoReturn == "return"
            ? ts.factory.createReturnStatement(
                ts.factory.createIdentifier(result)
              )
            : ts.factory.createExpressionStatement(
                ts.factory.createCallExpression(
                  ts.factory.createPropertyAccessExpression(
                    ts.factory.createIdentifier(autoReturn),
                    "push"
                  ),
                  undefined,
                  [ts.factory.createIdentifier(result)]
                )
              ),
        ];
      }

      if (node.kind === ts.SyntaxKind.Block) {
        let block = node as ts.Block;
        let scope: BlockScope = {
          localVars: [],
          exclude: blockScope.exclude.concat(blockScope.localVars),
        };

        exclude?.map((name) => visitBinding(name, fnScope, scope));
        let last = block.statements[block.statements.length - 1];

        block = ts.visitEachChild(
          block,
          (node) =>
            visit(
              node,
              fnScope,
              scope,
              autoReturn && node === last ? autoReturn : false
            ),
          context
        );

        let names = [
          ...new Set(
            scope.localVars
              .filter((name) => !scope.exclude.includes(name))
              .sort()
          ),
        ];

        let decl = ts.factory.createVariableStatement(
          undefined,
          ts.factory.createVariableDeclarationList(
            names.map((name) => ts.factory.createVariableDeclaration(name)),
            ts.NodeFlags.Let
          )
        );

        if (names.length)
          return ts.factory.createBlock([decl, ...block.statements], true);

        return block;
      }

      if (node.kind === ts.SyntaxKind.BinaryExpression) {
        let bin = node as ts.BinaryExpression;

        if (ts.SyntaxKind.EqualsToken == bin.operatorToken.kind) {
          visitAssignment(bin.left, fnScope, blockScope);

          return ts.visitEachChild(
            node,
            (node) => visit(node, fnScope, blockScope, autoReturn),
            context
          );
        }
      }

      if (ts.isVariableStatement(node)) {
        node.declarationList.declarations.map((node) => {
          visitBinding(node.name, fnScope, blockScope);
        });
      }

      if (ts.isExpressionStatement(node)) {
        if (ts.isParenthesizedExpression(node.expression)) {
          if ((node.expression.expression as any).__storymaticIsIIFE) {
            let call = node.expression.expression as ts.CallExpression;
            let fn = call.expression as ts.FunctionExpression;
            let last = fn.body.statements[fn.body.statements.length - 1];

            return ts
              .visitEachChild(
                fn.body,
                (node) =>
                  visit(
                    node,
                    fnScope,
                    blockScope,
                    autoReturn && node === last ? autoReturn : false
                  ),
                context
              )
              .statements.slice();
          }
        }
      }

      if (ts.isExpressionStatement(node) && autoReturn == "return") {
        node = ts.factory.createReturnStatement(node.expression);
      }

      if (
        ts.isExpressionStatement(node) &&
        autoReturn &&
        autoReturn.startsWith("$res")
      ) {
        node = ts.factory.createExpressionStatement(
          ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(
              ts.factory.createIdentifier(autoReturn),
              "push"
            ),
            undefined,
            [node.expression]
          )
        );
      }

      if (node.kind === ts.SyntaxKind.YieldExpression) {
        fnScope.isGenerator = true;
      }

      if (node.kind === ts.SyntaxKind.AwaitExpression) {
        fnScope.isAsync = true;
      }

      if ((node as any).__storymaticIsIIFE) {
        let call = ts.visitEachChild(
          node,
          (node) => visit(node, fnScope, blockScope, autoReturn),
          context
        ) as ts.CallExpression;

        let fn = call.expression as ts.FunctionExpression;
        let isAsync = false;
        let isGenerator = false;

        if (fn.asteriskToken) isGenerator = true;
        if (
          fn.modifiers?.some(({ kind }) => kind === ts.SyntaxKind.AsyncKeyword)
        ) {
          isAsync = true;
        }

        fnScope.isAsync = fnScope.isAsync || isAsync;
        fnScope.isGenerator = fnScope.isGenerator || isGenerator;

        if (isGenerator)
          return ts.factory.createYieldExpression(
            ts.factory.createToken(ts.SyntaxKind.AsteriskToken),
            call
          );

        if (isAsync) return ts.factory.createAwaitExpression(call);

        return call;
      }

      if (
        ts.isExpressionStatement(node) &&
        ts.isParenthesizedExpression(node.expression)
      ) {
        node = ts.factory.createExpressionStatement(node.expression.expression);
      }

      return ts.visitEachChild(
        node,
        (node) => visit(node, fnScope, blockScope, autoReturn),
        context
      );
    }

    let fnScope: FunctionScope = { isAsync: false, isGenerator: false };
    let blockScope: BlockScope = { localVars: [], exclude: [] };
    let result = ts.visitNode(node, (node) =>
      visit(node, fnScope, blockScope, false)
    );
    return result;
  };
}

function traverseScript(node: ts.SourceFile) {
  let result = ts.transform<ts.Block>(ts.factory.createBlock(node.statements), [
    transformer,
  ]);

  return ts.factory.createSourceFile(
    result.transformed[0].statements,
    ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
    0
  );
}

function createIIFE(block: ts.Block) {
  let iife = ts.factory.createCallExpression(
    ts.factory.createFunctionExpression(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      block
    ),
    undefined,
    undefined
  );

  (iife as any).__storymaticIsIIFE = true;
  return ts.factory.createParenthesizedExpression(iife);
}

semantics.addOperation<ts.Node>("ts", {
  Accessor(base, addons) {
    let expr = base.ts<ts.Expression>();

    for (let addon of addons.tsa<ts.Expression | ts.Identifier>()) {
      if (
        addon.kind === ts.SyntaxKind.Identifier ||
        addon.kind === ts.SyntaxKind.PrivateIdentifier
      ) {
        expr = ts.factory.createPropertyAccessExpression(
          expr,
          addon as ts.MemberName
        );
      } else if (addon.kind === ts.SyntaxKind.ParenthesizedExpression) {
        expr = ts.factory.createElementAccessExpression(
          expr,
          (addon as ts.ParenthesizedExpression).expression
        );
      } else {
        expr = ts.factory.createElementAccessExpression(expr, addon);
      }
    }

    return expr;
  },
  AccessorAddon(node) {
    return node.ts();
  },
  AccessorAddon_computed_member_access(_0, expr, _1) {
    return ts.factory.createParenthesizedExpression(expr.ts());
  },
  AccessorAddon_member_access(_, prop) {
    return prop.ts();
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
    return ts.factory.createAdd(left.ts(), right.ts());
  },
  AddExp_subtraction(left, _, right) {
    return ts.factory.createSubtract(left.ts(), right.ts());
  },
  Argument(node) {
    return node.ts();
  },
  ArgumentList(_) {
    throw new Error("`ArgumentList` nodes should never directly be evaluated.");
  },
  Argument_spread_operator(_, expr) {
    return ts.factory.createSpreadElement(expr.ts());
  },
  ArrayEntry(node) {
    return node.ts();
  },
  ArrayEntry_spread_operator(_, expr) {
    return ts.factory.createSpreadElement(expr.ts());
  },
  Assignable(node) {
    return node.ts();
  },
  AssignableKeyWithRewrite(node) {
    return node.ts();
  },
  AssignableKeyWithRewrite_rewrite(name, _, assignable) {
    return ts.factory.createBindingElement(
      undefined,
      name.ts<ts.PropertyName>(),
      assignable.ts<ts.BindingName>()
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

    return ts.factory.createBindingElement(
      assignable.dotDotDotToken,
      assignable.propertyName,
      assignable.name,
      initializer.ts<ts.Expression>()
    );
  },
  Assignable_array(_0, elements, _1, _2, spreadable, _3, _4) {
    let members = elements.tsa<ts.BindingElement>().slice();

    if (spreadable.sourceString) {
      members.push(
        ts.factory.createBindingElement(
          ts.factory.createToken(ts.SyntaxKind.DotDotDotToken),
          undefined,
          spreadable.child(0).ts<ts.BindingName>()
        )
      );
    }

    return ts.factory.createArrayBindingPattern(members);
  },
  Assignable_identifier(node) {
    return ts.factory.createBindingElement(
      undefined,
      undefined,
      node.ts<ts.Identifier>()
    );
  },
  Assignable_object(_0, elements, _1, _2, spreadable, _3, _4) {
    let members = elements.tsa<ts.BindingElement>().slice();

    if (spreadable.sourceString) {
      members.push(
        ts.factory.createBindingElement(
          ts.factory.createToken(ts.SyntaxKind.DotDotDotToken),
          undefined,
          spreadable.child(0).ts<ts.BindingName>()
        )
      );
    }

    return ts.factory.createObjectBindingPattern(members);
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
      bound.kind === ts.SyntaxKind.BindingElement ||
      bound.kind === ts.SyntaxKind.ArrayBindingPattern ||
      bound.kind === ts.SyntaxKind.ObjectBindingPattern
    ) {
      return ts.factory.createAssignment(bindingToAssignment(bound), expr.ts());
    }

    return ts.factory.createAssignment(bound, expr.ts());
  },
  AssignmentExp_splice(accessor, _0, start, dotdot, end, _2, _3, target) {
    let startExpr =
      start.child(0)?.ts<ts.Expression>() || ts.factory.createNumericLiteral(0);

    let endExpr = end.child(0)?.ts<ts.Expression>();
    let targetExpr = target.ts<ts.Expression>();

    if (endExpr && dotdot.sourceString == "..") {
      if (ts.isNumericLiteral(endExpr)) {
        endExpr = ts.factory.createNumericLiteral(1 + +endExpr.text);
      } else {
        endExpr = ts.factory.createAdd(
          endExpr,
          ts.factory.createNumericLiteral(1)
        );
      }
    }

    let ref: ts.Expression = ts.factory.createIdentifier("$ref");
    let assignment: ts.Expression = ts.factory.createAssignment(
      ref,
      targetExpr
    );

    if (ts.isLiteralExpression(targetExpr) || ts.isIdentifier(targetExpr)) {
      ref = assignment = targetExpr;
    }

    let range: ts.Expression = endExpr
      ? ts.factory.createSubtract(endExpr, startExpr)
      : ts.factory.createNumericLiteral("9e9");

    if (
      endExpr &&
      ts.isNumericLiteral(startExpr) &&
      ts.isNumericLiteral(endExpr)
    ) {
      range = ts.factory.createNumericLiteral(+endExpr.text - +startExpr.text);
    }

    return ts.factory.createComma(
      ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(accessor.ts(), "splice"),
        undefined,
        [
          ts.factory.createSpreadElement(
            ts.factory.createCallExpression(
              ts.factory.createPropertyAccessExpression(
                ts.factory.createArrayLiteralExpression([startExpr, range]),
                "concat"
              ),
              undefined,
              [assignment]
            )
          ),
        ]
      ),
      ref
    );
  },
  AssignmentExp_update_assignment(target, op, expr) {
    let all: Record<string, ts.BinaryOperator> = {
      "+=": ts.SyntaxKind.PlusEqualsToken,
      "-=": ts.SyntaxKind.MinusEqualsToken,
      "*=": ts.SyntaxKind.AsteriskEqualsToken,
      "/=": ts.SyntaxKind.SlashEqualsToken,
      "%=": ts.SyntaxKind.PercentEqualsToken,
      "^=": ts.SyntaxKind.AsteriskAsteriskEqualsToken,
      "&&=": ts.SyntaxKind.AmpersandAmpersandEqualsToken,
      "and=": ts.SyntaxKind.AmpersandAmpersandEqualsToken,
      "||=": ts.SyntaxKind.BarBarEqualsToken,
      "or=": ts.SyntaxKind.BarBarEqualsToken,
      "??=": ts.SyntaxKind.QuestionQuestionEqualsToken,
      "<<=": ts.SyntaxKind.LessThanLessThanEqualsToken,
      ">>=": ts.SyntaxKind.GreaterThanGreaterThanEqualsToken,
      ">>>=": ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
    };

    return ts.factory.createBinaryExpression(
      target.ts(),
      all[op.sourceString]!,
      expr.ts()
    );
  },
  AssignmentExp_yield(_0, _1, expr) {
    return ts.factory.createYieldExpression(
      undefined,
      expr.child(0)?.ts<ts.Expression>()
    );
  },
  AssignmentExp_yield_from(_0, _1, _2, _3, expr) {
    return ts.factory.createYieldExpression(
      ts.factory.createToken(ts.SyntaxKind.AsteriskToken),
      expr.ts<ts.Expression>()
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
    return ts.factory.createLeftShift(left.ts(), right.ts());
  },
  BitwiseExp_right_shift(left, _, right) {
    return ts.factory.createRightShift(left.ts(), right.ts());
  },
  BitwiseExp_unsigned_right_shift(left, _, right) {
    return ts.factory.createUnsignedRightShift(left.ts(), right.ts());
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
    return ts.factory.createFunctionDeclaration(
      undefined,
      _export.sourceString
        ? [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)]
        : [],
      undefined,
      ident.ts<ts.Identifier>(),
      generics.child(0)?.tsa(),
      params.child(0)?.tsa(),
      returnType.child(0)?.ts<ts.TypeNode>(),
      body.ts<ts.Block>()
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
    return ts.factory.createMethodSignature(
      undefined,
      name.ts<ts.PropertyName>(),
      qMark.tsn({ "?": ts.factory.createToken(ts.SyntaxKind.QuestionToken) }),
      generics.child(0)?.tsa(),
      params.child(0)?.tsa(),
      returnType.ts<ts.TypeNode>()
    );
  },
  bigint(_0, _1, _2) {
    return ts.factory.createBigIntLiteral(this.sourceString);
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
    return ts.factory.createCaseClause(expr.ts(), []);
  },
  CaseStatement(clauseNodes, blockNode) {
    let clauses = [...clauseNodes.tsa<ts.CaseClause>()];
    let finalClause = clauses.pop()!;

    let breakStatement = ts.factory.createBreakStatement();

    let block = blockNode.ts<ts.Block>();
    let statements = block.statements.concat(breakStatement);

    let clause =
      (ts.factory.createCaseClause(finalClause.expression, [
        (ts.factory.createBlock(statements, true), block),
      ]),
      finalClause);

    return ts.factory.createCaseBlock(clauses.concat(clause));
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
    return ts.factory.createCatchClause(
      ident.child(0)?.ts<ts.Identifier>(),
      block.ts()
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
        ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [
          extendTarget.child(0).ts(),
        ])
      );
    }

    if (implementTargets.sourceString) {
      heritage.push(
        ts.factory.createHeritageClause(
          ts.SyntaxKind.ImplementsKeyword,
          implementTargets.child(0).tsa()
        )
      );
    }

    return ts.factory.createClassDeclaration(
      undefined,
      _export.sourceString
        ? [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)]
        : [],
      ident.ts<ts.Identifier>(),
      generics.tsa(),
      heritage,
      elements.tsa()
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
      modifiers.push(ts.factory.createToken(ts.SyntaxKind.ReadonlyKeyword));

    let exclOrQues = modifier.child(0)?.tsn({
      "!": ts.factory.createToken(ts.SyntaxKind.ExclamationToken),
      "?": ts.factory.createToken(ts.SyntaxKind.QuestionToken),
    });

    return ts.factory.createPropertyDeclaration(
      undefined,
      modifiers,
      name.ts<ts.PropertyName>(),
      exclOrQues,
      type.child(0)?.ts<ts.TypeNode>(),
      initializer.child(0)?.ts<ts.Expression>()
    );
  },
  ClassElement_static_property(
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
    modifiers.push(ts.factory.createToken(ts.SyntaxKind.StaticKeyword));
    if (readonly.sourceString)
      modifiers.push(ts.factory.createToken(ts.SyntaxKind.ReadonlyKeyword));

    let ques = modifier.child(0)?.tsn({
      "?": ts.factory.createToken(ts.SyntaxKind.QuestionToken),
    });

    return ts.factory.createPropertyDeclaration(
      undefined,
      modifiers,
      name.ts<ts.PropertyName>(),
      ques,
      type.child(0)?.ts<ts.TypeNode>(),
      initializer.child(0)?.ts<ts.Expression>()
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
    return ts.factory.createGreaterThan(left.ts(), right.ts());
  },
  CompareExp_greater_than_equal(left, _, right) {
    return ts.factory.createGreaterThanEquals(left.ts(), right.ts());
  },
  CompareExp_instanceof(left, _0, _1, _2, _3, _4, right) {
    return ts.factory.createBinaryExpression(
      left.ts(),
      ts.SyntaxKind.InstanceOfKeyword,
      right.ts()
    );
  },
  CompareExp_less_than(left, _, right) {
    return ts.factory.createLessThan(left.ts(), right.ts());
  },
  CompareExp_less_than_equal(left, _, right) {
    return ts.factory.createLessThanEquals(left.ts(), right.ts());
  },
  CompareExp_not_instanceof(left, _0, _1, _2, _3, _4, right) {
    return ts.factory.createLogicalNot(
      ts.factory.createBinaryExpression(
        left.ts(),
        ts.SyntaxKind.InstanceOfKeyword,
        right.ts()
      )
    );
  },
  CompareExp_not_within(left, _0, _1, _2, _3, _4, right) {
    return ts.factory.createLogicalNot(
      ts.factory.createBinaryExpression(
        left.ts(),
        ts.SyntaxKind.InKeyword,
        right.ts()
      )
    );
  },
  CompareExp_within(left, _0, _1, _2, _3, _4, right) {
    return ts.factory.createBinaryExpression(
      left.ts(),
      ts.SyntaxKind.InKeyword,
      right.ts()
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
    return ts.factory.createConditionalTypeNode(
      target.ts(),
      mustBe.ts(),
      ifTrue.ts(),
      ifFalse.ts()
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
    let _default = ts.factory.createDefaultClause([block.ts()]);

    return ts.factory.createCaseBlock([_default]);
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
    return ts.factory.createEnumMember(
      key.ts<ts.PropertyName>(),
      value.ts<ts.Expression>()
    );
  },
  EnumMember_auto_assign(key, _) {
    return ts.factory.createEnumMember(key.ts<ts.PropertyName>());
  },
  EnumStatement(_export, _0, _1, _2, ident, _3, members, _4) {
    return ts.factory.createEnumDeclaration(
      undefined,
      _export.sourceString
        ? [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)]
        : undefined,
      ident.ts<ts.Identifier>(),
      members.tsa()
    );
  },
  EqualityExp(node) {
    return node.ts();
  },
  EqualityExp_equal_to(left, _, right) {
    return ts.factory.createStrictEquality(left.ts(), right.ts());
  },
  EqualityExp_not_equal_to(left, _, right) {
    return ts.factory.createStrictInequality(left.ts(), right.ts());
  },
  Expression(node) {
    return node.ts();
  },
  Extendable(base, _0, accessors, generics, _1) {
    let ident = base.ts<ts.Expression>();

    for (let accessor of accessors.tsa<ts.Identifier>()) {
      ident = ts.factory.createPropertyAccessExpression(ident, accessor);
    }

    return ts.factory.createExpressionWithTypeArguments(ident, generics.tsa());
  },
  ExpExp(node) {
    return node.ts();
  },
  ExpExp_exponentiate(left, _, right) {
    return ts.factory.createExponent(left.ts(), right.ts());
  },
  Exportable(type, _0, name, _1, _2, _3, as) {
    return ts.factory.createExportSpecifier(
      !!type.child(0)?.sourceString,
      as.child(0)?.sourceString,
      name.sourceString
    );
  },
  ExportedVariableAssignment(_export, _0, assignable, _1, type, _2, expr) {
    let declaration = ts.factory.createVariableDeclaration(
      assignable.ts<ts.BindingName>(),
      undefined,
      type.child(0)?.ts<ts.TypeNode>(),
      expr.ts<ts.Expression>()
    );

    let list = ts.factory.createVariableDeclarationList(
      [declaration],
      ts.NodeFlags.Let
    );

    return ts.factory.createVariableStatement(
      [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
      list
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
  ForExp(node) {
    return node.ts();
  },
  ForExp_for(
    expr,
    _0,
    _1,
    await,
    _2,
    assignable,
    _3,
    _4,
    iterable,
    _5,
    _6,
    guard
  ) {
    let statement: ts.Statement = ts.factory.createExpressionStatement(
      expr.ts()
    );

    if (guard.sourceString)
      statement = ts.factory.createIfStatement(guard.child(0).ts(), statement);

    return createIIFE(
      ts.factory.createBlock(
        [
          ts.factory.createForOfStatement(
            await.child(0)?.tsn({
              await: ts.factory.createToken(ts.SyntaxKind.AwaitKeyword),
            }),

            ts.factory.createVariableDeclarationList(
              [
                ts.factory.createVariableDeclaration(
                  assignable.child(0)?.ts<ts.BindingName>() || "$loop"
                ),
              ],
              ts.NodeFlags.Let
            ),
            iterable.ts(),
            statement
          ),
        ],
        true
      )
    );
  },
  ForExp_print(_0, _1, expr) {
    return ts.factory.createCallExpression(
      ts.factory.createPropertyAccessExpression(
        ts.factory.createIdentifier("console"),
        "log"
      ),
      undefined,
      [expr.ts()]
    );
  },
  WhileExp(node) {
    return node.ts();
  },
  WhileExp_while(expr, whileUntil, _0, condition, _1, _2, guard) {
    let statement: ts.Statement = ts.factory.createExpressionStatement(
      expr.ts()
    );

    if (guard.sourceString)
      statement = ts.factory.createIfStatement(guard.child(0).ts(), statement);

    let cond = condition.ts<ts.Expression>();

    if (whileUntil.sourceString == "until")
      cond = ts.factory.createLogicalNot(cond);

    return createIIFE(
      ts.factory.createBlock(
        [ts.factory.createWhileStatement(cond, statement)],
        true
      )
    );
  },
  FunctionBody(node) {
    return node.ts();
  },
  FunctionBody_expression(_0, _1, expression) {
    return ts.factory.createBlock(
      [ts.factory.createReturnStatement(expression.ts<ts.Expression>())],
      true
    );
  },
  fullNumber(_0, _1, _2, _3, _4, _5, _6) {
    return ts.factory.createNumericLiteral(this.sourceString);
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
    return ts.factory.createTypeParameterDeclaration(
      name.ts<ts.Identifier>(),
      constraint.child(0)?.ts<ts.TypeNode>(),
      defaultType.child(0)?.ts<ts.TypeNode>()
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
  hexNumber(_0, _1, _2, _3, _4) {
    return ts.factory.createNumericLiteral(
      this.sourceString,
      ts.TokenFlags.HexSpecifier
    );
  },
  IfExp(node) {
    return node.ts();
  },
  IfExp_if(expr, ifUnless, _, condition) {
    let cond = condition.ts<ts.Expression>();

    if (ifUnless.sourceString === "unless")
      cond = (ts.factory.createLogicalNot(cond), cond);

    return ts.factory.createConditionalExpression(
      cond,
      undefined,
      expr.ts(),
      undefined,
      ts.factory.createVoidZero()
    );
  },
  IfStatement(ifUnless, _0, condition, block, _1, _2, _3, elseBlock) {
    let cond = condition.ts<ts.Expression>();

    if (ifUnless.sourceString === "unless")
      cond = (ts.factory.createLogicalNot(cond), cond);

    return ts.factory.createIfStatement(
      cond,
      block.ts(),
      elseBlock.child(0)?.ts<ts.Block>()
    );
  },
  Implementable(base, _0, accessors, generics, _1) {
    let ident = base.ts<ts.Expression>();

    for (let accessor of accessors.tsa<ts.Identifier>()) {
      ident = ts.factory.createPropertyAccessExpression(ident, accessor);
    }

    if (!generics.sourceString) return ident;

    return ts.factory.createExpressionWithTypeArguments(ident, generics.tsa());
  },
  ImpliedCallArgumentList(_) {
    throw new Error(
      "`ImpliedCallArgumentList` nodes should never directly be evaluated."
    );
  },
  Importable(type, _0, name, _1, _2, _3, as) {
    return ts.factory.createImportSpecifier(
      !!type.child(0)?.sourceString,
      as.child(0)?.sourceString
        ? ts.factory.createIdentifier(name.child(0).sourceString)
        : undefined,
      ts.factory.createIdentifier(name.sourceString)
    );
  },
  IndexSignatureType(readonly, prefix, _0, ident, _1, key, _2, _3, value) {
    let modifiers: ts.Modifier[] = [];
    if (prefix.sourceString === "@@")
      modifiers.push(ts.factory.createToken(ts.SyntaxKind.StaticKeyword));
    if (readonly.sourceString)
      modifiers.push(ts.factory.createToken(ts.SyntaxKind.ReadonlyKeyword));

    return ts.factory.createIndexSignature(
      undefined,
      modifiers,
      [
        ts.factory.createParameterDeclaration(
          undefined,
          undefined,
          undefined,
          ident.ts<ts.Identifier>(),
          undefined,
          key.ts<ts.TypeNode>()
        ),
      ],
      value.ts()
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
        ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [
          extendTarget.child(0).ts(),
        ])
      );
    }

    if (implementTargets.sourceString) {
      heritage.push(
        ts.factory.createHeritageClause(
          ts.SyntaxKind.ImplementsKeyword,
          implementTargets.child(0).tsa()
        )
      );
    }

    return ts.factory.createClassExpression(
      undefined,
      undefined,
      undefined,
      generics.tsa(),
      heritage,
      elements.tsa()
    );
  },
  InlineFunction(
    _0,
    _1,
    name,
    generics,
    _2,
    _3,
    _4,
    params,
    _5,
    returnType,
    body
  ) {
    return ts.factory.createFunctionExpression(
      undefined,
      undefined,
      name.child(0)?.ts<ts.Identifier>(),
      generics.child(0)?.tsa(),
      params.child(0)?.tsa(),
      returnType.child(0)?.ts<ts.TypeNode>(),
      body.ts<ts.Block>()
    );
  },
  InlineFunctionType(_0, generics, _1, _2, _3, params, _4, returnType) {
    return ts.factory.createFunctionTypeNode(
      generics.child(0)?.tsa(),
      params.child(0)?.tsa(),
      returnType.child(0)?.ts<ts.TypeNode>()
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

    return ts.factory.createInterfaceDeclaration(
      undefined,
      _export.sourceString
        ? [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)]
        : undefined,
      ident.ts<ts.Identifier>(),
      generics.child(0)?.tsa(),
      heritage && [
        ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, heritage),
      ],
      members.tsa()
    );
  },
  IntersectionType(node) {
    let iter = node.asIteration();
    if (iter.children.length === 1) return iter.child(0).ts();

    return ts.factory.createIntersectionTypeNode(node.tsa());
  },
  identifier(node) {
    return node.ts();
  },
  id_continue(_) {
    throw new Error("`id_continue` nodes should never directly be evaluated.");
  },
  importLocation(node) {
    return node.ts();
  },
  importLocation_filename(filename, _) {
    return ts.factory.createStringLiteral(filename.sourceString);
  },
  JSXAttribute(node) {
    return node.ts();
  },
  JSXAttributeKey(node) {
    return node.ts();
  },
  JSXAttribute_spread_attributes(_0, _1, expression, _2) {
    return ts.factory.createJsxSpreadAttribute(expression.ts());
  },
  JSXAttribute_value_computed_string(key, _, value) {
    return ts.factory.createJsxAttribute(
      key.ts(),
      ts.factory.createJsxExpression(undefined, value.ts<ts.Expression>())
    );
  },
  JSXAttribute_value_expression(key, _0, _1, dotDotDot, value, _2) {
    let spread = dotDotDot.sourceString
      ? ts.factory.createToken(ts.SyntaxKind.DotDotDotToken)
      : undefined;

    return ts.factory.createJsxAttribute(
      key.ts(),
      ts.factory.createJsxExpression(spread, value.ts<ts.Expression>())
    );
  },
  JSXAttribute_value_string(key, _, string) {
    return ts.factory.createJsxAttribute(
      key.ts(),
      string.ts<ts.StringLiteral>()
    );
  },
  JSXAttribute_value_true(key) {
    return ts.factory.createJsxAttribute(key.ts(), undefined);
  },
  JSXChild(node) {
    return node.ts();
  },
  JSXChild_interpolation(_0, dotDotDot, expression, _1) {
    let spread = dotDotDot.sourceString
      ? ts.factory.createToken(ts.SyntaxKind.DotDotDotToken)
      : undefined;

    return ts.factory.createJsxExpression(
      spread,
      expression.ts<ts.Expression>()
    );
  },
  JSXElement(node) {
    return node.ts();
  },
  JSXElement_open_close(_0, tag, typeArgs, attrNode, _1, children, _2, _3, _4) {
    let attrs = ts.factory.createJsxAttributes(attrNode.tsa());

    let open = ts.factory.createJsxOpeningElement(
      tag.ts(),
      typeArgs.tsa(),
      attrs
    );

    let close = ts.factory.createJsxClosingElement(tag.ts());

    return ts.factory.createJsxElement(open, children.tsa(), close);
  },
  JSXElement_self_closing(_0, tag, typeArgs, attrNode, _1, _2) {
    let attrs = ts.factory.createJsxAttributes(attrNode.tsa());

    return ts.factory.createJsxSelfClosingElement(
      tag.ts(),
      typeArgs.tsa(),
      attrs
    );
  },
  jsxTagName(node) {
    return node.ts();
  },
  jsxTagName_property_access(tag, _, key) {
    return ts.factory.createPropertyAccessExpression(
      tag.ts(),
      key.ts<ts.Identifier>()
    );
  },
  jsxTagName_standard(node) {
    return node.ts();
  },
  jsx_string(bits) {
    let source = bits.sourceString.trim().replace(/\s+/g, " ");
    return ts.factory.createJsxText(source);
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
    return ts.factory.createArrayLiteralExpression(entries.tsa());
  },
  LiteralExp_do(_, block) {
    return ts.factory.createCallExpression(
      ts.factory.createFunctionExpression(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        block.ts()
      ),
      undefined,
      undefined
    );
  },
  LiteralExp_object(_0, entries, _1, _2) {
    return ts.factory.createObjectLiteralExpression(entries.tsa());
  },
  LiteralExp_parenthesized(_0, expr, _1) {
    return ts.factory.createParenthesizedExpression(expr.ts());
  },
  LiteralExp_with(_0, _1, expr, block) {
    return ts.factory.createCallExpression(
      ts.factory.createFunctionExpression(
        undefined,
        undefined,
        undefined,
        undefined,
        [
          ts.factory.createParameterDeclaration(
            undefined,
            undefined,
            undefined,
            "$self"
          ),
        ],
        undefined,
        ts.factory.createBlock(
          block
            .ts<ts.Block>()
            .statements.concat(
              ts.factory.createExpressionStatement(
                ts.factory.createIdentifier("$self")
              )
            ),
          true
        )
      ),
      undefined,
      [expr.ts()]
    );
  },
  LiteralType(node) {
    return node.ts();
  },
  LiteralType_construct(_0, _1, func) {
    let fn = func.ts<ts.FunctionTypeNode>();

    return ts.factory.createConstructorTypeNode(
      fn.modifiers,
      fn.typeParameters,
      fn.parameters,
      fn.type
    );
  },
  LiteralType_infer(_0, _1, ident, _2, _3, constraint) {
    return ts.factory.createInferTypeNode(
      ts.factory.createTypeParameterDeclaration(
        ident.ts<ts.Identifier>(),
        constraint.child(0)?.ts<ts.TypeNode>()
      )
    );
  },
  LiteralType_parenthesized(_0, expr, _1) {
    return ts.factory.createParenthesizedType(expr.ts());
  },
  LiteralExp_self(_) {
    return ts.factory.createIdentifier("$self");
  },
  LiteralExp_static_self(_) {
    return ts.factory.createIdentifier("$static");
  },
  LiteralExp_topic_token(_) {
    return ts.factory.createIdentifier("$");
  },
  LiteralType_type_args(expr, args) {
    return ts.factory.createTypeReferenceNode(
      expr.ts<ts.EntityName>(),
      args.tsa()
    );
  },
  LiteralType_typeof(_0, _1, expr) {
    return ts.factory.createTypeQueryNode(expr.ts());
  },
  LogicalAndExp(node) {
    return node.ts();
  },
  LogicalAndExp_logical_and(left, _0, _1, _2, right) {
    return ts.factory.createLogicalAnd(left.ts(), right.ts());
  },
  LogicalOrExp(node) {
    return node.ts();
  },
  LogicalOrExp_logical_nullish_coalescing(left, _, right) {
    return ts.factory.createBinaryExpression(
      left.ts(),
      ts.SyntaxKind.QuestionQuestionToken,
      right.ts()
    );
  },
  LogicalOrExp_logical_or(left, _0, _1, _2, right) {
    return ts.factory.createLogicalOr(left.ts(), right.ts());
  },
  letter(_) {
    throw new Error("`letter` nodes should never directly be evaluated.");
  },
  lineContinuer(_) {
    throw new Error(
      "`lineContinuer` nodes should never directly be evaluated."
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
  MemberAccessExpNonCall(node) {
    return node.ts();
  },
  MemberAccessExpNonCall_array_slice(
    target,
    qMark,
    _0,
    start,
    dotdot,
    end,
    _2
  ) {
    let endExpr = end.child(0)?.ts<ts.Expression>();

    if (endExpr && dotdot.sourceString == "..") {
      if (ts.isNumericLiteral(endExpr)) {
        endExpr = ts.factory.createNumericLiteral(1 + +endExpr.text);
      } else {
        endExpr = ts.factory.createAdd(
          endExpr,
          ts.factory.createNumericLiteral("1")
        );
      }
    }

    return ts.factory.createCallExpression(
      ts.factory.createPropertyAccessChain(
        target.ts(),
        qMark.tsn({
          "?": ts.factory.createToken(ts.SyntaxKind.QuestionDotToken),
        }),
        "slice"
      ),
      undefined,
      [
        start.child(0)?.ts<ts.Expression>() ||
          ts.factory.createNumericLiteral(0),
        endExpr,
      ].filter((e) => e)
    );
  },
  MemberAccessExpNonCall_as_expression(expr, _0, _1, type) {
    return ts.factory.createAsExpression(expr.ts(), type.ts());
  },
  MemberAccessExpNonCall_class_creation_implied(_0, _1, target, _2, args) {
    return ts.factory.createNewExpression(target.ts(), undefined, args.tsa());
  },
  MemberAccessExpNonCall_class_creation_no_args(_0, _1, target) {
    return ts.factory.createNewExpression(target.ts(), undefined, []);
  },
  MemberAccessExpNonCall_class_creation_symbolic(
    _0,
    _1,
    target,
    typeArgs,
    _2,
    args,
    _3
  ) {
    return ts.factory.createNewExpression(
      target.ts(),
      typeArgs.tsa(),
      args.tsa()
    );
  },
  MemberAccessExpNonCall_computed_member_access(target, qMark, _0, index, _1) {
    return ts.factory.createElementAccessChain(
      target.ts(),
      qMark.tsn({
        "?": ts.factory.createToken(ts.SyntaxKind.QuestionDotToken),
      }),
      index.ts<ts.Expression>()
    );
  },
  MemberAccessExpNonCall_member_access(target, _, key) {
    return ts.factory.createPropertyAccessExpression(
      target.ts(),
      key.ts<ts.MemberName>()
    );
  },
  MemberAccessExpNonCall_non_null_assertion(target, _) {
    return ts.factory.createNonNullExpression(target.ts());
  },
  MemberAccessExpNonCall_optional_chaining_member_access(target, _, key) {
    return ts.factory.createPropertyAccessChain(
      target.ts(),
      ts.factory.createToken(ts.SyntaxKind.QuestionDotToken),
      key.ts<ts.MemberName>()
    );
  },
  MemberAccessExpNonCall_tagged_template_literal(tag, template) {
    return ts.factory.createTaggedTemplateExpression(
      tag.ts(),
      undefined,
      template.ts()
    );
  },
  MemberAccessExp_dispatch_event(
    expr,
    qMark,
    _0,
    eventName,
    typeArgs,
    _1,
    args,
    _2
  ) {
    scriptHasEvents = true;

    return ts.factory.createCallChain(
      ts.factory.createPropertyAccessChain(
        expr.ts(),
        qMark.tsn({
          "?": ts.factory.createToken(ts.SyntaxKind.QuestionDotToken),
        }),
        "emit"
      ),
      qMark.tsn({
        "?": ts.factory.createToken(ts.SyntaxKind.QuestionDotToken),
      }),
      typeArgs.child(0)?.tsa(),
      [
        ts.factory.createStringLiteral(eventName.sourceString),
        ...(args.child(0)?.tsa<ts.Expression>() || []),
      ]
    );
  },
  MemberAccessExp_function_call(target, typeArgs, _0, args, _1) {
    return ts.factory.createCallExpression(
      target.ts(),
      typeArgs.tsa(),
      args.tsa()
    );
  },
  MemberAccessExp_implied_call(target, _0, args) {
    return ts.factory.createCallExpression(target.ts(), undefined, args.tsa());
  },
  MemberAccessExp_listen_event(
    expr,
    qMark,
    _0,
    eventName,
    typeArgs,
    _1,
    args,
    _2
  ) {
    scriptHasEvents = true;

    return ts.factory.createCallChain(
      ts.factory.createPropertyAccessChain(
        expr.ts(),
        qMark.tsn({
          "?": ts.factory.createToken(ts.SyntaxKind.QuestionDotToken),
        }),
        "on"
      ),
      qMark.tsn({
        "?": ts.factory.createToken(ts.SyntaxKind.QuestionDotToken),
      }),
      typeArgs.child(0)?.tsa(),
      [
        ts.factory.createStringLiteral(eventName.sourceString),
        ...(args.child(0)?.tsa<ts.Expression>() || []),
      ]
    );
  },
  MemberAccessExp_optional_chaining_function_call(
    target,
    _0,
    typeArgs,
    _1,
    args,
    _2
  ) {
    return ts.factory.createCallChain(
      target.ts(),
      ts.factory.createToken(ts.SyntaxKind.QuestionDotToken),
      typeArgs.tsa(),
      args.tsa()
    );
  },
  MemberAccessType(node) {
    return node.ts();
  },
  MemberAccessType_array(element, _0, _1) {
    return ts.factory.createArrayTypeNode(element.ts());
  },
  MemberAccessType_keyof(_, expr) {
    return ts.factory.createTypeOperatorNode(
      ts.SyntaxKind.KeyOfKeyword,
      expr.ts()
    );
  },
  MemberAccessType_member_access(target, _0, key, _1) {
    return ts.factory.createIndexedAccessTypeNode(target.ts(), key.ts());
  },
  MemberAccessType_named_tuple(_0, elements, _1) {
    return ts.factory.createTupleTypeNode(elements.tsa());
  },
  MemberAccessType_object(_0, members, _1) {
    return ts.factory.createTypeLiteralNode(members.tsa());
  },
  MemberAccessType_readonly(_, expr) {
    return ts.factory.createTypeOperatorNode(
      ts.SyntaxKind.ReadonlyKeyword,
      expr.ts()
    );
  },
  MemberAccessType_tuple(_0, elements, _1) {
    return ts.factory.createTupleTypeNode(elements.tsa());
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

    let $void = ts.factory.createVoidZero();
    let $this = ts.factory.createIdentifier("this");
    let $static = ts.factory.createPropertyAccessExpression(
      $this,
      "constructor"
    );

    if (prefix.sourceString === "@") {
      block = ts.factory.createBlock(
        [
          makeAssignment("$self", $this),
          makeAssignment("$static", $static),
          ...block.statements,
        ],
        true
      );
    } else if (prefix.sourceString === "@@") {
      block =
        (ts.factory.createBlock(
          [
            makeAssignment("$self", $void),
            makeAssignment("$static", $this),
            ...block.statements,
          ],
          true
        ),
        block);
    }

    return ts.factory.createMethodDeclaration(
      undefined,
      privacy.sourceString ? [privacy.ts()] : [],
      undefined,
      name.ts<ts.PropertyName>(),
      qMark.tsn({ "?": ts.factory.createToken(ts.SyntaxKind.QuestionToken) }),
      generics.child(0)?.tsa(),
      params.child(0)?.tsa(),
      returnType.child(0)?.ts<ts.TypeNode>(),
      block
    );
  },
  MethodName(node) {
    return node.ts();
  },
  MethodName_computed_key(_0, expr, _1) {
    return ts.factory.createComputedPropertyName(expr.ts());
  },
  MethodName_computed_string_key(node) {
    return ts.factory.createComputedPropertyName(node.ts());
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
  MulExp(node) {
    return node.ts();
  },
  MulExp_division(left, _, right) {
    return ts.factory.createDivide(left.ts(), right.ts());
  },
  MulExp_modulus(left, _, right) {
    return ts.factory.createModulo(left.ts(), right.ts());
  },
  MulExp_multiplication(left, _, right) {
    return ts.factory.createMultiply(left.ts(), right.ts());
  },
  NamedTupleElement(node) {
    return node.ts();
  },
  NamedTupleElement_name_value(name, qMark, _, value) {
    return ts.factory.createNamedTupleMember(
      undefined,
      name.ts(),
      qMark.tsn({ "?": ts.factory.createToken(ts.SyntaxKind.QuestionToken) }),
      value.ts()
    );
  },
  NamedTupleElement_spread_operator(_0, name, _1, value) {
    return ts.factory.createNamedTupleMember(
      ts.factory.createToken(ts.SyntaxKind.DotDotDotToken),
      name.ts(),
      undefined,
      value.ts()
    );
  },
  NamespaceDeclaration(_export, _0, _1, _2, ident, block) {
    return ts.factory.createModuleDeclaration(
      undefined,
      _export.sourceString
        ? [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)]
        : undefined,
      ident.ts(),
      ts.factory.createModuleBlock(block.ts<ts.Block>().statements)
    );
  },
  NCMemberAccessExp(node) {
    return node.ts();
  },
  NonemptyGenericTypeArgumentList(_0, _1, _2) {
    throw new Error(
      "`NonemptyGenericTypeArgumentList` nodes should never directly be evaluated."
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
    return ts.factory.createAwaitExpression(expr.ts());
  },
  NotExp_logical_not_symbolic(_, expr) {
    return ts.factory.createLogicalNot(expr.ts());
  },
  NotExp_logical_not_worded(_0, _1, expr) {
    return ts.factory.createLogicalNot(expr.ts());
  },
  NotExp_prefix_decrement(_0, ident) {
    return ts.factory.createPrefixDecrement(ident.ts());
  },
  NotExp_prefix_increment(_0, ident) {
    return ts.factory.createPrefixIncrement(ident.ts());
  },
  NotExp_typeof(_0, _1, _2, expr) {
    return ts.factory.createTypeOfExpression(expr.ts());
  },
  NotExp_unary_minus(_, expr) {
    return ts.factory.createPrefixUnaryExpression(
      ts.SyntaxKind.MinusToken,
      expr.ts()
    );
  },
  NotExp_unary_plus(_, expr) {
    return ts.factory.createPrefixUnaryExpression(
      ts.SyntaxKind.PlusToken,
      expr.ts()
    );
  },
  nonemptyListOf(_0, _1, _2) {
    throw new Error(
      "`nonemptyListOf` nodes should never directly be evaluated."
    );
  },
  number(_0, _1, _2) {
    return ts.factory.createNumericLiteral(this.sourceString);
  },
  null(_) {
    return ts.factory.createNull();
  },
  ObjectEntry(node) {
    return node.ts();
  },
  ObjectEntry_key_value(key, _, value) {
    return ts.factory.createPropertyAssignment(
      key.ts<ts.PropertyName>(),
      value.ts()
    );
  },
  ObjectEntry_object_method(node) {
    return node.ts();
  },
  ObjectEntry_object_method_with_self(node) {
    return node.ts();
  },
  ObjectEntry_restructure(ident) {
    return ts.factory.createShorthandPropertyAssignment(
      ident.ts<ts.Identifier>()
    );
  },
  ObjectEntry_spread_operator(_, expr) {
    return ts.factory.createSpreadAssignment(expr.ts());
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
    return ts.factory.createParameterDeclaration(
      undefined,
      undefined,
      undefined,
      assignable.ts<ts.BindingName>()
    );
  },
  Parameter_initializer(assignable, _0, type, _1, expr) {
    return ts.factory.createParameterDeclaration(
      undefined,
      undefined,
      undefined,
      assignable.ts<ts.BindingName>(),
      undefined,
      type.child(0)?.ts<ts.TypeNode>(),
      expr.ts<ts.Expression>()
    );
  },
  Parameter_type(assignable, qMark, _, type) {
    return ts.factory.createParameterDeclaration(
      undefined,
      undefined,
      undefined,
      assignable.ts<ts.BindingName>(),
      qMark.tsn({ "?": ts.factory.createToken(ts.SyntaxKind.QuestionToken) }),
      type.ts<ts.TypeNode>()
    );
  },
  PipeExp(node) {
    return node.ts();
  },
  PipeExp_pipe(targets, _, final) {
    let $ = ts.factory.createIdentifier("$");

    return ts.factory.createCommaListExpression([
      ...targets
        .tsa<ts.Expression>()
        .map((expr) => ts.factory.createAssignment($, expr)),
      final.ts(),
    ]);
  },
  PostfixExp(node) {
    return node.ts();
  },
  PostfixExp_decrement(ident, _) {
    return ts.factory.createPostfixDecrement(ident.ts());
  },
  PostfixExp_increment(ident, _) {
    return ts.factory.createPostfixIncrement(ident.ts());
  },
  PrimitiveType(node) {
    return ts.factory.createIdentifier(node.sourceString);
  },
  PrivacyLevel(node) {
    return node.ts();
  },
  PrivacyLevel_none() {
    throw new Error(
      "`PrivacyLevel_none` nodes should never directly be evaluated."
    );
  },
  PrivacyLevel_private(_0, _1) {
    return ts.factory.createToken(ts.SyntaxKind.PrivateKeyword);
  },
  PrivacyLevel_protected(_0, _1) {
    return ts.factory.createToken(ts.SyntaxKind.ProtectedKeyword);
  },
  PrivacyLevel_public(_0, _1) {
    return ts.factory.createToken(ts.SyntaxKind.PublicKeyword);
  },
  Property(node) {
    return node.ts();
  },
  Property_computed(_0, _1, expr, _2) {
    return ts.factory.createElementAccessExpression(
      ts.factory.createIdentifier("$self"),
      expr.ts<ts.Expression>()
    );
  },
  Property_identifier(_, prop) {
    return ts.factory.createPropertyAccessExpression(
      ts.factory.createIdentifier("$self"),
      prop.ts<ts.Identifier>()
    );
  },
  postWord(_) {
    throw new Error("`postWord` nodes should never directly be evaluated.");
  },
  QualifiedName(base, _, qualifiers) {
    if (qualifiers.children.length === 0) return base.ts();

    let type = base.ts<ts.EntityName>();
    for (let qualifier of qualifiers.tsa<ts.Identifier>()) {
      type = ts.factory.createQualifiedName(type, qualifier);
    }

    return type;
  },
  Rescopable(node) {
    return node.ts();
  },
  Rescopable_identifier(ident) {
    return ts.factory.createVariableDeclaration(ident.ts<ts.Identifier>());
  },
  Rescopable_with_type(ident, _, type) {
    return ts.factory.createVariableDeclaration(
      ident.ts<ts.Identifier>(),
      undefined,
      type.ts<ts.TypeNode>()
    );
  },
  RestParameter(node) {
    return node.ts();
  },
  RestParameter_with_type(_0, assignable, _1, type) {
    return ts.factory.createParameterDeclaration(
      undefined,
      undefined,
      ts.factory.createToken(ts.SyntaxKind.DotDotDotToken),
      assignable.ts<ts.BindingName>(),
      undefined,
      type.ts<ts.TypeNode>()
    );
  },
  RestParameter_without_type(_0, assignable) {
    return ts.factory.createParameterDeclaration(
      undefined,
      undefined,
      ts.factory.createToken(ts.SyntaxKind.DotDotDotToken),
      assignable.ts<ts.BindingName>()
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
    return ts.factory.createBlock([statement.ts()], true);
  },
  Statement(node) {
    return node.ts();
  },
  Statement_await_new_thread(_0, _1, assignable, _2, expression, blockNode) {
    let $ = ts.factory.createAwaitExpression(
      ts.factory.createIdentifier("$awaited")
    );

    let first = assignable.sourceString
      ? ts.factory.createVariableStatement(
          undefined,
          ts.factory.createVariableDeclarationList(
            [
              ts.factory.createVariableDeclaration(
                assignable.child(0)?.ts<ts.BindingName>(),
                undefined,
                undefined,
                $
              ),
            ],
            ts.NodeFlags.Let
          )
        )
      : ts.factory.createExpressionStatement($);

    first = first;

    let block = ts.factory.createBlock(
      [first, ...blockNode.ts<ts.Block>().statements],
      true
    );

    let fn = ts.factory.createFunctionExpression(
      undefined,
      undefined,
      undefined,
      undefined,
      [
        ts.factory.createParameterDeclaration(
          undefined,
          undefined,
          undefined,
          "$awaited"
        ),
      ],
      undefined,
      block
    );

    return ts.factory.createExpressionStatement(
      ts.factory.createCallExpression(fn, undefined, [expression.ts()])
    );
  },
  Statement_empty_export(_0, _1) {
    return ts.factory.createExportDeclaration(
      undefined,
      undefined,
      false,
      ts.factory.createNamedExports([])
    );
  },
  Statement_empty_import(_0, _1, filename, _2) {
    return ts.factory.createImportDeclaration(
      undefined,
      undefined,
      undefined,
      filename.ts()
    );
  },
  Statement_export(_0, _1, type, _2, exports, _3, _4) {
    return ts.factory.createExportDeclaration(
      undefined,
      undefined,
      !!type.sourceString,
      ts.factory.createNamedExports(exports.tsa())
    );
  },
  Statement_export_all_from(_0, _1, _2, _3, filename, _4) {
    return ts.factory.createExportDeclaration(
      undefined,
      undefined,
      false,
      undefined,
      filename.ts<ts.StringLiteral>()
    );
  },
  Statement_export_default(_0, _1, _2, _3, expression, _4) {
    return ts.factory.createExportDefault(expression.ts());
  },
  Statement_export_from(_0, _1, type, _2, exports, _3, _4, _5, filename, _6) {
    return ts.factory.createExportDeclaration(
      undefined,
      undefined,
      !!type.sourceString,
      ts.factory.createNamedExports(exports.tsa()),
      filename.ts<ts.Expression>()
    );
  },
  Statement_export_variable(expr, _) {
    return expr.ts();
  },
  Statement_expression(node, _) {
    return node.ts();
  },
  Statement_for(_0, _1, _await, _2, assignable, _3, _4, expression, block) {
    let declaration = ts.factory.createVariableDeclaration(
      assignable.child(0)?.ts<ts.BindingName>() ||
        ts.factory.createIdentifier("$loop")
    );

    let list = ts.factory.createVariableDeclarationList(
      [declaration],
      ts.NodeFlags.Let
    );

    return ts.factory.createForOfStatement(
      _await
        .child(0)
        .tsn({ await: ts.factory.createToken(ts.SyntaxKind.AwaitKeyword) }),
      list,
      expression.ts(),
      block.ts()
    );
  },
  Statement_import(_0, _1, type, _2, imports, _3, _4, _5, filename, _6) {
    return ts.factory.createImportDeclaration(
      undefined,
      undefined,
      ts.factory.createImportClause(
        !!type.sourceString,
        undefined,
        ts.factory.createNamedImports(imports.tsa())
      ),
      filename.ts()
    );
  },
  Statement_import_all(_0, _1, _2, _3, ident, _4, _5, filename, _6) {
    return ts.factory.createImportDeclaration(
      undefined,
      undefined,
      ts.factory.createImportClause(
        false,
        undefined,
        ts.factory.createNamespaceImport(ident.ts())
      ),
      filename.ts<ts.StringLiteral>()
    );
  },
  Statement_import_default(_0, _1, type, _2, ident, _3, _4, _5, filename, _6) {
    return ts.factory.createImportDeclaration(
      undefined,
      undefined,
      ts.factory.createImportClause(
        !!type.sourceString,
        ident.ts<ts.Identifier>(),
        undefined
      ),
      filename.ts()
    );
  },
  Statement_repeat(_0, _1, count, block) {
    return ts.factory.createForOfStatement(
      undefined,
      ts.factory.createVariableDeclarationList(
        [
          ts.factory.createVariableDeclaration(
            ts.factory.createIdentifier("$loop")
          ),
        ],
        ts.NodeFlags.Let
      ),
      ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(
          ts.factory.createArrayLiteralExpression([]),
          "constructor"
        ),
        undefined,
        [count.ts()]
      ),
      block.ts()
    );
  },
  Statement_rescope(_0, _1, declarations, _2) {
    let list = ts.factory.createVariableDeclarationList(
      declarations.tsa(),
      ts.NodeFlags.Let
    );

    return ts.factory.createVariableStatement(undefined, list);
  },
  Statement_rescope_assign(_0, _1, assignment, _2) {
    let list = ts.factory.createVariableDeclarationList(
      [assignment.ts()],
      ts.NodeFlags.Let
    );

    return ts.factory.createVariableStatement(undefined, list);
  },
  Statement_typed_assignment(node) {
    return node.ts();
  },
  Statement_when_callback(expressionNode, qMark, _0, _1, _2, params, block) {
    let fn = ts.factory.createFunctionExpression(
      undefined,
      undefined,
      undefined,
      undefined,
      params.child(0)?.tsa(),
      undefined,
      block.ts()
    );

    let expression = expressionNode.ts<ts.Expression | ts.CallExpression>();

    let mark = qMark
      .child(0)
      ?.tsn({ "?": ts.factory.createToken(ts.SyntaxKind.QuestionDotToken) });

    if (expression.kind === ts.SyntaxKind.CallExpression) {
      let expr = expression as ts.CallExpression;

      expression =
        (ts.factory.createCallChain(
          expr.expression,
          expr.questionDotToken || mark,
          expr.typeArguments,
          expr.arguments.concat(fn)
        ),
        expr);
    } else {
      expression =
        (ts.factory.createCallChain(expression, mark, undefined, [fn]),
        expression);
    }

    return ts.factory.createExpressionStatement(expression);
  },
  Statement_while(whileUntil, _, expression, block) {
    let cond = expression.ts<ts.Expression>();

    if (whileUntil.sourceString == "until")
      cond = ts.factory.createLogicalNot(cond);

    return ts.factory.createWhileStatement(cond, block.ts());
  },
  StatementBlock(statements) {
    return ts.factory.createSourceFile(
      statements.tsa(),
      ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
      0
    );
  },
  StaticProperty(node) {
    return node.ts();
  },
  StaticProperty_computed(_0, _1, expr, _2) {
    return ts.factory.createElementAccessExpression(
      ts.factory.createIdentifier("$static"),
      expr.ts<ts.Expression>()
    );
  },
  StaticProperty_identifier(_, prop) {
    return ts.factory.createPropertyAccessExpression(
      ts.factory.createIdentifier("$static"),
      prop.ts<ts.Identifier>()
    );
  },
  SwitchStatement(_0, _1, target, _2, cases, defaultNode, _3) {
    let blocks: readonly ts.CaseBlock[] = cases.tsa();
    if (defaultNode.sourceString) {
      blocks = blocks.concat(defaultNode.child(0).ts<ts.CaseBlock>());
    }

    let block = ts.factory.createCaseBlock(blocks.flatMap((e) => e.clauses));

    return ts.factory.createSwitchStatement(target.ts(), block);
  },
  sign(_) {
    throw new Error("`sign` nodes should never directly be evaluated.");
  },
  space(_) {
    throw new Error("`space` nodes should never directly be evaluated.");
  },
  statementTerminator(_) {
    return ts.factory.createToken(ts.SyntaxKind.SemicolonToken);
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
    if (char === "\n") char = "\\n";
    if (char === "\r") char = "\\r";

    if (char.length === 2 && char[0] === "\\") {
      let res = {
        b: "\b",
        f: "\f",
        n: "\n",
        r: "\r",
        t: "\t",
        v: "\v",
        0: "\0",
      }[char[1]];

      return ts.factory.createStringLiteral(res || char[1]);
    }

    if (char.length === 4 && char[0] === "\\" && char[1] === "x") {
      return ts.factory.createStringLiteral(
        String.fromCodePoint(parseInt(char.slice(2), 16))
      );
    }

    if (
      char.length === 6 &&
      char[0] === "\\" &&
      char[1] === "u" &&
      char[2] != "{"
    ) {
      return ts.factory.createStringLiteral(
        String.fromCodePoint(parseInt(char.slice(2), 16))
      );
    }

    if (char[0] === "\\" && char[1] === "u") {
      return ts.factory.createStringLiteral(
        String.fromCodePoint(parseInt(char.slice(3, -1), 16))
      );
    }

    return ts.factory.createStringLiteral(char);
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
    return ts.factory.createStringLiteral(
      bits.map((e) => e.text).join(""),
      open.sourceString === "'"
    );
  },
  string_interpolatable(_0, headNode, _1, spansNode, _2) {
    let head = headNode.ts<ts.TemplateHead>();
    let spans = spansNode.tsa<ts.TemplateSpan>();

    if (spans.length === 0) {
      return ts.factory.createNoSubstitutionTemplateLiteral(
        head.text,
        head.rawText
      );
    }

    return ts.factory.createTemplateExpression(head, spans);
  },
  string_interpolatable_head(content) {
    let bits = content.tsa<ts.StringLiteral>();
    return ts.factory.createTemplateHead(bits.map((e) => e.text).join(""));
  },
  string_interpolatable_span(_0, expression, _1, content, isTail) {
    let bits = content
      .tsa<ts.StringLiteral>()
      .map((e) => e.text)
      .join("");

    let text = isTail.sourceString
      ? ts.factory.createTemplateTail(bits, content.sourceString)
      : ts.factory.createTemplateMiddle(bits, content.sourceString);

    return ts.factory.createTemplateSpan(expression.ts(), text);
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
  TernaryExp_if_then_else(
    ifUnless,
    _0,
    condition,
    _1,
    _2,
    ifTrue,
    _3,
    _4,
    ifFalse
  ) {
    let cond = condition.ts<ts.Expression>();

    if (ifUnless.sourceString === "unless")
      cond = (ts.factory.createLogicalNot(cond), cond);

    return ts.factory.createConditionalExpression(
      cond,
      undefined,
      ifTrue.ts(),
      undefined,
      ifFalse.ts()
    );
  },
  TernaryExp_symbolic(condition, _0, ifTrue, _1, ifFalse) {
    return ts.factory.createConditionalExpression(
      condition.ts(),
      ts.factory.createToken(ts.SyntaxKind.QuestionToken),
      ifTrue.ts(),
      ts.factory.createToken(ts.SyntaxKind.ColonToken),
      ifFalse.ts()
    );
  },
  TopLevelExp(node) {
    return node.ts();
  },
  TopLevelExp_break(_) {
    return ts.factory.createBreakStatement();
  },
  TopLevelExp_continue(_) {
    return ts.factory.createContinueStatement();
  },
  TopLevelExp_expression(node) {
    let expr = node.ts<ts.Expression>();

    if (
      expr.kind === ts.SyntaxKind.ClassExpression ||
      expr.kind === ts.SyntaxKind.FunctionExpression
    ) {
      expr = (ts.factory.createParenthesizedExpression(expr), expr);
    }

    return ts.factory.createExpressionStatement(expr);
  },
  TopLevelExp_return(_, expr) {
    return ts.factory.createReturnStatement(expr.child(0)?.ts<ts.Expression>());
  },
  TopLevelExp_throw(_, expr) {
    return ts.factory.createThrowStatement(expr.ts<ts.Expression>());
  },
  TopLevelIfExp(node) {
    return node.ts();
  },
  TopLevelIfExp_if(expr, ifUnless, _, condition) {
    let cond = condition.ts<ts.Expression>();

    if (ifUnless.sourceString === "unless")
      cond = (ts.factory.createLogicalNot(cond), cond);

    return ts.factory.createIfStatement(cond, expr.ts());
  },
  TopLevelForExp(node) {
    return node.ts();
  },
  TopLevelForExp_for(
    expr,
    _0,
    _1,
    await,
    _2,
    assignable,
    _3,
    _4,
    iterable,
    _5,
    _6,
    guard
  ) {
    let statement = expr.ts<ts.Statement>();

    if (guard.sourceString)
      statement = ts.factory.createIfStatement(guard.child(0).ts(), statement);

    return ts.factory.createForOfStatement(
      await
        .child(0)
        ?.tsn({ await: ts.factory.createToken(ts.SyntaxKind.AwaitKeyword) }),

      ts.factory.createVariableDeclarationList(
        [
          ts.factory.createVariableDeclaration(
            assignable.child(0)?.ts<ts.BindingName>() || "$loop"
          ),
        ],
        ts.NodeFlags.Let
      ),
      iterable.ts(),
      statement
    );
  },
  TopLevelWhileExp(node) {
    return node.ts();
  },
  TopLevelWhileExp_while(expr, whileUntil, _0, condition, _1, _2, guard) {
    let statement = expr.ts<ts.Statement>();

    if (guard.sourceString)
      statement = ts.factory.createIfStatement(guard.child(0).ts(), statement);

    let cond = condition.ts<ts.Expression>();

    if (whileUntil.sourceString == "until")
      cond = ts.factory.createLogicalNot(cond);

    return ts.factory.createWhileStatement(cond, statement);
  },
  TryStatement(_0, _1, block, _catch, _finally) {
    let catchBlock = _catch.child(0)?.ts<ts.CatchClause>();
    let finallyBlock = _finally.child(0)?.ts<ts.Block>();

    if (!_catch.sourceString && !_finally.sourceString) {
      catchBlock = ts.factory.createCatchClause(
        undefined,
        ts.factory.createBlock([])
      );
    }

    return ts.factory.createTryStatement(block.ts(), catchBlock, finallyBlock);
  },
  TupleElement(node) {
    return node.ts();
  },
  TupleElement_spread_operator(_, type) {
    return ts.factory.createSpreadElement(type.ts());
  },
  TupleElement_value(type, qMark) {
    if (qMark.sourceString) return ts.factory.createOptionalTypeNode(type.ts());
    return type.ts();
  },
  Type(node) {
    return node.ts();
  },
  TypeDeclaration(_export, _0, _1, _2, ident, generics, _3, value, _4) {
    return ts.factory.createTypeAliasDeclaration(
      undefined,
      _export.sourceString
        ? [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)]
        : undefined,
      ident.ts<ts.Identifier>(),
      generics.tsa(),
      value.ts()
    );
  },
  TypeObjectEntry(node) {
    return node.ts();
  },
  TypeObjectEntry_call_signature(signature) {
    let fn = signature.ts<ts.FunctionTypeNode>();

    return ts.factory.createCallSignature(
      fn.typeParameters,
      fn.parameters,
      fn.type
    );
  },
  TypeObjectEntry_construct_signature(_0, _1, signature) {
    let fn = signature.ts<ts.FunctionTypeNode>();

    return ts.factory.createConstructSignature(
      fn.typeParameters,
      fn.parameters,
      fn.type
    );
  },
  TypeObjectEntry_key_value(readonly, _0, key, qMark, _1, value) {
    return ts.factory.createPropertySignature(
      readonly.sourceString
        ? [ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)]
        : undefined,
      key.ts<ts.PropertyName>(),
      qMark.tsn({ "?": ts.factory.createToken(ts.SyntaxKind.QuestionToken) }),
      value.ts<ts.TypeNode>()
    );
  },
  TypeObjectKey(node) {
    return node.ts();
  },
  TypeObjectKey_computed_accessor(_0, accessor, _1) {
    return ts.factory.createComputedPropertyName(accessor.ts());
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
    return ts.factory.createParameterDeclaration(
      undefined,
      undefined,
      undefined,
      ident.ts<ts.BindingName>(),
      qMark.tsn({ "?": ts.factory.createToken(ts.SyntaxKind.QuestionToken) }),
      type.ts<ts.TypeNode>()
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
  TypeRestParameter(_0, ident, _1, type) {
    return ts.factory.createParameterDeclaration(
      undefined,
      undefined,
      ts.factory.createToken(ts.SyntaxKind.DotDotDotToken),
      ident.ts<ts.BindingName>(),
      undefined,
      type.ts<ts.TypeNode>()
    );
  },
  TypedVariableAssignment(assignable, _0, type, _1, expr) {
    let declaration = ts.factory.createVariableDeclaration(
      assignable.ts<ts.BindingName>(),
      undefined,
      type.child(0)?.ts<ts.TypeNode>(),
      expr.ts<ts.Expression>()
    );

    let list = ts.factory.createVariableDeclarationList(
      [declaration],
      ts.NodeFlags.Let
    );

    return ts.factory.createVariableStatement(undefined, list);
  },
  terminator(_0, _1) {
    throw new Error("`terminator` nodes should never directly be evaluated.");
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
    if (iter.children.length === 1) return iter.child(0).ts();

    return ts.factory.createUnionTypeNode(node.tsa());
  },
  UnprefixedSingleStatementBlock(node) {
    return node.ts();
  },
  UnprefixedSingleStatementBlock_single_statement(statement) {
    return ts.factory.createBlock([statement.ts()], true);
  },
  undefined(_) {
    return ts.factory.createVoidZero();
  },
  unitNumber(number, identifier) {
    let num = number.ts<ts.NumericLiteral>();
    let str = ts.factory.createStringLiteral(number.sourceString);
    let ident = identifier.ts<ts.Identifier>();

    let numEl = ts.factory.createPropertyAssignment("number", num);
    let strEl = ts.factory.createPropertyAssignment("string", str);
    let obj = ts.factory.createObjectLiteralExpression([numEl, strEl], false);

    return ts.factory.createCallExpression(ident, undefined, [obj]);
  },
  VariableAssignment(assignable, _0, type, _1, expr) {
    return ts.factory.createVariableDeclaration(
      assignable.ts<ts.BindingName>(),
      undefined,
      type.child(0)?.ts<ts.TypeNode>(),
      expr.ts<ts.Expression>()
    );
  },
  WrappedStatementBlock(_0, statements, _1) {
    return ts.factory.createBlock(statements.tsa(), true);
  },
  whitespace(_) {
    throw new Error("`whitespace` nodes should never directly be evaluated.");
  },
  word(_0, _1, _2) {
    return ts.factory.createIdentifier(this.sourceString);
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
