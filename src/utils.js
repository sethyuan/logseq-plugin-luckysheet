export async function hash(text) {
  if (!text) return ""

  const bytes = new TextEncoder().encode(text)
  const hashedArray = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-1", bytes)),
  )
  const hashed = hashedArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  return hashed
}

export function range(n) {
  const arr = new Array(n)
  for (let i = 0; i < n; i++) {
    arr[i] = i
  }
  return arr
}

export const UUIDS = "kef-luckysheet-uuids"

export function bufferKey(uuid) {
  return `kef-luckysheet-${uuid}`
}

const ENCODE_CHARS = {
  "<": "@lt@",
  ">": "@gt@",
  ":": "@c@",
  '"': "@qt@",
  "/": "@s@",
  "\\": "@bs@",
  "|": "@b@",
  "?": "@q@",
  "*": "@a@",
  "}": "@rp@",
}

const DECODE_CHARS = Object.entries(ENCODE_CHARS).reduce((obj, [k, v]) => {
  obj[v] = k
  return obj
}, {})

export function encodeName(name) {
  const encoded = name.replace(/[<>:"\/\\|?*}]/g, (c) => ENCODE_CHARS[c])
  return `${encoded}@${Date.now()}`
}

export function decodeName(name) {
  const encoded = name.replace(/@[0-9]+$/, "")
  const decoded = encoded.replace(
    /@(lt|gt|c|qt|s|bs|b|q|a|rp)@/g,
    (c) => DECODE_CHARS[c],
  )
  return decoded
}
