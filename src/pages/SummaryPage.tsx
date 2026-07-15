import { skuTotals } from '../lib/parser'
import { findCatalogEntry } from '../lib/packing'
import { useT } from '../lib/i18n'
import { useCatalog, useProgress, useSession, uid } from '../store'
import { NumCell, Section } from '../components/ui'

const usd = (n: number) => `$${n.toFixed(2)}`

export default function SummaryPage() {
  const t = useT()
  const result = useSession((s) => s.result)
  const { checked, toggle } = useProgress()
  const catalog = useCatalog()
  if (!result) return <p className="py-20 text-center text-ink-mut">{t('pickEmpty')}</p>

  const totals = skuTotals(result.orders)
  const forHash = checked[result.hash] ?? {}

  const costOf = (product: string) => findCatalogEntry(catalog.entries, product)?.costEach ?? 0
  const setCost = (product: string, v: number | null) => {
    const entry = findCatalogEntry(catalog.entries, product)
    if (entry) catalog.update(entry.id, { costEach: v ?? 0 })
    else
      catalog.upsert({ id: uid(), product, l: 0, w: 0, h: 0, weightOz: 0, costEach: v ?? 0, note: '' })
  }

  const grand = totals.reduce(
    (g, row) => {
      const cost = costOf(row.product) * row.count
      return { revenue: g.revenue + row.revenue, cost: g.cost + cost }
    },
    { revenue: 0, cost: 0 },
  )

  return (
    <Section title={t('summaryTitle')} hint={`${t('summaryHint')} ${t('costHint')}`}>
      <div className="mb-4 grid grid-cols-3 gap-3 sm:max-w-xl">
        <Tile label={t('revenueCol')} value={usd(grand.revenue)} />
        <Tile label={t('costTotalCol')} value={usd(grand.cost)} />
        <Tile label={t('profitCol')} value={usd(grand.revenue - grand.cost)} accent />
      </div>

      <div className="overflow-x-auto rounded-lg border-2 border-line bg-surface">
        <table className="w-full min-w-140 text-left">
          <thead>
            <tr className="border-b-2 border-line">
              <th className="eyebrow w-10 px-3 py-2.5"> </th>
              <th className="eyebrow px-3 py-2.5">{t('skuCol')}</th>
              <th className="eyebrow px-3 py-2.5">{t('colorCol')}</th>
              <th className="eyebrow px-3 py-2.5 text-right">{t('qtyCol')}</th>
              <th className="eyebrow w-24 px-3 py-2.5 text-right">{t('costEachCol')}</th>
              <th className="eyebrow px-3 py-2.5 text-right">{t('revenueCol')}</th>
              <th className="eyebrow px-3 py-2.5 text-right">{t('costTotalCol')}</th>
              <th className="eyebrow px-3 py-2.5 text-right">{t('profitCol')}</th>
            </tr>
          </thead>
          <tbody>
            {totals.map((row) => {
              const key = `sku:${row.product}:${row.color}`
              const isChecked = !!forHash[key]
              const costEach = costOf(row.product)
              const cost = costEach * row.count
              const profit = row.revenue - cost
              return (
                <tr
                  key={key}
                  className={`border-b border-line last:border-0 ${isChecked ? 'opacity-45' : ''}`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      className="pick-check"
                      checked={isChecked}
                      onChange={() => toggle(result.hash, key)}
                      aria-label={`${row.product} ${row.color}`}
                    />
                  </td>
                  <td className={`px-3 py-2 font-semibold ${isChecked ? 'line-through' : ''}`}>
                    {row.product}
                  </td>
                  <td className="px-3 py-2 text-ink-mut">{row.color || '—'}</td>
                  <td className="px-3 py-2 text-right font-display text-2xl font-bold">
                    {row.count}
                  </td>
                  <td className="px-1 py-1">
                    <NumCell
                      value={costEach}
                      onCommit={(v) => setCost(row.product, v)}
                      className="cell-input text-right font-mono"
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{usd(row.revenue)}</td>
                  <td className="px-3 py-2 text-right font-mono text-ink-mut">{usd(cost)}</td>
                  <td
                    className={`px-3 py-2 text-right font-mono font-semibold ${profit < 0 ? 'text-accent' : ''}`}
                  >
                    {usd(profit)}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-ink">
              <td colSpan={3} className="px-3 py-2.5 font-display text-lg font-bold uppercase">
                {t('grandTotal')}
              </td>
              <td className="px-3 py-2.5 text-right font-display text-2xl font-bold">
                {totals.reduce((s, r) => s + r.count, 0)}
              </td>
              <td />
              <td className="px-3 py-2.5 text-right font-mono font-semibold">
                {usd(grand.revenue)}
              </td>
              <td className="px-3 py-2.5 text-right font-mono font-semibold text-ink-mut">
                {usd(grand.cost)}
              </td>
              <td
                className={`px-3 py-2.5 text-right font-mono font-bold ${grand.revenue - grand.cost < 0 ? 'text-accent' : ''}`}
              >
                {usd(grand.revenue - grand.cost)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="eyebrow mt-3">{t('autoSaved')}</p>
    </Section>
  )
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-lg border-2 bg-surface px-4 py-3 ${accent ? 'border-ink' : 'border-line'}`}
    >
      <div className="font-display text-3xl font-bold">{value}</div>
      <div className="eyebrow">{label}</div>
    </div>
  )
}
