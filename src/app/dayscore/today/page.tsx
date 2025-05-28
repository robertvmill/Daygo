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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Clock, Save, Trash2, Calendar, GripVertical, FileText, Copy } from "lucide-react";
import Link from "next/link";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { DaySegment, DayScore } from "@/types/journal";
import { createDayScore, getDayScore, updateDayScore, formatDate, getDayScoreTemplates, createTemplateFromDayScore } from "@/services/dayScoreService";
import { toast } from "sonner";

const CATEGORY_COLORS = {
  work: "bg-blue-100 text-blue-800 border-blue-200",
  personal: "bg-green-100 text-green-800 border-green-200", 
  health: "bg-red-100 text-red-800 border-red-200",
  learning: "bg-purple-100 text-purple-800 border-purple-200",
  social: "bg-yellow-100 text-yellow-800 border-yellow-200",
  other: "bg-gray-100 text-gray-800 border-gray-200"
};

const CATEGORY_OPTIONS = [
  { value: 'work', label: 'Work' },
  { value: 'personal', label: 'Personal' },
  { value: 'health', label: 'Health' },
  { value: 'learning', label: 'Learning' },
  { value: 'social', label: 'Social' },
  { value: 'other', label: 'Other' }
];

export default function PlanTodayPage() {
  const searchParams = useSearchParams();
  const [segments, setSegments] = useState<DaySegment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dayScoreId, setDayScoreId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<DayScore[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  
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

  // Load existing day score for target date
  useEffect(() => {
    const loadDayScore = async () => {
      try {
        const existingScore = await getDayScore(targetDateString);
        if (existingScore) {
          setSegments(existingScore.segments);
          setDayScoreId(existingScore.id);
        } else {
          // Start with one default segment
          setSegments([createDefaultSegment()]);
        }
      } catch (error) {
        console.error('Error loading day score:', error);
        setSegments([createDefaultSegment()]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDayScore();
  }, [targetDateString]);

  // Load templates
  useEffect(() => {
    const loadTemplates = async () => {
      setIsLoadingTemplates(true);
      try {
        const userTemplates = await getDayScoreTemplates();
        setTemplates(userTemplates);
      } catch (error) {
        console.error('Error loading templates:', error);
        toast.error("Failed to load templates");
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    loadTemplates();
  }, []);

  const createDefaultSegment = (): DaySegment => ({
    id: `segment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    startTime: "09:00",
    endTime: "10:00",
    title: "",
    description: "",
    category: "work"
  });

  const addSegment = () => {
    const lastSegment = segments[segments.length - 1];
    const newStartTime = lastSegment ? lastSegment.endTime : "09:00";
    
    // Calculate end time (1 hour later)
    const [hours, minutes] = newStartTime.split(':').map(Number);
    const endHours = hours + 1;
    const newEndTime = `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    const newSegment: DaySegment = {
      id: `segment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startTime: newStartTime,
      endTime: newEndTime,
      title: "",
      description: "",
      category: "work"
    };
    
    setSegments([...segments, newSegment]);
  };

  const updateSegment = (id: string, updates: Partial<DaySegment>) => {
    setSegments(segments.map(segment => 
      segment.id === id ? { ...segment, ...updates } : segment
    ));
  };

  const removeSegment = (id: string) => {
    if (segments.length > 1) {
      setSegments(segments.filter(segment => segment.id !== id));
    } else {
      toast.error("You must have at least one segment");
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(segments);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSegments(items);
  };

  const loadTemplate = async (templateId: string) => {
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) {
        toast.error("Template not found");
        return;
      }

      // Generate new IDs for segments and clear any scores/notes
      const newSegments = template.segments.map(segment => ({
        ...segment,
        id: `segment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        score: undefined,
        notes: undefined,
        completed: undefined
      }));

      setSegments(newSegments);
      toast.success(`Loaded template: ${template.templateName}`);
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error("Failed to load template");
    }
  };

  const saveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    if (segments.some(segment => !segment.title.trim())) {
      toast.error("All segments must have a title before saving as template");
      return;
    }

    try {
      // If we have a saved day score, create template from it
      if (dayScoreId) {
        await createTemplateFromDayScore(dayScoreId, templateName.trim());
      } else {
        // Save current plan first, then create template
        const dayScoreData = {
          date: targetDateString,
          segments: segments
        };
        const newDayScore = await createDayScore(dayScoreData);
        await createTemplateFromDayScore(newDayScore.id, templateName.trim());
        setDayScoreId(newDayScore.id);
      }

      // Reload templates
      const userTemplates = await getDayScoreTemplates();
      setTemplates(userTemplates);
      
      setIsTemplateDialogOpen(false);
      setTemplateName('');
      toast.success(`Template "${templateName.trim()}" saved successfully!`);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error("Failed to save template");
    }
  };

  const saveDayScore = async () => {
    if (segments.some(segment => !segment.title.trim())) {
      toast.error("All segments must have a title");
      return;
    }

    setIsSaving(true);
    try {
      const dayScoreData = {
        date: targetDateString,
        segments: segments
      };

      if (dayScoreId) {
        // Update existing
        await updateDayScore(dayScoreId, dayScoreData);
        toast.success("Day plan updated successfully!");
      } else {
        // Create new
        const newDayScore = await createDayScore(dayScoreData);
        setDayScoreId(newDayScore.id);
        toast.success("Day plan saved successfully!");
      }
    } catch (error) {
      console.error('Error saving day score:', error);
      toast.error("Failed to save day plan");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-screen">
            <div className="animate-pulse">Loading your day plan...</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

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
                <BreadcrumbPage>Plan Today</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          <div className="ml-auto flex items-center gap-2">
            <Button 
              onClick={saveDayScore}
              disabled={isSaving}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Plan"}
            </Button>
          </div>
        </header>
        
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-8 max-w-4xl mx-auto w-full">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <Calendar className="h-8 w-8" />
                {isToday ? 'Plan Today' : 'Plan Day'}
              </h1>
              <p className="text-muted-foreground">
                {targetDateFormatted} - Schedule your day into focused segments
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Segments</p>
                      <p className="text-2xl font-bold">{segments.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Time Planned</p>
                      <p className="text-2xl font-bold">
                        {segments.length > 0 && segments[0].startTime && segments[segments.length - 1].endTime
                          ? `${segments[0].startTime} - ${segments[segments.length - 1].endTime}`
                          : '-'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 bg-purple-500 rounded"></div>
                    <div>
                      <p className="text-sm text-muted-foreground">Categories</p>
                      <p className="text-2xl font-bold">
                        {new Set(segments.map(s => s.category)).size}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Start from Template
                  </CardTitle>
                  <CardDescription>
                    Load a previously saved day structure
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingTemplates ? (
                    <div className="text-center py-4">Loading templates...</div>
                  ) : templates.length > 0 ? (
                    <div className="space-y-2">
                      <Select onValueChange={loadTemplate}>
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
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No templates saved yet. Create your first template below!
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Copy className="h-5 w-5" />
                    Save as Template
                  </CardTitle>
                  <CardDescription>
                    Save this day structure for future use
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        Save Current Plan as Template
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Save as Template</DialogTitle>
                        <DialogDescription>
                          Give your day structure a name so you can reuse it later.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="template-name">Template Name</Label>
                          <Input
                            id="template-name"
                            placeholder="e.g., 'Productive Work Day', 'Weekend Routine'"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                          />
                        </div>
                        <div className="text-sm text-muted-foreground">
                          This will save your current {segments.length} segments as a reusable template.
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={saveAsTemplate}>
                          Save Template
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </div>

            {/* Segments */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Segments</CardTitle>
                <CardDescription>
                  Break your day into focused time blocks. Drag to reorder.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="segments">
                    {(provided) => (
                      <div 
                        {...provided.droppableProps} 
                        ref={provided.innerRef}
                        className="space-y-4"
                      >
                        {segments.map((segment, index) => (
                          <Draggable key={segment.id} draggableId={segment.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`border rounded-lg p-4 bg-card ${
                                  snapshot.isDragging ? "shadow-lg" : ""
                                }`}
                              >
                                <div className="flex items-start gap-4">
                                  <div 
                                    {...provided.dragHandleProps}
                                    className="cursor-grab mt-2"
                                  >
                                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                  
                                  <div className="flex-1 space-y-4">
                                    {/* Time and Category Row */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                      <div>
                                        <label className="text-sm font-medium mb-1 block">Start Time</label>
                                        <Input
                                          type="time"
                                          value={segment.startTime}
                                          onChange={(e) => updateSegment(segment.id, { startTime: e.target.value })}
                                        />
                                      </div>
                                      
                                      <div>
                                        <label className="text-sm font-medium mb-1 block">End Time</label>
                                        <Input
                                          type="time"
                                          value={segment.endTime}
                                          onChange={(e) => updateSegment(segment.id, { endTime: e.target.value })}
                                        />
                                      </div>
                                      
                                      <div>
                                        <label className="text-sm font-medium mb-1 block">Category</label>
                                        <Select 
                                          value={segment.category || 'work'} 
                                          onValueChange={(value) => updateSegment(segment.id, { category: value as DaySegment['category'] })}
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {CATEGORY_OPTIONS.map(option => (
                                              <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      
                                      <div className="flex items-end">
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          onClick={() => removeSegment(segment.id)}
                                          className="text-red-600 hover:text-red-700"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                    
                                    {/* Title */}
                                    <div>
                                      <label className="text-sm font-medium mb-1 block">Title</label>
                                      <Input
                                        placeholder="What will you focus on?"
                                        value={segment.title}
                                        onChange={(e) => updateSegment(segment.id, { title: e.target.value })}
                                      />
                                    </div>
                                    
                                    {/* Description */}
                                    <div>
                                      <label className="text-sm font-medium mb-1 block">Description (optional)</label>
                                      <Textarea
                                        placeholder="Add details about your goals for this time block..."
                                        value={segment.description || ''}
                                        onChange={(e) => updateSegment(segment.id, { description: e.target.value })}
                                        rows={2}
                                      />
                                    </div>
                                    
                                    {/* Category Badge */}
                                    <div>
                                      <Badge 
                                        variant="outline" 
                                        className={CATEGORY_COLORS[segment.category || 'work']}
                                      >
                                        {CATEGORY_OPTIONS.find(c => c.value === segment.category)?.label || 'Work'}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
                
                <div className="mt-6 flex justify-center">
                  <Button onClick={addSegment} variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Segment
                  </Button>
                </div>
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
                  onClick={saveDayScore}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Plan"}
                </Button>
                
                <Button variant="outline" asChild>
                  <Link href="/dayscore/score">
                    Score & Reflect →
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