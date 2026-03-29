'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Flame, ChevronDown, Check, X, Plus, Pencil, Trash2, Hash, BarChart3 } from 'lucide-react'
import { homeVisionsService, normalizePillarItems, type HomeVision, type HomeVisionPillar, type PillarItem } from '@/lib/services/homeVisions'
import { visionChecklistLogsService, type ChecklistState, type VisionChecklistLog } from '@/lib/services/visionChecklistLogs'
import confetti from 'canvas-confetti'

const PILLAR_COLORS = {
  emerald: {
    border: 'border-emerald-200/60 dark:border-emerald-500/20',
    hoverBg: 'hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5',
    gradient: 'from-emerald-400 to-teal-500',
    label: 'text-emerald-500 dark:text-emerald-400',
    tagline: 'text-emerald-600 dark:text-emerald-400',
    checkHover: 'group-hover:border-emerald-400',
    checked: 'bg-emerald-500 border-emerald-500',
    metricBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    metricRing: 'focus:ring-emerald-500/50',
  },
  sky: {
    border: 'border-sky-200/60 dark:border-sky-500/20',
    hoverBg: 'hover:bg-sky-50/50 dark:hover:bg-sky-500/5',
    gradient: 'from-sky-400 to-blue-500',
    label: 'text-sky-500 dark:text-sky-400',
    tagline: 'text-sky-600 dark:text-sky-400',
    checkHover: 'group-hover:border-sky-400',
    checked: 'bg-sky-500 border-sky-500',
    metricBg: 'bg-sky-50 dark:bg-sky-500/10',
    metricRing: 'focus:ring-sky-500/50',
  },
  purple: {
    border: 'border-purple-200/60 dark:border-purple-500/20',
    hoverBg: 'hover:bg-purple-50/50 dark:hover:bg-purple-500/5',
    gradient: 'from-purple-400 to-violet-500',
    label: 'text-purple-500 dark:text-purple-400',
    tagline: 'text-purple-600 dark:text-purple-400',
    checkHover: 'group-hover:border-purple-400',
    checked: 'bg-purple-500 border-purple-500',
    metricBg: 'bg-purple-50 dark:bg-purple-500/10',
    metricRing: 'focus:ring-purple-500/50',
  },
  amber: {
    border: 'border-amber-200/60 dark:border-amber-500/20',
    hoverBg: 'hover:bg-amber-50/50 dark:hover:bg-amber-500/5',
    gradient: 'from-amber-400 to-orange-500',
    label: 'text-amber-500 dark:text-amber-400',
    tagline: 'text-amber-600 dark:text-amber-400',
    checkHover: 'group-hover:border-amber-400',
    checked: 'bg-amber-500 border-amber-500',
    metricBg: 'bg-amber-50 dark:bg-amber-500/10',
    metricRing: 'focus:ring-amber-500/50',
  },
  rose: {
    border: 'border-rose-200/60 dark:border-rose-500/20',
    hoverBg: 'hover:bg-rose-50/50 dark:hover:bg-rose-500/5',
    gradient: 'from-rose-400 to-pink-500',
    label: 'text-rose-500 dark:text-rose-400',
    tagline: 'text-rose-600 dark:text-rose-400',
    checkHover: 'group-hover:border-rose-400',
    checked: 'bg-rose-500 border-rose-500',
    metricBg: 'bg-rose-50 dark:bg-rose-500/10',
    metricRing: 'focus:ring-rose-500/50',
  },
}

const COLOR_OPTIONS: { value: HomeVisionPillar['color']; label: string }[] = [
  { value: 'emerald', label: 'Green' },
  { value: 'sky', label: 'Blue' },
  { value: 'purple', label: 'Purple' },
  { value: 'amber', label: 'Amber' },
  { value: 'rose', label: 'Rose' },
]

interface HomeVisionSectionProps {
  userId: string
  selectedDate: Date
}

