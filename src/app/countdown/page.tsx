'use client';

import { useState, useEffect } from 'react';
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, Calendar, AlertCircle, Edit, Trash2, Star } from "lucide-react";
import Link from "next/link";
import { CountdownEvent } from "@/types/journal";
import { getCountdownEvents, deleteCountdownEvent, getTimeRemaining, formatDate } from "@/services/countdownService";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function CountdownPage() {
  const [events, setEvents] = useState<CountdownEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<Record<string, any>>({});

  // Load countdown events
  useEffect(() => {
    const loadEvents = async () => {
      setIsLoading(true);
      try {
        const userEvents = await getCountdownEvents();
        setEvents(userEvents);
        
        // Calculate initial time remaining
        const timeData: Record<string, any> = {};
        userEvents.forEach(event => {
          timeData[event.id] = getTimeRemaining(event.targetDate);
        });
        setTimeRemaining(timeData);
      } catch (error) {
        console.error('Error loading countdown events:', error);
        toast.error("Failed to load countdown events");
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, []);

  // Update time remaining every minute (since we're not showing seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const newTimeData: Record<string, any> = {};
      events.forEach(event => {
        newTimeData[event.id] = getTimeRemaining(event.targetDate);
      });
      setTimeRemaining(newTimeData);
    }, 60000); // Update every minute instead of every second

    return () => clearInterval(interval);
  }, [events]);

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteCountdownEvent(eventId);
      setEvents(prev => prev.filter(event => event.id !== eventId));
      toast.success("Countdown event deleted");
    } catch (error) {
      console.error('Error deleting countdown event:', error);
      toast.error("Failed to delete countdown event");
    }
  };

  const getCategoryColor = (category?: string) => {
    const colors = {
      work: 'bg-blue-100 text-blue-800',
      personal: 'bg-green-100 text-green-800',
      travel: 'bg-purple-100 text-purple-800',
      health: 'bg-red-100 text-red-800',
      education: 'bg-yellow-100 text-yellow-800',
      celebration: 'bg-pink-100 text-pink-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  const getPriorityIcon = (priority?: string) => {
    if (priority === 'high') return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (priority === 'medium') return <Star className="h-4 w-4 text-yellow-500" />;
    return null;
  };

  const upcomingEvents = events.filter(event => !timeRemaining[event.id]?.isPast);
  const pastEvents = events.filter(event => timeRemaining[event.id]?.isPast);

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
                <BreadcrumbPage>Countdowns</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          <div className="ml-auto flex items-center gap-2">
            <Button asChild>
              <Link href="/countdown/new">
                <Plus className="h-4 w-4 mr-2" />
                New Countdown
              </Link>
            </Button>
          </div>
        </header>
        
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-8 max-w-6xl mx-auto w-full">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold mb-2">Countdowns</h1>
              <p className="text-muted-foreground">
                Track and countdown to your important events, milestones, and deadlines.
              </p>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Clock className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Active Countdowns</p>
                      <p className="text-2xl font-bold">{upcomingEvents.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Completed Events</p>
                      <p className="text-2xl font-bold">{pastEvents.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-8 w-8 text-orange-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Next Event</p>
                      <p className="text-lg font-bold">
                        {upcomingEvents.length > 0 && timeRemaining[upcomingEvents[0].id] 
                          ? `${timeRemaining[upcomingEvents[0].id].totalDays} days`
                          : 'None'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {isLoading ? (
              <div className="text-center py-8">Loading countdown events...</div>
            ) : (
              <>
                {/* Upcoming Events */}
                {upcomingEvents.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Upcoming Events
                      </CardTitle>
                      <CardDescription>
                        Events you're counting down to
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {upcomingEvents.map(event => {
                          const remaining = timeRemaining[event.id];
                          return (
                            <div key={event.id} className="p-4 border rounded-lg space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    {getPriorityIcon(event.priority)}
                                    <h3 className="font-semibold">{event.title}</h3>
                                  </div>
                                  {event.description && (
                                    <p className="text-sm text-muted-foreground mb-2">
                                      {event.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge className={getCategoryColor(event.category)}>
                                      {event.category || 'other'}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                      {formatDate(event.targetDate)}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="outline" asChild>
                                    <Link href={`/countdown/edit/${event.id}`}>
                                      <Edit className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="sm" variant="outline">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Countdown</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete "{event.title}"? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteEvent(event.id)}>
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                              
                              {remaining && !remaining.isPast && (
                                <div className="bg-muted p-3 rounded">
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-primary">
                                      {remaining.days}d {remaining.hours}h {remaining.minutes}m
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {remaining.totalDays === 0 ? 'Today!' : 
                                       remaining.totalDays === 1 ? 'Tomorrow' : 
                                       `${remaining.totalDays} days to go`}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Past Events */}
                {pastEvents.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Past Events
                      </CardTitle>
                      <CardDescription>
                        Events that have already occurred
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pastEvents.map(event => (
                          <div key={event.id} className="p-4 border rounded-lg space-y-3 opacity-75">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold">{event.title}</h3>
                                {event.description && (
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {event.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2">
                                  <Badge className={getCategoryColor(event.category)}>
                                    {event.category || 'other'}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {formatDate(event.targetDate)}
                                  </span>
                                </div>
                              </div>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Countdown</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{event.title}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteEvent(event.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                            
                            <div className="bg-muted p-3 rounded text-center">
                              <div className="text-sm text-muted-foreground">
                                Event has passed
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Empty State */}
                {events.length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No countdown events yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Create your first countdown to track important events and milestones.
                      </p>
                      <Button asChild>
                        <Link href="/countdown/new">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Your First Countdown
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Getting Started */}
            <Card>
              <CardHeader>
                <CardTitle>Getting Started with Countdowns</CardTitle>
                <CardDescription>
                  Make the most of your countdown tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Perfect for tracking:</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Vacation departures</li>
                      <li>• Project deadlines</li>
                      <li>• Special occasions & birthdays</li>
                      <li>• Exam dates</li>
                      <li>• Product launches</li>
                      <li>• Retirement dates</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Features:</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Real-time countdown display</li>
                      <li>• Categorize your events</li>
                      <li>• Set priority levels</li>
                      <li>• Track past events</li>
                      <li>• Clean, organized overview</li>
                    </ul>
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