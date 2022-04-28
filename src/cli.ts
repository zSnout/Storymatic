import { Recoverable, start } from "repl";
import { Node } from "typescript";
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
  .option("commonjs", {
    alias: "c",
    conflicts: "typescript",
    desc: "compile modules to CommonJS",
    type: "boolean",
  })
  .option("jsx", {
    alias: "j",
    conflicts: "typescript",
    desc: "compile JSX code to `h(tag, props, ...children)`",
    type: "boolean",
  })
  .option("debug", {
    alias: "D",
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
    alias: "s",
    desc: "location of input files",
    type: "string",
  })
  .option("dist", {
    alias: "d",
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

function execute(node: Node) {
  if (args.typescript) {
    throw "not implemented";
  } else {
    return runInNewContext(transpile(node, args), undefined);
  }
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
      let node: Node;

      try {
        node = compile(cmd);
        output = transpile(node, args);
      } catch (e) {
        if (args.debug) console.log(e);
        cb(new Recoverable(new SyntaxError()), null);
        return;
      }

      output = output.replace('"use strict";\n', "");
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
