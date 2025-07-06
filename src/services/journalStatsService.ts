"use client";

import { JournalEntry } from "@/types/journal";
import { getJournalEntries, generateContentFromTemplateFields } from "@/services/journalService";

// Word counting utilities
export const countWords = (text: string): number => {
  if (!text || typeof text !== 'string') return 0;
  
  // Remove extra whitespace and split by word boundaries
  const words = text.trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .split(/\s+/) // Split by whitespace
    .filter(word => word.length > 0); // Remove empty strings
  
  return words.length;
};

export const countWordsInEntry = (entry: JournalEntry): number => {
  let totalWords = 0;
  
  // Count words in main content
  totalWords += countWords(entry.content || '');
  
  // Count words in template fields if they exist
  if (entry.templateFields) {
    const templateContent = generateContentFromTemplateFields(entry.templateFields);
    totalWords += countWords(templateContent);
  }
  
  return totalWords;
};

// Journal statistics with word counting
export interface JournalStats {
  totalEntries: number;
  thisWeek: number;
  thisMonth: number;
  latestEntry: Date | null;
  streakDays: number;
  // New word counting stats
  totalWords: number;
  wordsThisWeek: number;
  wordsThisMonth: number;
  wordsToday: number;
  averageWordsPerEntry: number;
}

export const calculateJournalStats = async (): Promise<JournalStats> => {
  const entries = await getJournalEntries();
  
  if (!entries || entries.length === 0) {
    return {
      totalEntries: 0,
      thisWeek: 0,
      thisMonth: 0,
      latestEntry: null,
      streakDays: 0,
      totalWords: 0,
      wordsThisWeek: 0,
      wordsThisMonth: 0,
      wordsToday: 0,
      averageWordsPerEntry: 0
    };
  }

  // Get current date information
  const now = new Date();
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(now.getDate() - 7);
  
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setMonth(now.getMonth() - 1);
  
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  
  // Filter entries by date ranges
  const entriesThisWeek = entries.filter(entry => 
    entry.createdAt && new Date(entry.createdAt.seconds * 1000) >= oneWeekAgo
  );
  
  const entriesThisMonth = entries.filter(entry => 
    entry.createdAt && new Date(entry.createdAt.seconds * 1000) >= oneMonthAgo
  );
  
  const entriesToday = entries.filter(entry => {
    if (!entry.createdAt) return false;
    const entryDate = new Date(entry.createdAt.seconds * 1000);
    return entryDate >= todayStart && entryDate <= todayEnd;
  });
  
  // Calculate word counts
  const totalWords = entries.reduce((sum, entry) => sum + countWordsInEntry(entry), 0);
  const wordsThisWeek = entriesThisWeek.reduce((sum, entry) => sum + countWordsInEntry(entry), 0);
  const wordsThisMonth = entriesThisMonth.reduce((sum, entry) => sum + countWordsInEntry(entry), 0);
  const wordsToday = entriesToday.reduce((sum, entry) => sum + countWordsInEntry(entry), 0);
  
  // Calculate average words per entry
  const averageWordsPerEntry = entries.length > 0 ? Math.round(totalWords / entries.length) : 0;
  
  // Calculate streak (reuse existing logic from HomePage)
  let streakDays = 0;
  const entryDates = entries
    .filter(entry => entry.createdAt)
    .map(entry => new Date(entry.createdAt!.seconds * 1000).toDateString())
    .filter((date, index, self) => self.indexOf(date) === index); // Unique dates only
  
  // Sort dates in descending order
  entryDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  // Check if last entry was today or yesterday
  const today = new Date().toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayString = yesterday.toDateString();
  
  // If last entry was today or yesterday, count streak
  if (entryDates[0] === today || entryDates[0] === yesterdayString) {
    streakDays = 1;
    
    // Count consecutive days
    for (let i = 1; i < entryDates.length; i++) {
      const currentDate = new Date(entryDates[i-1]);
      currentDate.setDate(currentDate.getDate() - 1);
      
      if (currentDate.toDateString() === entryDates[i]) {
        streakDays++;
      } else {
        break;
      }
    }
  }
  
  // Get latest entry date
  const latestEntry = entries[0].createdAt ? 
    new Date(entries[0].createdAt.seconds * 1000) : null;
  
  return {
    totalEntries: entries.length,
    thisWeek: entriesThisWeek.length,
    thisMonth: entriesThisMonth.length,
    latestEntry,
    streakDays,
    totalWords,
    wordsThisWeek,
    wordsThisMonth,
    wordsToday,
    averageWordsPerEntry
  };
};

// Helper function to get word count for a specific date range
export const getWordCountForDateRange = async (startDate: Date, endDate: Date): Promise<number> => {
  const entries = await getJournalEntries();
  
  const filteredEntries = entries.filter(entry => {
    if (!entry.createdAt) return false;
    const entryDate = new Date(entry.createdAt.seconds * 1000);
    return entryDate >= startDate && entryDate <= endDate;
  });
  
  return filteredEntries.reduce((sum, entry) => sum + countWordsInEntry(entry), 0);
};

// Helper function to get daily word counts for the last N days
export const getDailyWordCounts = async (days: number): Promise<Array<{date: string, words: number}>> => {
  const entries = await getJournalEntries();
  const dailyData: Array<{date: string, words: number}> = [];
  
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() - i);
    
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);
    
    const dayEntries = entries.filter(entry => {
      if (!entry.createdAt) return false;
      const entryDate = new Date(entry.createdAt.seconds * 1000);
      return entryDate >= dayStart && entryDate <= dayEnd;
    });
    
    const wordsForDay = dayEntries.reduce((sum, entry) => sum + countWordsInEntry(entry), 0);
    
    dailyData.push({
      date: targetDate.toISOString().split('T')[0], // YYYY-MM-DD format
      words: wordsForDay
    });
  }
  
  return dailyData;
};