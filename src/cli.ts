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
  .option("interactive", {
    alias: "i",
    desc: "enter the REPL",
    type: "boolean",
  })
  .option("output", {
    alias: "o",
    desc: "show the transpiled code without executing",
    type: "boolean",
  })
  .option("eval", {
    alias: "e",
    desc: "evaluate code",
    type: "array",
  })
  .option("print", {
    alias: "p",
    desc: "evaluate script and print result",
    type: "array",
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

if (process.stdin.isTTY) {
  startREPL(args.output ? "noeval" : "repl");
} else if (args.eval?.length || args.print?.length) {
  let code = "";
  if (args.eval?.length) code = `${args.eval[args.eval.length - 1]}`;
  if (args.print?.length) code = `${args.print[args.print.length - 1]}`;

  let compiled = compile(code, args);

  if (args.output) {
    if (args.print) console.log(compiled);
  } else {
    let result = execute(compiled);
    if (args.print) console.log(result);
  }
} else {
  // compile given files
}

function execute(node: Node) {
  if (args.typescript) {
    throw "not implemented";
  } else {
    runInNewContext(transpile(node, args), undefined);
  }
}

function startREPL(mode: "repl" | "noeval" = "repl") {
  console.log("Welcome to the Storymatic REPL.");
  console.log("Enter any expression to run it and output the result.");

  let repl = start({
    prompt: "> ",
    eval(cmd, context, _file, cb) {
      let output: any;

      try {
        let node = compile(cmd);
        output = transpile(node, args);
      } catch {
        cb(new Recoverable(new SyntaxError()), null);
        return;
      }

      output = output.replace('"use strict";\n', "");
      if (mode == "repl") output = runInContext(output, context);
      cb(null, output);
    },
  });

  repl.defineCommand("clear", () => {
    console.clear();
    console.log("Welcome to the Storymatic REPL.");
    console.log("Enter any expression to run it and output the result.");
    process.stdout.write("> ");
  });
}
