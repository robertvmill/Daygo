'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/auth-store'
import { benchmarkWorkoutsService } from '@/lib/services/benchmarkWorkouts'
import { benchmarkAttemptsService } from '@/lib/services/benchmarkAttempts'
import type { BenchmarkWorkoutWithSegments, BenchmarkSegment, BenchmarkAttemptWithValues } from '@/lib/types/database'
import { Plus, Trash2, X, Dumbbell, Copy, GripVertical, ArrowLeft, Table, LineChart as LineChartIcon } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ── Helpers ──

const SEGMENT_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#06b6d4',
]

function formatValue(value: number, metric: string): string {
  if (metric === 'time') {
    const mins = Math.floor(value / 60)
    const secs = Math.round(value % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  return value.toLocaleString()
}

function metricUnit(metric: string): string {
  switch (metric) {
    case 'time': return 'min:sec'
    case 'reps': return 'reps'
    case 'steps': return 'steps'
    case 'distance': return 'm'
    case 'weight': return 'kg'
    default: return ''
  }
}

// ── Draggable segment row (for Add modal) ──

type SegmentDraft = { _key: string; name: string; metric_label: string }

let nextKey = 0
function makeKey() {
  return `seg-${++nextKey}`
}

function SortableSegmentRow({
  seg,
  index,
  total,
  onUpdate,
  onDuplicate,
  onRemove,
}: {
  seg: SegmentDraft
  index: number
  total: number
  onUpdate: (field: 'name' | 'metric_label', value: string) => void
  onDuplicate: () => void
  onRemove: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: seg._key })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : 'transform 150ms cubic-bezier(0.25, 1, 0.5, 1)',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex gap-2 items-start ${isDragging ? 'opacity-50 z-10' : ''}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="touch-none p-2 text-slate-400 hover:text-bevel-text dark:hover:text-slate-200 cursor-grab active:cursor-grabbing flex-shrink-0"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1">
        <input
          type="text"
          value={seg.name}
          onChange={e => onUpdate('name', e.target.value)}
          placeholder={`Segment ${index + 1} (e.g., 1km Run, Sled Push)`}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-bevel-text dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm"
        />
      </div>
      <select
        value={seg.metric_label}
        onChange={e => onUpdate('metric_label', e.target.value)}
        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-bevel-text dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
      >
        <option value="time">Time</option>
        <option value="reps">Reps</option>
        <option value="steps">Steps</option>
        <option value="distance">Distance</option>
        <option value="weight">Weight</option>
      </select>
      <button
        type="button"
        onClick={onDuplicate}
        title="Duplicate segment"
        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-400 hover:text-accent"
      >
        <Copy className="w-4 h-4" />
      </button>
      {total > 1 && (
        <button
          type="button"
          onClick={onRemove}
          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

// ── Add Benchmark Modal ──

function AddBenchmarkModal({ onClose, onSave }: {
  onClose: () => void
  onSave: (name: string, segments: { name: string; metric_label: string }[]) => void
}) {
  const [name, setName] = useState('')
  const [segments, setSegments] = useState<SegmentDraft[]>([
    { _key: makeKey(), name: '', metric_label: 'time' },
  ])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const addSegment = () => {
    setSegments([...segments, { _key: makeKey(), name: '', metric_label: 'time' }])
  }

  const removeSegment = (index: number) => {
    setSegments(segments.filter((_, i) => i !== index))
  }

  const duplicateSegment = (index: number) => {
    const copy = { ...segments[index], _key: makeKey() }
    const updated = [...segments]
    updated.splice(index + 1, 0, copy)
    setSegments(updated)
  }

  const updateSegment = (index: number, field: 'name' | 'metric_label', value: string) => {
    const updated = [...segments]
    updated[index] = { ...updated[index], [field]: value }
    setSegments(updated)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = segments.findIndex(s => s._key === active.id)
    const newIndex = segments.findIndex(s => s._key === over.id)
    setSegments(arrayMove(segments, oldIndex, newIndex))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validSegments = segments.filter(s => s.name.trim())
    if (!name.trim()) return
    onSave(name.trim(), validSegments.map(({ name, metric_label }) => ({ name, metric_label })))
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-heading font-bold text-bevel-text dark:text-white">
            Add Benchmark Workout
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-bevel-text-secondary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-bevel-text dark:text-slate-300 mb-1.5">
              Workout Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Hyrox Simulation, Stair Climber 50min"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-bevel-text dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/50"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-bevel-text dark:text-slate-300 mb-2">
              Segments
            </label>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={segments.map(s => s._key)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {segments.map((seg, i) => (
                    <SortableSegmentRow
                      key={seg._key}
                      seg={seg}
                      index={i}
                      total={segments.length}
                      onUpdate={(field, value) => updateSegment(i, field, value)}
                      onDuplicate={() => duplicateSegment(i)}
                      onRemove={() => removeSegment(i)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <button
              type="button"
              onClick={addSegment}
              className="mt-2 flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 font-medium"
            >
              <Plus className="w-4 h-4" /> Add Segment
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-bevel-text-secondary dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Workout
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Log Attempt Modal ──

function LogAttemptModal({ workout, onClose, onSave }: {
  workout: BenchmarkWorkoutWithSegments
  onClose: () => void
  onSave: (attemptedAt: string, notes: string | null, values: { segment_id: string; value: number }[]) => void
}) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [values, setValues] = useState<Record<string, { mins: string; secs: string; raw: string }>>(() => {
    const init: Record<string, { mins: string; secs: string; raw: string }> = {}
    workout.segments.forEach(seg => {
      init[seg.id] = { mins: '', secs: '', raw: '' }
    })
    return init
  })

  const updateValue = (segId: string, field: 'mins' | 'secs' | 'raw', val: string) => {
    setValues(prev => ({ ...prev, [segId]: { ...prev[segId], [field]: val } }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const segValues = workout.segments.map(seg => {
      const v = values[seg.id]
      let numericValue = 0
      if (seg.metric_label === 'time') {
        numericValue = (parseInt(v.mins || '0') * 60) + parseInt(v.secs || '0')
      } else {
        numericValue = parseFloat(v.raw || '0')
      }
      return { segment_id: seg.id, value: numericValue }
    })
    onSave(new Date(date).toISOString(), notes || null, segValues)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-heading font-bold text-bevel-text dark:text-white">
            Log Attempt
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-bevel-text-secondary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-bevel-text dark:text-slate-300 mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-bevel-text dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>

          <div className="space-y-4">
            {workout.segments.map((seg, i) => (
              <div key={seg.id}>
                <label className="block text-sm font-medium text-bevel-text dark:text-slate-300 mb-1.5">
                  {seg.name}
                  <span className="text-bevel-text-secondary dark:text-slate-500 ml-1.5 font-normal">
                    ({metricUnit(seg.metric_label)})
                  </span>
                </label>
                {seg.metric_label === 'time' ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={values[seg.id]?.mins ?? ''}
                      onChange={e => updateValue(seg.id, 'mins', e.target.value)}
                      placeholder="min"
                      className="w-24 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-bevel-text dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                    <span className="text-bevel-text-secondary">:</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={values[seg.id]?.secs ?? ''}
                      onChange={e => updateValue(seg.id, 'secs', e.target.value)}
                      placeholder="sec"
                      className="w-24 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-bevel-text dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                  </div>
                ) : (
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={values[seg.id]?.raw ?? ''}
                    onChange={e => updateValue(seg.id, 'raw', e.target.value)}
                    placeholder={`Enter ${seg.metric_label}`}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-bevel-text dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                )}
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-bevel-text dark:text-slate-300 mb-1.5">
              Notes <span className="text-bevel-text-secondary font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="How did it feel? Any conditions to note?"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-bevel-text dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-bevel-text-secondary dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-accent text-white font-medium hover:bg-accent/90"
            >
              Save Attempt
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Attempt Table (Spreadsheet View) ──

function AttemptTable({ workout, attempts, onDelete }: {
  workout: BenchmarkWorkoutWithSegments
  attempts: BenchmarkAttemptWithValues[]
  onDelete: (id: string) => void
}) {
  const sorted = [...attempts].sort((a, b) =>
    new Date(b.attempted_at).getTime() - new Date(a.attempted_at).getTime()
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th className="text-left py-3 px-3 font-medium text-bevel-text-secondary dark:text-slate-400">Date</th>
            {workout.segments.map(seg => (
              <th key={seg.id} className="text-left py-3 px-3 font-medium text-bevel-text-secondary dark:text-slate-400">
                {seg.name}
              </th>
            ))}
            <th className="text-left py-3 px-3 font-medium text-bevel-text-secondary dark:text-slate-400">Notes</th>
            <th className="py-3 px-3 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(attempt => (
            <tr key={attempt.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="py-3 px-3 text-bevel-text dark:text-slate-300 whitespace-nowrap">
                {new Date(attempt.attempted_at).toLocaleDateString()}
              </td>
              {workout.segments.map(seg => {
                const val = attempt.values.find(v => v.segment_id === seg.id)
                return (
                  <td key={seg.id} className="py-3 px-3 text-bevel-text dark:text-slate-300 font-mono">
                    {val ? formatValue(val.value, seg.metric_label) : '—'}
                  </td>
                )
              })}
              <td className="py-3 px-3 text-bevel-text-secondary dark:text-slate-400 max-w-[200px] truncate">
                {attempt.notes || '—'}
              </td>
              <td className="py-3 px-3">
                <button
                  onClick={() => onDelete(attempt.id)}
                  className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={workout.segments.length + 3} className="py-8 text-center text-bevel-text-secondary dark:text-slate-400">
                No attempts logged yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ── Attempt Chart ──

function AttemptChart({ workout, attempts }: {
  workout: BenchmarkWorkoutWithSegments
  attempts: BenchmarkAttemptWithValues[]
}) {
  const sorted = [...attempts].sort((a, b) =>
    new Date(a.attempted_at).getTime() - new Date(b.attempted_at).getTime()
  )

  if (sorted.length === 0) {
    return (
      <div className="py-12 text-center text-bevel-text-secondary dark:text-slate-400">
        Log at least one attempt to see the chart.
      </div>
    )
  }

  const chartData = sorted.map(attempt => {
    const point: Record<string, any> = {
      date: new Date(attempt.attempted_at).toLocaleDateString(),
    }
    workout.segments.forEach(seg => {
      const val = attempt.values.find(v => v.segment_id === seg.id)
      point[seg.id] = val ? val.value : null
    })
    return point
  })

  const formatTooltip: any = (value: number, name: string) => {
    const seg = workout.segments.find(s => s.id === name)
    if (!seg) return [value, name]
    return [formatValue(value, seg.metric_label), seg.name]
  }

  const formatYAxis = (value: number) => {
    // Check if all segments are time-based
    const allTime = workout.segments.every(s => s.metric_label === 'time')
    if (allTime) return formatValue(value, 'time')
    return value.toLocaleString()
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            tickLine={false}
            tickFormatter={formatYAxis}
          />
          <Tooltip
            formatter={formatTooltip}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              fontSize: '13px',
            }}
          />
          <Legend
            formatter={(value: string) => {
              const seg = workout.segments.find(s => s.id === value)
              return seg?.name || value
            }}
          />
          {workout.segments.map((seg, i) => (
            <Line
              key={seg.id}
              type="monotone"
              dataKey={seg.id}
              stroke={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Workout Detail View ──

function WorkoutDetail({ workout, onBack }: {
  workout: BenchmarkWorkoutWithSegments
  onBack: () => void
}) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [view, setView] = useState<'table' | 'chart'>('table')
  const [showLog, setShowLog] = useState(false)

  const { data: attempts = [], isLoading } = useQuery({
    queryKey: ['benchmark-attempts', workout.id],
    queryFn: () => benchmarkAttemptsService.getAttempts(workout.id),
    enabled: !!user,
  })

  const createAttemptMutation = useMutation({
    mutationFn: ({ attemptedAt, notes, values }: {
      attemptedAt: string
      notes: string | null
      values: { segment_id: string; value: number }[]
    }) => benchmarkAttemptsService.createAttempt(user!.id, workout.id, attemptedAt, notes, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benchmark-attempts', workout.id] })
      setShowLog(false)
    },
  })

  const deleteAttemptMutation = useMutation({
    mutationFn: (id: string) => benchmarkAttemptsService.deleteAttempt(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benchmark-attempts', workout.id] })
    },
  })

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-bevel-text-secondary"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-accent/10 dark:bg-accent/20 flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-accent" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-bevel-text dark:text-white">
            {workout.name}
          </h1>
        </div>
        <button
          onClick={() => setShowLog(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 text-sm"
        >
          <Plus className="w-4 h-4" /> Log Attempt
        </button>
      </div>

      {/* Segments summary */}
      <div className="flex flex-wrap gap-2 mb-6">
        {workout.segments.map((seg, i) => (
          <span
            key={seg.id}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] + '15',
              color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
            }}
          >
            {seg.name}
            <span className="opacity-60">({seg.metric_label})</span>
          </span>
        ))}
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-1 mb-4 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
        <button
          onClick={() => setView('table')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            view === 'table'
              ? 'bg-white dark:bg-slate-700 text-bevel-text dark:text-white shadow-sm'
              : 'text-bevel-text-secondary dark:text-slate-400 hover:text-bevel-text'
          }`}
        >
          <Table className="w-4 h-4" /> Table
        </button>
        <button
          onClick={() => setView('chart')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            view === 'chart'
              ? 'bg-white dark:bg-slate-700 text-bevel-text dark:text-white shadow-sm'
              : 'text-bevel-text-secondary dark:text-slate-400 hover:text-bevel-text'
          }`}
        >
          <LineChartIcon className="w-4 h-4" /> Chart
        </button>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm p-5">
        {isLoading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-pulse text-bevel-text-secondary">Loading...</div>
          </div>
        ) : view === 'table' ? (
          <AttemptTable
            workout={workout}
            attempts={attempts}
            onDelete={id => deleteAttemptMutation.mutate(id)}
          />
        ) : (
          <AttemptChart workout={workout} attempts={attempts} />
        )}
      </div>

      {showLog && (
        <LogAttemptModal
          workout={workout}
          onClose={() => setShowLog(false)}
          onSave={(attemptedAt, notes, values) =>
            createAttemptMutation.mutate({ attemptedAt, notes, values })
          }
        />
      )}
    </div>
  )
}

// ── Workout Card ──

function WorkoutCard({ workout, onOpen, onDelete }: {
  workout: BenchmarkWorkoutWithSegments
  onOpen: () => void
  onDelete: (id: string) => void
}) {
  return (
    <div
      onClick={onOpen}
      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-5 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 dark:bg-accent/20 flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-accent" />
          </div>
          <h3 className="font-heading font-bold text-bevel-text dark:text-white">
            {workout.name}
          </h3>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete(workout.id) }}
          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {workout.segments.length > 0 && (
        <div className="space-y-2">
          {workout.segments.map((seg, i) => (
            <div
              key={seg.id}
              className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/50"
            >
              <span className="text-sm text-bevel-text dark:text-slate-300">
                <span className="text-bevel-text-secondary dark:text-slate-500 mr-2">{i + 1}.</span>
                {seg.name}
              </span>
              <span className="text-xs font-medium text-bevel-text-secondary dark:text-slate-400 bg-slate-100 dark:bg-slate-600 px-2 py-0.5 rounded-full capitalize">
                {seg.metric_label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Page ──

export default function WorkoutsPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [selectedWorkout, setSelectedWorkout] = useState<BenchmarkWorkoutWithSegments | null>(null)

  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ['benchmark-workouts', user?.id],
    queryFn: () => benchmarkWorkoutsService.getWorkouts(user!.id),
    enabled: !!user,
  })

  const createMutation = useMutation({
    mutationFn: ({ name, segments }: { name: string; segments: { name: string; metric_label: string }[] }) =>
      benchmarkWorkoutsService.createWorkout(user!.id, name, segments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benchmark-workouts', user?.id] })
      setShowAdd(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => benchmarkWorkoutsService.deleteWorkout(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benchmark-workouts', user?.id] })
    },
  })

  // If a workout is selected, show its detail view
  if (selectedWorkout) {
    // Keep the workout data fresh from the query cache
    const freshWorkout = workouts.find(w => w.id === selectedWorkout.id) || selectedWorkout
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <WorkoutDetail workout={freshWorkout} onBack={() => setSelectedWorkout(null)} />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-bevel-text dark:text-white">
          Workouts
        </h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 text-sm"
        >
          <Plus className="w-4 h-4" /> Add Benchmark
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : workouts.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 dark:bg-accent/20 flex items-center justify-center mx-auto mb-4">
            <Dumbbell className="w-8 h-8 text-accent" />
          </div>
          <h2 className="text-lg font-heading font-bold text-bevel-text dark:text-white mb-2">
            No benchmark workouts yet
          </h2>
          <p className="text-bevel-text-secondary dark:text-slate-400 mb-6">
            Add your first benchmark workout to start tracking your progress.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-medium hover:bg-accent/90"
          >
            <Plus className="w-4 h-4" /> Add Benchmark
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {workouts.map(workout => (
            <WorkoutCard
              key={workout.id}
              workout={workout}
              onOpen={() => setSelectedWorkout(workout)}
              onDelete={id => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddBenchmarkModal
          onClose={() => setShowAdd(false)}
          onSave={(name, segments) => createMutation.mutate({ name, segments })}
        />
      )}
    </div>
  )
}
