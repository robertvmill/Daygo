'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, User, MoreHorizontal } from 'lucide-react'
import type { Identity } from '@/lib/types/database'

interface SortableIdentityCardProps {
  identity: Identity
  onEdit?: (identity: Identity) => void
}

export function SortableIdentityCard({ identity, onEdit }: SortableIdentityCardProps) {
  const [isGlowing, setIsGlowing] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: identity.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : 'transform 150ms cubic-bezier(0.25, 1, 0.5, 1)',
  }

  const handleCardClick = () => {
    setIsGlowing(!isGlowing)
  }

  const handleOptionsClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.(identity)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleCardClick}
      className={`bg-bevel-card dark:bg-slate-800 rounded-2xl p-5 cursor-pointer transition-all duration-200 ${
        isDragging
          ? 'opacity-50 shadow-bevel-lg scale-[1.02]'
          : isGlowing
            ? 'shadow-bevel-lg scale-[1.02] ring-2 ring-pink-500/30'
            : 'shadow-bevel hover:shadow-bevel-md'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="touch-none p-1 text-bevel-text-secondary dark:text-slate-400 hover:text-bevel-text dark:hover:text-slate-200 cursor-grab active:cursor-grabbing flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-5 h-5" />
        </button>

        <div className={`flex-shrink-0 transition-all duration-200 ${
          isGlowing ? 'scale-125' : ''
        }`}>
          <User className="w-6 h-6 text-pink-500" />
        </div>
        <div className="flex-1">
          <span className="text-xs font-semibold text-pink-500 uppercase tracking-wide">Will I live the lifestyle of</span>
          <div className="flex items-end gap-0">
            <div
              className="text-bevel-text dark:text-white prose prose-sm dark:prose-invert max-w-none [&_p]:m-0 font-medium leading-relaxed mt-1"
              dangerouslySetInnerHTML={{ __html: identity.text }}
            />
            <span className="text-pink-500 font-semibold">?</span>
          </div>
        </div>
        <button
          onClick={handleOptionsClick}
          className="p-2 -m-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors flex-shrink-0"
          aria-label="Lifestyle options"
        >
          <MoreHorizontal className="w-5 h-5 text-bevel-text-secondary dark:text-slate-400" />
        </button>
      </div>
    </div>
  )
}
