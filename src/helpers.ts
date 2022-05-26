import * as ohm from "ohm-js";
import * as ts from "typescript";

let newlines = /\s*\n+\s*/g;
let begin = /^\s*\n+\s*/g;
let end = /\s*\n+\s*$/g;

/** A set of flags that Storymatic should consider when compiling. */
export interface Flags {
  /**
   * Whether the transpiler should output raw TypeScript code. Conflicts with
   * the `module`, `target`, and `jsx` flags.
   */
  typescript?: boolean;

  /**
   * The module format the transpiler should output, such as
   * `ts.ModuleKind.ESNext`. Conflicts with the `typescript` flag.
   */
  module?: ts.ModuleKind;

  /**
   * The version of ECMAScript to output, such as `ts.ScriptTarget.ESNext`.
   * Conflicts with the `typescript` flag.
   */
  target?: ts.ScriptTarget;

  /**
   * The name of the JSX runtime compiler, such as `React.createElement`.
   * Conflicts with the `typescript` flag.
   */
  jsx?: string;
}

/**
 * Changes newlines in a string to spaces.
 * @param node The string or template literal to adjust.
 * @returns A converted string or template literal.
 */
export function transformSingleLineString(
  node: ts.StringLiteral | ts.TemplateLiteral | ts.TemplateLiteralTypeNode
) {
  if (ts.isStringLiteral(node)) {
    return ts.factory.createStringLiteral(
      node.text.replace(begin, "").replace(end, "").replace(newlines, " ")
    );
  }

  if (ts.isNoSubstitutionTemplateLiteral(node)) {
    return ts.factory.createNoSubstitutionTemplateLiteral(
      node.text.replace(begin, "").replace(end, "").replace(newlines, " ")
    );
  }

  if (ts.isTemplateExpression(node)) {
    return ts.factory.createTemplateExpression(
      ts.factory.createTemplateHead(
        node.head.text.replace(begin, "").replace(newlines, " ")
      ),
      node.templateSpans.map((span, index, arr) => {
        let text = span.literal.text;
        if (index === arr.length - 1) text = text.replace(end, "");

        return ts.factory.updateTemplateSpan(
          span,
          span.expression,
          ts.isTemplateMiddle(span.literal)
            ? ts.factory.createTemplateMiddle(text.replace(newlines, " "))
            : ts.factory.createTemplateTail(text.replace(newlines, " "))
        );
      })
    );
  }

  if (ts.isTemplateLiteralTypeNode(node)) {
    return ts.factory.createTemplateLiteralType(
      ts.factory.createTemplateHead(
        node.head.text.replace(begin, "").replace(newlines, " ")
      ),
      node.templateSpans.map((span, index, arr) => {
        let text = span.literal.text;
        if (index === arr.length - 1) text = text.replace(end, "");

        return ts.factory.updateTemplateLiteralTypeSpan(
          span,
          span.type,
          ts.isTemplateMiddle(span.literal)
            ? ts.factory.createTemplateMiddle(text.replace(newlines, " "))
            : ts.factory.createTemplateTail(text.replace(newlines, " "))
        );
      })
    );
  }

  throw new Error("Bad arguments were passed to `transformSingleLineString`");
}

/**
 * Cuts off the beginning and end of multiline strings and removes whitespace.
 * @param cutoff The number of columns to chop off or an {@link ohm.Interval}
 * with the beginning index at the first character of the string.
 * @param node The string of template literal to adjust.
 * @returns A converted string or template literal.
 */
export function transformMultiLineString(
  cutoff: number | ohm.Interval,
  node: ts.StringLiteral | ts.TemplateLiteral | ts.TemplateLiteralTypeNode
) {
  if (typeof cutoff === "object") {
    let whitespace =
      cutoff.contents.length - cutoff.contents.trimStart().length;

    if (whitespace === cutoff.contents.length) {
      cutoff = 0;
    } else {
      let lastNewline = cutoff.contents.slice(0, whitespace).lastIndexOf("\n");

      if (lastNewline === -1) {
        cutoff =
          +(
            cutoff
              .trimmed()
              .getLineAndColumnMessage()
              .match(/col (\d+)/)?.[1] || 0
          ) - 1;
      } else {
        cutoff = whitespace - lastNewline - 1;
      }
    }
  }

  let newlines = new RegExp(`\\n\\s{0,${cutoff}}`, "g");

  if (ts.isStringLiteral(node)) {
    return ts.factory.createStringLiteral(
      node.text.replace(begin, "").replace(end, "").replace(newlines, "\n")
    );
  }

  if (ts.isNoSubstitutionTemplateLiteral(node)) {
    return ts.factory.createNoSubstitutionTemplateLiteral(
      node.text.replace(begin, "").replace(end, "").replace(newlines, "\n")
    );
  }

  if (ts.isTemplateExpression(node)) {
    return ts.factory.createTemplateExpression(
      ts.factory.createTemplateHead(
        node.head.text.replace(begin, "").replace(newlines, "\n")
      ),
      node.templateSpans.map((span, index, arr) => {
        let text = span.literal.text;
        if (index === arr.length - 1) text = text.replace(end, "");

        return ts.factory.updateTemplateSpan(
          span,
          span.expression,
          ts.isTemplateMiddle(span.literal)
            ? ts.factory.createTemplateMiddle(text.replace(newlines, "\n"))
            : ts.factory.createTemplateTail(text.replace(newlines, "\n"))
        );
      })
    );
  }

  if (ts.isTemplateLiteralTypeNode(node)) {
    return ts.factory.createTemplateLiteralType(
      ts.factory.createTemplateHead(
        node.head.text.replace(begin, "").replace(newlines, "\n")
      ),
      node.templateSpans.map((span, index, arr) => {
        let text = span.literal.text;
        if (index === arr.length - 1) text = text.replace(end, "");

        return ts.factory.updateTemplateLiteralTypeSpan(
          span,
          span.type,
          ts.isTemplateMiddle(span.literal)
            ? ts.factory.createTemplateMiddle(text.replace(newlines, "\n"))
            : ts.factory.createTemplateTail(text.replace(newlines, "\n"))
        );
      })
    );
  }

  throw new Error("Bad arguments were passed to `transformMultiLineString`");
}

