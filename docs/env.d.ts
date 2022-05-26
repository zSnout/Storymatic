declare module "https://esm.sh/storymatic*" {
  export * from "storymatic";
}

declare module "https://esm.sh/@codemirror/lang-javascript*" {
  export * from "@codemirror/lang-javascript";
}

declare module "https://esm.sh/@codemirror/basic-setup*" {
  export * from "@codemirror/basic-setup";
}

declare module "https://esm.sh/@codemirror/view*" {
  export * from "@codemirror/view";
}

declare module "https://esm.sh/util*" {
  export * from "node:util";
}

declare var $docsify: any;

declare var jsx: {
  (
    tag:
      | string
      | ((props: Record<string, any>) => Node)
      | (new (props: Record<string, any>) => Node),
    attrs?: Record<string, any> | null,
    ...children: any[]
  ): Node;
};

declare interface Node {
  className: string;
}
