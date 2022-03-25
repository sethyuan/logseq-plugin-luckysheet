import { hash } from "./utils"

const idRef = { current: frameElement.dataset.id }
const { name, uuid, frame } = frameElement.dataset
const pluginWindow = parent.document.getElementById(frame).contentWindow
const logseq = pluginWindow.logseq

const SAVE_DELAY = 10_000 // 10s

let saveTimer
let workbookReady = false

async function main() {
  const { preferredLanguage: lang } = await logseq.App.getUserConfigs()

  const title = document.getElementById("title")
  title.innerText = name
  title.title = name
  title.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (!(await renameWorkbook(title.innerText))) {
        title.innerText = name
      }
    }
  })
  title.addEventListener("blur", (e) => {
    title.innerText = name
  })

  const copyBtn = document.getElementById("copyBtn")
  copyBtn.title = lang === "zh-CN" ? "拷贝选区为TSV" : "Copy selection as TSV"
  copyBtn.addEventListener("click", (e) => {
    copyAsTSV()
  })

  const syncBtn = document.getElementById("syncBtn")
  syncBtn.title =
    lang === "zh-CN"
      ? "生成Markdown并覆写至父级块"
      : "Generate Markdown and override parent block"
  syncBtn.addEventListener("click", (e) => {
    generateAndOverrideParent()
  })

  const fullscreenBtn = document.getElementById("fullscreenBtn")
  fullscreenBtn.title = lang === "zh-CN" ? "全屏编辑" : "FullScreen Edit"
  fullscreenBtn.addEventListener("click", async (e) => {
    frameElement.classList.toggle("kef-sheet-fullscreen")
    if (frameElement.classList.contains("kef-sheet-fullscreen")) {
      if (parent.document.documentElement.classList.contains("is-mac")) {
        document.documentElement.classList.add("fullscreen-mac")
      }
      document.querySelector(".luckysheet-cell-input.editable")?.focus()
    } else {
      document.documentElement.classList.remove("fullscreen-mac")
    }
  })

  const editBtn = document.getElementById("editBtn")
  editBtn.title = lang === "zh-CN" ? "编辑块" : "Edit block"
  editBtn.addEventListener("click", (e) => {
    logseq.Editor.editBlock(uuid)
  })

  const deleteBtn = document.getElementById("deleteBtn")
  deleteBtn.title = lang === "zh-CN" ? "删除表格" : "Delete spreadsheet"
  deleteBtn.addEventListener("click", (e) => {
    promptToDelete()
  })

  window.addEventListener("pagehide", (e) => {
    if (workbookReady) {
      clearTimeout(saveTimer)
      save()
    }
  })

  const file = (await logseq.FileStorage.hasItem(idRef.current))
    ? JSON.parse(await logseq.FileStorage.getItem(idRef.current))
    : {
        data: [
          {
            name: "Sheet1",
            color: "",
            status: "1",
            order: "0",
            data: [],
            config: {},
            index: 0,
          },
        ],
      }

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
    gridKey: idRef.current,
    // compat with old files.
    data: Array.isArray(file) ? file : file.data,
    hook: {
      workbookCreateAfter() {
        workbookReady = true

        // HACK workaround Luckysheet issue that on first focus it scrolls to
        // the top of the page.
        const editable = document.querySelector(
          ".luckysheet-cell-input.editable",
        )
        editable.addEventListener("focus", (e) => {
          pluginWindow.justFocused = true
        })

        luckysheet.setRangeShow("A1", { show: false })
      },
      updated(op) {
        clearTimeout(saveTimer)
        saveTimer = setTimeout(save, SAVE_DELAY)
      },
    },
  })
}

async function save() {
  const sheets = luckysheet.getAllSheets()
  for (const sheet of sheets) {
    // Do not save selections.
    sheet.luckysheet_selection_range = []

    // Process charts
    if (sheet.chart) {
      for (const chart of sheet.chart) {
        const div = document.getElementById(`${chart.chart_id}_c`)
        if (div.style) {
          chart.left = parseInt(div.style.left)
          chart.top = parseInt(div.style.top)
          chart.width = parseInt(div.style.width)
          chart.height = parseInt(div.style.height)
        }
        chart.chartOptions = {
          ...chartmix.default.getChartJson(chart.chart_id),
        }
      }
    }
  }
  const file = {
    name,
    data: sheets,
  }
  await logseq.FileStorage.setItem(idRef.current, JSON.stringify(file))
}

