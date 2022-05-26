# Welcome to Storymatic!

Storymatic is a simple yet powerful programming language that compiles directly
to JavaScript for perfect in-browser portability. Storymatic also has common
TypeScript features such as a type system, enums, interfaces, namespaces, and
generic arguments. Additionally, you can work with NPM, Deno, and JavaScript
modules without needing any complex code.

# What you should know

Before you start working with Storymatic, it's good to know some JavaScript.
Storymatic inherits many features of this language and compiles to it. This
means that your code will have the runtime functionality and mechanics of
JavaScript code, so it's good to get to know some JS.

Storymatic also inherits plenty of features from CoffeeScript such as a
post-expression form of `if`, automatic function returns, and automatically
declared variables.

While Storymatic can compile to TypeScript using its `--typescript` flag in the
CLI, it is NOT a typed language and does not require explicit memory management.
Your runtime environment will handle typing and memory automatically.

Storymatic has some differences from its parent languages, TypeScript and
CoffeeScript, and we'll mention these throughout the document.

## Code examples

Here's an example of some Storymatic code to get you acquainted with its basic
syntax and language.

```coffee
greet = (name) ->
  console.log "Hello #{name}!"

greet "world"

name = prompt "What is your name?"
greet name
```

You'll notice that Storymatic has automatic variable scoping and cleaner
function definitions that JavaScript. Storymatic also has easy string
interpolating and includes many other features you'll discover.

# Getting started

Make sure you have NPM installed on your computer before using Storymatic. Once
NPM is available, install the `storymatic` package globally to your system.

```shell
$ npm install -g storymatic
```

Once Storymatic is installed, run the `sm` command to enter Storymatic
interactive mode where you can compile and evaluate any expression.

```shell
$ sm
Welcome to the Storymatic REPL.
Enter any expression to run it and output the result.
> 2+3
5
> "Hello!"
"Hello!"
```

You may also run `sm -b` to compile all `.sm` files in the current working
directory into `.js` files and `sm -w` to watch the current working directory
for changes.

```shell
$ sm -w
Starting watch process...
myfile.sm compiled at 08:00:00 AM.
```

# Internals

For people who want to get into the nitty-gritty details of the Storymatic
compiler, here's how we compile your code.

First, we execute the pre-transform steps.

1. Tabs are standardized to two spaces.
2. `⇦` and `⇨` characters are removed.
3. Lines are split based on their indentation levels.
4. Pairs of lines that include strings are joined together.
5. All other lines are grouped by indentation level.
6. `⇦` and `⇨` are added around lines to represent indentation.
7. Lines are joined together after indent markers have been added.

After transforming the source code, we compile using these steps:

1. The source code is passed to the Ohm compiler. To output the code at this
   step, pass the `-a` or `--ast` flag to the CLI.
2. Each node in the AST is converted to a corresponding TypeScript node.
3. The TypeScript AST is traversed to create variable declarations, change
   top-level IIFEs to statements, add `async` and `*` modifiers to containing
   functions, transform generator arrow functions to bound functions, and add
   automatic returns. You may output the code after this step with the `-A` or
   `--typescript-ast` flag.
4. The TypeScript AST is passed to the TS compiler, unused imports are removed,
   module types are transformed, and code is updated to the correct ES version.
   This code is available via the `-o` or `--output` flag.

Once these have completed, the Storymatic process is done!

# Primitives

## Numbers

Storymatic supports numerical primitives using standard decimal format with an
optional exponential part. We also allow numeric seperators using underscores in
numbers as well as hexadecimal numbers using `0x`.

!> By the way, Storymatic numbers must NOT begin or end with a decimal point.
Most languages accept `.2` or `4.` as valid numbers, but Storymatic requires
`0.2` or `4.0`. In these cases, just include a leading zero to fix all code.

```coffee
25 - 36

7.9

45e5

734_563_342

0xff_e
```

## Big integers

Storymatic supports JavaScript's bigint types using the standard syntax ending
in `n`.

```coffee
2n

346456n - 71n
```

## Extended numeric literals

