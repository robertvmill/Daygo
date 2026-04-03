'use client'

import { useState } from 'react'
import { BookOpen, Check, MoreHorizontal } from 'lucide-react'
import type { JournalPromptWithEntry } from '@/lib/types/database'
import { RichTextEditor } from './RichTextEditor'

interface JournalCardProps {
  prompt: JournalPromptWithEntry
  onSave: (promptId: string, entry: string) => void
  onEdit?: (prompt: JournalPromptWithEntry) => void
}

function plainTextToHtml(text: string): string {
  if (!text) return ''
  if (text.includes('<')) return text // already HTML
  return text.split('\n').map(line => `<p>${line || '<br>'}</p>`).join('')
}

export function JournalCard({ prompt, onSave, onEdit }: JournalCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const initialContent = prompt.todayEntry || plainTextToHtml(prompt.template_text || '')
  const [entry, setEntry] = useState(initialContent)

  const handleSave = () => {
    onSave(prompt.id, entry)
    setIsEditing(false)
  }

  const handleOptionsClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.(prompt)
  }

  return (
    <div className="relative bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl p-5 border border-white/40 dark:border-slate-700/50 shadow-[0_8px_32px_rgba(249,115,22,0.12),0_4px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-[0_8px_32px_rgba(249,115,22,0.15),0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(249,115,22,0.18),0_6px_20px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.6)] dark:hover:shadow-[0_12px_40px_rgba(249,115,22,0.22),0_6px_20px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] hover:-translate-y-0.5">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/5 via-transparent to-amber-500/5 dark:from-orange-500/10 dark:to-amber-500/10 pointer-events-none" />
      <div className="relative flex items-start gap-4 mb-4">
        <div className="p-2 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl shadow-lg shadow-orange-500/25">
          <BookOpen className="w-5 h-5 text-white flex-shrink-0" />
        </div>
        <p className="text-bevel-text dark:text-white font-semibold flex-1 leading-relaxed">{prompt.prompt}</p>
        <button
          onClick={handleOptionsClick}
          className="p-2 -m-1 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-xl transition-colors flex-shrink-0 backdrop-blur-sm"
          aria-label="Journal prompt options"
        >
          <MoreHorizontal className="w-5 h-5 text-bevel-text-secondary dark:text-slate-400" />
        </button>
      </div>

      {isEditing ? (
        <div className="relative -mx-5 -mb-5 px-3 pb-3 pt-1">
          <RichTextEditor
            content={entry}
            onChange={setEntry}
            placeholder="Write your reflection..."
            className="w-full"
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSave}
              className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/35"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEntry(prompt.todayEntry || plainTextToHtml(prompt.template_text || ''))
                setIsEditing(false)
              }}
              className="px-5 py-2.5 bg-white/60 dark:bg-slate-700/60 hover:bg-white/80 dark:hover:bg-slate-600/80 text-bevel-text dark:text-white rounded-xl text-sm font-semibold transition-all backdrop-blur-sm border border-white/30 dark:border-slate-600/50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          className="relative ml-10 cursor-pointer"
          onClick={() => {
            setEntry(prompt.todayEntry || plainTextToHtml(prompt.template_text || ''))
            setIsEditing(true)
          }}
        >
          {prompt.todayEntry ? (
            <div className="flex items-start gap-2">
              <div className="p-1 bg-gradient-to-br from-green-400 to-green-600 rounded-full shadow-md shadow-green-500/20">
                <Check className="w-3.5 h-3.5 text-white flex-shrink-0" />
              </div>
              <div
                className="text-bevel-text dark:text-slate-200 leading-relaxed prose prose-sm dark:prose-invert max-w-none [&_p]:m-0 [&_ul]:my-1"
                dangerouslySetInnerHTML={{ __html: prompt.todayEntry }}
              />
            </div>
          ) : (
            <p className="text-bevel-text-secondary dark:text-slate-400 italic">Tap to write...</p>
          )}
        </div>
      )}
    </div>
  )
}
