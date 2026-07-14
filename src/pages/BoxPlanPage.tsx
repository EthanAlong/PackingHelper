import { boxSummary } from '../lib/packing'
import { useT } from '../lib/i18n'
import { usePackResults } from '../lib/usePack'
import { useSession } from '../store'
import { BoxBadge, Section, ServiceBadge } from '../components/ui'
import type { PackFailReason } from '../lib/types'

export default function BoxPlanPage() {
  const t = useT()
  const result = useSession((s) => s.result)
  const packs = usePackResults()
  if (!result) return <p className="py-20 text-center text-ink-mut">{t('pickEmpty')}</p>

  const summary = boxSummary(packs)
  const failed = packs.filter((p) => !p.box)
  const reasonLabel: Record<PackFailReason, string> = {
    oversize: t('reasonOversize'),
    'no-dimensions': t('reasonNoDims'),
    'no-box-for-service': t('reasonNoBox'),
  }

  return (
    <div>
      <Section title={t('boxPlanTitle')} hint={t('boxPlanHint')}>
        <div className="flex flex-wrap gap-3">
          {summary.list.map(({ box, count }) => (
            <div
              key={box.id}
              className="flex min-w-36 flex-col items-center rounded-lg border-2 border-ink bg-surface px-6 py-4"
            >
              <span className="font-display text-6xl font-bold">{count}</span>
              <span className="mt-1 font-mono text-sm font-semibold">{box.name}</span>
              <span className="font-mono text-xs text-ink-mut">
                {box.l}×{box.w}×{box.h}
              </span>
            </div>
          ))}
          <div className="flex min-w-36 flex-col items-center justify-center rounded-lg border-2 border-dashed border-line px-6 py-4 text-ink-mut">
            <span className="font-display text-3xl font-bold">
              {packs.length - summary.failed}
            </span>
            <span className="text-sm">{t('boxesTotal')}</span>
          </div>
        </div>
      </Section>

      {failed.length > 0 && (
        <Section title={t('needAttention')}>
          <div className="rounded-lg border-3 border-accent bg-warn-bg p-4">
            <ul className="space-y-1.5">
              {failed.map((p) => {
                const order = result.orders[p.orderIndex]
                return (
                  <li key={p.orderIndex} className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-xl font-bold">#{p.orderIndex + 1}</span>
                    <span className="font-semibold">{order.buyerName}</span>
                    <ServiceBadge service={order.service} />
                    <span className="text-sm text-accent">
                      {reasonLabel[p.failReason ?? 'oversize']}
                    </span>
                    {p.failReason === 'no-dimensions' && (
                      <span className="font-mono text-xs text-ink-mut">
                        [{p.missingProducts.join(', ')}] — {t('fixInCatalog')}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </Section>
      )}

      <Section title="Manifest">
        <div className="overflow-x-auto rounded-lg border-2 border-line bg-surface">
          <table className="w-full min-w-120 text-left">
            <thead>
              <tr className="border-b-2 border-line">
                <th className="eyebrow px-3 py-2.5">{t('slipCol')}</th>
                <th className="eyebrow px-3 py-2.5">{t('buyerCol')}</th>
                <th className="eyebrow px-3 py-2.5">{t('serviceCol')}</th>
                <th className="eyebrow px-3 py-2.5">{t('qtyCol')}</th>
                <th className="eyebrow px-3 py-2.5">{t('weightColShort')}</th>
                <th className="eyebrow px-3 py-2.5">{t('boxCol')}</th>
                <th className="eyebrow px-3 py-2.5 text-right">{t('fillCol')}</th>
              </tr>
            </thead>
            <tbody>
              {packs.map((p) => {
                const o = result.orders[p.orderIndex]
                return (
                  <tr
                    key={p.orderIndex}
                    className={`border-b border-line last:border-0 ${p.box ? '' : 'bg-warn-bg'}`}
                  >
                    <td className="px-3 py-2 font-display text-xl font-bold">
                      #{p.orderIndex + 1}
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-semibold">{o.buyerName}</span>{' '}
                      <span className="font-mono text-xs text-ink-mut">@{o.buyerUsername}</span>
                    </td>
                    <td className="px-3 py-2">
                      <ServiceBadge service={o.service} />
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {o.items.reduce((s, it) => s + it.qty, 0)}
                    </td>
                    <td className="px-3 py-2 font-mono text-sm">{o.weightOz} oz</td>
                    <td className="px-3 py-2">
                      {p.box ? (
                        <BoxBadge name={p.box.name} tone="ok" />
                      ) : p.failReason === 'no-dimensions' ? (
                        <BoxBadge name={t('boxMissingDims')} tone="pending" />
                      ) : (
                        <BoxBadge name={t('boxNone')} tone="fail" />
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-sm text-ink-mut">
                      {p.box ? `${Math.round(p.fillRatio * 100)}%` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}
