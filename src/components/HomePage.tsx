"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getJournalEntries } from "@/services/journalService"
import { CalendarDays, FileText, PlusCircle, Clock, Eye, BookOpen, Calendar, Edit, AlertTriangle, Bot } from "lucide-react"
import { format } from "date-fns"
import { JournalEntryForm } from "./JournalEntryForm"
import { getAuth, onAuthStateChanged } from "firebase/auth"
import { toast } from "sonner"
import { JournalEntry } from "@/types/journal"
import { FirebaseError } from "firebase/app"

export function HomePage() {
  const [journalStats, setJournalStats] = useState({
    totalEntries: 0,
    thisWeek: 0,
    thisMonth: 0,
    latestEntry: null as Date | null,
    streakDays: 0
  })
  const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [authInitialized, setAuthInitialized] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Check authentication first
  useEffect(() => {
    const auth = getAuth()
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user)
      setUserId(user ? user.uid : null)
      setAuthInitialized(true)
    })
    
    return () => unsubscribe()
  }, [])

  // Only fetch stats when authenticated and have a userId
  useEffect(() => {
    if (!authInitialized) return
    if (!isAuthenticated || !userId) {
      setIsLoading(false)
      return
    }

    const fetchStats = async () => {
      try {
        setError(null) // Reset error state
        const entries = await getJournalEntries()
        
        // Store recent entries for display
        setRecentEntries(entries.slice(0, 3))
        
        if (!entries || entries.length === 0) {
          setJournalStats({
            totalEntries: 0,
            thisWeek: 0,
            thisMonth: 0,
            latestEntry: null,
            streakDays: 0
          })
          setIsLoading(false)
          return
        }

        // Get current date information
        const now = new Date()
        const oneWeekAgo = new Date(now)
        oneWeekAgo.setDate(now.getDate() - 7)
        
        const oneMonthAgo = new Date(now)
        oneMonthAgo.setMonth(now.getMonth() - 1)
        
        // Calculate stats
        const entriesThisWeek = entries.filter(entry => 
          entry.createdAt && new Date(entry.createdAt.seconds * 1000) >= oneWeekAgo
        )
        
        const entriesThisMonth = entries.filter(entry => 
          entry.createdAt && new Date(entry.createdAt.seconds * 1000) >= oneMonthAgo
        )
        
        // Calculate streak (simplified - actual implementation would be more complex)
        // This is a placeholder implementation
        let streakDays = 0
        const entryDates = entries
          .filter(entry => entry.createdAt)
          .map(entry => new Date(entry.createdAt!.seconds * 1000).toDateString())
          .filter((date, index, self) => self.indexOf(date) === index) // Unique dates only
        
        // Sort dates in descending order
        entryDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
        
        // Check if last entry was today or yesterday
        const today = new Date().toDateString()
        const yesterday = new Date(now)
        yesterday.setDate(now.getDate() - 1)
        const yesterdayString = yesterday.toDateString()
        
        // If last entry was today or yesterday, count streak
        if (entryDates[0] === today || entryDates[0] === yesterdayString) {
          streakDays = 1
          
          // Count consecutive days
          for (let i = 1; i < entryDates.length; i++) {
            const currentDate = new Date(entryDates[i-1])
            currentDate.setDate(currentDate.getDate() - 1)
            
            if (currentDate.toDateString() === entryDates[i]) {
              streakDays++
            } else {
              break
            }
          }
        }
        
        // Get latest entry date
        const latestEntry = entries[0].createdAt ? 
          new Date(entries[0].createdAt.seconds * 1000) : null
        
        setJournalStats({
          totalEntries: entries.length,
          thisWeek: entriesThisWeek.length,
          thisMonth: entriesThisMonth.length,
          latestEntry,
          streakDays
        })
        
        setIsLoading(false)
      } catch (error: unknown) {
        console.error("Error fetching journal stats:", error)
        
        // Handle Firebase permission errors
        const fbError = error as FirebaseError
        if (fbError.message?.includes("permission") || fbError.code === "permission-denied") {
          setError("Permission error: Unable to access your journal data. Please try logging out and back in.")
          toast.error("Permission error: Unable to access your journal data")
        } else {
          setError("Error loading journal data. Please try again later.")
          toast.error("Failed to load journal data")
        }
        
        // Reset stats on error
        setJournalStats({
          totalEntries: 0,
          thisWeek: 0,
          thisMonth: 0,
          latestEntry: null,
          streakDays: 0
        })
        setRecentEntries([])
        setIsLoading(false)
      }
    }
    
    fetchStats()
  }, [authInitialized, isAuthenticated, userId])

  const handleNewEntry = () => {
    router.push("/journal/select-template")
  }

  const handleViewAllEntries = () => {
    router.push("/journal")
  }

  const handleCreateTemplate = () => {
    router.push("/prompts/new")
  }

  const handleAiChat = () => {
    router.push("/ai-chat")
  }

  const handleLogin = () => {
    router.push("/login")
  }

  const handleSignOut = async () => {
    try {
      const auth = getAuth()
      await auth.signOut()
      router.replace('/login')
      toast.success("Successfully signed out")
    } catch {
      toast.error("Failed to sign out")
    }
  }

  const formatDate = (timestamp: { seconds: number; nanoseconds: number }) => {
    if (!timestamp) return '';
    
    let date;
    if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return '';
    }
    
    return format(date, 'MMM d, yyyy');
  };

  // If not authenticated, show a message
  if (authInitialized && !isAuthenticated) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4 md:p-8">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Welcome to Daygo</CardTitle>
            <CardDescription>
              Please log in to view your journal entries and stats
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              You need to be logged in to access your personal journal dashboard.
            </p>
            <Button onClick={handleLogin}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If there's a permission error, show a message
  if (error && error.includes("Permission")) {
    return (
      <div className="flex flex-col gap-4">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to Daygo</h1>
          <p className="mt-2 text-muted-foreground">
            Your personal space for daily reflections, goals, and growth.
          </p>
        </div>
        
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-red-600 dark:text-red-400">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Firebase Permission Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {error}
            </p>
            <div className="flex gap-3">
              <Button onClick={handleSignOut} variant="destructive">
                Sign Out
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Quick Actions Section - still show this section */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer" onClick={handleNewEntry}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg">
                <Edit className="mr-2 h-5 w-5" />
                New Journal Entry
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Record today&apos;s thoughts, feelings, and experiences.
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer" onClick={handleAiChat}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg">
                <Bot className="mr-2 h-5 w-5" />
                Talk to Daygo AI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Chat with AI that knows your journal entries and can provide insights.
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer" onClick={handleViewAllEntries}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg">
                <BookOpen className="mr-2 h-5 w-5" />
                View All Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Browse through your previous journal entries.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">Welcome to Daygo</h1>
        <p className="mt-2 text-muted-foreground">
          Your personal space for daily reflections, goals, and growth.
        </p>
      </div>
      
      {/* Quick Actions Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer" onClick={handleNewEntry}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg">
              <Edit className="mr-2 h-5 w-5" />
              New Journal Entry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Record today&apos;s thoughts, feelings, and experiences.
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer" onClick={handleAiChat}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg">
              <Bot className="mr-2 h-5 w-5" />
              Talk to Daygo AI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Chat with AI that knows your journal entries and can provide insights.
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer" onClick={handleViewAllEntries}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg">
              <BookOpen className="mr-2 h-5 w-5" />
              View All Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Browse through your previous journal entries.
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer" onClick={handleCreateTemplate}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg">
              <FileText className="mr-2 h-5 w-5" />
              Create Template
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Design a new journal template for consistent entries.
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Stats Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Your Journal Stats</h2>
        
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg">
                <FileText className="mr-2 h-5 w-5" />
                Total Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 bg-muted animate-pulse rounded" />
              ) : (
                <p className="text-3xl font-bold">{journalStats.totalEntries}</p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg">
                <CalendarDays className="mr-2 h-5 w-5" />
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 bg-muted animate-pulse rounded" />
              ) : (
                <p className="text-3xl font-bold">{journalStats.thisWeek}</p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg">
                <PlusCircle className="mr-2 h-5 w-5" />
                Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 bg-muted animate-pulse rounded" />
              ) : (
                <p className="text-3xl font-bold">{journalStats.streakDays} {journalStats.streakDays === 1 ? 'day' : 'days'}</p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg">
                <Clock className="mr-2 h-5 w-5" />
                Last Entry
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 bg-muted animate-pulse rounded" />
              ) : journalStats.latestEntry ? (
                <p className="text-lg font-medium">{format(journalStats.latestEntry, 'MMM d, yyyy')}</p>
              ) : (
                <p className="text-muted-foreground">No entries yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Entries Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Journal Entries</h2>
          {recentEntries.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleViewAllEntries}>
              View all
            </Button>
          )}
        </div>
        
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-[200px]">
                <CardHeader>
                  <div className="h-5 bg-muted animate-pulse rounded w-3/4" />
                  <div className="h-4 bg-muted animate-pulse rounded w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted animate-pulse rounded w-full mt-2" />
                  <div className="h-4 bg-muted animate-pulse rounded w-full mt-2" />
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : recentEntries.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {recentEntries.map((entry) => (
              <Card key={entry.id} className="overflow-hidden hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader className="pb-3">
                  <CardTitle className="truncate text-base">{entry.title}</CardTitle>
                  <CardDescription className="flex items-center text-xs">
                    <Calendar className="h-3 w-3 mr-1 inline" />
                    {formatDate(entry.createdAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {entry.content}
                  </p>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full group"
                    onClick={() => router.push(`/journal/${entry.id}`)}
                  >
                    <Eye className="h-3 w-3 mr-1 group-hover:text-primary" />
                    <span className="group-hover:text-primary">Read More</span>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">No Journal Entries Yet</CardTitle>
              <CardDescription>
                Create your first journal entry to start tracking your thoughts and reflections.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button onClick={handleNewEntry}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create First Entry
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Quick Entry Form */}
      {journalStats.totalEntries === 0 && !isLoading && (
        <div className="mt-4">
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Create Your First Journal Entry</CardTitle>
              <CardDescription>
                Start your journaling journey by writing your first entry below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JournalEntryForm />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
} 