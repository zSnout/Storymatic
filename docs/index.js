// @ts-check
/// <reference types="./env" />

window.$docsify = {
  routerMode: "history",
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

      hook.doneEach(async () => {
        let [
          Storymatic,
          { javascript },
          { EditorView, EditorState, basicSetup },
        ] = await imports;

        for (let el of document.querySelectorAll("[data-lang='coffee'] code")) {
          let { textContent } = el;
          el.replaceChildren();

          let js = document.createElement("pre");
          js.setAttribute("v-pre", "");
          js.dataset.lang = "javascript";

          let jsc = document.createElement("code");
          jsc.className = "lang-javascript";
          js.append(jsc);

          el.parentElement.insertAdjacentElement("afterend", js);

          let editor = new EditorView({
            state: EditorState.create({
              doc: textContent,
              extensions: [
                basicSetup,
                javascript({ jsx: true, typescript: true }),
                EditorView.updateListener.of(() => {
                  jsEditor.dispatch(
                    jsEditor.state.update({
                      changes: {
                        from: 0,
                        to: jsEditor.state.doc.length,
                        insert: compile(
                          Storymatic,
                          editor.state.doc.sliceString(0)
                        ),
                      },
                    })
                  );
                }),
                EditorState.tabSize.of(2),
              ],
            }),
            parent: el,
          });

          let jsEditor = new EditorView({
            state: EditorState.create({
              doc: compile(Storymatic, textContent),
              extensions: [
                basicSetup,
                javascript({ jsx: true, typescript: true }),
                EditorState.readOnly.of(true),
                EditorState.tabSize.of(2),
              ],
            }),
            parent: jsc,
          });
        }
      });

      let imports = Promise.all([
        import("https://esm.sh/storymatic@2.0.63"),
        import(
          "https://esm.sh/@codemirror/lang-javascript@0.20.0?deps=@codemirror/state@0.20.0"
        ),
        import(
          "https://esm.sh/@codemirror/basic-setup?deps=@codemirror/state@0.20.0"
        ),
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
