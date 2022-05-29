/// <reference types="./env" />

import {
  basicSetup,
  EditorState,
  EditorView,
} from "https://esm.sh/@codemirror/basic-setup@0.20.0?deps=@codemirror/state@0.20.0";
import { javascript } from "https://esm.sh/@codemirror/lang-javascript@0.20.0?deps=@codemirror/state@0.20.0";
import { Facet } from "https://esm.sh/@codemirror/state@0.20.0";
import { keymap } from "https://esm.sh/@codemirror/view@0.20.6?deps=@codemirror/state@0.20.0";
import * as Storymatic from "https://esm.sh/storymatic@2.0.80";
import { inspect } from "https://esm.sh/util@0.12.4";

function __eval(code: string) {
  try {
    return window.eval(code);
  } catch (e) {
    console.error(e);
  }
}

function jsx(
  tag:
    | string
    | ((props: Record<string, any>) => Node)
    | (new (props: Record<string, any>) => Node),
  attrs?: Record<string, any> | null,
  ...children: any[]
) {
  if (typeof tag === "string") {
    let el = document.createElement(tag);

    for (let attr in attrs) {
      if (attr === "style") {
        for (let prop in attrs.style) {
          (el.style as any)[prop] = attrs.style[prop];
        }
      } else if (attr.startsWith("data")) {
        el.dataset[attr.slice(4)] = attrs[attr];
      } else if (attr.startsWith("on")) {
        el.addEventListener(
          attr.slice(2, 3).toUpperCase() + attr.slice(3),
          attrs[attr]
        );
      } else {
        (el as any)[attr] = attrs[attr];
      }
    }

    for (let child of children.flat(Infinity)) {
      if (child instanceof Node || typeof child === "string") {
        el.append(child);
      } else {
        el.append("" + child);
      }
    }

    return el;
  }

  try {
    // @ts-ignore
    return new tag(children.length ? { ...attrs, children } : attrs);
  } catch {
    // @ts-ignore
    return tag(children.length ? { ...attrs, children } : attrs);
  }
}

function addError(href: string) {
  let els = document.querySelectorAll(
    `a[href="${href}"]`
  ) as NodeListOf<HTMLAnchorElement>;

  if (els[0].textContent!.includes("(error)")) {
    els[0].textContent = els[0].textContent!.replace("(error)", "(2 errors)");

    els[1].children[0].textContent = els[1].children[0].textContent!.replace(
      "(error)",
      "(2 errors)"
    );
  } else if (els[0].textContent!.includes("errors)")) {
    els[0].textContent = els[0].textContent!.replace(
      /\d+ errors/,
      (match) => `${+match.split(" ")[0] + 1} errors`
    );

    els[1].children[0].textContent = els[1].children[0].textContent!.replace(
      /\d+ errors/,
      (match) => `${+match.split(" ")[0] + 1} errors`
    );
  } else {
    els[0].textContent += " (error)";
    els[1].children[0].textContent += " (error)";
  }

  els[0].style.color = "red";
}

function compile(
  text: string,
  flags: Storymatic.Flags = { typescript: true },
  throws = false
) {
  try {
    return Storymatic.transpile(Storymatic.compile(text), flags).trim();
  } catch (e) {
    if (throws) throw "" + e;
    return "" + e;
  }
}

namespace CompileOnUpdate {
  export let extension = EditorView.updateListener.of((update) => {
    let secondaryWindow = update.state.facet(CompileOnUpdate.SecondaryWindow);
    let flags = update.state.facet(CompileOnUpdate.CompileOptions);

    if (!secondaryWindow) {
      throw new Error(
        "Extension `CompileOnUpdate` requires a `CompileOnUpdate.SecondaryWindow` facet."
      );
    }

    secondaryWindow.dispatch(
      secondaryWindow.state.update({
        changes: {
          from: 0,
          to: secondaryWindow.state.doc.length,
          insert: compile(update.state.sliceDoc(), flags),
        },
      })
    );
  });

  export let SecondaryWindow = Facet.define<EditorView, EditorView | undefined>(
    {
      combine(value) {
        return value[0];
      },
    }
  );

  export let CompileOptions = Facet.define<Storymatic.Flags, Storymatic.Flags>({
    combine(value) {
      return value.reduce((prev, next) => ({ ...next, ...prev }), {
        typescript: true,
      });
    },
  });
}

