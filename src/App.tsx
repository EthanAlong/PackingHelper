import { useEffect, useState } from 'react'
import { useT } from './lib/i18n'
import { usePackResults } from './lib/usePack'
import { useCatalog, useSession, useSettings } from './store'
import PrintSheets, { type PrintJob } from './components/PrintSheets'
import ImportPage from './pages/ImportPage'
import PickPage from './pages/PickPage'
import SummaryPage from './pages/SummaryPage'
import CatalogPage from './pages/CatalogPage'
import BoxPlanPage from './pages/BoxPlanPage'

type Tab = 'import' | 'pick' | 'summary' | 'catalog' | 'boxplan'

export default function App() {
  const t = useT()
  const { lang, setLang } = useSettings()
  const result = useSession((s) => s.result)
  const packs = usePackResults()
  const [tab, setTab] = useState<Tab>(result ? 'pick' : 'import')
  const [printJob, setPrintJob] = useState<PrintJob>(null)

  // first visit: seed the toy catalog from the committed defaults.json
  useEffect(() => {
    const { entries, importAll } = useCatalog.getState()
    if (entries.length > 0) return
    fetch(`${import.meta.env.BASE_URL}defaults.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.toys?.length && useCatalog.getState().entries.length === 0) importAll(d.toys)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!printJob) return
    const done = () => setPrintJob(null)
    window.addEventListener('afterprint', done)
    // let the print DOM paint first
    const id = requestAnimationFrame(() => window.print())
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('afterprint', done)
    }
  }, [printJob])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'import', label: t('tabImport') },
    { id: 'pick', label: t('tabPick') },
    { id: 'summary', label: t('tabSummary') },
    { id: 'catalog', label: t('tabCatalog') },
    { id: 'boxplan', label: t('tabBoxPlan') },
  ]

  return (
    <>
      <div id="app-root" className="min-h-screen">
        <header className="border-b-2 border-line bg-surface">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 pt-5 pb-0">
            <div className="mr-auto">
              <h1 className="font-display text-4xl leading-none font-bold tracking-tight uppercase">
                Packing<span className="text-accent">Helper</span>
              </h1>
              <p className="eyebrow mt-0.5">{t('tagline')}</p>
            </div>
            <div
              className="flex overflow-hidden rounded-md border-2 border-line font-display text-sm font-bold"
              role="group"
              aria-label="Language"
            >
              {(['en', 'zh'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`cursor-pointer px-3 py-1.5 tracking-wider uppercase ${
                    lang === l ? 'bg-ink text-surface' : 'bg-surface text-ink-mut hover:text-ink'
                  }`}
                >
                  {l === 'en' ? 'EN' : '中'}
                </button>
              ))}
            </div>
            <nav className="flex w-full gap-1 overflow-x-auto" aria-label="Sections">
              {tabs.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`cursor-pointer rounded-t-md border-2 border-b-0 px-4 py-2.5 font-display text-base font-bold tracking-wider whitespace-nowrap uppercase transition ${
                    tab === id
                      ? 'border-line bg-bg text-ink'
                      : 'border-transparent text-ink-mut hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-8">
          {tab === 'import' && <ImportPage onDone={() => setTab('pick')} />}
          {tab === 'pick' && (
            <PickPage onPrint={(mode, orderIndex) => setPrintJob({ mode, orderIndex })} />
          )}
          {tab === 'summary' && <SummaryPage />}
          {tab === 'catalog' && <CatalogPage />}
          {tab === 'boxplan' && <BoxPlanPage />}
        </main>

        <footer className="mx-auto max-w-5xl px-4 pb-8 text-center">
          <p className="eyebrow">{t('printedWith')}</p>
        </footer>
      </div>

      <div id="print-root">
        {result && <PrintSheets job={printJob} orders={result.orders} packs={packs} />}
      </div>
    </>
  )
}
