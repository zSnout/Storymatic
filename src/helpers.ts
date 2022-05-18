import * as ohm from "ohm-js";
import * as ts from "typescript";

let newlines = /\s*\n+\s*/g;
let begin = /^\s*\n+\s*/g;
let end = /\s*\n+\s*$/g;

export interface Flags {
  typescript?: boolean;
  module?: ts.ModuleKind;
  target?: ts.ScriptTarget;
  jsx?: string;
}

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

export function addIndentMarkers(text: string) {
  type Indented = { indentLevel: number; content: string };

  type Tree = {
    indentLevel: number;
    content: (string | Tree)[];
    parent?: Tree;
  };

  text = text.replace(/[⇦⇨]+/g, "") + "\n";
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
      if (typeof prev === "string" && typeof child === "object") {
        let lastChar = prev.trimEnd()[prev.length - 1] || "";
        let prevChar = prev.trimEnd()[prev.length - 2] || "";

        if (
          !"+-*/%^&|?:[={(><.,".includes(lastChar) ||
          (lastChar === "/" && "*/".includes(prevChar)) ||
          (lastChar === ">" && "-=".includes(prevChar))
        ) {
          child = `⇨${traverse(child)}⇦`;
        }
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