function formatDate(d: Date) {
  return d.toISOString().split('T')[0]
}

export function HomeVisionSection({ userId, selectedDate }: HomeVisionSectionProps) {
  const queryClient = useQueryClient()
  const [expandedGoal, setExpandedGoal] = useState<number | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<{
    title: string
    subtitle: string
    pillars: HomeVisionPillar[]
  } | null>(null)

  const [showProgress, setShowProgress] = useState(false)
  const [progressRange, setProgressRange] = useState<'week' | 'month' | 'year'>('week')

  // Daily checklist state (Supabase)
  const dateKey = formatDate(selectedDate)

  const { data: logState = {} } = useQuery({
    queryKey: ['visionChecklist', userId, dateKey],
    queryFn: () => visionChecklistLogsService.getLogsForDate(userId, dateKey),
    enabled: !!userId,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ pillarIndex, itemIndex, completed }: { pillarIndex: number; itemIndex: number; completed: boolean }) =>
      visionChecklistLogsService.toggleItem(userId, pillarIndex, itemIndex, dateKey, completed),
    onMutate: async ({ pillarIndex, itemIndex, completed }) => {
      const key = `hv-${pillarIndex}-${itemIndex}`
      const queryKey = ['visionChecklist', userId, dateKey]
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Record<string, ChecklistState>>(queryKey)
      queryClient.setQueryData(queryKey, (old: Record<string, ChecklistState> = {}) => ({
        ...old,
        [key]: { ...old[key], completed, value: old[key]?.value ?? null },
      }))
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['visionChecklist', userId, dateKey], context.previous)
      }
    },
  })

  const metricMutation = useMutation({
    mutationFn: ({ pillarIndex, itemIndex, value, target }: { pillarIndex: number; itemIndex: number; value: number; target: number }) =>
      visionChecklistLogsService.logMetric(userId, pillarIndex, itemIndex, dateKey, value, target),
    onMutate: async ({ pillarIndex, itemIndex, value, target }) => {
      const key = `hv-${pillarIndex}-${itemIndex}`
      const queryKey = ['visionChecklist', userId, dateKey]
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Record<string, ChecklistState>>(queryKey)
      queryClient.setQueryData(queryKey, (old: Record<string, ChecklistState> = {}) => ({
        ...old,
        [key]: { completed: value >= target, value },
      }))
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['visionChecklist', userId, dateKey], context.previous)
      }
    },
  })

  const toggleMit = useCallback((key: string, e: React.MouseEvent) => {
    const state = logState[key]
    const willCheck = !state?.completed
    const parts = key.split('-')
    const pillarIndex = parseInt(parts[1])
    const itemIndex = parseInt(parts[2])
    toggleMutation.mutate({ pillarIndex, itemIndex, completed: willCheck })
    if (willCheck) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const x = (rect.left + 10) / window.innerWidth
      const y = (rect.top + 10) / window.innerHeight
      confetti({ particleCount: 30, spread: 60, origin: { x, y }, startVelocity: 18, gravity: 0.8, scalar: 0.7, ticks: 50 })
    }
  }, [logState, toggleMutation])

  const handleMetricChange = useCallback((pillarIndex: number, itemIndex: number, value: number, target: number) => {
    metricMutation.mutate({ pillarIndex, itemIndex, value, target })
    if (value >= target) {
      confetti({ particleCount: 40, spread: 70, startVelocity: 20, gravity: 0.8, scalar: 0.8, ticks: 60 })
    }
  }, [metricMutation])

  // Progress data
  const progressDates = useMemo(() => {
    const now = new Date(dateKey)
    const start = new Date(now)
    if (progressRange === 'week') start.setDate(now.getDate() - 6)
    else if (progressRange === 'month') start.setDate(now.getDate() - 29)
    else start.setMonth(0, 1) // Jan 1 of current year
    return { start: formatDate(start), end: dateKey }
  }, [dateKey, progressRange])

  const { data: progressLogs = [] } = useQuery({
    queryKey: ['visionProgress', userId, progressDates.start, progressDates.end],
    queryFn: () => visionChecklistLogsService.getLogsForRange(userId, progressDates.start, progressDates.end),
    enabled: !!userId && showProgress,
  })

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
      const rawPillars = Array.isArray(homeVision.pillars)
        ? homeVision.pillars
        : typeof homeVision.pillars === 'string'
          ? JSON.parse(homeVision.pillars)
          : []
      // Normalize legacy string items to PillarItem objects
      const pillars = rawPillars.map((p: any) => ({
        ...p,
        items: normalizePillarItems(p.items || []),
      }))
      setEditData({
        title: homeVision.title,
        subtitle: homeVision.subtitle || '',
        pillars: pillars as HomeVisionPillar[],
      })
    } else {
      setEditData({
        title: 'My Vision',
        subtitle: '',
        pillars: [],
      })
    }
    setIsEditing(true)
  }, [homeVision])

  const handleSave = useCallback(() => {
    if (!editData) return
    upsertMutation.mutate({
      title: editData.title,
      subtitle: editData.subtitle || null,
      pillars: editData.pillars,
    })
  }, [editData, upsertMutation])

  const addPillar = useCallback(() => {
    if (!editData) return
    setEditData({
      ...editData,
      pillars: [
        ...editData.pillars,
        { label: '', goal: '', tagline: '', color: 'emerald', items: [] },
      ],
    })
  }, [editData])

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

  const addPillarItem = useCallback((pillarIndex: number, type: 'checkbox' | 'metric') => {
    if (!editData) return
    const newPillars = [...editData.pillars]
    const newItem: PillarItem = type === 'metric'
      ? { label: '', type: 'metric', target: 5 }
      : { label: '', type: 'checkbox' }
    newPillars[pillarIndex] = {
      ...newPillars[pillarIndex],
      items: [...newPillars[pillarIndex].items, newItem],
    }
    setEditData({ ...editData, pillars: newPillars })
  }, [editData])

  const updatePillarItem = useCallback((pillarIndex: number, itemIndex: number, updates: Partial<PillarItem>) => {
    if (!editData) return
    const newPillars = [...editData.pillars]
    const newItems = [...newPillars[pillarIndex].items]
    newItems[itemIndex] = { ...newItems[itemIndex], ...updates }
    newPillars[pillarIndex] = { ...newPillars[pillarIndex], items: newItems }
    setEditData({ ...editData, pillars: newPillars })
  }, [editData])

  const removePillarItem = useCallback((pillarIndex: number, itemIndex: number) => {
    if (!editData) return
    const newPillars = [...editData.pillars]
    newPillars[pillarIndex] = {
      ...newPillars[pillarIndex],
      items: newPillars[pillarIndex].items.filter((_: PillarItem, i: number) => i !== itemIndex),
    }
    setEditData({ ...editData, pillars: newPillars })
  }, [editData])

  if (isLoading) return null

  // No home vision and not editing - show create button
  if (!homeVision && !isEditing) {
    return (
      <div className="mb-10">
        <button
          onClick={startEditing}
          className="w-full py-4 px-4 bg-orange-500/10 hover:bg-orange-500/20 border border-dashed border-orange-500/30 rounded-2xl text-orange-600 dark:text-orange-400 font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Flame className="w-5 h-5" />
          Create Your Vision
        </button>
      </div>
    )
  }

  // Edit modal
  if (isEditing && editData) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 pt-12 z-50 overflow-y-auto">
        <div
          className="bg-white dark:bg-slate-900 rounded-2xl p-5 w-full max-w-lg shadow-2xl mb-12"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {homeVision ? 'Edit Vision' : 'Create Vision'}
            </h2>
            <button
              onClick={() => { setIsEditing(false); setEditData(null) }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Title</label>
              <input
                type="text"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                placeholder="My Vision"
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Subtitle</label>
              <textarea
                value={editData.subtitle}
                onChange={(e) => setEditData({ ...editData, subtitle: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
                placeholder="The life I'm building..."
                rows={2}
              />
            </div>

            {/* Pillars */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-500 dark:text-slate-400">Pillars</label>
                <button
                  onClick={addPillar}
                  className="text-xs text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Pillar
                </button>
              </div>

              <div className="space-y-4">
                {editData.pillars.map((pillar, pi) => (
                  <div key={pi} className="border border-gray-200 dark:border-slate-700 rounded-xl p-3 space-y-2">
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
                      className="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      placeholder="Label (e.g. AI GTM Leader)"
                    />
                    <textarea
                      value={pillar.goal}
                      onChange={(e) => updatePillar(pi, { goal: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
                      placeholder="Goal description"
                      rows={2}
                    />
                    <textarea
                      value={pillar.tagline}
                      onChange={(e) => updatePillar(pi, { tagline: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
                      placeholder="Motivational tagline (shown when expanded)"
                      rows={2}
                    />
                    <div>
                      <label className="block text-xs text-gray-400 dark:text-slate-500 mb-1">Color</label>
                      <div className="flex gap-2">
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

                    {/* Items */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-gray-400 dark:text-slate-500">Daily actions</label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => addPillarItem(pi, 'checkbox')}
                            className="text-xs text-orange-500 hover:text-orange-600 font-medium flex items-center gap-0.5"
                          >
                            <Check className="w-3 h-3" /> Checkbox
                          </button>
                          <button
                            onClick={() => addPillarItem(pi, 'metric')}
                            className="text-xs text-blue-500 hover:text-blue-600 font-medium flex items-center gap-0.5"
                          >
                            <Hash className="w-3 h-3" /> Metric
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {pillar.items.map((item, ii) => (
                          <div key={ii} className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold uppercase w-6 text-center flex-shrink-0 ${
                              item.type === 'metric' ? 'text-blue-400' : 'text-gray-400'
                            }`}>
                              {item.type === 'metric' ? '#' : '✓'}
                            </span>
                            <input
                              type="text"
                              value={item.label}
                              onChange={(e) => updatePillarItem(pi, ii, { label: e.target.value })}
                              className="flex-1 px-2 py-1 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                              placeholder={item.type === 'metric' ? 'e.g. Prospects reached out to' : 'e.g. Review pipeline'}
                            />
                            {item.type === 'metric' && (
                              <input
                                type="number"
                                value={item.target ?? 5}
                                onChange={(e) => updatePillarItem(pi, ii, { target: parseInt(e.target.value) || 1 })}
                                className="w-14 px-2 py-1 text-sm text-center bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg text-blue-700 dark:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                min={1}
                                title="Daily target"
                              />
                            )}
                            <button onClick={() => removePillarItem(pi, ii)} className="p-1 text-red-400 hover:text-red-500 flex-shrink-0">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
            {homeVision && (
              <button
                onClick={() => {
                  if (confirm('Delete your vision?')) deleteMutation.mutate()
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
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
            >
              {upsertMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Display mode
  if (!homeVision) return null

  const rawPillars = Array.isArray(homeVision.pillars)
    ? homeVision.pillars
    : typeof homeVision.pillars === 'string'
      ? JSON.parse(homeVision.pillars)
      : []

  const pillars: HomeVisionPillar[] = rawPillars.map((p: any) => ({
    ...p,
    items: normalizePillarItems(p.items || []),
  }))

  return (
    <div className="mb-10 space-y-4">
      <div className="rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-extrabold text-bevel-text dark:text-white tracking-tight uppercase">
                {homeVision.title}
              </h2>
            </div>
            <button
              onClick={startEditing}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Edit vision"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
          {homeVision.subtitle && (
            <p className="text-xs text-bevel-text-secondary dark:text-slate-400 mb-4">{homeVision.subtitle}</p>
          )}
          <div className="space-y-3">
            {pillars.map((pillar, index) => {
              const colors = PILLAR_COLORS[pillar.color] || PILLAR_COLORS.emerald
              // Calculate pillar completion
              const pillarItems = pillar.items
              const completedCount = pillarItems.filter((_: PillarItem, ii: number) => {
                const key = `hv-${index}-${ii}`
                return logState[key]?.completed
              }).length
              const totalCount = pillarItems.length

              return (
                <div key={index} className={`rounded-xl border ${colors.border} overflow-hidden`}>
                  <button
                    onClick={() => setExpandedGoal(expandedGoal === index ? null : index)}
                    className={`w-full flex items-center gap-3 p-3 ${colors.hoverBg} transition-colors`}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white font-black text-sm shadow-lg`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`text-[10px] font-black uppercase tracking-widest ${colors.label} mb-0.5`}>
                        {pillar.label}
                      </p>
                      <p className="font-extrabold text-bevel-text dark:text-white text-[15px] leading-snug">
                        {pillar.goal}
                      </p>
                    </div>
                    {totalCount > 0 && (
                      <span className={`text-xs font-bold ${completedCount === totalCount ? colors.label : 'text-gray-400 dark:text-slate-500'} mr-1`}>
                        {completedCount}/{totalCount}
                      </span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-bevel-text-secondary transition-transform ${expandedGoal === index ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedGoal === index && (
                    <div className="px-3 pb-3 pl-14 space-y-2">
                      {pillar.tagline && (
                        <p className={`text-sm font-semibold ${colors.tagline}`}>{pillar.tagline}</p>
                      )}
                      {pillar.items.map((item, ii) => {
                        const key = `hv-${index}-${ii}`
                        const state = logState[key]

                        if (item.type === 'metric') {
                          const target = item.target ?? 5
                          const currentValue = state?.value ?? 0
                          const isComplete = currentValue >= target

                          return (
                            <div key={key} className="flex items-center gap-2.5">
                              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                isComplete ? colors.checked : `border-slate-300 dark:border-slate-600`
                              }`}>
                                {isComplete && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <p className={`text-sm flex-1 ${
                                isComplete ? 'text-bevel-text-secondary dark:text-slate-500' : 'text-bevel-text dark:text-slate-300'
                              }`}>
                                {item.label}
                              </p>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  value={currentValue || ''}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0
                                    handleMetricChange(index, ii, val, target)
                                  }}
                                  className={`w-12 px-1.5 py-0.5 text-sm text-center rounded-md border ${colors.metricBg} border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${colors.metricRing}`}
                                  min={0}
                                  placeholder="0"
                                />
                                <span className="text-xs text-gray-400 dark:text-slate-500">/ {target}</span>
                              </div>
                            </div>
                          )
                        }

                        // Checkbox item
                        return (
                          <button key={key} onClick={(e) => toggleMit(key, e)} className="w-full flex items-center gap-2.5 group">
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              state?.completed ? colors.checked : `border-slate-300 dark:border-slate-600 ${colors.checkHover}`
                            }`}>
                              {state?.completed && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <p className={`text-sm text-left ${
                              state?.completed ? 'text-bevel-text-secondary dark:text-slate-500 line-through' : 'text-bevel-text dark:text-slate-300'
                            }`}>
                              {item.label}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

          </div>

          {/* Progress dropdown */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
            <button
              onClick={() => setShowProgress(!showProgress)}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              {showProgress ? 'Hide Progress' : 'View Progress'}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showProgress ? 'rotate-180' : ''}`} />
            </button>

            {showProgress && (
              <div className="mt-3 space-y-4">
                {/* Range toggle */}
                <div className="flex justify-center gap-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-lg">
                  {(['week', 'month', 'year'] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => setProgressRange(range)}
                      className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                        progressRange === range
                          ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                      }`}
                    >
                      {range === 'week' ? '7 Days' : range === 'month' ? '30 Days' : 'Year'}
                    </button>
                  ))}
                </div>

                {/* Overall score */}
                {(() => {
                  const totalDays = progressRange === 'week' ? 7 : progressRange === 'month' ? 30 : Math.ceil((new Date(dateKey).getTime() - new Date(new Date(dateKey).getFullYear(), 0, 1).getTime()) / 86400000) + 1
                  const daysWithAnyLog = new Set(progressLogs.filter((l: VisionChecklistLog) => l.completed).map((l: VisionChecklistLog) => l.date)).size
                  const overallPct = totalDays > 0 ? Math.round((daysWithAnyLog / totalDays) * 100) : 0

                  return (
                    <div className="text-center py-2">
                      <p className="text-3xl font-black text-gray-900 dark:text-white">{overallPct}%</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">days active ({daysWithAnyLog}/{totalDays} days)</p>
                    </div>
                  )
                })()}

                {/* Per-pillar stats */}
                {pillars.map((pillar, pi) => {
                  const colors = PILLAR_COLORS[pillar.color] || PILLAR_COLORS.emerald
                  const pillarLogs = progressLogs.filter((l: VisionChecklistLog) => l.pillar_index === pi)

                  return (
                    <div key={pi} className={`rounded-xl border ${colors.border} p-3 space-y-2`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${colors.label}`}>
                        {pillar.label}
                      </p>
                      {pillar.items.map((item, ii) => {
                        const itemLogs = pillarLogs.filter((l: VisionChecklistLog) => l.item_index === ii)
                        const completedLogs = itemLogs.filter((l: VisionChecklistLog) => l.completed)

                        if (item.type === 'metric') {
                          const totalValue = itemLogs.reduce((sum: number, l: VisionChecklistLog) => sum + (l.value ?? 0), 0)
                          const daysLogged = itemLogs.filter((l: VisionChecklistLog) => (l.value ?? 0) > 0).length
                          const avg = daysLogged > 0 ? (totalValue / daysLogged).toFixed(1) : '0'
                          const target = item.target ?? 1
                          const daysHitTarget = completedLogs.length

                          return (
                            <div key={ii} className="flex items-center justify-between">
                              <p className="text-sm text-bevel-text dark:text-slate-300 flex-1">{item.label}</p>
                              <div className="flex items-center gap-3 text-xs">
                                <span className="text-gray-500 dark:text-slate-400">
                                  <span className="font-bold text-gray-900 dark:text-white">{totalValue}</span> total
                                </span>
                                <span className="text-gray-500 dark:text-slate-400">
                                  <span className="font-bold text-gray-900 dark:text-white">{avg}</span>/day avg
                                </span>
                                <span className={`font-bold ${daysHitTarget > 0 ? colors.label : 'text-gray-400 dark:text-slate-500'}`}>
                                  {daysHitTarget}d hit
                                </span>
                              </div>
                            </div>
                          )
                        }

                        // Checkbox stats
                        const daysCompleted = completedLogs.length
                        const totalDays = progressRange === 'week' ? 7 : progressRange === 'month' ? 30 : Math.ceil((new Date(dateKey).getTime() - new Date(new Date(dateKey).getFullYear(), 0, 1).getTime()) / 86400000) + 1
                        const pct = totalDays > 0 ? Math.round((daysCompleted / totalDays) * 100) : 0

                        return (
                          <div key={ii} className="flex items-center justify-between">
                            <p className="text-sm text-bevel-text dark:text-slate-300 flex-1">{item.label}</p>
                            <div className="flex items-center gap-2 text-xs">
                              <div className="w-16 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full bg-gradient-to-r ${colors.gradient}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className={`font-bold ${pct > 70 ? colors.label : 'text-gray-400 dark:text-slate-500'}`}>
                                {daysCompleted}d
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
      </div>
    </div>
  )
}
