'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, MoreHorizontal, Check } from 'lucide-react'
import type { HabitWithLog } from '@/lib/types/database'
import confetti from 'canvas-confetti'

interface SortableHabitCardProps {
  habit: HabitWithLog
  index: number
  onEdit?: (habit: HabitWithLog) => void
  onToggle?: (habitId: string, completed: boolean) => void
}

export function SortableHabitCard({ habit, index, onEdit, onToggle }: SortableHabitCardProps) {
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

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!habit.completed) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const x = (rect.left + rect.width / 2) / window.innerWidth
      const y = (rect.top + rect.height / 2) / window.innerHeight
      confetti({ particleCount: 40, spread: 70, origin: { x, y }, startVelocity: 20, gravity: 0.8, scalar: 0.8, ticks: 60, colors: ['#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4'] })
    }
    onToggle?.(habit.id, !habit.completed)
  }

  const handleOptionsClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.(habit)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-[1rem] px-2 py-2 transition-all duration-200 ${
        isDragging
          ? 'opacity-50 scale-[1.01] bg-white/60 dark:bg-slate-800/60'
          : habit.completed
            ? 'bg-white/45 dark:bg-slate-800/35'
            : 'shadow-bevel hover:shadow-bevel-md'
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="touch-none p-1 text-bevel-text-secondary/80 dark:text-slate-500 hover:text-bevel-text dark:hover:text-slate-200 cursor-grab active:cursor-grabbing flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <span className="text-[11px] font-semibold text-bevel-text-secondary/50 dark:text-slate-600 w-4 text-center flex-shrink-0 select-none">
          {index + 1}
        </span>

        <button
          onClick={handleToggle}
          className={`flex-shrink-0 w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center active:scale-90 ${
            habit.completed
              ? 'bg-teal border-teal'
              : 'border-bevel-text-secondary/40 dark:border-slate-600 hover:border-teal/60'
          }`}
          aria-label={habit.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {habit.completed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </button>

        <div className="flex-1 min-w-0">
          <p className={`font-medium text-[14px] leading-snug truncate ${
            habit.completed
              ? 'text-teal dark:text-teal-400 line-through decoration-teal/50'
              : 'text-bevel-text dark:text-white'
          }`}>
            {habit.name}
          </p>
          {(habit.description || habit.time_of_day) && (
            <div className="flex items-center gap-1.5 mt-0.5">
              {habit.time_of_day && (
                <span className="text-[11px] font-medium text-teal/70 dark:text-teal-500/70 bg-teal/8 dark:bg-teal/10 px-1.5 py-px rounded-full flex-shrink-0">
                  {habit.time_of_day}
                </span>
              )}
              {habit.description && (
                <p className="text-[12px] text-bevel-text-secondary dark:text-slate-400 truncate leading-tight">{habit.description}</p>
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleOptionsClick}
          className="p-1 hover:bg-gray-100/70 dark:hover:bg-slate-700/70 rounded-lg transition-colors flex-shrink-0"
          aria-label="Habit options"
        >
          <MoreHorizontal className="w-3.5 h-3.5 text-bevel-text-secondary dark:text-slate-400" />
        </button>
      </div>
    </div>
  )
}
