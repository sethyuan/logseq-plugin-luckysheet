const idRef = { current: frameElement.dataset.id }
const { name, uuid, frame } = frameElement.dataset
const refUuid = (() => {
  const blockParent = frameElement.closest(
    ".block-content.inline",
  ).parentElement
  if (blockParent.classList.contains("block-ref")) {
    return blockParent.closest(".block-content.inline").getAttribute("blockid")
  }
  return null
})()
const pluginWindow = parent.document.getElementById(frame).contentWindow
const logseq = pluginWindow.logseq
const t = pluginWindow.t

const SAVE_DELAY = 1_000 // 1s

let saveTimer
let workbookReady = false

async function main() {
  const title = document.getElementById("title")
  title.innerText = name
  title.title = name
  title.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      title.blur()
    }
  })
  title.addEventListener("blur", (e) => {
    renameWorkbook(title.innerText)
  })

  const copyBtn = document.getElementById("copyBtn")
  copyBtn.title = t("Copy selection as TSV")
  copyBtn.addEventListener("click", (e) => {
    copyAsTSV()
  })

  const syncBtn = document.getElementById("syncBtn")
  syncBtn.title = t("Generate Markdown and override parent block")
  syncBtn.addEventListener("click", (e) => {
    generateAndOverrideParent()
  })

  const fullscreenBtn = document.getElementById("fullscreenBtn")
  fullscreenBtn.title = t("FullScreen Edit")
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
  editBtn.title = t("Edit block")
  editBtn.addEventListener("click", (e) => {
    logseq.Editor.editBlock(refUuid || uuid)
  })

  const deleteBtn = document.getElementById("deleteBtn")
  deleteBtn.title = t("Delete spreadsheet")
  deleteBtn.addEventListener("click", (e) => {
    promptToDelete()
  })

  window.addEventListener("pagehide", (e) => {
    if (workbookReady) {
      clearTimeout(saveTimer)
      save()
    }
  })

  try {
    const [justCreated, data] = await read()
    if (justCreated) {
      const dataBlock = await logseq.Editor.insertBlock(
        uuid,
        `\`\`\`json\n${JSON.stringify(data)}\n\`\`\``,
        { sibling: false },
      )
      // HACK: need to wait a cycle for exit editing to work.
      // Posterior block updates will fail if editing mode is not
      // exited first.
      setTimeout(async () => {
        await logseq.Editor.exitEditingMode()
        await logseq.Editor.setBlockCollapsed(uuid, true)
      }, 0)
    }
    luckysheet.create({
      container: "sheet",
      lang: t("en"),
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
      data,
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
  } catch (err) {
    document.getElementById("sheet").innerHTML = "zh-CN"
      ? '<p class="error">数据读取错误！</p>'
      : '<p class="error">Data read error!</p>'
  }
}

async function read() {
  const firstChild = (
    await logseq.Editor.getBlock(uuid, {
      includeChildren: true,
    })
  )?.children?.[0]

  if (!firstChild?.content.startsWith("```json")) {
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
    return [true, Array.isArray(file) ? file : file.data]
  }

  return [
    false,
    JSON.parse(firstChild.content.substring(7, firstChild.content.length - 3)),
  ]
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

  const data = `\`\`\`json\n${JSON.stringify(sheets)}\n\`\`\``
  const block = await logseq.Editor.getBlock(uuid, { includeChildren: true })
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

async function copyAsTSV() {
  const data = luckysheet.getRangeArray("twoDimensional")
  const text = data.map((row) => row.join("\t")).join("\n")
  await navigator.clipboard.writeText(text)

  logseq.App.showMsg(t("Selection copied"))
}

async function generateAndOverrideParent() {
  const block = await logseq.Editor.getBlock(refUuid || uuid)
  if (block.parent != null && block.parent.id !== block.page.id) {
    const parent = await logseq.Editor.getBlock(block.parent.id)
    const markdown = generateMarkdown()
    await logseq.Editor.updateBlock(parent.uuid, markdown)
  } else {
    logseq.App.showMsg(t("Luckysheet needs to have a parent block"))
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

async function renameWorkbook(newName) {
  const block = await logseq.Editor.getBlock(uuid)
  await logseq.Editor.updateBlock(
    uuid,
    block.content.replace(
      new RegExp(`{{renderer :luckysheet,\\s*${name}\\s*}}`, "i"),
      `{{renderer :luckysheet, ${newName}}}`,
    ),
  )
}

async function promptToDelete() {
  const ok = parent.window.confirm(t('You sure to delete "${name}"?', { name }))
  if (!ok) return

  clearTimeout(saveTimer)
  const block = await logseq.Editor.getBlock(uuid, { includeChildren: true })
  if ((block.children?.length ?? 0) <= 1) {
    await logseq.Editor.removeBlock(uuid)
  } else if (block.children[0].content.startsWith("```json")) {
    await logseq.Editor.updateBlock(uuid, "")
    await logseq.Editor.removeBlock(block.children[0].uuid)
  }
  workbookReady = false
}

main()
