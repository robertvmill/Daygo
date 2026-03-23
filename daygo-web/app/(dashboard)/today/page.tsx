'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSwipeable } from 'react-swipeable'
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  X,
  Sparkles,
  RefreshCw,
  Pencil,
  CalendarDays,
  Shuffle,
  Volume2,
  Loader2,
  Pause,
  Settings,
  BookOpen,
  Heart,
  Star,
  Target,
  Lightbulb,
  Flame,
  Trophy,
  Compass,
  Brain,
  Zap,
  Sun,
  Moon,
  Cloud,
  Smile,
  Pen,
  Check,
  Wrench,
  Users,
  Coffee,
  Dumbbell,
  Repeat,
  Focus,
  type LucideIcon
} from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
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
} from '@dnd-kit/sortable'
import { useAuthStore } from '@/lib/auth-store'
import { habitsService } from '@/lib/services/habits'
import { mantrasService } from '@/lib/services/mantras'
import { journalService } from '@/lib/services/journal'
import { goalsService } from '@/lib/services/goals'
import { pepTalksService, type PepTalk } from '@/lib/services/pepTalks'
import { todosService } from '@/lib/services/todos'
import { visionsService } from '@/lib/services/visions'
import { identitiesService } from '@/lib/services/identities'
import { valuesService } from '@/lib/services/values'
import { booksService } from '@/lib/services/books'
import { scheduleService } from '@/lib/services/schedule'
import { calendarRulesService } from '@/lib/services/calendarRules'
import { habitMissNotesService } from '@/lib/services/habitMissNotes'
import { userPreferencesService } from '@/lib/services/userPreferences'
import { dailyNotesService } from '@/lib/services/dailyNotes'
import { scheduleTemplatesService } from '@/lib/services/scheduleTemplates'
import { aiJournalsService } from '@/lib/services/aiJournals'
import { profilesService } from '@/lib/services/profiles'
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts'
import { expensesService } from '@/lib/services/expenses'
import { pushupsService } from '@/lib/services/pushups'
import { giftIdeasService } from '@/lib/services/giftIdeas'
import { dailyReflectionsService } from '@/lib/services/dailyReflections'
import { SortableHabitCard } from '@/components/SortableHabitCard'
import { SortableMantraCard } from '@/components/SortableMantraCard'
import { MantraCard } from '@/components/MantraCard'
import { SortableVisionCard } from '@/components/SortableVisionCard'
import { HomeVisionSection } from '@/components/HomeVisionSection'
import { SortableIdentityCard } from '@/components/SortableIdentityCard'
import { SortableTodoCard } from '@/components/SortableTodoCard'
import { SortableJournalCard, JOURNAL_ICON_OPTIONS, JOURNAL_COLOR_OPTIONS } from '@/components/SortableJournalCard'
import { ScheduleGrid } from '@/components/ScheduleGrid'
import { CalendarRulesPanel } from '@/components/CalendarRulesPanel'
import { GoogleCalendarPanel } from '@/components/GoogleCalendarPanel'
import { SchedulePreferences } from '@/components/SchedulePreferences'
import { DailyNotes } from '@/components/DailyNotes'
import { ScheduleTemplates } from '@/components/ScheduleTemplates'
import { TimePicker } from '@/components/TimePicker'
import { ScoreRing } from '@/components/ScoreRing'
import { RichTextEditor } from '@/components/RichTextEditor'
import { PepTalkAudioPlayer } from '@/components/PepTalkAudioPlayer'
import { HealthyFoodsCard } from '@/components/HealthyFoodsCard'
import type { HabitWithLog, Mantra, Todo, Vision, Identity, JournalPromptWithEntry, ScheduleEvent, CalendarRule, Goal, ScheduleTemplate, AIJournal, Book, Value, Expense, ExpenseCategory, PushupLog } from '@/lib/types/database'
import { calculateMissionScore } from '@/lib/services/missionScore'
import confetti from 'canvas-confetti'