/**
 * Adds indent markers and normalizes strings into a proper form.
 * @param text The source code to modify.
 * @returns A string containing indent/dedent markers.
 */
export function preCompile(text: string) {
  type Indented = { indentLevel: number; content: string };

  type Tree = {
    indentLevel: number;
    content: (string | Tree)[];
    parent?: Tree;
  };

  text = text.replace(/\t/g, "  ").replace(/[⇦⇨]+/g, "") + "\n";
  let sections: Indented[] = text.split(/[\r\n]+/g).map((e) => ({
    indentLevel: e.match(/^\s+/)?.[0].length || 0,
    content: e,
  }));

  // As we go through the indents we have to track whether we're in a string.
  let embeddings: StringMode[] = [];
  type StringMode = '"' | "'" | "expr";
  let oldSections = sections.slice();
  sections = [];

  for (let node of oldSections) {
    let prev = sections[sections.length - 1];
    let last = embeddings[embeddings.length - 1];

    if (last === "'" || last === '"') {
      if (prev) {
        prev.content += "\n" + node.content;
      } else {
        sections.push(node);
      }
    } else {
      sections.push(node);
    }

    for (let char of node.content) {
      let last = embeddings[embeddings.length - 1];

      if (char === '"' && (last === "expr" || !last)) {
        embeddings.push('"');
      } else if (char === "'" && (last === "expr" || !last)) {
        embeddings.push("'");
      } else if (last && char === last) {
        embeddings.pop();
      }
    }
  }

  let top: Tree = { indentLevel: 0, content: [] };
  sections.reduce<Tree>(function reduce(prev, next): Tree {
    if (!next.content.trim().length) {
      prev.content.push(next.content);
      return prev;
    }

    if (next.indentLevel === prev.indentLevel) {
      prev.content.push(next.content);
      return prev;
    } else if (next.indentLevel > prev.indentLevel) {
      let item: Tree = {
        indentLevel: next.indentLevel,
        content: [next.content],
        parent: prev,
      };

      prev.content.push(item);
      return item;
    } else if (prev.parent) {
      return reduce(prev.parent, next);
    } else throw new Error("Unexpected indentation error");
  }, top);

  let result = (function traverse(node): string {
    delete node.parent;

    let output = "";
    let prev: string | Tree | undefined;

    for (let child of node.content) {
      if (
        typeof prev === "string" &&
        typeof child === "object" &&
        !prev.endsWith(",")
      ) {
        child = `⇨${traverse(child)}⇦`;
      }

      if (typeof child === "object") {
        child = traverse(child);
      }

      if (!output) output = child;
      else output += `\n${child}`;

      prev = child;
    }

    return output;
  })(top);

  return result;
}

/**
 * Creates a list of options to pass to the TypeScript compiler.
 * @param flags The list of flags to consider when creating the options.
 * @returns A list of compiler options that should be passed to TypeScript.
 */
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

/**
 * Modifies a TypeScript node to pretty-print some of the code within.
 * @param node The node to transform.
 * @returns A transformed {@link ts.Node} ready to be transpiled.
 */
export function prePrinted(node: ts.Node) {
  interface ObjectScope {
    isMultilineObject?: boolean;
  }

  let result = ts.transform(node, [
    (context) => {
      function visit(
        node: ts.Node,
        objectScope: ObjectScope
      ): ts.Node | ts.Node[] {
        if (
          ts.isSourceFile(node) ||
          ts.isBlock(node) ||
          ts.isClassDeclaration(node) ||
          ts.isClassExpression(node)
        ) {
          objectScope.isMultilineObject = true;
        }

        if (ts.isArrayLiteralExpression(node)) {
          let scope: ObjectScope = { isMultilineObject: false };

          let it = ts.visitEachChild(
            node,
            (node) => visit(node, scope),
            context
          );

          if (scope.isMultilineObject) {
            it = ts.factory.createArrayLiteralExpression(it.elements, true);
            objectScope.isMultilineObject = true;
          }

          return it;
        }

        if (ts.isObjectLiteralExpression(node)) {
          let scope: ObjectScope = { isMultilineObject: false };

          let it = ts.visitEachChild(
            node,
            (node) => visit(node, scope),
            context
          );

          if (scope.isMultilineObject) {
            it = ts.factory.createObjectLiteralExpression(it.properties, true);
            objectScope.isMultilineObject = true;
          }

          return it;
        }

        if (ts.isArrowFunction(node)) {
          let { body } = node;

          if (ts.isBlock(body) && body.statements.length === 1) {
            let stmt = body.statements[0];

            if (ts.isReturnStatement(stmt)) {
              node = ts.factory.updateArrowFunction(
                node,
                node.modifiers,
                node.typeParameters,
                node.parameters,
                node.type,
                node.equalsGreaterThanToken,
                stmt.expression || ts.factory.createBlock([], false)
              );
            }
          }
        }

        return ts.visitEachChild(
          node,
          (node) => visit(node, objectScope),
          context
        );
      }

      return (node) => visit(node, {}) as ts.Node;
    },
  ]);

  return result.transformed[0];
}
