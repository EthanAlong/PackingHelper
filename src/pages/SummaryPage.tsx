import { skuTotals } from '../lib/parser'
import { useT } from '../lib/i18n'
import { useProgress, useSession } from '../store'
import { Section } from '../components/ui'

export default function SummaryPage() {
  const t = useT()
  const result = useSession((s) => s.result)
  const { checked, toggle } = useProgress()
  if (!result) return <p className="py-20 text-center text-ink-mut">{t('pickEmpty')}</p>

  const totals = skuTotals(result.orders)
  const forHash = checked[result.hash] ?? {}

  return (
    <Section title={t('summaryTitle')} hint={t('summaryHint')}>
      <div className="overflow-x-auto rounded-lg border-2 border-line bg-surface">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b-2 border-line">
              <th className="eyebrow w-10 px-3 py-2.5"> </th>
              <th className="eyebrow px-3 py-2.5">{t('skuCol')}</th>
              <th className="eyebrow px-3 py-2.5">{t('colorCol')}</th>
              <th className="eyebrow px-3 py-2.5 text-right">{t('qtyCol')}</th>
              <th className="eyebrow px-3 py-2.5 text-right">{t('inOrdersCol')}</th>
            </tr>
          </thead>
          <tbody>
            {totals.map((row) => {
              const key = `sku:${row.product}:${row.color}`
              const isChecked = !!forHash[key]
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
                  <td className="px-3 py-2 text-right font-mono text-sm text-ink-mut">
                    {row.orderCount}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Section>
  )
}
