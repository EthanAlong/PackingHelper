export type ServiceType = 'priority' | 'ground' | 'unknown'

export interface OrderItem {
  /** Full name as printed, e.g. "NeeDoh gumdrop(Blue) #6" */
  rawName: string
  /** Product family, e.g. "NeeDoh gumdrop" */
  product: string
  /** Variant in parentheses, e.g. "Blue" — empty string when absent */
  color: string
  /** Trailing "#N" tag number, 0 when absent */
  tagNum: number
  orderId: string
  price: number
  qty: number
}

export interface ParsedOrder {
  /** Position in the PDF (0-based) — display must keep this order */
  index: number
  buyerUsername: string
  buyerName: string
  address: string
  items: OrderItem[]
  /** "N Items" summary printed on the slip; -1 when missing */
  declaredItemCount: number
  declaredTotal: number
  service: ServiceType
  serviceRaw: string
  tracking: string
  weightOz: number
  /** First page of this slip in the PDF (1-based), for cross-checking */
  startPage: number
  warnings: string[]
}

export interface ParseResult {
  orders: ParsedOrder[]
  pageCount: number
  /** usernames that appear on more than one slip */
  duplicateBuyers: DuplicateBuyer[]
  globalWarnings: string[]
  /** stable hash of the parse, used to key pick progress */
  hash: string
}

export interface DuplicateBuyer {
  username: string
  orders: { index: number; itemCount: number; service: ServiceType; tracking: string }[]
}

export interface CatalogEntry {
  id: string
  /** Product family this entry matches (case-insensitive exact match on parsed `product`) */
  product: string
  /** inches */
  l: number
  w: number
  h: number
  weightOz: number
  note: string
}

export interface BoxType {
  id: string
  name: string
  /** inner dimensions, inches */
  l: number
  w: number
  h: number
  maxWeightOz: number | null
  /** USPS flat-rate boxes may only ship Priority */
  priorityOnly: boolean
  enabled: boolean
}

export type PackFailReason = 'no-dimensions' | 'oversize' | 'no-box-for-service'

export interface PackResult {
  orderIndex: number
  box: BoxType | null
  failReason: PackFailReason | null
  /** products that have no catalog entry yet */
  missingProducts: string[]
  fillRatio: number
}
