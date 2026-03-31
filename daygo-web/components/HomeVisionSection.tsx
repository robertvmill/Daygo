'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Flame, ChevronDown, Check, X, Plus, Pencil, Trash2, CalendarClock, Target, TrendingUp } from 'lucide-react'
import {
  homeVisionsService,
  type HomeVisionPillar,
  type HomeVisionMetricKind,
  type PillarItem,
  normalizePillarItems,
} from '@/lib/services/homeVisions'
import confetti from 'canvas-confetti'

const PILLAR_COLORS = {
  emerald: {
    border: 'border-slate-200/70 dark:border-slate-600/30',
    hoverBg: 'hover:bg-slate-50/80 dark:hover:bg-slate-800/30',
    gradient: 'from-slate-400 via-slate-500 to-slate-600',
    tint: 'from-slate-50 via-[#fafaf7] to-slate-100/60 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80',
    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    soft: 'bg-slate-50/80 dark:bg-slate-800/50',
    label: 'text-slate-500 dark:text-slate-400',
    accentText: 'text-slate-600 dark:text-slate-300',
    checkHover: 'group-hover:border-slate-400',
    checked: 'bg-slate-500 border-slate-500',
    progress: 'from-slate-500 to-slate-700',
  },
  sky: {
    border: 'border-slate-200/70 dark:border-slate-600/30',
    hoverBg: 'hover:bg-blue-50/60 dark:hover:bg-blue-950/20',
    gradient: 'from-slate-400 via-blue-400 to-cyan-400',
    tint: 'from-blue-50 via-[#fafaf7] to-cyan-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/40',
    badge: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300',
    soft: 'bg-blue-50/70 dark:bg-blue-950/20',
    label: 'text-blue-500/80 dark:text-blue-300/80',
    accentText: 'text-blue-700 dark:text-blue-300',
    checkHover: 'group-hover:border-blue-400',
    checked: 'bg-blue-500 border-blue-500',
    progress: 'from-blue-500 to-cyan-500',
  },
  purple: {
    border: 'border-slate-200/70 dark:border-slate-600/30',
    hoverBg: 'hover:bg-violet-50/60 dark:hover:bg-violet-950/20',
    gradient: 'from-slate-400 via-violet-400 to-fuchsia-400',
    tint: 'from-violet-50 via-[#fafaf7] to-fuchsia-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-violet-950/30',
    badge: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300',
    soft: 'bg-violet-50/70 dark:bg-violet-950/20',
    label: 'text-violet-500/80 dark:text-violet-300/80',
    accentText: 'text-violet-700 dark:text-violet-300',
    checkHover: 'group-hover:border-violet-400',
    checked: 'bg-violet-500 border-violet-500',
    progress: 'from-violet-500 to-fuchsia-500',
  },
  amber: {
    border: 'border-slate-200/70 dark:border-slate-600/30',
    hoverBg: 'hover:bg-amber-50/60 dark:hover:bg-amber-950/20',
    gradient: 'from-slate-400 via-amber-400 to-orange-400',
    tint: 'from-amber-50 via-[#fafaf7] to-orange-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/30',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    soft: 'bg-amber-50/70 dark:bg-amber-950/20',
    label: 'text-amber-600/80 dark:text-amber-300/80',
    accentText: 'text-amber-700 dark:text-amber-300',
    checkHover: 'group-hover:border-amber-400',
    checked: 'bg-amber-500 border-amber-500',
    progress: 'from-amber-500 to-orange-500',
  },
  rose: {
    border: 'border-slate-200/70 dark:border-slate-600/30',
    hoverBg: 'hover:bg-rose-50/60 dark:hover:bg-rose-950/20',
    gradient: 'from-slate-400 via-rose-400 to-pink-400',
    tint: 'from-rose-50 via-[#fafaf7] to-pink-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-rose-950/30',
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    soft: 'bg-rose-50/70 dark:bg-rose-950/20',
    label: 'text-rose-500/80 dark:text-rose-300/80',
    accentText: 'text-rose-700 dark:text-rose-300',
    checkHover: 'group-hover:border-rose-400',
    checked: 'bg-rose-500 border-rose-500',
    progress: 'from-rose-500 to-pink-500',
  },
} as const

