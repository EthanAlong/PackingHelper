import { groupItems } from '../lib/parser'
import { useT } from '../lib/i18n'
import type { PackResult, ParsedOrder } from '../lib/types'

export type PrintJob = { mode: 'pick' | 'slips'; orderIndex?: number } | null

/**
 * Rendered inside #print-root, visible only under @media print.
 * 'pick' = warehouse pick sheets (grouped items, checkboxes, box assignment).
 * 'slips' = customer-facing packing slips to drop in the box.
 */
export default function PrintSheets({
  job,
  orders,
  packs,
}: {
  job: PrintJob
  orders: ParsedOrder[]
  packs: PackResult[]
}) {
  if (!job) return null
  const selected =
    job.orderIndex != null ? orders.filter((o) => o.index === job.orderIndex) : orders
  return job.mode === 'pick' ? (
    <div className="p-2 font-body text-black">
      {selected.map((o) => (
        <PickTicket key={o.index} order={o} pack={packs[o.index]} />
      ))}
    </div>
  ) : (
    <div className="font-body text-black">
      {selected.map((o) => (
        <CustomerSlip key={o.index} order={o} />
      ))}
    </div>
  )
}

function PickTicket({ order, pack }: { order: ParsedOrder; pack: PackResult | undefined }) {
  const t = useT()
  const groups = groupItems(order.items)
  return (
    <div className="print-order">
      <div className="mb-2 flex items-baseline gap-3">
        <span className="font-display text-3xl font-bold">#{order.index + 1}</span>
        <span className="text-xl font-semibold">{order.buyerName}</span>
        <span className="font-mono text-sm">@{order.buyerUsername}</span>
        <span className="font-mono text-sm uppercase">{order.serviceRaw || order.service}</span>
        {pack?.box && (
          <span className="ml-auto border-2 border-black px-2 font-mono font-bold">
            {pack.box.name}
          </span>
        )}
        {pack && !pack.box && pack.failReason === 'no-dimensions' && (
          <span className="ml-auto border-2 border-dashed border-black px-2 font-mono">
            {t('boxMissingDims')}
          </span>
        )}
        {pack && !pack.box && pack.failReason !== 'no-dimensions' && (
          <span className="ml-auto border-2 border-black bg-black px-2 font-mono font-bold text-white">
            {t('boxNone')}
          </span>
        )}
      </div>
      <ul className="grid grid-cols-2 gap-x-8">
        {groups.map((g) => (
          <li key={g.product + g.color} className="mb-1">
            <span className="print-checkbox" />
            <span className="font-semibold">
              {g.product}
              {g.color ? ` (${g.color})` : ''}
            </span>{' '}
            <span className="font-mono">×{g.items.reduce((s, i) => s + i.qty, 0)}</span>
            <span className="ml-1 font-mono text-sm">
              {g.items
                .filter((i) => i.tagNum)
                .map((i) => `#${i.tagNum}`)
                .join(' ')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CustomerSlip({ order }: { order: ParsedOrder }) {
  const t = useT()
  const itemCount = order.items.reduce((s, it) => s + it.qty, 0)
  return (
    <div className="print-slip">
      <div className="mb-4 border-b-2 border-black pb-2">
        <div className="font-display text-2xl font-bold">
          {order.buyerName} <span className="font-mono text-base">@{order.buyerUsername}</span>
        </div>
        <div className="text-sm">{order.address}</div>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-black">
            <th className="py-1 pr-2">Qty</th>
            <th className="py-1 pr-2">Item</th>
            <th className="py-1 pr-2">Order</th>
            <th className="py-1 text-right">Price</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((it, i) => (
            <tr key={i} className="border-b border-gray-300">
              <td className="py-1 pr-2">{it.qty}</td>
              <td className="py-1 pr-2">{it.rawName}</td>
              <td className="py-1 pr-2 font-mono">{it.orderId}</td>
              <td className="py-1 text-right font-mono">${it.price.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2} className="py-2 font-semibold">
              {itemCount} items
            </td>
            <td className="py-2 text-right font-semibold" colSpan={2}>
              {t('orderTotal')}: $
              {order.declaredTotal >= 0
                ? order.declaredTotal.toFixed(2)
                : order.items.reduce((s, it) => s + it.price, 0).toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
      <p className="mt-6 text-center text-sm">{t('thankYou')}</p>
    </div>
  )
}
