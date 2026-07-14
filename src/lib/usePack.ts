import { useMemo } from 'react'
import { packAll } from './packing'
import type { PackResult } from './types'
import { useBoxes, useCatalog, useSession, useSettings } from '../store'

/** pack results for the current session, recomputed when data changes */
export function usePackResults(): PackResult[] {
  const result = useSession((s) => s.result)
  const catalog = useCatalog((s) => s.entries)
  const boxes = useBoxes((s) => s.boxes)
  const fillFactor = useSettings((s) => s.fillFactor)
  return useMemo(() => {
    if (!result) return []
    return packAll(result.orders, catalog, boxes, { fillFactor })
  }, [result, catalog, boxes, fillFactor])
}
