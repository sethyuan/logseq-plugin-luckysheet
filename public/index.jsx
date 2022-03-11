import "@logseq/libs"
import { Queue } from "jsutils"
import { hash } from "./utils"

const DEFAULT_WIDTH = 500
const DEFAULT_HEIGHT = 200

const thumbnailQueue = new Queue()
let currentWorkbookId

async function main() {
  const closeBtn = document.getElementById("closeBtn")
  closeBtn.addEventListener("click", onEditorClose)

  logseq.provideStyle(`
    .kef-sheet-bg {
      display: flex;
      cursor: pointer;
      border: 1px solid var(--ls-border-color);
    }
    .kef-sheet-overlay {
      flex: 1 1 auto;
      background: rgba(255 255 255 / 75%);
      backdrop-filter: blur(1px);
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .dark-theme .kef-sheet-overlay {
      background: rgba(35 35 35 / 75%);
    }
    .kef-sheet-content {
      display: flex;
      align-items: center;
      font-size: 1.4em;
    }
    .kef-sheet-content svg {
      fill: var(--ls-primary-text-color);
      margin-right: 4px;
    }
  `)
  logseq.App.onMacroRendererSlotted(renderer)
  logseq.Editor.registerSlashCommand("Luckysheet", insertRenderer)

  console.log("#luckysheet loaded")
}

async function renderer({ slot, payload: { arguments: args } }) {
  if (args.length === 0) return
  const type = args[0].trim()
  if (type !== ":luckysheet") return
  const workbookName = args[1].trim()
  if (!workbookName) return
  const width = parseInt(args[2]) || DEFAULT_WIDTH
  const height = parseInt(args[3]) || DEFAULT_HEIGHT
  const id = `workbook-${await hash(workbookName)}`

  const { preferredLanguage: lang } = await logseq.App.getUserConfigs()
  const thumbnail = localStorage.getItem(`kef-${id}`) ?? ""
  logseq.provideUI({
    key: "luckysheet",
    slot,
    template: `<div data-id="${id}" data-on-click="showEditor" class="kef-sheet-bg" style="width: ${width}px; height: ${height}px; background: #fff left top/cover no-repeat url(${thumbnail})">
      <div class="kef-sheet-overlay">
        <div class="kef-sheet-content">
          <svg t="1646980067449" viewBox="0 0 1203 1024" width="50" height="50" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1629"><path d="M100.662959 91.804618v725.347382h795.337041V91.804618h-795.337041z m283.958047 28.72303h227.420946v145.069476H384.621006V120.527648z m0 173.974296h227.420946v145.069477H384.621006V294.501944z m-28.90482 493.745236h-226.330198V643.177703h226.330198v145.069477z m0-173.883402h-226.330198V469.294302h226.330198v145.069476z m0-174.883253h-226.330198V294.411049h226.330198v145.069476z m0-173.792505h-226.330198V120.618543h226.330198v145.069477z m511.469889 522.55916h-56.627997V584.550001h-85.441922v203.697179h-56.627998V643.177703h-85.441922v145.069477h-56.627997V700.805553h-85.441922v87.441627h-56.627998V469.294302h482.565069l0.272687 318.952878z m0-348.766655H639.765129V294.411049h227.420946v145.069476z m0-173.792505H639.765129V120.618543h227.420946v145.069477z" p-id="1630"></path></svg>
          <div>${lang === "zh-CN" ? "编辑" : "Edit"}</div>
        </div>
      </div>
    </div>`,
    reset: true,
  })
  if (!thumbnail) {
    generateThumbnail(id)
  }
}

async function insertRenderer() {
  const workbookName = `workbook-${Date.now()}`
  await logseq.Editor.insertAtEditingCursor(
    `{{renderer :luckysheet, ${workbookName}}}`,
  )
}

function generateThumbnail(id) {
  thumbnailQueue.push(id)
  if (thumbnailQueue.length === 1) {
    startRunner()
  }
}

async function startRunner() {
  while (thumbnailQueue.length > 0) {
    const id = thumbnailQueue.peek()
    console.log("-------processing", id)
    const thumbnail = await renderThumbnail(id)
    localStorage.setItem(`kef-${id}`, thumbnail)
    refreshRenderers(id, thumbnail)
    thumbnailQueue.pop()
  }
}

async function renderThumbnail(id) {
  await loadWorkbook(id)
  const thumbnail = luckysheet.getScreenshot({
    range: { row: [0, 10], column: [0, 10] },
  })
  luckysheet.destroy()
  return thumbnail
}

async function loadWorkbook(id) {
  return new Promise(async (resolve, reject) => {
    try {
      const { preferredLanguage: lang } = await logseq.App.getUserConfigs()
      const data = (await logseq.FileStorage.hasItem(id))
        ? JSON.parse(await logseq.FileStorage.getItem(id))
        : [
            {
              name: "Sheet1",
              color: "",
              status: "1",
              order: "0",
              data: [],
              config: {},
              index: 0,
            },
          ]

      luckysheet.create({
        container: "sheet",
        lang: lang === "zh-CN" ? "zh" : "en",
        plugins: ["chart"],
        enableAddRow: false,
        enableAddBackTop: false,
        showinfobar: false,
        row: 30,
        column: 20,
        gridKey: id,
        data,
        hook: {
          workbookCreateAfter() {
            resolve()
          },
        },
      })
    } catch (err) {
      reject(err)
    }
  })
}

function refreshRenderers(id, thumbnail) {
  const renderers = parent.document.querySelectorAll(`div[data-id="${id}"]`)
  for (const el of renderers) {
    el.style.background = `#fff left top/cover no-repeat url(${thumbnail})`
  }
}

async function showEditor({ dataset: { id } }) {
  logseq.showMainUI()
  currentWorkbookId = id
  await loadWorkbook(id)
}

async function onEditorClose() {
  const data = luckysheet.getAllSheets()
  await logseq.FileStorage.setItem(currentWorkbookId, JSON.stringify(data))
  const thumbnail = luckysheet.getScreenshot({
    range: { row: [0, 10], column: [0, 10] },
  })
  localStorage.setItem(`kef-${currentWorkbookId}`, thumbnail)
  refreshRenderers(currentWorkbookId, thumbnail)
  luckysheet.destroy()
  logseq.hideMainUI()
}

const model = { showEditor }
logseq.ready(model, main).catch(console.error)
