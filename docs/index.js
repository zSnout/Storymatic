// @ts-check
/// <reference types="./env" />

let $eval = (code) => {
  try {
    return window.eval(code);
  } catch (e) {
    console.error(e);
  }
};

window.jsx = (tag, attrs, ...children) => {
  if (typeof tag === "string") {
    let el = document.createElement(tag);

    for (let attr in attrs) {
      if (attr === "style") {
        for (let prop in attrs.style) {
          el.style[prop] = attrs.style[prop];
        }
      } else if (attr.startsWith("data")) {
        el.dataset[attr.slice(4)] = attrs[attr];
      } else if (attr.startsWith("on")) {
        el.addEventListener(
          attr.slice(2, 3).toUpperCase() + attr.slice(3),
          attrs[attr]
        );
      } else {
        el[attr] = attrs[attr];
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
    return tag(children.length ? { ...attrs, children } : attrs);
  } catch {
    // @ts-ignore
    return new tag(children.length ? { ...attrs, children } : attrs);
  }
};

window.$docsify = {
  repo: "zsnout/storymatic-docs",
  topMargin: 90,
  name: "Storymatic Docs",
  plugins: [
    (hook) => {
      function compile(
        /** @type {typeof import("storymatic")} */ Storymatic,
        /** @type {string} */ text,
        { throws = false, typescript = true } = {}
      ) {
        try {
          return Storymatic.transpile(Storymatic.compile(text), {
            typescript,
            jsx: typescript ? undefined : "window.jsx",
          }).trim();
        } catch (e) {
          if (throws) throw "" + e;
          return "" + e;
        }
      }

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
        let codes = /** @type {NodeListOf<HTMLElement>} */ (
          document.querySelectorAll("[data-lang='coffee'] code")
        );

        let [
          Storymatic,
          { javascript },
          { EditorView, EditorState, basicSetup },
          { keymap },
          { inspect },
        ] = await imports;

        for (let el of codes) {
          let { textContent } = el;
          el.replaceChildren();

          let pre = el.parentElement;
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
            code = compile(Storymatic, textContent, { throws: true });
          } catch (e) {
            code = "" + e;
            let el = pre.previousElementSibling;
            while (!el?.tagName.startsWith("H")) {
              el = el.previousElementSibling;
            }

            if (el) {
              let els = /** @type {NodeListOf<HTMLAnchorElement>} */ (
                document.querySelectorAll(
                  `a[href="${el.children[0].getAttribute("href")}"]`
                )
              );

              if (els[0].textContent.includes("(error)")) {
                els[0].textContent = els[0].textContent.replace(
                  "(error)",
                  "(2 errors)"
                );

                els[1].children[0].textContent =
                  els[1].children[0].textContent.replace(
                    "(error)",
                    "(2 errors)"
                  );
              } else if (els[0].textContent.includes("errors)")) {
                els[0].textContent = els[0].textContent.replace(
                  /\d+ errors/,
                  (match) => `${+match.split(" ")[0] + 1} errors`
                );

                els[1].children[0].textContent =
                  els[1].children[0].textContent.replace(
                    /\d+ errors/,
                    (match) => `${+match.split(" ")[0] + 1} errors`
                  );
              } else {
                els[0].textContent += " (error)";
                els[1].children[0].textContent += " (error)";
              }

              els[0].style.color = "red";
            }
          }

          jsb.addEventListener("click", () => {
            jsconsole.replaceChildren(jsp);

            function makeElements(/** @type {any[]} */ data) {
              let els = [];
              let content = "";

              for (let el of data) {
                if (el instanceof Node) {
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
            window.Storymatic = Storymatic;

            let result = $eval(
              compile(Storymatic, editor.state.doc.sliceString(0), {
                typescript: false,
              })
            );

            if (result !== undefined) {
              window.console.log(result);
            }
          });

          observer.observe(pre, { box: "content-box" });

          let editor = new EditorView({
            state: EditorState.create({
              doc: textContent,
              extensions: [
                javascript({ jsx: true, typescript: true }),
                EditorView.updateListener.of(() => {
                  jsEditor.dispatch(
                    jsEditor.state.update({
                      changes: {
                        from: 0,
                        to: jsEditor.state.doc.length,
                        insert: (code = compile(
                          Storymatic,
                          editor.state.doc.sliceString(0)
                        )),
                      },
                    })
                  );
                }),
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
        }
      });

      let imports = Promise.all([
        import("https://esm.sh/storymatic@2.0.76"),
        import(
          "https://esm.sh/@codemirror/lang-javascript@0.20.0?deps=@codemirror/state@0.20.0"
        ),
        import(
          "https://esm.sh/@codemirror/basic-setup@0.20.0?deps=@codemirror/state@0.20.0"
        ),
        import(
          "https://esm.sh/@codemirror/view@0.20.6?deps=@codemirror/state@0.20.0"
        ),
        import("https://esm.sh/util@0.12.4"),
      ]);
    },
  ],
};

if (
  typeof navigator.serviceWorker !== "undefined" &&
  location.port !== "3000"
) {
  navigator.serviceWorker.register("sw.js");
}
