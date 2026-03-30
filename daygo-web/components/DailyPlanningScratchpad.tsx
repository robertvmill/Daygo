'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Clock3, Sparkles } from 'lucide-react'
import type { ScheduleEvent } from '@/lib/types/database'
import type { GoogleCalendarDisplayEvent } from '@/components/ScheduleGrid'
import { scratchpadBlocksService, type ScratchpadBlock } from '@/lib/services/scratchpadBlocks'

interface DailyPlanningScratchpadProps {
  selectedDate: Date
  scheduleEvents: ScheduleEvent[]
  googleCalendarEvents?: GoogleCalendarDisplayEvent[]
  wakeTime?: string
  userId?: string
}

const END_HOUR = 22
const DEFAULT_START_HOUR = 6
const SLOT_MINUTES = 30
const SLOT_HEIGHT = 30
const SAVE_DEBOUNCE_MS = 1000

function formatDateKey(date: Date) {
  return date.toISOString().split('T')[0]
}

function timeStringToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function formatSlotLabel(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 || 12
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`
}

function isSameCalendarDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
}

function parseTimeToMinutes(time: string | undefined, fallbackHour: number) {
  if (!time) return fallbackHour * 60
  const [hours, minutes] = time.split(':').map(Number)
  return (hours * 60) + (minutes || 0)
}

function getSlotStart(selectedDate: Date, wakeTime?: string) {
  const wakeMinutes = parseTimeToMinutes(wakeTime, DEFAULT_START_HOUR)
  return wakeMinutes
}

function createBlock(start: number): ScratchpadBlock {
  return {
    id: `block-${start}-${Date.now()}`,
    start,
    end: start + SLOT_MINUTES,
    text: '',
  }
}

function sortBlocks(blocks: ScratchpadBlock[]) {
  return [...blocks].sort((a, b) => a.start - b.start)
}

function getPinnedEventsForSlot(
  slotMinutes: number,
  scheduleEvents: ScheduleEvent[],
  googleCalendarEvents: GoogleCalendarDisplayEvent[]
) {
  const slotEnd = slotMinutes + SLOT_MINUTES

  const daygo = scheduleEvents
    .filter((event) => {
      const start = timeStringToMinutes(event.start_time)
      const end = timeStringToMinutes(event.end_time)
      return start < slotEnd && end > slotMinutes
    })
    .map((event) => ({
      id: `daygo-${event.id}`,
      title: event.title,
      kind: 'daygo' as const,
    }))

  const google = googleCalendarEvents
    .filter((event) => !event.is_all_day)
    .filter((event) => {
      const start = timeStringToMinutes(event.start_time)
      const end = timeStringToMinutes(event.end_time)
      return start < slotEnd && end > slotMinutes
    })
    .map((event) => ({
      id: `google-${event.id}`,
      title: event.title,
      kind: 'google' as const,
    }))

  const seen = new Set<string>()
  return [...daygo, ...google].filter((event) => {
    const key = `${event.kind}-${event.title}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function DailyPlanningScratchpad({
  selectedDate,
  scheduleEvents,
  googleCalendarEvents = [],
  wakeTime,
  userId,
}: DailyPlanningScratchpadProps) {
  const dateKey = formatDateKey(selectedDate)
  const [blocks, setBlocks] = useState<ScratchpadBlock[]>([])
  const [resizingBlockId, setResizingBlockId] = useState<string | null>(null)
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState<number | null>(null)
  const resizeAreaRef = useRef<HTMLDivElement | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasLoadedRef = useRef(false)
  const slotStart = useMemo(() => getSlotStart(selectedDate, wakeTime), [selectedDate, wakeTime])

  const slots = useMemo(() => {
    const end = END_HOUR * 60
    const values: number[] = []
    for (let current = slotStart; current <= end; current += SLOT_MINUTES) {
      values.push(current)
    }
    return values
  }, [slotStart])

  // Load blocks from database (or localStorage fallback)
  useEffect(() => {
    hasLoadedRef.current = false
    let cancelled = false

    async function load() {
      if (userId) {
        try {
          const dbBlocks = await scratchpadBlocksService.getBlocks(userId, dateKey)
          if (!cancelled) {
            setBlocks(dbBlocks.length > 0 ? sortBlocks(dbBlocks) : [])
            hasLoadedRef.current = true

            // Migrate localStorage data if DB is empty but localStorage has data
            const storageKey = `daygo-scratchpad-blocks-${dateKey}`
            if (dbBlocks.length === 0) {
              try {
                const saved = localStorage.getItem(storageKey)
                if (saved) {
                  const localBlocks = JSON.parse(saved) as ScratchpadBlock[]
                  if (localBlocks.length > 0) {
                    setBlocks(sortBlocks(localBlocks))
                    await scratchpadBlocksService.saveBlocks(userId, dateKey, localBlocks)
                    localStorage.removeItem(storageKey)
                  }
                }
              } catch { /* ignore localStorage errors */ }
            } else {
              // DB has data, clean up localStorage
              try { localStorage.removeItem(`daygo-scratchpad-blocks-${dateKey}`) } catch { /* ignore */ }
            }
          }
          return
        } catch {
          // Fall through to localStorage
        }
      }

      // Fallback: localStorage only (no user logged in or DB error)
      if (!cancelled) {
        try {
          const saved = localStorage.getItem(`daygo-scratchpad-blocks-${dateKey}`)
          setBlocks(saved ? sortBlocks(JSON.parse(saved) as ScratchpadBlock[]) : [])
        } catch {
          setBlocks([])
        }
        hasLoadedRef.current = true
      }
    }

    load()
    return () => { cancelled = true }
  }, [userId, dateKey])

  // Debounced save to database whenever blocks change
  const saveToDb = useCallback((blocksToSave: ScratchpadBlock[]) => {
    if (!userId || !hasLoadedRef.current) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      scratchpadBlocksService.saveBlocks(userId, dateKey, blocksToSave).catch(() => {
        // Fallback: save to localStorage if DB save fails
        try {
          localStorage.setItem(`daygo-scratchpad-blocks-${dateKey}`, JSON.stringify(blocksToSave))
        } catch { /* ignore */ }
      })
    }, SAVE_DEBOUNCE_MS)
  }, [userId, dateKey])

  useEffect(() => {
    if (!hasLoadedRef.current) return
    saveToDb(blocks)
    // Also keep localStorage as a backup
    try {
      localStorage.setItem(`daygo-scratchpad-blocks-${dateKey}`, JSON.stringify(blocks))
    } catch { /* ignore */ }
  }, [blocks, saveToDb, dateKey])

  // Cleanup save timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const updateCurrentTime = () => {
      const now = new Date()
      if (!isSameCalendarDay(selectedDate, now)) {
        setCurrentTimeMinutes(null)
        return
      }

      const minutes = (now.getHours() * 60) + now.getMinutes()
      if (minutes < slotStart || minutes > END_HOUR * 60) {
        setCurrentTimeMinutes(null)
        return
      }

      setCurrentTimeMinutes(minutes)
    }

    updateCurrentTime()
    const interval = window.setInterval(updateCurrentTime, 60000)
    return () => window.clearInterval(interval)
  }, [selectedDate, slotStart])

  useEffect(() => {
    if (!resizingBlockId) return

    const handleMouseMove = (event: MouseEvent) => {
      if (!resizeAreaRef.current) return
      const rect = resizeAreaRef.current.getBoundingClientRect()
      const relativeY = Math.max(0, Math.min(event.clientY - rect.top, rect.height))
      const slotIndex = Math.floor(relativeY / SLOT_HEIGHT)
      const hoveredStart = slots[Math.min(slotIndex, slots.length - 1)]

      setBlocks((current) => current.map((block) => {
        if (block.id !== resizingBlockId) return block
        const nextEnd = Math.max(hoveredStart + SLOT_MINUTES, block.start + SLOT_MINUTES)
        return { ...block, end: nextEnd }
      }))
    }

    const handleMouseUp = () => setResizingBlockId(null)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizingBlockId, slots])

  const blockByStart = useMemo(() => {
    const map = new Map<number, ScratchpadBlock>()
    blocks.forEach((block) => map.set(block.start, block))
    return map
  }, [blocks])

  const coveredSlots = useMemo(() => {
    const covered = new Set<number>()
    blocks.forEach((block) => {
      for (let minute = block.start + SLOT_MINUTES; minute < block.end; minute += SLOT_MINUTES) {
        covered.add(minute)
      }
    })
    return covered
  }, [blocks])

  const filledCount = blocks.filter((block) => block.text.trim().length > 0).length
  const currentTimeOffset = currentTimeMinutes === null
    ? null
    : ((currentTimeMinutes - slotStart) / SLOT_MINUTES) * SLOT_HEIGHT

  const handleCreateBlock = (slotMinutes: number) => {
    const existingBlock = blocks.find((block) => slotMinutes >= block.start && slotMinutes < block.end)
    if (existingBlock) return
    setBlocks((current) => sortBlocks([...current, createBlock(slotMinutes)]))
  }

  const handleBlockTextChange = (blockId: string, text: string) => {
    setBlocks((current) => current.map((block) => (
      block.id === blockId ? { ...block, text } : block
    )))
  }

  const handleDeleteBlock = (blockId: string) => {
    setBlocks((current) => current.filter((block) => block.id !== blockId))
  }

  return (
    <section id="section-scratch-pad" className="mb-10">
      <div className="mb-3 flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-slate-400" />
        <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
          Daily Scratch Pad
        </h2>
      </div>

      <div>
        <div className="px-1 py-1">
          <div className="mb-2.5 flex items-start justify-between gap-4">
            <div>
              <p className="text-lg font-heading text-[#3f3a31] tracking-tight">
                Sketch today from now to 10 PM
              </p>
              <p className="mt-0.5 text-sm text-[#7a7163] max-w-xl">
                Pull a block downward to claim more time.
              </p>
            </div>
            <div className="rounded-full border border-[#ddd4c4] bg-white/55 px-2.5 py-0.5 text-xs text-[#7a7163]">
              {filledCount} planned
            </div>
          </div>

          <div
            ref={resizeAreaRef}
            className="relative bg-transparent"
          >
            {currentTimeOffset !== null && (
              <div
                className="pointer-events-none absolute inset-x-[4.75rem] z-20"
                style={{ top: `${currentTimeOffset}px` }}
              >
                <div className="relative">
                  <div className="absolute -left-2.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#d28b6d] shadow-[0_0_0_3px_rgba(255,253,248,0.9)]" />
                  <div className="h-px bg-gradient-to-r from-[#d28b6d]/90 via-[#d28b6d]/45 to-transparent" />
                </div>
              </div>
            )}
            <div className="space-y-0">
              {slots.map((slotMinutes) => {
                if (coveredSlots.has(slotMinutes)) return null

                const block = blockByStart.get(slotMinutes)
                const pinnedEvents = getPinnedEventsForSlot(slotMinutes, scheduleEvents, googleCalendarEvents)
                const blockPinnedEvents = block
                  ? slots
                      .filter((slot) => slot >= block.start && slot < block.end)
                      .flatMap((slot) => getPinnedEventsForSlot(slot, scheduleEvents, googleCalendarEvents))
                      .filter((event, index, array) => array.findIndex((candidate) => candidate.id === event.id) === index)
                  : pinnedEvents

                return (
                  <div
                    key={slotMinutes}
                    className="grid grid-cols-[74px_1fr] gap-2"
                  >
                    <div
                      className="text-right"
                      style={{ height: `${SLOT_HEIGHT}px`, lineHeight: `${SLOT_HEIGHT}px` }}
                    >
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8a7f6d]">
                        {formatSlotLabel(slotMinutes)}
                      </p>
                    </div>

                    {block ? (
                      <div
                        className="relative rounded-[1rem] bg-white/48 px-2.5 py-2 shadow-[0_4px_14px_rgba(120,98,63,0.04)] backdrop-blur-[1px]"
                        style={{ minHeight: `${Math.max(SLOT_HEIGHT * ((block.end - block.start) / SLOT_MINUTES), SLOT_HEIGHT)}px` }}
                      >
                        <div className="pointer-events-none absolute left-0 top-2 bottom-2 w-px bg-[#e3d9c9]" />
                        <textarea
                          value={block.text}
                          onChange={(e) => handleBlockTextChange(block.id, e.target.value)}
                          placeholder=""
                          className="w-full resize-none bg-transparent pl-3 pr-8 text-[15px] leading-6 text-[#41382c] placeholder:text-[#aea493] focus:outline-none"
                          style={{ minHeight: `${Math.max(28, SLOT_HEIGHT * ((block.end - block.start) / SLOT_MINUTES) - 22)}px` }}
                        />

                        {blockPinnedEvents.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1.5 pl-3 pr-6">
                            {blockPinnedEvents.map((event) => (
                              <span
                                key={event.id}
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${
                                  event.kind === 'google'
                                    ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                <Clock3 className="w-2.5 h-2.5" />
                                {event.title}
                              </span>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={() => handleDeleteBlock(block.id)}
                          className="absolute right-2 top-2 text-[#b19c7c] hover:text-[#8c7552] text-xs"
                          aria-label="Delete block"
                        >
                          x
                        </button>

                        <div
                          onMouseDown={() => setResizingBlockId(block.id)}
                          className="absolute inset-x-2 bottom-0 h-7 cursor-row-resize"
                          aria-label="Resize block"
                          role="presentation"
                        >
                          <div className="pointer-events-none absolute inset-x-4 bottom-2 h-px bg-gradient-to-r from-transparent via-[#dacdb7] to-transparent opacity-80" />
                          <div className="pointer-events-none absolute inset-x-10 bottom-[7px] h-[4px] rounded-full bg-[#efe6d6]/55" />
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleCreateBlock(slotMinutes)}
                        className="relative rounded-[0.85rem] border border-transparent bg-transparent px-2 py-0 text-left transition-colors hover:bg-white/20"
                        style={{ minHeight: `${SLOT_HEIGHT}px` }}
                      >
                        <div className="pointer-events-none absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-[#ebe2d4]/42" />
                        <div className="pointer-events-none absolute left-0 top-[7px] bottom-[7px] w-px bg-[#e3d9c9]/70" />

                        {pinnedEvents.length > 0 && (
                          <div className="relative z-10 flex h-full flex-wrap items-center gap-1.5 pl-3">
                            {pinnedEvents.map((event) => (
                              <span
                                key={event.id}
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${
                                  event.kind === 'google'
                                    ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                <Clock3 className="w-2.5 h-2.5" />
                                {event.title}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-3 flex items-start gap-2 text-xs text-[#8a7f6d]">
            <Sparkles className="w-3.5 h-3.5 mt-0.5" />
            <p>
              Tap any line to start writing, then drag the lower edge to stretch or shrink the time.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
