"use client"

import { AppSidebar } from "./AppSidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { UsageLimitBanner } from "./UsageLimitBanner"
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { getJournalEntries } from '@/services/journalService'
import { getTemplates } from '@/services/templateService'
import { JournalEntry, JournalTemplate } from '@/types/journal'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, Plus, Filter, X, Crown, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useJournalSearch } from '@/hooks/useJournalSearch'
import { Calendar } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from "firebase/auth"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { getUserUsage, getUserSubscription } from '@/services/subscriptionService'
import { SubscriptionTier, SUBSCRIPTION_TIERS } from '@/types/subscription'

export function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [allEntries, setAllEntries] = useState<JournalEntry[]>([])
  const [templates, setTemplates] = useState<JournalTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [authInitialized, setAuthInitialized] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userTier, setUserTier] = useState<SubscriptionTier>('free')
  const [currentUsage, setCurrentUsage] = useState({ journalEntries: 0, templates: 0 })
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Search functionality
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearchMode, setIsSearchMode] = useState(false)
  const { results: searchResults, isLoading: isSearching, searchJournalEntries } = useJournalSearch()

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

  // Fetch templates and entries when authenticated
  useEffect(() => {
    if (!authInitialized) return
    if (!isAuthenticated || !userId) {
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch templates, entries, subscription, and usage info
        const [fetchedEntries, fetchedTemplates, subscription, usageInfo] = await Promise.all([
          getJournalEntries(),
          getTemplates(),
          getUserSubscription(),
          getUserUsage()
        ])
        
        setAllEntries(fetchedEntries)
        setEntries(fetchedEntries)
        setTemplates(fetchedTemplates)
        setUserTier(subscription?.tier || 'free')
        setCurrentUsage({ 
          journalEntries: usageInfo.journalEntriesCount, 
          templates: usageInfo.templatesCount 
        })
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load journal data')
        setAllEntries([])
        setEntries([])
        setTemplates([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [authInitialized, isAuthenticated, userId])

  // Handle search parameter from URL
  useEffect(() => {
    const searchQuery = searchParams.get('search')
    if (searchQuery) {
      setSearchTerm(searchQuery)
      setIsSearchMode(true)
      // Trigger search when entries are loaded
      if (isAuthenticated && !loading) {
        searchJournalEntries(searchQuery)
      }
    }
  }, [searchParams, isAuthenticated, loading, searchJournalEntries])

  // Filter entries when template selection changes
  useEffect(() => {
    if (selectedTemplateId === null) {
      // Show all entries
      setEntries(allEntries)
    } else if (selectedTemplateId === 'no-template') {
      // Show entries without templates
      setEntries(allEntries.filter(entry => !entry.templateId))
    } else {
      // Show entries for specific template
      setEntries(allEntries.filter(entry => entry.templateId === selectedTemplateId))
    }
  }, [selectedTemplateId, allEntries])

  const formatDate = (timestamp: Timestamp | Date | undefined | null) => {
    if (!timestamp) return '';
    
    let date: Date;
    if (timestamp instanceof Timestamp) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      // Fallback for other cases
      return '';
    }
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const handleLogin = () => {
    router.push("/login")
  }

  const clearFilter = () => {
    setSelectedTemplateId(null)
  }

  // Search functions
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setIsSearchMode(false)
      setSearchTerm('')
      router.push('/journal')
      return
    }
    
    setSearchTerm(query)
    setIsSearchMode(true)
    router.push(`/journal?search=${encodeURIComponent(query)}`)
    await searchJournalEntries(query)
  }

  const clearSearch = () => {
    setIsSearchMode(false)
    setSearchTerm('')
    router.push('/journal')
  }

  const getTemplateById = (templateId: string) => {
    return templates.find(template => template.id === templateId)
  }

  const getFilteredEntriesCount = () => {
    if (selectedTemplateId === null) return allEntries.length
    if (selectedTemplateId === 'no-template') {
      return allEntries.filter(entry => !entry.templateId).length
    }
    return allEntries.filter(entry => entry.templateId === selectedTemplateId).length
  }

  const getNoTemplateEntriesCount = () => {
    return allEntries.filter(entry => !entry.templateId).length
  }

  // If not authenticated, show a message
  if (authInitialized && !isAuthenticated) {
    return (
      <>
        <AppSidebar />
        <SidebarInset>
          <header className="flex sticky top-0 z-10 h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Journal</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>
          
          <main className="flex flex-1 flex-col items-center justify-center p-4 md:p-8">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle>Journal Access</CardTitle>
                <CardDescription>
                  Please log in to view your journal entries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  You need to be logged in to access your journal entries.
                </p>
                <Button onClick={handleLogin}>Go to Login</Button>
              </CardContent>
            </Card>
          </main>
        </SidebarInset>
      </>
    )
  }

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <header className="flex sticky top-0 z-10 h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Journal</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          {userTier === 'free' && (
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {currentUsage.journalEntries}/{SUBSCRIPTION_TIERS.free.maxJournalEntries} entries
              </Badge>
              <Link href="/upgrade">
                <Button size="sm" variant="ghost" className="text-primary">
                  <Crown className="h-4 w-4 mr-1" />
                  Upgrade Pro
                </Button>
              </Link>
            </div>
          )}
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-8">
          {/* Usage limit banner for subscription management */}
          <UsageLimitBanner type="compact" className="mb-4" />
          
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Journal Entries</h1>
            <Button asChild>
              <Link href="/journal/new">
                <Plus className="mr-2 h-4 w-4" />
                New Entry
              </Link>
            </Button>
          </div>

          {/* Search and Filter Section */}
          <div className="border rounded-lg p-4 bg-muted/20 space-y-4">
            {/* Search Bar */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search your journal entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch(searchTerm)
                    }
                  }}
                  className="pl-10"
                />
              </div>
              <Button onClick={() => handleSearch(searchTerm)} disabled={isSearching}>
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
              {isSearchMode && (
                <Button variant="outline" onClick={clearSearch}>
                  <X className="h-4 w-4 mr-1" />
                  Clear Search
                </Button>
              )}
            </div>

            {/* Filter Section - only show when not in search mode */}
            {!isSearchMode && (
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <span className="text-sm font-medium">Filter by Template:</span>
                  </div>
                  
                  <Select value={selectedTemplateId || "all"} onValueChange={(value) => setSelectedTemplateId(value === "all" ? null : value)}>
                    <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder="All entries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All entries ({allEntries.length})</SelectItem>
                      <SelectItem value="no-template">No template ({getNoTemplateEntriesCount()})</SelectItem>
                      {templates.map((template) => {
                        const count = allEntries.filter(entry => entry.templateId === template.id).length
                        return (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name} ({count})
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>

                  {selectedTemplateId && (
                    <Button variant="outline" size="sm" onClick={clearFilter}>
                      <X className="h-4 w-4 mr-1" />
                      Clear Filter
                    </Button>
                  )}
                </div>

                <div className="text-sm text-muted-foreground">
                  Showing {getFilteredEntriesCount()} of {allEntries.length} entries
                </div>
              </div>
            )}

            {/* Search Results Summary */}
            {isSearchMode && (
              <div className="text-sm text-muted-foreground">
                {isSearching ? (
                  'Searching...'
                ) : (
                  `Found ${searchResults.length} results for "${searchTerm}"`
                )}
              </div>
            )}
          </div>

          {/* Active Filter Indicator */}
          {selectedTemplateId && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Active filter:</span>
              <Badge variant="secondary" className="flex items-center gap-1">
                {selectedTemplateId === 'no-template' 
                  ? 'No Template' 
                  : getTemplateById(selectedTemplateId)?.name || 'Unknown Template'
                }
                <X className="h-3 w-3 cursor-pointer" onClick={clearFilter} />
              </Badge>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-pulse">Loading entries...</div>
            </div>
          ) : (isSearchMode && searchResults.length === 0 && !isSearching) ? (
            <div className="text-center py-10 border rounded-lg">
              <h3 className="text-lg font-medium">No results found</h3>
              <p className="text-muted-foreground mt-1">
                Try searching with different keywords or clear your search
              </p>
              <Button variant="outline" onClick={clearSearch} className="mt-4">
                Clear Search
              </Button>
            </div>
          ) : (!isSearchMode && entries.length === 0) ? (
            <div className="text-center py-10 border rounded-lg">
              {selectedTemplateId ? (
                <>
                  <h3 className="text-lg font-medium">No entries found for this filter</h3>
                  <p className="text-muted-foreground mt-1">
                    Try selecting a different template or clearing the filter
                  </p>
                  <div className="flex gap-2 justify-center mt-4">
                    <Button variant="outline" onClick={clearFilter}>
                      Clear Filter
                    </Button>
                    <Button asChild>
                      <Link href="/journal/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Entry
                      </Link>
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium">No journal entries yet</h3>
                  <p className="text-muted-foreground mt-1">Create your first entry to get started</p>
                  <Button asChild className="mt-4">
                    <Link href="/journal/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Entry
                    </Link>
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {isSearchMode ? (
                // Render search results
                searchResults.map((result) => {
                  return (
                    <Card key={result.id} className="overflow-hidden flex flex-col">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="truncate flex-1">{result.title}</CardTitle>
                          <Badge variant="secondary" className="shrink-0 text-xs">
                            {Math.round(result.relevanceScore * 100)}% match
                          </Badge>
                        </div>
                        <CardDescription className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1 inline" />
                          {result.createdAt ? new Date(result.createdAt).toLocaleDateString() : 'Unknown date'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <p className="line-clamp-3 text-sm text-muted-foreground">
                          {result.content}
                        </p>
                      </CardContent>
                      <CardFooter className="pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full" 
                          onClick={() => router.push(`/journal/${result.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Read More
                        </Button>
                      </CardFooter>
                    </Card>
                  )
                })
              ) : (
                // Render regular entries
                entries.map((entry) => {
                  const template = entry.templateId ? getTemplateById(entry.templateId) : null
                  return (
                    <Card key={entry.id} className="overflow-hidden flex flex-col">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="truncate flex-1">{entry.title}</CardTitle>
                          {template && (
                            <Badge variant="outline" className="shrink-0 text-xs">
                              {template.name}
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1 inline" />
                          {formatDate(entry.createdAt)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <p className="line-clamp-3 text-sm text-muted-foreground">
                          {entry.content}
                        </p>
                      </CardContent>
                      <CardFooter className="pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full" 
                          onClick={() => router.push(`/journal/${entry.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Read More
                        </Button>
                      </CardFooter>
                    </Card>
                  )
                })
              )}
            </div>
          )}
        </main>
      </SidebarInset>
    </>
  )
} 