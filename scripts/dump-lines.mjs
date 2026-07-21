// Debug: dump reconstructed text lines (with run boundaries) for the first N pages
// Usage: node scripts/dump-lines.mjs path/to.pdf [maxPages]
import fs from 'node:fs'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

const pdfPath = process.argv[2]
const maxPages = parseInt(process.argv[3] ?? '2', 10)
const data = new Uint8Array(fs.readFileSync(pdfPath))
const doc = await getDocument({ data }).promise
for (let i = 1; i <= Math.min(doc.numPages, maxPages); i++) {
  const page = await doc.getPage(i)
  const content = await page.getTextContent()
  const byY = new Map()
  for (const item of content.items) {
    if (!item.str || !item.str.trim()) continue
    const y = Math.round(item.transform[5])
    if (!byY.has(y)) byY.set(y, [])
    byY.get(y).push({ x: item.transform[4], str: item.str })
  }
  const lines = [...byY.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, runs]) => runs.sort((a, b) => a.x - b.x))
  console.log(`\n===== page ${i} =====`)
  for (const line of lines) {
    console.log(line.map((r) => `[${r.str}]`).join(' '))
  }
}
