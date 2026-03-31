'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical, MoreHorizontal,
  BookOpen, Zap, Flame, Eye, Shield, Heart, TrendingUp,
  Dumbbell, Palette, Crown, Activity, Users, Brain, Target,
  Compass, Wrench, Wind, PenLine, Mic, DollarSign, Sparkles,
} from 'lucide-react'
import type { Identity } from '@/lib/types/database'

type LucideIcon = React.ComponentType<{ className?: string }>

function getIdentityIcon(text: string): LucideIcon {
  const lower = text.toLowerCase()

  if (/read|book|librar|bibliophile/.test(lower)) return BookOpen
  if (/energy|energetic|bright|vibrant|alive/.test(lower)) return Zap
  if (/risk|bold|brave|courage|daring/.test(lower)) return Flame
  if (/clairvoyant|vision|clarit|intuition|insight/.test(lower)) return Eye
  if (/trust|honest|integrity|reliab|dependab/.test(lower)) return Shield
  if (/passion|love|enthusi/.test(lower)) return Heart
  if (/invest|wealth|rich|financ|prosper/.test(lower)) return TrendingUp
  if (/dollar|money/.test(lower)) return DollarSign
  if (/athlet|fitness|sport|run|train|workout|strong|hyrox/.test(lower)) return Dumbbell
  if (/health|healthy|wellness/.test(lower)) return Activity
  if (/creativ|art|design|imagin/.test(lower)) return Palette
  if (/leader|leadership|inspir|influenc/.test(lower)) return Crown
  if (/social|connect|network|friend|relat/.test(lower)) return Users
  if (/smart|intellig|genius|wise|wisdom/.test(lower)) return Brain
  if (/disciplin|consistent|routine|commit/.test(lower)) return Target
  if (/adventur|explor|travel|journey/.test(lower)) return Compass
  if (/entrepren|builder|creator|found/.test(lower)) return Wrench
  if (/meditat|calm|mindful|peace|zen/.test(lower)) return Wind
  if (/writ|author|journal|story/.test(lower)) return PenLine
  if (/speak|communicat|voice|present/.test(lower)) return Mic

  return Sparkles
}

interface SortableIdentityCardProps {
  identity: Identity
  onEdit?: (identity: Identity) => void
}

export function SortableIdentityCard({ identity, onEdit }: SortableIdentityCardProps) {
  const [isSelected, setIsSelected] = useState(false)
  const [iconKey, setIconKey] = useState(0)

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

  const Icon = getIdentityIcon(identity.text)

  const handleCardClick = () => {
    const next = !isSelected
    setIsSelected(next)
    if (next) setIconKey(k => k + 1)
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
      className={`bg-bevel-card dark:bg-slate-800 rounded-2xl p-5 cursor-pointer transition-all duration-300 ${
        isDragging
          ? 'opacity-50 shadow-bevel-lg scale-[1.02]'
          : isSelected
            ? 'shadow-bevel-lg scale-[1.02] ring-2 ring-identity/50 bg-identity/5 dark:bg-identity/10'
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

        {/* Icon — only visible when selected, pops in with animation */}
        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
          {isSelected && (
            <Icon
              key={iconKey}
              className="w-6 h-6 text-identity animate-identity-icon-pop"
            />
          )}
        </div>

        <div className="flex-1">
          <span className={`text-xs font-semibold uppercase tracking-wide transition-colors duration-300 ${
            isSelected ? 'text-identity' : 'text-identity'
          }`}>I live the lifestyle of</span>
          <div
            className={`prose prose-sm dark:prose-invert max-w-none [&_p]:m-0 font-medium leading-relaxed mt-1 transition-colors duration-300 ${
              isSelected
                ? 'text-identity dark:text-identity'
                : 'text-bevel-text dark:text-white'
            }`}
            dangerouslySetInnerHTML={{ __html: identity.text }}
          />
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
