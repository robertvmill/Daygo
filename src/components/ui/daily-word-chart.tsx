"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { format } from "date-fns";

// This interface defines the shape of each day's data
interface DayData {
  date: string; // Date in YYYY-MM-DD format
  words: number; // Number of words written on that day
}

// Properties that the chart component needs to display the data
interface DailyWordChartProps {
  data: DayData[]; // Array of daily word counts
  className?: string; // Optional styling classes
}

export function DailyWordChart({ data, className }: DailyWordChartProps) {
  // If no data is provided, show a message
  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Daily Word Count
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No writing data available</p>
        </CardContent>
      </Card>
    );
  }

  // Find the maximum word count to scale the chart bars properly
  const maxWords = Math.max(...data.map(d => d.words));
  // If max is 0, set to 1 to avoid division by zero
  const chartMax = maxWords > 0 ? maxWords : 1;

  // Format the date for display (e.g., "Mon 15" instead of "2024-01-15")
  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "EEE d"); // e.g., "Mon 15"
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Daily Word Count
        </CardTitle>
        <CardDescription>
          Words written over the last {data.length} days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Bar chart container */}
          <div className="flex items-end justify-between h-32 gap-1">
            {data.map((day, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                {/* Individual bar representing word count for each day */}
                <div className="flex flex-col items-center justify-end h-full">
                  {/* The bar itself - height is proportional to word count */}
                  <div
                    className="w-full min-h-[2px] bg-blue-500 rounded-t-sm transition-all duration-300 hover:bg-blue-600"
                    style={{
                      height: `${(day.words / chartMax) * 100}%`,
                    }}
                    title={`${day.words} words on ${formatDateForDisplay(day.date)}`}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Date labels at the bottom */}
          <div className="flex justify-between text-xs text-muted-foreground">
            {data.map((day, index) => (
              <div key={index} className="flex-1 text-center">
                {formatDateForDisplay(day.date)}
              </div>
            ))}
          </div>

          {/* Word count labels - show actual numbers */}
          <div className="flex justify-between text-xs font-medium">
            {data.map((day, index) => (
              <div key={index} className="flex-1 text-center">
                {day.words}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 