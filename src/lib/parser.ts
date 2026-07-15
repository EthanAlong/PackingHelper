import type {
  DuplicateBuyer,
  OrderItem,
  ParsedOrder,
  ParseResult,
  ServiceType,
} from './types'

/** One positioned text run on a page */
export interface TextRun {
  x: number
  str: string
}
/** One visual line (runs sharing a y coordinate, sorted by x) */
export type TextLine = TextRun[]
/** One page = lines sorted top to bottom */
export type TextPage = TextLine[]

const RE_PAGE_MARKER = /^(\d+)\s*\/\s*(\d+)$/
const RE_ORDER_ID = /^Order\s+(\d+)$/
const RE_PRICE = /^\$([\d,]+(?:\.\d{1,2})?)$/
const RE_QTY = /^\d+$/
const RE_ITEMS_SUMMARY = /^([\d,]+)\s+Items?$/
const RE_WEIGHT = /^([\d.]+)\s*oz$/i
const RE_TRACKING = /#(\d{8,})/
const RE_ADDRESS = /[.,]\s*[A-Z]{2}[.,]?\s*\d{5}/

/** "NeeDoh gumdrop(Blue) #6" → { product, color, tagNum } */
export function splitItemName(rawName: string): {
  product: string
  color: string
  tagNum: number
} {
  let rest = rawName.trim()
  let tagNum = 0
  const tagMatch = rest.match(/\s*#(\d+)\s*$/)
  if (tagMatch) {
    tagNum = parseInt(tagMatch[1], 10)
    rest = rest.slice(0, tagMatch.index).trim()
  }
  let color = ''
  const colorMatch = rest.match(/\(([^()]*)\)\s*$/)
  if (colorMatch) {
    color = colorMatch[1].trim()
    rest = rest.slice(0, colorMatch.index).trim()
  }
  return { product: rest, color, tagNum }
}

function classifyService(raw: string): ServiceType {
  const s = raw.toLowerCase()
  if (s.includes('priority')) return 'priority'
  if (s.includes('ground')) return 'ground'
  return 'unknown'
}

function parsePrice(s: string): number {
  const m = s.match(RE_PRICE)
  return m ? parseFloat(m[1].replace(/,/g, '')) : NaN
}

/** djb2 over the fields that identify this batch of slips */
function hashOrders(orders: ParsedOrder[]): string {
  const key = orders
    .map((o) => `${o.buyerUsername}:${o.tracking}:${o.items.length}`)
    .join('|')
  let h = 5381
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) + h + key.charCodeAt(i)) >>> 0
  }
  return h.toString(36) + '-' + orders.length
}

interface LineView {
  runs: TextLine
  joined: string
}

function toView(line: TextLine): LineView {
  return { runs: line, joined: line.map((r) => r.str.trim()).filter(Boolean).join(' | ') }
}

/**
 * Parse the reconstructed text of a Whatnot packing-slip PDF.
 * Pure function so the browser app and the node test harness share it.
 */
