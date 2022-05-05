import { readFileSync } from "fs";
import { mkdir, readFile, watch, writeFile } from "fs/promises";
import { Recoverable, start } from "repl";
import * as ts from "typescript";
import { isNativeError } from "util/types";
import { runInContext, runInNewContext } from "vm";
import * as yargs from "yargs";
import { compile, transpile } from "./index.js";
import glob = require("fast-glob");

let args = yargs
  .scriptName("sm")
  .option("typescript", {
    alias: "ts",
    desc: "compile code to TypeScript",
    type: "boolean",
  })
  .option("module", {
    alias: "m",
    conflicts: "typescript",
    desc: "the module type to compile to",
    coerce(module) {
      let name = ("" + module).toLowerCase();

      let moduleType: Record<string, ts.ModuleKind> = {
        commonjs: ts.ModuleKind.CommonJS,
        amd: ts.ModuleKind.AMD,
        umd: ts.ModuleKind.UMD,
        esm: ts.ModuleKind.ESNext,
        system: ts.ModuleKind.System,
        es2015: ts.ModuleKind.ES2015,
        es2020: ts.ModuleKind.ES2020,
        es2022: ts.ModuleKind.ES2022,
        esnext: ts.ModuleKind.ESNext,
        node12: ts.ModuleKind.Node12,
        nodenext: ts.ModuleKind.NodeNext,
      };

      if (typeof moduleType[name] == "number") return moduleType[name];
      if (!name || name == "undefined") return undefined;

      throw new Error(
        'Invalid value for --module. Choices: "commonjs", "amd", "umd", "system", "es2015", "es2020", "es2022", "esnext", "node12", "nodenext"'
      );
    },
  })
  .option("target", {
    alias: "t",
    conflicts: "typescript",
    desc: "the ES version to compile to",
    coerce(module) {
      let name = ("" + module).toLowerCase();

      let moduleType: Record<string, ts.ScriptTarget> = {
        es3: ts.ScriptTarget.ES3,
        es5: ts.ScriptTarget.ES5,
        es2015: ts.ScriptTarget.ES2015,
        es2016: ts.ScriptTarget.ES2016,
        es2017: ts.ScriptTarget.ES2017,
        es2018: ts.ScriptTarget.ES2018,
        es2019: ts.ScriptTarget.ES2019,
        es2020: ts.ScriptTarget.ES2020,
        es2021: ts.ScriptTarget.ES2021,
        es2022: ts.ScriptTarget.ES2022,
        esnext: ts.ScriptTarget.ESNext,
        latest: ts.ScriptTarget.Latest,
        json: ts.ScriptTarget.JSON,
      };

      if (typeof moduleType[name] == "number") return moduleType[name];
      if (!name || name == "undefined") return undefined;

      throw new Error(
        'Invalid value for --target. Choices: "es3", "es5", "es2015", "es2016", "es2017", "es2018", "es2019", "es2020", "es2021", "es2022", "esnext", "latest", or "json"'
      );
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
  .option("build", {
    alias: "b",
    conflicts: ["ast", "eval", "output", "print", "watch"],
    desc: "build all .sm files in the `src` directory",
    type: "boolean",
  })
  .option("watch", {
    alias: "w",
    conflicts: ["ast", "build", "eval", "output", "print"],
    desc: "start a watcher on the `src` directory",
    type: "boolean",
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

if (!args.typescript && args.module === undefined)
  args.module = ts.ModuleKind.ESNext;

if (!args.typescript && args.target === undefined)
  args.target = ts.ScriptTarget.Latest;

async function buildFile(file: string) {
  let contents;
  try {
    contents = await readFile(file, "utf-8");
  } catch {
    return;
  }

  let node;
  try {
    node = compile(contents);
  } catch (error) {
    console.error(error);
    return;
  }

  let transpiled;
  try {
    transpiled = transpile(node, args);
  } catch (error) {
    console.error(error);
    return;
  }

  try {
    let out = file.replace(/\.\w+$/, args.typescript ? ".tsx" : ".js");
    if (args.src) out = out.slice(args.src.length + 1);
    if (args.dist) mkdir(args.dist, { recursive: true }).catch(() => {});
    await writeFile((args.dist ? args.dist + "/" : "") + out, transpiled);
  } catch (error) {
    console.error(error);
    return;
  }

  console.log(`${file} compiled at ${new Date().toLocaleTimeString()}.`);
}

if (args.build) {
  let res = glob(
    args.src
      ? args.src + "/**/*.{sm,story,storymatic}"
      : "**/*.{sm,story,storymatic}"
  );

  console.log("Starting build process...");
  res.then((files) => files.map(buildFile));
} else if (args.watch) {
  let res = glob(
    args.src
      ? args.src + "/**/*.{sm,story,storymatic}"
      : "**/*.{sm,story,storymatic}"
  );

  console.log("Starting watch process...");
  res.then((files) => files.map(buildFile));

  (async () => {
    for await (let event of watch(args.src || ".")) {
      if (
        event.filename.endsWith(".sm") ||
        event.filename.endsWith(".story") ||
        event.filename.endsWith(".storymatic")
      ) {
        buildFile((args.src ? args.src + "/" : "") + event.filename);
      }
    }
  })();
} else if (args.eval) {
  let code = args.eval;
  let compiled = compile(code);

  if (args.output) {
    if (args.print) console.log(transpile(compiled, args));
  } else if (args.ast) {
    if (args.print) console.log(JSON.stringify(compiled, undefined, "  "));
  } else {
    let result = execute(compiled);
    if (args.print) console.log(result);
  }
} else if (process.stdin.isTTY) {
  startREPL(args.output ? "noeval" : args.ast ? "ast" : "repl");
} else {
  let code = readFileSync(process.stdin.fd, "utf-8");

  if (code.length) {
    let compiled = compile(code);

    if (args.output) {
      if (args.print) console.log(transpile(compiled, args));
    } else if (args.ast) {
      if (args.print) console.log(JSON.stringify(compiled, undefined, "  "));
    } else {
      let result = execute(compiled);
      if (args.print) console.log(result);
    }
  }
}

function execute(node: ts.Node) {
  return runInNewContext(transpile(node, args));
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
    eval(cmd, context, _1, cb) {
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

      try {
        if (mode == "repl") output = runInContext(output, context);
        if (mode == "ast") output = node;
      } catch (e) {
        if (isNativeError(e)) e.stack = "";
        throw e;
      }
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
