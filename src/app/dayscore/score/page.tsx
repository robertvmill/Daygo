'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Save, Calendar, Clock, Target, MessageCircle, TrendingUp, Star } from "lucide-react";
import Link from "next/link";
import { DaySegment, DayScore } from "@/types/journal";
import { getDayScore, updateDayScore, formatDate } from "@/services/dayScoreService";
import { toast } from "sonner";

const CATEGORY_COLORS = {
  work: "bg-blue-100 text-blue-800 border-blue-200",
  personal: "bg-green-100 text-green-800 border-green-200", 
  health: "bg-red-100 text-red-800 border-red-200",
  learning: "bg-purple-100 text-purple-800 border-purple-200",
  social: "bg-yellow-100 text-yellow-800 border-yellow-200",
  other: "bg-gray-100 text-gray-800 border-gray-200"
};

const SCORE_LABELS = {
  1: "Poor",
  2: "Below Average", 
  3: "Fair",
  4: "Good",
  5: "Average",
  6: "Above Average",
  7: "Very Good",
  8: "Excellent",
  9: "Outstanding",
  10: "Perfect"
};

export default function ScorePage() {
  const searchParams = useSearchParams();
  const [dayScore, setDayScore] = useState<DayScore | null>(null);
  const [segments, setSegments] = useState<DaySegment[]>([]);
  const [dailyReflection, setDailyReflection] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Get date from URL params or default to today
  const today = new Date();
  const dateParam = searchParams.get('date');
  const targetDate = dateParam ? new Date(dateParam) : today;
  const targetDateString = formatDate(targetDate);
  const targetDateFormatted = targetDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const isToday = targetDateString === formatDate(today);

  // Load target date's day score
  useEffect(() => {
    const loadDayScore = async () => {
      try {
        const existingScore = await getDayScore(targetDateString);
        if (existingScore) {
          setDayScore(existingScore);
          setSegments(existingScore.segments);
          setDailyReflection(existingScore.dailyReflection || '');
        } else {
          // No plan exists for target date
          setDayScore(null);
          setSegments([]);
        }
      } catch (error) {
        console.error('Error loading day score:', error);
        toast.error("Failed to load day plan");
      } finally {
        setIsLoading(false);
      }
    };

    loadDayScore();
  }, [targetDateString]);

  const updateSegment = (segmentId: string, updates: Partial<DaySegment>) => {
    setSegments(segments.map(segment => 
      segment.id === segmentId ? { ...segment, ...updates } : segment
    ));
  };

  const calculateOverallScore = () => {
    const scoredSegments = segments.filter(s => s.score !== undefined);
    if (scoredSegments.length === 0) return undefined;
    
    const totalScore = scoredSegments.reduce((sum, s) => sum + (s.score || 0), 0);
    return totalScore / scoredSegments.length;
  };

  const saveScores = async () => {
    if (!dayScore) {
      toast.error("No plan found for today. Please create a plan first.");
      return;
    }

    setIsSaving(true);
    try {
      const overallScore = calculateOverallScore();
      
      await updateDayScore(dayScore.id, {
        segments: segments,
        overallScore: overallScore,
        dailyReflection: dailyReflection
      });
      
      toast.success("Scores and reflection saved successfully!");
    } catch (error) {
      console.error('Error saving scores:', error);
      toast.error("Failed to save scores");
    } finally {
      setIsSaving(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-blue-600";
    if (score >= 4) return "text-yellow-600";
    return "text-red-600";
  };

  const getProgressStats = () => {
    const totalSegments = segments.length;
    const completedSegments = segments.filter(s => s.completed).length;
    const scoredSegments = segments.filter(s => s.score !== undefined).length;
    const notesCount = segments.filter(s => s.notes?.trim()).length;
    
    return {
      totalSegments,
      completedSegments,
      scoredSegments,
      notesCount,
      completionRate: totalSegments > 0 ? (completedSegments / totalSegments) * 100 : 0,
      scoringProgress: totalSegments > 0 ? (scoredSegments / totalSegments) * 100 : 0
    };
  };

  if (isLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-screen">
            <div className="animate-pulse">Loading your day score...</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!dayScore) {
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
                  <BreadcrumbLink asChild>
                    <Link href="/dayscore">DayScore</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbItem>
                  <BreadcrumbPage>Score & Reflect</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>
          
          <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4 md:p-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-bold">No Plan Found</h1>
              <p className="text-muted-foreground max-w-md">
                You haven&apos;t created a plan for {isToday ? 'today' : targetDateFormatted} yet. Create a plan first to score your segments.
              </p>
              <div className="flex gap-2 justify-center">
                <Button asChild>
                  <Link href={`/dayscore/today?date=${targetDateString}`}>
                    {isToday ? "Create Today's Plan" : 'Create Plan'}
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dayscore">
                    Back to DayScore
                  </Link>
                </Button>
              </div>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const stats = getProgressStats();
  const overallScore = calculateOverallScore();

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
                <BreadcrumbLink asChild>
                  <Link href="/dayscore">DayScore</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbPage>Score & Reflect</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          <div className="ml-auto flex items-center gap-2">
            <Button 
              onClick={saveScores}
              disabled={isSaving}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Scores"}
            </Button>
          </div>
        </header>
        
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-8 max-w-6xl mx-auto w-full">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold mb-2">Score & Reflect</h1>
              <p className="text-muted-foreground">
                {targetDateFormatted} - Rate your performance and add coaching notes for each segment.
              </p>
            </div>

            {/* Progress Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Target className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                      <p className="text-2xl font-bold">{stats.completedSegments}/{stats.totalSegments}</p>
                      <p className="text-xs text-muted-foreground">{stats.completionRate.toFixed(0)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Star className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Scored</p>
                      <p className="text-2xl font-bold">{stats.scoredSegments}/{stats.totalSegments}</p>
                      <p className="text-xs text-muted-foreground">{stats.scoringProgress.toFixed(0)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-8 w-8 text-purple-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Notes Added</p>
                      <p className="text-2xl font-bold">{stats.notesCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-8 w-8 text-orange-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Overall Score</p>
                      <p className={`text-2xl font-bold ${overallScore ? getScoreColor(overallScore) : ''}`}>
                        {overallScore ? overallScore.toFixed(1) : '-'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Segments Scoring */}
            <Card>
              <CardHeader>
                <CardTitle>Segment Scoring</CardTitle>
                <CardDescription>
                  Rate each segment on a scale of 1-10 and add coaching notes for reflection.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {segments.map((segment, index) => (
                  <div key={segment.id} className="border rounded-lg p-6 space-y-4">
                    {/* Segment Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-muted-foreground font-medium">
                          #{index + 1}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {segment.startTime} - {segment.endTime}
                          </span>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={CATEGORY_COLORS[segment.category || 'other']}
                        >
                          {segment.category}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={segment.completed || false}
                          onCheckedChange={(checked) => 
                            updateSegment(segment.id, { completed: !!checked })
                          }
                        />
                        <label className="text-sm text-muted-foreground">Completed</label>
                      </div>
                    </div>

                    {/* Segment Details */}
                    <div>
                      <h3 className="font-semibold text-lg">{segment.title}</h3>
                      {segment.description && (
                        <p className="text-muted-foreground mt-1">{segment.description}</p>
                      )}
                    </div>

                    {/* Scoring */}
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium">Performance Score</label>
                          <div className="flex items-center gap-2">
                            {segment.score && (
                              <span className={`text-sm font-medium ${getScoreColor(segment.score)}`}>
                                {segment.score}/10 - {SCORE_LABELS[segment.score as keyof typeof SCORE_LABELS]}
                              </span>
                            )}
                          </div>
                        </div>
                        <Slider
                          value={[segment.score || 5]}
                          onValueChange={(value) => updateSegment(segment.id, { score: value[0] })}
                          max={10}
                          min={1}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>1 - Poor</span>
                          <span>5 - Average</span>
                          <span>10 - Perfect</span>
                        </div>
                      </div>

                      {/* Coaching Notes */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">Coaching Notes & Reflection</label>
                        <Textarea
                          placeholder="What went well? What could be improved? Any insights or lessons learned?"
                          value={segment.notes || ''}
                          onChange={(e) => updateSegment(segment.id, { notes: e.target.value })}
                          className="min-h-[80px]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Daily Reflection */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Reflection</CardTitle>
                <CardDescription>
                  Reflect on your overall day, key learnings, and what you'd like to improve tomorrow.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="How did your day go overall? What are your key takeaways? What would you do differently tomorrow?"
                  value={dailyReflection}
                  onChange={(e) => setDailyReflection(e.target.value)}
                  className="min-h-[120px]"
                />
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-4 justify-between">
              <Button variant="outline" asChild>
                <Link href="/dayscore">
                  ← Back to DayScore
                </Link>
              </Button>
              
              <div className="flex gap-2">
                <Button 
                  onClick={saveScores}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Scores"}
                </Button>
                
                <Button variant="outline" asChild>
                  <Link href="/dayscore/history">
                    View History →
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
} 