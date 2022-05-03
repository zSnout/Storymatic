# Storymatic

Storymatic a simple yet feature-packed and rich language that compiles directly
to browser-compatiable JavaScript.

## Using the command line

The Storymatic CLI can be downloaded using

```shell
npm install -g storymatic
```

Once downloaded, you may run the CLI with

```shell
sm [options]
```

By default, the terminal opens in an interactive mode where you can run
Storymatic expressions and statements. The interactive mode outputs the result
of the last expression evaluated. It automatically lets you add extra code if
the statement is not completed.

```shell
$ sm
Welcome to the Storymatic REPL.
Enter any expression to run it and output the result.
> 2 + 3
5
> if 2 < 3 then print "Math works!"
Math works!
> 2 +
... 45 *
... 7
317
```

You can also ask Storymatic to output the generated code with the `-o` or
`--output` flag. Note that this leaves off generated `"use strict";`
declarations.

```shell
$ sm -o
Welcome to the Storymatic REPL.
Enter any expression to compile it and view the output code.
> 2 + 3
2 + 3;

> fn greet of name {
... print "Hello, {name}!"
... }
function greet(name) {
    console.log(`Hello, ${name}!`);
}
```

Being built on top of TypeScript, Storymatic also supports a custom target and
module type using the `-t`/`--target` and `-m`/`--module` flags.

```shell
$ sm -o -t es3 -m amd
Welcome to the Storymatic REPL.
Enter any expression to compile it and view the output code.
> class Person {}
define(["require", "exports"], function (require, exports) {
        var Person = /** @class */ (function () {
        function Person() {
        }
        return Person;
    }());
});
```

```shell
$ sm -o -m commonjs
Welcome to the Storymatic REPL.
Enter any expression to compile it and view the output code.
> class Person {}
Object.defineProperty(exports, "__esModule", { value: true });
exports.abc = void 0;
class abc {
}
exports.abc = abc;
```

You can also view the generated AST using the `-a` or `--ast` flag. It is not
compatiable with `-o` and `--output`.

```shell
$ sm -a
Welcome to the Storymatic REPL.
Enter any expression to compile its AST and output it.
> 2
SourceFileObject {
  pos: 0,
  end: 2,
  flags: 8,
  ...
}
```

If the current terminal is not a TTY, Storymatic evaluated the expression in
stdin (with optional `--output` and `--ast` flags). It will output the result if
the `-p` or `--print` flag is passed.

```shell
$ echo "23 * 8 - 9" | sm -p
175
```

You can also pass an expression via the `-e` or `--eval` flag instead of through
stdin.

```shell
$ sm -e "4 * 5"
# no output because `--print` was not passed
$ sm -e "4 * 5" -p
20
```

While running Storymatic on `--output` mode, you may also pass the
`--typescript` or `--ts` flag to directly output the generated TypeScript code
before compiling to JavaScript.

```shell
$ sm --ts -o
Welcome to the Storymatic REPL.
Enter any expression to compile it and view the output code.
> enum State { Pending, Complete }
enum State {
    Pending,
    Complete
}

$ sm -o
Welcome to the Storymatic REPL.
Enter any expression to compile it and view the output code.
> enum State { Pending, Complete }
var State;
(function (State) {
    State[State["Pending"] = 0] = "Pending";
    State[State["Complete"] = 1] = "Complete";
})(State || (State = {}));
```

Additionally, Storymatic can compile JSX code with the `--jsx` or `-j` flag.

```
$ sm --jsx React.createElement -o
Welcome to the Storymatic REPL.
Enter any expression to compile it and view the output code.
> <h1 />
React.createElement("h1", null);

> <p>Hello, {my name}</p>
React.createElement("p", null,
    "Hello,",
    myName);
```

Storymatic's `--jsx` flag requires the function called on the JSX to be passed
as an argument. If you don't give a name, the JSX will fail to compile.

## Building a project

The Storymatic CLI can also continually build files within a project. Simply
pass the `--build` or `-b` flag to look for any `.sm` files in a folder and
compile them to `.js` files. If the `--typescript` flag is enabled, files are
compiled to `.tsx` in order to be processed by a later TypeScript and JSX
pipeline.

You can also create a watcher by passing `--watch` or `-w` instead of `--build`,
modify the source directory with `--src`, and modify the output directory with
`--dist`.

## Using the Compiler API

The compiler exposes two functions: `compile` and `transpile`.

The `compile` function takes a string of source code and returns a
`ts.SourceFile` from the TypeScript compiler. It may also throw a SyntaxError if
the source code cannot properly be compiled.

The `transpile` function takes a `ts.SourceFile` and returns a string
representing the compile code. It also takes a second argument, `flags`, which
has the structure described below.

The compiler also exposes an interface called `Flags`. It has four optional
members. The `typescript` property, when enabled, transpiles to TypeScript
rather than JavaScript. It is not compatiable with any other properties. The
`module` property is a `ts.ModuleKind` and tells `transpile` what module type to
compile to. The `target` property is a `ts.ScriptTarget` and tells `transpile`
what language version to target. The `jsx` property is a string and tells
`transpile` what function JSX code should be wrapped in.

TypeScript typings are bundled with the module, but here they are for reference:

```typescript
export function compile(text: string): ts.SourceFile;

export function transpile(node: ts.Node, flags?: Flags): string;

import * as ts from "typescript";
export interface Flags {
  typescript?: boolean;
  module?: ts.ModuleKind;
  target?: ts.ScriptTarget;
  jsx?: string;
}
```
