'use client';

import { useState, useEffect } from 'react';
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCountdownEvent, updateCountdownEvent, createTimestampFromDate, formatDateForInput } from "@/services/countdownService";
import { CountdownEvent } from "@/types/journal";
import { toast } from "sonner";

interface EditCountdownPageProps {
  params: {
    id: string;
  };
}

export default function EditCountdownPage({ params }: EditCountdownPageProps) {
  const [event, setEvent] = useState<CountdownEvent | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [category, setCategory] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [color, setColor] = useState('#3b82f6');
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Load existing event data
  useEffect(() => {
    const loadEvent = async () => {
      setIsLoading(true);
      try {
        const eventData = await getCountdownEvent(params.id);
        if (!eventData) {
          toast.error("Countdown event not found");
          router.push('/countdown');
          return;
        }

        setEvent(eventData);
        setTitle(eventData.title);
        setDescription(eventData.description || '');
        setTargetDate(formatDateForInput(eventData.targetDate));
        setCategory(eventData.category || '');
        setPriority(eventData.priority || '');
        setColor(eventData.color || '#3b82f6');
        setIsActive(eventData.isActive);
      } catch (error) {
        console.error('Error loading countdown event:', error);
        toast.error("Failed to load countdown event");
        router.push('/countdown');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      loadEvent();
    }
  }, [params.id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !targetDate) {
      toast.error("Please fill in the required fields");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const updates: any = {
        title: title.trim(),
        targetDate: createTimestampFromDate(targetDate),
        color,
        isActive,
      };

      // Only add optional fields if they have values
      if (description.trim()) {
        updates.description = description.trim();
      }
      if (category) {
        updates.category = category;
      }
      if (priority) {
        updates.priority = priority;
      }

      await updateCountdownEvent(params.id, updates);
      toast.success("Countdown event updated successfully!");
      router.push('/countdown');
    } catch (error) {
      console.error('Error updating countdown event:', error);
      toast.error("Failed to update countdown event");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
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
                  <BreadcrumbLink href="/countdown">Countdowns</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbItem>
                  <BreadcrumbPage>Loading...</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>
          
          <main className="flex flex-1 flex-col gap-6 p-4 md:p-8 max-w-2xl mx-auto w-full">
            <div className="text-center py-8">Loading countdown event...</div>
          </main>
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
                <BreadcrumbLink href="/countdown">Countdowns</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbPage>Edit: {event?.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/countdown">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Countdowns
              </Link>
            </Button>
          </div>
        </header>
        
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-8 max-w-2xl mx-auto w-full">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold mb-2">Edit Countdown</h1>
              <p className="text-muted-foreground">
                Update the details for your countdown event.
              </p>
            </div>

            {/* Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Event Details
                </CardTitle>
                <CardDescription>
                  Modify the details for your countdown event
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">Event Title *</Label>
                    <Input
                      id="title"
                      type="text"
                      placeholder="e.g., Summer Vacation, Project Launch, Wedding"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      maxLength={100}
                    />
                    <p className="text-xs text-muted-foreground">
                      Choose a clear, descriptive title for your event
                    </p>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Add any additional details about the event..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional: Add context or details about the event
                    </p>
                  </div>

                  {/* Target Date */}
                  <div className="space-y-2">
                    <Label htmlFor="targetDate">Target Date *</Label>
                    <div className="relative">
                      <Input
                        id="targetDate"
                        type="date"
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                        required
                        className="pl-10"
                      />
                      <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select the date you're counting down to
                    </p>
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="work">Work</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="travel">Travel</SelectItem>
                        <SelectItem value="health">Health</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="celebration">Celebration</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Categorize your event for better organization
                    </p>
                  </div>

                  {/* Priority */}
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority level..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Set the importance level of this event
                    </p>
                  </div>

                  {/* Color */}
                  <div className="space-y-2">
                    <Label htmlFor="color">Display Color</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="color"
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-16 h-10 p-1 border rounded"
                      />
                      <div className="flex gap-2">
                        {/* Preset colors */}
                        {[
                          '#3b82f6', // blue
                          '#ef4444', // red
                          '#10b981', // green
                          '#f59e0b', // yellow
                          '#8b5cf6', // purple
                          '#ec4899', // pink
                          '#6b7280', // gray
                        ].map((presetColor) => (
                          <button
                            key={presetColor}
                            type="button"
                            onClick={() => setColor(presetColor)}
                            className="w-8 h-8 rounded border-2 border-muted hover:border-foreground transition-colors"
                            style={{ backgroundColor: presetColor }}
                            aria-label={`Select ${presetColor} color`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Choose a color to personalize your countdown
                    </p>
                  </div>

                  {/* Active Status */}
                  <div className="space-y-2">
                    <Label htmlFor="isActive">Status</Label>
                    <Select value={isActive.toString()} onValueChange={(value) => setIsActive(value === 'true')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Active</SelectItem>
                        <SelectItem value="false">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Inactive countdowns are hidden from the main view
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-4 pt-4">
                    <Button type="submit" disabled={isSubmitting} className="flex-1">
                      {isSubmitting ? 'Updating...' : 'Update Countdown'}
                    </Button>
                    <Button type="button" variant="outline" asChild>
                      <Link href="/countdown">Cancel</Link>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
} 