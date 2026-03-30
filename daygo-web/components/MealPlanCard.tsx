'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles, Loader2, Camera, X, Sun, Moon, Shuffle, Plus, Trash2, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import Image from 'next/image'
import { mealInspirationsService } from '@/lib/services/mealInspirations'
import { mealLibraryService, type MealLibraryItem } from '@/lib/services/mealLibrary'

interface MealPlanCardProps {
  userId: string
  selectedDate: Date
}

function formatDate(d: Date) {
  return d.toISOString().split('T')[0]
}

const MEAL_SLOTS = [
  { key: 'lunch' as const, label: 'Lunch', Icon: Sun, time: 'Midday' },
  { key: 'dinner' as const, label: 'Dinner', Icon: Moon, time: 'Evening' },
]

// ─── Library meal card ────────────────────────────────────────────────────────
function LibraryCard({
  meal,
  isSelected,
  onSelect,
  onDelete,
  onAssign,
}: {
  meal: MealLibraryItem
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  onAssign: (slot: 'lunch' | 'dinner') => void
}) {
  return (
    <div className="flex-shrink-0 w-[88px]">
      <button
        onClick={onSelect}
        className={`relative w-[88px] h-[88px] rounded-xl overflow-hidden group transition-all ${
          isSelected ? 'ring-2 ring-emerald-500 ring-offset-1' : ''
        }`}
      >
        {meal.image_url ? (
          <Image src={meal.image_url} alt={meal.title} fill className="object-cover" sizes="88px" />
        ) : (
          <div className="w-full h-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-gray-400 dark:text-slate-500" />
          </div>
        )}
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/40 flex items-end justify-end p-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
          >
            <Trash2 className="w-3 h-3 text-white" />
          </button>
        </div>
        {/* Label */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
          <p className="text-[10px] text-white truncate text-center">{meal.title}</p>
        </div>
      </button>
      {/* Slot picker — shows when selected */}
      {isSelected && (
        <div className="mt-1 flex gap-1">
          <button
            onClick={() => onAssign('lunch')}
            className="flex-1 py-0.5 text-[9px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-md hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors"
          >
            Lunch
          </button>
          <button
            onClick={() => onAssign('dinner')}
            className="flex-1 py-0.5 text-[9px] font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition-colors"
          >
            Dinner
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function MealPlanCard({ userId, selectedDate }: MealPlanCardProps) {
  const queryClient = useQueryClient()
  const date = formatDate(selectedDate)

  // Today's plan state
  const [generating, setGenerating] = useState(false)
  const [pickingRandom, setPickingRandom] = useState(false)
  const [uploadingMeal, setUploadingMeal] = useState<'lunch' | 'dinner' | null>(null)
  const [titles, setTitles] = useState({ lunch: '', dinner: '' })
  const [notes, setNotes] = useState({ lunch: '', dinner: '' })
  const [initialized, setInitialized] = useState(false)
  const [focusedSlot, setFocusedSlot] = useState<'lunch' | 'dinner' | null>(null)
  const [addFormFocused, setAddFormFocused] = useState(false)

  // Collection state
  const [showCollection, setShowCollection] = useState(false)
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null)
  const [addingMeal, setAddingMeal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null)
  const [uploadingLibrary, setUploadingLibrary] = useState(false)

  const lunchFileRef = useRef<HTMLInputElement>(null)
  const dinnerFileRef = useRef<HTMLInputElement>(null)
  const libraryFileRef = useRef<HTMLInputElement>(null)
  const fileRefs = { lunch: lunchFileRef, dinner: dinnerFileRef }

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: meals = [], isLoading } = useQuery({
    queryKey: ['meal-inspirations', userId, date],
    queryFn: () => mealInspirationsService.getByDate(userId, date),
    enabled: !!userId,
  })

  const { data: library = [] } = useQuery({
    queryKey: ['meal-library', userId],
    queryFn: () => mealLibraryService.getAll(userId),
    enabled: !!userId,
  })

  const lunchMeal = meals.find(m => m.meal_type === 'lunch')
  const dinnerMeal = meals.find(m => m.meal_type === 'dinner')

  // Sync local state on load / date change
  useEffect(() => { setInitialized(false) }, [date])
  useEffect(() => {
    if (!initialized && !isLoading) {
      setTitles({ lunch: lunchMeal?.title ?? '', dinner: dinnerMeal?.title ?? '' })
      setNotes({ lunch: lunchMeal?.notes ?? '', dinner: dinnerMeal?.notes ?? '' })
      setInitialized(true)
    }
  }, [meals, isLoading, initialized, lunchMeal, dinnerMeal])

  // ── Mutations ──────────────────────────────────────────────────────────────
  const upsertMutation = useMutation({
    mutationFn: async ({ mealType, updates }: {
      mealType: 'lunch' | 'dinner'
      updates: { title?: string; notes?: string; meal_image_url?: string | null }
    }) => {
      const existing = meals.find(m => m.meal_type === mealType)
      if (existing) return mealInspirationsService.update(existing.id, userId, updates)
      return mealInspirationsService.create(userId, date, { meal_type: mealType, ...updates })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meal-inspirations', userId, date] }),
  })

  const uploadFile = useCallback((mealType: 'lunch' | 'dinner', file: File) => {
    setUploadingMeal(mealType)
    slotUploadMutation.mutate({ mealType, file })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const slotUploadMutation = useMutation({
    mutationFn: async ({ mealType, file }: { mealType: 'lunch' | 'dinner'; file: File }) => {
      const url = await mealInspirationsService.uploadImage(userId, file)
      const existing = meals.find(m => m.meal_type === mealType)
      if (existing) return mealInspirationsService.update(existing.id, userId, { meal_image_url: url })
      return mealInspirationsService.create(userId, date, { meal_type: mealType, meal_image_url: url })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meal-inspirations', userId, date] }),
    onSettled: () => setUploadingMeal(null),
  })

  const addToLibraryMutation = useMutation({
    mutationFn: () => mealLibraryService.create(userId, {
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      image_url: newImageUrl,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-library', userId] })
      setAddingMeal(false)
      setNewTitle('')
      setNewDescription('')
      setNewImageUrl(null)
    },
  })

  const deleteFromLibraryMutation = useMutation({
    mutationFn: (id: string) => mealLibraryService.delete(id, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meal-library', userId] }),
  })

  // ── Paste handler (today's slots + add recipe form) ───────────────────────
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!focusedSlot && !addFormFocused) return
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (!file) break
          e.preventDefault()
          if (addFormFocused) {
            handleLibraryImageUpload(file)
          } else if (focusedSlot) {
            uploadFile(focusedSlot, file)
          }
          break
        }
      }
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [focusedSlot, addFormFocused, uploadFile]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/generate-meals', { method: 'POST' })
      if (!res.ok) throw new Error('Generation failed')
      const { lunch, dinner } = await res.json()
      setTitles({ lunch: lunch.title ?? '', dinner: dinner.title ?? '' })
      setNotes({ lunch: lunch.notes ?? '', dinner: dinner.notes ?? '' })
      await Promise.all([
        upsertMutation.mutateAsync({ mealType: 'lunch', updates: { title: lunch.title, notes: lunch.notes } }),
        upsertMutation.mutateAsync({ mealType: 'dinner', updates: { title: dinner.title, notes: dinner.notes } }),
      ])
    } catch (e) { console.error('Failed to generate meals:', e) }
    finally { setGenerating(false) }
  }

  const handlePickRandom = async () => {
    if (library.length === 0) { setShowCollection(true); return }
    setPickingRandom(true)
    try {
      const shuffled = [...library].sort(() => Math.random() - 0.5)
      const lunchPick = shuffled[0]
      const dinnerPick = shuffled.length > 1 ? shuffled[1] : shuffled[0]
      setTitles({ lunch: lunchPick.title, dinner: dinnerPick.title })
      setNotes({ lunch: lunchPick.description ?? '', dinner: dinnerPick.description ?? '' })
      await Promise.all([
        upsertMutation.mutateAsync({ mealType: 'lunch', updates: { title: lunchPick.title, notes: lunchPick.description ?? '', meal_image_url: lunchPick.image_url } }),
        upsertMutation.mutateAsync({ mealType: 'dinner', updates: { title: dinnerPick.title, notes: dinnerPick.description ?? '', meal_image_url: dinnerPick.image_url } }),
      ])
    } catch (e) { console.error('Failed to pick random:', e) }
    finally { setPickingRandom(false) }
  }

  const handleAssignFromLibrary = async (meal: MealLibraryItem, slot: 'lunch' | 'dinner') => {
    if (slot === 'lunch') setTitles(prev => ({ ...prev, lunch: meal.title }))
    else setTitles(prev => ({ ...prev, dinner: meal.title }))
    if (slot === 'lunch') setNotes(prev => ({ ...prev, lunch: meal.description ?? '' }))
    else setNotes(prev => ({ ...prev, dinner: meal.description ?? '' }))
    await upsertMutation.mutateAsync({ mealType: slot, updates: { title: meal.title, notes: meal.description ?? '', meal_image_url: meal.image_url } })
    setSelectedLibraryId(null)
  }

  const handleTitleBlur = (mealType: 'lunch' | 'dinner') => {
    const title = titles[mealType]
    const existing = meals.find(m => m.meal_type === mealType)
    if (!existing && !title) return
    upsertMutation.mutate({ mealType, updates: { title } })
  }

  const handleNotesBlur = (mealType: 'lunch' | 'dinner') => {
    const note = notes[mealType]
    const existing = meals.find(m => m.meal_type === mealType)
    if (!existing && !note) return
    upsertMutation.mutate({ mealType, updates: { notes: note } })
  }

  const handleLibraryImageUpload = async (file: File) => {
    setUploadingLibrary(true)
    try {
      const url = await mealLibraryService.uploadImage(userId, file)
      setNewImageUrl(url)
    } catch (e) { console.error('Failed to upload library image:', e) }
    finally { setUploadingLibrary(false) }
  }

  if (isLoading) {
    return (
      <div className="bg-bevel-card dark:bg-slate-800 shadow-bevel rounded-2xl p-5 flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-bevel-card dark:bg-slate-800 shadow-bevel rounded-2xl p-5 space-y-4">

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-4 -mt-1 -mb-2">
        <button
          onClick={handlePickRandom}
          disabled={pickingRandom}
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors disabled:opacity-50"
        >
          {pickingRandom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shuffle className="w-3.5 h-3.5" />}
          Pick Random
        </button>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors disabled:opacity-50"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Generate
        </button>
      </div>

      {/* Today's Lunch + Dinner slots */}
      <div className="space-y-5">
        {MEAL_SLOTS.map(({ key, label, Icon, time }) => {
          const meal = key === 'lunch' ? lunchMeal : dinnerMeal
          const isUploading = uploadingMeal === key
          const isFocused = focusedSlot === key

          return (
            <div
              key={key}
              className="space-y-2"
              tabIndex={-1}
              onFocus={() => setFocusedSlot(key)}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocusedSlot(null)
              }}
            >
              <div className="flex items-center gap-1.5 text-gray-500 dark:text-slate-400">
                <Icon className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
                <span className="text-xs text-gray-400 dark:text-slate-500">· {time}</span>
                {isFocused && !meal?.meal_image_url && (
                  <span className="ml-auto text-[10px] text-gray-400 dark:text-slate-500">Ctrl+V to paste photo</span>
                )}
              </div>

              <div className="flex gap-3">
                {/* Photo */}
                <div className="flex-shrink-0">
                  <div className={`relative w-[80px] h-[80px] rounded-xl overflow-hidden group transition-colors ${
                    meal?.meal_image_url
                      ? 'bg-gray-100 dark:bg-slate-700'
                      : 'bg-gray-50 dark:bg-slate-700/50 border-2 border-dashed border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                  }`}>
                    {meal?.meal_image_url ? (
                      <>
                        <Image src={meal.meal_image_url} alt={titles[key] || label} fill className="object-cover" sizes="80px" />
                        <button
                          onClick={() => upsertMutation.mutate({ mealType: key, updates: { meal_image_url: null } })}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/50 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                        <button onClick={() => fileRefs[key].current?.click()} className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" aria-label={`Replace ${label} photo`} />
                      </>
                    ) : (
                      <button onClick={() => fileRefs[key].current?.click()} disabled={isUploading} className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-400 dark:text-slate-500 hover:text-gray-500 dark:hover:text-slate-400 transition-colors">
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                          <><Camera className="w-4 h-4" /><span className="text-[9px] font-medium">Add photo</span></>
                        )}
                      </button>
                    )}
                    <input ref={fileRefs[key]} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { uploadFile(key, f); e.target.value = '' } }} />
                  </div>
                </div>

                {/* Title + Notes */}
                <div className="flex-1 space-y-1.5 min-w-0">
                  <input
                    type="text"
                    placeholder={`What's for ${label.toLowerCase()}?`}
                    value={titles[key]}
                    onChange={(e) => setTitles(prev => ({ ...prev, [key]: e.target.value }))}
                    onBlur={() => handleTitleBlur(key)}
                    className="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 placeholder:text-gray-400 dark:placeholder:text-slate-500 text-gray-900 dark:text-slate-100"
                  />
                  <textarea
                    placeholder="Ingredients, prep tips, notes..."
                    value={notes[key]}
                    onChange={(e) => setNotes(prev => ({ ...prev, [key]: e.target.value }))}
                    onBlur={() => handleNotesBlur(key)}
                    rows={2}
                    className="w-full px-3 py-1.5 text-xs bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 placeholder:text-gray-400 dark:placeholder:text-slate-500 text-gray-600 dark:text-slate-300 resize-none"
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* My Meal Collection */}
      <div className="border-t border-gray-100 dark:border-slate-700/50 pt-3">
        <button
          onClick={() => setShowCollection(v => !v)}
          className="flex items-center gap-2 w-full text-left group"
        >
          <BookOpen className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500 group-hover:text-gray-600 dark:group-hover:text-slate-300 transition-colors">
            My Meals {library.length > 0 && `(${library.length})`}
          </span>
          {showCollection
            ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 ml-auto" />
            : <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 ml-auto" />}
        </button>

        {showCollection && (
          <div className="mt-3 space-y-3">
            {/* Add new meal form */}
            {addingMeal ? (
              <div
                className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3 space-y-2"
                onFocus={() => setAddFormFocused(true)}
                onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setAddFormFocused(false) }}
              >
                <div className="flex gap-3">
                  {/* Image picker */}
                  <div className="flex-shrink-0">
                    <div className={`relative w-[72px] h-[72px] rounded-xl overflow-hidden group transition-colors ${
                      newImageUrl ? 'bg-gray-100 dark:bg-slate-700' : 'bg-white dark:bg-slate-700 border-2 border-dashed border-gray-200 dark:border-slate-600 hover:border-gray-300'
                    }`}>
                      {newImageUrl ? (
                        <>
                          <Image src={newImageUrl} alt="New meal" fill className="object-cover" sizes="72px" />
                          <button onClick={() => setNewImageUrl(null)} className="absolute top-1 right-1 w-5 h-5 bg-black/50 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => libraryFileRef.current?.click()} disabled={uploadingLibrary} className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-400 dark:text-slate-500 hover:text-gray-500 transition-colors">
                          {uploadingLibrary ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Camera className="w-4 h-4" /><span className="text-[9px]">Photo</span></>}
                        </button>
                      )}
                      <input ref={libraryFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { handleLibraryImageUpload(f); e.target.value = '' } }} />
                    </div>
                  </div>

                  <div className="flex-1 space-y-1.5 min-w-0">
                    {!newImageUrl && addFormFocused && (
                      <p className="text-[10px] text-gray-400 dark:text-slate-500">Ctrl+V to paste a photo</p>
                    )}
                    <input
                      type="text"
                      placeholder="Meal name *"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      autoFocus
                      className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 placeholder:text-gray-400 dark:placeholder:text-slate-500 text-gray-900 dark:text-slate-100"
                    />
                    <textarea
                      placeholder="Description, ingredients, notes..."
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 placeholder:text-gray-400 dark:placeholder:text-slate-500 text-gray-600 dark:text-slate-300 resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setAddingMeal(false); setNewTitle(''); setNewDescription(''); setNewImageUrl(null) }} className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={() => { if (newTitle.trim()) addToLibraryMutation.mutate() }}
                    disabled={!newTitle.trim() || addToLibraryMutation.isPending}
                    className="px-3 py-1 text-xs bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg transition-colors font-medium"
                  >
                    {addToLibraryMutation.isPending ? 'Saving...' : 'Save to Collection'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingMeal(true)}
                className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add meal to collection
              </button>
            )}

            {/* Collection grid */}
            {library.length > 0 ? (
              <>
                {selectedLibraryId && (
                  <p className="text-[10px] text-gray-400 dark:text-slate-500">Tap Lunch or Dinner to assign this meal to today</p>
                )}
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  {library.map((meal) => (
                    <LibraryCard
                      key={meal.id}
                      meal={meal}
                      isSelected={selectedLibraryId === meal.id}
                      onSelect={() => setSelectedLibraryId(prev => prev === meal.id ? null : meal.id)}
                      onDelete={() => deleteFromLibraryMutation.mutate(meal.id)}
                      onAssign={(slot) => handleAssignFromLibrary(meal, slot)}
                    />
                  ))}
                </div>
              </>
            ) : !addingMeal && (
              <p className="text-xs text-gray-400 dark:text-slate-500 py-2">
                No meals saved yet. Add your favourites and pick from them any morning.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
