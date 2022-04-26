import "@logseq/libs"
import { hash } from "./utils"

const INLINE_HEIGHT = 400

let mainContentContainer
let lastScrollTop = 0

async function main() {
  const { preferredLanguage: lang } = await logseq.App.getUserConfigs()
  mainContentContainer = parent.document.getElementById(
    "main-content-container",
  )

  window.logseq = logseq
  window.justFocused = false
  mainContentContainer.addEventListener("scroll", scrollHandler, {
    passive: true,
  })

  logseq.provideStyle(`
    .kef-sheet-iframe {
      height: ${INLINE_HEIGHT}px;
      margin: 0;
    }
    .kef-sheet-fullscreen {
      margin: 0;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: var(--ls-z-index-level-3, 999);
    }
  `)
  logseq.App.onMacroRendererSlotted(renderer)
  logseq.Editor.registerSlashCommand("Luckysheet", insertRenderer)

  logseq.beforeunload(() => {
    mainContentContainer.removeEventListener("scroll", scrollHandler, {
      passive: true,
    })
  })

  console.log("#luckysheet loaded")
}

async function renderer({ slot, payload: { arguments: args, uuid } }) {
  if (args.length === 0) return
  const type = args[0].trim()
  if (type !== ":luckysheet") return
  const workbookName = args[1].trim()
  if (!workbookName) return

  const slotEl = parent.document.getElementById(slot)
  const renderered = slotEl.childElementCount > 0
  if (!renderered) {
    const id = `workbook-${await hash(workbookName)}`
    const { preferredLanguage: lang } = await logseq.App.getUserConfigs()

    slotEl.style.width = "100%"

    const container = slotEl.closest(".block-content.inline").closest(".flex-1")
    const pluginDir = getPluginDir()
    logseq.provideUI({
      key: "luckysheet",
      slot,
      template: `<iframe class="kef-sheet-iframe" style="min-width: ${
        container?.clientWidth ?? 450
      }px" src="${pluginDir}/inline.html" data-id="${id}" data-name="${workbookName}" data-uuid="${uuid}" data-frame="${
        logseq.baseInfo.id
      }_iframe"></iframe>`,
      reset: true,
      style: { flex: 1 },
    })
  }
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

// HACK workaround Luckysheet issue that on first focus it scrolls to
// the top of the page.
function scrollHandler(e) {
  if (window.justFocused) {
    window.justFocused = false
    mainContentContainer.scrollTop = lastScrollTop
  } else {
    lastScrollTop = mainContentContainer.scrollTop
  }
}

logseq.ready(main).catch(console.error)
