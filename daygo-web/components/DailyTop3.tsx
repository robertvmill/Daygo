'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ListOrdered } from 'lucide-react'
import { dailyTop3Service, type DailyTop3Item } from '@/lib/services/dailyTop3'

interface DailyTop3Props {
  userId?: string
  selectedDate: Date
}

const SAVE_DEBOUNCE_MS = 1000
const DEFAULT_ITEMS: DailyTop3Item[] = [{ text: '' }, { text: '' }, { text: '' }]
const PLACEHOLDERS = ['Priority 1...', 'Priority 2...', 'Priority 3...']

function formatDateKey(date: Date) {
  return date.toISOString().split('T')[0]
}

export function DailyTop3({ userId, selectedDate }: DailyTop3Props) {
  const dateKey = formatDateKey(selectedDate)
  const [items, setItems] = useState<DailyTop3Item[]>(DEFAULT_ITEMS)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasLoadedRef = useRef(false)

  // Load from database
  useEffect(() => {
    hasLoadedRef.current = false
    let cancelled = false

    async function load() {
      if (!userId) {
        setItems(DEFAULT_ITEMS)
        hasLoadedRef.current = true
        return
      }

      try {
        const dbItems = await dailyTop3Service.getItems(userId, dateKey)
        if (!cancelled) {
          setItems(dbItems.length >= 3 ? dbItems : DEFAULT_ITEMS)
          hasLoadedRef.current = true
        }
      } catch {
        if (!cancelled) {
          setItems(DEFAULT_ITEMS)
          hasLoadedRef.current = true
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [userId, dateKey])

  // Debounced save
  const saveToDb = useCallback((itemsToSave: DailyTop3Item[]) => {
    if (!userId || !hasLoadedRef.current) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      dailyTop3Service.saveItems(userId, dateKey, itemsToSave).catch(() => {})
    }, SAVE_DEBOUNCE_MS)
  }, [userId, dateKey])

  useEffect(() => {
    if (!hasLoadedRef.current) return
    saveToDb(items)
  }, [items, saveToDb])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const handleChange = (index: number, text: string) => {
    setItems((current) => current.map((item, i) => i === index ? { text } : item))
  }

  const filledCount = items.filter((item) => item.text.trim().length > 0).length

  return (
    <section id="section-top3" className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListOrdered className="w-4 h-4 text-slate-400" />
          <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
            Top 3
          </h2>
        </div>
        <span className="text-xs text-slate-400">
          {filledCount}/3
        </span>
      </div>

      <div className="rounded-2xl bg-[linear-gradient(180deg,rgba(255,253,248,0.92),rgba(248,244,235,0.72))] px-4 py-3 space-y-1">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-3 py-1.5">
            <span className="text-xl font-heading font-semibold text-[#c4b8a3] select-none w-6 text-center shrink-0">
              {index + 1}
            </span>
            <input
              type="text"
              value={item.text}
              onChange={(e) => handleChange(index, e.target.value)}
              placeholder={PLACEHOLDERS[index]}
              className="flex-1 bg-transparent border-b border-[#e3d9c9]/60 focus:border-[#c4b8a3] text-[15px] text-[#41382c] placeholder:text-[#c4b8a3]/60 py-1.5 outline-none transition-colors"
            />
          </div>
        ))}
      </div>
    </section>
  )
}
