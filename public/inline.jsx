const { id, name, uuid, frame } = frameElement.dataset
const logseq = parent.document.getElementById(frame).contentWindow.logseq

const SAVE_DELAY = 10_000 // 10s

let saveTimer
let workbookReady = false

async function main() {
  const { preferredLanguage: lang } = await logseq.App.getUserConfigs()

  document.getElementById("title").innerText = name

  const syncBtn = document.getElementById("syncBtn")
  syncBtn.title =
    lang === "zh-CN"
      ? "生成Markdown并覆写至父级块"
      : "Generate Markdown and override parent block"
  syncBtn.addEventListener("click", (e) => {
    generateAndOverrideParent()
  })

  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      !e.altKey &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.shiftKey
    ) {
      e.preventDefault()
    }
  })
  const fullscreenBtn = document.getElementById("fullscreenBtn")
  fullscreenBtn.title = lang === "zh-CN" ? "全屏编辑" : "FullScreen Edit"
  fullscreenBtn.addEventListener("click", async (e) => {
    if (!parent.document.fullscreenElement) {
      await frameElement.requestFullscreen()
      document.querySelector(".luckysheet-cell-input.editable")?.focus()
    } else {
      parent.document.exitFullscreen()
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
        workbookReady = true
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
  // Do not save selections.
  for (const sheet of sheets) {
    sheet.luckysheet_selection_range = []
  }
  await logseq.FileStorage.setItem(id, JSON.stringify(sheets))
}

async function generateAndOverrideParent() {
  const block = await logseq.Editor.getBlock(uuid)
  if (block.parent != null && block.parent.id !== block.page.id) {
    const parent = await logseq.Editor.getBlock(block.parent.id)
    const markdown = generateMarkdown()
    await logseq.Editor.updateBlock(parent.uuid, markdown)
  }
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

async function promptToDelete() {
  const { preferredLanguage: lang } = await logseq.App.getUserConfigs()
  const ok = parent.window.confirm(
    lang === "zh-CN"
      ? `你确定删除“${name}”吗？`
      : `You sure to delete "${name}"?`,
  )
  if (!ok) return

  await logseq.FileStorage.removeItem(id)
  const block = await logseq.Editor.getBlock(uuid)
  await logseq.Editor.updateBlock(
    uuid,
    block.content.replace(
      new RegExp(`{{renderer :luckysheet,\\s*${name}\\s*}}`, "i"),
      "",
    ),
  )
}

main()
