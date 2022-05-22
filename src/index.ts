import * as ohm from "ohm-js";
import * as ts from "typescript";
import * as grammar from "./grammar.js";
import { story, semantics } from "./semantics.js";
export { typescriptAST } from "./ast.js";

import {
  preCompile,
  Flags,
  makeCompilerOptions,
  transformMultiLineString,
  transformSingleLineString,
} from "./helpers.js";
export * from "./helpers.js";

export function compile(text: string) {
  let match = story.match(preCompile(text));
  if (match.failed()) throw new SyntaxError(match.message);

  let file = semantics(match).ts<ts.SourceFile>();
  return file;
}

export function ast(text: string) {
  let match = story.match(preCompile(text));
  if (match.failed()) throw new SyntaxError(match.message);

  return semantics(match).tree();
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

  return ts.transpileModule(text, {
    compilerOptions: makeCompilerOptions(flags),
  }).outputText;
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

function transformer(context: ts.TransformationContext) {
  return (node: ts.Block) => {
    interface FunctionScope {
      isAsync: boolean;
      isGenerator: boolean;
      usesThis: boolean;
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
      if (
        ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node)
      ) {
        let fn = node as
          | ts.FunctionDeclaration
          | ts.FunctionExpression
          | ts.ArrowFunction;

        let scope: FunctionScope = {
          isAsync: false,
          isGenerator: false,
          usesThis: false,
        };

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

        if (scope.usesThis) {
          fnScope.usesThis = true;
        }

        if (fn.kind === ts.SyntaxKind.FunctionExpression) {
          fn = ts.factory.updateFunctionExpression(
            fn,
            modifiers,
            asterisk,
            fn.name,
            fn.typeParameters,
            fn.parameters,
            fn.type,
            fn.body
          );
        } else if (fn.kind === ts.SyntaxKind.FunctionDeclaration) {
          fn = ts.factory.updateFunctionDeclaration(
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
        } else if (fn.kind === ts.SyntaxKind.ArrowFunction) {
          if (asterisk) {
            let f = ts.factory.createCallExpression(
              ts.factory.createPropertyAccessExpression(
                ts.factory.createFunctionExpression(
                  modifiers,
                  asterisk,
                  fn.name,
                  fn.typeParameters,
                  fn.parameters,
                  fn.type,
                  fn.body as ts.Block
                ),
                "bind"
              ),
              undefined,
              [ts.factory.createThis()]
            );

            if (scope.usesThis) {
              (f as any).__storymaticUsesThis = true;
            }

            return f;
          } else {
            fn = ts.factory.updateArrowFunction(
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

        if (scope.usesThis) (fn as any).__storymaticUsesThis = true;

        return fn;
      }

      if (autoReturn && ts.isCaseClause(node)) {
        let stmt = node.statements[0];

        if (node.statements.length === 1 && ts.isBlock(stmt)) {
          let last = stmt.statements[stmt.statements.length - 2];
          let _break = stmt.statements[stmt.statements.length - 1];
          // `last` is the 2nd last statement for a `case` block because we add `break` statements.

          return ts.factory.updateCaseClause(node, node.expression, [
            ts.visitEachChild(
              stmt,
              (node) =>
                node === _break
                  ? undefined
                  : visit(
                      node,
                      fnScope,
                      blockScope,
                      autoReturn && node === last ? autoReturn : false,
                      exclude
                    ),
              context
            ),
          ]);
        }
      }

      if (autoReturn && ts.isDefaultClause(node)) {
        let stmt = node.statements[0];

        if (node.statements.length === 1 && ts.isBlock(stmt)) {
          let last = stmt.statements[stmt.statements.length - 1];

          return ts.factory.updateDefaultClause(node, [
            ts.visitEachChild(
              stmt,
              (node) =>
                visit(
                  node,
                  fnScope,
                  blockScope,
                  autoReturn && node === last ? autoReturn : false,
                  exclude
                ),
              context
            ),
          ]);
        }
      }

      if (autoReturn && ts.isIterationStatement(node, false)) {
        let result: typeof autoReturn = "$res";
        if (autoReturn.startsWith("$res")) result += +autoReturn.slice(4) + 1;

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
          autoReturn === "return"
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

        if (ts.SyntaxKind.EqualsToken === bin.operatorToken.kind) {
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

      if (ts.isExpressionStatement(node) && autoReturn === "return") {
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

      if (
        (ts.isIdentifier(node) && node.text === "this") ||
        node.kind === ts.SyntaxKind.ThisKeyword
      ) {
        fnScope.usesThis = true;
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

        if (fnScope.usesThis) {
          call = ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(fn, "call"),
            undefined,
            [ts.factory.createThis()]
          );
        }

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

    let fnScope: FunctionScope = {
      isAsync: false,
      isGenerator: false,
      usesThis: false,
    };

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

    if (endExpr && dotdot.sourceString === "..") {
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
      yes: ts.factory.createTrue(),
      no: ts.factory.createFalse(),
      on: ts.factory.createTrue(),
      off: ts.factory.createFalse(),
    })!;
  },
  CaseClause(_0, _1, expr, _2) {
    return expr
      .asIteration()
      .children.map((expr) =>
        ts.factory.createCaseClause(expr.ts(), [])
      ) as any;
  },
  CaseStatement(clauseNodes, blockNode) {
    let clauses = clauseNodes.children
      .map((node) => node.ts() as ts.CaseClause | ts.CaseClause[])
      .flat();

    let finalClause = clauses.pop()!;
    let breakStatement = ts.factory.createBreakStatement();
    let block = blockNode.ts<ts.Block>();
    let statements = block.statements.concat(breakStatement);

    let clause = ts.factory.createCaseClause(finalClause.expression, [
      ts.factory.createBlock(statements, true),
    ]);

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
  CatchStatement(_0, _1, ident, block) {
    return ts.factory.createCatchClause(
      ident.child(0)?.ts<ts.Identifier>(),
      block.child(0)?.ts() || ts.factory.createBlock([])
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
  ClassElement_property(property, _) {
    return property.ts();
  },
  ClassElement_static_property(property, _) {
    let prop = property.ts<ts.PropertyDeclaration>();
    let keyword = ts.factory.createToken(ts.SyntaxKind.StaticKeyword);

    return ts.factory.createPropertyDeclaration(
      prop.decorators,
      prop.modifiers?.concat(keyword) || [keyword],
      prop.name,
      prop.questionToken || prop.exclamationToken,
      prop.type,
      prop.initializer
    );
  },
  ClassElement_static_index_signature(signature, _) {
    return signature.ts();
  },
  ClassElement_static_method(method) {
    return method.ts();
  },
  ClassProperty(
    privacy,
    readonly,
    _0,
    _1,
    name,
    mark,
    _2,
    type,
    _3,
    initializer
  ) {
    let modifiers = privacy.sourceString ? [privacy.ts<ts.Modifier>()] : [];

    if (readonly.sourceString) {
      modifiers.push(ts.factory.createToken(ts.SyntaxKind.ReadonlyKeyword));
    }

    return ts.factory.createPropertyDeclaration(
      undefined,
      modifiers,
      name.ts<ts.PropertyName>(),
      mark.child(0)?.tsn({
        "?": ts.factory.createToken(ts.SyntaxKind.QuestionToken),
        "!": ts.factory.createToken(ts.SyntaxKind.ExclamationToken),
      }),
      type.child(0)?.ts<ts.TypeNode>(),
      initializer.child(0)?.ts<ts.Expression>()
    );
  },
  CompareExp(primary, ops, exps) {
    if (!ops.numChildren) {
      return primary.ts();
    }

    if (ops.numChildren === 1) {
      return ts.factory.createBinaryExpression(
        primary.ts(),
        ops.child(0).ts<ts.BinaryOperatorToken>(),
        exps.child(0).ts()
      );
    }

    let $ref = () => ts.factory.createIdentifier("$ref");
    let expr: ts.Expression | undefined;
    let ref: ts.Expression | undefined;

    for (let i = 0; i < ops.numChildren; i++) {
      let exp = exps.child(i).ts<ts.Expression>();
      let rhs = (ts.isLiteralExpression(exp) || ts.isIdentifier(exp)) && exp;
      if (i === ops.numChildren - 1) rhs = exp as any;

      if (expr) {
        expr = ts.factory.createLogicalAnd(
          expr,
          ts.factory.createBinaryExpression(
            ref!,
            ops.child(i).ts<ts.BinaryOperatorToken>(),
            rhs || ts.factory.createAssignment($ref(), exps.child(i).ts())
          )
        );
      } else {
        expr = ts.factory.createBinaryExpression(
          primary.ts(),
          ops.child(i).ts<ts.BinaryOperatorToken>(),
          rhs || ts.factory.createAssignment($ref(), exps.child(i).ts())
        );
      }

      ref = rhs || $ref();
    }

    return expr!;
  },
  ConditionalType(node) {
    return node.ts();
  },
  ConditionalType_conditional(target, _0, _1, mustBe, _2, ifTrue, _3, ifFalse) {
    return ts.factory.createConditionalTypeNode(
      target.ts(),
      mustBe.ts(),
      ifTrue.ts(),
      ifFalse.ts()
    );
  },
  ConditionalType_if_then_else(
    ifUnless,
    _0,
    target,
    _1,
    _2,
    mustBe,
    _3,
    _4,
    ifTrue,
    _5,
    _6,
    ifFalse
  ) {
    if (ifUnless.sourceString === "unless") {
      [ifTrue, ifFalse] = [ifFalse, ifTrue];
    }

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
  comparisonOperator(node) {
    return node.ts();
  },
  comparisonOperator_equal_to(_) {
    return ts.factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken);
  },
  comparisonOperator_greater_than(_) {
    return ts.factory.createToken(ts.SyntaxKind.GreaterThanToken);
  },
  comparisonOperator_greater_than_equal(_) {
    return ts.factory.createToken(ts.SyntaxKind.GreaterThanEqualsToken);
  },
  comparisonOperator_in(_0, _1) {
    return ts.factory.createToken(ts.SyntaxKind.InKeyword);
  },
  comparisonOperator_instanceof(_) {
    return ts.factory.createToken(ts.SyntaxKind.InstanceOfKeyword);
  },
  comparisonOperator_less_than(_) {
    return ts.factory.createToken(ts.SyntaxKind.LessThanToken);
  },
  comparisonOperator_less_than_equal(_) {
    return ts.factory.createToken(ts.SyntaxKind.LessThanEqualsToken);
  },
  comparisonOperator_not_equal_to(_) {
    return ts.factory.createToken(ts.SyntaxKind.ExclamationEqualsEqualsToken);
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
    return block.child(0)?.ts() || ts.factory.createBlock([]);
  },
  ForExp(node) {
    return node.ts();
  },
  ForExp_for(
    expr,
    _0,
    _1,
    _await,
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
            _await.child(0)?.tsn({
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
  Function(generics, _0, params, _1, _2, type, arrow, body) {
    if (arrow.sourceString === "=>") {
      return ts.factory.createArrowFunction(
        undefined,
        generics.child(0)?.child(0)?.tsa(),
        params.child(0)?.child(0)?.tsa(),
        type.child(0)?.child(0)?.ts<ts.TypeNode>(),
        undefined,
        body.child(0)?.ts() || ts.factory.createVoidZero()
      );
    } else {
      return ts.factory.createFunctionExpression(
        undefined,
        undefined,
        undefined,
        generics.child(0)?.child(0)?.tsa(),
        params.child(0)?.child(0)?.tsa(),
        type.child(0)?.child(0)?.ts<ts.TypeNode>(),
        body.child(0)?.ts() || ts.factory.createBlock([], false)
      );
    }
  },
  FunctionBody(node) {
    return node.ts();
  },
  FunctionBody_expression(expression) {
    return ts.factory.createBlock(
      [ts.factory.createReturnStatement(expression.ts<ts.Expression>())],
      true
    );
  },
  FunctionReturnType(node) {
    return node.ts();
  },
  FunctionReturnType_predicate(asserts, _1, param, _2, _3, type) {
    return ts.factory.createTypePredicateNode(
      asserts.child(0)?.tsn({
        asserts: ts.factory.createToken(ts.SyntaxKind.AssertsKeyword),
      }),
      param.ts<ts.Identifier>(),
      type.ts<ts.TypeNode>()
    );
  },
  FunctionType(generics, _0, params, _1, _2, type) {
    return ts.factory.createFunctionTypeNode(
      generics.child(0)?.child(0)?.tsa(),
      params.child(0)?.child(0)?.tsa(),
      type.child(0)?.ts() ||
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword)
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
  IfStatement(ifUnless, _0, condition, block, _1, _2, elseBlock) {
    let cond = condition.ts<ts.Expression>();

    if (ifUnless.sourceString === "unless")
      cond = (ts.factory.createLogicalNot(cond), cond);

    return ts.factory.createIfStatement(
      cond,
      block.ts(),
      elseBlock.child(0)?.ts<ts.Block>()
    );
  },
  IfType(node) {
    return node.ts();
  },
  IfType_if(type, ifUnless, _0, target, _1, _2, constraint) {
    let never: ts.TypeNode = ts.factory.createKeywordTypeNode(
      ts.SyntaxKind.NeverKeyword
    );
    let node = type.ts<ts.TypeNode>();

    if (ifUnless.sourceString === "unless") {
      [node, never] = [never, node];
    }

    return ts.factory.createConditionalTypeNode(
      target.ts(),
      constraint.ts(),
      node,
      never
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
    if (prefix.sourceString === "@")
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
  JSXAttribute_value_expression(key, _0, _1, value, _2) {
    return ts.factory.createJsxAttribute(
      key.ts(),
      ts.factory.createJsxExpression(undefined, value.ts<ts.Expression>())
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
  LiteralExp(node) {
    return node.ts();
  },
  LiteralExp_array(_0, entries, _1, _2) {
    return ts.factory.createArrayLiteralExpression(entries.tsa());
  },
  LiteralExp_do(_, expr) {
    return ts.factory.createCallExpression(expr.ts(), undefined, undefined);
  },
  LiteralExp_object(_0, entries, _1, _2) {
    return ts.factory.createObjectLiteralExpression(entries.tsa());
  },
  LiteralExp_object_implied(entries) {
    return ts.factory.createObjectLiteralExpression(entries.tsa());
  },
  LiteralExp_parenthesized(_0, expr, _1) {
    return expr.ts();
  },
  LiteralExp_statement(statement) {
    return createIIFE(ts.factory.createBlock([statement.ts()], true));
  },
  LiteralExp_with(_0, _1, expr, block) {
    return ts.factory.createCallExpression(
      ts.factory.createPropertyAccessExpression(
        ts.factory.createFunctionExpression(
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          ts.factory.createBlock(
            block
              .ts<ts.Block>()
              .statements.concat(
                ts.factory.createExpressionStatement(ts.factory.createThis())
              ),
            true
          )
        ),
        "call"
      ),
      undefined,
      [expr.ts()]
    );
  },
  LiteralExp_self(_) {
    return ts.factory.createIdentifier("this");
  },
  LiteralExp_topic_token(_) {
    return ts.factory.createIdentifier("$");
  },
  LiteralType(node) {
    return node.ts();
  },
  LiteralType_construct(_, func) {
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
  line_comment(_0, _1) {
    throw new Error("`line_comment` nodes should never directly be evaluated.");
  },
  lineBreak(_0, _1) {
    throw new Error("`lineBreak` nodes should never directly be evaluated.");
  },
  listOf(_) {
    throw new Error("`listOf` nodes should never directly be evaluated.");
  },
  MappedType(node) {
    return node.ts();
  },
  MappedType_mapped(
    _0,
    readonlyPlusMinus,
    readonlyKeyword,
    _1,
    ident,
    _2,
    keys,
    _3,
    asClause,
    _4,
    qMarkPlusMinus,
    qMark,
    _5,
    type,
    _6
  ) {
    return ts.factory.createMappedTypeNode(
      readonlyPlusMinus
        .child(0)
        ?.child(0)
        ?.tsn({
          "+": ts.factory.createToken(ts.SyntaxKind.PlusToken),
          "-": ts.factory.createToken(ts.SyntaxKind.MinusToken),
        }) ||
        readonlyKeyword.child(0)?.tsn({
          "?": ts.factory.createToken(ts.SyntaxKind.ReadonlyKeyword),
        }),
      ts.factory.createTypeParameterDeclaration(
        ident.ts<ts.Identifier>(),
        keys.ts<ts.TypeNode>()
      ),
      asClause.child(0)?.ts<ts.TypeNode>(),
      qMarkPlusMinus
        .child(0)
        ?.child(0)
        ?.tsn({
          "+": ts.factory.createToken(ts.SyntaxKind.PlusToken),
          "-": ts.factory.createToken(ts.SyntaxKind.MinusToken),
        }) ||
        qMark.child(0)?.tsn({
          readonly: ts.factory.createToken(ts.SyntaxKind.QuestionToken),
        }),
      type.ts<ts.TypeNode>(),
      undefined
    );
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

    if (endExpr && dotdot.sourceString === "..") {
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
  MemberAccessType_named_tuple(_0, elements, _1, _2) {
    return ts.factory.createTupleTypeNode(elements.tsa());
  },
  MemberAccessType_object(_0, members, _1, _2) {
    return ts.factory.createTypeLiteralNode(members.tsa());
  },
  MemberAccessType_object_implied(members) {
    return ts.factory.createTypeLiteralNode(members.tsa());
  },
  MemberAccessType_readonly(_, expr) {
    return ts.factory.createTypeOperatorNode(
      ts.SyntaxKind.ReadonlyKeyword,
      expr.ts()
    );
  },
  MemberAccessType_tuple(_0, elements, _1, _2) {
    return ts.factory.createTupleTypeNode(elements.tsa());
  },
  Method(privacy, _, name, qMark, body) {
    let fn = body.ts<ts.FunctionExpression | ts.ArrowFunction>();

    let decl = ts.factory.createMethodDeclaration(
      undefined,
      privacy.sourceString ? [privacy.ts()] : [],
      undefined,
      name.ts<ts.PropertyName>(),
      qMark.tsn({ "?": ts.factory.createToken(ts.SyntaxKind.QuestionToken) }),
      fn.typeParameters,
      fn.parameters,
      fn.type,
      fn.body as ts.Block
    );

    if (fn.kind === ts.SyntaxKind.ArrowFunction)
      (decl as any).__storymaticIsBoundMethod = true;

    return decl;
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
  NonLoopExpression(node) {
    return node.ts();
  },
  NonLoopType(node) {
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
  ObjectEntry_implied(key, _, value) {
    return ts.factory.createPropertyAssignment(
      key.ts<ts.PropertyName>(),
      value.ts()
    );
  },
  ObjectEntry_key_value(key, _, value) {
    return ts.factory.createPropertyAssignment(
      key.ts<ts.PropertyName>(),
      value.ts()
    );
  },
  ObjectEntry_object_method(name, expr) {
    let fn = expr.ts<ts.FunctionExpression | ts.ArrowFunction>();

    if (fn.kind === ts.SyntaxKind.ArrowFunction) {
      return ts.factory.createPropertyAssignment(
        name.ts<ts.PropertyName>(),
        fn
      );
    }

    return ts.factory.createMethodDeclaration(
      undefined,
      undefined,
      undefined,
      name.ts<ts.PropertyName>(),
      undefined,
      fn.typeParameters,
      fn.parameters,
      fn.type,
      fn.body
    );
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
      ts.factory.createIdentifier("this"),
      expr.ts<ts.Expression>()
    );
  },
  Property_identifier(_, prop) {
    return ts.factory.createPropertyAccessExpression(
      ts.factory.createIdentifier("this"),
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
  Script(statements) {
    return traverseScript(
      ts.factory.createSourceFile(
        statements.tsa(),
        ts.factory.createToken(ts.SyntaxKind.EndOfFileToken),
        0
      )
    );
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
        ?.tsn({ await: ts.factory.createToken(ts.SyntaxKind.AwaitKeyword) }),
      list,
      expression.ts(),
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
  Statement_while(whileUntil, _, expression, block) {
    let cond = expression.ts<ts.Expression>();

    if (whileUntil.sourceString === "until")
      cond = ts.factory.createLogicalNot(cond);

    return ts.factory.createWhileStatement(cond, block.ts());
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
    if (char === "⇦" || char === "⇨") char = "";

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
    let literal = ts.factory.createStringLiteral(
      bits.map((e) => e.text).join(""),
      open.sourceString === "'"
    );

    if (open.sourceString.length === 3) {
      return transformMultiLineString(content.source, literal);
    } else {
      return transformSingleLineString(literal);
    }
  },
  string_interpolatable(open, headNode, middle, spansNode, end) {
    let head = headNode.ts<ts.TemplateHead>();
    let spans = spansNode.tsa<ts.TemplateSpan>();

    let literal: ts.TemplateLiteral;
    if (spans.length === 0) {
      literal = ts.factory.createNoSubstitutionTemplateLiteral(
        head.text,
        head.rawText
      );
    } else {
      literal = ts.factory.createTemplateExpression(head, spans);
    }

    if (open.sourceString.length === 3) {
      return transformMultiLineString(
        headNode.source.coverageWith(
          headNode.source,
          middle.source,
          spansNode.source,
          end.source
        ),
        literal
      );
    } else {
      return transformSingleLineString(literal);
    }
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
      cond = ts.factory.createLogicalNot(cond);

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
      undefined,
      ifTrue.ts(),
      undefined,
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
  TopLevelExp_return(_0, _1, expr) {
    return ts.factory.createReturnStatement(expr.child(0)?.ts<ts.Expression>());
  },
  TopLevelExp_throw(_0, _1, expr) {
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
    _await,
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
      _await
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
  TopLevelStatement(node) {
    return node.ts();
  },
  TopLevelStatement_empty_export(_0, _1) {
    return ts.factory.createExportDeclaration(
      undefined,
      undefined,
      false,
      ts.factory.createNamedExports([])
    );
  },
  TopLevelStatement_empty_import(_0, _1, filename, _2) {
    return ts.factory.createImportDeclaration(
      undefined,
      undefined,
      undefined,
      filename.ts()
    );
  },
  TopLevelStatement_export(_0, _1, type, _2, exports, _3, _4) {
    return ts.factory.createExportDeclaration(
      undefined,
      undefined,
      !!type.sourceString,
      ts.factory.createNamedExports(exports.tsa())
    );
  },
  TopLevelStatement_export_all_from(_0, _1, _2, _3, filename, _4) {
    return ts.factory.createExportDeclaration(
      undefined,
      undefined,
      false,
      undefined,
      filename.ts<ts.StringLiteral>()
    );
  },
  TopLevelStatement_export_default(_0, _1, _2, _3, expression, _4) {
    return ts.factory.createExportDefault(expression.ts());
  },
  TopLevelStatement_export_from(
    _0,
    _1,
    type,
    _2,
    exports,
    _3,
    _4,
    _5,
    filename,
    _6
  ) {
    return ts.factory.createExportDeclaration(
      undefined,
      undefined,
      !!type.sourceString,
      ts.factory.createNamedExports(exports.tsa()),
      filename.ts<ts.Expression>()
    );
  },
  TopLevelStatement_export_variable(expr, _) {
    return expr.ts();
  },
  TopLevelStatement_import(
    _0,
    _1,
    type,
    _2,
    imports,
    _3,
    _4,
    _5,
    filename,
    _6
  ) {
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
  TopLevelStatement_import_all(_0, _1, _2, _3, ident, _4, _5, filename, _6) {
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
  TopLevelStatement_import_default(
    _0,
    _1,
    type,
    _2,
    ident,
    _3,
    _4,
    _5,
    filename,
    _6
  ) {
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
  TopLevelWhileExp(node) {
    return node.ts();
  },
  TopLevelWhileExp_while(expr, whileUntil, _0, condition, _1, _2, guard) {
    let statement = expr.ts<ts.Statement>();

    if (guard.sourceString)
      statement = ts.factory.createIfStatement(guard.child(0).ts(), statement);

    let cond = condition.ts<ts.Expression>();

    if (whileUntil.sourceString === "until")
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
      generics.child(0)?.tsa(),
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
  TypeObjectEntry_construct_signature(_, signature) {
    let fn = signature.ts<ts.FunctionTypeNode>();

    return ts.factory.createConstructSignature(
      fn.typeParameters,
      fn.parameters,
      fn.type
    );
  },
  TypeObjectEntry_implied(readonly, _0, key, qMark, _1, value) {
    return ts.factory.createPropertySignature(
      readonly.sourceString
        ? [ts.factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)]
        : undefined,
      key.ts<ts.PropertyName>(),
      qMark.tsn({ "?": ts.factory.createToken(ts.SyntaxKind.QuestionToken) }),
      value.ts<ts.TypeNode>()
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
  TypeObjectEntry_method(name, qMark, call) {
    let fn = call.ts<ts.FunctionTypeNode>();

    return ts.factory.createMethodSignature(
      undefined,
      name.ts<ts.PropertyName>(),
      qMark
        .child(0)
        ?.tsn({ "?": ts.factory.createToken(ts.SyntaxKind.QuestionToken) }),
      fn.typeParameters,
      fn.parameters,
      fn.type
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

    if (whileUntil.sourceString === "until")
      cond = ts.factory.createLogicalNot(cond);

    return createIIFE(
      ts.factory.createBlock(
        [ts.factory.createWhileStatement(cond, statement)],
        true
      )
    );
  },
  WrappedScriptBlock(_0, statements, _1) {
    return ts.factory.createBlock(statements.tsa(), true);
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

  export interface Interval {
    sourceString: string;
  }
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