const COLOR_OPTIONS: { value: HomeVisionPillar['color']; label: string }[] = [
  { value: 'emerald', label: 'Green' },
  { value: 'sky', label: 'Blue' },
  { value: 'purple', label: 'Purple' },
  { value: 'amber', label: 'Amber' },
  { value: 'rose', label: 'Rose' },
]

const METRIC_OPTIONS: { value: HomeVisionMetricKind; label: string }[] = [
  { value: 'currency_millions', label: 'ARR ($M)' },
  { value: 'count', label: 'Count' },
  { value: 'time_seconds', label: 'Time (seconds)' },
]

interface HomeVisionSectionProps {
  userId: string
  selectedDate: Date
}

type EditableHomeVision = {
  title: string
  subtitle: string
  pillars: HomeVisionPillar[]
}

type NormalizedHomeVisionPillar = HomeVisionPillar & {
  items: PillarItem[]
  current_value: number | null
  target_value: number | null
  metric_kind: HomeVisionMetricKind | null
  current_label: string | null
  target_label: string | null
  baseline_date: string | null
  target_date: string | null
}

function formatDate(d: Date) {
  return d.toISOString().split('T')[0]
}

function getYearEndDate(date: Date) {
  return `${date.getFullYear()}-12-31`
}

function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function formatCompactDate(value?: string | null) {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatMetricValue(value: number | null | undefined, kind: HomeVisionMetricKind | null | undefined) {
  if (value === null || value === undefined || !kind) return 'Set metric'

  if (kind === 'currency_millions') {
    return `$${value.toFixed(value >= 10 ? 0 : 1)}M`
  }

  if (kind === 'count') {
    return new Intl.NumberFormat('en-US').format(Math.round(value))
  }

  const totalSeconds = Math.max(0, Math.round(value))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function formatGapValue(pillar: NormalizedHomeVisionPillar) {
  const { current_value, target_value, metric_kind } = pillar

  if (current_value === null || target_value === null || !metric_kind) {
    return 'Define the gap'
  }

  if (metric_kind === 'time_seconds') {
    const gap = Math.max(0, current_value - target_value)
    return gap > 0 ? `${formatMetricValue(gap, metric_kind)} faster` : 'At target'
  }

  const gap = Math.max(0, target_value - current_value)
  if (metric_kind === 'currency_millions') return `${formatMetricValue(gap, metric_kind)} to close`
  return `${formatMetricValue(gap, metric_kind)} to add`
}

function getProgressPercent(pillar: NormalizedHomeVisionPillar) {
  const { current_value, target_value, metric_kind } = pillar

  if (current_value === null || target_value === null || !metric_kind || target_value <= 0 || current_value < 0) {
    return null
  }

  const rawPercent = metric_kind === 'time_seconds'
    ? (target_value / current_value) * 100
    : (current_value / target_value) * 100

  return Math.max(6, Math.min(100, rawPercent))
}

function getRateToGoalText(pillar: NormalizedHomeVisionPillar, selectedDate: Date) {
  const { current_value, target_value, metric_kind, target_date } = pillar
  if (current_value === null || target_value === null || !metric_kind || !target_date) return null

  const end = new Date(`${target_date}T00:00:00`)
  if (Number.isNaN(end.getTime())) return null

  const msRemaining = end.getTime() - selectedDate.getTime()
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24))
  if (daysRemaining <= 0) return null

  const prettyDate = formatCompactDate(target_date)
  if (!prettyDate) return null

  if (metric_kind === 'time_seconds') {
    const secondsToCut = current_value - target_value
    if (secondsToCut <= 0) return `You are already at or ahead of the ${prettyDate} target.`
    const perWeek = secondsToCut / Math.max(daysRemaining / 7, 1)
    return `To hit ${prettyDate}, you need to shave about ${Math.round(perWeek)} sec per week.`
  }

  const gap = target_value - current_value
  if (gap <= 0) return `You are already at or ahead of the ${prettyDate} target.`

  if (metric_kind === 'currency_millions') {
    const perMonth = gap / Math.max(daysRemaining / 30.44, 1)
    const perWeek = gap / Math.max(daysRemaining / 7, 1)
    return `To hit ${prettyDate}, close about ${formatMetricValue(perMonth, metric_kind)}/month (${formatMetricValue(perWeek, metric_kind)}/week).`
  }

  const perWeek = gap / Math.max(daysRemaining / 7, 1)
  const perMonth = gap / Math.max(daysRemaining / 30.44, 1)
  return `To hit ${prettyDate}, add about ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(perWeek))}/week (${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(perMonth))}/month).`
}

