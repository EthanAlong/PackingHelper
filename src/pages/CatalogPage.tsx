import { useRef } from 'react'
import { useT } from '../lib/i18n'
import { useBoxes, useCatalog, useSession, useSettings, uid } from '../store'
import { Btn, NumCell, Section } from '../components/ui'
import type { BoxType, CatalogEntry } from '../lib/types'

function downloadJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

function JsonImportBtn<T>({ label, onLoad }: { label: string; onLoad: (data: T) => void }) {
  const t = useT()
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <Btn onClick={() => ref.current?.click()}>{label}</Btn>
      <input
        ref={ref}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          try {
            const data = JSON.parse(await file.text()) as T
            if (!Array.isArray(data)) throw new Error('not an array')
            onLoad(data)
          } catch {
            alert(t('importJsonFailed'))
          }
        }}
      />
    </>
  )
}

export default function CatalogPage() {
  const t = useT()
  const catalog = useCatalog()
  const boxes = useBoxes()
  const { fillFactor, setFillFactor } = useSettings()
  const result = useSession((s) => s.result)
  const usedProducts = new Set(
    result?.orders.flatMap((o) => o.items.map((i) => i.product.trim().toLowerCase())) ?? [],
  )

  return (
    <div>
      <Section
        title={t('toyTableTitle')}
        hint={t('toyTableHint')}
        actions={
          <>
            <Btn
              onClick={() =>
                catalog.upsert({
                  id: uid(),
                  product: '',
                  l: 0,
                  w: 0,
                  h: 0,
                  weightOz: 0,
                  costEach: 0,
                  note: '',
                })
              }
            >
              {t('addRow')}
            </Btn>
            <Btn onClick={() => downloadJson('packinghelper-toys.json', catalog.entries)}>
              {t('exportJson')}
            </Btn>
            <JsonImportBtn<CatalogEntry[]>
              label={t('importJson')}
              onLoad={(data) => catalog.importAll(data)}
            />
          </>
        }
      >
        <div className="overflow-x-auto rounded-lg border-2 border-line bg-surface">
          <table className="w-full min-w-130 text-left">
            <thead>
              <tr className="border-b-2 border-line">
                <th className="eyebrow px-2 py-2.5 pl-3">{t('productCol')}</th>
                <th className="eyebrow w-20 px-2 py-2.5">{t('lCol')}</th>
                <th className="eyebrow w-20 px-2 py-2.5">{t('wCol')}</th>
                <th className="eyebrow w-20 px-2 py-2.5">{t('hCol')}</th>
                <th className="eyebrow w-20 px-2 py-2.5">{t('weightCol')}</th>
                <th className="eyebrow w-20 px-2 py-2.5">{t('costEachCol')}</th>
                <th className="eyebrow px-2 py-2.5">{t('noteCol')}</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {catalog.entries.map((e) => {
                const incomplete =
                  usedProducts.has(e.product.trim().toLowerCase()) &&
                  (e.l <= 0 || e.w <= 0 || e.h <= 0)
                return (
                  <tr
                    key={e.id}
                    className={`border-b border-line last:border-0 ${incomplete ? 'bg-warn-bg' : ''}`}
                  >
                    <td className="pl-1">
                      <input
                        className="cell-input font-semibold"
                        value={e.product}
                        onChange={(ev) => catalog.update(e.id, { product: ev.target.value })}
                      />
                    </td>
                    {(['l', 'w', 'h', 'weightOz', 'costEach'] as const).map((k) => (
                      <td key={k}>
                        <NumCell
                          value={e[k] ?? 0}
                          onCommit={(v) => catalog.update(e.id, { [k]: v ?? 0 })}
                        />
                      </td>
                    ))}
                    <td>
                      <input
                        className="cell-input text-sm text-ink-mut"
                        value={e.note}
                        onChange={(ev) => catalog.update(e.id, { note: ev.target.value })}
                      />
                    </td>
                    <td className="pr-2 text-right">
                      <button
                        type="button"
                        onClick={() => catalog.remove(e.id)}
                        className="cursor-pointer rounded px-2 py-1 text-ink-mut hover:text-accent"
                        aria-label={t('deleteRow')}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title={t('boxTableTitle')}
        hint={t('boxTableHint')}
        actions={
          <>
            <Btn onClick={boxes.add}>{t('addRow')}</Btn>
            <Btn onClick={() => downloadJson('packinghelper-boxes.json', boxes.boxes)}>
              {t('exportJson')}
            </Btn>
            <JsonImportBtn<BoxType[]> label={t('importJson')} onLoad={(d) => boxes.importAll(d)} />
            <Btn tone="danger" onClick={boxes.resetDefaults}>
              {t('resetDefaults')}
            </Btn>
          </>
        }
      >
        <div className="overflow-x-auto rounded-lg border-2 border-line bg-surface">
          <table className="w-full min-w-130 text-left">
            <thead>
              <tr className="border-b-2 border-line">
                <th className="eyebrow px-2 py-2.5 pl-3">{t('nameCol')}</th>
                <th className="eyebrow w-20 px-2 py-2.5">{t('lCol')}</th>
                <th className="eyebrow w-20 px-2 py-2.5">{t('wCol')}</th>
                <th className="eyebrow w-20 px-2 py-2.5">{t('hCol')}</th>
                <th className="eyebrow w-24 px-2 py-2.5">{t('maxWtCol')}</th>
                <th className="eyebrow w-24 px-2 py-2.5 text-center">{t('priorityOnlyCol')}</th>
                <th className="eyebrow w-14 px-2 py-2.5 text-center">{t('enabledCol')}</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {boxes.boxes.map((b) => (
                <tr
                  key={b.id}
                  className={`border-b border-line last:border-0 ${b.enabled ? '' : 'opacity-40'}`}
                >
                  <td className="pl-1">
                    <input
                      className="cell-input font-semibold"
                      value={b.name}
                      onChange={(ev) => boxes.update(b.id, { name: ev.target.value })}
                    />
                  </td>
                  {(['l', 'w', 'h'] as const).map((k) => (
                    <td key={k}>
                      <NumCell
                        value={b[k]}
                        onCommit={(v) => boxes.update(b.id, { [k]: v ?? 0 })}
                      />
                    </td>
                  ))}
                  <td>
                    <NumCell
                      value={b.maxWeightOz}
                      nullable
                      onCommit={(v) => boxes.update(b.id, { maxWeightOz: v })}
                    />
                  </td>
                  <td className="text-center">
                    <input
                      type="checkbox"
                      className="pick-check"
                      checked={b.priorityOnly}
                      onChange={(ev) => boxes.update(b.id, { priorityOnly: ev.target.checked })}
                    />
                  </td>
                  <td className="text-center">
                    <input
                      type="checkbox"
                      className="pick-check"
                      checked={b.enabled}
                      onChange={(ev) => boxes.update(b.id, { enabled: ev.target.checked })}
                    />
                  </td>
                  <td className="pr-2 text-right">
                    <button
                      type="button"
                      onClick={() => boxes.remove(b.id)}
                      className="cursor-pointer rounded px-2 py-1 text-ink-mut hover:text-accent"
                      aria-label={t('deleteRow')}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title={t('fillFactor')} hint={t('fillFactorHint')}>
        <div className="flex max-w-md items-center gap-4 rounded-lg border-2 border-line bg-surface px-4 py-3">
          <input
            type="range"
            min={0.4}
            max={1.2}
            step={0.05}
            value={fillFactor}
            onChange={(e) => setFillFactor(parseFloat(e.target.value))}
            className="flex-1 accent-(--c-accent)"
          />
          <span className="font-display text-3xl font-bold">{Math.round(fillFactor * 100)}%</span>
        </div>
      </Section>
      <p className="eyebrow">
        {t('autoSaved')} — {t('exportJson')} / {t('importJson')} ⇄
      </p>
    </div>
  )
}
