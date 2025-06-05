'use client';

import { useState, useEffect } from 'react';
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar, BarChart3, Clock, Target, FileText, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DayScore } from "@/types/journal";
import { getDayScore, getDayScoreTemplates, createDayScore, formatDate } from "@/services/dayScoreService";
import { toast } from "sonner";
import { CountdownWidget } from "@/components/CountdownWidget";

export default function DayScorePage() {
  // Selected date state (defaults to today)
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dayScore, setDayScore] = useState<DayScore | null>(null);
  const [templates, setTemplates] = useState<DayScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const router = useRouter();
  
  const today = new Date();
  const selectedDateString = formatDate(selectedDate);
  const selectedDateFormatted = selectedDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const isToday = selectedDateString === formatDate(today);

  // Load selected date's score and templates
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setIsLoadingTemplates(true);
      
      try {
        // Load selected date's score and templates in parallel
        const [score, userTemplates] = await Promise.all([
          getDayScore(selectedDateString),
          getDayScoreTemplates()
        ]);
        
        setDayScore(score);
        setTemplates(userTemplates);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error("Failed to load day data");
      } finally {
        setIsLoading(false);
        setIsLoadingTemplates(false);
      }
    };

    loadData();
  }, [selectedDateString]);

  const createFromTemplate = async (templateId: string) => {
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) {
        toast.error("Template not found");
        return;
      }

      // Generate new IDs for segments and clear scores/notes
      const newSegments = template.segments.map(segment => ({
        ...segment,
        id: `segment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        score: undefined,
        notes: undefined,
        completed: undefined
      }));

      // Create new day score from template
      const newDayScore = await createDayScore({
        date: selectedDateString,
        segments: newSegments
      });

      setDayScore(newDayScore);
      toast.success(`Created plan for ${selectedDateFormatted} from template: ${template.templateName}`);
      
      // Navigate to the plan page with date parameter
      router.push(`/dayscore/today?date=${selectedDateString}`);
    } catch (error) {
      console.error('Error creating from template:', error);
      toast.error("Failed to create plan from template");
    }
  };

  // Date navigation functions
  const goToPreviousDay = () => {
    const prevDay = new Date(selectedDate);
    prevDay.setDate(prevDay.getDate() - 1);
    setSelectedDate(prevDay);
  };

  const goToNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setSelectedDate(nextDay);
  };

  const goToToday = () => {
    setSelectedDate(today);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    setSelectedDate(newDate);
  };

  // Calculate stats from selected date's score
  const plannedSegments = dayScore?.segments?.length || 0;
  const completedSegments = dayScore?.segments?.filter(s => s.completed)?.length || 0;
  const scoredSegments = dayScore?.segments?.filter(s => s.score !== undefined)?.length || 0;
  const overallScore = dayScore?.overallScore;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex sticky top-0 z-10 h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>DayScore</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          <div className="ml-auto flex items-center gap-2">
            <Button asChild>
              <Link href={`/dayscore/today?date=${selectedDateString}`}>
                <Plus className="h-4 w-4 mr-2" />
                {isToday ? 'Plan Today' : 'Plan Day'}
              </Link>
            </Button>
          </div>
        </header>
        
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-8 max-w-6xl mx-auto w-full">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold mb-2">DayScore</h1>
              <p className="text-muted-foreground">
                Plan your day, track your progress, and score your performance to build better habits.
              </p>
            </div>

            {/* Date Navigation */}
            <Card>
              <CardHeader>
                <CardTitle>Select Date</CardTitle>
                <CardDescription>
                  View or create plans for any day. Navigate through your history or jump to a specific date.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={goToPreviousDay}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <Input
                      type="date"
                      value={selectedDateString}
                      onChange={handleDateChange}
                      className="w-fit"
                    />
                    
                    <Button variant="outline" size="sm" onClick={goToNextDay}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {!isToday && (
                    <Button variant="outline" size="sm" onClick={goToToday}>
                      Go to Today
                    </Button>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {selectedDateFormatted}
                      {isToday && ' (Today)'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Selected Day Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {isToday ? 'Today' : selectedDateFormatted}
                </CardTitle>
                <CardDescription>
                  {isToday ? 'Your current day planning and scoring' : 'Day planning and scoring overview'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading day data...</div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-3 p-4 border rounded-lg">
                        <Clock className="h-8 w-8 text-blue-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Planned Segments</p>
                          <p className="text-2xl font-bold">{plannedSegments}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-4 border rounded-lg">
                        <Target className="h-8 w-8 text-green-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Completed</p>
                          <p className="text-2xl font-bold">{completedSegments}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-4 border rounded-lg">
                        <BarChart3 className="h-8 w-8 text-purple-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Scored</p>
                          <p className="text-2xl font-bold">{scoredSegments}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-4 border rounded-lg">
                        <BarChart3 className="h-8 w-8 text-orange-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Overall Score</p>
                          <p className="text-2xl font-bold">
                            {overallScore ? overallScore.toFixed(1) : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 flex gap-2">
                      <Button asChild>
                        <Link href={`/dayscore/today?date=${selectedDateString}`}>
                          {dayScore ? 'Edit Plan' : (isToday ? 'Plan Today' : 'Plan Day')}
                        </Link>
                      </Button>
                      {dayScore && (
                        <Button variant="outline" asChild>
                          <Link href={`/dayscore/score?date=${selectedDateString}`}>
                            {isToday ? 'Score & Reflect' : 'Score Day'}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Quick Start with Templates - Only show if no plan exists */}
            {!dayScore && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Quick Start
                  </CardTitle>
                  <CardDescription>
                    Get started quickly by using a template or planning from scratch for {selectedDateFormatted}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Start from Template
                      </h4>
                      {isLoadingTemplates ? (
                        <div className="text-sm text-muted-foreground py-4">Loading templates...</div>
                      ) : templates.length > 0 ? (
                        <div className="space-y-2">
                          <Select onValueChange={createFromTemplate}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a template..." />
                            </SelectTrigger>
                            <SelectContent>
                              {templates.map(template => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.templateName} ({template.segments.length} segments)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Load a previously saved day structure
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No templates saved yet. Create your first plan and save it as a template!
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Start from Scratch
                      </h4>
                      <Button asChild className="w-full">
                        <Link href={`/dayscore/today?date=${selectedDateString}`}>
                          {isToday ? 'Plan Today' : 'Plan Day'}
                        </Link>
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Create a new day plan with custom segments
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Planning</CardTitle>
                  <CardDescription>
                    Schedule your day into segments with specific goals and activities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Break your day into time segments</li>
                    <li>• Set specific goals for each segment</li>
                    <li>• Categorize activities (work, personal, health, etc.)</li>
                    <li>• Create templates for recurring days</li>
                  </ul>
                  <Button className="mt-4" asChild>
                    <Link href="/dayscore/today">
                      Start Planning
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Scoring</CardTitle>
                  <CardDescription>
                    Come back later to score your performance and add coaching notes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Rate each segment on a 1-10 scale</li>
                    <li>• Add coaching notes and reflections</li>
                    <li>• Track completion of planned activities</li>
                    <li>• View progress over time</li>
                  </ul>
                  <Button className="mt-4" variant="outline" asChild>
                    <Link href="/dayscore/history">
                      View History
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Countdown Widget */}
            <CountdownWidget maxEvents={2} />

            {/* Getting Started */}
            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
                <CardDescription>
                  New to DayScore? Here&apos;s how to make the most of it
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium">Plan Your Day</h4>
                      <p className="text-sm text-muted-foreground">
                        Start each morning by breaking your day into focused segments with specific goals.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-semibold">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium">Execute & Track</h4>
                      <p className="text-sm text-muted-foreground">
                        Work through your planned segments, noting what actually happens vs. what you planned.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-semibold">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium">Score & Reflect</h4>
                      <p className="text-sm text-muted-foreground">
                        At the end of the day, score each segment and add coaching notes for improvement.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
} 