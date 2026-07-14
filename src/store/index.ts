import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BoxType, CatalogEntry, ParseResult } from '../lib/types'

export type Lang = 'en' | 'zh'

let idCounter = 0
export const uid = () => `${Date.now().toString(36)}-${(idCounter++).toString(36)}`

// --- default box library ---------------------------------------------------
export const DEFAULT_BOXES: BoxType[] = [
  { id: 'box-444', name: '4×4×4', l: 4, w: 4, h: 4, maxWeightOz: null, priorityOnly: false, enabled: true },
  { id: 'box-844', name: '8×4×4', l: 8, w: 4, h: 4, maxWeightOz: null, priorityOnly: false, enabled: true },
  { id: 'box-884', name: '8×8×4', l: 8, w: 8, h: 4, maxWeightOz: null, priorityOnly: false, enabled: true },
  { id: 'box-usps-md', name: 'USPS Medium Flat Rate', l: 11, w: 8.5, h: 5.5, maxWeightOz: null, priorityOnly: true, enabled: true },
  { id: 'box-usps-lg', name: 'USPS Large Flat Rate', l: 12, w: 12, h: 5.5, maxWeightOz: null, priorityOnly: true, enabled: true },
]

// --- settings / language ----------------------------------------------------
interface SettingsState {
  lang: Lang
  fillFactor: number
  setLang: (l: Lang) => void
  setFillFactor: (f: number) => void
}
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      lang: 'en',
      fillFactor: 0.85,
      setLang: (lang) => set({ lang }),
      setFillFactor: (fillFactor) => set({ fillFactor }),
    }),
    { name: 'ph-settings' },
  ),
)

// --- toy catalog -------------------------------------------------------------
interface CatalogState {
  entries: CatalogEntry[]
  upsert: (e: CatalogEntry) => void
  update: (id: string, patch: Partial<CatalogEntry>) => void
  remove: (id: string) => void
  /** add empty rows for products seen in a parse but missing from the catalog */
  ensureProducts: (products: string[]) => void
  importAll: (entries: CatalogEntry[]) => void
}
export const useCatalog = create<CatalogState>()(
  persist(
    (set) => ({
      entries: [],
      upsert: (e) =>
        set((s) => ({
          entries: s.entries.some((x) => x.id === e.id)
            ? s.entries.map((x) => (x.id === e.id ? e : x))
            : [...s.entries, e],
        })),
      update: (id, patch) =>
        set((s) => ({
          entries: s.entries.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      remove: (id) => set((s) => ({ entries: s.entries.filter((x) => x.id !== id) })),
      ensureProducts: (products) =>
        set((s) => {
          const known = new Set(s.entries.map((e) => e.product.trim().toLowerCase()))
          const added = products
            .filter((p) => !known.has(p.trim().toLowerCase()))
            .map((product) => ({ id: uid(), product, l: 0, w: 0, h: 0, weightOz: 0, note: '' }))
          return added.length ? { entries: [...s.entries, ...added] } : s
        }),
      importAll: (entries) => set({ entries }),
    }),
    { name: 'ph-catalog' },
  ),
)

// --- box library --------------------------------------------------------------
interface BoxesState {
  boxes: BoxType[]
  update: (id: string, patch: Partial<BoxType>) => void
  add: () => void
  remove: (id: string) => void
  importAll: (boxes: BoxType[]) => void
  resetDefaults: () => void
}
export const useBoxes = create<BoxesState>()(
  persist(
    (set) => ({
      boxes: DEFAULT_BOXES,
      update: (id, patch) =>
        set((s) => ({ boxes: s.boxes.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),
      add: () =>
        set((s) => ({
          boxes: [
            ...s.boxes,
            { id: uid(), name: '', l: 0, w: 0, h: 0, maxWeightOz: null, priorityOnly: false, enabled: true },
          ],
        })),
      remove: (id) => set((s) => ({ boxes: s.boxes.filter((b) => b.id !== id) })),
      importAll: (boxes) => set({ boxes }),
      resetDefaults: () => set({ boxes: DEFAULT_BOXES }),
    }),
    { name: 'ph-boxes' },
  ),
)

// --- current parse session -----------------------------------------------------
interface SessionState {
  result: ParseResult | null
  fileName: string
  setResult: (r: ParseResult | null, fileName: string) => void
}
export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      result: null,
      fileName: '',
      setResult: (result, fileName) => set({ result, fileName }),
    }),
    { name: 'ph-session' },
  ),
)

// --- pick progress, keyed by parse hash so re-importing the same PDF resumes ----
interface ProgressState {
  /** checked item keys per parse hash: `${orderIndex}:${orderId}` */
  checked: Record<string, Record<string, boolean>>
  toggle: (hash: string, key: string) => void
  setMany: (hash: string, keys: string[], value: boolean) => void
  clear: (hash: string) => void
}
export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      checked: {},
      toggle: (hash, key) =>
        set((s) => {
          const forHash = { ...(s.checked[hash] ?? {}) }
          if (forHash[key]) delete forHash[key]
          else forHash[key] = true
          return { checked: { ...s.checked, [hash]: forHash } }
        }),
      setMany: (hash, keys, value) =>
        set((s) => {
          const forHash = { ...(s.checked[hash] ?? {}) }
          for (const k of keys) {
            if (value) forHash[k] = true
            else delete forHash[k]
          }
          return { checked: { ...s.checked, [hash]: forHash } }
        }),
      clear: (hash) =>
        set((s) => {
          const next = { ...s.checked }
          delete next[hash]
          return { checked: next }
        }),
    }),
    { name: 'ph-progress' },
  ),
)
