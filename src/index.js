import "@logseq/libs"
import { setup, t } from "logseq-l10n"
import zhCN from "./translations/zh-CN.json"
import { bufferKey, hash, UUIDS } from "./utils"

const INLINE_HEIGHT = 400

let mainContentContainer
let lastScrollTop = 0

async function main() {
  const l10nSetup = setup({
    urlTemplate:
      "https://raw.githubusercontent.com/sethyuan/logseq-plugin-luckysheet/master/src/translations/${locale}.json",
    builtinTranslations: { "zh-CN": zhCN },
  })

  mainContentContainer = parent.document.getElementById(
    "main-content-container",
  )

  window.logseq = logseq
  window.saveBufferedFiles = saveBufferedFiles
  window.justFocused = false
  mainContentContainer.addEventListener("scroll", scrollHandler, {
    passive: true,
  })

  logseq.provideStyle(`
    .kef-sheet-iframe {
      width: 100%;
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
  await l10nSetup
  window.t = t
  logseq.App.onMacroRendererSlotted(renderer)
  logseq.Editor.registerSlashCommand("Luckysheet", insertRenderer)

  logseq.beforeunload(() => {
    mainContentContainer.removeEventListener("scroll", scrollHandler, {
      passive: true,
    })
  })

  // Save buffered files
  await saveBufferedFiles()

  console.log("#luckysheet loaded")
}

async function renderer({ slot, payload: { arguments: args, uuid } }) {
  if (args.length === 0) return
  const type = args[0].trim()
  if (type !== ":luckysheet") return
  const workbookName = args[1].trim()
  if (!workbookName) return

  const slotEl = parent.document.getElementById(slot)
  if (!slotEl) return
  const blockParent = slotEl.closest(".block-content.inline")?.parentElement
  if (blockParent?.classList.contains("block-ref")) {
    blockParent.style.display = "block"
  }

  const renderered = slotEl.childElementCount > 0
  if (!renderered) {
    const id = `workbook-${await hash(workbookName)}`

    slotEl.style.width = "100%"

    const pluginDir = getPluginDir()
    logseq.provideUI({
      key: `luckysheet-${slot}`,
      slot,
      template: `<iframe class="kef-sheet-iframe" src="${pluginDir}/inline.html" data-id="${id}" data-name="${workbookName}" data-uuid="${uuid}" data-frame="${logseq.baseInfo.id}_iframe"></iframe>`,
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

async function saveBufferedFiles() {
  const uuids = (localStorage.getItem(UUIDS) ?? "")
    .split(",")
    .filter((x) => !!x)
  for (const uuid of uuids) {
    const key = bufferKey(uuid)
    const data = localStorage.getItem(key)
    localStorage.removeItem(key)

    if (!data) continue
    const block = await logseq.Editor.getBlock(uuid, { includeChildren: true })
    if (block == null) continue

    if (!block.children?.length) {
      await logseq.Editor.insertBlock(uuid, data, { sibling: false })
      await logseq.Editor.setBlockCollapsed(uuid, true)
    } else if (!block.children[0].content.startsWith("```json")) {
      await logseq.Editor.insertBlock(block.children[0].uuid, data, {
        before: true,
      })
      await logseq.Editor.setBlockCollapsed(uuid, true)
    } else {
      await logseq.Editor.updateBlock(block.children[0].uuid, data)
    }
  }
  localStorage.setItem(UUIDS, "")
}

logseq.ready(main).catch(console.error)