function getPillarDefaults(pillar: HomeVisionPillar, selectedDate: Date): Partial<HomeVisionPillar> {
  const label = pillar.label.toLowerCase()
  const goal = pillar.goal.toLowerCase()
  const yearEnd = getYearEndDate(selectedDate)

  if (goal.includes('5m arr') || label.includes('gtm')) {
    return {
      current_value: 1.7,
      target_value: 5,
      metric_kind: 'currency_millions',
      current_label: 'Now',
      target_label: 'Target',
      target_date: yearEnd,
      items: pillar.items?.length
        ? pillar.items
        : [
            'Turn the GTM playbook into a weekly operating system the team can actually run.',
            'Increase pipeline creation and conversion every week, not just at quarter-end.',
            'Build repeatable execution loops for positioning, outbound, demos, and expansion.',
          ],
    }
  }

  if (goal.includes('makers lounge') || label.includes('community')) {
    return {
      current_value: 650,
      target_value: 10000,
      metric_kind: 'count',
      current_label: 'Luma now',
      target_label: 'Luma target',
      target_date: yearEnd,
      items: pillar.items?.length
        ? pillar.items
        : [
            'Run one high-signal event every week and design it to generate follow-on invitations.',
            'Turn members into hosts, connectors, and repeat collaborators inside the community.',
            'Make helping each other win visible so contribution becomes the default behavior.',
          ],
    }
  }

  if (goal.includes('hyrox') || label.includes('athlete')) {
    return {
      current_value: (57 * 60) + 29,
      target_value: (54 * 60) + 59,
      metric_kind: 'time_seconds',
      current_label: 'Last race',
      target_label: 'Sub-55',
      target_date: `${selectedDate.getFullYear()}-05-15`,
      items: pillar.items?.length
        ? pillar.items
        : [
            'Commit to a Hyrox-specific training block with running, strength endurance, and compromised effort.',
            'Sharpen race pacing, transitions, and station efficiency so free seconds stop leaking.',
            'Protect recovery, fueling, and consistency so the full block compounds before race day.',
          ],
    }
  }

  return {}
}

function normalizePillar(pillar: HomeVisionPillar, selectedDate: Date): NormalizedHomeVisionPillar {
  const defaults = getPillarDefaults(pillar, selectedDate)
  const merged = { ...defaults, ...pillar }

  return {
    ...merged,
    items: normalizePillarItems(merged.items || []),
    current_value: merged.current_value ?? null,
    target_value: merged.target_value ?? null,
    metric_kind: merged.metric_kind ?? null,
    current_label: merged.current_label ?? null,
    target_label: merged.target_label ?? null,
    baseline_date: merged.baseline_date ?? null,
    target_date: merged.target_date ?? null,
  }
}

