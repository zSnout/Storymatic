import { Recoverable, start } from "repl";
import { runInContext } from "vm";
import { compileText } from "./index.js";

if (process.argv[2] == "-h" || process.argv[2] == "-help") {
  console.log(`Usage: sm [options]

Options:
  -i, --interactive, no args               open the interactive REPL
  -c, --compiler                           open the compiler REPL
  -h, --help                               display this help menu`);
} else if (process.argv[2] == "-c" || process.argv[2] == "--compile") {
  console.log("Welcome to the Storymatic compiler REPL.");
  console.log("Enter any expression to compile it and output the result.");

  let repl = start({
    prompt: "\n> ",
    eval(cmd, _context, _file, cb) {
      let output: string;

      try {
        ({ output } = compileText(cmd));
      } catch {
        cb(new Recoverable(new SyntaxError()), null);
        return;
      }

      cb(null, output.replace('"use strict";\n', ""));
    },
    writer: (obj) => ("" + obj).trim(),
  });

  repl.defineCommand("clear", () => {
    console.clear();
    console.log("Welcome to the Storymatic compiler REPL.");
    console.log("Enter any expression to compile it and output the result.");
    process.stdout.write("\n> ");
  });
} else if (
  process.argv[2] == "-i" ||
  process.argv[2] == "--interactive" ||
  process.argv.length == 2
) {
  console.log("Welcome to the Storymatic REPL.");
  console.log("Enter any expression to run it and output the result.");

  let repl = start({
    prompt: "> ",
    eval(cmd, context, _file, cb) {
      let output: string;

      try {
        ({ output } = compileText(cmd));
      } catch {
        cb(new Recoverable(new SyntaxError()), null);
        return;
      }

      output = output.replace('"use strict";\n', "");
      let result = runInContext(output, context);
      cb(null, result);
    },
  });

  repl.defineCommand("clear", () => {
    console.clear();
    console.log("Welcome to the Storymatic REPL.");
    console.log("Enter any expression to run it and output the result.");
    process.stdout.write("> ");
  });
}
