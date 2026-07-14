// Node harness: runs the real parser (src/lib/parser.ts via Node type-stripping)
// against a real Whatnot packing-slip PDF.
// Usage: node scripts/test-parser.mjs [path-to.pdf]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { parseTextPages, groupItems, skuTotals } from '../src/lib/parser.ts'
import { itemsToLines } from '../src/lib/pdf-text.ts'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const pdfPath =
  process.argv[2] ?? path.join(root, 'Whatnot-Packing-Slips-00a5c890-1.pdf')

if (!fs.existsSync(pdfPath)) {
  console.error(`PDF not found: ${pdfPath}`)
  process.exit(1)
}

const data = new Uint8Array(fs.readFileSync(pdfPath))
const doc = await getDocument({ data }).promise
const pages = []
for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i)
  const content = await page.getTextContent()
  pages.push(itemsToLines(content.items))
}

const result = parseTextPages(pages)

let failures = 0
const check = (label, actual, expected) => {
  const ok = expected === undefined ? actual : actual === expected
  if (!ok) {
    failures++
    console.log(`  FAIL ${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)
  } else {
    console.log(`  ok   ${label}${expected !== undefined ? ` = ${JSON.stringify(actual)}` : ''}`)
  }
}

console.log(`\nParsed ${result.orders.length} orders from ${result.pageCount} pages\n`)

// --- per-order integrity ---
let warnCount = 0
for (const o of result.orders) {
  const counted = o.items.reduce((n, it) => n + it.qty, 0)
  if (o.declaredItemCount >= 0 && counted !== o.declaredItemCount) {
    console.log(`  MISMATCH [p${o.startPage}] ${o.buyerUsername}: parsed ${counted}, slip says ${o.declaredItemCount}`)
    failures++
  }
  if (o.warnings.length) {
    warnCount++
    console.log(`  WARN [p${o.startPage}] ${o.buyerUsername}: ${o.warnings.join('; ')}`)
  }
}
console.log(`${warnCount} orders with warnings\n`)

// --- known values from manual inspection of the sample PDF ---
if (pdfPath.includes('00a5c890')) {
  const dana = result.orders[0]
  console.log('Order #1 (Dana):')
  check('username', dana.buyerUsername, 'danatay44539')
  check('name', dana.buyerName, 'Dana Taylor')
  check('items', dana.items.reduce((n, it) => n + it.qty, 0), 17)
  check('declared', dana.declaredItemCount, 17)
  check('total', dana.declaredTotal, 184)
  check('service', dana.service, 'priority')
  check('tracking', dana.tracking, '9305520762601303589905')
  check('weight', dana.weightOz, 111.5)
  check('address', dana.address, '17577 S Gilbert Dr. Lockport, IL. 60441-1109. US')

  const laura = result.orders[1]
  console.log('Order #2 (Laura):')
  check('username', laura.buyerUsername, 'lmhannah1991')
  check('items', laura.items.reduce((n, it) => n + it.qty, 0), 14)
  check('total', laura.declaredTotal, 124)

  const firstItem = dana.items[0]
  console.log('Item name split:')
  check('product', firstItem.product, 'NeeDoh Mini cube 4-pack')
  check('color', firstItem.color, 'Blue')
  check('tagNum', firstItem.tagNum, 1)
  check('orderId', firstItem.orderId, '1179046098')
  check('price', firstItem.price, 18)
}

// --- summaries ---
console.log('\nDuplicate buyers:')
if (result.duplicateBuyers.length === 0) console.log('  (none)')
for (const d of result.duplicateBuyers) {
  console.log(
    `  ${d.username}: ${d.orders.map((o) => `slip#${o.index + 1} (${o.itemCount} items, ${o.service})`).join(' + ')}`,
  )
}

const services = {}
for (const o of result.orders) services[o.service] = (services[o.service] ?? 0) + 1
console.log(`\nService mix: ${JSON.stringify(services)}`)

const totals = skuTotals(result.orders)
console.log(`\nSKU totals (${totals.length} SKUs):`)
for (const t of totals) console.log(`  ${t.product}${t.color ? `(${t.color})` : ''}: ${t.count}`)

const grouped = groupItems(result.orders[0].items)
console.log(`\nOrder #1 grouped pick list:`)
for (const g of grouped)
  console.log(`  ${g.product}${g.color ? `(${g.color})` : ''} ×${g.items.length}  [#${g.items.map((i) => i.tagNum).join(', #')}]`)

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} FAILURES`)
process.exit(failures === 0 ? 0 : 1)
