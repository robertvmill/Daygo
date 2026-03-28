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
  const [localBigWins, setLocalBigWins] = useState<string[]>(['', '', ''])
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
      return parseFloat(localStorage.getItem('daygo-identity-speed') || '1.0'))
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