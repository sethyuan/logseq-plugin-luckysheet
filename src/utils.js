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