export function parseTextPages(pages: TextPage[]): ParseResult {
  const orders: ParsedOrder[] = []
  const globalWarnings: string[] = []
  let current: ParsedOrder | null = null
  /** item row seen without a name — the name arrives on the following line */
  let pendingItem: OrderItem | null = null
  /** set once the "QTY | Name & Description" header passed; items only counted after it */
  let inItems = false
  /** lines right after "To:" until the QTY header belong to the address block */
  let inHeader = false

  const finish = () => {
    if (!current) return
    if (pendingItem) {
      current.warnings.push(`Item row for order ${pendingItem.orderId} had no name`)
      current.items.push(pendingItem)
      pendingItem = null
    }
    const counted = current.items.reduce((n, it) => n + it.qty, 0)
    if (current.declaredItemCount >= 0 && counted !== current.declaredItemCount) {
      current.warnings.push(
        `Parsed ${counted} items but slip says ${current.declaredItemCount}`,
      )
    }
    if (current.declaredItemCount < 0 && current.items.length !== 1) {
      // single-item slips print no "N Items" summary row
      current.warnings.push('No "N Items" summary row found')
    }
    if (current.service === 'unknown') {
      current.warnings.push('Could not detect shipping service (Priority/Ground)')
    }
    orders.push(current)
    current = null
  }

  pages.forEach((page, pageIdx) => {
    for (let li = 0; li < page.length; li++) {
      const view = toView(page[li])
      const runs = view.runs.map((r) => r.str.trim()).filter(Boolean)
      if (runs.length === 0) continue

      // --- page marker starts/continues a slip ---
      if (runs.some((r) => r.startsWith('Whatnot Packing Slip'))) {
        const marker = runs.map((r) => r.match(RE_PAGE_MARKER)).find(Boolean)
        const pageNo = marker ? parseInt(marker[1], 10) : 1
        if (pageNo === 1) {
          finish()
          current = {
            index: orders.length,
            buyerUsername: '',
            buyerName: '',
            address: '',
            items: [],
            declaredItemCount: -1,
            declaredTotal: -1,
            service: 'unknown',
            serviceRaw: '',
            tracking: '',
            weightOz: 0,
            startPage: pageIdx + 1,
            warnings: [],
          }
          inItems = false
          inHeader = true
        }
        continue
      }
      if (!current) continue

      // --- header block: To/From, buyer name, address ---
      const toRun = runs.find((r) => r.startsWith('To:'))
      if (toRun) {
        current.buyerUsername = toRun.slice(3).trim()
        continue
      }
      if (inHeader) {
        if (runs.some((r) => r.startsWith('QTY'))) {
          inHeader = false
          inItems = true
          continue
        }
        if (runs.length === 1 && runs[0] === 'NEW') continue
        const addrRun = runs.find((r) => RE_ADDRESS.test(r))
        if (addrRun) {
          current.address = addrRun.replace(/\s*Start~\s*$/, '').trim()
          continue
        }
        // buyer name line: leftmost run, before the address appears
        if (!current.buyerName && !current.address && runs[0] !== 'NEW') {
          current.buyerName = runs[0]
        }
        continue
      }
      if (!inItems) continue

      // --- footer: shipping service line (repeats on every page of a slip) ---
      const serviceRun = runs.find(
        (r) => /USPS|UPS|FedEx|Mail|Ground|Priority/i.test(r) && RE_TRACKING.test(r),
      )
      if (serviceRun) {
        const trackMatch = serviceRun.match(RE_TRACKING)
        current.tracking = trackMatch ? trackMatch[1] : ''
        current.serviceRaw = serviceRun.replace(RE_TRACKING, '').replace(/#\s*$/, '').trim()
        current.service = classifyService(serviceRun)
        const weightRun = runs.map((r) => r.match(RE_WEIGHT)).find(Boolean)
        if (weightRun) current.weightOz = parseFloat(weightRun[1])
        continue
      }

      // --- "N Items | $total" summary row ---
      const summaryMatch = runs.map((r) => r.match(RE_ITEMS_SUMMARY)).find(Boolean)
      if (summaryMatch) {
        current.declaredItemCount = parseInt(summaryMatch[1].replace(/,/g, ''), 10)
        const priceRun = runs.find((r) => RE_PRICE.test(r))
        if (priceRun) current.declaredTotal = parsePrice(priceRun)
        continue
      }

      // --- item rows ---
      const orderRunIdx = runs.findIndex((r) => RE_ORDER_ID.test(r))
      const priceRunIdx = runs.findIndex((r) => RE_PRICE.test(r))
      if (orderRunIdx !== -1 && priceRunIdx !== -1) {
        if (pendingItem) {
          current.warnings.push(`Item row for order ${pendingItem.orderId} had no name`)
          current.items.push(pendingItem)
          pendingItem = null
        }
        const orderId = runs[orderRunIdx].match(RE_ORDER_ID)![1]
        const price = parsePrice(runs[priceRunIdx])
        const qtyRun = runs.find((r, i) => i !== priceRunIdx && RE_QTY.test(r))
        const qty = qtyRun ? parseInt(qtyRun, 10) : 1
        const nameRun = runs.find(
          (r, i) =>
            i !== orderRunIdx && i !== priceRunIdx && !RE_QTY.test(r) && r.length > 1,
        )
        const item: OrderItem = {
          rawName: nameRun ?? '',
          ...splitItemName(nameRun ?? ''),
          orderId,
          price,
          qty,
        }
        if (nameRun) current.items.push(item)
        else pendingItem = item // name is on the next line
        continue
      }

      // --- name line completing a pending item ---
      if (pendingItem) {
        const nameRun = runs.find((r) => r.length > 1 && !RE_QTY.test(r))
        if (nameRun) {
          pendingItem.rawName = nameRun
          Object.assign(pendingItem, splitItemName(nameRun))
          current.items.push(pendingItem)
          pendingItem = null
        }
        continue
      }
      // anything else inside the items block is the seller note — ignore
    }
  })
  finish()

  // --- duplicate buyer detection (same username on >1 slip) ---
  const byUser = new Map<string, ParsedOrder[]>()
  for (const o of orders) {
    const key = o.buyerUsername.toLowerCase()
    if (!key) continue
    if (!byUser.has(key)) byUser.set(key, [])
    byUser.get(key)!.push(o)
  }
  const duplicateBuyers: DuplicateBuyer[] = [...byUser.values()]
    .filter((list) => list.length > 1)
    .map((list) => ({
      username: list[0].buyerUsername,
      orders: list.map((o) => ({
        index: o.index,
        itemCount: o.items.reduce((n, it) => n + it.qty, 0),
        service: o.service,
        tracking: o.tracking,
      })),
    }))

  if (orders.length === 0) {
    globalWarnings.push('No packing slips found — is this a Whatnot packing-slip PDF?')
  }

  return {
    orders,
    pageCount: pages.length,
    duplicateBuyers,
    globalWarnings,
    hash: hashOrders(orders),
  }
}

/** Group an order's items for picking: same product+color adjacent, sorted */
export function groupItems(items: OrderItem[]) {
  const groups = new Map<string, { product: string; color: string; items: OrderItem[] }>()
  for (const it of items) {
    const key = `${it.product} ${it.color}`.toLowerCase()
    if (!groups.has(key)) groups.set(key, { product: it.product, color: it.color, items: [] })
    groups.get(key)!.items.push(it)
  }
  const list = [...groups.values()]
  for (const g of list) g.items.sort((a, b) => a.tagNum - b.tagNum)
  list.sort(
    (a, b) => a.product.localeCompare(b.product) || a.color.localeCompare(b.color),
  )
  return list
}

/** Whole-show totals per product+color; revenue = sum of line subtotals */
export function skuTotals(orders: ParsedOrder[]) {
  const totals = new Map<
    string,
    { product: string; color: string; count: number; orderCount: number; revenue: number }
  >()
  for (const o of orders) {
    const seen = new Set<string>()
    for (const it of o.items) {
      const key = `${it.product} ${it.color}`.toLowerCase()
      if (!totals.has(key))
        totals.set(key, {
          product: it.product,
          color: it.color,
          count: 0,
          orderCount: 0,
          revenue: 0,
        })
      const t = totals.get(key)!
      t.count += it.qty
      if (Number.isFinite(it.price)) t.revenue += it.price
      if (!seen.has(key)) {
        t.orderCount++
        seen.add(key)
      }
    }
  }
  return [...totals.values()].sort(
    (a, b) => a.product.localeCompare(b.product) || a.color.localeCompare(b.color),
  )
}