// Map icon names to components for journal icon picker
const journalIconMap: Record<string, LucideIcon> = {
  'book-open': BookOpen,
  'heart': Heart,
  'star': Star,
  'target': Target,
  'lightbulb': Lightbulb,
  'flame': Flame,
  'trophy': Trophy,
  'compass': Compass,
  'brain': Brain,
  'sparkles': Sparkles,
  'zap': Zap,
  'sun': Sun,
  'moon': Moon,
  'cloud': Cloud,
  'smile': Smile,
  'pen': Pen,
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatDisplayDate(date: Date): string {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (formatDate(date) === formatDate(today)) return 'Today'
  if (formatDate(date) === formatDate(yesterday)) return 'Yesterday'
  if (formatDate(date) === formatDate(tomorrow)) return 'Tomorrow'

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export default function TodayPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showAddModal, setShowAddModal] = useState(false)
  const [addType, setAddType] = useState<'habit' | 'mantra' | 'journal' | 'todo' | 'pep-talk' | 'vision' | 'identity' | 'ai-journal' | 'book' | null>(null)
  const [newItemText, setNewItemText] = useState('')
  const [newItemDescription, setNewItemDescription] = useState('')
  const [selectedHabit, setSelectedHabit] = useState<HabitWithLog | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isEditingHabit, setIsEditingHabit] = useState(false)
  const [editHabitName, setEditHabitName] = useState('')
  const [editHabitDescription, setEditHabitDescription] = useState('')
  const [selectedMantra, setSelectedMantra] = useState<Mantra | null>(null)
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null)
  const [selectedVision, setSelectedVision] = useState<Vision | null>(null)
  const [isEditingVision, setIsEditingVision] = useState(false)
  const [editVisionText, setEditVisionText] = useState('')
  const [selectedIdentity, setSelectedIdentity] = useState<Identity | null>(null)
  const [isEditingIdentity, setIsEditingIdentity] = useState(false)
  const [editIdentityText, setEditIdentityText] = useState('')
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [newLearning, setNewLearning] = useState('')
  const [newBookAuthor, setNewBookAuthor] = useState('')
  const [selectedJournal, setSelectedJournal] = useState<JournalPromptWithEntry | null>(null)
  const [isEditingJournal, setIsEditingJournal] = useState(false)
  const [editJournalText, setEditJournalText] = useState('')
  const [editJournalTemplate, setEditJournalTemplate] = useState('')
  const [editJournalIcon, setEditJournalIcon] = useState('')
  const [editJournalColor, setEditJournalColor] = useState('#E97451')
  const [showAddHint, setShowAddHint] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [planningStatus, setPlanningStatus] = useState<string>('')
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventDescription, setNewEventDescription] = useState('')
  const [newEventStartTime, setNewEventStartTime] = useState('09:00:00')
  const [newEventEndTime, setNewEventEndTime] = useState('09:30:00')
  const [showMissNoteModal, setShowMissNoteModal] = useState(false)
  const [missNoteText, setMissNoteText] = useState('')
  const [gcalNotification, setGcalNotification] = useState<string | null>(null)
  const [showPromptModal, setShowPromptModal] = useState(false)
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)
  const [slideInDirection, setSlideInDirection] = useState<'left' | 'right' | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const pepTalkTextareaRef = useRef<HTMLTextAreaElement>(null)
  const [aiJournalPrompt, setAiJournalPrompt] = useState('')
  const [aiJournalResponse, setAiJournalResponse] = useState('')
  const [isGeneratingAiJournal, setIsGeneratingAiJournal] = useState(false)
  const [selectedAiJournal, setSelectedAiJournal] = useState<AIJournal | null>(null)
  const [localDailyNote, setLocalDailyNote] = useState('')
  const [dailyMantraIds, setDailyMantraIds] = useState<string[]>([])
  const [isGeneratingVisionAudio, setIsGeneratingVisionAudio] = useState(false)
  const [isPlayingVisionAudio, setIsPlayingVisionAudio] = useState(false)
  const visionAudioRef = useRef<HTMLAudioElement | null>(null)
  const [showVisionVoiceSettings, setShowVisionVoiceSettings] = useState(false)
  const [visionVoice, setVisionVoice] = useState<'rachel' | 'bella' | 'domi' | 'elli' | 'antoni' | 'arnold' | 'adam' | 'josh' | 'sam'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('daygo-vision-voice')
      // Migrate old OpenAI voice names to ElevenLabs
      if (stored && ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(stored)) {
        localStorage.setItem('daygo-vision-voice', 'rachel')
        return 'rachel'
      }
      return (stored as any) || 'rachel'
    }
    return 'rachel'
  })
  const [visionSpeed, setVisionSpeed] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return parseFloat(localStorage.getItem('daygo-vision-speed') || '1.0')
    }
    return 1.0
  })

  // Mantra TTS state
  const [isGeneratingMantraAudio, setIsGeneratingMantraAudio] = useState(false)
  const [isPlayingMantraAudio, setIsPlayingMantraAudio] = useState(false)
  const mantraAudioRef = useRef<HTMLAudioElement | null>(null)
  const [showMantraVoiceSettings, setShowMantraVoiceSettings] = useState(false)
  const [mantraVoice, setMantraVoice] = useState<'rachel' | 'bella' | 'domi' | 'elli' | 'antoni' | 'arnold' | 'adam' | 'josh' | 'sam'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('daygo-mantra-voice') as any) || 'rachel'
    }
    return 'rachel'
  })
  const [mantraSpeed, setMantraSpeed] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return parseFloat(localStorage.getItem('daygo-mantra-speed') || '1.0')
    }
    return 1.0
  })

  // Identity TTS state
  const [isGeneratingIdentityAudio, setIsGeneratingIdentityAudio] = useState(false)
  const [isPlayingIdentityAudio, setIsPlayingIdentityAudio] = useState(false)
  const identityAudioRef = useRef<HTMLAudioElement | null>(null)
  const [showIdentityVoiceSettings, setShowIdentityVoiceSettings] = useState(false)
  const [identityVoice, setIdentityVoice] = useState<'rachel' | 'bella' | 'domi' | 'elli' | 'antoni' | 'arnold' | 'adam' | 'josh' | 'sam'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('daygo-identity-voice') as any) || 'adam'
    }
    return 'adam'
  })
  const [identitySpeed, setIdentitySpeed] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return parseFloat(localStorage.getItem('daygo-identity-speed') || '1.0')
    }
    return 1.0
  })

  // Expense state
  const [pushupCount, setPushupCount] = useState('')
  const [newExpenseAmount, setNewExpenseAmount] = useState('')
  const [newExpenseCategory, setNewExpenseCategory] = useState<ExpenseCategory>('Food')
  const [newExpenseDescription, setNewExpenseDescription] = useState('')
  const [showExpenseList, setShowExpenseList] = useState(false)
  const [expandedKeyFocus, setExpandedKeyFocus] = useState<number | null>(null)
  const [reflectionAnswer, setReflectionAnswer] = useState<boolean | null>(null)
  const [reflectionReason, setReflectionReason] = useState('')
  const [reflectionSaved, setReflectionSaved] = useState(false)
  const [newGiftIdea, setNewGiftIdea] = useState('')
  const [showGiftIdeas, setShowGiftIdeas] = useState(false)
  // Section collapse/expand state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('daygo-expanded-sections')
      if (saved) {
        return JSON.parse(saved)
      }
    }
    // All sections expanded by default
    return {
      yesterdayReview: true,
      pepTalk: true,
      healthyFoods: true,
      identities: true,
      visions: true,
      mantras: true,
      habits: true,
      journal: true,
      todos: true,
      schedule: true,
      aiJournals: true,
      books: true,
      expenses: true,
      pushups: true,
    }
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newState = { ...prev, [section]: !prev[section] }
      localStorage.setItem('daygo-expanded-sections', JSON.stringify(newState))
      return newState
    })
  }

  // Check for Google Calendar connection callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('gcal_connected') === 'true') {
      setGcalNotification('Google Calendar connected successfully!')
      queryClient.invalidateQueries({ queryKey: ['gcal-status'] })
      // Clean up URL
      window.history.replaceState({}, '', '/today')
      setTimeout(() => setGcalNotification(null), 4000)
    } else if (params.get('gcal_error')) {
      const error = params.get('gcal_error')
      setGcalNotification(`Failed to connect: ${error}`)
      window.history.replaceState({}, '', '/today')
      setTimeout(() => setGcalNotification(null), 4000)
    }
  }, [queryClient])

  // Check if we should show the onboarding hint
  useEffect(() => {
    const hintDismissed = localStorage.getItem('daygo-add-hint-dismissed')
    const justOnboarded = localStorage.getItem('daygo-just-onboarded')

    if (justOnboarded && !hintDismissed) {
      // Small delay so the page loads first
      const timer = setTimeout(() => {
        setShowAddHint(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [])

  const dismissAddHint = () => {
    setShowAddHint(false)
    localStorage.setItem('daygo-add-hint-dismissed', 'true')
    localStorage.removeItem('daygo-just-onboarded')
  }

  // Generate random daily mantras (pick 3 from all mantras)
  const generateDailyMantras = useCallback((allMantras: Mantra[]) => {
    if (allMantras.length === 0) return
    const dateKey = formatDate(selectedDate)
    const shuffled = [...allMantras].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, Math.min(3, shuffled.length))
    const selectedIds = selected.map(m => m.id)
    setDailyMantraIds(selectedIds)
    localStorage.setItem(`daygo-daily-mantras-${dateKey}`, JSON.stringify(selectedIds))
  }, [selectedDate])

  // Auto-resize pep talk textarea
  useEffect(() => {
    if (pepTalkTextareaRef.current) {
      pepTalkTextareaRef.current.style.height = 'auto'
      pepTalkTextareaRef.current.style.height = pepTalkTextareaRef.current.scrollHeight + 'px'
    }
  }, [newItemText])

  // Close modals on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddModal) {
          setShowAddModal(false)
          setAddType(null)
          setNewItemText('')
          setNewItemDescription('')
        }
        if (showMissNoteModal) {
          setShowMissNoteModal(false)
          setMissNoteText('')
        } else if (showDeleteConfirm) {
          setShowDeleteConfirm(false)
          setSelectedHabit(null)
        } else if (selectedHabit) {
          setSelectedHabit(null)
        }
        if (selectedMantra) {
          setSelectedMantra(null)
        }
        if (selectedTodo) {
          setSelectedTodo(null)
        }
        if (selectedVision) {
          setSelectedVision(null)
          setIsEditingVision(false)
          setEditVisionText('')
        }
        if (selectedIdentity) {
          setSelectedIdentity(null)
          setIsEditingIdentity(false)
          setEditIdentityText('')
        }
        if (selectedJournal) {
          setSelectedJournal(null)
          setIsEditingJournal(false)
          setEditJournalText('')
          setEditJournalTemplate('')
        }
        if (selectedEvent) {
          setSelectedEvent(null)
        }
        if (showScheduleModal) {
          setShowScheduleModal(false)
          setNewEventTitle('')
          setNewEventDescription('')
          setNewEventStartTime('09:00:00')
          setNewEventEndTime('09:30:00')
        }
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showAddModal, showDeleteConfirm, showMissNoteModal, selectedHabit, selectedMantra, selectedTodo, selectedVision, selectedIdentity, selectedJournal, selectedEvent, showScheduleModal])

  // Keyboard shortcuts for Add modal type selection
  useEffect(() => {
    const handleTypeShortcut = (e: KeyboardEvent) => {
      // Only when add modal is open and no type is selected yet
      if (!showAddModal || addType !== null) return

      const key = e.key.toLowerCase()
      const shortcuts: Record<string, 'habit' | 'mantra' | 'journal' | 'todo' | 'pep-talk' | 'vision' | 'identity' | 'ai-journal' | 'book'> = {
        'h': 'habit',
        'm': 'mantra',
        'j': 'journal',
        't': 'todo',
        'v': 'vision',
        'i': 'identity',
        'p': 'pep-talk',
        'a': 'ai-journal',
        'b': 'book',
      }

      if (shortcuts[key]) {
        e.preventDefault()
        setAddType(shortcuts[key])
      }
    }
    document.addEventListener('keydown', handleTypeShortcut)
    return () => document.removeEventListener('keydown', handleTypeShortcut)
  }, [showAddModal, addType])

  // Arrow key navigation for days
  useEffect(() => {
    const handleArrowKeys = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea or modal is open
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }
      if (showAddModal || showScheduleModal || selectedHabit || selectedMantra || selectedTodo || selectedVision || selectedIdentity || selectedJournal || selectedEvent) {
        return
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setSelectedDate(prev => {
          const newDate = new Date(prev)
          newDate.setDate(newDate.getDate() - 1)
          return newDate
        })
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setSelectedDate(prev => {
          const newDate = new Date(prev)
          newDate.setDate(newDate.getDate() + 1)
          return newDate
        })
      }
    }
    document.addEventListener('keydown', handleArrowKeys)
    return () => document.removeEventListener('keydown', handleArrowKeys)
  }, [showAddModal, showScheduleModal, selectedHabit, selectedMantra, selectedTodo, selectedVision, selectedIdentity, selectedJournal, selectedEvent])

  const dateStr = formatDate(selectedDate)

  // Calculate yesterday's date for score review
  const yesterday = new Date(selectedDate)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = formatDate(yesterday)

  const { data: habits = [], isLoading: habitsLoading } = useQuery({
    queryKey: ['habits', user?.id, dateStr],
    queryFn: () => habitsService.getHabitsWithLogs(user!.id, dateStr),
    enabled: !!user,
  })

  const { data: mantras = [], isLoading: mantrasLoading } = useQuery({
    queryKey: ['mantras', user?.id],
    queryFn: () => mantrasService.getMantras(user!.id),
    enabled: !!user,
  })

  // Load daily mantras from localStorage when mantras load or date changes
  useEffect(() => {
    if (mantras.length === 0) return
    const dateKey = formatDate(selectedDate)
    const saved = localStorage.getItem(`daygo-daily-mantras-${dateKey}`)
    if (saved) {
      const savedIds = JSON.parse(saved) as string[]
      // Filter to only include IDs that still exist in mantras
      const validIds = savedIds.filter(id => mantras.some(m => m.id === id))
      setDailyMantraIds(validIds)
    } else {
      // No saved mantras for this date, clear the selection
      setDailyMantraIds([])
    }
  }, [mantras, selectedDate])

  // Get the daily mantras to display
  const dailyMantras = mantras.filter(m => dailyMantraIds.includes(m.id))

  const { data: prompts = [], isLoading: promptsLoading } = useQuery({
    queryKey: ['journal-prompts', user?.id, dateStr],
    queryFn: () => journalService.getPromptsWithEntries(user!.id, dateStr),
    enabled: !!user,
  })

  const { data: goals = [] } = useQuery({
    queryKey: ['goals', user?.id],
    queryFn: () => goalsService.getGoals(user!.id),
    enabled: !!user,
  })

  const { data: todos = [], isLoading: todosLoading } = useQuery({
    queryKey: ['todos', user?.id, dateStr],
    queryFn: () => todosService.getTodos(user!.id, dateStr),
    enabled: !!user,
  })

  const { data: visions = [], isLoading: visionsLoading } = useQuery({
    queryKey: ['visions', user?.id],
    queryFn: () => visionsService.getVisions(user!.id),
    enabled: !!user,
  })

  const { data: identities = [], isLoading: identitiesLoading } = useQuery({
    queryKey: ['identities', user?.id],
    queryFn: () => identitiesService.getIdentities(user!.id),
    enabled: !!user,
  })

  const { data: values = [] } = useQuery({
    queryKey: ['values', user?.id],
    queryFn: () => valuesService.getValues(user!.id),
    enabled: !!user,
  })

  const { data: currentlyReadingBooks = [], isLoading: booksLoading } = useQuery({
    queryKey: ['books', user?.id, 'reading'],
    queryFn: () => booksService.getCurrentlyReading(user!.id),
    enabled: !!user,
  })

  const { data: completedBooksByYear = {} } = useQuery({
    queryKey: ['books', user?.id, 'completed-by-year'],
    queryFn: () => booksService.getCompletedBooksByYear(user!.id),
    enabled: !!user,
  })

  const currentYearBooksRead = (completedBooksByYear[new Date().getFullYear()] || []).length
  const BOOKS_GOAL = 100

  const { data: userProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => profilesService.getProfile(user!.id),
    enabled: !!user,
  })

  const { data: scheduleEvents = [], isLoading: scheduleLoading } = useQuery({
    queryKey: ['schedule', user?.id, dateStr],
    queryFn: () => scheduleService.getEvents(user!.id, dateStr),
    enabled: !!user,
  })

  // Yesterday's schedule for score review
  const { data: yesterdayScheduleEvents = [] } = useQuery({
    queryKey: ['schedule', user?.id, yesterdayStr],
    queryFn: () => scheduleService.getEvents(user!.id, yesterdayStr),
    enabled: !!user,
  })

  const { data: calendarRules = [] } = useQuery({
    queryKey: ['calendar-rules', user?.id],
    queryFn: () => calendarRulesService.getRules(user!.id),
    enabled: !!user,
  })

  // User scheduling preferences (wake/bed time)
  const { data: userPreferences } = useQuery({
    queryKey: ['user-preferences', user?.id],
    queryFn: () => userPreferencesService.getOrCreatePreferences(user!.id),
    enabled: !!user,
  })

  // Daily notes for context
  const { data: dailyNote } = useQuery({
    queryKey: ['daily-note', user?.id, dateStr],
    queryFn: () => dailyNotesService.getNote(user!.id, dateStr),
    enabled: !!user,
  })

  // Sync local daily note state with query result
  useEffect(() => {
    if (dailyNote?.note !== undefined) {
      setLocalDailyNote(dailyNote.note)
    }
  }, [dailyNote?.note])

  // Daily reflection
  const { data: dailyReflection } = useQuery({
    queryKey: ['daily-reflection', user?.id, dateStr],
    queryFn: () => dailyReflectionsService.getReflection(user!.id, dateStr),
    enabled: !!user,
  })

  useEffect(() => {
    if (dailyReflection) {
      setReflectionAnswer(dailyReflection.answer)
      setReflectionReason(dailyReflection.reason)
      setReflectionSaved(true)
    } else {
      setReflectionAnswer(null)
      setReflectionReason('')
      setReflectionSaved(false)
    }
  }, [dailyReflection])

  const saveReflectionMutation = useMutation({
    mutationFn: ({ answer, reason }: { answer: boolean; reason: string }) =>
      dailyReflectionsService.saveReflection(user!.id, dateStr, answer, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-reflection', user?.id, dateStr] })
      setReflectionSaved(true)
    },
  })

  // Schedule templates
  const { data: scheduleTemplates = [] } = useQuery({
    queryKey: ['schedule-templates', user?.id],
    queryFn: () => scheduleTemplatesService.getTemplates(user!.id),
    enabled: !!user,
  })

  // AI Journals for current date
  const { data: aiJournals = [] } = useQuery({
    queryKey: ['ai-journals', user?.id, dateStr],
    queryFn: () => aiJournalsService.getAIJournalsForDate(user!.id, dateStr),
    enabled: !!user,
  })

  // All AI Journal prompts (for showing prompts without today's response)
  const { data: aiJournalPrompts = [] } = useQuery({
    queryKey: ['ai-journal-prompts', user?.id],
    queryFn: () => aiJournalsService.getAIJournalPrompts(user!.id),
    enabled: !!user,
  })

  // Google Calendar connection status
  const { data: gcalStatus } = useQuery({
    queryKey: ['gcal-status'],
    queryFn: async () => {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      if (!session?.access_token) return { connected: false }
      const response = await fetch('/api/google-calendar/status', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!response.ok) return { connected: false }
      return response.json()
    },
    enabled: !!user,
  })

  const isGcalConnected = gcalStatus?.connected || false

  // Fetch Google Calendar events when connected
  const { data: googleCalendarEvents = [] } = useQuery({
    queryKey: ['gcal-events', user?.id, dateStr],
    queryFn: async () => {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      if (!session?.access_token) return []
      const response = await fetch(`/api/google-calendar/events?date=${dateStr}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!response.ok) return []
      const { events } = await response.json()
      return events || []
    },
    enabled: !!user && isGcalConnected,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })

  const { data: todaysPepTalk } = useQuery({
    queryKey: ['pep-talk', user?.id, dateStr],
    queryFn: () => pepTalksService.getPepTalkForDate(user!.id, dateStr),
    enabled: !!user,
  })

  // Expenses
  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', user?.id, dateStr],
    queryFn: () => expensesService.getExpenses(user!.id, dateStr),
    enabled: !!user,
  })

  const { data: monthlyTotals = [] } = useQuery({
    queryKey: ['expenses-monthly', user?.id],
    queryFn: () => expensesService.getMonthlyTotals(user!.id),
    enabled: !!user,
  })

  // Push-ups
  const { data: todayPushup } = useQuery({
    queryKey: ['pushup-log', user?.id, dateStr],
    queryFn: () => pushupsService.getLog(user!.id, dateStr),
    enabled: !!user,
  })

  const { data: pushupLogs = [] } = useQuery({
    queryKey: ['pushup-logs', user?.id],
    queryFn: () => pushupsService.getLogs(user!.id, 30),
    enabled: !!user,
  })

  const upsertPushupMutation = useMutation({
    mutationFn: (count: number) => pushupsService.upsertLog(user!.id, dateStr, count),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pushup-log', user?.id, dateStr] })
      queryClient.invalidateQueries({ queryKey: ['pushup-logs', user?.id] })
    },
  })

  // Pre-fill pushup input when data loads
  useEffect(() => {
    if (todayPushup) {
      setPushupCount(String(todayPushup.count))
    }
  }, [todayPushup])

  // Gift Ideas
  const { data: giftIdeas = [] } = useQuery({
    queryKey: ['gift-ideas', user?.id],
    queryFn: () => giftIdeasService.getGiftIdeas(user!.id),
    enabled: !!user,
  })

  const createExpenseMutation = useMutation({
    mutationFn: ({ amount, category, description }: { amount: number; category: ExpenseCategory; description: string | null }) =>
      expensesService.createExpense(user!.id, amount, category, description, dateStr),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', user?.id, dateStr] })
      queryClient.invalidateQueries({ queryKey: ['expenses-monthly', user?.id] })
      setNewExpenseAmount('')
      setNewExpenseDescription('')
      setNewExpenseCategory('Food')
    },
  })

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) => expensesService.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', user?.id, dateStr] })
      queryClient.invalidateQueries({ queryKey: ['expenses-monthly', user?.id] })
    },
  })

  const dailyExpenseTotal = expenses.reduce((sum: number, e: Expense) => sum + Number(e.amount), 0)

  const pepTalkMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/pep-talk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goals }),
      })
      if (!response.ok) throw new Error('Failed to generate pep talk')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader available')

      const decoder = new TextDecoder()
      setNewItemText('')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value, { stream: true })
        setNewItemText(prev => prev + text)
      }

      return true
    },
  })

  // State to track which journal is being regenerated
  const [regeneratingJournalId, setRegeneratingJournalId] = useState<string | null>(null)

  // Generate AI Journal content (for new or regenerating)
  const generateAiJournal = async (prompt?: string) => {
    const promptToUse = prompt || aiJournalPrompt
    if (!promptToUse.trim()) return

    setIsGeneratingAiJournal(true)
    setAiJournalResponse('')

    try {
      const response = await fetch('/api/ai-journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptToUse }),
      })
      if (!response.ok) throw new Error('Failed to generate AI journal')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader available')

      const decoder = new TextDecoder()
      let fullResponse = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value, { stream: true })
        fullResponse += text
        setAiJournalResponse(fullResponse)
      }

      return fullResponse
    } catch (error) {
      console.error('Error generating AI journal:', error)
      return null
    } finally {
      setIsGeneratingAiJournal(false)
    }
  }

  // Regenerate content for an existing AI journal
  const regenerateAiJournal = async (journal: AIJournal) => {
    setRegeneratingJournalId(journal.id)

    try {
      const response = await fetch('/api/ai-journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: journal.prompt }),
      })
      if (!response.ok) throw new Error('Failed to generate AI journal')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader available')

      const decoder = new TextDecoder()
      let fullResponse = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value, { stream: true })
        fullResponse += text
      }

      // Save the response
      await updateAiJournalResponseMutation.mutateAsync({ id: journal.id, response: fullResponse })
    } catch (error) {
      console.error('Error regenerating AI journal:', error)
    } finally {
      setRegeneratingJournalId(null)
    }
  }

  // Get or create AI journal for today and generate content
  const generateAiJournalForToday = async (prompt: string) => {
    if (!user) return

    try {
      // Get or create the entry for today
      const journal = await aiJournalsService.getOrCreateForDate(user.id, prompt, dateStr)

      // Generate and save the response
      await regenerateAiJournal(journal)

      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ['ai-journals'] })
      queryClient.invalidateQueries({ queryKey: ['ai-journal-prompts'] })
    } catch (error) {
      console.error('Error:', error)
    }
  }

  // Calculate mission score (based on yesterday's schedule completion for daily review)
  const missionScore = calculateMissionScore(habits, todos, yesterdayScheduleEvents)
  const score = yesterdayScheduleEvents.length > 0
    ? Math.round((yesterdayScheduleEvents.filter(e => e.completed).length / yesterdayScheduleEvents.length) * 100)
    : 0

  // Track if we've celebrated 100% completion for this date
  const celebratedRef = useRef<string | null>(null)

  // Celebration confetti when hitting 100%!
  useEffect(() => {
    if (score === 100 && yesterdayScheduleEvents.length > 0 && celebratedRef.current !== yesterdayStr) {
      celebratedRef.current = yesterdayStr

      // Fire confetti from both sides for an exciting celebration!
      const duration = 3000
      const end = Date.now() + duration

      const frame = () => {
        // Left side
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: ['#10b981', '#34d399', '#6ee7b7', '#fbbf24', '#f59e0b'],
        })
        // Right side
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: ['#10b981', '#34d399', '#6ee7b7', '#fbbf24', '#f59e0b'],
        })

        if (Date.now() < end) {
          requestAnimationFrame(frame)
        }
      }
      frame()
    }
  }, [score, yesterdayScheduleEvents.length, yesterdayStr])

  const saveEntryMutation = useMutation({
    mutationFn: ({ promptId, entry }: { promptId: string; entry: string }) =>
      journalService.saveEntry(user!.id, promptId, entry, dateStr),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-prompts', user?.id, dateStr] })
    },
  })

  const createHabitMutation = useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) =>
      habitsService.createHabit(user!.id, name, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] })
      setShowAddModal(false)
      setNewItemText('')
      setNewItemDescription('')
    },
  })

  const createMantraMutation = useMutation({
    mutationFn: (text: string) => mantrasService.createMantra(user!.id, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mantras'] })
      setShowAddModal(false)
      setNewItemText('')
    },
  })

  const createPromptMutation = useMutation({
    mutationFn: (prompt: string) => journalService.createPrompt(user!.id, prompt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-prompts'] })
      setShowAddModal(false)
      setNewItemText('')
    },
  })

  const createTodoMutation = useMutation({
    mutationFn: (text: string) => todosService.createTodo(user!.id, text, dateStr),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos', user?.id, dateStr] })
      setShowAddModal(false)
      setNewItemText('')
    },
  })

  const createVisionMutation = useMutation({
    mutationFn: (text: string) => visionsService.createVision(user!.id, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visions'] })
      setShowAddModal(false)
      setNewItemText('')
    },
  })

  const deleteVisionMutation = useMutation({
    mutationFn: (visionId: string) => visionsService.deleteVision(visionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visions'] })
      setSelectedVision(null)
    },
  })

  const updateVisionMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      visionsService.updateVision(id, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visions'] })
      setSelectedVision(null)
      setIsEditingVision(false)
      setEditVisionText('')
    },
  })

  const createIdentityMutation = useMutation({
    mutationFn: (text: string) => identitiesService.createIdentity(user!.id, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['identities'] })
      setShowAddModal(false)
      setNewItemText('')
      setAddType(null)
    },
    onError: (error: any) => {
      console.error('Failed to create identity:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      console.error('Error message:', error?.message)
      console.error('Error code:', error?.code)
      alert(`Failed to create identity: ${error?.message || error?.code || 'Unknown error'}`)
    },
  })

  const deleteIdentityMutation = useMutation({
    mutationFn: (identityId: string) => identitiesService.deleteIdentity(identityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['identities'] })
      setSelectedIdentity(null)
    },
  })

  const updateIdentityMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      identitiesService.updateIdentity(id, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['identities'] })
      setSelectedIdentity(null)
      setIsEditingIdentity(false)
      setEditIdentityText('')
    },
  })

  const reorderIdentitiesMutation = useMutation({
    mutationFn: (orderedIds: string[]) => identitiesService.reorderIdentities(orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['identities'] })
    },
  })

  // Book mutations
  const createBookMutation = useMutation({
    mutationFn: ({ title, author }: { title: string; author?: string }) =>
      booksService.createBook(user!.id, title, author),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      setShowAddModal(false)
      setAddType(null)
      setNewItemText('')
      setNewBookAuthor('')
    },
  })

  const markBookCompletedMutation = useMutation({
    mutationFn: (bookId: string) => booksService.markAsCompleted(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      setSelectedBook(null)
    },
  })

  const deleteBookMutation = useMutation({
    mutationFn: (bookId: string) => booksService.deleteBook(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      setSelectedBook(null)
    },
  })

  const bookLearningsQuery = useQuery({
    queryKey: ['book_learnings', selectedBook?.id],
    queryFn: () => booksService.getLearnings(selectedBook!.id),
    enabled: !!selectedBook,
  })

  const addLearningMutation = useMutation({
    mutationFn: (content: string) => booksService.addLearning(selectedBook!.id, user!.id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book_learnings', selectedBook?.id] })
      setNewLearning('')
    },
  })

  const deleteLearningMutation = useMutation({
    mutationFn: (learningId: string) => booksService.deleteLearning(learningId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book_learnings', selectedBook?.id] })
    },
  })

  // AI Journal mutations
  const createAiJournalMutation = useMutation({
    mutationFn: (prompt: string) =>
      aiJournalsService.createAIJournalPrompt(user!.id, prompt, dateStr),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-journals'] })
      queryClient.invalidateQueries({ queryKey: ['ai-journal-prompts'] })
      setShowAddModal(false)
      setAddType(null)
      setAiJournalPrompt('')
      setAiJournalResponse('')
    },
  })

  const updateAiJournalResponseMutation = useMutation({
    mutationFn: ({ id, response }: { id: string; response: string }) =>
      aiJournalsService.updateResponse(id, response),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-journals'] })
    },
  })

  const deleteAiJournalMutation = useMutation({
    mutationFn: (id: string) => aiJournalsService.deleteAIJournal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-journals'] })
      queryClient.invalidateQueries({ queryKey: ['ai-journal-prompts'] })
      setSelectedAiJournal(null)
    },
  })

  const deleteAiJournalPromptMutation = useMutation({
    mutationFn: (prompt: string) => aiJournalsService.deletePrompt(user!.id, prompt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-journals'] })
      queryClient.invalidateQueries({ queryKey: ['ai-journal-prompts'] })
      setSelectedAiJournal(null)
    },
  })

  const toggleTodoMutation = useMutation({
    mutationFn: ({ todoId, completed }: { todoId: string; completed: boolean }) =>
      todosService.toggleTodo(todoId, completed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos', user?.id, dateStr] })
    },
  })

  const deleteTodoMutation = useMutation({
    mutationFn: (todoId: string) => todosService.deleteTodo(todoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos', user?.id, dateStr] })
      setSelectedTodo(null)
    },
  })

  const deleteHabitMutation = useMutation({
    mutationFn: (habitId: string) => habitsService.deleteHabit(habitId, dateStr),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] })
      setSelectedHabit(null)
      setShowDeleteConfirm(false)
    },
  })

  const updateHabitMutation = useMutation({
    mutationFn: ({ id, name, description }: { id: string; name: string; description?: string }) =>
      habitsService.updateHabit(id, { name, description: description || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] })
      setSelectedHabit(null)
      setIsEditingHabit(false)
      setEditHabitName('')
      setEditHabitDescription('')
    },
  })

  const reorderHabitsMutation = useMutation({
    mutationFn: (orderedIds: string[]) => habitsService.reorderHabits(orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] })
    },
  })

  const toggleHabitMutation = useMutation({
    mutationFn: ({ habitId, completed }: { habitId: string; completed: boolean }) =>
      habitsService.toggleHabitCompletion(user!.id, habitId, dateStr, completed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] })
    },
  })

  const reorderMantrasMutation = useMutation({
    mutationFn: (orderedIds: string[]) => mantrasService.reorderMantras(orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mantras'] })
    },
  })

  const reorderVisionsMutation = useMutation({
    mutationFn: (orderedIds: string[]) => visionsService.reorderVisions(orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visions'] })
    },
  })

  const reorderTodosMutation = useMutation({
    mutationFn: (orderedIds: string[]) => todosService.reorderTodos(orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })

  const reorderJournalsMutation = useMutation({
    mutationFn: (orderedIds: string[]) => journalService.reorderPrompts(orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-prompts'] })
    },
  })

  const deleteMantraMutation = useMutation({
    mutationFn: (mantraId: string) => mantrasService.deleteMantra(mantraId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mantras'] })
      setSelectedMantra(null)
    },
  })

  const updateJournalPromptMutation = useMutation({
    mutationFn: ({ id, prompt, templateText, icon, color }: { id: string; prompt: string; templateText?: string; icon?: string; color?: string }) =>
      journalService.updatePrompt(id, prompt, templateText, icon, color),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-prompts'] })
      setSelectedJournal(null)
      setIsEditingJournal(false)
      setEditJournalText('')
      setEditJournalTemplate('')
      setEditJournalIcon('')
      setEditJournalColor('#E97451')
    },
  })

  const deleteJournalPromptMutation = useMutation({
    mutationFn: (promptId: string) => journalService.deletePrompt(promptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-prompts'] })
      setSelectedJournal(null)
    },
  })

  const savePepTalkMutation = useMutation({
    mutationFn: (text: string) => pepTalksService.savePepTalk(user!.id, text, dateStr),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pep-talk', user?.id, dateStr] })
      setShowAddModal(false)
      setNewItemText('')
    },
  })

  const deletePepTalkMutation = useMutation({
    mutationFn: () => pepTalksService.deletePepTalk(user!.id, dateStr),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pep-talk', user?.id, dateStr] })
    },
  })

  const generateAudioMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!user) throw new Error('User not found')
      return pepTalksService.generateAudio(user.id, text, dateStr)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pep-talk', user?.id, dateStr] })
    },
  })

  const createEventMutation = useMutation({
    mutationFn: () =>
      scheduleService.createEvent(
        user!.id,
        newEventTitle,
        dateStr,
        newEventStartTime,
        newEventEndTime,
        newEventDescription || undefined
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', user?.id, dateStr] })
      setShowScheduleModal(false)
      setShowAddModal(false)
      setNewEventTitle('')
      setNewEventDescription('')
      setNewEventStartTime('09:00:00')
      setNewEventEndTime('09:30:00')
    },
  })

  const deleteEventMutation = useMutation({
    mutationFn: (eventId: string) => scheduleService.deleteEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', user?.id, dateStr] })
      setSelectedEvent(null)
    },
  })

  const clearAiEventsMutation = useMutation({
    mutationFn: () => scheduleService.deleteAiEvents(user!.id, dateStr),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', user?.id, dateStr] })
    },
  })

  const toggleEventCompletionMutation = useMutation({
    mutationFn: ({ eventId, completed }: { eventId: string; completed: boolean }) =>
      scheduleService.toggleEventCompletion(eventId, completed),
    onMutate: async ({ eventId, completed }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['schedule', user?.id, dateStr] })

      // Snapshot the previous value
      const previousEvents = queryClient.getQueryData<ScheduleEvent[]>(['schedule', user?.id, dateStr])

      // Optimistically update the cache
      queryClient.setQueryData<ScheduleEvent[]>(
        ['schedule', user?.id, dateStr],
        (old) => old?.map((event) =>
          event.id === eventId ? { ...event, completed } : event
        ) ?? []
      )

      return { previousEvents }
    },
    onError: (_err, _variables, context) => {
      // Roll back to previous value on error
      if (context?.previousEvents) {
        queryClient.setQueryData(['schedule', user?.id, dateStr], context.previousEvents)
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure sync
      queryClient.invalidateQueries({ queryKey: ['schedule', user?.id, dateStr] })
    },
  })

  // Toggle completion for yesterday's events (for daily review)
  const toggleYesterdayEventMutation = useMutation({
    mutationFn: ({ eventId, completed }: { eventId: string; completed: boolean }) =>
      scheduleService.toggleEventCompletion(eventId, completed),
    onMutate: async ({ eventId, completed }) => {
      await queryClient.cancelQueries({ queryKey: ['schedule', user?.id, yesterdayStr] })
      const previousEvents = queryClient.getQueryData<ScheduleEvent[]>(['schedule', user?.id, yesterdayStr])
      queryClient.setQueryData<ScheduleEvent[]>(
        ['schedule', user?.id, yesterdayStr],
        (old) => old?.map((event) =>
          event.id === eventId ? { ...event, completed } : event
        ) ?? []
      )
      return { previousEvents }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(['schedule', user?.id, yesterdayStr], context.previousEvents)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', user?.id, yesterdayStr] })
    },
  })

  const resizeEventMutation = useMutation({
    mutationFn: ({ eventId, endTime }: { eventId: string; endTime: string }) =>
      scheduleService.updateEvent(eventId, { end_time: endTime }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', user?.id, dateStr] })
    },
  })

  const moveEventMutation = useMutation({
    mutationFn: ({ eventId, startTime, endTime }: { eventId: string; startTime: string; endTime: string }) =>
      scheduleService.updateEvent(eventId, { start_time: startTime, end_time: endTime }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', user?.id, dateStr] })
    },
  })

  // Google Calendar mutations
  const connectGcalMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Not authenticated')
      const response = await fetch('/api/google-calendar/auth', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!response.ok) throw new Error('Failed to get auth URL')
      const { authUrl } = await response.json()
      window.location.href = authUrl
    },
  })

  const disconnectGcalMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Not authenticated')
      const response = await fetch('/api/google-calendar/disconnect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!response.ok) throw new Error('Failed to disconnect')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gcal-status'] })
    },
  })

  const importGcalEventsMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Not authenticated')
      const response = await fetch(`/api/google-calendar/events?date=${dateStr}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!response.ok) throw new Error('Failed to fetch events')
      const { events } = await response.json()

      // Create Daygo events from Google Calendar events
      for (const event of events) {
        if (!event.is_all_day) {
          await scheduleService.createEvent(
            user!.id,
            event.title,
            dateStr,
            event.start_time,
            event.end_time,
            event.description || undefined,
            false // not AI generated
          )
        }
      }
      return events.length
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['schedule', user?.id, dateStr] })
      alert(`Imported ${count} events from Google Calendar`)
    },
  })

  const exportGcalEventsMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Not authenticated')

      let exported = 0
      for (const event of scheduleEvents) {
        const response = await fetch('/api/google-calendar/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            title: event.title,
            date: dateStr,
            start_time: event.start_time,
            end_time: event.end_time,
            description: event.description,
          }),
        })
        if (response.ok) exported++
      }
      return exported
    },
    onSuccess: (count) => {
      alert(`Exported ${count} events to Google Calendar`)
    },
  })

  const createRuleMutation = useMutation({
    mutationFn: (ruleText: string) => calendarRulesService.createRule(user!.id, ruleText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-rules', user?.id] })
    },
  })

  const updateRuleMutation = useMutation({
    mutationFn: ({ ruleId, isActive }: { ruleId: string; isActive: boolean }) =>
      calendarRulesService.updateRule(ruleId, { is_active: isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-rules', user?.id] })
    },
  })

  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: string) => calendarRulesService.deleteRule(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-rules', user?.id] })
    },
  })

  const updatePreferencesMutation = useMutation({
    mutationFn: ({ wakeTime, bedTime }: { wakeTime: string; bedTime: string }) =>
      userPreferencesService.updatePreferences(user!.id, {
        wake_time: userPreferencesService.formatTimeForDB(wakeTime),
        bed_time: userPreferencesService.formatTimeForDB(bedTime),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences', user?.id] })
    },
  })

  const saveDailyNoteMutation = useMutation({
    mutationFn: (note: string) => dailyNotesService.saveNote(user!.id, dateStr, note),
    onMutate: (note) => {
      // Immediately update local state so it's available for schedule generation
      setLocalDailyNote(note)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-note', user?.id, dateStr] })
    },
  })

  const applyRulesMutation = useMutation({
    mutationFn: async () => {
      setPlanningStatus('Analyzing your day...')
      console.log('Calling AI to plan day...')

      const response = await fetch('/api/calendar-rules/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rules: calendarRules,
          existingEvents: scheduleEvents,
          habits: habits.map(h => ({ name: h.name, description: h.description })),
          todos: todos.map(t => ({ text: t.text, completed: t.completed })),
          goals: goals.map(g => ({ title: g.title, description: g.description })),
          visions: visions.map(v => ({ text: v.text })),
          mantras: dailyMantras.map(m => ({ text: m.text })),
          date: dateStr,
          dailyNote: localDailyNote,
          preferences: {
            wake_time: userPreferences?.wake_time ? userPreferencesService.formatTimeForDisplay(userPreferences.wake_time) : '07:00',
            bed_time: userPreferences?.bed_time ? userPreferencesService.formatTimeForDisplay(userPreferences.bed_time) : '22:00',
          },
        }),
      })

      setPlanningStatus('AI is thinking...')

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API error:', errorText)
        throw new Error('Failed to apply rules')
      }
      const data = await response.json()
      console.log('AI returned events:', data.events)
      console.log('DEBUG INFO:', data.debug)
      return data.events as { title: string; start_time: string; end_time: string; description?: string }[]
    },
    onSuccess: async (events) => {
      if (events.length === 0) {
        setPlanningStatus('No events to add')
        setTimeout(() => setPlanningStatus(''), 2000)
        return
      }

      // Create all AI-generated events with progress
      for (let i = 0; i < events.length; i++) {
        const event = events[i]
        setPlanningStatus(`Adding ${i + 1}/${events.length}: ${event.title}`)
        try {
          await scheduleService.createEvent(
            user!.id,
            event.title,
            dateStr,
            event.start_time,
            event.end_time,
            event.description,
            true // is_ai_generated
          )
          console.log('Created event:', event.title)
        } catch (err) {
          console.error('Failed to create event:', event.title, err)
        }
      }

      setPlanningStatus(`Done! Added ${events.length} events`)
      queryClient.invalidateQueries({ queryKey: ['schedule', user?.id, dateStr] })
      setTimeout(() => setPlanningStatus(''), 2000)
    },
    onError: (error) => {
      console.error('Apply rules mutation error:', error)
      setPlanningStatus('Error planning day')
      setTimeout(() => setPlanningStatus(''), 3000)
    },
  })

  const createMissNoteMutation = useMutation({
    mutationFn: ({ habitId, note }: { habitId: string; note: string }) =>
      habitMissNotesService.createMissNote(user!.id, habitId, dateStr, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits', user?.id, dateStr] })
      setShowMissNoteModal(false)
      setSelectedHabit(null)
      setMissNoteText('')
    },
  })

  const deleteMissNoteMutation = useMutation({
    mutationFn: (habitId: string) =>
      habitMissNotesService.deleteMissNote(habitId, dateStr),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits', user?.id, dateStr] })
    },
  })

  // Schedule Template mutations
  const saveTemplateMutation = useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) =>
      scheduleTemplatesService.createTemplate(user!.id, name, scheduleEvents, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-templates', user?.id] })
    },
  })

  const applyTemplateMutation = useMutation({
    mutationFn: async (template: ScheduleTemplate) => {
      const templateEvents = scheduleTemplatesService.getTemplateEvents(template)

      // Create all events from the template
      for (const event of templateEvents) {
        await scheduleService.createEvent(
          user!.id,
          event.title,
          dateStr,
          event.start_time,
          event.end_time,
          event.description || undefined,
          event.is_ai_generated || false
        )
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', user?.id, dateStr] })
    },
  })

  const deleteTemplateMutation = useMutation({
    mutationFn: (templateId: string) => scheduleTemplatesService.deleteTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-templates', user?.id] })
    },
  })

  // Drag and drop sensors - optimized for quick shuffle feel
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 3 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleHabitDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = habits.findIndex((h) => h.id === active.id)
      const newIndex = habits.findIndex((h) => h.id === over.id)
      const newOrder = arrayMove(habits, oldIndex, newIndex)
      const orderedIds = newOrder.map((h) => h.id)
      reorderHabitsMutation.mutate(orderedIds)
    }
  }

  const handleMantraDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = mantras.findIndex((m) => m.id === active.id)
      const newIndex = mantras.findIndex((m) => m.id === over.id)
      const newOrder = arrayMove(mantras, oldIndex, newIndex)
      const orderedIds = newOrder.map((m) => m.id)
      reorderMantrasMutation.mutate(orderedIds)
    }
  }

  const handleVisionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = visions.findIndex((v) => v.id === active.id)
      const newIndex = visions.findIndex((v) => v.id === over.id)
      const newOrder = arrayMove(visions, oldIndex, newIndex)
      const orderedIds = newOrder.map((v) => v.id)
      reorderVisionsMutation.mutate(orderedIds)
    }
  }

  const handleIdentityDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = identities.findIndex((i) => i.id === active.id)
      const newIndex = identities.findIndex((i) => i.id === over.id)
      const newOrder = arrayMove(identities, oldIndex, newIndex)
      const orderedIds = newOrder.map((i) => i.id)
      reorderIdentitiesMutation.mutate(orderedIds)
    }
  }

  const handleVisionVoiceChange = (voice: typeof visionVoice) => {
    setVisionVoice(voice)
    localStorage.setItem('daygo-vision-voice', voice)
    // Clear cached audio so it regenerates with new voice
    if (visionAudioRef.current && visionAudioRef.current.src) {
      const oldSrc = visionAudioRef.current.src
      visionAudioRef.current.pause()
      visionAudioRef.current.removeAttribute('src')
      visionAudioRef.current.load()
      URL.revokeObjectURL(oldSrc)
    }
  }

  const handleVisionSpeedChange = (speed: number) => {
    setVisionSpeed(speed)
    localStorage.setItem('daygo-vision-speed', speed.toString())
    // Clear cached audio so it regenerates with new speed
    if (visionAudioRef.current && visionAudioRef.current.src) {
      const oldSrc = visionAudioRef.current.src
      visionAudioRef.current.pause()
      visionAudioRef.current.removeAttribute('src')
      visionAudioRef.current.load()
      URL.revokeObjectURL(oldSrc)
    }
  }

  const handlePlayVisionAffirmations = async () => {
    const audio = visionAudioRef.current
    if (!audio) return

    // If already playing, pause
    if (isPlayingVisionAudio) {
      audio.pause()
      setIsPlayingVisionAudio(false)
      return
    }

    // If we have audio loaded and it's paused, resume
    if (audio.src && audio.src !== window.location.href) {
      audio.play()
      setIsPlayingVisionAudio(true)
      return
    }

    // Generate new audio
    setIsGeneratingVisionAudio(true)
    try {
      const response = await fetch('/api/visions/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visions: visions.map(v => ({ text: v.text })),
          voice: visionVoice,
          speed: visionSpeed,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('TTS API error:', errorData)
        throw new Error(errorData.error || 'Failed to generate audio')
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      // Clean up previous audio URL
      if (audio.src && audio.src !== window.location.href) {
        URL.revokeObjectURL(audio.src)
      }

      audio.src = audioUrl
      audio.onended = () => {
        setIsPlayingVisionAudio(false)
      }

      await audio.play()
      setIsPlayingVisionAudio(true)
    } catch (error) {
      console.error('Error generating vision audio:', error)
    } finally {
      setIsGeneratingVisionAudio(false)
    }
  }

  const handleMantraVoiceChange = (voice: typeof mantraVoice) => {
    setMantraVoice(voice)
    localStorage.setItem('daygo-mantra-voice', voice)
    // Clear cached audio so it regenerates with new voice
    if (mantraAudioRef.current && mantraAudioRef.current.src) {
      const oldSrc = mantraAudioRef.current.src
      mantraAudioRef.current.pause()
      mantraAudioRef.current.removeAttribute('src')
      mantraAudioRef.current.load()
      URL.revokeObjectURL(oldSrc)
    }
  }

  const handleMantraSpeedChange = (speed: number) => {
    setMantraSpeed(speed)
    localStorage.setItem('daygo-mantra-speed', speed.toString())
    // Clear cached audio so it regenerates with new speed
    if (mantraAudioRef.current && mantraAudioRef.current.src) {
      const oldSrc = mantraAudioRef.current.src
      mantraAudioRef.current.pause()
      mantraAudioRef.current.removeAttribute('src')
      mantraAudioRef.current.load()
      URL.revokeObjectURL(oldSrc)
    }
  }

  const handlePlayMantraAffirmations = async () => {
    if (dailyMantras.length === 0) return
    const audio = mantraAudioRef.current
    if (!audio) return

    // If already playing, pause
    if (isPlayingMantraAudio) {
      audio.pause()
      setIsPlayingMantraAudio(false)
      return
    }

    // If we have audio loaded and it's paused, resume
    if (audio.src && audio.src !== window.location.href) {
      audio.play()
      setIsPlayingMantraAudio(true)
      return
    }

    // Generate new audio
    setIsGeneratingMantraAudio(true)
    try {
      const response = await fetch('/api/mantras/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mantras: dailyMantras.map(m => ({ text: m.text })),
          voice: mantraVoice,
          speed: mantraSpeed,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Mantra TTS API error:', errorData)
        throw new Error(errorData.error || 'Failed to generate audio')
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      // Clean up previous audio URL
      if (audio.src && audio.src !== window.location.href) {
        URL.revokeObjectURL(audio.src)
      }

      audio.src = audioUrl
      audio.onended = () => {
        setIsPlayingMantraAudio(false)
      }

      await audio.play()
      setIsPlayingMantraAudio(true)
    } catch (error) {
      console.error('Error generating mantra audio:', error)
    } finally {
      setIsGeneratingMantraAudio(false)
    }
  }

  const handleIdentityVoiceChange = (voice: typeof identityVoice) => {
    setIdentityVoice(voice)
    localStorage.setItem('daygo-identity-voice', voice)
    if (identityAudioRef.current && identityAudioRef.current.src) {
      const oldSrc = identityAudioRef.current.src
      identityAudioRef.current.pause()
      identityAudioRef.current.removeAttribute('src')
      identityAudioRef.current.load()
      URL.revokeObjectURL(oldSrc)
    }
  }

  const handleIdentitySpeedChange = (speed: number) => {
    setIdentitySpeed(speed)
    localStorage.setItem('daygo-identity-speed', speed.toString())
    if (identityAudioRef.current && identityAudioRef.current.src) {
      const oldSrc = identityAudioRef.current.src
      identityAudioRef.current.pause()
      identityAudioRef.current.removeAttribute('src')
      identityAudioRef.current.load()
      URL.revokeObjectURL(oldSrc)
    }
  }

  const handlePlayIdentityAffirmations = async () => {
    if (identities.length === 0) return
    const audio = identityAudioRef.current
    if (!audio) return

    if (isPlayingIdentityAudio) {
      audio.pause()
      setIsPlayingIdentityAudio(false)
      return
    }

    if (audio.src && audio.src !== window.location.href) {
      audio.play()
      setIsPlayingIdentityAudio(true)
      return
    }

    setIsGeneratingIdentityAudio(true)
    try {
      const response = await fetch('/api/identities/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identities: identities.map(i => ({ text: i.text })),
          voice: identityVoice,
          speed: identitySpeed,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Identity TTS API error:', errorData)
        throw new Error(errorData.error || 'Failed to generate audio')
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      if (audio.src && audio.src !== window.location.href) {
        URL.revokeObjectURL(audio.src)
      }

      audio.src = audioUrl
      audio.onended = () => {
        setIsPlayingIdentityAudio(false)
      }

      await audio.play()
      setIsPlayingIdentityAudio(true)
    } catch (error) {
      console.error('Error generating identity audio:', error)
    } finally {
      setIsGeneratingIdentityAudio(false)
    }
  }

  const handleTodoDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = todos.findIndex((t) => t.id === active.id)
      const newIndex = todos.findIndex((t) => t.id === over.id)
      const newOrder = arrayMove(todos, oldIndex, newIndex)
      const orderedIds = newOrder.map((t) => t.id)
      reorderTodosMutation.mutate(orderedIds)
    }
  }

  const handleJournalDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = prompts.findIndex((p) => p.id === active.id)
      const newIndex = prompts.findIndex((p) => p.id === over.id)
      const newOrder = arrayMove(prompts, oldIndex, newIndex)
      const orderedIds = newOrder.map((p) => p.id)
      reorderJournalsMutation.mutate(orderedIds)
    }
  }

  const handlePrevDay = useCallback(() => {
    if (isAnimating) return
    setIsAnimating(true)
    setSwipeDirection('right') // Slide out to the right
    setTimeout(() => {
      setSelectedDate(prev => {
        const newDate = new Date(prev)
        newDate.setDate(newDate.getDate() - 1)
        return newDate
      })
      setSwipeDirection(null)
      setSlideInDirection('left') // New content slides in from left
      setTimeout(() => {
        setSlideInDirection(null)
        setIsAnimating(false)
      }, 350)
    }, 300)
  }, [isAnimating])

  const handleNextDay = useCallback(() => {
    if (isAnimating) return
    setIsAnimating(true)
    setSwipeDirection('left') // Slide out to the left
    setTimeout(() => {
      setSelectedDate(prev => {
        const newDate = new Date(prev)
        newDate.setDate(newDate.getDate() + 1)
        return newDate
      })
      setSwipeDirection(null)
      setSlideInDirection('right') // New content slides in from right
      setTimeout(() => {
        setSlideInDirection(null)
        setIsAnimating(false)
      }, 350)
    }, 300)
  }, [isAnimating])

  // Swipe/drag handlers for day navigation
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => handleNextDay(),
    onSwipedRight: () => handlePrevDay(),
    trackMouse: true,
    trackTouch: true,
    delta: 50,
    swipeDuration: 500,
    preventScrollOnSwipe: false,
  })

  const handleAddItem = () => {
    if (!newItemText.trim()) return

    if (addType === 'habit') {
      createHabitMutation.mutate({ name: newItemText, description: newItemDescription || undefined })
    } else if (addType === 'mantra') {
      createMantraMutation.mutate(newItemText)
    } else if (addType === 'todo') {
      createTodoMutation.mutate(newItemText)
    } else if (addType === 'vision') {
      createVisionMutation.mutate(newItemText)
    } else if (addType === 'identity') {
      createIdentityMutation.mutate(newItemText.replace(/\n/g, '<br>'))
    } else if (addType === 'book') {
      createBookMutation.mutate({ title: newItemText, author: newBookAuthor || undefined })
    } else {
      createPromptMutation.mutate(newItemText)
    }
  }

  const isLoading = habitsLoading || mantrasLoading || promptsLoading || todosLoading || visionsLoading || identitiesLoading

  return (
    <div {...swipeHandlers} className="max-w-lg mx-auto px-5 py-8 pb-32 min-h-screen bg-gradient-to-b from-bevel-bg to-white dark:from-slate-900 dark:to-slate-950 overflow-x-hidden">
      {/* Hidden audio elements for iOS PWA compatibility */}
      <audio ref={visionAudioRef} playsInline preload="none" style={{ display: 'none' }} />
      <audio ref={mantraAudioRef} playsInline preload="none" style={{ display: 'none' }} />
      <audio ref={identityAudioRef} playsInline preload="none" style={{ display: 'none' }} />
      {/* Google Calendar notification toast */}
      {gcalNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 bg-green-500 text-white rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span className="text-sm font-medium">{gcalNotification}</span>
          <button onClick={() => setGcalNotification(null)} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tagline */}
      <p className="text-center text-sm font-semibold tracking-widest uppercase text-brand-500 dark:text-brand-400 mt-10 mb-6">
        Design your best day, every day.
      </p>

      {/* Header with date navigation */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={handlePrevDay}
          className="p-2.5 hover:bg-brand-50 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 active:scale-95"
        >
          <ChevronLeft className="w-5 h-5 text-bevel-text-secondary dark:text-slate-400" />
        </button>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-bevel-text dark:text-white tracking-tight">
            {formatDisplayDate(selectedDate)}
          </h1>
          <p className="text-sm text-bevel-text-secondary dark:text-slate-400 mt-0.5">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <Link
            href="/year"
            className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 transition-colors"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Year View
          </Link>
        </div>
        <button
          onClick={handleNextDay}
          className="p-2.5 hover:bg-brand-50 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 active:scale-95"
        >
          <ChevronRight className="w-5 h-5 text-bevel-text-secondary dark:text-slate-400" />
        </button>
      </div>

      {/* Quick Jump Chips */}
      <div className="flex items-center gap-2 mb-6 -mt-2 flex-wrap">
        <button
          onClick={() => document.getElementById('section-meal-plan')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="px-3 py-1.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors active:scale-95"
        >
          Meal Plan
        </button>
        <button
          onClick={() => document.getElementById('section-journal')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="px-3 py-1.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors active:scale-95"
        >
          Journal
        </button>
        <button
          onClick={() => document.getElementById('section-expenses')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="px-3 py-1.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors active:scale-95"
        >
          Expenses
        </button>
      </div>

      {/* Editable Home Vision Roadmap */}
      {user && (
        <HomeVisionSection userId={user.id} selectedDate={selectedDate} />
      )}


      {/* Daily Reflection - bertmill19 */}
      {user?.email === 'bertmill19@gmail.com' && (
        <div className="mb-10 -mt-6">
          <div className="rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-[2px]">
            <div className="rounded-2xl bg-white dark:bg-slate-900 p-5">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-extrabold text-bevel-text dark:text-white tracking-tight uppercase">Daily Reflection</h2>
              </div>
              <p className="text-base font-bold text-bevel-text dark:text-white mb-4">Did I live out the best possible day?</p>

              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => { setReflectionAnswer(true); setReflectionSaved(false) }}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                    reflectionAnswer === true
                      ? 'bg-emerald-500 text-white shadow-lg scale-[1.02]'
                      : 'bg-slate-100 dark:bg-slate-800 text-bevel-text-secondary dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => { setReflectionAnswer(false); setReflectionSaved(false) }}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                    reflectionAnswer === false
                      ? 'bg-rose-500 text-white shadow-lg scale-[1.02]'
                      : 'bg-slate-100 dark:bg-slate-800 text-bevel-text-secondary dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-500/10'
                  }`}
                >
                  No
                </button>
              </div>

              {reflectionAnswer !== null && (
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-bevel-text-secondary dark:text-slate-400">
                    {reflectionAnswer ? 'Why was it the best?' : 'What would have made it better?'}
                  </label>
                  <textarea
                    value={reflectionReason}
                    onChange={(e) => { setReflectionReason(e.target.value); setReflectionSaved(false) }}
                    placeholder={reflectionAnswer ? 'I crushed it because...' : 'Tomorrow I will...'}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm text-bevel-text dark:text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-orange-400/50"
                    rows={3}
                  />
                  <button
                    onClick={() => saveReflectionMutation.mutate({ answer: reflectionAnswer, reason: reflectionReason })}
                    disabled={saveReflectionMutation.isPending || reflectionSaved}
                    className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${
                      reflectionSaved
                        ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg'
                    }`}
                  >
                    {saveReflectionMutation.isPending ? 'Saving...' : reflectionSaved ? 'Saved' : 'Save Reflection'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Gift Ideas for Katy - bertmill19 */}
      {user?.email === 'bertmill19@gmail.com' && (
        <div className="mb-8">
          <div className="rounded-2xl bg-white dark:bg-slate-800/50 shadow-card border border-pink-100 dark:border-pink-500/10 overflow-hidden">
            <button
              onClick={() => setShowGiftIdeas(!showGiftIdeas)}
              className="w-full flex items-center justify-between p-4 hover:bg-pink-50/30 dark:hover:bg-pink-500/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500" />
                <h2 className="font-bold text-bevel-text dark:text-white">Gift Ideas for Katy</h2>
                <span className="text-xs text-bevel-text-secondary dark:text-slate-400">({giftIdeas.length})</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-bevel-text-secondary transition-transform ${showGiftIdeas ? 'rotate-180' : ''}`} />
            </button>
            {showGiftIdeas && (
              <div className="px-4 pb-4 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newGiftIdea}
                    onChange={(e) => setNewGiftIdea(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && newGiftIdea.trim() && user) {
                        await giftIdeasService.addGiftIdea(user.id, newGiftIdea.trim())
                        queryClient.invalidateQueries({ queryKey: ['gift-ideas', user.id] })
                        setNewGiftIdea('')
                      }
                    }}
                    placeholder="Add a gift idea..."
                    className="flex-1 text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-bevel-text dark:text-white placeholder-bevel-text-secondary focus:outline-none focus:ring-2 focus:ring-pink-300 dark:focus:ring-pink-500/30"
                  />
                  <button
                    onClick={async () => {
                      if (newGiftIdea.trim() && user) {
                        await giftIdeasService.addGiftIdea(user.id, newGiftIdea.trim())
                        queryClient.invalidateQueries({ queryKey: ['gift-ideas', user.id] })
                        setNewGiftIdea('')
                      }
                    }}
                    className="px-3 py-2 rounded-lg bg-pink-500 text-white text-sm font-medium hover:bg-pink-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {giftIdeas.length === 0 ? (
                  <p className="text-sm text-bevel-text-secondary dark:text-slate-400 italic">No ideas yet — add one whenever inspiration strikes!</p>
                ) : (
                  <div className="space-y-2">
                    {giftIdeas.map((idea) => (
                      <div key={idea.id} className="flex items-center gap-2 p-2 rounded-lg bg-pink-50/50 dark:bg-pink-500/5">
                        <button
                          onClick={async () => {
                            await giftIdeasService.toggleUsed(idea.id, !idea.used)
                            queryClient.invalidateQueries({ queryKey: ['gift-ideas', user?.id] })
                          }}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            idea.used ? 'bg-pink-500 border-pink-500' : 'border-pink-300 dark:border-pink-600 hover:border-pink-400'
                          }`}
                        >
                          {idea.used && <Check className="w-3 h-3 text-white" />}
                        </button>
                        <p className={`text-sm flex-1 ${idea.used ? 'text-bevel-text-secondary line-through' : 'text-bevel-text dark:text-slate-300'}`}>{idea.idea}</p>
                        <button
                          onClick={async () => {
                            await giftIdeasService.deleteGiftIdea(idea.id)
                            queryClient.invalidateQueries({ queryKey: ['gift-ideas', user?.id] })
                          }}
                          className="text-bevel-text-secondary hover:text-red-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Score Ring */}
      <div className="flex flex-col items-center mb-8">
        <ScoreRing score={score} />
      </div>

      {/* My Values */}
      {values.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-bevel-text-secondary dark:text-slate-400 mb-3">
            My Values
          </h2>
          <div className="flex flex-wrap gap-2">
            {values.map((value) => (
              <span
                key={value.id}
                className="px-3 py-1.5 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-full text-sm font-medium"
              >
                {value.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div
          className={`space-y-8 ${
            swipeDirection === 'left' ? 'animate-slide-out-left' :
            swipeDirection === 'right' ? 'animate-slide-out-right' :
            slideInDirection === 'left' ? 'animate-slide-in-left' :
            slideInDirection === 'right' ? 'animate-slide-in-right' :
            ''
          }`}
        >

          {/* Today's Pep Talk */}
          {todaysPepTalk && (
            <section className="section-gradient-mantra rounded-2xl p-4 -mx-4">
              <button
                onClick={() => toggleSection('pepTalk')}
                className="w-full flex items-center justify-between mb-4 group cursor-pointer"
              >
                <h2 className="section-header text-bevel-text-secondary dark:text-slate-400">
                  Today&apos;s Pep Talk
                </h2>
                {expandedSections.pepTalk ? (
                  <ChevronUp className="w-4 h-4 text-bevel-text-secondary group-hover:text-bevel-text dark:group-hover:text-slate-300 transition-colors" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-bevel-text-secondary group-hover:text-bevel-text dark:group-hover:text-slate-300 transition-colors" />
                )}
              </button>
              {expandedSections.pepTalk && (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-slate-800/80 shadow-card rounded-2xl p-5 border border-mantra/10">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-mantra/10 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-mantra" />
                      </div>
                      <div className="flex-1">
                        <p className="text-bevel-text dark:text-white font-medium leading-relaxed italic">{todaysPepTalk.text}</p>
                      </div>
                      <button
                        onClick={() => deletePepTalkMutation.mutate()}
                        className="p-2 -m-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors flex-shrink-0"
                        aria-label="Delete pep talk"
                      >
                        <X className="w-5 h-5 text-bevel-text-secondary dark:text-slate-400" />
                      </button>
                    </div>
                    <div className="mt-4">
                      <PepTalkAudioPlayer
                        audioUrl={todaysPepTalk.audio_url}
                        onGenerateAudio={async () => {
                          await generateAudioMutation.mutateAsync(todaysPepTalk.text)
                        }}
                        isGenerating={generateAudioMutation.isPending}
                      />
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Identities */}
          <section className="section-gradient-identity rounded-2xl p-4 -mx-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => toggleSection('identities')}
                className="flex items-center gap-2 group cursor-pointer"
              >
                <h2 className="section-header text-bevel-text-secondary dark:text-slate-400">
                  The Lifestyle {identities.length > 0 && <span className="text-identity">({identities.length})</span>}
                </h2>
                {expandedSections.identities ? (
                  <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-slate-300 transition-colors" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-slate-300 transition-colors" />
                )}
              </button>
              {identities.length > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePlayIdentityAffirmations}
                    disabled={isGeneratingIdentityAudio}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-pink-500 hover:bg-pink-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Play identities"
                  >
                    {isGeneratingIdentityAudio ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : isPlayingIdentityAudio ? (
                      <>
                        <Pause className="w-4 h-4" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4" />
                        <span>Play</span>
                      </>
                    )}
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowIdentityVoiceSettings(!showIdentityVoiceSettings)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      title="Voice settings"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    {showIdentityVoiceSettings && (
                      <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-3 z-50">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1.5">Voice</label>
                            <select
                              value={identityVoice}
                              onChange={(e) => handleIdentityVoiceChange(e.target.value as any)}
                              className="w-full px-2 py-1.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                            >
                              <option value="adam">Adam (deep male)</option>
                              <option value="rachel">Rachel (warm female)</option>
                              <option value="bella">Bella (soft female)</option>
                              <option value="domi">Domi (strong female)</option>
                              <option value="elli">Elli (young female)</option>
                              <option value="antoni">Antoni (warm male)</option>
                              <option value="arnold">Arnold (deep male)</option>
                              <option value="josh">Josh (deep male)</option>
                              <option value="sam">Sam (raspy male)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1.5">
                              Speed: {identitySpeed.toFixed(2)}x
                            </label>
                            <input
                              type="range"
                              min="0.5"
                              max="1.5"
                              step="0.05"
                              value={identitySpeed}
                              onChange={(e) => handleIdentitySpeedChange(parseFloat(e.target.value))}
                              className="w-full h-1.5 bg-gray-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-pink-500"
                            />
                            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                              <span>Slow</span>
                              <span>Fast</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {expandedSections.identities && (
              <>
                {identities.length === 0 ? (
                  <button
                    onClick={() => {
                      setAddType('identity')
                      setShowAddModal(true)
                    }}
                    className="w-full py-4 px-4 bg-pink-500/10 hover:bg-pink-500/20 border border-dashed border-pink-500/30 rounded-xl text-pink-500 font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Add Lifestyle
                  </button>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleIdentityDragEnd}
                  >
                    <SortableContext
                      items={identities.map((i) => i.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {identities.map((identity) => (
                          <SortableIdentityCard
                            key={identity.id}
                            identity={identity}
                            onEdit={(i) => setSelectedIdentity(i)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </>
            )}
          </section>

          {/* Visions */}
          {visions.length > 0 && (
            <section className="section-gradient-vision rounded-2xl p-4 -mx-4">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => toggleSection('visions')}
                  className="flex items-center gap-2 group cursor-pointer"
                >
                  <h2 className="section-header text-bevel-text-secondary dark:text-slate-400">
                    Visions
                  </h2>
                  {expandedSections.visions ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-slate-300 transition-colors" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-slate-300 transition-colors" />
                  )}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePlayVisionAffirmations}
                    disabled={isGeneratingVisionAudio}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-bevel-blue hover:bg-bevel-blue/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Play affirmations"
                  >
                    {isGeneratingVisionAudio ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : isPlayingVisionAudio ? (
                      <>
                        <Pause className="w-4 h-4" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4" />
                        <span>Play</span>
                      </>
                    )}
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowVisionVoiceSettings(!showVisionVoiceSettings)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      title="Voice settings"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    {showVisionVoiceSettings && (
                      <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-3 z-50">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1.5">Voice</label>
                            <select
                              value={visionVoice}
                              onChange={(e) => handleVisionVoiceChange(e.target.value as any)}
                              className="w-full px-2 py-1.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-bevel-blue/50"
                            >
                              <option value="rachel">Rachel (warm female)</option>
                              <option value="bella">Bella (soft female)</option>
                              <option value="domi">Domi (strong female)</option>
                              <option value="elli">Elli (young female)</option>
                              <option value="antoni">Antoni (warm male)</option>
                              <option value="arnold">Arnold (deep male)</option>
                              <option value="adam">Adam (deep male)</option>
                              <option value="josh">Josh (deep male)</option>
                              <option value="sam">Sam (raspy male)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1.5">
                              Speed: {visionSpeed.toFixed(2)}x
                            </label>
                            <input
                              type="range"
                              min="0.5"
                              max="1.5"
                              step="0.05"
                              value={visionSpeed}
                              onChange={(e) => handleVisionSpeedChange(parseFloat(e.target.value))}
                              className="w-full h-1.5 bg-gray-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-bevel-blue"
                            />
                            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                              <span>Slow</span>
                              <span>Fast</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {expandedSections.visions && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleVisionDragEnd}
                >
                  <SortableContext
                    items={visions.map((v) => v.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {visions.map((vision) => (
                        <SortableVisionCard
                          key={vision.id}
                          vision={vision}
                          onEdit={(v) => setSelectedVision(v)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </section>
          )}

          {/* Mantras */}
          {mantras.length > 0 && (
            <section className="section-gradient-mantra rounded-2xl p-4 -mx-4">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => toggleSection('mantras')}
                  className="flex items-center gap-2 group cursor-pointer"
                >
                  <h2 className="section-header text-bevel-text-secondary dark:text-slate-400">
                    Daily Mantras {dailyMantras.length > 0 && <span className="text-mantra">({dailyMantras.length})</span>}
                  </h2>
                  {expandedSections.mantras ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-slate-300 transition-colors" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-slate-300 transition-colors" />
                  )}
                </button>
                {dailyMantras.length > 0 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handlePlayMantraAffirmations}
                      disabled={isGeneratingMantraAudio}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-mantra hover:bg-mantra/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Play mantras"
                    >
                      {isGeneratingMantraAudio ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : isPlayingMantraAudio ? (
                        <>
                          <Pause className="w-4 h-4" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4" />
                          <span>Play</span>
                        </>
                      )}
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setShowMantraVoiceSettings(!showMantraVoiceSettings)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        title="Voice settings"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      {showMantraVoiceSettings && (
                        <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-3 z-50">
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1.5">Voice</label>
                              <select
                                value={mantraVoice}
                                onChange={(e) => handleMantraVoiceChange(e.target.value as any)}
                                className="w-full px-2 py-1.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-mantra/50"
                              >
                                <option value="rachel">Rachel (warm female)</option>
                                <option value="bella">Bella (soft female)</option>
                                <option value="domi">Domi (strong female)</option>
                                <option value="elli">Elli (young female)</option>
                                <option value="antoni">Antoni (warm male)</option>
                                <option value="arnold">Arnold (deep male)</option>
                                <option value="adam">Adam (deep male)</option>
                                <option value="josh">Josh (deep male)</option>
                                <option value="sam">Sam (raspy male)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1.5">
                                Speed: {mantraSpeed.toFixed(2)}x
                              </label>
                              <input
                                type="range"
                                min="0.5"
                                max="1.5"
                                step="0.05"
                                value={mantraSpeed}
                                onChange={(e) => handleMantraSpeedChange(parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-gray-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-mantra"
                              />
                              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                                <span>Slow</span>
                                <span>Fast</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {expandedSections.mantras && (
                <>
                  {dailyMantras.length === 0 ? (
                    <button
                      onClick={() => generateDailyMantras(mantras)}
                      className="w-full py-4 px-4 bg-mantra/10 hover:bg-mantra/20 border border-dashed border-mantra/30 rounded-xl text-mantra font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <Shuffle className="w-5 h-5" />
                      Generate Daily Mantras
                    </button>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {dailyMantras.map((mantra) => (
                          <MantraCard
                            key={mantra.id}
                            mantra={mantra}
                            onEdit={(m) => setSelectedMantra(m)}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => generateDailyMantras(mantras)}
                        className="w-full mt-3 py-2 px-4 text-sm text-mantra hover:bg-mantra/10 rounded-lg flex items-center justify-center gap-2 transition-colors"
                      >
                        <Shuffle className="w-4 h-4" />
                        Shuffle Mantras
                      </button>
                    </>
                  )}
                </>
              )}
            </section>
          )}

          {/* Habits */}
          {habits.length > 0 && (
            <section className="section-gradient-habit rounded-2xl p-4 -mx-4">
              <button
                onClick={() => toggleSection('habits')}
                className="w-full flex items-center justify-between mb-4 group cursor-pointer"
              >
                <h2 className="section-header text-bevel-text-secondary dark:text-slate-400">
                  Habits <span className="text-habit">({habits.filter(h => h.completed).length}/{habits.length})</span>
                </h2>
                {expandedSections.habits ? (
                  <ChevronUp className="w-4 h-4 text-bevel-text-secondary group-hover:text-bevel-text dark:group-hover:text-slate-300 transition-colors" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-bevel-text-secondary group-hover:text-bevel-text dark:group-hover:text-slate-300 transition-colors" />
                )}
              </button>
              {expandedSections.habits && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleHabitDragEnd}
                >
                  <SortableContext
                    items={habits.map((h) => h.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {habits.map((habit) => (
                        <SortableHabitCard
                          key={habit.id}
                          habit={habit}
                          onEdit={(h) => setSelectedHabit(h)}
                          onToggle={(habitId, completed) => toggleHabitMutation.mutate({ habitId, completed })}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </section>
          )}

          {/* Journal Prompts */}
          {prompts.length > 0 && (
            <section id="section-journal" className="section-gradient-journal rounded-2xl p-4 -mx-4">
              <button
                onClick={() => toggleSection('journal')}
                className="w-full flex items-center justify-between mb-4 group cursor-pointer"
              >
                <h2 className="section-header text-bevel-text-secondary dark:text-slate-400">
                  Journal <span className="text-journal">({prompts.length})</span>
                </h2>
                {expandedSections.journal ? (
                  <ChevronUp className="w-4 h-4 text-bevel-text-secondary group-hover:text-bevel-text dark:group-hover:text-slate-300 transition-colors" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-bevel-text-secondary group-hover:text-bevel-text dark:group-hover:text-slate-300 transition-colors" />
                )}
              </button>
              {expandedSections.journal && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleJournalDragEnd}
                >
                  <SortableContext
                    items={prompts.map((p) => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {prompts.map((prompt) => (
                        <SortableJournalCard
                          key={prompt.id}
                          prompt={prompt}
                          onSave={(promptId, entry) =>
                            saveEntryMutation.mutate({ promptId, entry })
                          }
                          onEdit={(p) => {
                            setSelectedJournal(p)
                            setEditJournalText(p.prompt)
                            setEditJournalTemplate(p.template_text || '')
                            setEditJournalIcon(p.icon || 'book-open')
                            setEditJournalColor(p.color || '#E97451')
                          }}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </section>
          )}

          {/* AI Journals */}
          {aiJournals.length > 0 && (
            <section className="bg-gradient-to-br from-cyan-50/50 to-blue-50/50 dark:from-cyan-900/10 dark:to-blue-900/10 rounded-2xl p-4 -mx-4">
              <button
                onClick={() => toggleSection('aiJournals')}
                className="w-full flex items-center justify-between mb-4 group cursor-pointer"
              >
                <h2 className="section-header text-bevel-text-secondary dark:text-slate-400">
                  AI Journals <span className="text-cyan-500">({aiJournals.length})</span>
                </h2>
                {expandedSections.aiJournals ? (
                  <ChevronUp className="w-4 h-4 text-bevel-text-secondary group-hover:text-bevel-text dark:group-hover:text-slate-300 transition-colors" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-bevel-text-secondary group-hover:text-bevel-text dark:group-hover:text-slate-300 transition-colors" />
                )}
              </button>
              {expandedSections.aiJournals && (
                <div className="space-y-3">
                  {aiJournals.map((journal) => (
                    <div
                      key={journal.id}
                      className="bg-bevel-card dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-100 dark:border-slate-700/50"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-bevel-text dark:text-white text-sm">
                            {journal.prompt}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              regenerateAiJournal(journal)
                            }}
                            disabled={regeneratingJournalId === journal.id}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="Regenerate"
                          >
                            <RefreshCw className={`w-4 h-4 text-gray-400 ${regeneratingJournalId === journal.id ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedAiJournal(journal)
                            }}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <span className="text-gray-400 text-lg">•••</span>
                          </button>
                        </div>
                      </div>
                      {journal.response ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-slate-300 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_p]:my-1">
                          <ReactMarkdown>{journal.response}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-400 dark:text-slate-500 mb-2">No content generated yet</p>
                          <button
                            onClick={() => regenerateAiJournal(journal)}
                            disabled={regeneratingJournalId === journal.id}
                            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 text-white text-sm rounded-lg font-medium transition-all flex items-center justify-center gap-2 mx-auto"
                          >
                            {regeneratingJournalId === journal.id ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                Generate
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Healthy Foods */}
          <section id="section-meal-plan" className="bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-2xl p-4 -mx-4">
            <button
              onClick={() => toggleSection('healthyFoods')}
              className="w-full flex items-center justify-between mb-4 group cursor-pointer"
            >
              <h2 className="section-header text-bevel-text-secondary dark:text-slate-400">
                Eat Healthy Today
              </h2>
              {expandedSections.healthyFoods ? (
                <ChevronUp className="w-4 h-4 text-bevel-text-secondary group-hover:text-bevel-text dark:group-hover:text-slate-300 transition-colors" />
              ) : (
                <ChevronDown className="w-4 h-4 text-bevel-text-secondary group-hover:text-bevel-text dark:group-hover:text-slate-300 transition-colors" />
              )}
            </button>
            {expandedSections.healthyFoods && (
              <HealthyFoodsCard />
            )}
          </section>

          {/* Push-Ups */}
          <section className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-2xl p-4 -mx-4">
            <button
              onClick={() => toggleSection('pushups')}
              className="w-full flex items-center justify-between mb-4 group cursor-pointer"
            >
              <h2 className="section-header text-bevel-text-secondary dark:text-slate-400">
                Morning Push-Ups {todayPushup && <span className="text-blue-500">({todayPushup.count})</span>}
              </h2>
              {expandedSections.pushups ? (
                <ChevronUp className="w-4 h-4 text-bevel-text-secondary group-hover:text-bevel-text dark:group-hover:text-slate-300 transition-colors" />
              ) : (
                <ChevronDown className="w-4 h-4 text-bevel-text-secondary group-hover:text-bevel-text dark:group-hover:text-slate-300 transition-colors" />
              )}
            </button>
            {expandedSections.pushups && (
              <div className="space-y-4">
                {/* Log Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="Count"
                    value={pushupCount}
                    onChange={(e) => setPushupCount(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && pushupCount) {
                        upsertPushupMutation.mutate(parseInt(pushupCount))
                      }
                    }}
                    className="w-24 px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <button
                    onClick={() => {
                      if (!pushupCount) return
                      upsertPushupMutation.mutate(parseInt(pushupCount))
                    }}
                    disabled={!pushupCount || upsertPushupMutation.isPending}
                    className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl transition-colors font-medium"
                  >
                    {todayPushup ? 'Update' : 'Save'}
                  </button>
                  {todayPushup && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">Logged today</span>
                  )}
                </div>

                {/* Line Chart */}
                {pushupLogs.length > 1 && (
                  <div className="bg-white dark:bg-slate-800/50 rounded-xl p-4 border border-gray-100 dark:border-slate-700/50">
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                      Recent Progress
                    </h3>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={pushupLogs.map((l: PushupLog) => ({
                          date: new Date(l.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                          count: l.count,
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                          <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" allowDecimals={false} />
                          <Tooltip
                            formatter={(value) => [value, 'Push-ups']}
                            contentStyle={{
                              backgroundColor: 'var(--color-bg, #fff)',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                          <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} activeDot={{ r: 5 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Expenses */}
          <section id="section-expenses" className="section-gradient-expense rounded-2xl p-4 -mx-4">
            <button
              onClick={() => toggleSection('expenses')}
              className="w-full flex items-center justify-between mb-4 group cursor-pointer"
            >
              <h2 className="section-header text-bevel-text-secondary dark:text-slate-400">
                Expenses {dailyExpenseTotal > 0 && <span className="text-expense">(${dailyExpenseTotal.toFixed(2)})</span>}
              </h2>
              <div className="flex items-center gap-3">
                {expenses.length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                    {expenses.length} item{expenses.length !== 1 ? 's' : ''}
                  </span>
                )}
                {expandedSections.expenses ? (
                  <ChevronUp className="w-4 h-4 text-bevel-text-secondary group-hover:text-bevel-text dark:group-hover:text-slate-300 transition-colors" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-bevel-text-secondary group-hover:text-bevel-text dark:group-hover:text-slate-300 transition-colors" />
                )}
              </div>
            </button>
            {expandedSections.expenses && (
              <div className="space-y-4">
                {/* Add Expense Form */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-shrink-0 w-24">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={newExpenseAmount}
                      onChange={(e) => setNewExpenseAmount(e.target.value)}
                      className="w-full pl-7 pr-2 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    />
                  </div>
                  <select
                    value={newExpenseCategory}
                    onChange={(e) => setNewExpenseCategory(e.target.value as ExpenseCategory)}
                    className="flex-shrink-0 px-2 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  >
                    {(['Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Health', 'Other'] as ExpenseCategory[]).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Note (optional)"
                    value={newExpenseDescription}
                    onChange={(e) => setNewExpenseDescription(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newExpenseAmount) {
                        createExpenseMutation.mutate({
                          amount: parseFloat(newExpenseAmount),
                          category: newExpenseCategory,
                          description: newExpenseDescription || null,
                        })
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (!newExpenseAmount) return
                      createExpenseMutation.mutate({
                        amount: parseFloat(newExpenseAmount),
                        category: newExpenseCategory,
                        description: newExpenseDescription || null,
                      })
                    }}
                    disabled={!newExpenseAmount || createExpenseMutation.isPending}
                    className="flex-shrink-0 p-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Expense List (Collapsible) */}
                {expenses.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowExpenseList(!showExpenseList)}
                      className="flex items-center justify-between w-full px-3 py-2 bg-white dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700/50 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <span>View {expenses.length} expense{expenses.length !== 1 ? 's' : ''}</span>
                      {showExpenseList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {showExpenseList && (
                      <div className="space-y-2 mt-2">
                        {expenses.map((expense: Expense) => (
                          <div
                            key={expense.id}
                            className="flex items-center justify-between bg-white dark:bg-slate-800/50 rounded-xl p-3 border border-gray-100 dark:border-slate-700/50"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="font-semibold text-bevel-text dark:text-white">
                                ${Number(expense.amount).toFixed(2)}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                {expense.category}
                              </span>
                              {expense.description && (
                                <span className="text-sm text-gray-500 dark:text-slate-400 truncate">
                                  {expense.description}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => deleteExpenseMutation.mutate(expense.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Monthly Spending Chart */}
                {monthlyTotals.some(m => m.total > 0) && (() => {
                  const chartData = monthlyTotals.map((m, i) => ({
                    month: new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short' }),
                    total: m.total,
                    isCurrent: i === monthlyTotals.length - 1,
                  }))
                  const current = monthlyTotals.length >= 1 ? monthlyTotals[monthlyTotals.length - 1] : null
                  const previous = monthlyTotals.length >= 2 ? monthlyTotals[monthlyTotals.length - 2] : null
                  const delta = current && previous ? current.total - previous.total : null
                  const pctChange = delta !== null && previous && previous.total > 0
                    ? ((delta / previous.total) * 100)
                    : null

                  return (
                    <div className="bg-white dark:bg-slate-800/50 rounded-xl p-4 border border-gray-100 dark:border-slate-700/50">
                      <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                        Monthly Spending
                      </h3>
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                            <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `$${v}`} />
                            <Tooltip
                              formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Total']}
                              contentStyle={{
                                backgroundColor: 'var(--color-bg, #fff)',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '12px',
                              }}
                            />
                            <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                              {chartData.map((entry, index) => (
                                <Cell key={index} fill={entry.isCurrent ? '#f97316' : '#fdba74'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Comparison Card */}
                      {current && previous && delta !== null && !(previous.total === 0 && current.total === 0) && (
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-700/30 rounded-lg">
                          <div className="flex items-baseline justify-between mb-1">
                            <div>
                              <span className="text-lg font-bold text-bevel-text dark:text-white">
                                ${current.total.toFixed(2)}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-slate-400 ml-1.5">
                                {new Date(current.month + '-01').toLocaleDateString('en-US', { month: 'long' })}
                              </span>
                            </div>
                            <div className={`flex items-center gap-1 text-sm font-semibold ${delta > 0 ? 'text-red-500' : 'text-green-500'}`}>
                              {delta > 0 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              <span>${Math.abs(delta).toFixed(2)}</span>
                              {pctChange !== null && (
                                <span className="text-xs">({Math.abs(pctChange).toFixed(0)}%)</span>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 dark:text-slate-500">
                            vs {new Date(previous.month + '-01').toLocaleDateString('en-US', { month: 'long' })} — ${previous.total.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}
          </section>

          {/* Books */}
          <section className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-2xl p-4 -mx-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => toggleSection('books')}
                className="flex items-center gap-2 group cursor-pointer"
              >
                <h2 className="section-header text-bevel-text-secondary dark:text-slate-400">
                  Books <span className="text-amber-500">({currentYearBooksRead}/{BOOKS_GOAL} this year)</span>
                </h2>
                {expandedSections.books ? (
                  <ChevronUp className="w-4 h-4 text-bevel-text-secondary group-hover:text-bevel-text dark:group-hover:text-slate-300 transition-colors" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-bevel-text-secondary group-hover:text-bevel-text dark:group-hover:text-slate-300 transition-colors" />
                )}
              </button>
            </div>
            {expandedSections.books && (
              <>
                {/* Books Read This Year */}
                <Link
                  href="/books"
                  className="block mb-4 bg-bevel-card dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 border border-amber-200/50 dark:border-amber-500/10 hover:shadow-bevel transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <span className="font-semibold text-bevel-text dark:text-white">Books Read in {new Date().getFullYear()}</span>
                    </div>
                    <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{currentYearBooksRead}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
                        style={{ width: `${Math.min((currentYearBooksRead / BOOKS_GOAL) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-bevel-text-secondary dark:text-slate-400">{BOOKS_GOAL} goal</span>
                  </div>
                </Link>

                {/* Currently Reading */}
                {currentlyReadingBooks.length > 0 && (
                  <p className="text-xs font-semibold text-bevel-text-secondary dark:text-slate-400 uppercase tracking-wide mb-3">Currently Reading</p>
                )}
                {currentlyReadingBooks.length === 0 ? (
                  <button
                    onClick={() => {
                      setAddType('book')
                      setShowAddModal(true)
                    }}
                    className="w-full py-4 px-4 bg-amber-500/10 hover:bg-amber-500/20 border border-dashed border-amber-500/30 rounded-xl text-amber-600 dark:text-amber-400 font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Add a Book
                  </button>
                ) : (
                  <div className="space-y-3">
                    {currentlyReadingBooks.map((book) => (
                      <div
                        key={book.id}
                        onClick={() => setSelectedBook(book)}
                        className="bg-bevel-card dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-100 dark:border-slate-700/50 cursor-pointer hover:shadow-bevel transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-bevel-text dark:text-white">
                              {book.title}
                            </p>
                            {book.author && (
                              <p className="text-sm text-gray-500 dark:text-slate-400">
                                by {book.author}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          {/* To-Dos */}
          {todos.length > 0 && (
            <section className="bg-brand-50/30 dark:bg-brand-900/10 rounded-2xl p-4 -mx-4">
              <button
                onClick={() => toggleSection('todos')}
                className="w-full flex items-center justify-between mb-4 group cursor-pointer"
              >
                <h2 className="section-header text-bevel-text-secondary dark:text-slate-400">
                  To-Do <span className="text-todo">({todos.filter(t => t.completed).length}/{todos.length})</span>
                </h2>
                {expandedSections.todos ? (
                  <ChevronUp className="w-4 h-4 text-bevel-text-secondary group-hover:text-bevel-text dark:group-hover:text-slate-300 transition-colors" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-bevel-text-secondary group-hover:text-bevel-text dark:group-hover:text-slate-300 transition-colors" />
                )}
              </button>
              {expandedSections.todos && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleTodoDragEnd}
                >
                  <SortableContext
                    items={todos.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {todos.map((todo) => (
                        <SortableTodoCard
                          key={todo.id}
                          todo={todo}
                          onToggle={(todoId, completed) =>
                            toggleTodoMutation.mutate({ todoId, completed })
                          }
                          onEdit={(t) => setSelectedTodo(t)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </section>
          )}


          {habits.length === 0 && mantras.length === 0 && prompts.length === 0 && todos.length === 0 && visions.length === 0 && identities.length === 0 && (
            <div className="text-center py-20 px-6">
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-brand-100 to-brand-50 dark:from-brand-900/30 dark:to-brand-800/20 rounded-3xl flex items-center justify-center shadow-sm">
                  <Plus className="w-10 h-10 text-brand-500" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-bevel-text dark:text-white mb-3">
                Start your journey
              </h3>
              <p className="text-bevel-text-secondary dark:text-slate-400 mb-8 leading-relaxed max-w-xs mx-auto">
                Add your first habit, mantra, vision, lifestyle, journal prompt, or to-do to begin tracking your day!
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-8 py-3.5 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white rounded-xl font-semibold transition-all shadow-card hover:shadow-card-hover active:scale-[0.98]"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating Add Button */}
      <div className="fixed bottom-24 right-5">
        {/* Onboarding hint tooltip */}
        {showAddHint && (
          <div className="absolute bottom-16 right-0 mb-2 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card-hover p-5 w-64 border border-gray-100 dark:border-slate-700">
              <p className="text-bevel-text dark:text-white font-semibold mb-2">
                Add habits here
              </p>
              <p className="text-sm text-bevel-text-secondary dark:text-slate-400 mb-4 leading-relaxed">
                Tap the + button to add habits, mantras, and journal prompts.
              </p>
              <button
                onClick={dismissAddHint}
                className="text-sm text-brand-500 hover:text-brand-600 font-semibold transition-colors"
              >
                Got it
              </button>
            </div>
            {/* Arrow pointing to button */}
            <div className="absolute -bottom-2 right-5 w-4 h-4 bg-white dark:bg-slate-800 shadow-sm transform rotate-45 border-r border-b border-gray-100 dark:border-slate-700" />
          </div>
        )}
        <button
          onClick={() => {
            setShowAddModal(true)
            if (showAddHint) dismissAddHint()
          }}
          className={`w-14 h-14 bg-gradient-to-br from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 rounded-2xl flex items-center justify-center shadow-bevel-lg hover:shadow-card-hover transition-all active:scale-95 ${
            showAddHint ? 'ring-4 ring-brand-500/30 animate-pulse' : ''
          }`}
        >
          <Plus className="w-7 h-7 text-white" />
        </button>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => {
            setShowAddModal(false)
            setAddType(null)
            setNewItemText('')
            setNewItemDescription('')
          }}
        >
          <div
            className="bg-bevel-card dark:bg-slate-800 rounded-3xl p-6 w-full max-w-md shadow-bevel-lg"
            onClick={(e) => {
              e.stopPropagation()
              // Dismiss keyboard when clicking non-interactive elements (for iPad support)
              const target = e.target as HTMLElement
              const isInteractive = target.tagName === 'INPUT' ||
                                   target.tagName === 'TEXTAREA' ||
                                   target.tagName === 'BUTTON' ||
                                   target.closest('button')
              if (!isInteractive) {
                const activeElement = document.activeElement as HTMLElement
                if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                  activeElement.blur()
                }
              }
            }}
          >
            {/* Step 1: Type Selection */}
            {addType === null ? (
              <>
                <h2 className="text-xl font-bold text-bevel-text dark:text-white mb-5">Add New Item</h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { type: 'habit' as const, label: 'Habit', key: 'H', color: 'bg-teal hover:bg-teal/90' },
                    { type: 'mantra' as const, label: 'Mantra', key: 'M', color: 'bg-mantra hover:bg-mantra/90' },
                    { type: 'journal' as const, label: 'Journal', key: 'J', color: 'bg-journal hover:bg-journal/90' },
                    { type: 'todo' as const, label: 'To-Do', key: 'T', color: 'bg-blue-500 hover:bg-blue-600' },
                    { type: 'vision' as const, label: 'Vision', key: 'V', color: 'bg-blue-600 hover:bg-blue-700' },
                    { type: 'identity' as const, label: 'Lifestyle', key: 'I', color: 'bg-pink-500 hover:bg-pink-600' },
                    { type: 'book' as const, label: 'Book', key: 'B', color: 'bg-amber-500 hover:bg-amber-600' },
                    { type: 'pep-talk' as const, label: 'Pep Talk', key: 'P', color: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600' },
                    { type: 'ai-journal' as const, label: 'AI Journal', key: 'A', color: 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600' },
                  ].map(({ type, label, key, color }) => (
                    <button
                      key={type}
                      onClick={() => setAddType(type)}
                      className={`${color} text-white py-4 px-4 rounded-xl font-medium transition-all flex items-center justify-between`}
                    >
                      <span>{label}</span>
                      <span className="text-white/60 text-sm font-mono">{key}</span>
                    </button>
                  ))}
                </div>
                <p className="text-center text-gray-400 dark:text-slate-500 text-sm mt-4">
                  Press a key to quickly select
                </p>
              </>
            ) : (
              <>
                {/* Header with back button */}
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() => {
                      setAddType(null)
                      setNewItemText('')
                      setNewItemDescription('')
                      setNewEventTitle('')
                      setNewEventDescription('')
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                  </button>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white capitalize">
                    Add {addType === 'pep-talk' ? 'Pep Talk' : addType === 'todo' ? 'To-Do' : addType === 'ai-journal' ? 'AI Journal' : addType}
                  </h2>
                </div>

                {addType === 'pep-talk' ? (
              <div className="space-y-3">
                <textarea
                  ref={pepTalkTextareaRef}
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none overflow-hidden min-h-[60px]"
                  placeholder="Your pep talk will appear here..."
                  rows={2}
                />
                <button
                  onClick={() => pepTalkMutation.mutate()}
                  disabled={pepTalkMutation.isPending || goals.length === 0}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                >
                  {pepTalkMutation.isPending ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      {goals.length === 0 ? 'Add goals first' : 'Generate with AI'}
                    </>
                  )}
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setAddType(null)
                      setNewItemText('')
                    }}
                    className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-white rounded-lg font-medium transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      if (newItemText.trim()) {
                        savePepTalkMutation.mutate(newItemText)
                      }
                    }}
                    disabled={!newItemText.trim() || savePepTalkMutation.isPending}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                  >
                    {savePepTalkMutation.isPending ? 'Saving...' : 'Save for Today'}
                  </button>
                </div>
              </div>
            ) : addType === 'ai-journal' ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Create a daily prompt that AI will generate fresh content for each day.
                </p>
                <textarea
                  value={aiJournalPrompt}
                  onChange={(e) => setAiJournalPrompt(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                  placeholder="Enter your prompt (e.g., 'Give me 3 healthy meats, 3 fish, 3 vegetables, and 3 superfoods')..."
                  rows={3}
                  autoFocus
                />
                {aiJournalResponse && (
                  <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg max-h-48 overflow-y-auto">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{aiJournalResponse}</ReactMarkdown>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setAddType(null)
                      setAiJournalPrompt('')
                      setAiJournalResponse('')
                    }}
                    className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-white rounded-lg font-medium transition-colors"
                  >
                    Back
                  </button>
                  {!aiJournalResponse ? (
                    <button
                      onClick={() => generateAiJournal()}
                      disabled={isGeneratingAiJournal || !aiJournalPrompt.trim()}
                      className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                    >
                      {isGeneratingAiJournal ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          Preview...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Preview
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        if (aiJournalPrompt.trim()) {
                          // Create the prompt and generate content
                          const journal = await aiJournalsService.getOrCreateForDate(user!.id, aiJournalPrompt, dateStr)
                          await aiJournalsService.updateResponse(journal.id, aiJournalResponse)
                          queryClient.invalidateQueries({ queryKey: ['ai-journals'] })
                          queryClient.invalidateQueries({ queryKey: ['ai-journal-prompts'] })
                          setShowAddModal(false)
                          setAddType(null)
                          setAiJournalPrompt('')
                          setAiJournalResponse('')
                        }
                      }}
                      disabled={!aiJournalPrompt.trim() || createAiJournalMutation.isPending}
                      className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                    >
                      Save Prompt
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {addType === 'vision' ? (
                  <div className="mb-3">
                    <RichTextEditor
                      content={newItemText}
                      onChange={setNewItemText}
                      placeholder="Your vision for the future..."
                    />
                  </div>
                ) : addType === 'identity' ? (
                  <div className="mb-3">
                    <p className="text-sm text-pink-500 font-medium mb-2">Will I live the lifestyle of...?</p>
                    <textarea
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.currentTarget.blur()
                        }
                      }}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                      placeholder="a community organizer..."
                      rows={3}
                      autoFocus
                    />
                  </div>
                ) : addType === 'book' ? (
                  <div className="space-y-3 mb-3">
                    <input
                      type="text"
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.currentTarget.blur()
                        }
                      }}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Book title"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={newBookAuthor}
                      onChange={(e) => setNewBookAuthor(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.currentTarget.blur()
                        }
                      }}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Author (optional)"
                    />
                  </div>
                ) : addType === 'mantra' ? (
                  <textarea
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.currentTarget.blur()
                      }
                    }}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent mb-3 resize-none"
                    placeholder="Your mantra..."
                    rows={4}
                    autoFocus
                  />
                ) : (
                  <input
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent mb-3"
                    placeholder={addType === 'habit' ? 'Habit name...' : addType === 'todo' ? 'What needs to be done?' : 'Journal prompt...'}
                    autoFocus
                  />
                )}

                {addType === 'habit' && (
                  <input
                    type="text"
                    value={newItemDescription}
                    onChange={(e) => setNewItemDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent mb-4"
                    placeholder="Description (optional)"
                  />
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setAddType(null)
                      setNewItemText('')
                      setNewItemDescription('')
                    }}
                    className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-white rounded-lg font-medium transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleAddItem}
                    disabled={!newItemText.trim()}
                    className="flex-1 py-3 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-white rounded-lg font-medium transition-colors"
                  >
                    Add
                  </button>
                </div>
              </>
            )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Habit Detail Modal */}
      {selectedHabit && !showDeleteConfirm && !showMissNoteModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => {
            setSelectedHabit(null)
            setIsEditingHabit(false)
            setEditHabitName('')
            setEditHabitDescription('')
          }}
        >
          <div
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-gray-200/20 dark:border-slate-700/30 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isEditingHabit ? 'Edit Habit' : 'Habit'}
              </h2>
              <button
                onClick={() => {
                  setSelectedHabit(null)
                  setIsEditingHabit(false)
                  setEditHabitName('')
                  setEditHabitDescription('')
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400 dark:text-slate-400" />
              </button>
            </div>

            {isEditingHabit ? (
              <>
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      value={editHabitName}
                      onChange={(e) => setEditHabitName(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal"
                      placeholder="Habit name..."
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Description (optional)
                    </label>
                    <input
                      type="text"
                      value={editHabitDescription}
                      onChange={(e) => setEditHabitDescription(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal"
                      placeholder="Description..."
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setIsEditingHabit(false)
                      setEditHabitName('')
                      setEditHabitDescription('')
                    }}
                    className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-white rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (editHabitName.trim()) {
                        updateHabitMutation.mutate({
                          id: selectedHabit.id,
                          name: editHabitName,
                          description: editHabitDescription || undefined,
                        })
                      }
                    }}
                    disabled={!editHabitName.trim() || updateHabitMutation.isPending}
                    className="flex-1 py-3 bg-teal hover:bg-teal/90 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                  >
                    {updateHabitMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedHabit.name}</h3>
                  {selectedHabit.description && (
                    <p className="text-gray-500 dark:text-slate-400 mt-1">{selectedHabit.description}</p>
                  )}
                </div>

                {/* Show existing miss note if any */}
                {selectedHabit.missNote && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
                    <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">Missed - Action Plan:</p>
                    <p className="text-sm text-red-500 dark:text-red-300 italic">{selectedHabit.missNote}</p>
                    <button
                      onClick={() => deleteMissNoteMutation.mutate(selectedHabit.id)}
                      className="mt-2 text-xs text-red-400 hover:text-red-500 underline"
                    >
                      Remove miss note
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setEditHabitName(selectedHabit.name)
                      setEditHabitDescription(selectedHabit.description || '')
                      setIsEditingHabit(true)
                    }}
                    className="w-full py-3 bg-teal/10 hover:bg-teal/20 text-teal rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Pencil className="w-5 h-5" />
                    Edit Habit
                  </button>

                  {/* Mark as Missed button - only show if not already completed */}
                  {!selectedHabit.completed && !selectedHabit.missNote && (
                    <button
                      onClick={() => setShowMissNoteModal(true)}
                      className="w-full py-3 bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      Mark as Missed
                    </button>
                  )}

                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-3 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-5 h-5" />
                    Delete Habit
                  </button>
                </div>

                <p className="text-sm text-gray-400 dark:text-slate-500 mt-3 text-center">
                  Deleting removes this habit from today and future days only.
                  Previous days will keep this habit.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Miss Note Modal */}
      {showMissNoteModal && selectedHabit && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => {
            setShowMissNoteModal(false)
            setMissNoteText('')
          }}
        >
          <div
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-gray-200/20 dark:border-slate-700/30 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Mark as Missed</h2>
                <p className="text-gray-500 dark:text-slate-400 mt-1">{selectedHabit.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowMissNoteModal(false)
                  setMissNoteText('')
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400 dark:text-slate-400" />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-slate-300 mb-3">
              What will you do differently to make sure this doesn&apos;t happen again?
            </p>

            <textarea
              value={missNoteText}
              onChange={(e) => setMissNoteText(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none mb-4"
              placeholder="e.g., Set a reminder for 8am, prepare the night before..."
              rows={3}
              autoFocus
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowMissNoteModal(false)
                  setMissNoteText('')
                }}
                className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (missNoteText.trim()) {
                    createMissNoteMutation.mutate({
                      habitId: selectedHabit.id,
                      note: missNoteText.trim(),
                    })
                  }
                }}
                disabled={!missNoteText.trim() || createMissNoteMutation.isPending}
                className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-lg font-medium transition-colors"
              >
                {createMissNoteMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedHabit && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => {
            setShowDeleteConfirm(false)
            setSelectedHabit(null)
          }}
        >
          <div
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-gray-200/20 dark:border-slate-700/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Delete "{selectedHabit.name}"?</h2>
            <p className="text-gray-500 dark:text-slate-400 mb-6">
              This habit will be removed from today and all future days. Your past progress will be preserved.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setSelectedHabit(null)
                }}
                className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteHabitMutation.mutate(selectedHabit.id)}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mantra Detail Modal */}
      {selectedMantra && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedMantra(null)}
        >
          <div
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-gray-200/20 dark:border-slate-700/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Mantra</h2>
              <button
                onClick={() => setSelectedMantra(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400 dark:text-slate-400" />
              </button>
            </div>
            <p className="text-gray-600 dark:text-slate-300 italic mb-6">{selectedMantra.text}</p>
            <button
              onClick={() => deleteMantraMutation.mutate(selectedMantra.id)}
              disabled={deleteMantraMutation.isPending}
              className="w-full py-3 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 disabled:opacity-50 text-red-600 dark:text-red-400 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              {deleteMantraMutation.isPending ? 'Deleting...' : 'Delete Mantra'}
            </button>
          </div>
        </div>
      )}

      {/* Todo Detail Modal */}
      {selectedTodo && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedTodo(null)}
        >
          <div
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-gray-200/20 dark:border-slate-700/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">To-Do</h2>
              <button
                onClick={() => setSelectedTodo(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400 dark:text-slate-400" />
              </button>
            </div>
            <p className="text-gray-600 dark:text-slate-300 mb-6">{selectedTodo.text}</p>
            <button
              onClick={() => deleteTodoMutation.mutate(selectedTodo.id)}
              disabled={deleteTodoMutation.isPending}
              className="w-full py-3 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 disabled:opacity-50 text-red-600 dark:text-red-400 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              {deleteTodoMutation.isPending ? 'Deleting...' : 'Delete To-Do'}
            </button>
          </div>
        </div>
      )}

      {/* Vision Detail Modal */}
      {selectedVision && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 pt-12 z-50 overflow-y-auto"
          onClick={() => {
            setSelectedVision(null)
            setIsEditingVision(false)
            setEditVisionText('')
          }}
        >
          <div
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-gray-200/20 dark:border-slate-700/30 rounded-2xl p-6 w-full max-w-xl shadow-2xl mb-12"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isEditingVision ? 'Edit Vision' : 'Vision'}
              </h2>
              <button
                onClick={() => {
                  setSelectedVision(null)
                  setIsEditingVision(false)
                  setEditVisionText('')
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400 dark:text-slate-400" />
              </button>
            </div>

            {isEditingVision ? (
              <>
                <RichTextEditor
                  content={editVisionText}
                  onChange={setEditVisionText}
                  placeholder="Your vision for the future..."
                  className="mb-4 [&_.ProseMirror]:min-h-[200px]"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setIsEditingVision(false)
                      setEditVisionText('')
                    }}
                    className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-white rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (editVisionText.trim() && editVisionText !== '<p></p>') {
                        updateVisionMutation.mutate({ id: selectedVision.id, text: editVisionText })
                      }
                    }}
                    disabled={!editVisionText.trim() || editVisionText === '<p></p>' || updateVisionMutation.isPending}
                    className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                  >
                    {updateVisionMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div
                  className="text-gray-600 dark:text-slate-300 mb-6 prose prose-sm dark:prose-invert max-w-none [&_p]:m-0"
                  dangerouslySetInnerHTML={{ __html: selectedVision.text }}
                />
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setEditVisionText(selectedVision.text)
                      setIsEditingVision(true)
                    }}
                    className="w-full py-3 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Pencil className="w-5 h-5" />
                    Edit Vision
                  </button>
                  <button
                    onClick={() => deleteVisionMutation.mutate(selectedVision.id)}
                    disabled={deleteVisionMutation.isPending}
                    className="w-full py-3 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 disabled:opacity-50 text-red-600 dark:text-red-400 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-5 h-5" />
                    {deleteVisionMutation.isPending ? 'Deleting...' : 'Delete Vision'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Identity Detail Modal */}
      {selectedIdentity && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 pt-12 z-50 overflow-y-auto"
          onClick={() => {
            setSelectedIdentity(null)
            setIsEditingIdentity(false)
            setEditIdentityText('')
          }}
        >
          <div
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-gray-200/20 dark:border-slate-700/30 rounded-2xl p-6 w-full max-w-md shadow-2xl mb-12"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isEditingIdentity ? 'Edit Lifestyle' : 'The Lifestyle'}
              </h2>
              <button
                onClick={() => {
                  setSelectedIdentity(null)
                  setIsEditingIdentity(false)
                  setEditIdentityText('')
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400 dark:text-slate-400" />
              </button>
            </div>

            {isEditingIdentity ? (
              <>
                <div className="mb-4">
                  <p className="text-sm text-pink-500 font-medium mb-2">Will I live the lifestyle of...?</p>
                  <textarea
                    value={editIdentityText}
                    onChange={(e) => setEditIdentityText(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                    placeholder="a community organizer..."
                    rows={3}
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setIsEditingIdentity(false)
                      setEditIdentityText('')
                    }}
                    className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-white rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (editIdentityText.trim()) {
                        updateIdentityMutation.mutate({ id: selectedIdentity.id, text: editIdentityText.replace(/\n/g, '<br>') })
                      }
                    }}
                    disabled={!editIdentityText.trim() || updateIdentityMutation.isPending}
                    className="flex-1 py-3 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                  >
                    {updateIdentityMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <p className="text-sm text-pink-500 font-medium mb-1">Will I live the lifestyle of...?</p>
                  <div
                    className="text-gray-600 dark:text-slate-300 prose prose-sm dark:prose-invert max-w-none [&_p]:m-0"
                    dangerouslySetInnerHTML={{ __html: selectedIdentity.text }}
                  />
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setEditIdentityText(selectedIdentity.text.replace(/<br\s*\/?>/g, '\n'))
                      setIsEditingIdentity(true)
                    }}
                    className="w-full py-3 bg-pink-50 dark:bg-pink-500/10 hover:bg-pink-100 dark:hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Pencil className="w-5 h-5" />
                    Edit Lifestyle
                  </button>
                  <button
                    onClick={() => deleteIdentityMutation.mutate(selectedIdentity.id)}
                    disabled={deleteIdentityMutation.isPending}
                    className="w-full py-3 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 disabled:opacity-50 text-red-600 dark:text-red-400 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-5 h-5" />
                    {deleteIdentityMutation.isPending ? 'Deleting...' : 'Delete Lifestyle'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Book Detail Modal */}
      {selectedBook && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 pt-12 z-50 overflow-y-auto"
          onClick={() => setSelectedBook(null)}
        >
          <div
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-gray-200/20 dark:border-slate-700/30 rounded-2xl p-6 w-full max-w-md shadow-2xl mb-12"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Book</h2>
              <button
                onClick={() => setSelectedBook(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400 dark:text-slate-400" />
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {selectedBook.title}
                  </p>
                  {selectedBook.author && (
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      by {selectedBook.author}
                    </p>
                  )}
                </div>
              </div>
              {selectedBook.started_at && (
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Started reading on {new Date(selectedBook.started_at).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Learnings Section */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-3">
                Learnings {bookLearningsQuery.data?.length ? `(${bookLearningsQuery.data.length})` : ''}
              </h3>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newLearning}
                  onChange={(e) => setNewLearning(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newLearning.trim()) {
                      addLearningMutation.mutate(newLearning.trim())
                    }
                  }}
                  placeholder="Add a learning..."
                  className="flex-1 px-3 py-2 text-sm bg-amber-50/50 dark:bg-amber-500/5 border border-amber-200/50 dark:border-amber-500/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
                <button
                  onClick={() => {
                    if (newLearning.trim()) addLearningMutation.mutate(newLearning.trim())
                  }}
                  disabled={!newLearning.trim() || addLearningMutation.isPending}
                  className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-50 text-amber-600 dark:text-amber-400 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {bookLearningsQuery.isLoading && (
                <p className="text-xs text-gray-400 dark:text-slate-500">Loading...</p>
              )}
              {bookLearningsQuery.data && bookLearningsQuery.data.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {bookLearningsQuery.data.map((learning) => (
                    <div
                      key={learning.id}
                      className="flex items-start gap-2 p-2 bg-amber-50/50 dark:bg-amber-500/5 border border-amber-200/30 dark:border-amber-500/10 rounded-lg group"
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700 dark:text-slate-300 flex-1">{learning.content}</p>
                      <button
                        onClick={() => deleteLearningMutation.mutate(learning.id)}
                        className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-500/20 rounded transition-all"
                      >
                        <X className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={() => markBookCompletedMutation.mutate(selectedBook.id)}
                disabled={markBookCompletedMutation.isPending}
                className="w-full py-3 bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20 disabled:opacity-50 text-green-600 dark:text-green-400 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                {markBookCompletedMutation.isPending ? 'Marking...' : 'Mark as Completed'}
              </button>
              <button
                onClick={() => deleteBookMutation.mutate(selectedBook.id)}
                disabled={deleteBookMutation.isPending}
                className="w-full py-3 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 disabled:opacity-50 text-red-600 dark:text-red-400 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                {deleteBookMutation.isPending ? 'Removing...' : 'Remove Book'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Journal Prompt Detail Modal */}
      {selectedJournal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => {
            setSelectedJournal(null)
            setIsEditingJournal(false)
            setEditJournalText('')
            setEditJournalTemplate('')
          }}
        >
          <div
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-gray-200/20 dark:border-slate-700/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Journal Prompt</h2>
              <button
                onClick={() => {
                  setSelectedJournal(null)
                  setIsEditingJournal(false)
                  setEditJournalText('')
                  setEditJournalTemplate('')
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400 dark:text-slate-400" />
              </button>
            </div>

            {isEditingJournal ? (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Prompt
                  </label>
                  <input
                    type="text"
                    value={editJournalText}
                    onChange={(e) => setEditJournalText(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-journal"
                    placeholder="Journal prompt..."
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Icon
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {JOURNAL_ICON_OPTIONS.map((iconName) => {
                      const IconComponent = journalIconMap[iconName]
                      return (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => setEditJournalIcon(iconName)}
                          className={`p-2 rounded-lg transition-colors ${
                            editJournalIcon === iconName
                              ? 'text-white'
                              : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                          }`}
                          style={editJournalIcon === iconName ? { backgroundColor: editJournalColor } : undefined}
                        >
                          <IconComponent className="w-5 h-5" />
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {JOURNAL_COLOR_OPTIONS.map((colorOption) => (
                      <button
                        key={colorOption.name}
                        type="button"
                        onClick={() => setEditJournalColor(colorOption.value)}
                        className={`w-8 h-8 rounded-lg transition-all ${
                          editJournalColor === colorOption.value
                            ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-slate-400 dark:ring-offset-slate-800'
                            : ''
                        }`}
                        style={{ backgroundColor: colorOption.value }}
                        title={colorOption.name}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Template (optional)
                  </label>
                  <textarea
                    value={editJournalTemplate}
                    onChange={(e) => setEditJournalTemplate(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-journal resize-none"
                    placeholder="Pre-fill structure for entries (e.g., bullet points, sections)..."
                    rows={4}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                    This text will pre-fill new journal entries to provide structure
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsEditingJournal(false)
                      setEditJournalText(selectedJournal.prompt)
                      setEditJournalTemplate(selectedJournal.template_text || '')
                      setEditJournalIcon(selectedJournal.icon || 'book-open')
                      setEditJournalColor(selectedJournal.color || '#E97451')
                    }}
                    className="flex-1 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-white rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (editJournalText.trim() && (editJournalText !== selectedJournal.prompt || editJournalTemplate !== (selectedJournal.template_text || '') || editJournalIcon !== (selectedJournal.icon || 'book-open') || editJournalColor !== (selectedJournal.color || '#E97451'))) {
                        updateJournalPromptMutation.mutate({
                          id: selectedJournal.id,
                          prompt: editJournalText,
                          templateText: editJournalTemplate,
                          icon: editJournalIcon,
                          color: editJournalColor
                        })
                      }
                    }}
                    disabled={!editJournalText.trim() || (editJournalText === selectedJournal.prompt && editJournalTemplate === (selectedJournal.template_text || '') && editJournalIcon === (selectedJournal.icon || 'book-open') && editJournalColor === (selectedJournal.color || '#E97451')) || updateJournalPromptMutation.isPending}
                    className="flex-1 py-2 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                    style={{ backgroundColor: editJournalColor }}
                  >
                    {updateJournalPromptMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-gray-600 dark:text-slate-300 mb-4">{selectedJournal.prompt}</p>
                <button
                  onClick={() => setIsEditingJournal(true)}
                  className="w-full py-3 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mb-3"
                >
                  <Pencil className="w-5 h-5" />
                  Edit Prompt
                </button>
              </>
            )}

            <button
              onClick={() => deleteJournalPromptMutation.mutate(selectedJournal.id)}
              disabled={deleteJournalPromptMutation.isPending}
              className="w-full py-3 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 disabled:opacity-50 text-red-600 dark:text-red-400 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              {deleteJournalPromptMutation.isPending ? 'Deleting...' : 'Delete Prompt'}
            </button>
          </div>
        </div>
      )}

      {/* AI Journal Detail Modal */}
      {selectedAiJournal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 pt-12 z-50 overflow-y-auto"
          onClick={() => setSelectedAiJournal(null)}
        >
          <div
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-gray-200/20 dark:border-slate-700/30 rounded-2xl p-6 w-full max-w-xl shadow-2xl mb-12"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Journal</h2>
              </div>
              <button
                onClick={() => setSelectedAiJournal(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400 dark:text-slate-400" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-2">Prompt:</p>
              <p className="text-gray-900 dark:text-white">{selectedAiJournal.prompt}</p>
            </div>

            {selectedAiJournal.response && (
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-2">Response:</p>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 max-h-80 overflow-y-auto">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{selectedAiJournal.response}</ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => {
                  regenerateAiJournal(selectedAiJournal)
                  setSelectedAiJournal(null)
                }}
                disabled={regeneratingJournalId === selectedAiJournal.id}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-5 h-5 ${regeneratingJournalId === selectedAiJournal.id ? 'animate-spin' : ''}`} />
                Regenerate Content
              </button>
              <button
                onClick={() => deleteAiJournalPromptMutation.mutate(selectedAiJournal.prompt)}
                disabled={deleteAiJournalPromptMutation.isPending}
                className="w-full py-3 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 disabled:opacity-50 text-red-600 dark:text-red-400 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                {deleteAiJournalPromptMutation.isPending ? 'Deleting...' : 'Delete Prompt'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