export function HomeVisionSection({ userId, selectedDate }: HomeVisionSectionProps) {
  const queryClient = useQueryClient()
  const [expandedGoal, setExpandedGoal] = useState<number | null>(0)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<EditableHomeVision | null>(null)

  const dateKey = formatDate(selectedDate)
  const [mitChecked, setMitChecked] = useState<Record<string, boolean>>({})

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(`daygo-hv-${dateKey}`) || '{}')
      setMitChecked(stored)
    } catch {
      setMitChecked({})
    }
  }, [dateKey])

  useEffect(() => {
    if (Object.keys(mitChecked).length > 0) {
      localStorage.setItem(`daygo-hv-${dateKey}`, JSON.stringify(mitChecked))
    }
  }, [mitChecked, dateKey])

  const toggleMit = useCallback((key: string, e: React.MouseEvent) => {
    const willCheck = !mitChecked[key]
    setMitChecked((prev: Record<string, boolean>) => ({ ...prev, [key]: willCheck }))
    if (willCheck) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const x = (rect.left + 10) / window.innerWidth
      const y = (rect.top + 10) / window.innerHeight
      confetti({ particleCount: 30, spread: 60, origin: { x, y }, startVelocity: 18, gravity: 0.8, scalar: 0.7, ticks: 50 })
    }
  }, [mitChecked])

  const { data: homeVision, isLoading } = useQuery({
    queryKey: ['homeVision', userId],
    queryFn: () => homeVisionsService.getHomeVision(userId),
    enabled: !!userId,
  })

  const upsertMutation = useMutation({
    mutationFn: (vision: Parameters<typeof homeVisionsService.upsertHomeVision>[1]) =>
      homeVisionsService.upsertHomeVision(userId, vision),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeVision'] })
      setIsEditing(false)
      setEditData(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => homeVisionsService.deleteHomeVision(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeVision'] })
      setIsEditing(false)
      setEditData(null)
    },
  })

  const startEditing = useCallback(() => {
    if (homeVision) {
      const pillars = Array.isArray(homeVision.pillars)
        ? homeVision.pillars
        : typeof homeVision.pillars === 'string'
          ? JSON.parse(homeVision.pillars)
          : []

      setEditData({
        title: homeVision.title,
        subtitle: homeVision.subtitle || '',
        pillars: (pillars as HomeVisionPillar[]).map((pillar) => ({
          ...normalizePillar(pillar, selectedDate),
          items: normalizePillarItems(pillar.items || []),
        })),
      })
    } else {
      setEditData({
        title: 'Become the 2026 leader of Toronto, through fitness, community, and AI',
        subtitle: 'Connect your highest ambitions to your daily habits.',
        pillars: [],
      })
    }
    setIsEditing(true)
  }, [homeVision, selectedDate])

  const handleSave = useCallback(() => {
    if (!editData) return
    upsertMutation.mutate({
      title: editData.title,
      subtitle: editData.subtitle || null,
      pillars: editData.pillars.map((pillar) => ({
        ...pillar,
        items: normalizePillarItems(pillar.items || []).map((item) => ({
          label: item.label,
          type: item.type || 'checkbox',
          ...(item.target !== undefined ? { target: item.target } : {}),
        })),
      })),
    })
  }, [editData, upsertMutation])

  const addPillar = useCallback(() => {
    if (!editData) return
    setEditData({
      ...editData,
      pillars: [
        ...editData.pillars,
        {
          label: '',
          goal: '',
          tagline: '',
          color: 'emerald',
          items: [],
          current_value: null,
          target_value: null,
          metric_kind: 'count',
          current_label: 'Now',
          target_label: 'Target',
          target_date: getYearEndDate(selectedDate),
        },
      ],
    })
  }, [editData, selectedDate])

  const updatePillar = useCallback((index: number, updates: Partial<HomeVisionPillar>) => {
    if (!editData) return
    const newPillars = [...editData.pillars]
    newPillars[index] = { ...newPillars[index], ...updates }
    setEditData({ ...editData, pillars: newPillars })
  }, [editData])

  const removePillar = useCallback((index: number) => {
    if (!editData) return
    setEditData({ ...editData, pillars: editData.pillars.filter((_: HomeVisionPillar, i: number) => i !== index) })
  }, [editData])

  const addPillarItem = useCallback((pillarIndex: number) => {
    if (!editData) return
    const newPillars = [...editData.pillars]
    const currentItems = normalizePillarItems(newPillars[pillarIndex].items || [])
    newPillars[pillarIndex] = {
      ...newPillars[pillarIndex],
      items: [...currentItems, { label: '', type: 'checkbox' }],
    }
    setEditData({ ...editData, pillars: newPillars })
  }, [editData])

  const updatePillarItem = useCallback((pillarIndex: number, itemIndex: number, value: string) => {
    if (!editData) return
    const newPillars = [...editData.pillars]
    const newItems = normalizePillarItems(newPillars[pillarIndex].items || [])
    newItems[itemIndex] = { ...newItems[itemIndex], label: value }
    newPillars[pillarIndex] = { ...newPillars[pillarIndex], items: newItems }
    setEditData({ ...editData, pillars: newPillars })
  }, [editData])

  const removePillarItem = useCallback((pillarIndex: number, itemIndex: number) => {
    if (!editData) return
    const newPillars = [...editData.pillars]
    newPillars[pillarIndex] = {
      ...newPillars[pillarIndex],
      items: normalizePillarItems(newPillars[pillarIndex].items || []).filter((_: PillarItem, i: number) => i !== itemIndex),
    }
    setEditData({ ...editData, pillars: newPillars })
  }, [editData])

  if (isLoading) return null

  if (!homeVision && !isEditing) {
    return (
      <div className="mb-10">
        <button
          onClick={startEditing}
          className="w-full py-4 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-dashed border-slate-300 dark:border-slate-600 rounded-2xl text-slate-500 dark:text-slate-400 font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Flame className="w-5 h-5" />
          Create Your Vision Roadmap!
        </button>
      </div>
    )
  }

  if (isEditing && editData) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 pt-12 z-50 overflow-y-auto">
        <div
          className="bg-white dark:bg-slate-900 rounded-2xl p-5 w-full max-w-2xl shadow-2xl mb-12"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {homeVision ? 'Edit Vision Map' : 'Create Vision Map'}
            </h2>
            <button
              onClick={() => { setIsEditing(false); setEditData(null) }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Title</label>
              <input
                type="text"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500/40"
                placeholder="My Vision 2026"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Subtitle</label>
              <input
                type="text"
                value={editData.subtitle}
                onChange={(e) => setEditData({ ...editData, subtitle: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500/40"
                placeholder="See the distance between where you are and where you are going."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-500 dark:text-slate-400">Pillars</label>
                <button
                  onClick={addPillar}
                  className="text-xs text-slate-600 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white font-medium flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Pillar
                </button>
              </div>

              <div className="space-y-4">
                {editData.pillars.map((pillar, pi) => {
                  const items = normalizePillarItems(pillar.items || [])
                  return (
                    <div key={pi} className="border border-gray-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 dark:text-slate-500">Pillar {pi + 1}</span>
                        <button onClick={() => removePillar(pi)} className="p-1 text-red-400 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={pillar.label}
                        onChange={(e) => updatePillar(pi, { label: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500/40"
                        placeholder="Label (e.g. AI GTM Leader)"
                      />

                      <textarea
                        value={pillar.goal}
                        onChange={(e) => updatePillar(pi, { goal: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500/40 resize-none"
                        placeholder="Goal description"
                        rows={2}
                      />

                      <textarea
                        value={pillar.tagline}
                        onChange={(e) => updatePillar(pi, { tagline: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500/40 resize-none"
                        placeholder="Describe the bridge between now and the target."
                        rows={2}
                      />

                      <div>
                        <label className="block text-xs text-gray-400 dark:text-slate-500 mb-1">Color</label>
                        <div className="flex flex-wrap gap-2">
                          {COLOR_OPTIONS.map(({ value, label }) => (
                            <button
                              key={value}
                              onClick={() => updatePillar(pi, { color: value })}
                              className={`px-2 py-1 text-xs rounded-lg border transition-all ${
                                pillar.color === value
                                  ? 'border-gray-900 dark:border-white bg-gray-100 dark:bg-slate-700 font-bold'
                                  : 'border-gray-200 dark:border-slate-700 hover:border-gray-400'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-xl border border-gray-200 dark:border-slate-700 p-3">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Metric type</label>
                          <select
                            value={pillar.metric_kind || 'count'}
                            onChange={(e) => updatePillar(pi, { metric_kind: e.target.value as HomeVisionMetricKind })}
                            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500/40"
                          >
                            {METRIC_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Current value</label>
                          <input
                            type="number"
                            step="any"
                            value={pillar.current_value ?? ''}
                            onChange={(e) => updatePillar(pi, { current_value: parseOptionalNumber(e.target.value) })}
                            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500/40"
                            placeholder={pillar.metric_kind === 'time_seconds' ? '3449' : '0'}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Target value</label>
                          <input
                            type="number"
                            step="any"
                            value={pillar.target_value ?? ''}
                            onChange={(e) => updatePillar(pi, { target_value: parseOptionalNumber(e.target.value) })}
                            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500/40"
                            placeholder={pillar.metric_kind === 'time_seconds' ? '3299' : '0'}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Current label</label>
                          <input
                            type="text"
                            value={pillar.current_label || ''}
                            onChange={(e) => updatePillar(pi, { current_label: e.target.value })}
                            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500/40"
                            placeholder="Now"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Target label</label>
                          <input
                            type="text"
                            value={pillar.target_label || ''}
                            onChange={(e) => updatePillar(pi, { target_label: e.target.value })}
                            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500/40"
                            placeholder="Target"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Target date</label>
                          <input
                            type="date"
                            value={pillar.target_date || ''}
                            onChange={(e) => updatePillar(pi, { target_date: e.target.value || null })}
                            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500/40"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-gray-400 dark:text-slate-500">What it takes</label>
                          <button
                            onClick={() => addPillarItem(pi)}
                            className="text-xs text-slate-600 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white font-medium flex items-center gap-0.5"
                          >
                            <Plus className="w-3 h-3" /> Add
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {items.map((item, ii) => (
                            <div key={ii} className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={item.label}
                                onChange={(e) => updatePillarItem(pi, ii, e.target.value)}
                                className="flex-1 px-2 py-1.5 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500/40"
                                placeholder="The bridge from now to the target..."
                              />
                              <button onClick={() => removePillarItem(pi, ii)} className="p-1 text-red-400 hover:text-red-500 flex-shrink-0">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
            {homeVision && (
              <button
                onClick={() => {
                  if (confirm('Delete your roadmap?')) deleteMutation.mutate()
                }}
                disabled={deleteMutation.isPending}
                className="px-4 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg font-medium text-sm transition-colors"
              >
                Delete
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={() => { setIsEditing(false); setEditData(null) }}
              className="px-4 py-2.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-white rounded-lg font-medium text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!editData.title.trim() || upsertMutation.isPending}
              className="px-6 py-2.5 bg-slate-600 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
            >
              {upsertMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!homeVision) return null

  const pillars: NormalizedHomeVisionPillar[] = (
    Array.isArray(homeVision.pillars)
      ? homeVision.pillars
      : typeof homeVision.pillars === 'string'
        ? JSON.parse(homeVision.pillars)
        : []
  ).map((pillar: HomeVisionPillar) => normalizePillar(pillar, selectedDate))

  return (
    <div className="mb-8 space-y-3">
      <div className="bg-transparent">
        <div className="px-1 py-1">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <Flame className="w-4 h-4 text-slate-400" />
                <h2 className="text-base md:text-[1.45rem] font-heading font-medium text-bevel-text dark:text-white tracking-tight uppercase">
                  {homeVision.title}
                </h2>
              </div>
              {homeVision.subtitle && (
                <p className="text-[13px] text-bevel-text-secondary dark:text-slate-400 max-w-xl">{homeVision.subtitle}</p>
              )}
            </div>
            <button
              onClick={startEditing}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-white/40 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
              title="Edit vision map"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {pillars.map((pillar, index) => {
              const colors = PILLAR_COLORS[pillar.color] || PILLAR_COLORS.emerald
              const progressPercent = getProgressPercent(pillar)
              const rateText = getRateToGoalText(pillar, selectedDate)
              const actionItems = normalizePillarItems(pillar.items || [])
              const gradientId = `visionProgress-${index}`

              return (
                <div key={index} className={`rounded-[1.15rem] bg-gradient-to-br ${colors.tint} overflow-hidden`}>
                  <button
                    onClick={() => setExpandedGoal(expandedGoal === index ? null : index)}
                    className={`w-full p-3 ${colors.hoverBg} transition-colors text-left`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-bevel-text dark:text-white text-[15px] md:text-[1.05rem] leading-tight max-w-3xl">
                              {pillar.goal}
                            </p>
                          </div>
                          <ChevronDown className={`w-4.5 h-4.5 text-bevel-text-secondary mt-0.5 flex-shrink-0 transition-transform ${expandedGoal === index ? 'rotate-180' : ''}`} />
                        </div>

                        <div className="mt-2.5 rounded-[1rem] bg-white/45 dark:bg-slate-900/20 px-2.5 py-2">
                          <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-center">
                            <div>
                              <p className="text-[9px] uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                                {pillar.current_label || 'Now'}
                              </p>
                              <p className="text-[13px] font-semibold text-bevel-text dark:text-white">
                                {formatMetricValue(pillar.current_value, pillar.metric_kind)}
                              </p>
                            </div>

                            <div className="px-1">
                              <div className="relative h-6 flex items-center">
                                <div className="absolute left-0 right-0 border-t-2 border-dashed border-slate-300 dark:border-slate-600" />
                                <div className={`absolute left-0 w-3 h-3 rounded-full bg-gradient-to-br ${colors.gradient} shadow-sm`} />
                                <div className={`absolute right-0 w-3 h-3 rounded-full bg-gradient-to-br ${colors.gradient} shadow-sm`} />
                                {progressPercent !== null && (
                                  <>
                                    <div
                                      className={`absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r ${colors.progress} opacity-85`}
                                      style={{ width: `calc(${progressPercent}% - 0.75rem)` }}
                                    />
                                    <div
                                      className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-white dark:border-slate-900 bg-white/90 dark:bg-slate-800 shadow-sm"
                                      style={{ left: `calc(${progressPercent}% - 0.5rem)` }}
                                    />
                                  </>
                                )}
                              </div>
                              <div className="mt-1 text-center">
                                <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400">
                                  {formatGapValue(pillar)}
                                  {progressPercent !== null ? ` • ${Math.round(progressPercent)}% there` : ''}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-[9px] uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                                {pillar.target_label || 'Target'}
                              </p>
                              <p className="text-[13px] font-semibold text-bevel-text dark:text-white">
                                {formatMetricValue(pillar.target_value, pillar.metric_kind)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>

                  {expandedGoal === index && (
                    <div className="px-3 pb-3">
                      <div className="ml-0 md:ml-[3.25rem] border-t border-white/70 dark:border-slate-800 pt-3 space-y-3">
                        {pillar.tagline && (
                          <p className={`text-[13px] leading-relaxed ${colors.accentText}`}>{pillar.tagline}</p>
                        )}
                        {actionItems.length > 0 && (
                          <div className="space-y-1.5">
                            {actionItems.map((item, ii) => {
                              const key = `hv-${index}-${ii}`
                              const isChecked = mitChecked[key]
                              return (
                                <button key={key} onClick={(e) => toggleMit(key, e)} className="w-full flex items-start gap-2.5 group text-left">
                                  <div className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                                    isChecked ? colors.checked : `border-slate-300 dark:border-slate-600 ${colors.checkHover}`
                                  }`}>
                                    {isChecked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                                  </div>
                                  <p className={`text-[13px] leading-relaxed relative transition-colors duration-200 ${
                                    isChecked ? 'text-bevel-text-secondary dark:text-slate-500' : 'text-bevel-text dark:text-slate-300'
                                  }`}>
                                    {item.label}
                                    <span
                                      className="absolute left-0 top-1/2 h-[1.5px] -translate-y-1/2 bg-current opacity-60 transition-all duration-500 ease-in-out"
                                      style={{ width: isChecked ? '100%' : '0%' }}
                                    />
                                  </p>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
