// Sanity-check the packing heuristic with realistic toy dimensions
// against the real sample PDF. Usage: node scripts/test-packing.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { parseTextPages } from '../src/lib/parser.ts'
import { itemsToLines } from '../src/lib/pdf-text.ts'
import { packAll, boxSummary, packOrder } from '../src/lib/packing.ts'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const data = new Uint8Array(
  fs.readFileSync(path.join(root, 'Whatnot-Packing-Slips-00a5c890-1.pdf')),
)
const doc = await getDocument({ data }).promise
const pages = []
for (let i = 1; i <= doc.numPages; i++) {
  pages.push(itemsToLines((await doc.getPage(i)).getTextContent && (await (await doc.getPage(i)).getTextContent()).items))
}
const { orders } = parseTextPages(pages)

// plausible dims (inches) for NeeDoh product families in the sample
const catalog = [
  { id: '1', product: 'NeeDoh gumdrop', l: 2.5, w: 2.5, h: 2.5, weightOz: 3, note: '' },
  { id: '2', product: 'NeeDoh Nice-cube', l: 2.5, w: 2.5, h: 2.5, weightOz: 4, note: '' },
  { id: '3', product: 'NeeDoh mini Nice-cube', l: 1.5, w: 1.5, h: 1.5, weightOz: 1.5, note: '' },
  { id: '4', product: 'NeeDoh Mini cube 4-pack', l: 6, w: 4.5, h: 1.5, weightOz: 6, note: '' },
  { id: '5', product: 'NeeDoh gummy bear', l: 3, w: 2, h: 4, weightOz: 4, note: '' },
  { id: '6', product: 'Medium size Butter squishy', l: 3, w: 3, h: 2, weightOz: 2, note: '' },
  { id: '7', product: 'Large size Butter squishy', l: 4, w: 4, h: 2.5, weightOz: 3, note: '' },
  { id: '8', product: 'GIVEAWAY', l: 2, w: 2, h: 2, weightOz: 2, note: '' },
]
const boxes = [
  { id: 'b1', name: '4×4×4', l: 4, w: 4, h: 4, maxWeightOz: null, priorityOnly: false, enabled: true },
  { id: 'b2', name: '8×4×4', l: 8, w: 4, h: 4, maxWeightOz: null, priorityOnly: false, enabled: true },
  { id: 'b3', name: '8×8×4', l: 8, w: 8, h: 4, maxWeightOz: null, priorityOnly: false, enabled: true },
  { id: 'b4', name: 'USPS Medium', l: 11, w: 8.5, h: 5.5, maxWeightOz: null, priorityOnly: true, enabled: true },
  { id: 'b5', name: 'USPS Large', l: 12, w: 12, h: 5.5, maxWeightOz: null, priorityOnly: true, enabled: true },
]

const t0 = Date.now()
const results = packAll(orders, catalog, boxes, { fillFactor: 0.85 })
console.log(`packed ${orders.length} orders in ${Date.now() - t0}ms\n`)

const summary = boxSummary(results)
for (const { box, count } of summary.list) console.log(`  ${box.name}: ${count}`)
console.log(`  FAILED: ${summary.failed}`)

let failures = 0
const check = (label, cond) => {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${label}`)
  if (!cond) failures++
}

console.log('\nInvariants:')
// ground orders must never get a priorityOnly box
check(
  'no Ground order in a flat-rate box',
  results.every((r) => !r.box || !r.box.priorityOnly || orders[r.orderIndex].service === 'priority'),
)
// single small toy must land in the smallest box
const single = orders.find((o) => o.items.reduce((s, i) => s + i.qty, 0) === 1 && o.items[0].product === 'NeeDoh gumdrop')
if (single) {
  const r = results[single.index]
  check(`1× gumdrop → 4×4×4 (got ${r.box?.name})`, r.box?.name === '4×4×4')
}
// an impossible item flags oversize, not a crash
const fake = { ...orders[0], items: [{ rawName: 'Huge', product: 'Huge', color: '', tagNum: 0, orderId: 'x', price: 0, qty: 1 }] }
const rHuge = packOrder(fake, [{ id: 'h', product: 'Huge', l: 20, w: 20, h: 20, weightOz: 0, note: '' }], boxes, { fillFactor: 0.85 })
check('20-inch item → oversize', rHuge.failReason === 'oversize')
// unknown product → no-dimensions
const rMissing = packOrder(fake, [], boxes, { fillFactor: 0.85 })
check('unknown product → no-dimensions', rMissing.failReason === 'no-dimensions' && rMissing.missingProducts[0] === 'Huge')

// Dana: 17 items priority — show assignment
const dana = results[0]
console.log(`\nDana (17 items, priority): ${dana.box ? dana.box.name : dana.failReason} fill=${Math.round(dana.fillRatio * 100)}%`)

console.log(failures ? `\n${failures} FAILURES` : '\nALL CHECKS PASSED')
process.exit(failures ? 1 : 0)
