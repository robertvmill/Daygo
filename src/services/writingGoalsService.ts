"use client";

import { db } from "@/lib/firebase";
import { getAuth } from "firebase/auth";
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  doc, 
  deleteDoc, 
  updateDoc, 
  getDoc,
  orderBy,
  serverTimestamp,
  limit
} from "firebase/firestore";
import { Timestamp } from "firebase/firestore";

// Writing goal types
export type GoalPeriod = 'daily' | 'weekly' | 'monthly';

export interface WritingGoal {
  id: string;
  userId: string;
  targetWords: number;
  period: GoalPeriod;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface GoalProgress {
  goal: WritingGoal;
  currentWords: number;
  progressPercentage: number;
  isCompleted: boolean;
  daysLeft?: number; // For weekly/monthly goals
}

// Collection reference
const goalsCollection = () => collection(db, "writingGoals");

// Get current user
const getCurrentUser = () => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User must be authenticated");
  }
  return user;
};

// Create a new writing goal
export const createWritingGoal = async (targetWords: number, period: GoalPeriod): Promise<string> => {
  const user = getCurrentUser();
  
  // Deactivate any existing goals for this period
  await deactivateGoalsForPeriod(period);
  
  const goalData = {
    userId: user.uid,
    targetWords,
    period,
    isActive: true,
    createdAt: serverTimestamp()
  };
  
  const docRef = await addDoc(goalsCollection(), goalData);
  return docRef.id;
};

// Get active writing goals for the current user
export const getActiveWritingGoals = async (): Promise<WritingGoal[]> => {
  const user = getCurrentUser();
  
  const q = query(
    goalsCollection(),
    where("userId", "==", user.uid),
    where("isActive", "==", true),
    orderBy("createdAt", "desc")
  );
  
  const querySnapshot = await getDocs(q);
  const goals: WritingGoal[] = [];
  
  querySnapshot.forEach((doc) => {
    goals.push({
      id: doc.id,
      ...doc.data()
    } as WritingGoal);
  });
  
  return goals;
};

// Get a specific writing goal by ID
export const getWritingGoal = async (goalId: string): Promise<WritingGoal | null> => {
  const user = getCurrentUser();
  
  const docRef = doc(db, "writingGoals", goalId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  const data = docSnap.data() as WritingGoal;
  
  // Ensure users can only access their own goals
  if (data.userId !== user.uid) {
    throw new Error("Unauthorized access to writing goal");
  }
  
  return {
    ...data,
    id: docSnap.id
  };
};

// Update a writing goal
export const updateWritingGoal = async (goalId: string, updates: Partial<Pick<WritingGoal, 'targetWords' | 'isActive'>>): Promise<void> => {
  const user = getCurrentUser();
  
  // Verify ownership
  const goal = await getWritingGoal(goalId);
  if (!goal) {
    throw new Error("Writing goal not found");
  }
  
  const docRef = doc(db, "writingGoals", goalId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
};

// Deactivate a writing goal
export const deactivateWritingGoal = async (goalId: string): Promise<void> => {
  await updateWritingGoal(goalId, { isActive: false });
};

// Deactivate all goals for a specific period (used when creating new goals)
const deactivateGoalsForPeriod = async (period: GoalPeriod): Promise<void> => {
  const user = getCurrentUser();
  
  const q = query(
    goalsCollection(),
    where("userId", "==", user.uid),
    where("period", "==", period),
    where("isActive", "==", true)
  );
  
  const querySnapshot = await getDocs(q);
  const updatePromises = querySnapshot.docs.map(doc => 
    updateDoc(doc.ref, { 
      isActive: false,
      updatedAt: serverTimestamp()
    })
  );
  
  await Promise.all(updatePromises);
};

// Delete a writing goal
export const deleteWritingGoal = async (goalId: string): Promise<void> => {
  const user = getCurrentUser();
  
  // Verify ownership
  const goal = await getWritingGoal(goalId);
  if (!goal) {
    throw new Error("Writing goal not found");
  }
  
  await deleteDoc(doc(db, "writingGoals", goalId));
};

// Get goal progress with current word count
export const getGoalProgress = async (goal: WritingGoal, currentWords: number): Promise<GoalProgress> => {
  const progressPercentage = goal.targetWords > 0 ? Math.round((currentWords / goal.targetWords) * 100) : 0;
  const isCompleted = currentWords >= goal.targetWords;
  
  let daysLeft: number | undefined;
  
  // Calculate days left for weekly/monthly goals
  if (goal.period === 'weekly') {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    daysLeft = 7 - dayOfWeek; // Days until next Sunday
  } else if (goal.period === 'monthly') {
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    daysLeft = lastDayOfMonth - now.getDate() + 1; // Including today
  }
  
  return {
    goal,
    currentWords,
    progressPercentage,
    isCompleted,
    daysLeft
  };
};

// Get all goal progress for active goals
export const getAllGoalProgress = async (
  wordsToday: number,
  wordsThisWeek: number,
  wordsThisMonth: number
): Promise<GoalProgress[]> => {
  const activeGoals = await getActiveWritingGoals();
  
  const progressPromises = activeGoals.map(async (goal) => {
    let currentWords: number;
    
    switch (goal.period) {
      case 'daily':
        currentWords = wordsToday;
        break;
      case 'weekly':
        currentWords = wordsThisWeek;
        break;
      case 'monthly':
        currentWords = wordsThisMonth;
        break;
      default:
        currentWords = 0;
    }
    
    return getGoalProgress(goal, currentWords);
  });
  
  return Promise.all(progressPromises);
};

// Helper function to get the most recent goal for a specific period
export const getMostRecentGoalForPeriod = async (period: GoalPeriod): Promise<WritingGoal | null> => {
  const user = getCurrentUser();
  
  const q = query(
    goalsCollection(),
    where("userId", "==", user.uid),
    where("period", "==", period),
    where("isActive", "==", true),
    orderBy("createdAt", "desc"),
    limit(1)
  );
  
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }
  
  const doc = querySnapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data()
  } as WritingGoal;
};

// Helper function to format goal period for display
export const formatGoalPeriod = (period: GoalPeriod): string => {
  switch (period) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    default:
      return period;
  }
};

// Helper function to get goal period description
export const getGoalPeriodDescription = (period: GoalPeriod): string => {
  switch (period) {
    case 'daily':
      return 'Write this many words each day';
    case 'weekly':
      return 'Write this many words each week';
    case 'monthly':
      return 'Write this many words each month';
    default:
      return '';
  }
};