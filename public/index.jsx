import "@logseq/libs"

async function main() {
  console.log("#luckysheet loaded")
}

const model = {}

logseq.ready(model, main).catch(console.error)
