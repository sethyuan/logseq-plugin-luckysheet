import "@logseq/libs"
import { hash } from "./utils"

const INLINE_WIDTH = 660
const INLINE_HEIGHT = 400

async function main() {
  const { preferredLanguage: lang } = await logseq.App.getUserConfigs()

  window.logseq = logseq

  logseq.provideStyle(`
    .kef-sheet-iframe {
      flex: 0 1 ${INLINE_WIDTH}px;
      height: ${INLINE_HEIGHT}px;
    }
    .kef-sheet-fullscreen {
      margin: 0;
      position: fixed;
      top: 48px;
      left: 0;
      width: 100%;
      height: calc(100% - 48px);
      z-index: var(--ls-z-index-level-3, 999);
    }
  `)
  logseq.App.onMacroRendererSlotted(renderer)
  logseq.Editor.registerSlashCommand("Luckysheet", insertRenderer)

  console.log("#luckysheet loaded")
}

async function renderer({ slot, payload: { arguments: args, uuid } }) {
  if (args.length === 0) return
  const type = args[0].trim()
  if (type !== ":luckysheet") return
  const workbookName = args[1].trim()
  if (!workbookName) return
  const id = `workbook-${await hash(workbookName)}`

  const { preferredLanguage: lang } = await logseq.App.getUserConfigs()
  logseq.provideStyle(`#${slot} { width: 100%; }`)

  const pluginDir = getPluginDir()
  logseq.provideUI({
    key: "luckysheet",
    slot,
    template: `<iframe class="kef-sheet-iframe" src="${pluginDir}/inline.html" data-id="${id}" data-name="${workbookName}" data-uuid="${uuid}" data-frame="${logseq.baseInfo.id}_iframe"></iframe>`,
    reset: true,
    style: { flex: 1 },
  })
}

async function insertRenderer() {
  const workbookName = `workbook-${Date.now()}`
  await logseq.Editor.insertAtEditingCursor(
    `{{renderer :luckysheet, ${workbookName}}}`,
  )
}

function getPluginDir() {
  const pluginSrc = parent.document.getElementById(
    `${logseq.baseInfo.id}_iframe`,
  ).src
  const index = pluginSrc.lastIndexOf("/")
  return pluginSrc.substring(0, index)
}

logseq.ready(main).catch(console.error)
