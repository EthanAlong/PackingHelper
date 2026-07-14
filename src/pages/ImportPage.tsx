import { useCallback, useRef, useState } from 'react'
import { parseTextPages } from '../lib/parser'
import { extractPdfPages } from '../lib/pdf-text'
import { useT } from '../lib/i18n'
import { useCatalog, useSession } from '../store'
import { Section, ServiceBadge, Btn } from '../components/ui'

export default function ImportPage({ onDone }: { onDone: () => void }) {
  const t = useT()
  const { result, fileName, setResult } = useSession()
  const ensureProducts = useCatalog((s) => s.ensureProducts)
  const [progress, setProgress] = useState<[number, number] | null>(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (file: File) => {
      setError('')
      setProgress([0, 0])
      try {
        const buf = await file.arrayBuffer()
        const pages = await extractPdfPages(buf, (p, total) => setProgress([p, total]))
        const parsed = parseTextPages(pages)
        if (parsed.orders.length === 0) {
          setError(t('parseFailed'))
        } else {
          setResult(parsed, file.name)
          ensureProducts([...new Set(parsed.orders.flatMap((o) => o.items.map((i) => i.product)))])
        }
      } catch (e) {
        console.error(e)
        setError(t('parseFailed'))
      } finally {
        setProgress(null)
      }
    },
    [setResult, ensureProducts, t],
  )

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files[0]
          if (file) void handleFile(file)
        }}
        className={`mb-10 flex min-h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-3 border-dashed px-6 py-10 text-center transition ${
          dragging ? 'border-accent bg-warn-bg' : 'border-line bg-surface hover:border-ink'
        }`}
      >
        <span className="font-display text-2xl font-bold tracking-wide uppercase">
          {t('dropTitle')}
        </span>
        <span className="text-sm text-ink-mut">{t('dropHint')}</span>
        {progress && (
          <span className="mt-2 font-mono text-sm text-accent">
            {t('parsing')} {progress[0]} {t('parsingOf')} {progress[1]}
          </span>
        )}
        {error && <span className="mt-2 font-mono text-sm text-accent">{error}</span>}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
            e.target.value = ''
          }}
        />
      </div>

      {result && (
        <>
          <Section
            title={fileName || t('currentFile')}
            hint={t('reimportHint')}
            actions={<Btn onClick={() => setResult(null, '')}>{t('clearSession')}</Btn>}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Stat n={result.orders.length} label={t('ordersParsed')} />
              <Stat
                n={result.orders.reduce((s, o) => s + o.items.reduce((x, i) => x + i.qty, 0), 0)}
                label={t('itemsParsed')}
              />
              <Stat n={result.pageCount} label={t('pagesParsed')} />
              <Stat
                n={result.orders.filter((o) => o.service === 'priority').length}
                label={t('priorityOrders')}
              />
              <Stat
                n={result.orders.filter((o) => o.service === 'ground').length}
                label={t('groundOrders')}
              />
            </div>
          </Section>

          <Section title={t('dupTitle').split('—')[0].trim()}>
            {result.duplicateBuyers.length === 0 ? (
              <p className="rounded-lg border-2 border-ok/40 bg-surface px-4 py-3 text-ok">
                {t('noDupes')}
              </p>
            ) : (
              <div className="rounded-lg border-3 border-accent bg-warn-bg p-4">
                <p className="mb-1 font-display text-xl font-bold tracking-wide text-accent uppercase">
                  {t('dupTitle')}
                </p>
                <p className="mb-3 max-w-3xl text-sm">{t('dupBody')}</p>
                <ul className="space-y-2">
                  {result.duplicateBuyers.map((d) => (
                    <li
                      key={d.username}
                      className="flex flex-wrap items-center gap-2 rounded-md bg-surface px-3 py-2"
                    >
                      <span className="font-mono font-semibold">{d.username}</span>
                      {d.orders.map((o) => (
                        <span key={o.index} className="flex items-center gap-1.5 text-sm">
                          <span className="font-mono">
                            #{o.index + 1} ({o.itemCount} {t('itemsWord')})
                          </span>
                          <ServiceBadge service={o.service} />
                        </span>
                      ))}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>

          <Section title={t('warningsTitle')}>
            {result.orders.every((o) => o.warnings.length === 0) &&
            result.globalWarnings.length === 0 ? (
              <p className="rounded-lg border-2 border-ok/40 bg-surface px-4 py-3 text-ok">
                {t('noWarnings')}
              </p>
            ) : (
              <ul className="space-y-1 rounded-lg border-2 border-accent bg-surface p-4 font-mono text-sm">
                {result.globalWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
                {result.orders
                  .filter((o) => o.warnings.length > 0)
                  .map((o) => (
                    <li key={o.index}>
                      #{o.index + 1} {o.buyerUsername}: {o.warnings.join('; ')}
                    </li>
                  ))}
              </ul>
            )}
          </Section>

          <div className="text-center">
            <Btn tone="primary" onClick={onDone}>
              {t('tabPick')} →
            </Btn>
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-lg border-2 border-line bg-surface px-4 py-3">
      <div className="font-display text-4xl font-bold">{n}</div>
      <div className="eyebrow">{label}</div>
    </div>
  )
}
