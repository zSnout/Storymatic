// @ts-check
/// <reference types="./env" />

let $eval = (code) => window.eval(code);

window.$docsify = {
  repo: "zsnout/storymatic-docs",
  topMargin: 90,
  name: "Storymatic Docs",
  plugins: [
    (hook) => {
      function compile(
        /** @type {typeof import("storymatic")} */ Storymatic,
        /** @type {string} */ text
      ) {
        try {
          return Storymatic.transpile(Storymatic.compile(text), {
            typescript: true,
          }).trim();
        } catch (e) {
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
        let [
          Storymatic,
          { javascript },
          { EditorView, EditorState, basicSetup },
          { keymap },
          { inspect },
        ] = await imports;

        for (let el of document.querySelectorAll("[data-lang='coffee'] code")) {
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

          let code = compile(Storymatic, textContent);

          jsb.addEventListener("click", () => {
            jsconsole.replaceChildren(jsp);

            function makeParagraph(/** @type {any[]} */ data) {
              let p = document.createElement("p");

              p.innerHTML = Prism.highlight(
                data.map((e) => inspect(e, undefined, 2, false)).join(" "),
                Prism.languages.javascript,
                "javascript"
              );

              return jsconsole.appendChild(p);
            }

            window.console = {
              ...console,
              error(...data) {
                let p = makeParagraph(data);
                p.className = "console-error";
              },
              log(...data) {
                makeParagraph(data);
              },
              warn(...data) {
                let p = makeParagraph(data);
                p.className = "console-warn";
              },
            };

            let result = $eval(code);
            if (result !== undefined) {
              window.console.log(result);
            }

            window.console = console;
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
        import("https://esm.sh/storymatic@2.0.64"),
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