window.$docsify = {
  repo: "zSnout/Storymatic",
  topMargin: 90,
  name: "Storymatic Docs",
  plugins: [
    (hook: { doneEach(hook: () => Promise<void>): void }) => {
      let observer = new ResizeObserver((entries) => {
        entries.forEach(({ contentBoxSize: [entry], target }) => {
          if (entry.inlineSize <= 550) {
            target.classList.remove("dual");
          } else {
            target.classList.add("dual");
          }
        });
      });

      let { console } = window;

      hook.doneEach(async () => {
        let codes = document.querySelectorAll("[data-lang='coffee'] code");

        for (let el of codes) {
          let textContent = el.textContent!;
          el.replaceChildren();

          let pre = el.parentElement!;
          let decl = getComputedStyle(pre);
          if (
            parseFloat(decl.inlineSize) -
              parseFloat(decl.paddingInlineStart) -
              parseFloat(decl.paddingInlineEnd) >
            550
          ) {
            pre.classList.add("dual");
          }

          delete pre.dataset.lang;
          pre.classList.add("storymatic");

          let jsc = document.createElement("code");
          jsc.className = "lang-javascript";
          pre.append(jsc);

          let jsconsole = document.createElement("div");
          jsconsole.className = "console";
          pre.append(jsconsole);

          let jsp = document.createElement("p");
          jsp.className = "run-code-para";
          jsconsole.append(jsp);

          let jsb = document.createElement("button");
          jsb.className = "run-code";
          jsb.textContent = "Run Code";
          jsp.append(jsb);

          let code = "";
          try {
            code = compile(textContent, undefined, true);
          } catch (e) {
            code = "" + e;
            let el = pre.previousElementSibling;
            while (el && !el.tagName.startsWith("H")) {
              el = el.previousElementSibling;
            }

            if (el) addError(el.children[0].getAttribute("href")!);
          }

          jsb.addEventListener("click", () => {
            jsconsole.replaceChildren(jsp);

            function makeElements(data: any[]) {
              let els: Element[] = [];
              let content = "";

              for (let el of data) {
                if (el instanceof Element) {
                  if (content) {
                    let p = document.createElement("p");
                    p.innerHTML = Prism.highlight(
                      content,
                      Prism.languages.javascript,
                      "javascript"
                    );

                    els.push(p);
                  }

                  els.push(el);
                } else if (content) {
                  content += " " + inspect(el, undefined, 2, false);
                } else {
                  content = inspect(el, undefined, 2, false);
                }
              }

              if (content) {
                let p = document.createElement("p");
                p.innerHTML = Prism.highlight(
                  content,
                  Prism.languages.javascript,
                  "javascript"
                );

                els.push(p);
              }

              jsconsole.append(...els);
              return els;
            }

            window.console = {
              ...console,
              assert(condition, ...data) {
                if (!condition) {
                  if (data.length) {
                    window.console.error("Assertion failed");
                  } else {
                    window.console.error("Assertion failed:", ...data);
                  }
                }
              },
              clear() {
                jsconsole.replaceChildren(jsp);
              },
              error(...data) {
                let els = makeElements(data);
                els.forEach((el) => (el.className += " console-error"));
              },
              log(...data) {
                makeElements(data);
              },
              warn(...data) {
                let els = makeElements(data);
                els.forEach((el) => (el.className += " console-warn"));
              },
            };

            Object.assign(window, window.console);
            Object.assign(window, { Storymatic, jsx });

            let result = __eval(
              compile(editor.state.doc.sliceString(0), { typescript: false })
            );

            if (result !== undefined) {
              window.console.log(result);
            }
          });

          observer.observe(pre, { box: "content-box" });

          let jsEditor = new EditorView({
            state: EditorState.create({
              doc: code,
              extensions: [
                basicSetup,
                javascript({ jsx: true, typescript: true }),
                EditorState.readOnly.of(true),
                EditorState.tabSize.of(2),
                EditorView.lineWrapping,
              ],
            }),
            parent: jsc,
          });

          let editor = new EditorView({
            state: EditorState.create({
              doc: textContent,
              extensions: [
                javascript({ jsx: true, typescript: true }),
                CompileOnUpdate.SecondaryWindow.of(jsEditor),
                CompileOnUpdate,
                EditorState.tabSize.of(2),
                EditorView.lineWrapping,
                keymap.of([
                  {
                    run: () => (jsb.click(), true),
                    key: "Ctrl-Enter",
                    mac: "Cmd-Enter",
                    preventDefault: true,
                  },
                ]),
                basicSetup,
              ],
            }),
            parent: el,
          });
        }
      });
    },
  ],
};

if (
  typeof navigator.serviceWorker !== "undefined" &&
  location.port !== "3000"
) {
  navigator.serviceWorker.register("sw.js");
}
