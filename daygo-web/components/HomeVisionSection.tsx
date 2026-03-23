'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Flame, ChevronDown, Check, X, Plus, Pencil, Trash2, GripVertical } from 'lucide-react'
import { homeVisionsService, type HomeVision, type HomeVisionPillar } from '@/lib/services/homeVisions'
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
  },
  sky: {
    border: 'border-sky-200/60 dark:border-sky-500/20',
    hoverBg: 'hover:bg-sky-50/50 dark:hover:bg-sky-500/5',
    gradient: 'from-sky-400 to-blue-500',
    label: 'text-sky-500 dark:text-sky-400',
    tagline: 'text-sky-600 dark:text-sky-400',
    checkHover: 'group-hover:border-sky-400',
    checked: 'bg-sky-500 border-sky-500',
  },
  purple: {
    border: 'border-purple-200/60 dark:border-purple-500/20',
    hoverBg: 'hover:bg-purple-50/50 dark:hover:bg-purple-500/5',
    gradient: 'from-purple-400 to-violet-500',
    label: 'text-purple-500 dark:text-purple-400',
    tagline: 'text-purple-600 dark:text-purple-400',
    checkHover: 'group-hover:border-purple-400',
    checked: 'bg-purple-500 border-purple-500',
  },
  amber: {
    border: 'border-amber-200/60 dark:border-amber-500/20',
    hoverBg: 'hover:bg-amber-50/50 dark:hover:bg-amber-500/5',
    gradient: 'from-amber-400 to-orange-500',
    label: 'text-amber-500 dark:text-amber-400',
    tagline: 'text-amber-600 dark:text-amber-400',
    checkHover: 'group-hover:border-amber-400',
    checked: 'bg-amber-500 border-amber-500',
  },
  rose: {
    border: 'border-rose-200/60 dark:border-rose-500/20',
    hoverBg: 'hover:bg-rose-50/50 dark:hover:bg-rose-500/5',
    gradient: 'from-rose-400 to-pink-500',
    label: 'text-rose-500 dark:text-rose-400',
    tagline: 'text-rose-600 dark:text-rose-400',
    checkHover: 'group-hover:border-rose-400',
    checked: 'bg-rose-500 border-rose-500',
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
    rule_title: string
    rule_text: string
  } | null>(null)

  // Daily checklist state (localStorage)
  const dateKey = formatDate(selectedDate)
  const [mitChecked, setMitChecked] = useState<Record<string, boolean>>({})

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(`daygo-hv-${dateKey}`) || '{}')
      setMitChecked(stored)
    } catch { setMitChecked({}) }
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
        pillars: pillars as HomeVisionPillar[],
        rule_title: homeVision.rule_title || '',
        rule_text: homeVision.rule_text || '',
      })
    } else {
      setEditData({
        title: 'My Roadmap',
        subtitle: '',
        pillars: [],
        rule_title: '',
        rule_text: '',
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
      rule_title: editData.rule_title || null,
      rule_text: editData.rule_text || null,
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

  const addPillarItem = useCallback((pillarIndex: number) => {
    if (!editData) return
    const newPillars = [...editData.pillars]
    newPillars[pillarIndex] = {
      ...newPillars[pillarIndex],
      items: [...newPillars[pillarIndex].items, ''],
    }
    setEditData({ ...editData, pillars: newPillars })
  }, [editData])

  const updatePillarItem = useCallback((pillarIndex: number, itemIndex: number, value: string) => {
    if (!editData) return
    const newPillars = [...editData.pillars]
    const newItems = [...newPillars[pillarIndex].items]
    newItems[itemIndex] = value
    newPillars[pillarIndex] = { ...newPillars[pillarIndex], items: newItems }
    setEditData({ ...editData, pillars: newPillars })
  }, [editData])

  const removePillarItem = useCallback((pillarIndex: number, itemIndex: number) => {
    if (!editData) return
    const newPillars = [...editData.pillars]
    newPillars[pillarIndex] = {
      ...newPillars[pillarIndex],
      items: newPillars[pillarIndex].items.filter((_: string, i: number) => i !== itemIndex),
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
          Create Your Vision Roadmap
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
              {homeVision ? 'Edit Roadmap' : 'Create Roadmap'}
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
                placeholder="2026 Roadmap"
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Subtitle</label>
              <input
                type="text"
                value={editData.subtitle}
                onChange={(e) => setEditData({ ...editData, subtitle: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                placeholder="Focus on what matters most."
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
                      placeholder="Label (e.g. AI Engineer)"
                    />
                    <textarea
                      value={pillar.goal}
                      onChange={(e) => updatePillar(pi, { goal: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
                      placeholder="Goal description"
                      rows={2}
                    />
                    <input
                      type="text"
                      value={pillar.tagline}
                      onChange={(e) => updatePillar(pi, { tagline: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      placeholder="Motivational tagline (shown when expanded)"
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
                        <label className="text-xs text-gray-400 dark:text-slate-500">Checklist items</label>
                        <button
                          onClick={() => addPillarItem(pi)}
                          className="text-xs text-orange-500 hover:text-orange-600 font-medium flex items-center gap-0.5"
                        >
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {pillar.items.map((item, ii) => (
                          <div key={ii} className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={item}
                              onChange={(e) => updatePillarItem(pi, ii, e.target.value)}
                              className="flex-1 px-2 py-1 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                              placeholder="Checklist item..."
                            />
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

            {/* Rule */}
            <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Rule title (optional)</label>
              <input
                type="text"
                value={editData.rule_title}
                onChange={(e) => setEditData({ ...editData, rule_title: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 mb-2"
                placeholder="The Rule"
              />
              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Rule description</label>
              <textarea
                value={editData.rule_text}
                onChange={(e) => setEditData({ ...editData, rule_text: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
                placeholder="Describe your rule..."
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
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

  const pillars: HomeVisionPillar[] = Array.isArray(homeVision.pillars)
    ? homeVision.pillars
    : typeof homeVision.pillars === 'string'
      ? JSON.parse(homeVision.pillars)
      : []

  return (
    <div className="mb-10 space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-[2px]">
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-5">
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
              title="Edit roadmap"
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
                    <ChevronDown className={`w-4 h-4 text-bevel-text-secondary transition-transform ${expandedGoal === index ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedGoal === index && (
                    <div className="px-3 pb-3 pl-14 space-y-2">
                      {pillar.tagline && (
                        <p className={`text-sm font-semibold ${colors.tagline}`}>{pillar.tagline}</p>
                      )}
                      {pillar.items.map((item, ii) => {
                        const key = `hv-${index}-${ii}`
                        return (
                          <button key={key} onClick={(e) => toggleMit(key, e)} className="w-full flex items-center gap-2.5 group">
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              mitChecked[key] ? colors.checked : `border-slate-300 dark:border-slate-600 ${colors.checkHover}`
                            }`}>
                              {mitChecked[key] && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <p className={`text-sm text-left ${
                              mitChecked[key] ? 'text-bevel-text-secondary dark:text-slate-500 line-through' : 'text-bevel-text dark:text-slate-300'
                            }`}>
                              {item}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Rule section */}
            {homeVision.rule_title && (
              <div className="rounded-xl border border-red-200/60 dark:border-red-500/20 overflow-hidden bg-red-50/30 dark:bg-red-500/5">
                <div className="flex items-center gap-3 p-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center text-white shadow-lg">
                    <X className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-500 dark:text-red-400 mb-0.5">The Rule</p>
                    <p className="font-extrabold text-bevel-text dark:text-white text-[15px] leading-snug">
                      {homeVision.rule_title}
                    </p>
                  </div>
                </div>
                {homeVision.rule_text && (
                  <div className="px-3 pb-3 pl-14">
                    <p className="text-sm text-bevel-text-secondary dark:text-slate-400">{homeVision.rule_text}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
