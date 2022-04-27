import { Recoverable, start } from "repl";
import { runInContext } from "vm";
import { semantics, grammar } from "./index.js";

if (process.argv[2] == "-c" || process.argv[2] == "--compile") {
  console.log("Welcome to the Storymatic compiler REPL.");
  console.log("Enter any expression to compile it and output the result.");

  let repl = start({
    prompt: "\n> ",
    eval(cmd, _context, _file, cb) {
      try {
        let match = grammar.match(cmd);
        if (match.failed()) {
          throw new Recoverable(new Error(match.shortMessage));
        }

        let { output } = semantics(match).js();
        cb(null, output);
      } catch (e) {
        if (e instanceof Error) cb(e, null);
        else cb(new Error("" + e), null);
      }
    },
    writer: (obj) => ("" + obj).trim(),
  });

  repl.defineCommand("clear", () => {
    console.clear();
    console.log("Welcome to the Storymatic compiler REPL.");
    console.log("Enter any expression to compile it and output the result.");
    process.stdout.write("\n> ");
  });
} else if (process.argv[2] == "-i" || process.argv.length == 2) {
  console.log("Welcome to the Storymatic REPL.");
  console.log("Enter any expression to run it and output the result.");

  let repl = start({
    prompt: "> ",
    eval(cmd, context, _file, cb) {
      try {
        let match = grammar.match(cmd);
        if (match.failed()) {
          cb(new Recoverable(new Error(match.shortMessage)), null);
          return;
        }

        let { output } = semantics(match).js();
        let result = runInContext(output, context);
        cb(null, result);
      } catch (e: any) {
        let err = e as Error;
        err.stack = "";
        throw err;
      }
    },
  });

  repl.defineCommand("clear", () => {
    console.clear();
    console.log("Welcome to the Storymatic REPL.");
    console.log("Enter any expression to run it and output the result.");
    process.stdout.write("> ");
  });
}