Storymatic supports extended numeric literals using the syntax described in
[this proposal](https://github.com/tc39/proposal-extended-numeric-literals).

```coffee
56px

57.8em
```

## Booleans, null, and undefined

Storymatic supports these JavaScript values in your code. It automatically
compiles `undefined` to `void 0` as `undefined` is not a reserved word and may
be shadowed. We also support the CoffeeScript keyword `yes` and `on` as aliases
for `true` as well as `no` and `off` for `false`.

```coffee
true

false

null

undefined
```

## Strings

Storymatic supports JavaScript's standard format for strings. However, multiline
strings work by default and you may use `#{ ... }` to interpolate expressions
into your text.

```coffee
"Hello world!"

"Hello
world!"

"Hello #{name}!"
```

# Variables

## Assigning variables

To assign to a variable, type its name followed by an equals sign. Storymatic
handles variable declaration for you. You may optionally provide a type as well
when compiling to TypeScript. Storymatic also allows you to use multi-word
variable names. A word may even be a number as long as it isn't the first word
of an identifier.

```coffee
name = "Zorro"

myAge: number = 26

greeting78 = "Hi"

console.log "#{greeting78}, #{name}. You are #{myAge}."
```

## Destructuring

You may also destructure variables using JavaScript-like syntax:

```coffee
[name, age] = ["Frida", 78]

{ url, body } = await fetch("https://google.com")
```

Deep destructuring and rest parameters works too:

```coffee
[{ name, age }, ...others] = getPeople()
```

## Function scope

When assigning to anything within a function, variables look for the highest
scope possible. For example, the following code block assigns `myVar` to the
global scope only.

```coffee
myVar = 23

test = ->
  myVar = 45

test()
console.log myVar # 45
```

You may force a rescope of a variable by using the `rescope` keyword.

```coffee
myVar = 23

test = ->
  rescope myVar = 45
  console.log myVar # 45

test()
console.log myVar # 23
```

## Reserved word list

Here is the complete list of reserved words in Storymatic.

```
and, as, await, break, break, case, catch, class, const, continue, debugger,
default, delete, do, down, else, enum, export, extends, false, finally, for,
from, function, if, implements, import, in, instanceof, interface, is, isnt,
let, namespace, new, not, null, of, or, package, private, protected, public,
repeat, rescope, return, static, step, switch, then, through, throw, to, true,
try, type, typeof, undefined, unless, until, var, void, when, while, with, yield
```

# Functions

Storymatic has simple function creation using the `fn` keyword. A function has
an optional name and arguments using the `of` keyword. Arguments may have
default values and types. Functions may also have type arguments.

```coffee
# Basic example with only a name and code block.
greet = ->

# Parameters are enclosed via parentheses before an arrow.
greet = (name, age) ->

# Parameters may have default values.
greet = (name = "defaultValue") ->

# Parameters may be destructured.
greet = ({ name, age }) ->
```

To add statements to a function, indent them after an arrow. You may also
specify a value directly after the arrow to return it.

```coffee
greet = (name) ->
  console.log "Hello #{name}!"

increment = (value) -> value + 1
```

## Automatic returning

You'll notice how `value + 1` was returned from `increment` even though we
didn't specify a `return` statement. This is a feature called automatic
returning where the last statement or expression within a function is returned.
To opt-out of this behavior, simply insert a manual return statement.

Note that automatic returning travels into the branches of blocks such as `if`,
`with`, `for`, and others. It ignores other "branch-ending" statements such as
`break`, `continue`, `return`, and `throw`.

```coffee
attempt = ->
  if Math.random() < 0.5 then "less" else "greater"

el = (tag: string, content: string) ->
  with document.createElement tag
    @textContent = content
```

Automatic returning also works within conditionals, loops, and `with` blocks.

```coffee
loopOver = ->
  i = 0
  i++ while i < 5
```

Notice how the loop results are collected into an array and returned. If the
loop isn't the last things returned in a function, the collection code will be
omitted.

## Calling functions

To call a function, write its name followed by parentheses. You may write
comma-seperate arguments within the parentheses. If the arguments are on
seperate lines, you may omit commas between them.

```coffee
greet("zSnout")
myfunc()
person("Bob", 23)

arr(
  0, 1, 0
  1, 0, 0
  0, 0, 1
)
```

## Implied function calls

Storymatic also has implied function calls, meaning you can omit the parentheses
around a function call as long as there is at least one argument. When using
implied function calls, you must include commas between all arguments.

```coffee
greet "Jack"
person "Celia", 56
arr 0, 1, 0,
    1, 0, 0,
    0, 0, 1
```

You can continue an implied function call for multiple lines as long as each
line ends with a comma.

```coffee
person "Jones",
  56,
  "Kelo"
```

# Arrays

Storymatic's array syntax matches JavaScript syntax with one small difference:
elements in an array may be separated by a newline rather than a comma, or the
two forms can be interspersed. Additionally, an array may end with a trailing
comma. It may also contain spread elements.

```coffee
["my name", "your name", 23, ]

[
  "Hello", "world"
  23, 98, 30
  true
  ...[1, 2]
]
```

## Accessing and modifying arrays

To get an element from an array, use `arr[index]` syntax.

!> Storymatic uses a system called zero-based arrays, which means that the first
element of an array has an index of 0, the second element has an index of 1, and
so on.

```coffee
namesInDocument = ["Bob", "Jack", "Celia", "Jones", "Kelo"]

namesInDocument[4]
```

To change elements within arrays, set an index to a value.

```coffee
namesInDocument = ["Bob", "Jack", "Celia", "Jones", "Kelo"]

namesInDocument[4] = "Pablo"

namesInDocument[4]
```

## Slice and splice syntax

Storymatic supports the experimental
[slice notation proposal](https://github.com/tc39/proposal-slice-notation) as
well as CoffeeScript-like splice notation. However, the proposed colon-based
syntax is already valid in Storymatic, so we replace it with `..` syntax.

!> CoffeeScript's `..` operator is inclusive, whereas Storymatic's is exclusive.
This means that `0..3` captures 3 elements in Storymatic where it would capture
4 in CoffeeScript. Using exclusive syntax allows us to maintain compatiability
with the slice notation proposal, which is very important to Storymatic.

```coffee
namesInDocument = ["Bob", "Jack", "Celia", "Jones", "Kelo"]

# Captures the 0th, 1st, and 2nd elements
console.log namesInDocument[0..3]

# Captures the 2nd and 3rd elements
namesInDocument[2..4]
```

We also support a splice syntax which is similar to CoffeeScript syntax, except
that we use exclusive ranges to maintain consistency with proposals.

```coffee
console.log namesInDocument =
  ["Bob", "Jack", "Celia", "Jones", "Kelo"]

# Replace the 0th-2nd elements with "Fred"
namesInDocument[0..3] = "Fred"

namesInDocument
```

## Array spread syntax

Storymatic supports spread syntax, which allows you to make a copy of array
elements and spread them into a new array literal.

```coffee
namesInDocument = ["Bob", "Jack", "Celia", "Jones", "Kelo"]

newNames = ["Raile", ...namesInDocument, "Jehosephat"]
```

## Destructuring arrays

It's a common pattern to save different elements of an array into variables. To
save time when working with these, Storymatic provides a destructuring pattern.

```coffee
# Without destructuring
array = [23, "Hi"]
num = array[0]
str = array[1]

# With destructuring
array = [23, "Hi"]
[num, str] = array

console.log num, str
# 23 and "Hi" are printed in both cases
```

As you can see, each variable is destructured into its corresponding slot. `num`
is the first destructured element, so it gets the first element of the array, or
`23`. `str` is the second destructured element, so it gets the second element,
or `"Hi"`.

You don't need to capture every element in an array, although you may capture an
entire array using rest syntax, or `...identifier`.

```coffee
array = [23, 89, 3, 45]
[a, b] = array
console.log a # 23
console.log b # 89

[first, ...rest] = array
console.log first # 23
console.log rest # [89, 3, 45]
```

# Objects

To write an object in Storymatic, surround comma-seperated `key: value` pairs
with curly braces. Each key may either be a word, number, string, or computed
key. If `key: value` pairs are seperated by newlines, commas are not required.

```coffee
{ number: 23, string: "23" }

{
  name: "Steve"
  age: 43
  alive: true
}
```

## Implied objects

If an object only contains key-value pairs, you may write it without braces.
This does not work with restructuring (see below) or spread syntax.

```coffee
number: 23, string: "23"

name: "Steve"
age: 43
alive: true
```

## Accessing object properties

To get a property from an object, write the object followed by a dot and an
identifier.

```coffee
person = name: "Steve", age: 43

person.name
```

## Object spread syntax

If you quickly want to copy an object's properties into a new literal, use
spread syntax like this:

```coffee
oldPerson = name: "Steve", age: 43

newPerson = {
  email: "fake@exaple.com",
  ...oldPerson,
  age: 7
}
```

The positioning of a spread literal matters, as new properties in a spread
literal override previous properties. Here's an example of the difference:

```coffee
oldPerson = name: "Steve", age: 43

console.log "spread before", {
  ...oldPerson,
  age: 7
}

console.log "spread after", {
  age: 7,
  ...oldPerson
}
```

Notice how the second object doesn't have the new age. This is because spreading
`oldPerson` overrides the previous `age: 7` property.

## Restructuring

A common pattern is to turn a list of variables into an object like so:

```coffee
name = "Steve"
age = 43

{ name: name, age: age }
```

You can use object shorthand to reduce the amount of code here. The previous
example and this one are identical.

```coffee
name = "Steve"
age = 43

{ name, age }
```

## Object destructuring

A common operation is to assign 