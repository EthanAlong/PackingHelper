import type {
  BoxType,
  CatalogEntry,
  PackResult,
  ParsedOrder,
} from './types'

interface Dim {
  l: number
  w: number
  h: number
}

/** the 6 axis-aligned rotations of a cuboid */
function rotations(d: Dim): Dim[] {
  return [
    { l: d.l, w: d.w, h: d.h },
    { l: d.l, w: d.h, h: d.w },
    { l: d.w, w: d.l, h: d.h },
    { l: d.w, w: d.h, h: d.l },
    { l: d.h, w: d.l, h: d.w },
    { l: d.h, w: d.w, h: d.l },
  ]
}

function fitsSomehow(item: Dim, box: Dim): boolean {
  return rotations(item).some((r) => r.l <= box.l && r.w <= box.w && r.h <= box.h)
}

interface Placed extends Dim {
  x: number
  y: number
  z: number
}

/**
 * Extreme-point first-fit: place items largest-volume-first at the lowest
 * available extreme point, trying all 6 rotations. Returns true when every
 * item fits inside the box. Heuristic (not optimal) but errs conservative
 * enough for squishy toys, and the fill-factor knob compensates.
 */
function packItems(items: Dim[], box: Dim): boolean {
  const sorted = [...items].sort((a, b) => b.l * b.w * b.h - a.l * a.w * a.h)
  const placed: Placed[] = []
  let points: { x: number; y: number; z: number }[] = [{ x: 0, y: 0, z: 0 }]

  const collides = (p: Placed) =>
    placed.some(
      (q) =>
        p.x < q.x + q.l &&
        q.x < p.x + p.l &&
        p.y < q.y + q.w &&
        q.y < p.y + p.w &&
        p.z < q.z + q.h &&
        q.z < p.z + p.h,
    )

  for (const item of sorted) {
    let done = false
    // prefer low positions (stable stacking), then near origin
    points.sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x)
    for (const pt of points) {
      for (const rot of rotations(item)) {
        const cand: Placed = { ...pt, ...rot }
        if (
          cand.x + cand.l <= box.l &&
          cand.y + cand.w <= box.w &&
          cand.z + cand.h <= box.h &&
          !collides(cand)
        ) {
          placed.push(cand)
          points = points.filter((p) => p !== pt)
          points.push(
            { x: cand.x + cand.l, y: cand.y, z: cand.z },
            { x: cand.x, y: cand.y + cand.w, z: cand.z },
            { x: cand.x, y: cand.y, z: cand.z + cand.h },
          )
          done = true
          break
        }
      }
      if (done) break
    }
    if (!done) return false
  }
  return true
}

/** case-insensitive catalog lookup by product family */
export function findCatalogEntry(
  catalog: CatalogEntry[],
  product: string,
): CatalogEntry | undefined {
  const key = product.trim().toLowerCase()
  return catalog.find((c) => c.product.trim().toLowerCase() === key)
}

export interface PackOptions {
  /** usable fraction of box volume, 0–1; squishy toys tolerate high values */
  fillFactor: number
}

/**
 * One box per order: smallest enabled box (by volume) that passes
 * service filter, weight limit, volume budget and the 3D heuristic.
 */
export function packOrder(
  order: ParsedOrder,
  catalog: CatalogEntry[],
  boxes: BoxType[],
  opts: PackOptions,
): PackResult {
  const missing = new Set<string>()
  const dims: Dim[] = []
  for (const it of order.items) {
    const entry = findCatalogEntry(catalog, it.product)
    if (!entry || entry.l <= 0 || entry.w <= 0 || entry.h <= 0) {
      missing.add(it.product)
      continue
    }
    for (let i = 0; i < it.qty; i++) dims.push({ l: entry.l, w: entry.w, h: entry.h })
  }
  if (missing.size > 0) {
    return {
      orderIndex: order.index,
      box: null,
      failReason: 'no-dimensions',
      missingProducts: [...missing],
      fillRatio: 0,
    }
  }

  const candidates = boxes
    .filter((b) => b.enabled && b.l > 0 && b.w > 0 && b.h > 0)
    .filter((b) => !b.priorityOnly || order.service === 'priority')
    .sort((a, b) => a.l * a.w * a.h - b.l * b.w * b.h)

  if (candidates.length === 0) {
    return {
      orderIndex: order.index,
      box: null,
      failReason: 'no-box-for-service',
      missingProducts: [],
      fillRatio: 0,
    }
  }

  const itemVolume = dims.reduce((v, d) => v + d.l * d.w * d.h, 0)
  for (const box of candidates) {
    const boxVolume = box.l * box.w * box.h
    if (itemVolume > boxVolume * opts.fillFactor) continue
    if (box.maxWeightOz != null && order.weightOz > box.maxWeightOz) continue
    if (!dims.every((d) => fitsSomehow(d, box))) continue
    if (packItems(dims, box)) {
      return {
        orderIndex: order.index,
        box,
        failReason: null,
        missingProducts: [],
        fillRatio: itemVolume / boxVolume,
      }
    }
  }
  return {
    orderIndex: order.index,
    box: null,
    failReason: 'oversize',
    missingProducts: [],
    fillRatio: 0,
  }
}

export function packAll(
  orders: ParsedOrder[],
  catalog: CatalogEntry[],
  boxes: BoxType[],
  opts: PackOptions,
): PackResult[] {
  return orders.map((o) => packOrder(o, catalog, boxes, opts))
}

/** batch summary: how many of each box to tape up front */
export function boxSummary(results: PackResult[]) {
  const byBox = new Map<string, { box: BoxType; count: number }>()
  let failed = 0
  for (const r of results) {
    if (!r.box) {
      failed++
      continue
    }
    if (!byBox.has(r.box.id)) byBox.set(r.box.id, { box: r.box, count: 0 })
    byBox.get(r.box.id)!.count++
  }
  const list = [...byBox.values()].sort(
    (a, b) => a.box.l * a.box.w * a.box.h - b.box.l * b.box.w * b.box.h,
  )
  return { list, failed }
}
