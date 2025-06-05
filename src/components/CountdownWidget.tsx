'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";
import { CountdownEvent } from "@/types/journal";
import { getUpcomingEvents, getTimeRemaining, formatDate } from "@/services/countdownService";

interface CountdownWidgetProps {
  maxEvents?: number;
  showHeader?: boolean;
  className?: string;
}

export function CountdownWidget({ maxEvents = 3, showHeader = true, className }: CountdownWidgetProps) {
  const [events, setEvents] = useState<CountdownEvent[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load upcoming events
  useEffect(() => {
    const loadEvents = async () => {
      setIsLoading(true);
      try {
        const upcomingEvents = await getUpcomingEvents(30); // Next 30 days
        const limitedEvents = upcomingEvents.slice(0, maxEvents);
        setEvents(limitedEvents);
        
        // Calculate initial time remaining
        const timeData: Record<string, any> = {};
        limitedEvents.forEach(event => {
          timeData[event.id] = getTimeRemaining(event.targetDate);
        });
        setTimeRemaining(timeData);
      } catch (error) {
        console.error('Error loading countdown events:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, [maxEvents]);

  // Update time remaining every minute (since we're not showing seconds)
  useEffect(() => {
    if (events.length === 0) return;

    const interval = setInterval(() => {
      const newTimeData: Record<string, any> = {};
      events.forEach(event => {
        newTimeData[event.id] = getTimeRemaining(event.targetDate);
      });
      setTimeRemaining(newTimeData);
    }, 60000); // Update every minute instead of every second

    return () => clearInterval(interval);
  }, [events]);

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

  if (isLoading) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            Loading countdown events...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Upcoming Events
            </CardTitle>
            <CardDescription>
              Your next important events and deadlines
            </CardDescription>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-6">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">
              No upcoming events in the next 30 days
            </p>
            <Button asChild size="sm">
              <Link href="/countdown/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Countdown
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Upcoming Events
          </CardTitle>
          <CardDescription>
            Your next important events and deadlines
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {events.map(event => {
          const remaining = timeRemaining[event.id];
          return (
            <div key={event.id} className="p-3 border rounded-lg space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{event.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={getCategoryColor(event.category)} variant="secondary">
                      {event.category || 'other'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(event.targetDate)}
                    </span>
                  </div>
                </div>
              </div>
              
              {remaining && !remaining.isPast && (
                <div className="bg-muted p-2 rounded text-center">
                  <div className="text-lg font-bold text-primary">
                    {remaining.totalDays === 0 ? (
                      `${remaining.hours}h ${remaining.minutes}m`
                    ) : remaining.totalDays < 7 ? (
                      `${remaining.days}d ${remaining.hours}h`
                    ) : (
                      `${remaining.totalDays} days`
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {remaining.totalDays === 0 ? 'Today!' : 
                     remaining.totalDays === 1 ? 'Tomorrow' : 
                     'to go'}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        
        <div className="pt-2">
          <Button variant="outline" size="sm" asChild className="w-full">
            <Link href="/countdown">
              View All Countdowns
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 