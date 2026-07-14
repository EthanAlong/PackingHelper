import type { TextPage, TextLine } from './parser'

/**
 * Rebuild visual lines from pdf.js text items: group by rounded y, sort by x.
 * `items` is the `items` array of pdf.js `getTextContent()`.
 */
export function itemsToLines(
  items: { str: string; transform: number[] }[],
): TextPage {
  const byY = new Map<number, TextLine>()
  for (const item of items) {
    if (!item.str || !item.str.trim()) continue
    const y = Math.round(item.transform[5])
    if (!byY.has(y)) byY.set(y, [])
    byY.get(y)!.push({ x: item.transform[4], str: item.str })
  }
  return [...byY.entries()]
    .sort((a, b) => b[0] - a[0]) // top of page first
    .map(([, runs]) => runs.sort((a, b) => a.x - b.x))
}

/** Browser-side: parse an uploaded File into TextPage[] using pdf.js */
export async function extractPdfPages(
  data: ArrayBuffer,
  onProgress?: (page: number, total: number) => void,
): Promise<TextPage[]> {
  const pdfjs = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const doc = await pdfjs.getDocument({ data }).promise
  const pages: TextPage[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    pages.push(itemsToLines(content.items as { str: string; transform: number[] }[]))
    onProgress?.(i, doc.numPages)
  }
  await doc.destroy()
  return pages
}
