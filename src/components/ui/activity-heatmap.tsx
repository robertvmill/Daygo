"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { format, subDays, startOfWeek, addDays, isSameDay } from "date-fns";

interface DayData {
  date: string;
  words: number;
}

interface ActivityHeatmapProps {
  data: DayData[];
  className?: string;
  weeks?: number;
}

export function ActivityHeatmap({ data, className, weeks = 12 }: ActivityHeatmapProps) {
  const today = new Date();
  const startDate = startOfWeek(subDays(today, weeks * 7 - 1), { weekStartsOn: 0 });
  
  const maxWords = Math.max(...data.map(d => d.words), 1);
  
  const getIntensity = (words: number): string => {
    if (words === 0) return "bg-gray-100 dark:bg-gray-800";
    const ratio = words / maxWords;
    if (ratio <= 0.25) return "bg-green-200 dark:bg-green-900";
    if (ratio <= 0.5) return "bg-green-300 dark:bg-green-700";
    if (ratio <= 0.75) return "bg-green-400 dark:bg-green-600";
    return "bg-green-500 dark:bg-green-500";
  };
  
  const getWordCountForDate = (date: Date): number => {
    const dateString = format(date, 'yyyy-MM-dd');
    const dayData = data.find(d => d.date === dateString);
    return dayData ? dayData.words : 0;
  };
  
  const generateGrid = () => {
    const grid: Array<Array<{ date: Date; words: number; intensity: string } | null>> = [];
    
    // Generate grid by days of the week (7 rows) and weeks (columns)
    for (let day = 0; day < 7; day++) {
      const row = [];
      for (let week = 0; week < weeks; week++) {
        const currentDate = addDays(startDate, week * 7 + day);
        if (currentDate <= today) {
          const words = getWordCountForDate(currentDate);
          row.push({
            date: currentDate,
            words,
            intensity: getIntensity(words)
          });
        } else {
          row.push(null);
        }
      }
      grid.push(row);
    }
    return grid;
  };
  
  const grid = generateGrid();
  const totalWords = data.reduce((sum, d) => sum + d.words, 0);
  const activeDays = data.filter(d => d.words > 0).length;
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Writing Activity
        </CardTitle>
        <CardDescription>
          {totalWords.toLocaleString()} words written across {activeDays} active days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative overflow-x-auto">
            <div className="flex gap-1">
              <div className="flex flex-col gap-1 mr-3 min-w-[30px]">
                <div className="h-4 text-xs text-muted-foreground flex items-center">Sun</div>
                <div className="h-4"></div>
                <div className="h-4 text-xs text-muted-foreground flex items-center">Tue</div>
                <div className="h-4"></div>
                <div className="h-4 text-xs text-muted-foreground flex items-center">Thu</div>
                <div className="h-4"></div>
                <div className="h-4 text-xs text-muted-foreground flex items-center">Sat</div>
              </div>
              
              <div className="flex gap-1 flex-1">
                {Array.from({ length: weeks }).map((_, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-1 flex-1 min-w-[12px]">
                    {grid.map((row, dayIndex) => {
                      const day = row[weekIndex];
                      return (
                        <div key={dayIndex} className="w-full h-4">
                          {day ? (
                            <div
                              className={`w-full h-full rounded-sm transition-all duration-200 hover:ring-2 hover:ring-gray-400 cursor-pointer ${day.intensity}`}
                              title={`${format(day.date, 'MMM d, yyyy')}: ${day.words} words`}
                            />
                          ) : (
                            <div className="w-full h-full" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {format(startDate, 'MMM yyyy')} - {format(today, 'MMM yyyy')}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Less</span>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-100 dark:bg-gray-800 rounded-sm" />
                <div className="w-2 h-2 bg-green-200 dark:bg-green-900 rounded-sm" />
                <div className="w-2 h-2 bg-green-300 dark:bg-green-700 rounded-sm" />
                <div className="w-2 h-2 bg-green-400 dark:bg-green-600 rounded-sm" />
                <div className="w-2 h-2 bg-green-500 dark:bg-green-500 rounded-sm" />
              </div>
              <span className="text-muted-foreground">More</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}