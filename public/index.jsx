import "@logseq/libs"
import { Queue } from "jsutils"
import { hash } from "./utils"

const DEFAULT_WIDTH = 500
const DEFAULT_HEIGHT = 200

const thumbnailQueue = new Queue()
let currentWorkbookId
let currentUuid
let autoSaveTimer

async function main() {
  const { preferredLanguage: lang } = await logseq.App.getUserConfigs()

  const closeBtn = document.getElementById("closeBtn")
  closeBtn.title = lang === "zh-CN" ? "保存并关闭" : "Save and close"
  closeBtn.addEventListener("click", saveAndClose)

  const syncBtn = document.getElementById("syncBtn")
  syncBtn.title =
    lang === "zh-CN"
      ? "生成Markdown并覆写至父级块"
      : "Generate Markdown and override the parent block"
  syncBtn.addEventListener("click", generateAndOverrideParent)

  logseq.provideStyle(`
    .kef-sheet-bg {
      display: flex;
      cursor: pointer;
      border: 1px solid var(--ls-border-color);
      flex: 0 1 ${DEFAULT_WIDTH}px;
      height: ${DEFAULT_HEIGHT}px;
    }
    .kef-sheet-overlay {
      flex: 1 1 auto;
      background: rgba(255 255 255 / 75%);
      backdrop-filter: blur(1px);
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
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
    .kef-sheet-trash {
      display: inherit;
      position: absolute;
      top: 10px;
      right: 10px;
      width: 22px;
      height: 22px;
    }
    .kef-sheet-trash:hover {
      filter: drop-shadow(0 0 3px gray);
    }
    .kef-sheet-trash svg {
      fill: var(--ls-icon-color);
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
  const thumbnail = localStorage.getItem(`kef-${id}`) ?? ""
  logseq.provideStyle(`#${slot} { width: 100%; }`)
  logseq.provideUI({
    key: "luckysheet",
    slot,
    template: `<div data-id="${id}" data-name="${workbookName}" data-uuid="${uuid}" data-on-click="openEditor" class="kef-sheet-bg" style="background: #fff left top/cover no-repeat url(${thumbnail})">
      <div class="kef-sheet-overlay">
        <div class="kef-sheet-content">
          <svg t="1646980067449" viewBox="0 0 1203 1024" width="50" height="50" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1629"><path d="M100.662959 91.804618v725.347382h795.337041V91.804618h-795.337041z m283.958047 28.72303h227.420946v145.069476H384.621006V120.527648z m0 173.974296h227.420946v145.069477H384.621006V294.501944z m-28.90482 493.745236h-226.330198V643.177703h226.330198v145.069477z m0-173.883402h-226.330198V469.294302h226.330198v145.069476z m0-174.883253h-226.330198V294.411049h226.330198v145.069476z m0-173.792505h-226.330198V120.618543h226.330198v145.069477z m511.469889 522.55916h-56.627997V584.550001h-85.441922v203.697179h-56.627998V643.177703h-85.441922v145.069477h-56.627997V700.805553h-85.441922v87.441627h-56.627998V469.294302h482.565069l0.272687 318.952878z m0-348.766655H639.765129V294.411049h227.420946v145.069476z m0-173.792505H639.765129V120.618543h227.420946v145.069477z" p-id="1630"></path></svg>
          <div>${lang === "zh-CN" ? "编辑" : "Edit"}</div>
        </div>
        <div class="kef-sheet-trash" data-id="${id}" data-name="${workbookName}" data-uuid="${uuid}" data-on-click="promptToDelete">
          <svg t="1647046677613" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1257"><path d="M725.333333 469.333333c18.986667-27.733333 33.834667-42.666667 42.666667-42.666666 27.818667 0 42.666667 14.933333 42.666667 42.666666v384c0 49.578667-34.901333 85.333333-85.333334 85.333334h-426.666666c-50.389333 0-85.333333-35.754667-85.333334-85.333334v-384c0-27.733333 14.890667-42.666667 42.666667-42.666666 8.874667 0 23.722667 14.933333 42.666667 42.666666v384c-18.944 12.970667-13.482667 18.56 0 0h426.666666c13.482667 18.56 18.986667 12.970667 0 0v-384zM213.333333 341.333333c-28.032 0-42.666667-19.072-42.666666-42.666666 0-23.552 14.634667-42.666667 42.666666-42.666667h597.333334c28.032 0 42.666667 19.114667 42.666666 42.666667 0 23.594667-14.634667 42.666667-42.666666 42.666666h-597.333334z" p-id="1258"></path><path d="M384 426.666667m42.666667 0l0 0q42.666667 0 42.666666 42.666666l0 256q0 42.666667-42.666666 42.666667l0 0q-42.666667 0-42.666667-42.666667l0-256q0-42.666667 42.666667-42.666666Z" p-id="1259"></path><path d="M554.666667 426.666667m42.666666 0l0 0q42.666667 0 42.666667 42.666666l0 256q0 42.666667-42.666667 42.666667l0 0q-42.666667 0-42.666666-42.666667l0-256q0-42.666667 42.666666-42.666666Z" p-id="1260"></path><path d="M426.666667 213.333333c-27.818667 0-42.666667-19.072-42.666667-42.666666 0-23.552 14.848-42.666667 42.666667-42.666667h170.666666c27.861333 0 42.666667 19.114667 42.666667 42.666667 0 23.594667-14.805333 42.666667-42.666667 42.666666h-170.666666z" p-id="1261"></path></svg>
        </div>
      </div>
    </div>`,
    reset: true,
    style: { flex: 1 },
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
        showtoolbarConfig: {
          print: false,
        },
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
  const renderers = parent.document.querySelectorAll(
    `.kef-sheet-bg[data-id="${id}"]`,
  )
  for (const el of renderers) {
    el.style.background = `#fff left top/cover no-repeat url(${thumbnail})`
  }
}

async function save() {
  const sheets = luckysheet.getAllSheets()
  // Do not save selections.
  for (const sheet of sheets) {
    sheet.luckysheet_selection_range = []
  }
  await logseq.FileStorage.setItem(currentWorkbookId, JSON.stringify(sheets))
}

async function openEditor({ dataset: { id, name, uuid } }) {
  currentWorkbookId = id
  currentUuid = uuid
  document.getElementById("title").innerText = name
  logseq.showMainUI()
  await loadWorkbook(id)
  autoSaveTimer = setInterval(save, 30_000)
  document.querySelector(".luckysheet-cell-input.editable")?.focus()
}

async function saveAndClose() {
  clearInterval(autoSaveTimer)
  await save()
  const thumbnail = luckysheet.getScreenshot({
    range: { row: [0, 10], column: [0, 10] },
  })
  localStorage.setItem(`kef-${currentWorkbookId}`, thumbnail)
  refreshRenderers(currentWorkbookId, thumbnail)
  luckysheet.destroy()
  logseq.hideMainUI()
}

async function promptToDelete({ dataset: { id, name, uuid } }) {
  const { preferredLanguage: lang } = await logseq.App.getUserConfigs()
  const ok = parent.window.confirm(
    lang === "zh-CN"
      ? `你确定删除“${name}”吗？`
      : `You sure to delete "${name}"?`,
  )
  if (!ok) return

  await logseq.FileStorage.removeItem(id)
  localStorage.removeItem(`kef-${id}`)
  const block = await logseq.Editor.getBlock(uuid)
  await logseq.Editor.updateBlock(
    uuid,
    block.content.replace(
      new RegExp(`{{renderer :luckysheet,\\s*${name}\\s*}}`, "i"),
      "",
    ),
  )
}

async function generateAndOverrideParent() {
  const block = await logseq.Editor.getBlock(currentUuid)
  if (block.parent != null && block.parent.id !== block.page.id) {
    const parent = await logseq.Editor.getBlock(block.parent.id)
    const markdown = generateMarkdown()
    await logseq.Editor.updateBlock(parent.uuid, markdown)
  }
  await saveAndClose()
}

function generateMarkdown() {
  const data = luckysheet.getSheetData()

  let colNum = 0
  for (let i = 0; i < data[0].length; i++) {
    if (data[0][i]?.m == null && data[0][i]?.ct?.t !== "inlineStr") {
      colNum = i
      break
    }
  }

  const rows = []
  for (let i = 0; i < data.length; i++) {
    const row = new Array(colNum)

    for (let j = 0; j < colNum; j++) {
      if (data[i][j]?.m != null || data[i][j]?.ct?.t === "inlineStr") {
        row[j] =
          data[i][j]?.m ?? data[i][j]?.ct.s[0].v.replaceAll("\r\n", " <br />")
      }
    }

    if (row.every((cell) => !cell)) break

    rows.push(`| ${row.join(" | ")} |`)

    if (i === 0) {
      rows.push(
        `| ${row
          .map((_, j) => {
            switch (data[i][j].ht) {
              case "0":
                return ":---:"
              case "2":
                return "---:"
              default:
                return "---"
            }
          })
          .join(" | ")} |`,
      )
    }
  }

  return rows.join("\n")
}

const model = { openEditor, promptToDelete }
logseq.ready(model, main).catch(console.error)
