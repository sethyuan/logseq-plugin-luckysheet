import html from "@rollup/plugin-html"
import json from "@rollup/plugin-json"
import { nodeResolve } from "@rollup/plugin-node-resolve"
import { readFile } from "fs/promises"
import { defineRollupSwcOption, swc } from "rollup-plugin-swc3"

export default {
  input: {
    index: "src/index.js",
    inline: "src/inline.js",
  },
  output: {
    dir: "dist",
    entryFileNames: "[name].[hash].js",
  },
  plugins: [
    html({
      fileName: "index.html",
      template: async ({ files }) => {
        const content = await readFile("src/index.html", { encoding: "utf8" })
        const fileName = files.js.find(({ name }) => name === "index").fileName
        return content
          .replace(
            "{preload}",
            `<link rel="modulepreload" as="script" href="${fileName}" />`,
          )
          .replace("{js}", `<script type="module" src="${fileName}"></script>`)
      },
    }),
    html({
      fileName: "inline.html",
      template: async ({ files }) => {
        const content = await readFile("src/inline.html", { encoding: "utf8" })
        const fileName = files.js.find(({ name }) => name === "inline").fileName
        return content
          .replace(
            "{preload}",
            `<link rel="modulepreload" as="script" href="${fileName}" />`,
          )
          .replace("{js}", `<script type="module" src="${fileName}"></script>`)
      },
    }),
    nodeResolve(),
    json(),
    swc(
      defineRollupSwcOption({
        jsc: {
          target: "es2021",
        },
      }),
    ),
  ],
}
