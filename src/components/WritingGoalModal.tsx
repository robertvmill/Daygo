"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Target, TrendingUp, Calendar, Edit } from "lucide-react";
import { 
  createWritingGoal, 
  getActiveWritingGoals, 
  getMostRecentGoalForPeriod,
  deactivateWritingGoal,
  GoalPeriod, 
  WritingGoal,
  formatGoalPeriod,
  getGoalPeriodDescription
} from "@/services/writingGoalsService";

interface WritingGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStats?: {
    wordsToday: number;
    wordsThisWeek: number;
    wordsThisMonth: number;
  };
}

export function WritingGoalModal({ open, onOpenChange, currentStats }: WritingGoalModalProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<GoalPeriod>('daily');
  const [targetWords, setTargetWords] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeGoals, setActiveGoals] = useState<WritingGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing goals when modal opens
  useEffect(() => {
    if (open) {
      loadActiveGoals();
    }
  }, [open]);

  const loadActiveGoals = async () => {
    try {
      setIsLoading(true);
      const goals = await getActiveWritingGoals();
      setActiveGoals(goals);
    } catch (error) {
      console.error('Error loading goals:', error);
      toast.error('Failed to load existing goals');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!targetWords || isNaN(Number(targetWords)) || Number(targetWords) <= 0) {
      toast.error('Please enter a valid word count target');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Check if there's already a goal for this period
      const existingGoal = await getMostRecentGoalForPeriod(selectedPeriod);
      
      if (existingGoal) {
        // Ask user if they want to replace the existing goal
        const replace = confirm(
          `You already have a ${selectedPeriod} goal of ${existingGoal.targetWords} words. ` +
          'Do you want to replace it with this new goal?'
        );
        
        if (!replace) {
          setIsSubmitting(false);
          return;
        }
      }

      await createWritingGoal(Number(targetWords), selectedPeriod);
      toast.success(`${formatGoalPeriod(selectedPeriod)} writing goal set successfully!`);
      
      // Reload goals and close modal
      await loadActiveGoals();
      setTargetWords('');
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error creating goal:', error);
      toast.error('Failed to create writing goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivateGoal = async (goalId: string) => {
    try {
      await deactivateWritingGoal(goalId);
      toast.success('Goal deactivated successfully');
      await loadActiveGoals();
    } catch (error) {
      console.error('Error deactivating goal:', error);
      toast.error('Failed to deactivate goal');
    }
  };

  const getProgressForGoal = (goal: WritingGoal) => {
    if (!currentStats) return { currentWords: 0, percentage: 0 };
    
    let currentWords = 0;
    switch (goal.period) {
      case 'daily':
        currentWords = currentStats.wordsToday;
        break;
      case 'weekly':
        currentWords = currentStats.wordsThisWeek;
        break;
      case 'monthly':
        currentWords = currentStats.wordsThisMonth;
        break;
    }
    
    const percentage = goal.targetWords > 0 ? Math.round((currentWords / goal.targetWords) * 100) : 0;
    return { currentWords, percentage };
  };

  const getSuggestedTargets = (period: GoalPeriod): number[] => {
    switch (period) {
      case 'daily':
        return [100, 250, 500, 750, 1000];
      case 'weekly':
        return [500, 1000, 2500, 5000, 7500];
      case 'monthly':
        return [2000, 5000, 10000, 20000, 30000];
      default:
        return [];
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Writing Goals
          </DialogTitle>
          <DialogDescription>
            Set writing targets to stay motivated and track your progress.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Active Goals */}
          {!isLoading && activeGoals.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-3">Active Goals</h3>
              <div className="grid gap-3">
                {activeGoals.map((goal) => {
                  const progress = getProgressForGoal(goal);
                  const isCompleted = progress.currentWords >= goal.targetWords;
                  
                  return (
                    <Card key={goal.id} className={`${isCompleted ? 'border-green-200 bg-green-50 dark:bg-green-950/20' : ''}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">
                              {formatGoalPeriod(goal.period)} Goal
                            </CardTitle>
                            {isCompleted && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                Complete!
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeactivateGoal(goal.id)}
                            className="h-8 text-xs"
                          >
                            Deactivate
                          </Button>
                        </div>
                        <CardDescription>
                          Target: {goal.targetWords.toLocaleString()} words
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{progress.currentWords.toLocaleString()} / {goal.targetWords.toLocaleString()} words</span>
                            <span className="font-medium">{progress.percentage}%</span>
                          </div>
                          <Progress value={Math.min(progress.percentage, 100)} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Create New Goal */}
          <div>
            <h3 className="text-lg font-medium mb-3">Create New Goal</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="period">Goal Period</Label>
                <Select value={selectedPeriod} onValueChange={(value: GoalPeriod) => setSelectedPeriod(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">
                      <div className="flex items-center gap-2">
                        <Edit className="h-4 w-4" />
                        Daily
                      </div>
                    </SelectItem>
                    <SelectItem value="weekly">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Weekly
                      </div>
                    </SelectItem>
                    <SelectItem value="monthly">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Monthly
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {getGoalPeriodDescription(selectedPeriod)}
                </p>
              </div>

              <div>
                <Label htmlFor="targetWords">Target Words</Label>
                <Input
                  id="targetWords"
                  type="number"
                  placeholder="Enter word count target"
                  value={targetWords}
                  onChange={(e) => setTargetWords(e.target.value)}
                  min="1"
                />
              </div>

              {/* Suggested Targets */}
              <div>
                <Label className="text-sm text-muted-foreground">Suggested Targets</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {getSuggestedTargets(selectedPeriod).map((target) => (
                    <Button
                      key={target}
                      variant="outline"
                      size="sm"
                      onClick={() => setTargetWords(target.toString())}
                      className="h-8 text-xs"
                    >
                      {target.toLocaleString()}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Goal Setting Tips */}
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4" />
                Goal Setting Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="space-y-1">
                <li>• Start with achievable targets and gradually increase them</li>
                <li>• Daily goals help build consistent writing habits</li>
                <li>• Weekly goals offer more flexibility for busy schedules</li>
                <li>• Monthly goals are great for longer-term projects</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateGoal} 
            disabled={isSubmitting || !targetWords}
          >
            {isSubmitting ? 'Creating...' : 'Create Goal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}