async function copyAsTSV() {
  const data = luckysheet.getRangeArray("twoDimensional")
  const text = data.map((row) => row.join("\t")).join("\n")
  await navigator.clipboard.writeText(text)

  const { preferredLanguage: lang } = await logseq.App.getUserConfigs()
  logseq.App.showMsg(lang === "zh-CN" ? "选区已复制" : "Selection copied")
}

async function generateAndOverrideParent() {
  const block = await logseq.Editor.getBlock(uuid)
  if (block.parent != null && block.parent.id !== block.page.id) {
    const parent = await logseq.Editor.getBlock(block.parent.id)
    const markdown = generateMarkdown()
    await logseq.Editor.updateBlock(parent.uuid, markdown)
  } else {
    const { preferredLanguage: lang } = await logseq.App.getUserConfigs()
    logseq.App.showMsg(
      lang === "zh-CN"
        ? "表格需有一个父级块"
        : "Luckysheet needs to have a parent block",
    )
  }
}

function generateMarkdown() {
  const data = luckysheet.getSheetData()

  let rowStart = 0
  let colStart = 0
  let colEnd = 0
  loop: for (let i = 0; i < data.length; i++) {
    for (let j = 0; j < data[i].length; j++) {
      if (data[i][j]?.m != null || data[i][j]?.ct?.t === "inlineStr") {
        rowStart = i
        colStart = j
        break loop
      }
    }
  }
  for (let i = colStart + 1; i < data[rowStart].length; i++) {
    if (
      data[rowStart][i]?.m == null &&
      data[rowStart][i]?.ct?.t !== "inlineStr"
    ) {
      colEnd = i
      break
    }
  }

  const rows = []
  for (let i = rowStart; i < data.length; i++) {
    const row = new Array(colEnd - colStart)

    for (let j = colStart; j < colEnd; j++) {
      if (data[i][j]?.m != null || data[i][j]?.ct?.t === "inlineStr") {
        row[j - colStart] =
          data[i][j]?.m ??
          data[i][j]?.ct.s
            .map(
              ({ bl, it, cl, v }) =>
                `${bl ? "**" : ""}${cl ? "~~" : ""}${it ? "_" : ""}${v}${
                  it ? "_" : ""
                }${cl ? "~~" : ""}${bl ? "**" : ""}`,
            )
            .join("")
            .trim()
            .replaceAll("\r\n", " <br />")
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

async function promptToDelete() {
  const { preferredLanguage: lang } = await logseq.App.getUserConfigs()
  const ok = parent.window.confirm(
    lang === "zh-CN"
      ? `你确定删除“${name}”吗？`
      : `You sure to delete "${name}"?`,
  )
  if (!ok) return

  clearTimeout(saveTimer)
  await logseq.FileStorage.removeItem(idRef.current)
  workbookReady = false
  const block = await logseq.Editor.getBlock(uuid)
  await logseq.Editor.updateBlock(
    uuid,
    block.content.replace(
      new RegExp(`{{renderer :luckysheet,\\s*${name}\\s*}}`, "i"),
      "",
    ),
  )
}

async function renameWorkbook(newName) {
  const newID = `workbook-${await hash(newName)}`

  if (logseq.FileStorage.hasItem(newID)) {
    const { preferredLanguage: lang } = await logseq.App.getUserConfigs()
    alert(
      lang === "zh-CN"
        ? "相同名字的电子表格已存在，无法重命名！"
        : "A spreadsheet with the same name already exists, failed to rename!",
    )
    return false
  }

  await logseq.FileStorage.removeItem(idRef.current)
  idRef.current = newID
  const block = await logseq.Editor.getBlock(uuid)
  await logseq.Editor.updateBlock(
    uuid,
    block.content.replace(
      new RegExp(`{{renderer :luckysheet,\\s*${name}\\s*}}`, "i"),
      `{{renderer :luckysheet, ${newName}}}`,
    ),
  )

  // A save will be triggered by page exit.
  return true
}

main()
