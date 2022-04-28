import { Recoverable, start } from "repl";
import * as ts from "typescript";
import { runInContext, runInNewContext } from "vm";
import * as yargs from "yargs";
import { compile, transpile } from "./index.js";

let args = yargs
  .scriptName("sm")
  .option("typescript", {
    alias: "t",
    desc: "compile code to TypeScript",
    type: "boolean",
  })
  .option("module", {
    alias: "m",
    conflicts: "typescript",
    desc: "the module type to compile to (default: esm)",
    default: ts.ModuleKind.ESNext,
    coerce(module) {
      let name = ("" + module).toLowerCase();

      let moduleType: Record<string, ts.ModuleKind> = {
        esm: ts.ModuleKind.ESNext,
        esnext: ts.ModuleKind.ESNext,
        es2015: ts.ModuleKind.ES2015,
        es2020: ts.ModuleKind.ES2020,
        es2022: ts.ModuleKind.ES2022,
        system: ts.ModuleKind.System,
        amd: ts.ModuleKind.AMD,
        commonjs: ts.ModuleKind.CommonJS,
        cjs: ts.ModuleKind.CommonJS,
        node12: ts.ModuleKind.Node12,
        nodenext: ts.ModuleKind.NodeNext,
        node: ts.ModuleKind.NodeNext,
      };

      return moduleType[name] || ts.ModuleKind.ESNext;
    },
  })
  .option("jsx", {
    alias: "j",
    conflicts: "typescript",
    desc: "compile JSX code",
    type: "string",
  })
  .option("debug", {
    alias: "d",
    desc: "output extra debug information",
    type: "boolean",
  })
  .option("interactive", {
    alias: "i",
    desc: "enter the REPL",
    type: "boolean",
  })
  .option("output", {
    alias: "o",
    conflicts: "ast",
    desc: "show the transpiled code without executing",
    type: "boolean",
  })
  .option("ast", {
    alias: "a",
    conflicts: "output",
    desc: "show the parsed AST nodes",
    type: "boolean",
  })
  .option("eval", {
    alias: "e",
    desc: "evaluate code",
    type: "string",
  })
  .option("print", {
    alias: "p",
    desc: "evaluate script and print result",
    type: "boolean",
  })
  .option("help", {
    alias: "h",
    desc: "open this help menu",
  })
  .option("src", {
    desc: "location of input files",
    type: "string",
  })
  .option("dist", {
    desc: "location of output files",
    type: "string",
  })
  .parseSync();

if (args.eval) {
  let code = args.eval;
  let compiled = compile(code, args);

  if (args.output) {
    if (args.print) console.log(transpile(compiled, args));
  } else if (args.ast) {
    if (args.print) console.log(compiled);
  } else {
    let result = execute(compiled);
    if (args.print) console.log(result);
  }
} else if (process.stdin.isTTY) {
  startREPL(args.output ? "noeval" : args.ast ? "ast" : "repl");
} else {
  // compile given files
}

function execute(node: ts.Node) {
  return runInNewContext(transpile(node, args), undefined);
}

function startREPL(mode: "ast" | "noeval" | "repl" = "repl") {
  console.log("Welcome to the Storymatic REPL.");

  let help = {
    repl: "Enter any expression to run it and output the result.",
    noeval: "Enter any expression to compile it and view the output code.",
    ast: "Enter any expression to compile its AST and output it.",
  }[mode];
  console.log(help);

  let repl = start({
    prompt: "> ",
    eval(cmd, context, _file, cb) {
      let output: any;
      let node: ts.Node;

      try {
        node = compile(cmd);
        if (mode != "ast")
          output = transpile(node, args).replace('"use strict";\n', "");
      } catch (e) {
        if (args.debug) console.log(e);
        cb(new Recoverable(new SyntaxError()), null);
        return;
      }

      if (mode == "repl") output = runInContext(output, context);
      if (mode == "ast") output = node;
      cb(null, output);
    },
    writer: mode == "noeval" ? (x) => "" + x : undefined,
  });

  repl.defineCommand("clear", () => {
    console.clear();
    console.log("Welcome to the Storymatic REPL.");
    console.log(help);
    process.stdout.write("> ");
  });
}
