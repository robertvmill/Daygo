'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, MoreHorizontal, Check, X } from 'lucide-react'
import type { HabitWithLog } from '@/lib/types/database'
import confetti from 'canvas-confetti'

interface SortableHabitCardProps {
  habit: HabitWithLog
  onEdit?: (habit: HabitWithLog) => void
  onToggle?: (habitId: string, completed: boolean) => void
}

export function SortableHabitCard({ habit, onEdit, onToggle }: SortableHabitCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: habit.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : 'transform 150ms cubic-bezier(0.25, 1, 0.5, 1)',
  }

  const handleYes = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!habit.completed) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const x = (rect.left + rect.width / 2) / window.innerWidth
      const y = (rect.top + rect.height / 2) / window.innerHeight
      confetti({ particleCount: 40, spread: 70, origin: { x, y }, startVelocity: 20, gravity: 0.8, scalar: 0.8, ticks: 60, colors: ['#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4'] })
    }
    onToggle?.(habit.id, true)
  }

  const handleNo = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggle?.(habit.id, false)
  }

  const handleOptionsClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.(habit)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-bevel-card dark:bg-slate-800 rounded-2xl p-4 transition-all duration-200 ${
        isDragging
          ? 'opacity-50 shadow-bevel-lg scale-[1.02]'
          : habit.completed
            ? 'shadow-bevel ring-2 ring-teal/20'
            : 'shadow-bevel hover:shadow-bevel-md'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="touch-none p-1 mt-0.5 text-bevel-text-secondary dark:text-slate-400 hover:text-bevel-text dark:hover:text-slate-200 cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className={`font-semibold leading-snug ${
              habit.completed
                ? 'text-teal dark:text-teal-400'
                : 'text-bevel-text dark:text-white'
            }`}>
              Will I {habit.name.toLowerCase()} today?
            </h3>
            <button
              onClick={handleOptionsClick}
              className="p-1.5 -m-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors flex-shrink-0"
              aria-label="Habit options"
            >
              <MoreHorizontal className="w-4 h-4 text-bevel-text-secondary dark:text-slate-400" />
            </button>
          </div>

          {habit.description && (
            <p className="text-sm text-bevel-text-secondary dark:text-slate-400 mb-3">{habit.description}</p>
          )}

          {/* Yes / No buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleYes}
              className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-1.5 ${
                habit.completed
                  ? 'bg-teal text-white shadow-md scale-[1.02]'
                  : 'bg-teal/10 text-teal hover:bg-teal/20 active:scale-[0.98]'
              }`}
            >
              <Check className="w-4 h-4" />
              Yes
            </button>
            <button
              onClick={handleNo}
              className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-1.5 ${
                habit.completed === false && habit.missNote
                  ? 'bg-red-500 text-white shadow-md scale-[1.02]'
                  : 'bg-gray-100 dark:bg-slate-700 text-bevel-text-secondary dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600 active:scale-[0.98]'
              }`}
            >
              <X className="w-4 h-4" />
              No
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
