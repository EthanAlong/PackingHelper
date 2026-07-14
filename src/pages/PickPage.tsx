import { useState } from 'react'
import { groupItems } from '../lib/parser'
import { useT } from '../lib/i18n'
import { usePackResults } from '../lib/usePack'
import { useProgress, useSession } from '../store'
import { Btn, BoxBadge, ServiceBadge } from '../components/ui'
import type { ParsedOrder, PackResult } from '../lib/types'

export default function PickPage({
  onPrint,
}: {
  onPrint: (mode: 'pick' | 'slips', orderIndex?: number) => void
}) {
  const t = useT()
  const result = useSession((s) => s.result)
  const packs = usePackResults()
  const { checked, clear } = useProgress()
  const [hideDone, setHideDone] = useState(false)

  if (!result) return <p className="py-20 text-center text-ink-mut">{t('pickEmpty')}</p>

  const forHash = checked[result.hash] ?? {}
  const totalItems = result.orders.reduce((s, o) => s + o.items.length, 0)
  const pickedItems = Object.keys(forHash).length
  const doneOrders = result.orders.filter((o) =>
    o.items.every((it, i) => forHash[`${o.index}:${it.orderId}:${i}`]),
  ).length

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 mb-6 border-b-2 border-line bg-bg/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2">
          <div className="font-display text-2xl font-bold">
            {pickedItems}/{totalItems}{' '}
            <span className="text-base font-semibold text-ink-mut">{t('pickProgress')}</span>
          </div>
          <div className="h-2.5 min-w-32 flex-1 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-ok transition-all"
              style={{ width: `${totalItems ? (pickedItems / totalItems) * 100 : 0}%` }}
            />
          </div>
          <div className="font-mono text-sm text-ink-mut">
            {doneOrders}/{result.orders.length} {t('ordersDone')}
          </div>
          <div className="flex gap-2">
            <Btn onClick={() => setHideDone((v) => !v)} tone={hideDone ? 'primary' : 'ghost'}>
              {t('hideDone')}
            </Btn>
            <Btn onClick={() => onPrint('pick')}>{t('printAll')}</Btn>
            <Btn onClick={() => onPrint('slips')}>{t('printSlips')}</Btn>
            <Btn tone="danger" onClick={() => clear(result.hash)}>
              {t('resetProgress')}
            </Btn>
          </div>
        </div>
      </div>

      <p className="eyebrow mb-4">↓ {t('slipOrder')}</p>

      <div className="space-y-5">
        {result.orders.map((order) => (
          <OrderCard
            key={order.index}
            order={order}
            pack={packs[order.index]}
            hash={result.hash}
            forHash={forHash}
            hideDone={hideDone}
            onPrint={() => onPrint('slips', order.index)}
          />
        ))}
      </div>
    </div>
  )
}

function OrderCard({
  order,
  pack,
  hash,
  forHash,
  hideDone,
  onPrint,
}: {
  order: ParsedOrder
  pack: PackResult | undefined
  hash: string
  forHash: Record<string, boolean>
  hideDone: boolean
  onPrint: () => void
}) {
  const t = useT()
  const { toggle, setMany } = useProgress()
  const keys = order.items.map((it, i) => `${order.index}:${it.orderId}:${i}`)
  const done = keys.length > 0 && keys.every((k) => forHash[k])
  if (hideDone && done) return null

  const groups = groupItems(order.items)
  const itemCount = order.items.reduce((s, it) => s + it.qty, 0)
  // map each item back to its progress key
  const keyOf = new Map(order.items.map((it, i) => [it, keys[i]]))

  const boxBadge = !pack ? null : pack.box ? (
    <BoxBadge name={pack.box.name} tone="ok" />
  ) : pack.failReason === 'no-dimensions' ? (
    <BoxBadge name={t('boxMissingDims')} tone="pending" />
  ) : (
    <BoxBadge name={t('boxNone')} tone="fail" />
  )

  return (
    <article
      className={`relative overflow-hidden rounded-lg border-2 bg-surface shadow-sm transition ${
        done ? 'border-ok/50' : 'border-line'
      }`}
    >
      {done && <div className="tape-stripe">packed</div>}
      <div className="flex items-stretch">
        {/* slip number matches shipping-label print order */}
        <div className="flex w-16 flex-none flex-col items-center justify-center border-r-2 border-dashed border-line bg-surface-dim py-3 sm:w-20">
          <span className="eyebrow">#</span>
          <span className="font-display text-4xl font-bold sm:text-5xl">{order.index + 1}</span>
        </div>

        <div className={`flex-1 p-4 ${done ? 'opacity-50' : ''}`}>
          <header className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="font-display text-2xl font-bold">{order.buyerName}</h3>
            <span className="font-mono text-sm text-ink-mut">@{order.buyerUsername}</span>
            <ServiceBadge service={order.service} />
            {boxBadge}
            <span className="font-mono text-sm text-ink-mut">
              {itemCount} {t('itemsWord')} · {order.weightOz} oz
            </span>
            <span className="ml-auto flex gap-2">
              <Btn onClick={() => setMany(hash, keys, !done)}>
                {done ? t('uncheckAll') : t('checkAll')}
              </Btn>
              <Btn onClick={onPrint}>{t('printThis')}</Btn>
            </span>
          </header>

          <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {groups.map((g) => (
              <li key={g.product + g.color} className="py-1">
                <div className="mb-1 flex items-baseline gap-2">
                  <span className="font-semibold">
                    {g.product}
                    {g.color && <span className="text-ink-mut"> ({g.color})</span>}
                  </span>
                  <span className="rounded-sm bg-ink px-1.5 font-mono text-sm font-semibold text-surface">
                    ×{g.items.reduce((s, it) => s + it.qty, 0)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.items.map((it) => {
                    const k = keyOf.get(it)!
                    return (
                      <label
                        key={k}
                        className={`flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 select-none ${
                          forHash[k] ? 'border-ok/40 bg-surface-dim' : 'border-line'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="pick-check"
                          checked={!!forHash[k]}
                          onChange={() => toggle(hash, k)}
                        />
                        <span
                          className={`font-mono text-sm ${forHash[k] ? 'text-ink-mut line-through' : ''}`}
                        >
                          {it.tagNum ? `#${it.tagNum}` : it.rawName.slice(0, 14)}
                          {it.qty > 1 ? ` ×${it.qty}` : ''}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  )
}
