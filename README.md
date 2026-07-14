# PackingHelper 📦

A pick-and-pack workflow tool for [Whatnot](https://www.whatnot.com/) live sellers. Drop in the
packing-slip PDF that Whatnot exports and it turns a chaotic pick list into an assembly line:

**再也不用一边打箱一边拣货。** 上传 Whatnot 导出的 packing slip PDF，先统一打箱，再按重排后的清单一次拣完。

## What it does

- **Slip parsing, fully client-side** — the PDF is parsed in your browser with pdf.js.
  Nothing is uploaded anywhere; customer data never leaves your machine.
- **Duplicate-buyer alert** — Whatnot force-splits one buyer's Priority orders into multiple
  shipments by weight (even though flat-rate boxes have no weight limit). PackingHelper flags
  the same username on multiple slips so you can merge shipments in Whatnot and re-export
  before wasting labels and postage.
- **Re-sorted pick lists** — each order's items are grouped by product + color
  (`gumdrop Orange ×4`, then `gumdrop Blue ×4`, …) instead of auction order. Orders keep the
  PDF's original sequence so they match your printed shipping labels 1:1.
- **Box-fit planning** — an inline-editable toy dimension catalog plus a box library
  (USPS flat-rate + your own 4×4×4 / 8×4×4 / 8×8×4). A 3D bin-packing heuristic
  (first-fit decreasing over extreme points, 6 rotations, tunable fill factor for squishy toys)
  assigns the smallest workable box to every order and prints a batch summary:
  *"tape 23× 4×4×4, 12× 8×4×4, 19× 8×8×4, 4× Medium, 1× Large."*
  Ground orders never get assigned Priority-only flat-rate boxes. Anything that can't be
  packed automatically is flagged red for manual handling.
- **Pick on iPad, print for the bench** — big touch checkboxes with progress that survives
  reloads (keyed per PDF), plus two print layouts: warehouse pick tickets and customer-facing
  packing slips to drop in the box.
- **Bilingual** — one-tap English / 中文 toggle. Light and dark theme follow the system.

## Stack

React 19 + TypeScript + Vite + Tailwind CSS 4, zustand (localStorage persistence),
pdf.js. No backend — the production build is pure static files.

```bash
npm install
npm run dev          # local dev server
npm run build        # static production build in dist/
npm run test:parser  # parser regression against a real slip PDF (not committed)
node scripts/test-packing.mjs   # bin-packing invariants
```

## Cross-device data

The toy/box catalogs live in localStorage. To sync another machine, use **Export JSON /
Import JSON** on the Toys & Boxes tab — or commit your exported catalog to
`public/defaults.json`, which seeds any first-time visitor automatically.

## Privacy

Packing slips contain customer names and addresses. They are parsed in-browser only,
never uploaded, and `*.pdf` is gitignored so real slips can't be committed by accident.
